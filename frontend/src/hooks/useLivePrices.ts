import { useQuery } from "@tanstack/react-query";

export interface LivePrices {
  bitcoin:  { usd: number; usd_24h_change: number };
  ethereum: { usd: number; usd_24h_change: number };
}

async function fetchPrices(): Promise<LivePrices> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
  );
  if (!res.ok) throw new Error("CoinGecko fetch failed");
  return res.json();
}

export function useLivePrices() {
  return useQuery({
    queryKey: ["live-prices"],
    queryFn: fetchPrices,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}
