import { Card, CardTitle } from "./ui/Card";
import type { OrderBook } from "@/types";

interface Props {
  orderBook: OrderBook;
  onSelectPrice?: (price: number, isBid: boolean) => void;
}

export function OrderBookPanel({ orderBook, onSelectPrice }: Props) {
  const maxTotal = Math.max(
    ...orderBook.bids.map((b) => b.total),
    ...orderBook.asks.map((a) => a.total),
  );

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <CardTitle>Order Book</CardTitle>
        <div className="text-xs text-gray-500">
          Spread: <span className="text-white">{(orderBook.spread * 100).toFixed(2)}%</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 text-xs text-gray-500 mb-1 px-1">
        <span>Price</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (sell orders) — displayed top-to-bottom, lowest ask at bottom */}
      <div className="flex flex-col-reverse gap-px mb-1">
        {orderBook.asks.slice(0, 5).map((ask, i) => (
          <button
            key={i}
            className="relative grid grid-cols-3 text-xs px-1 py-1 rounded hover:bg-no-500/10 transition-colors w-full text-left"
            onClick={() => onSelectPrice?.(ask.price, false)}
          >
            <div
              className="absolute inset-0 bg-no-500/10 rounded"
              style={{ width: `${(ask.total / maxTotal) * 100}%` }}
            />
            <span className="relative text-no-500">{ask.price.toFixed(3)}</span>
            <span className="relative text-center text-gray-300">{ask.quantity.toLocaleString()}</span>
            <span className="relative text-right text-gray-400">{ask.total.toLocaleString()}</span>
          </button>
        ))}
      </div>

      {/* Mid price */}
      <div className="text-center py-2 text-sm font-semibold text-white border-y border-border my-1">
        {orderBook.midPrice.toFixed(4)}
        <span className="text-xs text-gray-500 ml-1">SUI</span>
      </div>

      {/* Bids (buy orders) */}
      <div className="flex flex-col gap-px mt-1">
        {orderBook.bids.slice(0, 5).map((bid, i) => (
          <button
            key={i}
            className="relative grid grid-cols-3 text-xs px-1 py-1 rounded hover:bg-yes-500/10 transition-colors w-full text-left"
            onClick={() => onSelectPrice?.(bid.price, true)}
          >
            <div
              className="absolute inset-0 bg-yes-500/10 rounded"
              style={{ width: `${(bid.total / maxTotal) * 100}%` }}
            />
            <span className="relative text-yes-500">{bid.price.toFixed(3)}</span>
            <span className="relative text-center text-gray-300">{bid.quantity.toLocaleString()}</span>
            <span className="relative text-right text-gray-400">{bid.total.toLocaleString()}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
