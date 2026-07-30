import type { VehicleStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  VehicleStatus,
  { label: string; className: string }
> = {
  在售: {
    label: "在售",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  已售: {
    label: "已售",
    className: "bg-slate-100 text-slate-500 border border-slate-200",
  },
  草稿: {
    label: "草稿",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  已下架: {
    label: "已下架",
    className: "bg-red-50 text-red-600 border border-red-200",
  },
};

export default function VehicleStatusBadge({
  status,
}: {
  status?: VehicleStatus | string;
}) {
  const resolved = (status ?? "在售") as VehicleStatus;
  const cfg = STATUS_CONFIG[resolved] ?? STATUS_CONFIG["在售"];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}
