import { cn } from "@/lib/utils";
import type { MarketStatus } from "@/types";

const STATUS_STYLES: Record<MarketStatus, string> = {
  OPEN:         "bg-brand-500/20 text-brand-500 border-brand-500/30",
  RESOLVED_YES: "bg-yes-100/20 text-yes-500 border-yes-500/30",
  RESOLVED_NO:  "bg-no-100/20 text-no-500 border-no-500/30",
  INVALID:      "bg-gray-500/20 text-gray-400 border-gray-500/30",
  EXPIRED:      "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const STATUS_LABELS: Record<MarketStatus, string> = {
  OPEN:         "Open",
  RESOLVED_YES: "YES Won",
  RESOLVED_NO:  "NO Won",
  INVALID:      "Invalid",
  EXPIRED:      "Expired",
};

interface BadgeProps {
  status: MarketStatus;
  className?: string;
}

export function StatusBadge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        STATUS_STYLES[status],
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {STATUS_LABELS[status]}
    </span>
  );
}
