export const NETWORK = "testnet" as const;

// Replace with deployed package ID after `sui client publish`
export const PACKAGE_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

// Shared object IDs created at deploy time (from publish transaction)
export const MARKET_REGISTRY_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export const ORACLE_REGISTRY_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

// DeepBook package on testnet
export const DEEPBOOK_PACKAGE_ID =
  "0x000000000000000000000000000000000000000000000000000000000000dee9";

export const SUI_CLOCK_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000006";

// Minimum collateral to enter a market: 0.01 SUI in MIST
export const MIN_COLLATERAL_MIST = 10_000_000n;

// Platform fee: 1%
export const FEE_BPS = 100;
export const BPS_DENOM = 10_000;

export const MIST_PER_SUI = 1_000_000_000n;

export const OUTCOME_LABELS: Record<number, string> = {
  0: "Open",
  1: "YES Won",
  2: "NO Won",
  3: "Invalid",
};

export const RPC_URL = "https://fullnode.testnet.sui.io:443";
