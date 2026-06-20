import { useCurrentAccount } from "@mysten/dapp-kit";
import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MOCK_POSITIONS } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
  const account = useCurrentAccount();

  if (!account) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <h2 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-400 text-sm">Connect your SUI wallet to view your positions.</p>
      </div>
    );
  }

  const positions = MOCK_POSITIONS;

  const totalValue = positions.reduce((sum, p) => {
    const yesVal = (Number(p.yesBalance) / 1e6) * p.currentYesPrice;
    const noVal  = (Number(p.noBalance)  / 1e6) * p.currentNoPrice;
    return sum + yesVal + noVal;
  }, 0);

  const redeemable = positions.filter(
    (p) => p.marketStatus === "RESOLVED_YES" || p.marketStatus === "RESOLVED_NO"
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Your Portfolio</h1>
        <p className="text-sm text-gray-400 font-mono">{account.address}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Portfolio Value",   value: `${totalValue.toFixed(4)} SUI`,    icon: DollarSign,   color: "text-brand-500" },
          { label: "Open Positions",    value: positions.filter(p => p.marketStatus === "OPEN").length, icon: TrendingUp, color: "text-yes-500" },
          { label: "Claimable Wins",    value: redeemable.length,                  icon: TrendingDown, color: "text-no-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">{label}</p>
              <Icon className={cn("w-4 h-4", color)} />
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
          </Card>
        ))}
      </div>

      {/* Positions table */}
      <Card>
        <CardTitle className="mb-5">Positions</CardTitle>
        {positions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-3">No positions yet.</p>
            <Link to="/">
              <Button variant="outline" size="sm">Browse Markets</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {positions.map((pos) => {
              const yesTokens = Number(pos.yesBalance) / 1e6;
              const noTokens  = Number(pos.noBalance)  / 1e6;
              const currentVal =
                yesTokens * pos.currentYesPrice + noTokens * pos.currentNoPrice;
              const canRedeem =
                pos.marketStatus === "RESOLVED_YES" || pos.marketStatus === "RESOLVED_NO";

              return (
                <Link key={pos.id} to={`/market/${pos.marketId}`}>
                  <div className="border border-border rounded-xl p-4 hover:border-brand-500/40 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-sm font-medium text-white line-clamp-1 flex-1">
                        {pos.question}
                      </p>
                      <StatusBadge status={pos.marketStatus} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-gray-500 mb-0.5">YES Tokens</p>
                        <p className={cn("font-medium", yesTokens > 0 ? "text-yes-500" : "text-gray-600")}>
                          {yesTokens.toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-0.5">NO Tokens</p>
                        <p className={cn("font-medium", noTokens > 0 ? "text-no-500" : "text-gray-600")}>
                          {noTokens.toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-0.5">Current Value</p>
                        <p className="font-medium text-white">{currentVal.toFixed(4)} SUI</p>
                      </div>
                    </div>
                    {canRedeem && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <Button variant="yes" size="sm" onClick={(e) => e.preventDefault()}>
                          Redeem Winnings →
                        </Button>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
