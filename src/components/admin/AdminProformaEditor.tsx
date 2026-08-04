"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_CHARGE_TEMPLATES,
  DEFAULT_TERMS,
  DEFAULT_VALIDITY_TEXT,
  PROFORMA_SALESPERSON_CONTACTS,
  termsContainLegacy3DayBalance,
  upgradeDraftLegacyTerms,
} from "@/lib/admin/proforma/constants";
import {
  calcLineTotal,
  calcTotals,
  formatUsd,
  todayShanghaiDate,
} from "@/lib/admin/proforma/money";
import type {
  CompanySnapshot,
  PaymentAccountSnapshot,
  ProformaDetail,
  ProformaSettings,
  TermSnapshot,
} from "@/lib/admin/proforma/types";
import { downloadProformaPdf } from "@/lib/proforma/downloadProformaPdf";
import AdminProformaPreview, {
  type ProformaPreviewModel,
} from "@/components/admin/AdminProformaPreview";
import {
  PI_MAX_VEHICLES,
  PI_MAX_VEHICLES_EN,
  PI_MAX_VEHICLES_ZH,
  checkProformaOnePageFit,
} from "@/lib/proforma/layout";

const fieldCls =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-[#1E293B] [color-scheme:light] [-webkit-text-fill-color:#1E293B] opacity-100 placeholder:text-slate-400 placeholder:[-webkit-text-fill-color:#94a3b8] outline-none focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/50";

const btnGold =
  "inline-flex items-center justify-center rounded-lg bg-[#FACC15] px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:bg-slate-50 disabled:opacity-60";

type VehicleOption = {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  colour: string;
  vin: string;
  price: number;
  label: string;
};

type EditorItem = {
  key: string;
  vehicleId: string;
  brand: string;
  model: string;
  year: string;
  colour: string;
  vin: string;
  unitPriceUsd: string;
  quantity: string;
  note: string;
};

type EditorCharge = {
  key: string;
  nameZh: string;
  nameEn: string;
  amountUsd: string;
  note: string;
};

type ShippingCountry = {
  id: string;
  name_en: string;
  name_zh: string | null;
  ports: Array<{
    id: string;
    port_id: string;
    name_en: string;
    name_zh: string | null;
    single_vehicle_usd: number;
  }>;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyItem(): EditorItem {
  return {
    key: uid(),
    vehicleId: "",
    brand: "",
    model: "",
    year: "",
    colour: "",
    vin: "",
    unitPriceUsd: "0",
    quantity: "1",
    note: "",
  };
}

function emptyCharge(
  nameZh = "",
  nameEn = "",
  amount = "0"
): EditorCharge {
  return { key: uid(), nameZh, nameEn, amountUsd: amount, note: "" };
}

function parseMoney(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildInitialItems(detail?: ProformaDetail | null): EditorItem[] {
  if (!detail?.items.length) return [emptyItem()];
  return detail.items.map((item) => ({
    key: item.id || uid(),
    vehicleId: item.vehicleId || "",
    brand: item.brand,
    model: item.model,
    year: item.year || "",
    colour: item.colour || "",
    vin: item.vin || "",
    unitPriceUsd: String(item.unitPriceUsd),
    quantity: String(item.quantity),
    note: item.note || "",
  }));
}

function buildInitialCharges(detail?: ProformaDetail | null): EditorCharge[] {
  if (detail?.charges.length) {
    return detail.charges.map((c) => ({
      key: c.id || uid(),
      nameZh: c.nameZh,
      nameEn: c.nameEn,
      amountUsd: String(c.amountUsd),
      note: c.note || "",
    }));
  }
  return DEFAULT_CHARGE_TEMPLATES.map((c) =>
    emptyCharge(c.nameZh, c.nameEn, String(c.amountUsd))
  );
}

export default function AdminProformaEditor({
  mode,
  initial,
  settings,
}: {
  mode: "create" | "edit";
  initial?: ProformaDetail | null;
  settings: ProformaSettings;
}) {
  const router = useRouter();
  const defaultSales = PROFORMA_SALESPERSON_CONTACTS.Shawn;

  const [invoiceNumber] = useState(initial?.invoiceNumber ?? "（保存后生成）");
  const [contractNumber, setContractNumber] = useState(
    initial?.contractNumber ?? ""
  );
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [customerCompany, setCustomerCompany] = useState(
    initial?.customerCompany ?? ""
  );
  const [customerCountry, setCustomerCountry] = useState(
    initial?.customerCountry ?? ""
  );
  const [customerAddress, setCustomerAddress] = useState(
    initial?.customerAddress ?? ""
  );
  const [customerWhatsapp, setCustomerWhatsapp] = useState(
    initial?.customerWhatsapp ?? ""
  );
  const [customerEmail, setCustomerEmail] = useState(
    initial?.customerEmail ?? ""
  );
  const [offerDate, setOfferDate] = useState(
    initial?.offerDate ?? todayShanghaiDate()
  );
  const [validityText, setValidityText] = useState(
    initial?.validityText ?? DEFAULT_VALIDITY_TEXT
  );
  const [destinationCountry, setDestinationCountry] = useState(
    initial?.destinationCountry ?? ""
  );
  const [destinationPort, setDestinationPort] = useState(
    initial?.destinationPort ?? ""
  );
  const [salespersonName, setSalespersonName] = useState(
    initial?.salespersonName === "Miles" ? "Miles" : "Shawn"
  );
  const [salespersonPhone, setSalespersonPhone] = useState(
    initial?.salespersonPhone ?? defaultSales.phone
  );
  const [salespersonEmail, setSalespersonEmail] = useState(
    initial?.salespersonEmail ?? defaultSales.email
  );
  const [overrideContact, setOverrideContact] = useState(false);
  const [company, setCompany] = useState<CompanySnapshot>(
    initial?.companySnapshot ?? {
      companyName: settings.companyName,
      companyAddress: settings.companyAddress,
      companyWebsite: settings.companyWebsite,
    }
  );
  const [payment, setPayment] = useState<PaymentAccountSnapshot>(
    initial?.paymentSnapshot ??
      settings.paymentAccounts[0] ?? {
        fullName: "",
        bankName: "",
        accountNumber: "",
        swift: "",
        bankAddress: "",
        paymentNote: "",
      }
  );
  const [paymentAccountId, setPaymentAccountId] = useState(
    initial?.paymentSnapshot?.id ?? settings.paymentAccounts[0]?.id ?? ""
  );
  const [items, setItems] = useState<EditorItem[]>(() =>
    buildInitialItems(initial)
  );
  const [charges, setCharges] = useState<EditorCharge[]>(() =>
    buildInitialCharges(initial)
  );
  const [depositUsd, setDepositUsd] = useState(
    String(initial?.depositUsd ?? 0)
  );
  const [terms, setTerms] = useState<TermSnapshot[]>(() => {
    if (initial?.termsSnapshot?.length) {
      // Draft-only explicit upgrade of legacy 3-day default wording.
      // Issued / completed / paid invoices keep exact saved terms.
      if (
        initial.status === "draft" &&
        termsContainLegacy3DayBalance(initial.termsSnapshot)
      ) {
        return upgradeDraftLegacyTerms(initial.termsSnapshot);
      }
      return initial.termsSnapshot.map((t) => ({ ...t }));
    }
    if (settings.defaultTerms.length) {
      return settings.defaultTerms.map((t) => ({ ...t }));
    }
    return DEFAULT_TERMS.map((t) => ({ ...t }));
  });
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [internalNotes, setInternalNotes] = useState(
    initial?.internalNotes ?? ""
  );

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [shipping, setShipping] = useState<ShippingCountry[]>([]);
  const [showFreightImport, setShowFreightImport] = useState(false);
  const [freightCountryId, setFreightCountryId] = useState("");
  const [freightPortId, setFreightPortId] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [depositWarning, setDepositWarning] = useState(false);

  const totals = useMemo(() => {
    const itemTotals = items.map((item) =>
      calcLineTotal(parseMoney(item.unitPriceUsd), Number(item.quantity) || 0)
    );
    const chargeAmounts = charges.map((c) => parseMoney(c.amountUsd));
    return calcTotals({
      itemTotals,
      chargeAmounts,
      depositUsd: parseMoney(depositUsd),
    });
  }, [items, charges, depositUsd]);

  const previewModel: ProformaPreviewModel = useMemo(
    () => ({
      invoiceNumber,
      contractNumber: contractNumber || invoiceNumber,
      offerDate,
      validityText,
      customerName,
      customerCompany,
      customerCountry,
      customerAddress,
      customerWhatsapp,
      customerEmail,
      destinationCountry,
      destinationPort,
      salespersonName,
      salespersonPhone,
      salespersonEmail,
      company,
      payment,
      items: items.map((item) => ({
        brand: item.brand,
        model: item.model,
        year: item.year,
        colour: item.colour,
        vin: item.vin,
        unitPriceUsd: parseMoney(item.unitPriceUsd),
        quantity: Number(item.quantity) || 1,
        totalUsd: calcLineTotal(
          parseMoney(item.unitPriceUsd),
          Number(item.quantity) || 1
        ),
        note: item.note,
      })),
      charges: charges.map((c) => ({
        nameZh: c.nameZh,
        nameEn: c.nameEn,
        amountUsd: parseMoney(c.amountUsd),
      })),
      vehicleSubtotalUsd: totals.vehicleSubtotalUsd,
      chargesTotalUsd: totals.chargesTotalUsd,
      totalUsd: totals.totalUsd,
      depositUsd: totals.depositUsd,
      balanceUsd: totals.balanceUsd,
      terms,
      notes,
    }),
    [
      invoiceNumber,
      contractNumber,
      offerDate,
      validityText,
      customerName,
      customerCompany,
      customerCountry,
      customerAddress,
      customerWhatsapp,
      customerEmail,
      destinationCountry,
      destinationPort,
      salespersonName,
      salespersonPhone,
      salespersonEmail,
      company,
      payment,
      items,
      charges,
      totals,
      terms,
      notes,
    ]
  );

  const selectSalesperson = (name: "Shawn" | "Miles") => {
    setSalespersonName(name);
    if (!overrideContact) {
      const c = PROFORMA_SALESPERSON_CONTACTS[name];
      setSalespersonPhone(c.phone);
      setSalespersonEmail(c.email);
    }
  };

  const ensureVehicles = async () => {
    if (vehiclesLoaded) return;
    try {
      const res = await fetch("/api/vehicles", { credentials: "include" });
      const json = (await res.json()) as {
        vehicles?: Array<Record<string, unknown>>;
      };
      const list = (json.vehicles ?? []).slice(0, 400).map((v) => {
        const brand = String(v.brand ?? "");
        const model = String(v.model ?? "");
        const year = typeof v.year === "number" ? v.year : null;
        return {
          id: String(v.id),
          brand,
          model,
          year,
          colour: String(v.color ?? ""),
          vin: String(v.vin ?? ""),
          price: Number(v.fobPrice ?? v.price ?? 0) || 0,
          label:
            String(v.titleEn ?? "").trim() ||
            `${brand} ${model}`.trim() ||
            String(v.id),
        };
      });
      setVehicles(list);
      setVehiclesLoaded(true);
    } catch {
      setError("车辆库存加载失败");
    }
  };

  const ensureShipping = async () => {
    if (shipping.length) return;
    try {
      const res = await fetch("/api/admin/shipping/countries", {
        credentials: "include",
      });
      const json = (await res.json()) as {
        countries?: ShippingCountry[];
        items?: ShippingCountry[];
      };
      setShipping(json.countries ?? json.items ?? []);
    } catch {
      setError("运费数据加载失败");
    }
  };

  const applyVehicle = (key: string, vehicleId: string) => {
    const v = vehicles.find((x) => x.id === vehicleId);
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        if (!v) return { ...item, vehicleId: "" };
        return {
          ...item,
          vehicleId: v.id,
          brand: v.brand,
          model: v.model,
          year: v.year != null ? String(v.year) : "",
          colour: v.colour,
          vin: v.vin,
          unitPriceUsd: String(v.price),
        };
      })
    );
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return next;
    });
  };

  const buildPayload = () => ({
    contractNumber: contractNumber || null,
    customerName,
    customerCompany: customerCompany || null,
    customerCountry: customerCountry || null,
    customerAddress: customerAddress || null,
    customerWhatsapp: customerWhatsapp || null,
    customerEmail: customerEmail || null,
    offerDate,
    validityText: validityText || null,
    destinationCountry: destinationCountry || null,
    destinationPort: destinationPort || null,
    salespersonName,
    salespersonPhone,
    salespersonEmail,
    overrideContact,
    companySnapshot: company,
    paymentSnapshot: payment,
    depositUsd: parseMoney(depositUsd),
    termsSnapshot: terms,
    notes: notes || null,
    internalNotes: internalNotes || null,
    items: items.map((item) => ({
      vehicleId: item.vehicleId || null,
      brand: item.brand,
      model: item.model,
      year: item.year || null,
      colour: item.colour || null,
      vin: item.vin || null,
      unitPriceUsd: parseMoney(item.unitPriceUsd),
      quantity: Number(item.quantity) || 1,
      note: item.note || null,
    })),
    charges: charges.map((c) => ({
      nameZh: c.nameZh,
      nameEn: c.nameEn,
      amountUsd: parseMoney(c.amountUsd),
      note: c.note || null,
    })),
    idempotencyKey: uid(),
  });

  const downloadSavedPdf = async () => {
    if (!initial?.id) {
      setError("请先保存发票后再下载 PDF");
      return;
    }
    if (saving) return;

    const fit = checkProformaOnePageFit({
      vehicleCount: items.length,
      enabledTerms: terms
        .filter((t) => t.enabled)
        .map((t) => ({ textEn: t.textEn, textZh: t.textZh })),
      notes,
    });
    if (!fit.ok) {
      setError(fit.errorZh || fit.errorEn || "无法生成 PDF");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { filename } = await downloadProformaPdf(initial.id);
      setMessage(`已下载真实 A4 PDF：${filename}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF 下载失败");
    } finally {
      setSaving(false);
    }
  };

  const save = async (opts: {
    generatePdf?: boolean;
    markIssued?: boolean;
  }) => {
    if (saving) return;

    if (items.length > PI_MAX_VEHICLES) {
      setError(
        `${PI_MAX_VEHICLES_ZH} 当前 ${items.length} 台。请删除多余车辆后再保存。 / ${PI_MAX_VEHICLES_EN}`
      );
      return;
    }

    if (opts.generatePdf) {
      const fit = checkProformaOnePageFit({
        vehicleCount: items.length,
        enabledTerms: terms
          .filter((t) => t.enabled)
          .map((t) => ({ textEn: t.textEn, textZh: t.textZh })),
        notes,
      });
      if (!fit.ok) {
        setError(fit.errorZh || fit.errorEn || "无法生成 PDF");
        return;
      }
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    setDepositWarning(false);

    if (totals.depositUsd > totals.totalUsd + 0.001) {
      setDepositWarning(true);
      const ok = window.confirm(
        "定金超过总计金额。是否仍要继续保存？"
      );
      if (!ok) {
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        ...buildPayload(),
        markIssued: Boolean(opts.markIssued),
        status: opts.markIssued ? "issued" : initial?.status ?? "draft",
      };

      const url =
        mode === "edit" && initial
          ? `/api/admin/proforma-invoices/${initial.id}`
          : "/api/admin/proforma-invoices";
      const method = mode === "edit" && initial ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        error?: string;
        id?: string;
        invoiceNumber?: string;
        depositExceedsTotal?: boolean;
      };
      if (!res.ok) {
        throw new Error(json.error || "保存失败");
      }

      const savedId = json.id || initial?.id;
      const savedNumber = json.invoiceNumber || initial?.invoiceNumber || "";

      if (opts.generatePdf && savedNumber) {
        if (!savedId) {
          throw new Error("发票已保存但缺少 ID，无法生成 PDF");
        }
        const { filename } = await downloadProformaPdf(savedId);
        if (!opts.markIssued) {
          const confirmIssued = window.confirm(
            "PDF 已生成。是否将状态更新为「已开具」？"
          );
          if (confirmIssued) {
            await fetch(`/api/admin/proforma-invoices/${savedId}/status`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "issued" }),
            });
          }
        }
        setMessage(`已保存 ${savedNumber}，并下载 PDF：${filename}`);
      } else {
        setMessage(`草稿已保存 ${savedNumber}`);
      }

      if (mode === "create" && savedId) {
        router.push(`/admin/proforma-invoices/${savedId}/edit`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const importFreight = () => {
    const country = shipping.find((c) => c.id === freightCountryId);
    const port = country?.ports.find(
      (p) => p.id === freightPortId || p.port_id === freightPortId
    );
    if (!country || !port) {
      setError("请选择目的国家与港口");
      return;
    }
    const amount = Number(port.single_vehicle_usd) || 0;
    setDestinationCountry(country.name_en || country.name_zh || "");
    setDestinationPort(port.name_en || port.name_zh || "");
    setCharges((prev) => {
      const next = [...prev];
      const idx = next.findIndex(
        (c) => c.nameEn.toLowerCase().includes("ocean") || c.nameZh.includes("海运")
      );
      if (idx >= 0) {
        next[idx] = {
          ...next[idx]!,
          amountUsd: String(amount),
          note: `Imported from freight: ${country.name_en} / ${port.name_en}`,
        };
      } else {
        next.push(
          emptyCharge("海运费", "Ocean Freight", String(amount))
        );
      }
      return next;
    });
    setShowFreightImport(false);
    setMessage(`已导入海运费 ${formatUsd(amount)}，请复核后保存`);
  };

  return (
    <div className="pb-24">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">
            {mode === "create" ? "新建形式发票" : `编辑 ${invoiceNumber}`}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            选择销售人员、添加车辆与费用，预览后保存并生成 PDF。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnGhost}
            onClick={() => setShowPreview(true)}
          >
            预览
          </button>
          <button
            type="button"
            className={btnGhost}
            disabled={saving}
            onClick={() => void save({})}
          >
            保存草稿
          </button>
          {mode === "edit" && initial?.invoiceNumber ? (
            <button
              type="button"
              className={btnGhost}
              disabled={saving}
              onClick={() => void downloadSavedPdf()}
            >
              下载 PDF
            </button>
          ) : null}
          <button
            type="button"
            className={btnGold}
            disabled={saving}
            onClick={() => void save({ generatePdf: true })}
          >
            {saving ? "保存中…" : "保存并生成 PDF"}
          </button>
          <Link href="/admin/proforma-invoices" className={btnGhost}>
            取消
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {message}
        </div>
      )}
      {depositWarning && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          定金超过总计，请确认。
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          {/* Meta */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-[#1E293B]">发票信息</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-500">
                发票编号
                <input className={fieldCls} value={invoiceNumber} disabled />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                合同号 / Contract Number
                <input
                  className={fieldCls}
                  value={contractNumber}
                  placeholder="保存后自动生成 CT-YYYYMMDD-0001，可手动修改"
                  onChange={(e) => setContractNumber(e.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                报价日期 / Offer Date *
                <input
                  type="date"
                  className={fieldCls}
                  value={offerDate}
                  onChange={(e) => setOfferDate(e.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                有效期 / Validity
                <input
                  className={fieldCls}
                  value={validityText}
                  onChange={(e) => setValidityText(e.target.value)}
                  placeholder="7 Days"
                />
              </label>
            </div>
          </section>

          {/* Sales */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-[#1E293B]">
              销售人员 *
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-slate-500">
                选择销售
                <select
                  className={fieldCls}
                  value={salespersonName}
                  onChange={(e) =>
                    selectSalesperson(e.target.value as "Shawn" | "Miles")
                  }
                >
                  <option value="Shawn">Shawn</option>
                  <option value="Miles">Miles</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-500">
                电话
                <input
                  className={fieldCls}
                  value={salespersonPhone}
                  disabled={!overrideContact}
                  onChange={(e) => setSalespersonPhone(e.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                邮箱
                <input
                  className={fieldCls}
                  value={salespersonEmail}
                  disabled={!overrideContact}
                  onChange={(e) => setSalespersonEmail(e.target.value)}
                />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={overrideContact}
                onChange={(e) => {
                  setOverrideContact(e.target.checked);
                  if (!e.target.checked) {
                    const c = PROFORMA_SALESPERSON_CONTACTS[salespersonName as "Shawn" | "Miles"];
                    setSalespersonPhone(c.phone);
                    setSalespersonEmail(c.email);
                  }
                }}
              />
              编辑本次联系方式（例外发票）
            </label>
          </section>

          {/* Customer */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-[#1E293B]">客户信息</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-500 sm:col-span-2">
                收货方 / To *
                <input
                  className={fieldCls}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                客户公司
                <input
                  className={fieldCls}
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                客户国家
                <input
                  className={fieldCls}
                  value={customerCountry}
                  onChange={(e) => setCustomerCountry(e.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-500 sm:col-span-2">
                客户地址
                <input
                  className={fieldCls}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                WhatsApp
                <input
                  className={fieldCls}
                  value={customerWhatsapp}
                  onChange={(e) => setCustomerWhatsapp(e.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                Email
                <input
                  className={fieldCls}
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                目的国家
                <input
                  className={fieldCls}
                  value={destinationCountry}
                  onChange={(e) => setDestinationCountry(e.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                目的港 / Destination Port
                <input
                  className={fieldCls}
                  value={destinationPort}
                  onChange={(e) => setDestinationPort(e.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-500 sm:col-span-2">
                备注
                <textarea
                  className={fieldCls}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </div>
          </section>

          {/* Vehicles */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#1E293B]">
                车辆明细
                <span className="ml-2 text-xs font-medium text-slate-500">
                  {items.length} / {PI_MAX_VEHICLES}
                </span>
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnGhost}
                  disabled={items.length >= PI_MAX_VEHICLES}
                  title={
                    items.length >= PI_MAX_VEHICLES
                      ? PI_MAX_VEHICLES_ZH
                      : undefined
                  }
                  onClick={() => {
                    if (items.length >= PI_MAX_VEHICLES) return;
                    void ensureVehicles();
                    setItems((prev) =>
                      prev.length >= PI_MAX_VEHICLES
                        ? prev
                        : [...prev, emptyItem()]
                    );
                  }}
                >
                  手动添加车辆
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => void ensureVehicles()}
                >
                  从车辆库存选择
                </button>
              </div>
            </div>

            {items.length >= PI_MAX_VEHICLES ? (
              <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                {PI_MAX_VEHICLES_ZH}
                <br />
                {PI_MAX_VEHICLES_EN}
              </p>
            ) : null}

            {items.length > PI_MAX_VEHICLES ? (
              <p className="mb-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                当前草稿含 {items.length} 台车辆，超过上限。已保留全部数据 —
                请删除多余车辆至 8 台以内后再保存或生成 PDF。
                <br />
                This draft has {items.length} vehicles (over the limit). Data is
                preserved — remove vehicles until 8 remain before saving or PDF.
              </p>
            ) : null}

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.key}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-500">
                      序号 {index + 1}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                        onClick={() => moveItem(index, -1)}
                      >
                        上移
                      </button>
                      <button
                        type="button"
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                        onClick={() => moveItem(index, 1)}
                      >
                        下移
                      </button>
                      <button
                        type="button"
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-50"
                        disabled={items.length >= PI_MAX_VEHICLES}
                        onClick={() =>
                          setItems((prev) =>
                            prev.length >= PI_MAX_VEHICLES
                              ? prev
                              : [
                                  ...prev,
                                  { ...item, key: uid(), vehicleId: "" },
                                ]
                          )
                        }
                      >
                        复制行
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700"
                        onClick={() =>
                          setItems((prev) =>
                            prev.length <= 1
                              ? prev
                              : prev.filter((x) => x.key !== item.key)
                          )
                        }
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="text-xs font-semibold text-slate-500 sm:col-span-2 lg:col-span-3">
                      从库存选择
                      <select
                        className={fieldCls}
                        value={item.vehicleId}
                        onFocus={() => void ensureVehicles()}
                        onChange={(e) => applyVehicle(item.key, e.target.value)}
                      >
                        <option value="">手动填写 / 不关联库存</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-500">
                      品牌 / Brand
                      <input
                        className={fieldCls}
                        value={item.brand}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.key === item.key
                                ? { ...x, brand: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-500">
                      型号 / Model
                      <input
                        className={fieldCls}
                        value={item.model}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.key === item.key
                                ? { ...x, model: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-500">
                      年份 / Year
                      <input
                        className={fieldCls}
                        value={item.year}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.key === item.key
                                ? { ...x, year: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-500">
                      颜色 / Colour
                      <input
                        className={fieldCls}
                        value={item.colour}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.key === item.key
                                ? { ...x, colour: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-500">
                      VIN / Chassis No.
                      <input
                        className={fieldCls}
                        value={item.vin}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.key === item.key
                                ? { ...x, vin: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-500">
                      单价 / Unit Price (USD)
                      <input
                        className={fieldCls}
                        value={item.unitPriceUsd}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.key === item.key
                                ? { ...x, unitPriceUsd: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-500">
                      数量 / Qty
                      <input
                        className={fieldCls}
                        value={item.quantity}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.key === item.key
                                ? { ...x, quantity: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-500">
                      总价 / Total
                      <input
                        className={fieldCls}
                        disabled
                        value={formatUsd(
                          calcLineTotal(
                            parseMoney(item.unitPriceUsd),
                            Number(item.quantity) || 0
                          )
                        )}
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-500 sm:col-span-2 lg:col-span-3">
                      备注
                      <input
                        className={fieldCls}
                        value={item.note}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.key === item.key
                                ? { ...x, note: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Charges */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#1E293B]">其他费用</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => {
                    setShowFreightImport(true);
                    void ensureShipping();
                  }}
                >
                  从运费管理导入
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    setCharges((prev) => [...prev, emptyCharge()])
                  }
                >
                  添加费用
                </button>
              </div>
            </div>
            {showFreightImport && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="mb-2 text-xs font-semibold text-amber-900">
                  导入运费（需人工复核，不会自动写入购物车规则）
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <select
                    className={fieldCls}
                    value={freightCountryId}
                    onChange={(e) => {
                      setFreightCountryId(e.target.value);
                      setFreightPortId("");
                    }}
                  >
                    <option value="">选择国家</option>
                    {shipping.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_zh || c.name_en}
                      </option>
                    ))}
                  </select>
                  <select
                    className={fieldCls}
                    value={freightPortId}
                    onChange={(e) => setFreightPortId(e.target.value)}
                  >
                    <option value="">选择港口</option>
                    {(
                      shipping.find((c) => c.id === freightCountryId)?.ports ??
                      []
                    ).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name_zh || p.name_en} ({formatUsd(p.single_vehicle_usd)})
                      </option>
                    ))}
                  </select>
                  <button type="button" className={btnGold} onClick={importFreight}>
                    导入并复核
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {charges.map((charge) => (
                <div
                  key={charge.key}
                  className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-4"
                >
                  <label className="text-xs font-semibold text-slate-500">
                    中文名称
                    <input
                      className={fieldCls}
                      value={charge.nameZh}
                      onChange={(e) =>
                        setCharges((prev) =>
                          prev.map((x) =>
                            x.key === charge.key
                              ? { ...x, nameZh: e.target.value }
                              : x
                          )
                        )
                      }
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-500">
                    English name
                    <input
                      className={fieldCls}
                      value={charge.nameEn}
                      onChange={(e) =>
                        setCharges((prev) =>
                          prev.map((x) =>
                            x.key === charge.key
                              ? { ...x, nameEn: e.target.value }
                              : x
                          )
                        )
                      }
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-500">
                    金额 (USD)
                    <input
                      className={fieldCls}
                      value={charge.amountUsd}
                      onChange={(e) =>
                        setCharges((prev) =>
                          prev.map((x) =>
                            x.key === charge.key
                              ? { ...x, amountUsd: e.target.value }
                              : x
                          )
                        )
                      }
                    />
                  </label>
                  <div className="flex items-end gap-2">
                    <label className="flex-1 text-xs font-semibold text-slate-500">
                      备注
                      <input
                        className={fieldCls}
                        value={charge.note}
                        onChange={(e) =>
                          setCharges((prev) =>
                            prev.map((x) =>
                              x.key === charge.key
                                ? { ...x, note: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="mb-0.5 rounded border border-red-200 px-2 py-2 text-xs text-red-700"
                      onClick={() =>
                        setCharges((prev) =>
                          prev.filter((x) => x.key !== charge.key)
                        )
                      }
                    >
                      删
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Totals + payment */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-[#1E293B]">金额汇总</h2>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>车辆小计 / Vehicle Subtotal：{formatUsd(totals.vehicleSubtotalUsd)}</p>
              <p>其他费用 / Other Charges：{formatUsd(totals.chargesTotalUsd)}</p>
              <p className="font-bold">总计 / TOTAL：{formatUsd(totals.totalUsd)}</p>
              <label className="text-xs font-semibold text-slate-500">
                定金 / Deposit (USD)
                <input
                  className={fieldCls}
                  value={depositUsd}
                  onChange={(e) => setDepositUsd(e.target.value)}
                />
              </label>
              <p className="font-bold sm:col-span-2">
                尾款 / Balance：{formatUsd(totals.balanceUsd)}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-[#1E293B]">
              付款信息（受保护，仅管理员可见）
            </h2>
            {settings.paymentAccounts.length > 0 && (
              <label className="mb-3 block text-xs font-semibold text-slate-500">
                选择已保存收款账户
                <select
                  className={fieldCls}
                  value={paymentAccountId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPaymentAccountId(id);
                    const found = settings.paymentAccounts.find((a) => a.id === id);
                    if (found) setPayment({ ...found });
                  }}
                >
                  <option value="">自定义 / 本次快照</option>
                  {settings.paymentAccounts.map((a, i) => (
                    <option key={a.id || i} value={a.id || String(i)}>
                      {a.label || a.bankName || `账户 ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["fullName", "收款人姓名 / Full Name"],
                  ["bankName", "银行名称 / Bank"],
                  ["accountNumber", "银行账号 / Bank Account Number"],
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
                    value={payment[key] || ""}
                    onChange={(e) =>
                      setPayment((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#1E293B]">条款</h2>
              <button
                type="button"
                className={btnGhost}
                onClick={() =>
                  setTerms((prev) => [
                    ...prev,
                    {
                      id: `custom_${Date.now()}`,
                      enabled: true,
                      textZh: "",
                      textEn: "",
                    },
                  ])
                }
              >
                添加自定义条款
              </button>
            </div>
            <div className="space-y-3">
              {terms.map((term) => (
                <div
                  key={term.id}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#1E293B]">
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
                    启用此条款
                  </label>
                  <textarea
                    className={fieldCls}
                    rows={2}
                    value={term.textZh}
                    onChange={(e) =>
                      setTerms((prev) =>
                        prev.map((t) =>
                          t.id === term.id
                            ? { ...t, textZh: e.target.value }
                            : t
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
                          t.id === term.id
                            ? { ...t, textEn: e.target.value }
                            : t
                        )
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <label className="mt-3 block text-xs font-semibold text-slate-500">
              内部备注（不进 PDF）
              <textarea
                className={fieldCls}
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-[#1E293B]">公司信息快照</h2>
            <div className="grid gap-3">
              <label className="text-xs font-semibold text-slate-500">
                公司名称
                <input
                  className={fieldCls}
                  value={company.companyName}
                  onChange={(e) =>
                    setCompany((prev) => ({
                      ...prev,
                      companyName: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                地址
                <textarea
                  className={fieldCls}
                  rows={3}
                  value={company.companyAddress}
                  onChange={(e) =>
                    setCompany((prev) => ({
                      ...prev,
                      companyAddress: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                网站
                <input
                  className={fieldCls}
                  value={company.companyWebsite}
                  onChange={(e) =>
                    setCompany((prev) => ({
                      ...prev,
                      companyWebsite: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </section>
        </div>

        {/* Desktop preview */}
        <aside className="hidden xl:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              预览形式发票
            </p>
            <div className="origin-top scale-[0.48] sm:scale-[0.52]">
              <AdminProformaPreview model={previewModel} compact />
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile / tablet full-screen preview */}
      {showPreview && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/50 p-3 sm:p-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-3 flex justify-end gap-2">
              <button
                type="button"
                className={btnGold}
                onClick={() => setShowPreview(false)}
              >
                关闭预览
              </button>
            </div>
            <AdminProformaPreview model={previewModel} />
          </div>
        </div>
      )}
    </div>
  );
}
