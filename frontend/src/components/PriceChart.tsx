import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { PriceFeedEntry } from "@/types";
import { Card, CardTitle } from "./ui/Card";

interface Props {
  data: PriceFeedEntry[];
  // When showing raw USD price (real data), pass these
  isUsdMode?: boolean;
  targetPrice?: number | null;
  coinLabel?: string;
  loading?: boolean;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatUsd(v: number) {
  return "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

const CustomTooltip = ({ active, payload, label, isUsdMode }: any) => {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{formatTime(label)}</p>
      {isUsdMode ? (
        <p className="text-brand-500 font-medium">{formatUsd(value)}</p>
      ) : (
        <>
          <p className="text-yes-500">YES: {(value * 100)?.toFixed(1)}%</p>
          <p className="text-no-500">NO: {((1 - value) * 100)?.toFixed(1)}%</p>
        </>
      )}
    </div>
  );
};

export function PriceChart({ data, isUsdMode, targetPrice, coinLabel, loading }: Props) {
  const prices = data.map((d) => d.yesPrice);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const pad  = (maxP - minP) * 0.05 || 1;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <CardTitle>
          {isUsdMode ? `${coinLabel ?? "Price"} · 24h` : "Implied Probability · 24h"}
        </CardTitle>
        {loading && <span className="text-xs text-gray-500 animate-pulse">Updating…</span>}
        {!loading && isUsdMode && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yes-500 animate-pulse inline-block" />
            Live · CoinGecko
          </span>
        )}
      </div>

      {loading && data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">
          Loading price data…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#4f6ef7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#252a3a" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={isUsdMode ? [minP - pad, maxP + pad] : [0, 1]}
              tickFormatter={isUsdMode ? formatUsd : (v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={isUsdMode ? 72 : 42}
            />
            <Tooltip content={<CustomTooltip isUsdMode={isUsdMode} />} />
            {isUsdMode && targetPrice && (
              <ReferenceLine
                y={targetPrice}
                stroke="#22c55e"
                strokeDasharray="4 3"
                label={{ value: `Target $${targetPrice.toLocaleString()}`, fill: "#22c55e", fontSize: 10, position: "insideTopRight" }}
              />
            )}
            <Area
              type="monotone"
              dataKey="yesPrice"
              stroke={isUsdMode ? "#4f6ef7" : "#22c55e"}
              strokeWidth={2}
              fill="url(#priceGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
