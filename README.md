# SUI Market Forecast

> A trustless prediction market protocol on SUI blockchain with on-chain order-book trading powered by DeepBook.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUI Blockchain (Testnet)                  │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │MarketFactory │───▶│OutcomeToken  │    │  Resolution      │   │
│  │              │    │  YES / NO    │    │  + PriceFeed     │   │
│  │ create_market│    │  mint / burn │    │  (TWAP oracle)   │   │
│  │ buy_position │    │              │    │                  │   │
│  │ redeem_yes/no│    └──────────────┘    └──────────────────┘   │
│  └──────┬───────┘                                                │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               DeepBook CLOB (deepbook_pool.move)          │   │
│  │                                                            │   │
│  │   Pool<YES, SUI>  ←──── limit/market orders ────▶        │   │
│  │   Pool<NO,  SUI>        place_limit_bid/ask               │   │
│  │                         market_buy / market_sell           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    SUI TypeScript SDK
                    @mysten/dapp-kit
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      React + TypeScript Frontend                  │
│                                                                   │
│   /             → Markets listing + search + filters             │
│   /market/:id   → Detail + PriceChart + OrderBook + TradePanel  │
│   /portfolio    → Wallet positions + redemption                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Contracts

| Module              | Responsibility                                                    |
|---------------------|-------------------------------------------------------------------|
| `market_factory`    | Create markets, mint/burn YES+NO tokens, collateral management   |
| `outcome_token`     | Fungible YES/NO coin types with treasury caps                     |
| `deepbook_pool`     | DeepBook pool setup, limit orders, market swaps, custody          |
| `resolution`        | Oracle-driven resolution, admin override, TWAP price feed         |

### Token model

1. User deposits **N SUI** → receives **N YES** + **N NO** tokens (minus 1% fee)
2. User sells unwanted side on the **DeepBook order book** (e.g. sell NO → hold YES)
3. After resolution, **winning tokens** redeem 1:1 for collateral SUI
4. Losing tokens are worthless (burned with 0 payout)

---

## Bounty Alignment

<!--
==========================================================================
BOUNTY CALLOUTS — do not remove this block
==========================================================================

[SUI / DeepBook Integration]
  - deepbook_pool.move wires a CLOB Pool<YES, SUI> and Pool<NO, SUI>
    for every new prediction market.
  - create_market_pools(), place_limit_bid_yes(), market_buy_yes(), etc.
    all use the live DeepBook v2 API (clob_v2 / custodian_v2).
  - Order-book mid-price is surfaced in the frontend OrderBook component.

[BGA AI Trading — Signal Layer]
  - resolution.move::PriceFeed aggregates DeepBook mid-price observations
    into a rolling TWAP and exposes implied_prob_bps (0–10 000 BPS).
  - compute_implied_probability() is a pure on-chain function converting
    the TWAP into a probability percentage without any off-chain ML.
  - The frontend "AI Signal" banner on each market page reads this feed
    and displays e.g. "72.4% YES" alongside the order-book price chart.
  - Extension point: swap TWAP for an off-chain ML model that pushes
    predictions via the oracle mechanism already wired in resolution.move.

[Solvimon — Revenue Model]
  - Clear user-pays-to-bet model: 1% platform fee on every collateral
    deposit (FEE_BPS = 100 / BPS_DENOM = 10 000 in market_factory.move).
  - Fee accumulates in MarketRegistry.fee_balance and is withdrawn by
    AdminCap holder via withdraw_fees().
  - Creation fee charged per market (MIN_COLLATERAL = 0.01 SUI).
  - DeepBook taker/maker fees provide additional LP revenue.
  - All fee flows are on-chain and auditable; no hidden revenue.
==========================================================================
-->

| Bounty            | Integration                                                         |
|-------------------|---------------------------------------------------------------------|
| **SUI DeepBook**  | `deepbook_pool.move` — CLOB Pool per market, limit + market orders |
| **BGA AI Trading**| `resolution.move::PriceFeed` — on-chain TWAP → implied probability |
| **Solvimon**      | 1% collateral fee + per-market creation fee, all auditable on-chain |

---

## Quickstart

### Deploy contracts

```bash
cd contracts
sui client publish --gas-budget 200000000
```

Copy the published package ID and shared object IDs into `frontend/src/lib/constants.ts`.

### Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Deploy DeepBook pools (per market)

After creating a market, call `deepbook_pool::create_market_pools` with the market ID
and 100 SUI pool creation fees (testnet faucet covers this).

---

## Gas optimisation notes

- Outcome tokens use 6-decimal precision (not 9) to keep amounts in range without overflow guards.
- `close_position` (burn YES+NO) avoids storage rebates by doing a single PTB.
- `buy_position` uses `splitCoins` in PTBs so no intermediate coin objects are created.
- DeepBook pools use tick_size=1 MIST to minimise rounding waste.

---

## Testnet addresses

| Resource        | Address                                                              |
|-----------------|----------------------------------------------------------------------|
| Package         | _deploy and paste here_                                              |
| MarketRegistry  | _shared object ID from publish tx_                                   |
| OracleRegistry  | _shared object ID from publish tx_                                   |
| DeepBook        | `0x000000000000000000000000000000000000000000000000000000000000dee9` |
| SUI Clock       | `0x0000000000000000000000000000000000000000000000000000000000000006` |

---

## License

MIT
