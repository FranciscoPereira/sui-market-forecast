import { useQuery } from "@tanstack/react-query";
import type { PriceFeedEntry } from "@/types";

async function fetchHistory(coinId: string): Promise<PriceFeedEntry[]> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=1&interval=hourly`
  );
  if (!res.ok) throw new Error("CoinGecko history fetch failed");
  const data: { prices: [number, number][] } = await res.json();
  return data.prices.map(([timestamp, price]) => ({
    timestamp,
    yesPrice: price,
    noPrice: 0,
    impliedProbBps: 0,
  }));
}

export function usePriceHistory(coinId: string | null) {
  return useQuery({
    queryKey: ["price-history", coinId],
    queryFn: () => fetchHistory(coinId!),
    enabled: !!coinId,
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
}
