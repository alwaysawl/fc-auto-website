/**
 * Proforma Invoice defaults and salesperson contact mapping.
 * Used only by admin APIs and admin UI — not public pages.
 * Does not affect WhatsApp / quotation round-robin assignment.
 */

import type {
  CompanySnapshot,
  PaymentAccountSnapshot,
  ProformaChargeInput,
  ProformaSalespersonName,
  TermSnapshot,
} from "@/lib/admin/proforma/types";

export type SalespersonContact = {
  name: ProformaSalespersonName;
  phone: string;
  email: string;
};

export const PROFORMA_SALESPERSON_CONTACTS: Record<
  ProformaSalespersonName,
  SalespersonContact
> = {
  Shawn: {
    name: "Shawn",
    phone: "+86 16676364929",
    email: "2736084517@qq.com",
  },
  Miles: {
    name: "Miles",
    phone: "+86 13432703060",
    email: "2954058626@qq.com",
  },
};

export function getSalespersonContact(
  name: string
): SalespersonContact | null {
  if (name === "Shawn" || name === "Miles") {
    return PROFORMA_SALESPERSON_CONTACTS[name];
  }
  return null;
}

export const DEFAULT_COMPANY_SNAPSHOT: CompanySnapshot = {
  companyName: "FC Auto Fengcheng Auto Trade Co., Ltd.",
  companyAddress:
    "FC Auto Fengcheng Automobile Trade Co., Ltd., 2nd Floor, Wenhai Automobile City, Wenhua North Road, Guicheng Street, Nanhai District, Foshan City, China",
  companyWebsite: "fcautoexport.com",
};

export const DEFAULT_PAYMENT_ACCOUNT: PaymentAccountSnapshot = {
  id: "default",
  label: "默认收款账户",
  fullName: "",
  bankName: "",
  accountNumber: "",
  swift: "",
  bankAddress: "",
  paymentNote: "Bank charges are borne by the buyer.",
};

export const DEFAULT_CHARGE_TEMPLATES: ProformaChargeInput[] = [
  {
    nameZh: "出口文件费",
    nameEn: "Export Documentation",
    amountUsd: 0,
  },
  {
    nameZh: "报关费",
    nameEn: "Customs Clearance",
    amountUsd: 0,
  },
  {
    nameZh: "海运费",
    nameEn: "Ocean Freight",
    amountUsd: 0,
  },
  {
    nameZh: "保险费",
    nameEn: "Insurance",
    amountUsd: 0,
  },
  {
    nameZh: "其他",
    nameEn: "Others",
    amountUsd: 0,
  },
];

/** Known legacy 3-day balance wordings (exact match only). */
const LEGACY_BALANCE_ZH = [
  "尾款必须在车辆完成后 3 天内支付，否则车辆将重新上架销售，定金不予退还。",
  "尾款必须在车辆准备完成后 3 天内支付。未按时付款可能导致车辆重新上架销售，已支付定金不予退还。",
] as const;

const LEGACY_BALANCE_EN = [
  "The balance must be paid within 3 days after the vehicle is ready. Otherwise, the vehicle may be relisted for sale and the deposit will be non-refundable.",
  "The balance must be paid within 3 days after the vehicle is ready. Failure to complete payment may result in the vehicle being relisted for sale, and the deposit will be non-refundable.",
] as const;

const BALANCE_TERM_ZH =
  "尾款必须在车辆准备完成后 7 天内支付。未按时付款可能导致车辆重新上架销售，已支付定金不予退还。";
const BALANCE_TERM_EN =
  "The balance must be paid within 7 days after the vehicle is ready. Failure to complete payment may result in the vehicle being relisted for sale, and the deposit will be non-refundable.";

export const DEFAULT_TERMS: TermSnapshot[] = [
  {
    id: "balance_deadline",
    enabled: true,
    textZh: BALANCE_TERM_ZH,
    textEn: BALANCE_TERM_EN,
  },
  {
    id: "shipping_confirm",
    enabled: true,
    textZh: "海运费及目的地费用以最终确认为准。",
    textEn:
      "Ocean freight and destination charges are subject to final confirmation.",
  },
  {
    id: "bank_charges",
    enabled: true,
    textZh: "银行手续费由买方承担。",
    textEn: "Bank charges are borne by the buyer.",
  },
  {
    id: "condition",
    enabled: true,
    textZh: "车辆状况以确认的检验与协议为准。",
    textEn:
      "Vehicle condition is based on the confirmed inspection and agreement.",
  },
  {
    id: "proforma_notice",
    enabled: true,
    textZh: "本文件仅为形式发票，非正式税务发票。",
    textEn:
      "This document is a Proforma Invoice only and is not a tax invoice.",
  },
];

export const DEFAULT_VALIDITY_TEXT = "7 Days";

/** Derive CT-… contract number from PI-… invoice number. */
export function contractNumberFromInvoice(invoiceNumber: string): string {
  const n = invoiceNumber.trim();
  if (n.startsWith("PI-")) return `CT-${n.slice(3)}`;
  if (n.startsWith("CT-")) return n;
  return `CT-${n}`;
}

function isLegacyBalanceZh(text: string): boolean {
  return (LEGACY_BALANCE_ZH as readonly string[]).includes(text);
}

function isLegacyBalanceEn(text: string): boolean {
  return (LEGACY_BALANCE_EN as readonly string[]).includes(text);
}

/**
 * Explicit draft-only upgrade: replace legacy default 3-day balance wording
 * with the current 7-day wording. Never call for issued/completed invoices.
 */
export function upgradeDraftLegacyTerms(
  terms: TermSnapshot[]
): TermSnapshot[] {
  return terms.map((t) => ({
    ...t,
    textZh: isLegacyBalanceZh(t.textZh) ? BALANCE_TERM_ZH : t.textZh,
    textEn: isLegacyBalanceEn(t.textEn) ? BALANCE_TERM_EN : t.textEn,
  }));
}

/** True when a term still uses the old default 3-day balance wording. */
export function termsContainLegacy3DayBalance(
  terms: TermSnapshot[]
): boolean {
  return terms.some(
    (t) => isLegacyBalanceZh(t.textZh) || isLegacyBalanceEn(t.textEn)
  );
}
