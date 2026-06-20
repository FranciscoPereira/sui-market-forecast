import { useState } from "react";
import { X } from "lucide-react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Button } from "./ui/Button";
import type { CreateMarketForm } from "@/types";
import { buildCreateMarketTx } from "@/lib/sui";

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

const DEFAULTS: CreateMarketForm = {
  question: "",
  yesLabel: "YES",
  noLabel: "NO",
  resolutionDate: "",
  oracle: "",
  creationFee: "0.01",
};

export function CreateMarketModal({ onClose, onSuccess }: Props) {
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [form, setForm] = useState<CreateMarketForm>(DEFAULTS);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof CreateMarketForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function validate(): string | null {
    if (!form.question.trim()) return "Question is required.";
    if (!form.resolutionDate) return "Resolution date is required.";
    if (new Date(form.resolutionDate).getTime() <= Date.now()) return "Resolution date must be in the future.";
    if (!form.oracle.startsWith("0x")) return "Oracle address must start with 0x.";
    if (Number(form.creationFee) <= 0) return "Creation fee must be > 0.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    if (!account) { setError("Connect your wallet first."); return; }

    const tx = buildCreateMarketTx(form, account.address);
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => { onSuccess?.(); onClose(); },
        onError: (e) => setError(e.message),
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Create Prediction Market</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Market Question">
            <textarea
              value={form.question}
              onChange={(e) => set("question", e.target.value)}
              rows={2}
              className="input-base resize-none"
              placeholder="Will ETH exceed $5,000 by Dec 31 2025?"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="YES Label">
              <input
                value={form.yesLabel}
                onChange={(e) => set("yesLabel", e.target.value)}
                className="input-base"
                placeholder="YES"
              />
            </Field>
            <Field label="NO Label">
              <input
                value={form.noLabel}
                onChange={(e) => set("noLabel", e.target.value)}
                className="input-base"
                placeholder="NO"
              />
            </Field>
          </div>

          <Field label="Resolution Date">
            <input
              type="datetime-local"
              value={form.resolutionDate}
              onChange={(e) => set("resolutionDate", e.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Oracle Address">
            <input
              value={form.oracle}
              onChange={(e) => set("oracle", e.target.value)}
              className="input-base font-mono text-xs"
              placeholder="0x..."
            />
          </Field>

          <Field label="Creation Fee (SUI)">
            <input
              type="number"
              min="0.01"
              step="0.001"
              value={form.creationFee}
              onChange={(e) => set("creationFee", e.target.value)}
              className="input-base"
            />
          </Field>

          {error && (
            <p className="text-no-500 text-xs bg-no-500/10 rounded px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={isPending} disabled={!account}>
              {account ? "Create Market" : "Connect Wallet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
