import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { PriceFeedEntry } from "@/types";
import { Card, CardTitle } from "./ui/Card";

interface Props {
  data: PriceFeedEntry[];
  marketQuestion: string;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{formatTime(label)}</p>
      <p className="text-yes-500">YES: {(payload[0]?.value * 100)?.toFixed(1)}%</p>
      <p className="text-no-500">NO:  {(payload[1]?.value * 100)?.toFixed(1)}%</p>
    </div>
  );
};

export function PriceChart({ data, marketQuestion }: Props) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <CardTitle>Price History</CardTitle>
        <span className="text-xs text-gray-500">24h</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="yesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="noGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
            domain={[0, 1]}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="yesPrice"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#yesGrad)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="noPrice"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#noGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
