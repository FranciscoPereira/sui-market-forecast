/// Outcome tokens represent a stake in a specific market outcome.
/// Each market mints YES and NO tokens backed 1:1 by USDC collateral.
/// At resolution, winning tokens redeem for the full collateral; losing tokens are worthless.
module sui_market_forecast::outcome_token {
    use sui::coin::{Self, TreasuryCap, CoinMetadata};
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::object::{Self, UID};
    use std::string;
    use std::ascii;

    // ── Phantom types for YES / NO coin differentiation ──────────────────────

    /// Marker type for YES outcome tokens. One per market — encoded in the type system.
    public struct YES has drop {}

    /// Marker type for NO outcome tokens.
    public struct NO has drop {}

    // ── Capability object held by MarketFactory ───────────────────────────────

    /// Wraps both treasury caps so the factory (and only the factory) can mint/burn.
    public struct OutcomeCapabilities has key, store {
        id: UID,
        yes_cap: TreasuryCap<YES>,
        no_cap: TreasuryCap<NO>,
        market_id: address,
    }

    // ── One-time witness initializers ─────────────────────────────────────────

    /// Called once per market to create YES/NO currencies.
    /// Returns both caps so the factory can manage supply.
    public fun create_outcome_currencies(
        market_id: address,
        yes_name: vector<u8>,
        no_name: vector<u8>,
        ctx: &mut TxContext,
    ): OutcomeCapabilities {
        let (yes_cap, yes_meta) = coin::create_currency(
            YES {},
            6,
            yes_name,
            yes_name,
            b"YES outcome token for a prediction market",
            std::option::none(),
            ctx,
        );
        let (no_cap, no_meta) = coin::create_currency(
            NO {},
            6,
            no_name,
            no_name,
            b"NO outcome token for a prediction market",
            std::option::none(),
            ctx,
        );

        // Freeze metadata (immutable on-chain record)
        transfer::public_freeze_object(yes_meta);
        transfer::public_freeze_object(no_meta);

        OutcomeCapabilities {
            id: object::new(ctx),
            yes_cap,
            no_cap,
            market_id,
        }
    }

    /// Mint `amount` YES tokens into a new coin object.
    public fun mint_yes(
        caps: &mut OutcomeCapabilities,
        amount: u64,
        ctx: &mut TxContext,
    ): coin::Coin<YES> {
        coin::mint(&mut caps.yes_cap, amount, ctx)
    }

    /// Mint `amount` NO tokens into a new coin object.
    public fun mint_no(
        caps: &mut OutcomeCapabilities,
        amount: u64,
        ctx: &mut TxContext,
    ): coin::Coin<NO> {
        coin::mint(&mut caps.no_cap, amount, ctx)
    }

    /// Burn YES tokens (used when redeeming losing side or splitting back to collateral).
    public fun burn_yes(caps: &mut OutcomeCapabilities, token: coin::Coin<YES>): u64 {
        coin::burn(&mut caps.yes_cap, token)
    }

    /// Burn NO tokens.
    public fun burn_no(caps: &mut OutcomeCapabilities, token: coin::Coin<NO>): u64 {
        coin::burn(&mut caps.no_cap, token)
    }

    public fun market_id(caps: &OutcomeCapabilities): address {
        caps.market_id
    }
}
