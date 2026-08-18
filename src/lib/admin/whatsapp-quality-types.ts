/**
 * WhatsApp inquiry quality — shared types and aggregation.
 * Safe for client and server. No CRM expansion.
 */

import {
  TRAFFIC_SOURCE_IDS,
  trafficSourceLabel,
  type TrafficSource,
} from "@/lib/analytics/source";
import { mapWhatsAppSource } from "@/lib/analytics/types";

export const CUSTOMER_TYPES = ["unknown", "dealer", "individual"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const LEAD_STAGES = [
  "unknown",
  "contacted",
  "interested",
  "quoted",
  "won",
  "invalid",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  unknown: "未判断",
  dealer: "车商",
  individual: "个人",
};

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  unknown: "未判断",
  contacted: "已联系",
  interested: "有采购意向",
  quoted: "已报价",
  won: "已成交",
  invalid: "无效",
};

export function isCustomerType(value: unknown): value is CustomerType {
  return (
    typeof value === "string" &&
    (CUSTOMER_TYPES as readonly string[]).includes(value)
  );
}

export function isLeadStage(value: unknown): value is LeadStage {
  return (
    typeof value === "string" &&
    (LEAD_STAGES as readonly string[]).includes(value)
  );
}

export function parseCustomerType(value: unknown): CustomerType {
  return isCustomerType(value) ? value : "unknown";
}

export function parseLeadStage(value: unknown): LeadStage {
  return isLeadStage(value) ? value : "unknown";
}

/**
 * When stage leaves "未判断" for a real pipeline stage, mark actual contact.
 * invalid / unknown do not auto-flip the flag (no extra admin step, no CRM rules).
 */
export function resolveActualContact(
  leadStage: LeadStage,
  previous: boolean
): boolean {
  if (
    leadStage === "contacted" ||
    leadStage === "interested" ||
    leadStage === "quoted" ||
    leadStage === "won"
  ) {
    return true;
  }
  return previous;
}

const ENTRY_LABELS: Record<string, string> = {
  floating_button: "悬浮按钮",
  header: "页头",
  vehicle_detail: "车辆详情",
  vehicle_card: "车辆卡片",
  cart_checkout: "购物车",
  quotation: "报价",
  contact_page: "联系页面",
  inventory: "库存列表",
  home: "Hero / 首页",
  footer: "页脚",
  shipping_calculator: "运费估算",
  other: "其他",
};

export function whatsappEntryLabel(sourcePage: string | null | undefined): string {
  const raw = sourcePage?.trim() ?? "";
  if (!raw) return "未知入口";
  const lower = raw.toLowerCase();
  if (lower.includes("hero")) return "Hero";
  const mapped = mapWhatsAppSource(raw);
  return ENTRY_LABELS[mapped] ?? raw;
}

export type WhatsAppQualityLead = {
  id: string;
  inquiryId: string;
  createdAt: string;
  source: TrafficSource;
  sourceLabel: string;
  entry: string;
  entryRaw: string | null;
  vehicleTitle: string | null;
  vehicleId: string | null;
  assignedContact: string | null;
  customerType: CustomerType;
  leadStage: LeadStage;
  actualContact: boolean;
  linkedToAnalytics: boolean;
};

export type WhatsAppQualityFunnel = {
  uniqueVisitors: number;
  whatsappInquiries: number;
  actualContact: number;
  dealers: number;
  interested: number;
  quoted: number;
  won: number;
};

export type WhatsAppSourceQualityRow = {
  source: TrafficSource;
  label: string;
  whatsappCustomers: number;
  dealers: number;
  interested: number;
  quoted: number;
  won: number;
};

export type WhatsAppQualityDashboard = {
  available: boolean;
  error: string | null;
  funnel: WhatsAppQualityFunnel;
  sourceQuality: WhatsAppSourceQualityRow[];
  leads: WhatsAppQualityLead[];
};

export function emptyWhatsAppQuality(
  uniqueVisitors = 0
): WhatsAppQualityDashboard {
  return {
    available: false,
    error: null,
    funnel: {
      uniqueVisitors,
      whatsappInquiries: 0,
      actualContact: 0,
      dealers: 0,
      interested: 0,
      quoted: 0,
      won: 0,
    },
    sourceQuality: TRAFFIC_SOURCE_IDS.map((source) => ({
      source,
      label: trafficSourceLabel(source),
      whatsappCustomers: 0,
      dealers: 0,
      interested: 0,
      quoted: 0,
      won: 0,
    })),
    leads: [],
  };
}

function uniqueByInquiryId(leads: WhatsAppQualityLead[]): WhatsAppQualityLead[] {
  const map = new Map<string, WhatsAppQualityLead>();
  for (const lead of leads) {
    const key = lead.inquiryId.trim();
    if (!key) continue;
    const prev = map.get(key);
    if (!prev || lead.createdAt > prev.createdAt) {
      map.set(key, lead);
    }
  }
  return [...map.values()];
}

export function deriveWhatsAppQuality(
  leads: WhatsAppQualityLead[],
  uniqueVisitors: number
): Pick<WhatsAppQualityDashboard, "funnel" | "sourceQuality"> {
  const unique = uniqueByInquiryId(leads);

  let actualContact = 0;
  let dealers = 0;
  let interested = 0;
  let quoted = 0;
  let won = 0;

  const bySource = new Map<
    TrafficSource,
    { customers: number; dealers: number; interested: number; quoted: number; won: number }
  >();
  for (const source of TRAFFIC_SOURCE_IDS) {
    bySource.set(source, {
      customers: 0,
      dealers: 0,
      interested: 0,
      quoted: 0,
      won: 0,
    });
  }

  for (const lead of unique) {
    const bucket = bySource.get(lead.source) ?? bySource.get("unknown")!;
    bucket.customers += 1;

    const contacted = lead.actualContact || resolveActualContact(lead.leadStage, false);
    if (contacted) actualContact += 1;

    if (contacted && lead.customerType === "dealer") {
      dealers += 1;
      bucket.dealers += 1;
    }

    const stage = lead.leadStage;
    if (stage === "interested" || stage === "quoted" || stage === "won") {
      interested += 1;
      bucket.interested += 1;
    }
    if (stage === "quoted" || stage === "won") {
      quoted += 1;
      bucket.quoted += 1;
    }
    if (stage === "won") {
      won += 1;
      bucket.won += 1;
    }
  }

  return {
    funnel: {
      uniqueVisitors,
      whatsappInquiries: unique.length,
      actualContact,
      dealers,
      interested,
      quoted,
      won,
    },
    sourceQuality: TRAFFIC_SOURCE_IDS.map((source) => {
      const bucket = bySource.get(source)!;
      return {
        source,
        label: trafficSourceLabel(source),
        whatsappCustomers: bucket.customers,
        dealers: bucket.dealers,
        interested: bucket.interested,
        quoted: bucket.quoted,
        won: bucket.won,
      };
    }),
  };
}
