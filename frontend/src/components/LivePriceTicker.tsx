import { useLivePrices } from "@/hooks/useLivePrices";
import { cn } from "@/lib/utils";

export function LivePriceTicker() {
  const { data, isLoading } = useLivePrices();

  if (isLoading || !data) return null;

  const coins = [
    { label: "BTC", price: data.bitcoin.usd, change: data.bitcoin.usd_24h_change },
    { label: "ETH", price: data.ethereum.usd, change: data.ethereum.usd_24h_change },
  ];

  return (
    <div className="flex items-center gap-4">
      {coins.map(({ label, price, change }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-500">{label}</span>
          <span className="text-white font-medium">
            ${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className={cn("font-medium", change >= 0 ? "text-yes-500" : "text-no-500")}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
          </span>
        </div>
      ))}
      <span className="text-gray-600 text-xs">Live</span>
    </div>
  );
}
