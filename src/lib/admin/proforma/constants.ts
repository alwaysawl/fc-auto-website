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
  paymentNote: "Bank charges are paid by the buyer.",
};

export const DEFAULT_CHARGE_TEMPLATES: ProformaChargeInput[] = [
  {
    nameZh: "出口文件费",
    nameEn: "Export Documentation Fee",
    amountUsd: 0,
  },
  {
    nameZh: "报关费",
    nameEn: "Customs Clearance Fee",
    amountUsd: 0,
  },
  {
    nameZh: "海运费",
    nameEn: "Ocean Freight",
    amountUsd: 0,
  },
  {
    nameZh: "其他",
    nameEn: "Others",
    amountUsd: 0,
  },
];

export const DEFAULT_TERMS: TermSnapshot[] = [
  {
    id: "balance_deadline",
    enabled: true,
    textZh:
      "尾款必须在车辆完成后 3 天内支付，否则车辆将重新上架销售，定金不予退还。",
    textEn:
      "The balance must be paid within 3 days after the vehicle is ready. Otherwise, the vehicle may be relisted for sale and the deposit will be non-refundable.",
  },
  {
    id: "bank_charges",
    enabled: true,
    textZh: "银行手续费由买方承担。",
    textEn: "Bank charges are paid by the buyer.",
  },
  {
    id: "shipping_confirm",
    enabled: true,
    textZh: "最终运费以确认结果为准。",
    textEn: "Final shipping cost is subject to confirmation.",
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
    textZh: "本文件为形式发票，非正式税务发票。",
    textEn:
      "This document is a Proforma Invoice and not a tax invoice.",
  },
];

export const DEFAULT_VALIDITY_TEXT = "7 Days";
