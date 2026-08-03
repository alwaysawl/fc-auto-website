import {
  getSalespersonContact,
  DEFAULT_COMPANY_SNAPSHOT,
  DEFAULT_PAYMENT_ACCOUNT,
  DEFAULT_TERMS,
} from "@/lib/admin/proforma/constants";
import { calcLineTotal, calcTotals, roundMoney } from "@/lib/admin/proforma/money";
import {
  isProformaSalesperson,
  isProformaStatus,
  type CompanySnapshot,
  type PaymentAccountSnapshot,
  type ProformaChargeInput,
  type ProformaItemInput,
  type ProformaStatus,
  type TermSnapshot,
} from "@/lib/admin/proforma/types";

export type ProformaWriteInput = {
  contractNumber?: string | null;
  status?: string | null;
  customerName?: string | null;
  customerCompany?: string | null;
  customerCountry?: string | null;
  customerAddress?: string | null;
  customerWhatsapp?: string | null;
  customerEmail?: string | null;
  offerDate?: string | null;
  validityText?: string | null;
  destinationCountry?: string | null;
  destinationPort?: string | null;
  salespersonName?: string | null;
  salespersonPhone?: string | null;
  salespersonEmail?: string | null;
  overrideContact?: boolean;
  companySnapshot?: Partial<CompanySnapshot> | null;
  paymentSnapshot?: Partial<PaymentAccountSnapshot> | null;
  depositUsd?: number | null;
  termsSnapshot?: TermSnapshot[] | null;
  notes?: string | null;
  internalNotes?: string | null;
  items?: ProformaItemInput[] | null;
  charges?: ProformaChargeInput[] | null;
  markIssued?: boolean;
  idempotencyKey?: string | null;
};

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  return v.slice(0, max);
}

function cleanRequiredText(
  value: unknown,
  max: number,
  label: string
): { ok: true; value: string } | { ok: false; error: string } {
  const v = cleanText(value, max);
  if (!v) return { ok: false, error: `${label}不能为空` };
  return { ok: true, value: v };
}

function cleanMoney(
  value: unknown,
  opts?: { allowZero?: boolean; max?: number }
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  if (opts?.max != null && n > opts.max) return null;
  return roundMoney(n);
}

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function cleanEmail(value: unknown): string | null {
  const v = cleanText(value, 200);
  if (!v) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
  return v;
}

function cleanPhone(value: unknown): string | null {
  const v = cleanText(value, 40);
  if (!v) return null;
  if (!/^[\d+\-\s()]{6,40}$/.test(v)) return null;
  return v;
}

function parseCompany(
  raw: Partial<CompanySnapshot> | null | undefined
): CompanySnapshot {
  return {
    companyName:
      cleanText(raw?.companyName, 200) ?? DEFAULT_COMPANY_SNAPSHOT.companyName,
    companyAddress:
      cleanText(raw?.companyAddress, 500) ??
      DEFAULT_COMPANY_SNAPSHOT.companyAddress,
    companyWebsite:
      cleanText(raw?.companyWebsite, 120) ??
      DEFAULT_COMPANY_SNAPSHOT.companyWebsite,
  };
}

function parsePayment(
  raw: Partial<PaymentAccountSnapshot> | null | undefined
): PaymentAccountSnapshot {
  return {
    id: cleanText(raw?.id, 80) ?? undefined,
    label: cleanText(raw?.label, 120) ?? undefined,
    fullName: cleanText(raw?.fullName, 200) ?? "",
    bankName: cleanText(raw?.bankName, 200) ?? "",
    accountNumber: cleanText(raw?.accountNumber, 120) ?? "",
    swift: cleanText(raw?.swift, 40) ?? "",
    bankAddress: cleanText(raw?.bankAddress, 400) ?? "",
    paymentNote:
      cleanText(raw?.paymentNote, 500) ?? DEFAULT_PAYMENT_ACCOUNT.paymentNote,
  };
}

function parseTerms(raw: unknown): TermSnapshot[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_TERMS.map((t) => ({ ...t }));
  }
  const out: TermSnapshot[] = [];
  for (const item of raw.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = cleanText(row.id, 80) ?? `term_${out.length + 1}`;
    const textZh = cleanText(row.textZh, 800) ?? "";
    const textEn = cleanText(row.textEn, 800) ?? "";
    if (!textZh && !textEn) continue;
    out.push({
      id,
      enabled: row.enabled !== false,
      textZh,
      textEn,
    });
  }
  return out.length ? out : DEFAULT_TERMS.map((t) => ({ ...t }));
}

