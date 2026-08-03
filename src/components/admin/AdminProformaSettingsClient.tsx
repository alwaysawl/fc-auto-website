"use client";

import { useState } from "react";
import {
  DEFAULT_PAYMENT_ACCOUNT,
  DEFAULT_TERMS,
} from "@/lib/admin/proforma/constants";
import type {
  PaymentAccountSnapshot,
  ProformaSettings,
  TermSnapshot,
} from "@/lib/admin/proforma/types";

const fieldCls =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-[#1E293B] [color-scheme:light] [-webkit-text-fill-color:#1E293B] opacity-100 placeholder:text-slate-400 placeholder:[-webkit-text-fill-color:#94a3b8] outline-none focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/50";

export default function AdminProformaSettingsClient({
  initial,
}: {
  initial: ProformaSettings;
}) {
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [companyAddress, setCompanyAddress] = useState(initial.companyAddress);
  const [companyWebsite, setCompanyWebsite] = useState(initial.companyWebsite);
  const [accounts, setAccounts] = useState<PaymentAccountSnapshot[]>(
    initial.paymentAccounts.length
      ? initial.paymentAccounts
      : [{ ...DEFAULT_PAYMENT_ACCOUNT }]
  );
  const [terms, setTerms] = useState<TermSnapshot[]>(
    initial.defaultTerms.length
      ? initial.defaultTerms
      : DEFAULT_TERMS.map((t) => ({ ...t }))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/proforma-invoices/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyAddress,
          companyWebsite,
          paymentAccounts: accounts,
          defaultTerms: terms,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "保存失败");
      setMessage("设置已保存。已开具发票的历史快照不会被覆盖。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-10 space-y-6 border-t border-slate-200 pt-8">
      <div>
        <h2 className="text-lg font-bold text-[#1E293B]">形式发票设置</h2>
        <p className="mt-1 text-sm text-slate-500">
          公司信息与收款账户仅管理员可见。更改不会静默修改已开具发票的快照。
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {message}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-[#1E293B]">公司信息</h3>
        <div className="grid gap-3">
          <label className="text-xs font-semibold text-slate-500">
            公司名称
            <input
              className={fieldCls}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            地址
            <textarea
              className={fieldCls}
              rows={3}
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            网站
            <input
              className={fieldCls}
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#1E293B]">收款账户预设</h3>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold"
            onClick={() =>
              setAccounts((prev) => [
                ...prev,
                {
                  ...DEFAULT_PAYMENT_ACCOUNT,
                  id: `acct_${Date.now()}`,
                  label: `账户 ${prev.length + 1}`,
                },
              ])
            }
          >
            添加账户
          </button>
        </div>
        <div className="space-y-4">
          {accounts.map((acct, index) => (
            <div
              key={acct.id || index}
              className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2"
            >
              {(
                [
                  ["label", "账户标签"],
                  ["fullName", "收款人姓名"],
                  ["bankName", "银行名称"],
                  ["accountNumber", "银行账号"],
                  ["swift", "SWIFT"],
                  ["bankAddress", "银行地址"],
                  ["paymentNote", "付款备注"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className={`text-xs font-semibold text-slate-500 ${
                    key === "bankAddress" || key === "paymentNote"
                      ? "sm:col-span-2"
                      : ""
                  }`}
                >
                  {label}
                  <input
                    className={fieldCls}
                    value={acct[key] || ""}
                    onChange={(e) =>
                      setAccounts((prev) =>
                        prev.map((a, i) =>
                          i === index ? { ...a, [key]: e.target.value } : a
                        )
                      )
                    }
                  />
                </label>
              ))}
              <button
                type="button"
                className="justify-self-start rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                onClick={() =>
                  setAccounts((prev) => prev.filter((_, i) => i !== index))
                }
              >
                删除此账户
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-[#1E293B]">默认条款</h3>
        <div className="space-y-3">
          {terms.map((term) => (
            <div key={term.id} className="rounded-lg border border-slate-200 p-3">
              <label className="mb-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={term.enabled}
                  onChange={(e) =>
                    setTerms((prev) =>
                      prev.map((t) =>
                        t.id === term.id
                          ? { ...t, enabled: e.target.checked }
                          : t
                      )
                    )
                  }
                />
                默认启用
              </label>
              <textarea
                className={fieldCls}
                rows={2}
                value={term.textZh}
                onChange={(e) =>
                  setTerms((prev) =>
                    prev.map((t) =>
                      t.id === term.id ? { ...t, textZh: e.target.value } : t
                    )
                  )
                }
              />
              <textarea
                className={`${fieldCls} mt-2`}
                rows={2}
                value={term.textEn}
                onChange={(e) =>
                  setTerms((prev) =>
                    prev.map((t) =>
                      t.id === term.id ? { ...t, textEn: e.target.value } : t
                    )
                  )
                }
              />
            </div>
          ))}
        </div>
      </section>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="inline-flex items-center rounded-lg bg-[#FACC15] px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:brightness-95 disabled:opacity-60"
      >
        {saving ? "保存中…" : "保存形式发票设置"}
      </button>
    </div>
  );
}
