import { TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw } from "lucide-react";
import { useBtcForecast, type Signal } from "@/hooks/useBtcForecast";
import { Card, CardTitle } from "./ui/Card";
import { cn } from "@/lib/utils";

const SIGNAL_CONFIG: Record<Signal, {
  label: string;
  color: string;
  bg: string;
  border: string;
  Icon: typeof TrendingUp;
}> = {
  STRONG_BUY:  { label: "Strong Buy",  color: "text-yes-500",   bg: "bg-yes-500/10",   border: "border-yes-500/30",   Icon: TrendingUp   },
  BUY:         { label: "Buy",         color: "text-yes-500",   bg: "bg-yes-500/10",   border: "border-yes-500/20",   Icon: TrendingUp   },
  HOLD:        { label: "Hold",        color: "text-yellow-400",bg: "bg-yellow-400/10",border: "border-yellow-400/20",Icon: Minus        },
  SELL:        { label: "Sell",        color: "text-no-500",    bg: "bg-no-500/10",    border: "border-no-500/20",    Icon: TrendingDown },
  STRONG_SELL: { label: "Strong Sell", color: "text-no-500",    bg: "bg-no-500/10",    border: "border-no-500/30",    Icon: TrendingDown },
};

function Gauge({ score }: { score: number }) {
  // score: -100 to +100 → angle: -90° to +90°
  const clamped = Math.max(-100, Math.min(100, score));
  const angle   = (clamped / 100) * 90; // -90 to +90 degrees
  const rad     = ((angle - 90) * Math.PI) / 180;
  const cx = 80, cy = 80, r = 60;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);

  return (
    <svg viewBox="0 0 160 100" className="w-full max-w-[200px] mx-auto">
      {/* Background arc */}
      <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke="#252a3a" strokeWidth="12" strokeLinecap="round" />
      {/* Sell zone */}
      <path d="M 20 80 A 60 60 0 0 1 50 27" fill="none" stroke="#ef444433" strokeWidth="12" strokeLinecap="round" />
      {/* Buy zone */}
      <path d="M 110 27 A 60 60 0 0 1 140 80" fill="none" stroke="#22c55e33" strokeWidth="12" strokeLinecap="round" />
      {/* Score arc */}
      {clamped !== 0 && (
        <path
          d={clamped > 0
            ? `M 80 20 A 60 60 0 0 1 ${nx} ${ny}`
            : `M ${nx} ${ny} A 60 60 0 0 1 80 20`}
          fill="none"
          stroke={clamped > 0 ? "#22c55e" : "#ef4444"}
          strokeWidth="12"
          strokeLinecap="round"
        />
      )}
      {/* Needle */}
      <line
        x1={cx} y1={cy}
        x2={nx} y2={ny}
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="5" fill="white" />
      {/* Labels */}
      <text x="14"  y="96" fill="#ef4444" fontSize="9" textAnchor="middle">SELL</text>
      <text x="80"  y="14" fill="#9ca3af" fontSize="9" textAnchor="middle">HOLD</text>
      <text x="146" y="96" fill="#22c55e" fontSize="9" textAnchor="middle">BUY</text>
    </svg>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border last:border-0 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={cn("font-medium tabular-nums", color ?? "text-white")}>{value}</span>
    </div>
  );
}

function ChangeValue({ v }: { v: number }) {
  return (
    <span className={v >= 0 ? "text-yes-500" : "text-no-500"}>
      {v >= 0 ? "+" : ""}{v.toFixed(2)}%
    </span>
  );
}

export function ForecastAdvisor() {
  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } = useBtcForecast();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardTitle className="mb-4">BTC Forecast Advisor</CardTitle>
        <div className="h-48 bg-border/50 rounded-lg" />
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardTitle className="mb-2">BTC Forecast Advisor</CardTitle>
        <p className="text-xs text-gray-500">Unable to load forecast data.</p>
      </Card>
    );
  }

  const { signal, confidence, score, marketData: md, signals: s, reasoning } = data;
  const cfg = SIGNAL_CONFIG[signal];
  const { Icon } = cfg;

  return (
    <Card className={cn("border", cfg.border)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <CardTitle>BTC Forecast Advisor</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">
            {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
          <button
            onClick={() => refetch()}
            className="text-gray-500 hover:text-white transition-colors"
            disabled={isFetching}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Signal + gauge */}
      <div className={cn("rounded-xl p-4 mb-4 flex items-center gap-4", cfg.bg)}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={cn("w-5 h-5", cfg.color)} />
            <span className={cn("text-2xl font-bold", cfg.color)}>{cfg.label}</span>
          </div>
          <p className="text-xs text-gray-400">
            Confidence: <span className="text-white font-medium">{confidence}%</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Signal score: <span className="text-white font-medium">{score > 0 ? "+" : ""}{score}</span> / 100
          </p>
        </div>
        <div className="w-32 shrink-0">
          <Gauge score={score} />
        </div>
      </div>

      {/* Live price strip */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: "Price",  value: `$${md.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "text-white" },
          { label: "1h",    value: <ChangeValue v={md.change1h}   /> },
          { label: "24h",   value: <ChangeValue v={md.change24h}  /> },
          { label: "7d",    value: <ChangeValue v={md.change7d}   /> },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className="text-xs font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Technical indicators */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Technical Indicators</p>
        <div className="bg-surface rounded-lg px-3 py-1">
          <StatRow
            label="RSI (14)"
            value={s.rsi14.toFixed(1)}
            color={s.rsi14 < 30 ? "text-yes-500" : s.rsi14 > 70 ? "text-no-500" : "text-yellow-400"}
          />
          <StatRow label="7d SMA" value={`$${s.sma7.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          <StatRow label="30d SMA" value={`$${s.sma30.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          <StatRow
            label="Price vs 7d SMA"
            value={`${s.priceVsSma7 >= 0 ? "+" : ""}${s.priceVsSma7.toFixed(2)}%`}
            color={s.priceVsSma7 >= 0 ? "text-yes-500" : "text-no-500"}
          />
          <StatRow
            label="MACD"
            value={`${s.macd >= s.macdSignal ? "Bullish ↑" : "Bearish ↓"}`}
            color={s.macd >= s.macdSignal ? "text-yes-500" : "text-no-500"}
          />
          <StatRow
            label="Bollinger %B"
            value={`${(s.bollingerPct * 100).toFixed(0)}%`}
            color={s.bollingerPct < 0.2 ? "text-yes-500" : s.bollingerPct > 0.8 ? "text-no-500" : "text-gray-300"}
          />
        </div>
      </div>

      {/* Reasoning */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Signal Reasoning</p>
        <ul className="space-y-1.5">
          {reasoning.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
              <span className="text-brand-500 mt-0.5 shrink-0">·</span>
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 pt-3 border-t border-border flex items-start gap-1.5">
        <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600">
          Not financial advice. Technical signals only — always do your own research.
        </p>
      </div>
    </Card>
  );
}
