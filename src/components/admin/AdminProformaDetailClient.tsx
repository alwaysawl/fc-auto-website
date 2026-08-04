"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProformaDetail } from "@/lib/admin/proforma/types";
import { PI_MAX_VEHICLES } from "@/lib/proforma/layout";
import ProformaPdfActions from "@/components/admin/ProformaPdfActions";

export default function AdminProformaDetailClient({
  invoice,
}: {
  invoice: ProformaDetail;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const overLimit = invoice.items.length > PI_MAX_VEHICLES;

  const duplicate = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/proforma-invoices/${invoice.id}/duplicate`,
        { method: "POST", credentials: "include" }
      );
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !json.id) throw new Error(json.error || "复制失败");
      router.push(`/admin/proforma-invoices/${json.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "复制失败");
      setBusy(false);
    }
  };

  return (
    <>
      {overLimit ? (
        <span className="self-center rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-950">
          此发票含 {invoice.items.length} 台车辆（超过 8 台上限）。历史数据已保留 —
          请编辑或复制后删至 8 台以内再生成 PDF。
        </span>
      ) : null}
      <ProformaPdfActions
        key={invoice.id}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        disabled={busy || overLimit}
        onMessage={setMessage}
        onError={setError}
      />
      <button
        type="button"
        disabled={busy}
        onClick={(e) => void duplicate(e)}
        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:bg-slate-50 disabled:opacity-60"
      >
        复制为新发票
      </button>
      {error ? (
        <span className="self-center text-sm text-red-700">{error}</span>
      ) : null}
      {message ? (
        <span className="self-center text-sm text-sky-800">{message}</span>
      ) : null}
    </>
  );
}
