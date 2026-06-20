import { useState } from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { MarketCard } from "@/components/MarketCard";
import { CreateMarketModal } from "@/components/CreateMarketModal";
import { Button } from "@/components/ui/Button";
import { MOCK_MARKETS } from "@/lib/mockData";
import type { Market, MarketStatus } from "@/types";

const STATUS_FILTERS: { label: string; value: MarketStatus | "ALL" }[] = [
  { label: "All",      value: "ALL"         },
  { label: "Open",     value: "OPEN"        },
  { label: "Resolved", value: "RESOLVED_YES"},
  { label: "Expired",  value: "EXPIRED"     },
];

export default function MarketsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<MarketStatus | "ALL">("ALL");

  const markets: Market[] = MOCK_MARKETS;

  const filtered = markets.filter((m) => {
    const matchSearch = m.question.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "RESOLVED_YES"
        ? m.status === "RESOLVED_YES" || m.status === "RESOLVED_NO"
        : m.status === statusFilter);
    return matchSearch && matchStatus;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Prediction Markets</h1>
        <p className="text-gray-400 text-sm max-w-xl">
          Trade YES/NO outcome tokens on real-world events. Backed by SUI collateral,
          settled on-chain via oracle. Order-book trading powered by DeepBook.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Open Markets", value: markets.filter(m => m.status === "OPEN").length },
          { label: "Total Locked",  value: `${(markets.reduce((s, m) => s + Number(m.collateralLocked), 0) / 1e9).toFixed(1)} SUI` },
          { label: "Resolved",      value: markets.filter(m => m.status !== "OPEN").length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search markets…"
            className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-white
                       placeholder:text-gray-600 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setStatus(value as MarketStatus | "ALL")}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === value
                  ? "bg-brand-500 text-white"
                  : "bg-card border border-border text-gray-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm" className="shrink-0">
          <Plus className="w-4 h-4" />
          Create Market
        </Button>
      </div>

      {/* Market grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <SlidersHorizontal className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No markets match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateMarketModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
