import Link from "next/link";

export default function AdminEmptyState({
  title = "暂无数据",
  description,
  actionLabel,
  actionHref,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM1 1h4l2.68 13.39a2 2 0 001.97 1.61h9.72a2 2 0 001.97-1.61L23 6H6"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-[#1E293B] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mb-4">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FACC15] text-[#1E293B] text-sm font-semibold rounded-lg hover:bg-yellow-300 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
