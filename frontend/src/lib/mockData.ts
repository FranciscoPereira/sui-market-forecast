/// Mock data for UI development / testnet demo when no on-chain data is available.
import type { Market, Position, OrderBook, PriceFeedEntry } from "@/types";

export const MOCK_MARKETS: Market[] = [
  {
    id: "0xabc123",
    question: "Will SUI price exceed $5.00 by end of Q3 2025?",
    yesLabel: "YES",
    noLabel: "NO",
    resolutionTime: Date.now() + 30 * 24 * 3600 * 1000,
    collateralLocked: "45000000000",
    yesSupply: "25000000",
    noSupply: "20000000",
    outcome: 0,
    creator: "0x1234abcd",
    oracle: "0xoracle01",
    status: "OPEN",
    yesPrice: 0.72,
    noPrice: 0.28,
    impliedProbBps: 7200,
  },
  {
    id: "0xdef456",
    question: "Will the next SUI mainnet upgrade ship before August 2025?",
    yesLabel: "YES",
    noLabel: "NO",
    resolutionTime: Date.now() + 14 * 24 * 3600 * 1000,
    collateralLocked: "12000000000",
    yesSupply: "8000000",
    noSupply: "4000000",
    outcome: 0,
    creator: "0x5678efab",
    oracle: "0xoracle01",
    status: "OPEN",
    yesPrice: 0.65,
    noPrice: 0.35,
    impliedProbBps: 6500,
  },
  {
    id: "0x789abc",
    question: "Will DeepBook TVL surpass $100M in 2025?",
    yesLabel: "YES",
    noLabel: "NO",
    resolutionTime: Date.now() + 60 * 24 * 3600 * 1000,
    collateralLocked: "89000000000",
    yesSupply: "30000000",
    noSupply: "45000000",
    outcome: 0,
    creator: "0x9abcde12",
    oracle: "0xoracle02",
    status: "OPEN",
    yesPrice: 0.40,
    noPrice: 0.60,
    impliedProbBps: 4000,
  },
  {
    id: "0xresolved1",
    question: "Will SUI be listed on Coinbase by June 2025?",
    yesLabel: "YES",
    noLabel: "NO",
    resolutionTime: Date.now() - 5 * 24 * 3600 * 1000,
    collateralLocked: "0",
    yesSupply: "0",
    noSupply: "0",
    outcome: 1,
    creator: "0xaabbccdd",
    oracle: "0xoracle01",
    status: "RESOLVED_YES",
    yesPrice: 1.0,
    noPrice: 0.0,
    impliedProbBps: 10000,
  },
];

export const MOCK_POSITIONS: Position[] = [
  {
    id: "0xpos1",
    marketId: "0xabc123",
    question: "Will SUI price exceed $5.00 by end of Q3 2025?",
    yesBalance: "5000000",
    noBalance: "0",
    marketStatus: "OPEN",
    currentYesPrice: 0.72,
    currentNoPrice: 0.28,
  },
  {
    id: "0xpos2",
    marketId: "0xresolved1",
    question: "Will SUI be listed on Coinbase by June 2025?",
    yesBalance: "3000000",
    noBalance: "0",
    marketStatus: "RESOLVED_YES",
    currentYesPrice: 1.0,
    currentNoPrice: 0.0,
  },
];

export const MOCK_ORDER_BOOK: OrderBook = {
  bids: [
    { price: 0.71, quantity: 1200, total: 852 },
    { price: 0.70, quantity: 2500, total: 1750 },
    { price: 0.68, quantity: 800,  total: 544 },
    { price: 0.65, quantity: 3000, total: 1950 },
    { price: 0.62, quantity: 1500, total: 930 },
  ],
  asks: [
    { price: 0.73, quantity: 900,  total: 657 },
    { price: 0.75, quantity: 2000, total: 1500 },
    { price: 0.77, quantity: 1100, total: 847 },
    { price: 0.80, quantity: 2200, total: 1760 },
    { price: 0.83, quantity: 600,  total: 498 },
  ],
  midPrice: 0.72,
  spread: 0.02,
};

export function generatePriceFeed(marketId: string): PriceFeedEntry[] {
  const now = Date.now();
  const points: PriceFeedEntry[] = [];
  let price = 0.5;
  for (let i = 24; i >= 0; i--) {
    price += (Math.random() - 0.48) * 0.04;
    price = Math.max(0.05, Math.min(0.95, price));
    points.push({
      timestamp: now - i * 3600_000,
      yesPrice: price,
      noPrice: 1 - price,
      impliedProbBps: Math.round(price * 10_000),
    });
  }
  return points;
}