export type ValidatedProformaWrite = {
  contract_number: string | null;
  status: ProformaStatus;
  customer_name: string;
  customer_company: string | null;
  customer_country: string | null;
  customer_address: string | null;
  customer_whatsapp: string | null;
  customer_email: string | null;
  offer_date: string;
  validity_text: string | null;
  destination_country: string | null;
  destination_port: string | null;
  salesperson_name: string;
  salesperson_phone: string;
  salesperson_email: string;
  company_snapshot: CompanySnapshot;
  payment_snapshot: PaymentAccountSnapshot;
  vehicle_subtotal_usd: number;
  charges_total_usd: number;
  total_usd: number;
  deposit_usd: number;
  balance_usd: number;
  terms_snapshot: TermSnapshot[];
  notes: string | null;
  internal_notes: string | null;
  items: Array<{
    vehicle_id: string | null;
    brand: string;
    model: string;
    year: string | null;
    colour: string | null;
    vin: string | null;
    unit_price_usd: number;
    quantity: number;
    total_usd: number;
    note: string | null;
  }>;
  charges: Array<{
    name_zh: string;
    name_en: string;
    amount_usd: number;
    note: string | null;
  }>;
  markIssued: boolean;
  depositExceedsTotal: boolean;
  idempotencyKey: string | null;
};

