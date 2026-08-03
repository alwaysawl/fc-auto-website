/**
 * Admin Proforma Invoice — shared types and label maps.
 * Internal DB values stay English; UI labels are Chinese.
 * Salesperson selection is manual per invoice (not WhatsApp RR).
 */

export const PROFORMA_STATUSES = [
  "draft",
  "issued",
  "paid_deposit",
  "completed",
  "cancelled",
] as const;

export type ProformaStatus = (typeof PROFORMA_STATUSES)[number];

export const PROFORMA_STATUS_LABELS: Record<ProformaStatus, string> = {
  draft: "草稿",
  issued: "已开具",
  paid_deposit: "已收定金",
  completed: "已完成",
  cancelled: "已取消",
};

export const PROFORMA_SALESPEOPLE = ["Shawn", "Miles"] as const;
export type ProformaSalespersonName = (typeof PROFORMA_SALESPEOPLE)[number];

export const PROFORMA_ACTIVITY_TYPES = [
  "created",
  "edited",
  "pdf_generated",
  "status_changed",
  "duplicated",
  "archived",
  "unarchived",
] as const;

export type ProformaActivityType = (typeof PROFORMA_ACTIVITY_TYPES)[number];

export type ProformaSort =
  | "newest"
  | "oldest"
  | "highest_total"
  | "latest_updated";

export type CompanySnapshot = {
  companyName: string;
  companyAddress: string;
  companyWebsite: string;
};

export type PaymentAccountSnapshot = {
  id?: string;
  label?: string;
  fullName: string;
  bankName: string;
  accountNumber: string;
  swift: string;
  bankAddress: string;
  paymentNote: string;
};

export type TermSnapshot = {
  id: string;
  enabled: boolean;
  textZh: string;
  textEn: string;
};

export type ProformaItemInput = {
  id?: string;
  vehicleId?: string | null;
  brand: string;
  model: string;
  year?: string | null;
  colour?: string | null;
  vin?: string | null;
  unitPriceUsd: number;
  quantity: number;
  note?: string | null;
};

export type ProformaChargeInput = {
  id?: string;
  nameZh: string;
  nameEn: string;
  amountUsd: number;
  note?: string | null;
};

export type ProformaItem = {
  id: string;
  invoiceId: string;
  displayOrder: number;
  vehicleId: string | null;
  brand: string;
  model: string;
  year: string | null;
  colour: string | null;
  vin: string | null;
  unitPriceUsd: number;
  quantity: number;
  totalUsd: number;
  note: string | null;
};

export type ProformaCharge = {
  id: string;
  invoiceId: string;
  displayOrder: number;
  nameZh: string;
  nameEn: string;
  amountUsd: number;
  note: string | null;
};

export type ProformaListItem = {
  id: string;
  invoiceNumber: string;
  contractNumber: string | null;
  customerName: string;
  customerCountry: string | null;
  destinationCountry: string | null;
  destinationPort: string | null;
  vehicleCount: number;
  totalUsd: number;
  salespersonName: string;
  status: ProformaStatus;
  offerDate: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type ProformaDetail = {
  id: string;
  invoiceNumber: string;
  contractNumber: string | null;
  status: ProformaStatus;
  customerName: string;
  customerCompany: string | null;
  customerCountry: string | null;
  customerAddress: string | null;
  customerWhatsapp: string | null;
  customerEmail: string | null;
  offerDate: string;
  validityText: string | null;
  destinationCountry: string | null;
  destinationPort: string | null;
  salespersonName: string;
  salespersonPhone: string;
  salespersonEmail: string;
  companySnapshot: CompanySnapshot;
  paymentSnapshot: PaymentAccountSnapshot;
  vehicleSubtotalUsd: number;
  chargesTotalUsd: number;
  totalUsd: number;
  depositUsd: number;
  balanceUsd: number;
  termsSnapshot: TermSnapshot[];
  notes: string | null;
  internalNotes: string | null;
  pdfStoragePath: string | null;
  pdfGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
  issuedAt: string | null;
  archivedAt: string | null;
  items: ProformaItem[];
  charges: ProformaCharge[];
};

export type ProformaActivity = {
  id: string;
  invoiceId: string;
  activityType: ProformaActivityType;
  note: string | null;
  oldValue: string | null;
  newValue: string | null;
  actorName: string | null;
  createdAt: string;
};

export type ProformaListResult = {
  items: ProformaListItem[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
};

export type ProformaSettings = {
  companyName: string;
  companyAddress: string;
  companyWebsite: string;
  paymentAccounts: PaymentAccountSnapshot[];
  defaultTerms: TermSnapshot[];
  updatedAt: string | null;
};

export function isProformaStatus(v: unknown): v is ProformaStatus {
  return (
    typeof v === "string" &&
    (PROFORMA_STATUSES as readonly string[]).includes(v)
  );
}

export function isProformaSalesperson(v: unknown): v is ProformaSalespersonName {
  return (
    typeof v === "string" &&
    (PROFORMA_SALESPEOPLE as readonly string[]).includes(v)
  );
}
