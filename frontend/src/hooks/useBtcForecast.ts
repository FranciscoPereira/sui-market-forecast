import { useQuery } from "@tanstack/react-query";

export interface BtcMarketData {
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  change30d: number;
  volume24h: number;
  marketCap: number;
  ath: number;
  athChangePercent: number;
}

export interface TechnicalSignals {
  rsi14: number;          // 0–100
  sma7: number;
  sma30: number;
  priceVsSma7: number;    // % diff
  priceVsSma30: number;
  macd: number;           // MACD line (EMA12 - EMA26)
  macdSignal: number;     // 9-day EMA of MACD
  bollingerUpper: number;
  bollingerLower: number;
  bollingerPct: number;   // 0–1 position within bands
}

export type Signal = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";

export interface ForecastResult {
  signal: Signal;
  confidence: number;       // 0–100
  score: number;            // raw -100 to +100
  marketData: BtcMarketData;
  signals: TechnicalSignals;
  reasoning: string[];
}

// ── Maths helpers ─────────────────────────────────────────────────────────────

function ema(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(...new Array(period - 1).fill(NaN));
  result.push(prev);
  for (let i = period; i < prices.length; i++) {
    prev = prices[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function sma(prices: number[], period: number): number {
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function rsi(prices: number[], period = 14): number {
  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  const gains = changes.map((c) => Math.max(c, 0));
  const losses = changes.map((c) => Math.max(-c, 0));
  const recent = period;
  const avgGain = gains.slice(-recent).reduce((a, b) => a + b, 0) / recent;
  const avgLoss = losses.slice(-recent).reduce((a, b) => a + b, 0) / recent;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function computeSignals(prices: number[], currentPrice: number): TechnicalSignals {
  const all = [...prices, currentPrice];

  const rsi14 = rsi(all, 14);
  const sma7Val  = sma(all, 7);
  const sma30Val = sma(all, 30);

  // MACD
  const ema12 = ema(all, 12);
  const ema26 = ema(all, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]).filter((v) => !isNaN(v));
  const signalLine = ema(macdLine, 9);
  const macdVal = macdLine[macdLine.length - 1] ?? 0;
  const macdSig = signalLine[signalLine.length - 1] ?? 0;

  // Bollinger Bands (20-day, 2σ)
  const slice20 = all.slice(-20);
  const mid = slice20.reduce((a, b) => a + b, 0) / slice20.length;
  const std = Math.sqrt(slice20.reduce((s, p) => s + (p - mid) ** 2, 0) / slice20.length);
  const upper = mid + 2 * std;
  const lower = mid - 2 * std;
  const bPct  = (currentPrice - lower) / (upper - lower);

  return {
    rsi14,
    sma7: sma7Val,
    sma30: sma30Val,
    priceVsSma7:  ((currentPrice - sma7Val)  / sma7Val)  * 100,
    priceVsSma30: ((currentPrice - sma30Val) / sma30Val) * 100,
    macd: macdVal,
    macdSignal: macdSig,
    bollingerUpper: upper,
    bollingerLower: lower,
    bollingerPct: bPct,
  };
}

function scoreToSignal(score: number): Signal {
  if (score >= 60)  return "STRONG_BUY";
  if (score >= 20)  return "BUY";
  if (score <= -60) return "STRONG_SELL";
  if (score <= -20) return "SELL";
  return "HOLD";
}

// ── Data fetcher ──────────────────────────────────────────────────────────────

async function fetchForecast(): Promise<ForecastResult> {
  const [marketRes, histRes] = await Promise.all([
    fetch(
      "https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false"
    ),
    fetch(
      "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=60&interval=daily"
    ),
  ]);

  if (!marketRes.ok || !histRes.ok) throw new Error("CoinGecko fetch failed");

  const [marketJson, histJson] = await Promise.all([marketRes.json(), histRes.json()]);

  const md = marketJson.market_data;
  const currentPrice: number = md.current_price.usd;

  const marketData: BtcMarketData = {
    price:           currentPrice,
    change1h:        md.price_change_percentage_1h_in_currency?.usd ?? 0,
    change24h:       md.price_change_percentage_24h ?? 0,
    change7d:        md.price_change_percentage_7d  ?? 0,
    change30d:       md.price_change_percentage_30d ?? 0,
    volume24h:       md.total_volume.usd,
    marketCap:       md.market_cap.usd,
    ath:             md.ath.usd,
    athChangePercent: md.ath_change_percentage.usd,
  };

  // histJson.prices = [[timestamp, price], ...]  (daily closes excluding today)
  const historicalPrices: number[] = (histJson.prices as [number, number][]).map(([, p]) => p);

  const signals = computeSignals(historicalPrices, currentPrice);

  // ── Scoring: each indicator contributes –40 to +40 ────────────────────────
  const reasoning: string[] = [];
  let score = 0;

  // RSI
  if (signals.rsi14 < 30) {
    score += 35;
    reasoning.push(`RSI ${signals.rsi14.toFixed(1)} — oversold, historically a buy zone`);
  } else if (signals.rsi14 < 45) {
    score += 15;
    reasoning.push(`RSI ${signals.rsi14.toFixed(1)} — mild bullish momentum`);
  } else if (signals.rsi14 > 70) {
    score -= 35;
    reasoning.push(`RSI ${signals.rsi14.toFixed(1)} — overbought, caution warranted`);
  } else if (signals.rsi14 > 60) {
    score -= 10;
    reasoning.push(`RSI ${signals.rsi14.toFixed(1)} — elevated, watch for reversal`);
  } else {
    reasoning.push(`RSI ${signals.rsi14.toFixed(1)} — neutral zone`);
  }

  // Price vs SMA
  if (signals.priceVsSma7 > 0 && signals.priceVsSma30 > 0) {
    score += 20;
    reasoning.push(`Price above both 7d and 30d MA — uptrend confirmed`);
  } else if (signals.priceVsSma7 < 0 && signals.priceVsSma30 < 0) {
    score -= 20;
    reasoning.push(`Price below both MAs — downtrend in effect`);
  } else if (signals.priceVsSma7 > 0) {
    score += 8;
    reasoning.push(`Price above 7d MA but below 30d — short-term recovery`);
  } else {
    score -= 8;
    reasoning.push(`Price below 7d MA — short-term weakness`);
  }

  // MACD
  if (signals.macd > signals.macdSignal && signals.macd > 0) {
    score += 20;
    reasoning.push(`MACD bullish crossover above zero line`);
  } else if (signals.macd > signals.macdSignal) {
    score += 10;
    reasoning.push(`MACD bullish crossover (still below zero)`);
  } else if (signals.macd < signals.macdSignal && signals.macd < 0) {
    score -= 20;
    reasoning.push(`MACD bearish — momentum declining below zero`);
  } else {
    score -= 8;
    reasoning.push(`MACD bearish crossover forming`);
  }

  // Bollinger
  if (signals.bollingerPct < 0.1) {
    score += 15;
    reasoning.push(`Near lower Bollinger Band — price compression, potential bounce`);
  } else if (signals.bollingerPct > 0.9) {
    score -= 15;
    reasoning.push(`Near upper Bollinger Band — extended, pullback risk`);
  }

  // Momentum
  if (marketData.change7d > 10) {
    score += 10;
    reasoning.push(`+${marketData.change7d.toFixed(1)}% in 7 days — strong upward momentum`);
  } else if (marketData.change7d < -10) {
    score -= 10;
    reasoning.push(`${marketData.change7d.toFixed(1)}% in 7 days — strong sell-off`);
  }

  const signal = scoreToSignal(score);
  const confidence = Math.min(95, Math.round(Math.abs(score) * 0.9 + 20));

  return { signal, confidence, score, marketData, signals, reasoning };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBtcForecast() {
  return useQuery({
    queryKey: ["btc-forecast"],
    queryFn: fetchForecast,
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
}
