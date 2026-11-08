import type { StockStatus } from "../types";

type ChipStatus = StockStatus | "ordered";

const TONES: Record<ChipStatus, string> = {
  ok: "bg-success-100 text-success",
  low: "bg-warning-100 text-warning",
  out: "bg-danger-100 text-danger",
  ordered: "bg-line-soft text-navy-700",
};

const LABELS: Record<ChipStatus, string> = { ok: "In stock", low: "Low", out: "Out of stock", ordered: "Ordered" };

export default function StatusChip({ status, label, className = "" }: { status: ChipStatus; label?: string; className?: string }) {
  return (
    <span className={`text-[13px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${TONES[status]} ${className}`}>
      {label ?? LABELS[status]}
    </span>
  );
}
