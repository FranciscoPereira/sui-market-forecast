/// DeepBook integration module.
/// Sets up an order-book pool for each market's YES or NO token paired against SUI.
/// Provides entry points for placing limit/market orders on the outcome token markets.
///
/// Architecture:
///   Market created → two pools spun up (YES/SUI, NO/SUI)
///   Traders deposit base (outcome token) or quote (SUI) into a Custodian account
///   Place limit orders or perform immediate market swaps
///   Pool fees go to liquidity providers + protocol treasury
module sui_market_forecast::deepbook_pool {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::event;

    use clob::clob_v2::{Self as clob, Pool};
    use clob::custodian_v2::{Self as custodian, AccountCap};

    use sui_market_forecast::outcome_token::{YES, NO};

    // ── Error codes ───────────────────────────────────────────────────────────

    const E_POOL_ALREADY_EXISTS: u64 = 100;
    const E_ZERO_AMOUNT: u64         = 101;

    // ── Pool metadata stored alongside each market ────────────────────────────

    /// Created alongside a Market — holds IDs of the two DeepBook pools.
    public struct MarketPools has key, store {
        id: UID,
        market_id: ID,
        yes_pool_id: ID,
        no_pool_id: ID,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct PoolsCreated has copy, drop {
        market_id: ID,
        yes_pool_id: ID,
        no_pool_id: ID,
    }

    public struct OrderPlaced has copy, drop {
        pool_id: ID,
        order_id: u64,
        user: address,
        is_bid: bool,
        price: u64,
        quantity: u64,
    }

    // ── Pool creation ─────────────────────────────────────────────────────────

    /// Create YES/SUI and NO/SUI DeepBook pools for a newly minted market.
    /// `creation_fee` is the SUI required by DeepBook for pool creation (100 SUI on testnet).
    /// Tick size: 1 MIST (finest granularity). Min size: 1 token unit.
    public fun create_market_pools(
        market_id: ID,
        yes_creation_fee: Coin<SUI>,
        no_creation_fee: Coin<SUI>,
        ctx: &mut TxContext,
    ): MarketPools {
        // Tick size = 1 MIST, lot size = 1 token unit (both 10^-6 decimal)
        let tick_size: u64 = 1;
        let lot_size: u64  = 1;

        let yes_pool = clob::create_pool<YES, SUI>(tick_size, lot_size, yes_creation_fee, ctx);
        let no_pool  = clob::create_pool<NO, SUI>(tick_size, lot_size, no_creation_fee, ctx);

        let yes_pool_id = object::id(&yes_pool);
        let no_pool_id  = object::id(&no_pool);

        transfer::public_share_object(yes_pool);
        transfer::public_share_object(no_pool);

        event::emit(PoolsCreated { market_id, yes_pool_id, no_pool_id });

        MarketPools {
            id: object::new(ctx),
            market_id,
            yes_pool_id,
            no_pool_id,
        }
    }

    // ── Custodian account management ──────────────────────────────────────────

    /// Each user needs a DeepBook AccountCap to custody funds and submit orders.
    public fun create_account(ctx: &mut TxContext): AccountCap {
        clob::create_account(ctx)
    }

    // ── Deposit / withdraw collateral into DeepBook custody ───────────────────

    public fun deposit_base_yes(
        pool: &mut Pool<YES, SUI>,
        coin: Coin<YES>,
        account: &AccountCap,
        ctx: &mut TxContext,
    ) {
        clob::deposit_base(pool, coin, account);
    }

    public fun deposit_quote_yes(
        pool: &mut Pool<YES, SUI>,
        coin: Coin<SUI>,
        account: &AccountCap,
    ) {
        clob::deposit_quote(pool, coin, account);
    }

    public fun deposit_base_no(
        pool: &mut Pool<NO, SUI>,
        coin: Coin<NO>,
        account: &AccountCap,
    ) {
        clob::deposit_base(pool, coin, account);
    }

    public fun deposit_quote_no(
        pool: &mut Pool<NO, SUI>,
        coin: Coin<SUI>,
        account: &AccountCap,
    ) {
        clob::deposit_quote(pool, coin, account);
    }

    // ── Order placement ───────────────────────────────────────────────────────

