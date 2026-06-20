/// Resolution module — oracle-based and admin-based market settlement.
///
/// Two paths:
///   1. Oracle push: any registered oracle address calls `push_resolution`.
///   2. Admin override: AdminCap holder can force-resolve any market at any time.
///
/// Signal layer (BGA AI Trading bounty):
///   `compute_implied_probability` turns the DeepBook mid-price into an implied
///   probability score (0–100) that feeds into the frontend sentiment dashboard.
module sui_market_forecast::resolution {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::table::{Self, Table};
    use sui::transfer;

    use sui_market_forecast::market_factory::{Self, Market, AdminCap};

    // ── Error codes ───────────────────────────────────────────────────────────

    const E_NOT_ORACLE: u64      = 200;
    const E_ORACLE_EXISTS: u64   = 201;
    const E_INVALID_PRICE: u64   = 202;

    // ── Oracle registry ───────────────────────────────────────────────────────

    /// Shared registry mapping oracle addresses to their markets.
    public struct OracleRegistry has key {
        id: UID,
        /// oracle_address → list of market IDs it can resolve
        oracles: Table<address, bool>,
    }

    /// An oracle capability tied to a specific address. Transferable.
    public struct OracleCap has key, store {
        id: UID,
        oracle_address: address,
    }

    // ── Price feed record (BGA AI Trading signal layer) ───────────────────────

    /// Stores the latest aggregated price signal for a market.
    /// Updated by oracles pushing mid-price observations from DeepBook.
    public struct PriceFeed has key, store {
        id: UID,
        market_id: ID,
        /// TWAP of YES token mid-price in MIST over the last N observations
        yes_twap: u64,
        /// Number of price samples aggregated
        sample_count: u64,
        /// Implied probability YES wins, in basis points (0–10000)
        implied_prob_bps: u64,
        last_updated: u64,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct OracleRegistered has copy, drop {
        oracle: address,
    }

    public struct ResolutionPushed has copy, drop {
        market_id: ID,
        oracle: address,
        outcome: u8,
    }

    public struct PriceFeedUpdated has copy, drop {
        market_id: ID,
        yes_twap: u64,
        implied_prob_bps: u64,
    }

    // ── Initializer ───────────────────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        transfer::share_object(OracleRegistry {
            id: object::new(ctx),
            oracles: table::new(ctx),
        });
    }

    // ── Oracle registration ───────────────────────────────────────────────────

    public fun register_oracle(
        _cap: &AdminCap,
        registry: &mut OracleRegistry,
        oracle_address: address,
        ctx: &mut TxContext,
    ): OracleCap {
        assert!(!table::contains(&registry.oracles, oracle_address), E_ORACLE_EXISTS);
        table::add(&mut registry.oracles, oracle_address, true);
        event::emit(OracleRegistered { oracle: oracle_address });
        OracleCap { id: object::new(ctx), oracle_address }
    }

    // ── Oracle-driven resolution ──────────────────────────────────────────────

    /// Oracle pushes a resolution to a market. The oracle must own an OracleCap
    /// whose address matches `tx_context::sender`.
    public fun push_resolution(
        cap: &OracleCap,
        market: &mut Market,
        outcome: u8,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(cap.oracle_address == sender, E_NOT_ORACLE);

        market_factory::resolve(market, outcome, clock, ctx);

        event::emit(ResolutionPushed {
            market_id: object::id(market),
            oracle: sender,
            outcome,
        });
    }

    // ── Price feed (signal layer) ─────────────────────────────────────────────

    /// Initialize a price feed for a market. Called once at market creation.
    public fun create_price_feed(
        market_id: ID,
        ctx: &mut TxContext,
    ): PriceFeed {
        PriceFeed {
            id: object::new(ctx),
            market_id,
            yes_twap: 0,
            sample_count: 0,
            implied_prob_bps: 5000, // start at 50% (even odds)
            last_updated: 0,
        }
    }

    /// Push a new price observation into the rolling TWAP.
    /// `yes_mid_price` is the mid-price of YES tokens in MIST.
    /// `collateral_per_token` is 1 SUI worth in MIST (10^9) — the max payout per token.
    public fun update_price_feed(
        cap: &OracleCap,
        feed: &mut PriceFeed,
        yes_mid_price: u64,
        collateral_per_token: u64,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        assert!(cap.oracle_address == tx_context::sender(ctx), E_NOT_ORACLE);
        assert!(yes_mid_price <= collateral_per_token, E_INVALID_PRICE);

        // Simple cumulative moving average: new_twap = (old_twap * n + price) / (n+1)
        let n = feed.sample_count;
        let new_twap = if (n == 0) {
            yes_mid_price
        } else {
            // Avoid overflow: cap at 100 samples, then slide window
            let effective_n = if (n > 100) { 100 } else { n };
            (feed.yes_twap * effective_n + yes_mid_price) / (effective_n + 1)
        };

        feed.yes_twap = new_twap;
        feed.sample_count = n + 1;

        // Implied probability = TWAP / collateral_per_token, expressed in BPS
        // e.g. if YES trades at 0.7 SUI and collateral is 1 SUI → 70% → 7000 BPS
        feed.implied_prob_bps = (new_twap * 10_000) / collateral_per_token;
        feed.last_updated = clock::timestamp_ms(clock);

        event::emit(PriceFeedUpdated {
            market_id: feed.market_id,
            yes_twap: new_twap,
            implied_prob_bps: feed.implied_prob_bps,
        });
    }

    /// Pure computation helper: derive probability from a single mid-price snapshot.
    /// Returns implied probability in basis points (0–10000 = 0%–100%).
    public fun compute_implied_probability(
        yes_mid_price: u64,
        collateral_per_token: u64,
    ): u64 {
        if (collateral_per_token == 0) { return 5000 };
        let clamped = if (yes_mid_price > collateral_per_token) {
            collateral_per_token
        } else {
            yes_mid_price
        };
        (clamped * 10_000) / collateral_per_token
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    public fun implied_prob(feed: &PriceFeed): u64 { feed.implied_prob_bps }
    public fun yes_twap(feed: &PriceFeed): u64 { feed.yes_twap }
    public fun feed_market_id(feed: &PriceFeed): ID { feed.market_id }
    public fun last_updated(feed: &PriceFeed): u64 { feed.last_updated }
}
