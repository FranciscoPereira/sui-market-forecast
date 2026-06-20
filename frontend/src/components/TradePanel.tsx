import { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Card, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import type { Market, Outcome, TradeForm } from "@/types";
import { buildBuyPositionTx } from "@/lib/sui";
import { suiToMist, cn } from "@/lib/utils";
import { MIN_COLLATERAL_MIST } from "@/lib/constants";

interface Props {
  market: Market;
  onSuccess?: () => void;
}

export function TradePanel({ market, onSuccess }: Props) {
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [form, setForm] = useState<TradeForm>({
    outcome: "YES",
    amount: "0.1",
    orderType: "market",
    limitPrice: market.yesPrice.toFixed(3),
  });

  const [error, setError] = useState<string | null>(null);
  const [txDigest, setTxDigest] = useState<string | null>(null);

  const isOpen = market.status === "OPEN";
  const collateralMist = suiToMist(Number(form.amount));
  const tooSmall = collateralMist < MIN_COLLATERAL_MIST;

  const estimatedTokens = form.amount
    ? (Number(form.amount) * (form.outcome === "YES" ? market.yesPrice : market.noPrice)) * 1e6
    : 0;

  function handleOutcome(outcome: Outcome) {
    setForm((f) => ({
      ...f,
      outcome,
      limitPrice: (outcome === "YES" ? market.yesPrice : market.noPrice).toFixed(3),
    }));
    setError(null);
    setTxDigest(null);
  }

  async function handleTrade() {
    if (!account) { setError("Connect your wallet first."); return; }
    if (tooSmall) { setError("Minimum collateral is 0.01 SUI."); return; }

    setError(null);
    const tx = buildBuyPositionTx(market.id, Number(form.amount), account.address);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (result) => {
          setTxDigest(result.digest);
          onSuccess?.();
        },
        onError: (err) => setError(err.message),
      }
    );
  }

  return (
    <Card>
      <CardTitle className="mb-4">Trade Outcome Tokens</CardTitle>

      {/* YES / NO selector */}
      <div className="flex rounded-lg overflow-hidden border border-border mb-4">
        {(["YES", "NO"] as Outcome[]).map((side) => (
          <button
            key={side}
            onClick={() => handleOutcome(side)}
            className={cn(
              "flex-1 py-2.5 text-sm font-semibold transition-colors",
              form.outcome === side
                ? side === "YES"
                  ? "bg-yes-500 text-white"
                  : "bg-no-500 text-white"
                : "bg-transparent text-gray-400 hover:text-white"
            )}
          >
            {side} · {side === "YES"
              ? (market.yesPrice * 100).toFixed(1)
              : (market.noPrice  * 100).toFixed(1)}%
          </button>
        ))}
      </div>

      {/* Order type */}
      <div className="flex gap-2 mb-4">
        {(["market", "limit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setForm((f) => ({ ...f, orderType: t }))}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              form.orderType === t
                ? "bg-brand-500/20 text-brand-500 border border-brand-500/40"
                : "text-gray-500 border border-border hover:border-gray-600"
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className="mb-3">
        <label className="text-xs text-gray-400 mb-1.5 block">
          Collateral (SUI)
        </label>
        <div className="relative">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-white text-sm
                       focus:outline-none focus:border-brand-500 pr-12"
            placeholder="0.00"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">SUI</span>
        </div>
      </div>

      {/* Limit price (only for limit orders) */}
      {form.orderType === "limit" && (
        <div className="mb-3">
          <label className="text-xs text-gray-400 mb-1.5 block">
            Limit Price (SUI per token)
          </label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.001"
            value={form.limitPrice}
            onChange={(e) => setForm((f) => ({ ...f, limitPrice: e.target.value }))}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-white text-sm
                       focus:outline-none focus:border-brand-500"
            placeholder="0.000"
          />
        </div>
      )}

      {/* Estimate */}
      <div className="bg-surface rounded-lg p-3 mb-4 text-xs space-y-1">
        <div className="flex justify-between text-gray-400">
          <span>You receive (est.)</span>
          <span className={form.outcome === "YES" ? "text-yes-500" : "text-no-500"}>
            {(estimatedTokens / 1e6).toFixed(4)} {form.outcome}
          </span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Platform fee (1%)</span>
          <span>{(Number(form.amount) * 0.01).toFixed(4)} SUI</span>
        </div>
        <div className="flex justify-between text-gray-400 border-t border-border pt-1 mt-1">
          <span>Net collateral</span>
          <span className="text-white">{(Number(form.amount) * 0.99).toFixed(4)} SUI</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-no-500 text-xs mb-3 bg-no-500/10 rounded px-3 py-2">{error}</p>
      )}

      {/* Success */}
      {txDigest && (
        <a
          href={`https://suiexplorer.com/txblock/${txDigest}?network=testnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-yes-500 mb-3 hover:underline truncate"
        >
          ✓ Confirmed: {txDigest.slice(0, 20)}…
        </a>
      )}

      <Button
        variant={form.outcome === "YES" ? "yes" : "no"}
        size="lg"
        className="w-full"
        disabled={!isOpen || !account || tooSmall}
        loading={isPending}
        onClick={handleTrade}
      >
        {!account
          ? "Connect Wallet"
          : !isOpen
          ? "Market Closed"
          : `Buy ${form.outcome} Tokens`}
      </Button>
    </Card>
  );
}
