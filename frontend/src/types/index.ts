export type Outcome = "YES" | "NO";

export type MarketStatus = "OPEN" | "RESOLVED_YES" | "RESOLVED_NO" | "INVALID" | "EXPIRED";

export interface Market {
  id: string;
  question: string;
  yesLabel: string;
  noLabel: string;
  resolutionTime: number;   // Unix ms
  collateralLocked: string; // in MIST
  yesSupply: string;
  noSupply: string;
  outcome: number;           // 0=unresolved 1=yes 2=no 3=invalid
  creator: string;
  oracle: string;
  // Derived
  status: MarketStatus;
  yesPrice: number;  // 0–1 probability
  noPrice: number;
  impliedProbBps: number;  // from price feed
}

export interface Position {
  id: string;
  marketId: string;
  question: string;
  yesBalance: string;
  noBalance: string;
  marketStatus: MarketStatus;
  currentYesPrice: number;
  currentNoPrice: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  midPrice: number;
  spread: number;
}

export interface PriceFeedEntry {
  timestamp: number;
  yesPrice: number;
  noPrice: number;
  impliedProbBps: number;
}

export interface TradeForm {
  outcome: Outcome;
  amount: string;       // SUI collateral
  orderType: "market" | "limit";
  limitPrice: string;
}

export interface CreateMarketForm {
  question: string;
  yesLabel: string;
  noLabel: string;
  resolutionDate: string;
  oracle: string;
  creationFee: string;
}
