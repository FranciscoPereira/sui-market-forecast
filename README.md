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

## How SUI Blockchain Is Used

Every core action in this protocol happens on-chain on the SUI network. Nothing is simulated or proxied through a centralised server.

### 1. Object model — everything is an on-chain object

SUI's object-centric model is used throughout:

- **`Market`** is a *shared object* created by `MarketFactory`. Anyone with a SUI wallet can call its entry functions directly — no relayer needed.
- **`AdminCap` / `OracleCap`** are *owned objects* (capabilities). Holding one in your wallet is the only way to resolve markets or push price feeds, enforcing access control at the VM level rather than with an off-chain allowlist.
- **`Position`** receipts and **`OutcomeCapabilities`** are stored on-chain and transferred to users or locked inside the `Market` object.

### 2. Move smart contracts

All business logic is written in **Move**, SUI's native smart contract language:

| What | Where | Why Move |
|------|-------|----------|
| Mint YES/NO fungible coins | `outcome_token.move` | `TreasuryCap` pattern ensures only the market factory can inflate supply |
| Lock collateral, settle bets | `market_factory.move` | `Balance<SUI>` held inside the object — no token approval dance |
| Oracle resolution + TWAP | `resolution.move` | Pure on-chain computation; no off-chain middleware |
| DeepBook order book | `deepbook_pool.move` | Calls DeepBook's `clob_v2` package via Move-to-Move cross-package calls |

### 3. SUI coin as collateral

Users deposit **SUI (the native gas token)** as collateral rather than a wrapped stablecoin. This means:

- No bridge risk or ERC-20 approval transactions
- Gas and collateral come from the same coin object, enabling single-PTB position opens
- `Balance<SUI>` is locked inside the `Market` shared object and can only leave via `redeem_yes`, `redeem_no`, or `close_position`

### 4. Programmable Transaction Blocks (PTBs)

The frontend constructs **PTBs** via `@mysten/sui` to batch multiple Move calls in one transaction:

```
splitCoins(gas, [fee])          // carve out collateral from gas coin
→ market_factory::buy_position  // mint YES + NO tokens
→ transferObjects([yes, no, position], sender)  // deliver to wallet
```

All three steps execute atomically — if any fails the whole PTB reverts.

### 5. DeepBook — on-chain order book

Rather than an AMM, each market gets two **DeepBook CLOB pools** (`Pool<YES, SUI>` and `Pool<NO, SUI>`). This means:

- Limit orders and market orders are matched entirely on-chain
- Price discovery happens in SUI consensus, not off-chain
- Makers earn trading fees from the protocol; no liquidity provider token needed
- The mid-price from each pool feeds the on-chain **TWAP price feed** (`resolution.move::PriceFeed`), which derives the implied probability displayed in the UI

### 6. Wallet integration

The frontend uses **`@mysten/dapp-kit`** to connect to any SUI-compatible wallet (Sui Wallet, Suiet, Martian, etc.). All transactions are signed in the user's wallet and submitted to the SUI testnet RPC — the app never holds private keys.

### 7. Trustless resolution

Market outcomes are set by calling `market_factory::resolve` from an oracle address registered in `OracleRegistry`. Once set, the outcome is immutable on-chain. The `AdminCap` holder can override before expiry for emergencies, but every resolution event is emitted as a **Move event** and permanently visible on the SUI explorer.

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
