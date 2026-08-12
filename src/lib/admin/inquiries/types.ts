/**
 * Admin inquiry CRM — shared types and label maps.
 * Internal DB values stay English; UI labels are Chinese.
 * Shawn / Miles are 负责人 / 销售联系人 — never labeled as 员工.
 */

export const INQUIRY_STATUSES = [
  "new",
  "pending_contact",
  "contacted",
  "interested",
  "quoting",
  "waiting_customer",
  "negotiating",
  "won",
  "lost",
  "invalid",
] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "新询盘",
  pending_contact: "待联系",
  contacted: "已联系",
  interested: "有意向",
  quoting: "报价中",
  waiting_customer: "等待客户回复",
  negotiating: "谈判中",
  won: "已成交",
  lost: "已流失",
  invalid: "无效询盘",
};

export const INQUIRY_PRIORITIES = ["high", "medium", "low"] as const;
export type InquiryPriority = (typeof INQUIRY_PRIORITIES)[number];

export const INQUIRY_PRIORITY_LABELS: Record<InquiryPriority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const INQUIRY_SOURCES = [
  "whatsapp",
  "vehicle_detail",
  "cart",
  "contact_page",
  "quote_download",
  "facebook",
  "instagram",
  "tiktok",
  "phone",
  "offline",
  "manual",
  "other",
] as const;

export type InquirySource = (typeof INQUIRY_SOURCES)[number];

export const INQUIRY_SOURCE_LABELS: Record<InquirySource, string> = {
  whatsapp: "WhatsApp",
  vehicle_detail: "车辆详情页",
  cart: "购物车",
  contact_page: "联系页面",
  quote_download: "报价下载",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  phone: "电话",
  offline: "线下",
  manual: "手动录入",
  other: "其他",
};

export const INQUIRY_ACTIVITY_TYPES = [
  "inquiry_created",
  "note_added",
  "status_changed",
  "priority_changed",
  "assigned",
  "reassigned",
  "follow_up_scheduled",
  "contacted",
  "quotation_created",
  "quotation_downloaded",
  "marked_won",
  "marked_lost",
  "archived",
  "unarchived",
  "intent_changed",
  "updated",
] as const;

export type InquiryActivityType = (typeof INQUIRY_ACTIVITY_TYPES)[number];

export const ASSIGNABLE_CONTACTS = ["Shawn", "Miles"] as const;
export type AssignableContactName = (typeof ASSIGNABLE_CONTACTS)[number];

export type FollowUpFilter =
  | "today"
  | "overdue"
  | "next_7_days"
  | "unset"
  | "done";

export type InquirySort =
  | "attention"
  | "newest"
  | "oldest"
  | "intent"
  | "follow_up"
  | "updated";

export type InquiryListItem = {
  id: string;
  inquiryNumber: string;
  customerName: string | null;
  customerCountry: string | null;
  source: InquirySource;
  vehicleId: string | null;
  vehicleTitleSnapshot: string | null;
  requestedQuantity: number | null;
  status: InquiryStatus;
  priority: InquiryPriority;
  intentScore: number;
  assignedContactName: string | null;
  nextFollowUpAt: string | null;
  lastContactedAt: string | null;
  updatedAt: string;
  createdAt: string;
  archivedAt: string | null;
  isOverdue: boolean;
  /** Minimum / primary budget (USD) */
  customerBudgetUsd: number | null;
  /** Optional maximum budget (USD) */
  customerBudgetMaxUsd: number | null;
  /** List views hide phone/email by default */
  hasWhatsApp: boolean;
  hasEmail: boolean;
};

export type InquiryDetail = InquiryListItem & {
  whatsappNumber: string | null;
  email: string | null;
  customerCity: string | null;
  preferredLanguage: string | null;
  destinationCountryId: string | null;
  destinationPortId: string | null;
  customerMessage: string | null;
  assignedSalesAgentId: string | null;
  closedAt: string | null;
  lostReason: string | null;
  internalSummary: string | null;
  tags: string[];
  suggestedIntentScore: number;
  vehicle: {
    id: string;
    title: string;
    coverUrl: string | null;
    status: string | null;
    priceLabel: string | null;
    available: boolean;
  } | null;
};

export type InquiryActivity = {
  id: string;
  inquiryId: string;
  activityType: InquiryActivityType;
  note: string | null;
  oldValue: string | null;
  newValue: string | null;
  actorName: string | null;
  createdAt: string;
};

export type InquiryDuplicateMatch = {
  id: string;
  inquiryNumber: string;
  customerName: string | null;
  status: InquiryStatus;
  statusLabel: string;
  updatedAt: string;
  assignedContactName: string | null;
  reason: string;
};

export type InquirySummaryCounts = {
  newCount: number;
  todayFollowUp: number;
  overdue: number;
  interested: number;
  quoting: number;
  negotiating: number;
  won: number;
  lost: number;
  unsetFollowUp: number;
  next7Days: number;
};

export type InquiryFunnelCounts = {
  newCount: number;
  contacted: number;
  interested: number;
  quoting: number;
  negotiating: number;
  won: number;
  sampleSmall: boolean;
};

export type InquiryListResult = {
  items: InquiryListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: InquirySummaryCounts;
  funnel: InquiryFunnelCounts;
  error: string | null;
};

export function isInquiryStatus(v: unknown): v is InquiryStatus {
  return typeof v === "string" && (INQUIRY_STATUSES as readonly string[]).includes(v);
}

export function isInquiryPriority(v: unknown): v is InquiryPriority {
  return typeof v === "string" && (INQUIRY_PRIORITIES as readonly string[]).includes(v);
}

export function isInquirySource(v: unknown): v is InquirySource {
  return typeof v === "string" && (INQUIRY_SOURCES as readonly string[]).includes(v);
}

export function isAssignableContact(v: unknown): v is AssignableContactName {
  return typeof v === "string" && (ASSIGNABLE_CONTACTS as readonly string[]).includes(v);
}