export function validateProformaWrite(
  raw: ProformaWriteInput,
  opts?: { partial?: boolean; existingStatus?: ProformaStatus }
):
  | { ok: true; data: ValidatedProformaWrite }
  | { ok: false; error: string } {
  const customer = cleanRequiredText(raw.customerName, 200, "收货方 / To");
  if (!customer.ok) {
    if (!opts?.partial) return customer;
  }

  const salespersonRaw = raw.salespersonName;
  if (!opts?.partial || salespersonRaw != null) {
    if (!isProformaSalesperson(salespersonRaw)) {
      return { ok: false, error: "请选择销售人员（Shawn 或 Miles）" };
    }
  }

  const mapped = salespersonRaw
    ? getSalespersonContact(String(salespersonRaw))
    : null;

  let phone: string | null = null;
  let email: string | null = null;
  if (raw.overrideContact) {
    phone = cleanPhone(raw.salespersonPhone);
    email = cleanEmail(raw.salespersonEmail);
    if (!phone) return { ok: false, error: "销售电话格式无效" };
    if (!email) return { ok: false, error: "销售邮箱格式无效" };
  } else if (mapped) {
    phone = mapped.phone;
    email = mapped.email;
  } else if (!opts?.partial) {
    return { ok: false, error: "请选择销售人员" };
  }

  const offerDate =
    cleanDate(raw.offerDate) ??
    (opts?.partial ? null : new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()));

  if (!opts?.partial && !offerDate) {
    return { ok: false, error: "报价日期无效" };
  }

  if (raw.customerEmail != null && String(raw.customerEmail).trim()) {
    if (!cleanEmail(raw.customerEmail)) {
      return { ok: false, error: "客户邮箱格式无效" };
    }
  }

  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  if (!opts?.partial && itemsRaw.length === 0) {
    return { ok: false, error: "请至少添加一辆车辆" };
  }
  if (itemsRaw.length > 8) {
    return {
      ok: false,
      error: "一张形式发票最多填写 8 台车辆。/ A Proforma Invoice can contain up to 8 vehicles.",
    };
  }

  const items: ValidatedProformaWrite["items"] = [];
  for (let i = 0; i < itemsRaw.length; i++) {
    const row = itemsRaw[i]!;
    const brand = cleanText(row.brand, 80) ?? "";
    const model = cleanText(row.model, 120) ?? "";
    if (!brand && !model) {
      return { ok: false, error: `第 ${i + 1} 行车辆品牌/型号不能为空` };
    }
    const unit = cleanMoney(row.unitPriceUsd, { max: 50_000_000 });
    if (unit == null) {
      return { ok: false, error: `第 ${i + 1} 行单价无效` };
    }
    const qtyRaw =
      typeof row.quantity === "number"
        ? row.quantity
        : Number(row.quantity);
    const quantity = Number.isFinite(qtyRaw) ? Math.floor(qtyRaw) : NaN;
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 999) {
      return { ok: false, error: `第 ${i + 1} 行数量无效` };
    }
    items.push({
      vehicle_id: cleanText(row.vehicleId, 80),
      brand: brand || "—",
      model: model || "—",
      year: cleanText(row.year, 20),
      colour: cleanText(row.colour, 60),
      vin: cleanText(row.vin, 40),
      unit_price_usd: unit,
      quantity,
      total_usd: calcLineTotal(unit, quantity),
      note: cleanText(row.note, 300),
    });
  }

  const chargesRaw = Array.isArray(raw.charges) ? raw.charges : [];
  if (chargesRaw.length > 30) {
    return { ok: false, error: "费用行数过多" };
  }
  const charges: ValidatedProformaWrite["charges"] = [];
  for (let i = 0; i < chargesRaw.length; i++) {
    const row = chargesRaw[i]!;
    const amount = cleanMoney(row.amountUsd, { max: 50_000_000 });
    if (amount == null) {
      return { ok: false, error: `第 ${i + 1} 行费用金额无效` };
    }
    const nameZh = cleanText(row.nameZh, 120) ?? "";
    const nameEn = cleanText(row.nameEn, 120) ?? "";
    if (!nameZh && !nameEn && amount === 0) continue;
    charges.push({
      name_zh: nameZh || "其他",
      name_en: nameEn || "Others",
      amount_usd: amount,
      note: cleanText(row.note, 300),
    });
  }

  const depositRaw = cleanMoney(raw.depositUsd ?? 0, { max: 50_000_000 });
  if (depositRaw == null) {
    return { ok: false, error: "定金不能为负数" };
  }

  const totals = calcTotals({
    itemTotals: items.map((i) => i.total_usd),
    chargeAmounts: charges.map((c) => c.amount_usd),
    depositUsd: depositRaw,
  });

  let status: ProformaStatus = opts?.existingStatus ?? "draft";
  if (raw.status != null) {
    if (!isProformaStatus(raw.status)) {
      return { ok: false, error: "状态无效" };
    }
    status = raw.status;
  }
  if (raw.markIssued) {
    status = status === "draft" ? "issued" : status;
  }

  const customerName =
    customer.ok
      ? customer.value
      : cleanText(raw.customerName, 200) ?? "";
  if (!opts?.partial && !customerName) {
    return { ok: false, error: "收货方 / To 不能为空" };
  }

  return {
    ok: true,
    data: {
      contract_number: cleanText(raw.contractNumber, 80),
      status,
      customer_name: customerName,
      customer_company: cleanText(raw.customerCompany, 200),
      customer_country: cleanText(raw.customerCountry, 120),
      customer_address: cleanText(raw.customerAddress, 400),
      customer_whatsapp: cleanText(raw.customerWhatsapp, 40),
      customer_email: cleanEmail(raw.customerEmail),
      offer_date: offerDate!,
      validity_text: cleanText(raw.validityText, 120),
      destination_country: cleanText(raw.destinationCountry, 120),
      destination_port: cleanText(raw.destinationPort, 120),
      salesperson_name: mapped?.name ?? String(salespersonRaw ?? ""),
      salesperson_phone: phone ?? "",
      salesperson_email: email ?? "",
      company_snapshot: parseCompany(raw.companySnapshot),
      payment_snapshot: parsePayment(raw.paymentSnapshot),
      vehicle_subtotal_usd: totals.vehicleSubtotalUsd,
      charges_total_usd: totals.chargesTotalUsd,
      total_usd: totals.totalUsd,
      deposit_usd: totals.depositUsd,
      balance_usd: totals.balanceUsd,
      terms_snapshot: parseTerms(raw.termsSnapshot),
      notes: cleanText(raw.notes, 2000),
      internal_notes: cleanText(raw.internalNotes, 2000),
      items,
      charges,
      markIssued: Boolean(raw.markIssued),
      depositExceedsTotal: totals.depositUsd > totals.totalUsd + 0.001,
      idempotencyKey: cleanText(raw.idempotencyKey, 80),
    },
  };
}
