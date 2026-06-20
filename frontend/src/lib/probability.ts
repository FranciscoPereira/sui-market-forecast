/// Implied probability engine (BGA AI Trading signal layer).
/// Uses a log-normal approximation (simplified Black-Scholes) to derive the
/// probability that an asset exceeds a target price within a given time horizon.

const ANNUAL_VOL: Record<string, number> = {
  bitcoin:  0.75,  // ~75% annualised vol
  ethereum: 0.90,
};

// Cumulative normal distribution (Abramowitz & Stegun approximation)
function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly =
    t * (0.319381530 +
    t * (-0.356563782 +
    t * (1.781477937 +
    t * (-1.821255978 +
    t * 1.330274429))));
  const phi = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const p = 1 - phi * poly;
  return x >= 0 ? p : 1 - p;
}

export function impliedProbabilityBps(
  coinId: string,
  currentPrice: number,
  targetPrice: number,
  msUntilResolution: number,
): number {
  if (currentPrice <= 0 || targetPrice <= 0 || msUntilResolution <= 0) return 5000;

  const yearsLeft = msUntilResolution / (1000 * 60 * 60 * 24 * 365);
  const vol = ANNUAL_VOL[coinId] ?? 0.80;

  // d2 from Black-Scholes: probability that S_T > K under real-world measure
  const d2 =
    (Math.log(currentPrice / targetPrice) + (-0.5 * vol * vol) * yearsLeft) /
    (vol * Math.sqrt(yearsLeft));

  const prob = normCdf(d2);
  return Math.round(Math.max(100, Math.min(9900, prob * 10_000)));
}
