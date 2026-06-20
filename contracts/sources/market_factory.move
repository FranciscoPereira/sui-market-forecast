/// MarketFactory is the core contract.
/// It creates prediction markets, manages collateral, and integrates with DeepBook
/// to provide on-chain order-book trading for YES/NO outcome tokens.
module sui_market_forecast::market_factory {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};
    use std::vector;

    use sui_market_forecast::outcome_token::{Self, OutcomeCapabilities, YES, NO};

    // ── Error codes ───────────────────────────────────────────────────────────

    const E_MARKET_ALREADY_RESOLVED: u64 = 1;
    const E_MARKET_NOT_RESOLVED: u64    = 2;
    const E_MARKET_EXPIRED: u64         = 3;
    const E_MARKET_NOT_EXPIRED: u64     = 4;
    const E_INSUFFICIENT_COLLATERAL: u64 = 5;
    const E_INVALID_OUTCOME: u64        = 6;
    const E_NOT_ADMIN: u64              = 7;
    const E_ZERO_AMOUNT: u64            = 8;
    const E_WRONG_MARKET: u64           = 9;

    // ── Constants ─────────────────────────────────────────────────────────────

    /// 1 MIST = 1e-9 SUI. Minimum collateral per position: 0.01 SUI
    const MIN_COLLATERAL: u64 = 10_000_000;

    /// Platform fee: 1% of collateral deposited (in basis points)
    const FEE_BPS: u64 = 100;
    const BPS_DENOM: u64 = 10_000;

    // ── Outcome enum ──────────────────────────────────────────────────────────

    const OUTCOME_UNRESOLVED: u8 = 0;
    const OUTCOME_YES: u8        = 1;
    const OUTCOME_NO: u8         = 2;
    const OUTCOME_INVALID: u8    = 3; // refunds all collateral

    // ── Core structs ──────────────────────────────────────────────────────────

    /// Singleton admin capability — held by the deployer.
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Global registry of all markets. Shared object.
    public struct MarketRegistry has key {
        id: UID,
        markets: Table<ID, bool>, // market_id → active
        total_markets: u64,
        fee_balance: Balance<SUI>,
        admin: address,
    }

    /// A single prediction market. Shared object — anyone can interact with it.
    public struct Market has key, store {
        id: UID,
        // Human-readable question, e.g. "Will ETH exceed $5k by Dec 2025?"
        question: String,
        // Short label for YES outcome
        yes_label: String,
        // Short label for NO outcome
        no_label: String,
        // Unix timestamp (ms) after which the market can be resolved
        resolution_time: u64,
        // SUI collateral locked in this market
        collateral: Balance<SUI>,
        // Minted supplies
        yes_supply: u64,
        no_supply: u64,
        // Resolution state
        outcome: u8,
        // Caps for minting/burning outcome tokens
        caps: OutcomeCapabilities,
        // Creator gets a share of fees
        creator: address,
        // Simple oracle: an address that can push a resolution
        oracle: address,
    }

    /// A user's position receipt — tracks how much collateral they deposited
    /// and which tokens they received. Not strictly required for redemption
    /// (token balance is sufficient) but useful for the frontend dashboard.
    public struct Position has key, store {
        id: UID,
        market_id: ID,
        collateral_amount: u64,
        yes_amount: u64,
        no_amount: u64,
        owner: address,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct MarketCreated has copy, drop {
        market_id: ID,
        question: String,
        creator: address,
        resolution_time: u64,
    }

    public struct PositionOpened has copy, drop {
        market_id: ID,
        user: address,
        collateral: u64,
        yes_minted: u64,
        no_minted: u64,
    }

    public struct MarketResolved has copy, drop {
        market_id: ID,
        outcome: u8,
        resolver: address,
    }

    public struct Redeemed has copy, drop {
        market_id: ID,
        user: address,
        payout: u64,
    }

    // ── Initializer ───────────────────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap { id: object::new(ctx) };
        let registry = MarketRegistry {
            id: object::new(ctx),
            markets: table::new(ctx),
            total_markets: 0,
            fee_balance: balance::zero<SUI>(),
            admin: tx_context::sender(ctx),
        };
        transfer::transfer(admin_cap, tx_context::sender(ctx));
        transfer::share_object(registry);
    }

    // ── Market creation ───────────────────────────────────────────────────────

    /// Anyone can create a market by paying a small creation fee.
    public fun create_market(
        registry: &mut MarketRegistry,
        question: vector<u8>,
        yes_label: vector<u8>,
        no_label: vector<u8>,
        resolution_time: u64,
        oracle: address,
        creation_fee: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): ID {
        // Require resolution time in the future
        assert!(resolution_time > clock::timestamp_ms(clock), E_MARKET_NOT_EXPIRED);
        assert!(coin::value(&creation_fee) >= MIN_COLLATERAL, E_INSUFFICIENT_COLLATERAL);

        let creator = tx_context::sender(ctx);

        // Build unique name prefixes from market index
        let market_index = registry.total_markets;
        let yes_name = build_token_name(yes_label, market_index, true);
        let no_name  = build_token_name(no_label,  market_index, false);

        // Create a temp ID to pass as the market_id placeholder
        let market_uid = object::new(ctx);
        let market_addr = object::uid_to_address(&market_uid);

        let caps = outcome_token::create_outcome_currencies(
            market_addr,
            yes_name,
            no_name,
            ctx,
        );

        // Collect creation fee into registry fee balance
        let fee_coin_balance = coin::into_balance(creation_fee);
        balance::join(&mut registry.fee_balance, fee_coin_balance);

        let market = Market {
            id: market_uid,
            question: string::utf8(question),
            yes_label: string::utf8(yes_label),
            no_label: string::utf8(no_label),
            resolution_time,
            collateral: balance::zero<SUI>(),
            yes_supply: 0,
            no_supply: 0,
            outcome: OUTCOME_UNRESOLVED,
            caps,
            creator,
            oracle,
        };

        let market_id = object::id(&market);
        table::add(&mut registry.markets, market_id, true);
        registry.total_markets = registry.total_markets + 1;

        event::emit(MarketCreated {
            market_id,
            question: market.question,
            creator,
            resolution_time,
        });

        transfer::share_object(market);
        market_id
    }

    // ── Buy a position (mint YES + NO tokens) ────────────────────────────────

    /// Deposit SUI collateral and receive equal amounts of YES and NO tokens.
    /// The YES/NO pair is worth exactly the deposited collateral at settlement.
    /// After minting, users sell the side they don't want on the DeepBook order book.
    public fun buy_position(
        market: &mut Market,
        collateral: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<YES>, Coin<NO>, Position) {
        assert!(market.outcome == OUTCOME_UNRESOLVED, E_MARKET_ALREADY_RESOLVED);
        assert!(clock::timestamp_ms(clock) < market.resolution_time, E_MARKET_EXPIRED);

        let raw_amount = coin::value(&collateral);
        assert!(raw_amount >= MIN_COLLATERAL, E_INSUFFICIENT_COLLATERAL);

        // Deduct platform fee
        let fee = (raw_amount * FEE_BPS) / BPS_DENOM;
        let net_amount = raw_amount - fee;

        // Lock collateral
        let collateral_balance = coin::into_balance(collateral);
        balance::join(&mut market.collateral, collateral_balance);

        // Mint equal YES and NO tokens (1 unit of collateral → 1 YES + 1 NO)
        let yes_coin = outcome_token::mint_yes(&mut market.caps, net_amount, ctx);
        let no_coin  = outcome_token::mint_no(&mut market.caps, net_amount, ctx);

        market.yes_supply = market.yes_supply + net_amount;
        market.no_supply  = market.no_supply  + net_amount;

        let sender = tx_context::sender(ctx);
        event::emit(PositionOpened {
            market_id: object::id(market),
            user: sender,
            collateral: net_amount,
            yes_minted: net_amount,
            no_minted: net_amount,
        });

        let position = Position {
            id: object::new(ctx),
            market_id: object::id(market),
            collateral_amount: net_amount,
            yes_amount: net_amount,
            no_amount: net_amount,
            owner: sender,
        };

        (yes_coin, no_coin, position)
    }

    // ── Redeem winning tokens after resolution ────────────────────────────────

    /// Burn winning outcome tokens for SUI collateral payout.
    public fun redeem_yes(
        market: &mut Market,
        yes_tokens: Coin<YES>,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        assert!(market.outcome == OUTCOME_YES || market.outcome == OUTCOME_INVALID, E_MARKET_NOT_RESOLVED);
        let amount = outcome_token::burn_yes(&mut market.caps, yes_tokens);
        let payout = balance::split(&mut market.collateral, amount);

        event::emit(Redeemed {
            market_id: object::id(market),
            user: tx_context::sender(ctx),
            payout: amount,
        });

        coin::from_balance(payout, ctx)
    }

    public fun redeem_no(
        market: &mut Market,
        no_tokens: Coin<NO>,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        assert!(market.outcome == OUTCOME_NO || market.outcome == OUTCOME_INVALID, E_MARKET_NOT_RESOLVED);
        let amount = outcome_token::burn_no(&mut market.caps, no_tokens);
        let payout = balance::split(&mut market.collateral, amount);

        event::emit(Redeemed {
            market_id: object::id(market),
            user: tx_context::sender(ctx),
            payout: amount,
        });

        coin::from_balance(payout, ctx)
    }

    /// Merge back equal YES+NO into collateral before resolution (exit full position).
    public fun close_position(
        market: &mut Market,
        yes_tokens: Coin<YES>,
        no_tokens: Coin<NO>,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        assert!(market.outcome == OUTCOME_UNRESOLVED, E_MARKET_ALREADY_RESOLVED);

        let yes_amount = coin::value(&yes_tokens);
        let no_amount  = coin::value(&no_tokens);
        // Must be equal to close symmetrically
        assert!(yes_amount == no_amount, E_INVALID_OUTCOME);

        outcome_token::burn_yes(&mut market.caps, yes_tokens);
        outcome_token::burn_no(&mut market.caps, no_tokens);

        market.yes_supply = market.yes_supply - yes_amount;
        market.no_supply  = market.no_supply  - no_amount;

        let payout = balance::split(&mut market.collateral, yes_amount);
        coin::from_balance(payout, ctx)
    }

    // ── Resolution ────────────────────────────────────────────────────────────

    /// Oracle or admin resolves the market with a specific outcome.
    public fun resolve(
        market: &mut Market,
        outcome: u8,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == market.oracle || sender == market.creator, E_NOT_ADMIN);
        assert!(market.outcome == OUTCOME_UNRESOLVED, E_MARKET_ALREADY_RESOLVED);
        assert!(clock::timestamp_ms(clock) >= market.resolution_time, E_MARKET_NOT_EXPIRED);
        assert!(
            outcome == OUTCOME_YES || outcome == OUTCOME_NO || outcome == OUTCOME_INVALID,
            E_INVALID_OUTCOME
        );

        market.outcome = outcome;

        event::emit(MarketResolved {
            market_id: object::id(market),
            outcome,
            resolver: sender,
        });
    }

    /// Admin override for emergency resolution (before expiry).
    public fun admin_resolve(
        _cap: &AdminCap,
        market: &mut Market,
        outcome: u8,
        _ctx: &mut TxContext,
    ) {
        assert!(market.outcome == OUTCOME_UNRESOLVED, E_MARKET_ALREADY_RESOLVED);
        assert!(
            outcome == OUTCOME_YES || outcome == OUTCOME_NO || outcome == OUTCOME_INVALID,
            E_INVALID_OUTCOME
        );
        market.outcome = outcome;
    }

    // ── Fee collection ────────────────────────────────────────────────────────

    public fun withdraw_fees(
        _cap: &AdminCap,
        registry: &mut MarketRegistry,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        let amount = balance::value(&registry.fee_balance);
        let fee_balance = balance::split(&mut registry.fee_balance, amount);
        coin::from_balance(fee_balance, ctx)
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    public fun market_outcome(market: &Market): u8 { market.outcome }
    public fun market_question(market: &Market): &String { &market.question }
    public fun market_resolution_time(market: &Market): u64 { market.resolution_time }
    public fun market_yes_supply(market: &Market): u64 { market.yes_supply }
    public fun market_no_supply(market: &Market): u64 { market.no_supply }
    public fun collateral_locked(market: &Market): u64 { balance::value(&market.collateral) }

    public fun outcome_unresolved(): u8 { OUTCOME_UNRESOLVED }
    public fun outcome_yes(): u8 { OUTCOME_YES }
    public fun outcome_no(): u8 { OUTCOME_NO }
    public fun outcome_invalid(): u8 { OUTCOME_INVALID }

    // ── Internal helpers ──────────────────────────────────────────────────────

    fun build_token_name(label: vector<u8>, index: u64, is_yes: bool): vector<u8> {
        let mut name = label;
        vector::append(&mut name, b"_");
        // Append index as decimal digits
        let mut n = index;
        if (n == 0) {
            vector::push_back(&mut name, b'0');
        } else {
            let mut digits = vector::empty<u8>();
            while (n > 0) {
                vector::push_back(&mut digits, ((n % 10) as u8) + 48u8);
                n = n / 10;
            };
            vector::reverse(&mut digits);
            vector::append(&mut name, digits);
        };
        if (is_yes) {
            vector::append(&mut name, b"_YES");
        } else {
            vector::append(&mut name, b"_NO");
        };
        name
    }
}
