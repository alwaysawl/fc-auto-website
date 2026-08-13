/**
 * Explicit A4 Proforma Invoice coordinate map (points).
 * Single source of truth for PDF + Preview — no content-based height.
 */

/** Non-visual diagnostic marker — inspect DOM/data attribute or console on PDF download. */
export const PROFORMA_LAYOUT_VERSION = "seller-col-width-v9";

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const PI_PAGE_W = PAGE_WIDTH;
export const PI_PAGE_H = PAGE_HEIGHT;

/** Horizontal page margin (pt). */
export const PI_MARGIN = 28;
export const PI_CONTENT_W = PAGE_WIDTH - PI_MARGIN * 2;

/** —— Header (logo / title / contacts only) — FIXED —— */
export const HEADER_TOP = 24;
export const HEADER_HEIGHT = 48;
export const HEADER_BOTTOM = HEADER_TOP + HEADER_HEIGHT; // 72

/**
 * Gap below the first gold divider before Seller / Buyer / Invoice Information.
 * Target ~12–16pt (not the previous ~49pt waste).
 */
export const HEADER_TO_INFO_GAP = 14;

/** Compact readable line-height inside the top info columns. */
export const INFO_LINE_HEIGHT = 1.12;

/**
 * Top information band — three horizontal columns:
 * Seller | Buyer | Invoice Information
 */
export const INFO_TOP = HEADER_BOTTOM + HEADER_TO_INFO_GAP; // 86
export const INFO_HEIGHT = 98;
export const INFO_BOTTOM = INFO_TOP + INFO_HEIGHT; // 184

export const INFO_COL_COUNT = 3;
export const INFO_COL_GAP = 6;
/** Seller gets extra width so phone/email/website stay on one line. */
export const INFO_COL_FRACTIONS = [0.36, 0.26, 0.38] as const;

const INFO_COLS_INNER_W = PI_CONTENT_W - INFO_COL_GAP * (INFO_COL_COUNT - 1);

export function infoColWidth(index: 0 | 1 | 2): number {
  return INFO_COLS_INNER_W * INFO_COL_FRACTIONS[index];
}

export const INFO_COL_W = PI_CONTENT_W / INFO_COL_COUNT;

export function infoColLeft(index: 0 | 1 | 2): number {
  let x = PI_MARGIN;
  for (let i = 0; i < index; i++) {
    x += infoColWidth(i as 0 | 1 | 2) + INFO_COL_GAP;
  }
  return x;
}

/** Tight gap: info gold rule → Vehicle Items title. */
export const INFO_TO_VEHICLE_GAP = 6;

/** —— Vehicle title + fixed 8-row table —— */
export const VEHICLE_TITLE_TOP = INFO_BOTTOM + INFO_TO_VEHICLE_GAP; // 190
export const VEHICLE_TITLE_HEIGHT = 14;
export const VEHICLE_TABLE_TOP = VEHICLE_TITLE_TOP + VEHICLE_TITLE_HEIGHT; // 204
export const VEHICLE_HEADER_HEIGHT = 28;
export const VEHICLE_ROW_HEIGHT = 20;
export const VEHICLE_ROW_COUNT = 8;

export const VEHICLE_TABLE_HEIGHT =
  VEHICLE_HEADER_HEIGHT + VEHICLE_ROW_HEIGHT * VEHICLE_ROW_COUNT; // 188

export const VEHICLE_TABLE_BOTTOM =
  VEHICLE_TABLE_TOP + VEHICLE_TABLE_HEIGHT; // 392

/** Tighter vertical rhythm below the vehicle table. */
export const SECTION_GAP = 8;

export const CHARGES_TOP = VEHICLE_TABLE_BOTTOM + SECTION_GAP; // 400
export const CHARGES_HEIGHT = 98;
export const CHARGES_BOTTOM = CHARGES_TOP + CHARGES_HEIGHT; // 498

export const PAYMENT_TOP = CHARGES_BOTTOM + SECTION_GAP; // 506
export const PAYMENT_HEIGHT = 58;
export const PAYMENT_BOTTOM = PAYMENT_TOP + PAYMENT_HEIGHT; // 564

export const TERMS_TOP = PAYMENT_BOTTOM + SECTION_GAP; // 572

/** Footer fixed; terms use all remaining space above it. */
export const FOOTER_TOP = 800;
export const FOOTER_HEIGHT = 24;
export const TERMS_FOOTER_GAP = 20;
export const TERMS_MAX_BOTTOM = FOOTER_TOP - TERMS_FOOTER_GAP; // 780

/** Compatibility aliases (no extra body offset). */
export const BODY_OFFSET_Y = 0;
export const BASE_INFO_TOP = INFO_TOP;
export const BASE_VEHICLE_TITLE_TOP = VEHICLE_TITLE_TOP;
export const BASE_VEHICLE_TABLE_TOP = VEHICLE_TABLE_TOP;
export const BASE_TERMS_MAX_BOTTOM = TERMS_MAX_BOTTOM;
export const INFO_TO_VEHICLE_GAP_ALIAS = INFO_TO_VEHICLE_GAP;

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
  // Match compact drawTerms spacing (≈1.18 line-height, tight gaps).
  const enLineH = 9 * 1.18;
  const zhLineH = 8.5 * 1.18;
  let h = 12;
  terms.forEach((t, i) => {
    if (t.textEn) {
      h +=
        estimateWrappedLines(`${i + 1}. ${t.textEn}`, PI_CONTENT_W, 9) *
          enLineH +
        1;
    }
    if (t.textZh) {
      h +=
        estimateWrappedLines(t.textZh, PI_CONTENT_W - 8, 8.5) * zhLineH + 2;
    }
  });
  if (notes?.trim()) {
    h += estimateWrappedLines(notes, PI_CONTENT_W, 8.5) * zhLineH + 1;
  }
  return h;
}

export type ProformaFitCheck = {
  ok: boolean;
  errorZh?: string;
  errorEn?: string;
};

/**
 * One-page fit: vehicle count is hard. Terms use remaining height after the
 * compacted body; only reject when still clearly over after a small tolerance
 * (estimate vs real wrap can differ slightly).
 */
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
  const available = Math.max(0, TERMS_MAX_BOTTOM - TERMS_TOP);
  // Allow small estimate slack — unused upper spacing was reclaimed into terms.
  if (termsH > available + 12) {
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
