/**
 * Fixed one-page A4 Proforma Invoice layout constants.
 * Exactly 8 vehicle slots — no dynamic pagination.
 *
 * Vertical strategy: compact header/meta, taller fixed vehicle table,
 * then charges → payment → terms with 10pt gaps down toward the footer.
 */

export const PI_PAGE_W = 595.28;
export const PI_PAGE_H = 841.89;
export const PI_MARGIN = 26;
export const PI_CONTENT_W = PI_PAGE_W - PI_MARGIN * 2;

/** Hard business limit — never more than 8 vehicles on a proforma. */
export const PI_VEHICLE_ROW_COUNT = 8;
export const PI_MAX_VEHICLES = PI_VEHICLE_ROW_COUNT;

/**
 * Fixed vehicle table metrics (pt).
 * Row height increased so the table uses recovered top space + lower blank.
 */
export const PI_VEHICLE_HEADER_H = 22;
export const PI_VEHICLE_ROW_H = 28;
export const PI_VEHICLE_TABLE_BODY_H =
  PI_VEHICLE_ROW_COUNT * PI_VEHICLE_ROW_H;
export const PI_VEHICLE_TABLE_H =
  PI_VEHICLE_HEADER_H + PI_VEHICLE_TABLE_BODY_H;

/**
 * Fixed vertical region tops (pt from page top).
 * Top band compacted ~25–30mm vs prior (table top was ~179pt).
 */
export const PI_HEADER_TOP = PI_MARGIN;
export const PI_META_TOP = 42;
/** Compact seller/buyer band — one-line fields only. */
export const PI_META_MAX_H = 55;
export const PI_VEHICLE_TITLE_TOP = PI_META_TOP + PI_META_MAX_H + 2;
export const PI_VEHICLE_TABLE_TOP = PI_VEHICLE_TITLE_TOP + 8;

/** 10pt gaps between major lower sections. */
export const PI_SECTION_GAP = 10;

export const PI_CHARGES_TOP =
  PI_VEHICLE_TABLE_TOP + PI_VEHICLE_TABLE_H + PI_SECTION_GAP;
export const PI_CHARGES_MAX_H = 78;
export const PI_PAYMENT_TOP =
  PI_CHARGES_TOP + PI_CHARGES_MAX_H + PI_SECTION_GAP;
export const PI_PAYMENT_MAX_H = 56;
export const PI_TERMS_TOP =
  PI_PAYMENT_TOP + PI_PAYMENT_MAX_H + PI_SECTION_GAP;

/** Footer stays anchored near the bottom of A4. */
export const PI_FOOTER_TOP = PI_PAGE_H - 34;
/** Terms must end before this Y (breathing room above footer). */
export const PI_TERMS_BOTTOM_LIMIT = PI_FOOTER_TOP - 18;
export const PI_TERMS_MAX_H = PI_TERMS_BOTTOM_LIMIT - PI_TERMS_TOP;

/** @deprecated aliases kept for older imports */
export const PI_PAGE1_TARGET_ROWS = PI_VEHICLE_ROW_COUNT;
export const PI_BASE_ROW_H = PI_VEHICLE_ROW_H;
export const PI_ROW_H = PI_VEHICLE_ROW_H;
export const PI_TABLE_HEADER_H = PI_VEHICLE_HEADER_H;
export const PI_CONTENT_BOTTOM = PI_TERMS_BOTTOM_LIMIT;
export const PI_FOOTER_RESERVE = PI_PAGE_H - PI_FOOTER_TOP;

export const PI_GAP = {
  tableToCharges: PI_SECTION_GAP,
  chargesToPayment: PI_SECTION_GAP,
  paymentToTerms: PI_SECTION_GAP,
  termsToFooter: 18,
  moreNotice: 0,
} as const;

export const PI_MAX_VEHICLES_ZH =
  "一张形式发票最多填写 8 台车辆。";
export const PI_MAX_VEHICLES_EN =
  "A Proforma Invoice can contain up to 8 vehicles.";

export const PI_TERMS_OVERFLOW_ZH =
  "条款内容过长，无法放入单页 A4。请缩短条款后再生成 PDF。";
export const PI_TERMS_OVERFLOW_EN =
  "The terms are too long to fit on one A4 page. Please shorten them before generating the PDF.";

export function compactPaymentValue(value?: string | null): string {
  const t = (value || "").trim();
  return t || "—";
}

/** Approximate wrapped line count (used only for terms overflow check). */
export function estimateWrappedLines(
  text: string,
  maxWidth: number,
  fontSize: number
): number {
  const raw = (text || "").trim();
  if (!raw) return 1;
  let width = 0;
  let lines = 1;
  for (const ch of raw) {
    const isCjk = /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch);
    const w = isCjk ? fontSize : fontSize * 0.52;
    if (width + w > maxWidth && width > 0) {
      lines += 1;
      width = w;
    } else {
      width += w;
    }
  }
  return Math.max(1, lines);
}

export function estimateTermsHeight(
  terms: Array<{ textEn: string; textZh: string }>,
  notes?: string | null
): number {
  const lineH = 7.5 + 1.3;
  let h = 10; // title
  terms.forEach((t, i) => {
    if (t.textEn) {
      h +=
        estimateWrappedLines(`${i + 1}. ${t.textEn}`, PI_CONTENT_W, 7.5) *
          lineH +
        0.5;
    }
    if (t.textZh) {
      h +=
        estimateWrappedLines(t.textZh, PI_CONTENT_W - 8, 7.5) * lineH + 2.5;
    }
  });
  if (notes?.trim()) {
    h += estimateWrappedLines(notes, PI_CONTENT_W, 7.5) * lineH + 1;
  }
  return h;
}

export type ProformaFitCheck = {
  ok: boolean;
  errorZh?: string;
  errorEn?: string;
};

/** Block PDF when >8 vehicles or terms exceed the fixed Terms band. */
export function checkProformaOnePageFit(input: {
  vehicleCount: number;
  enabledTerms: Array<{ textEn: string; textZh: string }>;
  notes?: string | null;
}): ProformaFitCheck {
  if (input.vehicleCount > PI_MAX_VEHICLES) {
    return {
      ok: false,
      errorZh: `${PI_MAX_VEHICLES_ZH} 当前 ${input.vehicleCount} 台，请删除多余车辆后再生成 PDF。`,
      errorEn: `${PI_MAX_VEHICLES_EN} Currently ${input.vehicleCount}. Remove extras before generating the PDF.`,
    };
  }
  const termsH = estimateTermsHeight(input.enabledTerms, input.notes);
  if (termsH > PI_TERMS_MAX_H) {
    return {
      ok: false,
      errorZh: PI_TERMS_OVERFLOW_ZH,
      errorEn: PI_TERMS_OVERFLOW_EN,
    };
  }
  return { ok: true };
}

/**
 * Pad/truncate display slots to exactly 8 for the fixed table.
 * Does not mutate saved invoice data — display only.
 */
export function fixedVehicleSlots<T>(
  items: T[],
  empty: () => T
): T[] {
  const slots: T[] = [];
  for (let i = 0; i < PI_VEHICLE_ROW_COUNT; i++) {
    slots.push(items[i] ?? empty());
  }
  return slots;
}