    /// Place a limit bid (buy YES tokens for SUI) on the YES/SUI pool.
    /// `price`    — price per YES token in MIST
    /// `quantity` — number of YES tokens to purchase (in micro units)
    /// `expire_ts`— order expiry as Unix ms timestamp (0 = never)
    public fun place_limit_bid_yes(
        pool: &mut Pool<YES, SUI>,
        account: &AccountCap,
        client_order_id: u64,
        price: u64,
        quantity: u64,
        expire_ts: u64,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext,
    ) {
        let (base_out, quote_out, order_id) = clob::place_limit_order(
            pool,
            client_order_id,
            price,
            quantity,
            0,     // self_matching_prevention = 0 (allow)
            true,  // is_bid = true (buying base = YES tokens)
            expire_ts,
            0,     // restriction = 0 (no special)
            clock,
            account,
            ctx,
        );
        // Immediately return any dust fills to the user's custody account
        clob::deposit_base(pool, base_out, account);
        clob::deposit_quote(pool, quote_out, account);

        event::emit(OrderPlaced {
            pool_id: object::id(pool),
            order_id,
            user: tx_context::sender(ctx),
            is_bid: true,
            price,
            quantity,
        });
    }

    /// Place a limit ask (sell YES tokens for SUI).
    public fun place_limit_ask_yes(
        pool: &mut Pool<YES, SUI>,
        account: &AccountCap,
        client_order_id: u64,
        price: u64,
        quantity: u64,
        expire_ts: u64,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext,
    ) {
        let (base_out, quote_out, order_id) = clob::place_limit_order(
            pool,
            client_order_id,
            price,
            quantity,
            0,
            false, // is_bid = false (selling base = YES tokens)
            expire_ts,
            0,
            clock,
            account,
            ctx,
        );
        clob::deposit_base(pool, base_out, account);
        clob::deposit_quote(pool, quote_out, account);

        event::emit(OrderPlaced {
            pool_id: object::id(pool),
            order_id,
            user: tx_context::sender(ctx),
            is_bid: false,
            price,
            quantity,
        });
    }

    /// Immediate market buy of YES tokens — sweeps asks up to `max_quote_spent`.
    public fun market_buy_yes(
        pool: &mut Pool<YES, SUI>,
        account: &AccountCap,
        quantity: u64,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext,
    ) {
        let (base_out, quote_out) = clob::swap_exact_quote_for_base(
            pool,
            quantity, // quote quantity to spend
            clock,
            coin::zero<SUI>(ctx),
            ctx,
        );
        clob::deposit_base(pool, base_out, account);
        clob::deposit_quote(pool, quote_out, account);
    }

    /// Immediate market sell of YES tokens — sweeps bids.
    public fun market_sell_yes(
        pool: &mut Pool<YES, SUI>,
        account: &AccountCap,
        quantity: u64,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext,
    ) {
        let (base_out, quote_out) = clob::swap_exact_base_for_quote(
            pool,
            quantity,
            clock,
            coin::zero<YES>(ctx),
            ctx,
        );
        clob::deposit_base(pool, base_out, account);
        clob::deposit_quote(pool, quote_out, account);
    }

    // ── Cancel order ──────────────────────────────────────────────────────────

    public fun cancel_order_yes(
        pool: &mut Pool<YES, SUI>,
        account: &AccountCap,
        order_id: u64,
        _ctx: &mut TxContext,
    ) {
        clob::cancel_order(pool, order_id, account);
    }

    public fun cancel_order_no(
        pool: &mut Pool<NO, SUI>,
        account: &AccountCap,
        order_id: u64,
        _ctx: &mut TxContext,
    ) {
        clob::cancel_order(pool, order_id, account);
    }

    // ── Withdraw from custody ─────────────────────────────────────────────────

    public fun withdraw_yes(
        pool: &mut Pool<YES, SUI>,
        account: &AccountCap,
        base_amount: u64,
        quote_amount: u64,
        ctx: &mut TxContext,
    ): (Coin<YES>, Coin<SUI>) {
        let base = clob::withdraw_base(pool, base_amount, account, ctx);
        let quote = clob::withdraw_quote(pool, quote_amount, account, ctx);
        (base, quote)
    }

    public fun withdraw_no(
        pool: &mut Pool<NO, SUI>,
        account: &AccountCap,
        base_amount: u64,
        quote_amount: u64,
        ctx: &mut TxContext,
    ): (Coin<NO>, Coin<SUI>) {
        let base = clob::withdraw_base(pool, base_amount, account, ctx);
        let quote = clob::withdraw_quote(pool, quote_amount, account, ctx);
        (base, quote)
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    public fun get_market_price_yes(pool: &Pool<YES, SUI>): (u64, u64) {
        // Returns (best_bid, best_ask) in MIST per token
        clob::get_market_price(pool)
    }

    public fun get_market_price_no(pool: &Pool<NO, SUI>): (u64, u64) {
        clob::get_market_price(pool)
    }
}
