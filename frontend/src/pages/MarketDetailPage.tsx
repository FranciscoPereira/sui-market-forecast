import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Activity } from "lucide-react";
import { TradePanel } from "@/components/TradePanel";
import { PriceChart } from "@/components/PriceChart";
import { OrderBookPanel } from "@/components/OrderBook";
import { StatusBadge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { MOCK_MARKETS, MOCK_ORDER_BOOK } from "@/lib/mockData";
import { formatSui, formatTimeLeft, formatProbability, shortenAddress } from "@/lib/utils";
import { impliedProbabilityBps } from "@/lib/probability";
import { useLivePrices } from "@/hooks/useLivePrices";
import { usePriceHistory } from "@/hooks/usePriceHistory";

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const market = MOCK_MARKETS.find((m) => m.id === id);

  const { data: prices } = useLivePrices();
  const { data: history, isLoading: histLoading } = usePriceHistory(market?.coinId ?? null);

  if (!market) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center text-gray-400">
        Market not found.{" "}
        <Link to="/" className="text-brand-500 hover:underline">Back to markets</Link>
      </div>
    );
  }

  // Compute live probability from real price feed
  let liveProbBps = market.impliedProbBps;
  let currentPrice: number | null = null;
  let change24h: number | null = null;

  if (prices && market.coinId && market.targetPrice) {
    const feed = prices[market.coinId as keyof typeof prices];
    if (feed) {
      currentPrice = feed.usd;
      change24h    = feed.usd_24h_change;
      liveProbBps  = impliedProbabilityBps(
        market.coinId,
        feed.usd,
        market.targetPrice,
        market.resolutionTime - Date.now(),
      );
    }
  }

  const yesPct = liveProbBps / 100;
  const noPct  = 100 - yesPct;
  const isOpen = market.status === "OPEN";
  const coinLabel = market.coinId === "bitcoin" ? "Bitcoin (BTC)" : market.coinId === "ethereum" ? "Ethereum (ETH)" : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        All Markets
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <h1 className="text-xl font-bold text-white flex-1 min-w-0">{market.question}</h1>
          <StatusBadge status={market.status} />
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span>Oracle: <span className="font-mono text-gray-400">{shortenAddress(market.oracle)}</span></span>
          <span>Creator: <span className="font-mono text-gray-400">{shortenAddress(market.creator)}</span></span>
          <span>Resolves: <span className="text-gray-300">{formatTimeLeft(market.resolutionTime)}</span></span>
        </div>
      </div>

      {/* Live price + probability hero */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {currentPrice && (
          <>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Current Price</p>
              <p className="text-2xl font-bold text-white">
                ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              {change24h !== null && (
                <p className={`text-xs mt-1 ${change24h >= 0 ? "text-yes-500" : "text-no-500"}`}>
                  {change24h >= 0 ? "▲" : "▼"} {Math.abs(change24h).toFixed(2)}% 24h
                </p>
              )}
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Target Price</p>
              <p className="text-2xl font-bold text-white">
                ${market.targetPrice!.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {currentPrice < market.targetPrice!
                  ? `${((market.targetPrice! / currentPrice - 1) * 100).toFixed(1)}% to go`
                  : "Target exceeded ✓"}
              </p>
            </div>
          </>
        )}
        <div className="bg-yes-500/10 border border-yes-500/20 rounded-xl p-4">
          <p className="text-xs text-yes-500 mb-1">YES Probability</p>
          <p className="text-2xl font-bold text-yes-500">{yesPct.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">AI signal · live</p>
        </div>
        <div className="bg-no-500/10 border border-no-500/20 rounded-xl p-4">
          <p className="text-xs text-no-500 mb-1">NO Probability</p>
          <p className="text-2xl font-bold text-no-500">{noPct.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">AI signal · live</p>
        </div>
      </div>

      {/* AI Signal banner */}
      <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
        <Activity className="w-5 h-5 text-brand-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">
            AI Signal:{" "}
            <span className="text-brand-500">{formatProbability(liveProbBps)} YES</span>
            {currentPrice && market.coinId && (
              <span className="text-gray-400 text-xs ml-2 font-normal">
                · log-normal model · {coinLabel} @ ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400">
            {market.coinId
              ? "Live price from CoinGecko · implied probability via log-normal distribution model"
              : "TWAP-derived implied probability from DeepBook order flow · updated every block"}
          </p>
        </div>
        <a
          href={`https://suiexplorer.com/object/${market.id}?network=testnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-white transition-colors shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PriceChart
            data={history ?? []}
            isUsdMode={!!market.coinId}
            targetPrice={market.targetPrice}
            coinLabel={coinLabel ?? undefined}
            loading={histLoading}
          />
          <OrderBookPanel orderBook={MOCK_ORDER_BOOK} />
          <Card>
            <CardTitle className="mb-4">Market Statistics</CardTitle>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: "Collateral Locked", value: `${formatSui(market.collateralLocked, 2)} SUI` },
                { label: "YES Supply",         value: `${(Number(market.yesSupply) / 1e6).toFixed(2)}M` },
                { label: "NO Supply",          value: `${(Number(market.noSupply) / 1e6).toFixed(2)}M` },
                { label: "Resolution",         value: new Date(market.resolutionTime).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  <p className="font-medium text-white">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div>
          <TradePanel market={{ ...market, yesPrice: yesPct / 100, noPrice: noPct / 100 }} />
        </div>
      </div>
    </div>
  );
}
