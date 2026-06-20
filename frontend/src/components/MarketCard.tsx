import { Link } from "react-router-dom";
import { Clock, TrendingUp } from "lucide-react";
import { Card } from "./ui/Card";
import { StatusBadge } from "./ui/Badge";
import type { Market } from "@/types";
import { formatSui, formatTimeLeft, formatProbability } from "@/lib/utils";
import { impliedProbabilityBps } from "@/lib/probability";
import { useLivePrices } from "@/hooks/useLivePrices";

interface Props {
  market: Market;
}

export function MarketCard({ market }: Props) {
  const { data: prices } = useLivePrices();

  // Compute live implied probability if we have a coin price and target
  let liveProbBps = market.impliedProbBps;
  let currentPrice: number | null = null;

  if (prices && market.coinId && market.targetPrice) {
    const feed = prices[market.coinId as keyof typeof prices];
    if (feed) {
      currentPrice = feed.usd;
      liveProbBps = impliedProbabilityBps(
        market.coinId,
        feed.usd,
        market.targetPrice,
        market.resolutionTime - Date.now(),
      );
    }
  }

  const yesPct = liveProbBps / 100;
  const noPct  = 100 - yesPct;

  return (
    <Link to={`/market/${market.id}`}>
      <Card className="hover:border-brand-500/50 transition-colors cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <p className="text-white font-medium text-sm leading-snug group-hover:text-brand-500 transition-colors line-clamp-2">
            {market.question}
          </p>
          <StatusBadge status={market.status} className="shrink-0" />
        </div>

        {/* Live underlying price badge */}
        {currentPrice && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {market.coinId === "bitcoin" ? "BTC" : "ETH"} now:
            </span>
            <span className="text-xs font-semibold text-white">
              ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-gray-500">
              / target ${market.targetPrice!.toLocaleString()}
            </span>
          </div>
        )}

        {/* Probability bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span className="text-yes-500 font-medium">YES {yesPct.toFixed(1)}%</span>
            <span className="text-no-500 font-medium">NO {noPct.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-border overflow-hidden flex">
            <div className="h-full bg-yes-500 transition-all duration-700" style={{ width: `${yesPct}%` }} />
            <div className="h-full bg-no-500 flex-1" />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{formatSui(market.collateralLocked, 2)} SUI locked</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimeLeft(market.resolutionTime)}</span>
          </div>
        </div>

        {/* AI signal */}
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
          <span className="text-xs text-gray-500">AI Signal:</span>
          <span className="text-xs font-medium text-brand-500">
            {formatProbability(liveProbBps)} YES
          </span>
          {prices && market.coinId && (
            <span className="ml-auto text-xs text-gray-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yes-500 animate-pulse inline-block" />
              Live
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
