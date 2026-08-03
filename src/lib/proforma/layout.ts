/**
 * Explicit A4 Proforma Invoice coordinate map (points).
 * Single source of truth for PDF + Preview — no content-based height.
 */

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const PI_PAGE_W = PAGE_WIDTH;
export const PI_PAGE_H = PAGE_HEIGHT;

/** Horizontal page margin (pt). */
export const PI_MARGIN = 28;
export const PI_CONTENT_W = PAGE_WIDTH - PI_MARGIN * 2;

/** —— Header (logo / title / contacts only) —— */
export const HEADER_TOP = 24;
export const HEADER_HEIGHT = 48;
export const HEADER_BOTTOM = HEADER_TOP + HEADER_HEIGHT; // 72

/** —— Invoice / Seller / Buyer —— */
export const INFO_TOP = 78;
export const INFO_HEIGHT = 92;
export const INFO_BOTTOM = INFO_TOP + INFO_HEIGHT; // 170

/** —— Vehicle title + fixed 8-row table —— */
export const VEHICLE_TITLE_TOP = 178;
export const VEHICLE_TITLE_HEIGHT = 16;

export const VEHICLE_TABLE_TOP = 198;
export const VEHICLE_HEADER_HEIGHT = 25;
export const VEHICLE_ROW_HEIGHT = 20;
export const VEHICLE_ROW_COUNT = 8;

export const VEHICLE_TABLE_HEIGHT =
  VEHICLE_HEADER_HEIGHT + VEHICLE_ROW_HEIGHT * VEHICLE_ROW_COUNT; // 185

export const VEHICLE_TABLE_BOTTOM =
  VEHICLE_TABLE_TOP + VEHICLE_TABLE_HEIGHT; // 383

/** —— Lower sections (gap = 12 pt after table / blocks) —— */
export const SECTION_GAP = 12;

export const CHARGES_TOP = VEHICLE_TABLE_BOTTOM + SECTION_GAP; // 395
export const CHARGES_HEIGHT = 98;
export const CHARGES_BOTTOM = CHARGES_TOP + CHARGES_HEIGHT; // 493

export const PAYMENT_TOP = CHARGES_BOTTOM + SECTION_GAP; // 505
export const PAYMENT_HEIGHT = 58;
export const PAYMENT_BOTTOM = PAYMENT_TOP + PAYMENT_HEIGHT; // 563

export const TERMS_TOP = PAYMENT_BOTTOM + SECTION_GAP; // 575
export const TERMS_MAX_BOTTOM = 755;

export const FOOTER_TOP = 800;
export const FOOTER_HEIGHT = 24;

/** Absolute Y of body row `index` (0..7). */
export function vehicleRowTop(index: number): number {
  return (
    VEHICLE_TABLE_TOP + VEHICLE_HEADER_HEIGHT + index * VEHICLE_ROW_HEIGHT
  );
}

export function vehicleTableBottom(): number {
  return VEHICLE_TABLE_BOTTOM;
}

/** —— Aliases for existing call sites —— */
export const PI_MARGIN_ALIAS = PI_MARGIN;
export const PI_CONTENT_W_ALIAS = PI_CONTENT_W;
export const PI_HEADER_TOP = HEADER_TOP;
export const PI_META_TOP = INFO_TOP;
export const PI_META_MAX_H = INFO_HEIGHT;
export const PI_VEHICLE_TITLE_TOP = VEHICLE_TITLE_TOP;
export const PI_VEHICLE_TABLE_TOP = VEHICLE_TABLE_TOP;
export const PI_VEHICLE_HEADER_H = VEHICLE_HEADER_HEIGHT;
export const PI_VEHICLE_ROW_H = VEHICLE_ROW_HEIGHT;
export const PI_VEHICLE_ROW_COUNT = VEHICLE_ROW_COUNT;
export const PI_VEHICLE_TABLE_H = VEHICLE_TABLE_HEIGHT;
export const PI_VEHICLE_TABLE_BODY_H =
  VEHICLE_ROW_HEIGHT * VEHICLE_ROW_COUNT;
export const PI_MAX_VEHICLES = VEHICLE_ROW_COUNT;
export const PI_SECTION_GAP = SECTION_GAP;
export const PI_CHARGES_TOP = CHARGES_TOP;
export const PI_CHARGES_MAX_H = CHARGES_HEIGHT;
export const PI_CHARGES_BOTTOM = CHARGES_BOTTOM;
export const PI_PAYMENT_TOP = PAYMENT_TOP;
export const PI_PAYMENT_MAX_H = PAYMENT_HEIGHT;
export const PI_PAYMENT_BOTTOM = PAYMENT_BOTTOM;
export const PI_TERMS_TOP = TERMS_TOP;
export const PI_FOOTER_TOP = FOOTER_TOP;
export const PI_TERMS_BOTTOM_LIMIT = TERMS_MAX_BOTTOM;
export const PI_TERMS_MAX_H = TERMS_MAX_BOTTOM - TERMS_TOP;
export const PI_CONTENT_BOTTOM = TERMS_MAX_BOTTOM;
export const PI_FOOTER_RESERVE = PAGE_HEIGHT - FOOTER_TOP;
export const PI_PAGE1_TARGET_ROWS = VEHICLE_ROW_COUNT;
export const PI_BASE_ROW_H = VEHICLE_ROW_HEIGHT;
export const PI_ROW_H = VEHICLE_ROW_HEIGHT;
export const PI_TABLE_HEADER_H = VEHICLE_HEADER_HEIGHT;

export const VehicleTableTop = VEHICLE_TABLE_TOP;
export const VehicleTableHeight = VEHICLE_TABLE_HEIGHT;
export const ChargesTop = CHARGES_TOP;
export const PaymentTop = PAYMENT_TOP;
export const TermsTop = TERMS_TOP;
export const FooterTop = FOOTER_TOP;

export const PI_GAP = {
  tableToCharges: SECTION_GAP,
  chargesToPayment: SECTION_GAP,
  paymentToTerms: SECTION_GAP,
  termsToFooter: FOOTER_TOP - TERMS_MAX_BOTTOM,
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
  let h = 10;
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

export function fixedVehicleSlots<T>(items: T[], empty: () => T): T[] {
  const slots: T[] = [];
  for (let i = 0; i < VEHICLE_ROW_COUNT; i++) {
    slots.push(items[i] ?? empty());
  }
  return slots;
}
