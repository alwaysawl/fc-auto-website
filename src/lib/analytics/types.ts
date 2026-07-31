/**
 * First-party anonymous analytics — shared types & allowlist.
 *
 * Privacy: no phones, emails, VINs, full IPs, message contents, or secrets.
 * No invasive fingerprinting. Events are aggregated for admin dashboards only.
 */

export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "whatsapp_click",
  "cart_view",
  "cart_add",
  "cart_remove",
  "cart_checkout_click",
  "quote_download",
  "vehicle_detail_view",
  "cart_clear",
  "language_change",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export type WhatsAppClickSource =
  | "floating_button"
  | "header"
  | "vehicle_detail"
  | "vehicle_card"
  | "cart_checkout"
  | "quotation"
  | "contact_page"
  | "inventory"
  | "home"
  | "footer"
  | "shipping_calculator"
  | "other";

export type AnalyticsEventInput = {
  event_name: AnalyticsEventName;
  session_id?: string | null;
  anonymous_visitor_id?: string | null;
  locale?: string | null;
  page_path?: string | null;
  referrer_host?: string | null;
  vehicle_id?: string | null;
  country_id?: string | null;
  port_id?: string | null;
  cart_item_count?: number | null;
  cart_value_usd?: number | null;
  metadata?: Record<string, unknown> | null;
  user_agent_category?: string | null;
};

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return (
    typeof value === "string" &&
    (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value)
  );
}

/** Map WhatsAppAssignLink sourcePage → analytics source label. */
export function mapWhatsAppSource(sourcePage: string): WhatsAppClickSource {
  const s = sourcePage.trim().toLowerCase();
  if (s.includes("floating")) return "floating_button";
  if (s.includes("header")) return "header";
  if (s.includes("vehicle-detail") || s.includes("vehicle_detail")) {
    return "vehicle_detail";
  }
  if (s.includes("card") || s.includes("showcase")) return "vehicle_card";
  if (s.includes("cart")) return "cart_checkout";
  if (s.includes("contact")) return "contact_page";
  if (s.includes("inventory")) return "inventory";
  if (s.includes("home") || s.includes("hero")) return "home";
  if (s.includes("footer")) return "footer";
  if (s.includes("shipping")) return "shipping_calculator";
  if (s.includes("quot")) return "quotation";
  return "other";
}
