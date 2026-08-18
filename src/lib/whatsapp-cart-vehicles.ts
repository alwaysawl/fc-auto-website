/**
 * Cart → WhatsApp vehicle snapshot.
 * Uses existing assignment text fields + analytics metadata.
 * No new database columns.
 */

export const WHATSAPP_ASSIGN_TEXT_MAX = 500;
export const WHATSAPP_META_STRING_MAX = 120;

export type CartVehicleSnapshot = {
  id: string;
  title: string;
  year?: number | null;
};

export type WhatsAppCartVehiclePayload = {
  vehicleId: string | undefined;
  vehicleTitle: string | undefined;
  vehicleYear: string | undefined;
  stockNumber: string | undefined;
  analyticsMetadata: {
    cart_vehicle_count: number;
    cart_vehicle_ids: string;
    cart_vehicle_titles: string;
  };
};

export type QualityVehicleDisplay = {
  title: string | null;
  stock: string | null;
  count: number;
  multi: boolean;
};

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function sliceAssign(value: string): string {
  return value.slice(0, WHATSAPP_ASSIGN_TEXT_MAX);
}

function sliceMeta(value: string): string {
  return value.slice(0, WHATSAPP_META_STRING_MAX);
}

export function buildWhatsAppCartVehiclePayload(
  items: CartVehicleSnapshot[]
): WhatsAppCartVehiclePayload | null {
  const rows = items
    .map((item) => ({
      id: clean(item.id),
      title: clean(item.title),
      year: item.year,
    }))
    .filter((item) => item.id || item.title);
  if (rows.length === 0) return null;

  const ids = rows.map((row) => row.id).filter(Boolean);
  const titles = rows.map((row) => row.title).filter(Boolean);
  const idJoin = ids.join(",");
  const titleJoin = titles.join("; ");

  if (rows.length === 1) {
    const item = rows[0];
    const year =
      typeof item.year === "number" && Number.isFinite(item.year)
        ? String(item.year)
        : undefined;
    return {
      vehicleId: item.id || undefined,
      vehicleTitle: item.title ? sliceAssign(item.title) : undefined,
      vehicleYear: year,
      stockNumber: item.id ? sliceAssign(item.id) : undefined,
      analyticsMetadata: {
        cart_vehicle_count: 1,
        cart_vehicle_ids: sliceMeta(item.id),
        cart_vehicle_titles: sliceMeta(item.title),
      },
    };
  }

  return {
    vehicleId: undefined,
    vehicleTitle: sliceAssign(`多车型询盘（${rows.length}）：${titleJoin}`),
    vehicleYear: undefined,
    stockNumber: idJoin ? sliceAssign(idJoin) : undefined,
    analyticsMetadata: {
      cart_vehicle_count: rows.length,
      cart_vehicle_ids: sliceMeta(idJoin),
      cart_vehicle_titles: sliceMeta(titleJoin),
    },
  };
}

export function formatQualityVehicleDisplay(input: {
  assignmentTitle?: string | null;
  assignmentStock?: string | null;
  analyticsVehicleId?: string | null;
  lookupTitle?: string | null;
  cartCount?: number | null;
  cartTitles?: string | null;
  cartIds?: string | null;
}): QualityVehicleDisplay {
  const assignmentTitle = clean(input.assignmentTitle) || null;
  const assignmentStock = clean(input.assignmentStock) || null;
  const cartTitles = clean(input.cartTitles) || null;
  const cartIds = clean(input.cartIds) || null;
  const lookupTitle = clean(input.lookupTitle) || null;
  const analyticsVehicleId = clean(input.analyticsVehicleId) || null;
  const cartCount =
    typeof input.cartCount === "number" &&
    Number.isFinite(input.cartCount) &&
    input.cartCount > 0
      ? Math.floor(input.cartCount)
      : null;

  const multi =
    (cartCount != null && cartCount > 1) ||
    Boolean(assignmentTitle?.startsWith("多车型询盘"));

  let title = assignmentTitle || cartTitles || lookupTitle || null;
  if (title?.startsWith("多车型询盘")) {
    const idx = title.indexOf("：");
    if (idx >= 0) {
      const rest = title.slice(idx + 1).trim();
      if (rest) title = rest;
    }
  }
  const stock =
    assignmentStock ||
    cartIds ||
    (!multi ? analyticsVehicleId : null) ||
    null;

  let count = 1;
  if (cartCount != null) count = cartCount;
  else if (multi) count = Math.max(2, stock ? stock.split(",").filter(Boolean).length : 2);
  else if (!title && !stock) count = 0;

  return { title, stock, count, multi };
}
