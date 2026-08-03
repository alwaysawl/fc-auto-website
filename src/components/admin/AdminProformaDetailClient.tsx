"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProformaDetail } from "@/lib/admin/proforma/types";
import {
  detailToPdfSource,
  downloadProformaPdf,
} from "@/lib/proforma/buildProformaPdf";

export default function AdminProformaDetailClient({
  invoice,
}: {
  invoice: ProformaDetail;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await downloadProformaPdf(detailToPdfSource(invoice));
      await fetch(`/api/admin/proforma-invoices/${invoice.id}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfGenerated: true }),
      });
      setMessage("PDF 已下载");
    } catch {
      setMessage("PDF 下载失败");
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async () => {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/proforma-invoices/${invoice.id}/duplicate`,
        { method: "POST", credentials: "include" }
      );
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !json.id) throw new Error(json.error || "复制失败");
      router.push(`/admin/proforma-invoices/${json.id}/edit`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "复制失败");
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => void download()}
        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:bg-slate-50 disabled:opacity-60"
      >
        下载 PDF
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void duplicate()}
        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:bg-slate-50 disabled:opacity-60"
      >
        复制为新发票
      </button>
      {message ? (
        <span className="self-center text-sm text-sky-800">{message}</span>
      ) : null}
    </>
  );
}
