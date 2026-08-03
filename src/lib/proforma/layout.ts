/**
 * Shared Proforma Invoice A4 pagination / height measurement.
 * Used by both PDF generator and Admin preview so they stay consistent.
 * Layout-only — does not change totals, prices, or saved invoice data.
 */

export const PI_PAGE_W = 595.28;
export const PI_PAGE_H = 841.89;
export const PI_MARGIN = 28;
export const PI_CONTENT_W = PI_PAGE_W - PI_MARGIN * 2;
/** Footer block — content must stay above this Y. */
export const PI_FOOTER_RESERVE = 42;
export const PI_CONTENT_BOTTOM = PI_PAGE_H - PI_FOOTER_RESERVE;

export const PI_TABLE_HEADER_H = 20;
export const PI_PAGE1_TARGET_ROWS = 8;
/** Slightly tighter single-line vehicle rows (still readable). */
export const PI_BASE_ROW_H = 16;
/** Alias for callers that still import PI_ROW_H. */
export const PI_ROW_H = PI_BASE_ROW_H;

/**
 * Required gaps between major page-1 sections (pt).
 * nextTop = previousBottom + gap
 */
export const PI_GAP = {
  tableToCharges: 10,
  chargesToPayment: 10,
  paymentToTerms: 10,
  /** Target breathing room above footer safe area. */
  termsToFooter: 20,
  moreNotice: 12,
} as const;

export type ProformaLayoutItem = {
  brand: string;
  model: string;
  year?: string | null;
  colour?: string | null;
  vin?: string | null;
};

export type ProformaLayoutInput = {
  items: ProformaLayoutItem[];
  chargesCount: number;
  enabledTerms: Array<{ textEn: string; textZh: string }>;
  notes?: string | null;
  companyAddress: string;
  customerCompany?: string | null;
  customerCountry?: string | null;
  customerWhatsapp?: string | null;
  customerEmail?: string | null;
  destinationCountry?: string | null;
  destinationPort?: string | null;
  payment?: {
    fullName?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    bankAddress?: string | null;
    swift?: string | null;
  };
};

export type ProformaPagination = {
  pages: number[][];
  page1Count: number;
  totalPages: number;
  rowHeights: number[];
};

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

export function estimateVehicleRowHeight(item: ProformaLayoutItem): number {
  const brandLines = estimateWrappedLines(item.brand || "—", 60, 7.5);
  const modelLines = estimateWrappedLines(item.model || "—", 74, 7.5);
  const colourLines = estimateWrappedLines(item.colour || "—", 44, 7);
  const lines = Math.max(brandLines, modelLines, colourLines, 1);
  if (lines <= 1) return PI_BASE_ROW_H;
  return Math.max(PI_BASE_ROW_H, 8 + lines * (7.5 + 1.1));
}

function sumRowHeights(heights: number[], from: number, count: number): number {
  let total = 0;
  for (let i = from; i < from + count && i < heights.length; i++) {
    total += heights[i] ?? PI_BASE_ROW_H;
  }
  return total;
}

/** Minimal safety only — do not force page-1 down to 7 for normal content. */
const FIT_SAFETY_PT = 10;

/** Compact header (~20–35pt tighter than prior layout). */
function estimateHeaderHeight(): number {
  return PI_MARGIN + 20 + 5 + 4;
}

function estimateMetaHeight(input: ProformaLayoutInput): number {
  const idH = 5 * 15;
  let sellerH = 10;
  sellerH += Math.max(
    9,
    estimateWrappedLines(
      "FC Auto Fengcheng Auto Trade Co., Ltd.",
      PI_CONTENT_W / 3 - 50,
      7.5
    ) * 8.5
  );
  sellerH += Math.max(
    9,
    estimateWrappedLines(
      input.companyAddress || "",
      PI_CONTENT_W / 3 - 50,
      7.5
    ) * 8.5
  );
  sellerH += 9 * 4;

  let buyerH = 10;
  buyerH += 9;
  if (input.customerCompany) {
    buyerH += Math.max(
      9,
      estimateWrappedLines(input.customerCompany, PI_CONTENT_W / 3 - 60, 7.5) *
        8.5
    );
  }
  if (input.customerCountry) buyerH += 9;
  if (input.customerWhatsapp) buyerH += 9;
  if (input.customerEmail) buyerH += 9;
  if (input.destinationCountry || input.destinationPort) {
    const dest = [input.destinationCountry, input.destinationPort]
      .filter(Boolean)
      .join(" / ");
    buyerH += Math.max(
      9,
      estimateWrappedLines(dest, PI_CONTENT_W / 3 - 60, 7.5) * 8.5
    );
  }

  return Math.max(idH, sellerH, buyerH) + 10;
}

function estimateVehicleTitleAndHeader(): number {
  return 9 + PI_TABLE_HEADER_H;
}

export function estimateChargesSummaryHeight(chargesCount: number): number {
  const rows = Math.max(1, chargesCount) + 1;
  const leftH = 10 + rows * 10 + 2;
  // 5 summary lines × 11 + inner padding (no oversized empty box)
  const rightH = 10 + 8 + 5 * 11;
  return Math.max(leftH, rightH);
}

export function compactPaymentValue(value?: string | null): string {
  const t = (value || "").trim();
  return t || "—";
}

/**
 * Compact payment block (~55–75pt for short/empty values).
 * Height excludes the following section gap.
 */
export function estimatePaymentHeight(
  payment?: ProformaLayoutInput["payment"]
): number {
  const colW = PI_CONTENT_W / 2 - 20;
  const left = [
    compactPaymentValue(payment?.fullName),
    compactPaymentValue(payment?.bankName),
    compactPaymentValue(payment?.accountNumber),
  ];
  const right = [
    compactPaymentValue(payment?.bankAddress),
    compactPaymentValue(payment?.swift),
  ];

  const rowH = (value: string) => {
    // Inline "Label: value" — empty dash stays one line.
    if (value === "—") return 11;
    const lines = estimateWrappedLines(value, colW, 7.5);
    return Math.max(11, lines * 9);
  };

  const leftH = left.reduce((sum, v) => sum + rowH(v), 0);
  const rightH = right.reduce((sum, v) => sum + rowH(v), 0);
  const boxInner = Math.max(leftH, rightH) + 10;
  return 9 + boxInner; // title + bordered box
}

/** Readable bilingual terms (uses lower-page space; not over-compressed). */
export function estimateTermsHeight(
  terms: Array<{ textEn: string; textZh: string }>,
  notes?: string | null
): number {
  const lineH = 7.5 + 1.5;
  let h = 10;
  terms.forEach((t, i) => {
    if (t.textEn) {
      h +=
        estimateWrappedLines(`${i + 1}. ${t.textEn}`, PI_CONTENT_W, 7.5) *
          lineH +
        1;
    }
    if (t.textZh) {
      h +=
        estimateWrappedLines(t.textZh, PI_CONTENT_W - 8, 7.5) * lineH + 3;
    }
  });
  if (notes) {
    h += estimateWrappedLines(notes, PI_CONTENT_W, 7.5) * lineH + 2;
  }
  return h;
}

function estimatePage1BottomHeight(input: ProformaLayoutInput): number {
  return (
    estimateChargesSummaryHeight(input.chargesCount) +
    PI_GAP.chargesToPayment +
    estimatePaymentHeight(input.payment) +
    PI_GAP.paymentToTerms +
    estimateTermsHeight(input.enabledTerms, input.notes)
  );
}

function estimateContinuationTopHeight(): number {
  return PI_MARGIN + 18 + 5 + 4 + 9 + PI_TABLE_HEADER_H;
}

/**
 * Prefer 8 vehicles on page 1. Only reduce when measured content
 * still crosses the footer boundary after compact layout.
 */
export function paginateProformaVehicles(
  input: ProformaLayoutInput
): ProformaPagination {
  const n = input.items.length;
  const rowHeights = input.items.map((item) => estimateVehicleRowHeight(item));

  if (n === 0) {
    return { pages: [[]], page1Count: 0, totalPages: 1, rowHeights };
  }

  const topH =
    estimateHeaderHeight() +
    estimateMetaHeight(input) +
    estimateVehicleTitleAndHeader();
  const bottomH = estimatePage1BottomHeight(input);
  const safeLimit = PI_CONTENT_BOTTOM - FIT_SAFETY_PT;

  let firstCount = Math.min(PI_PAGE1_TARGET_ROWS, n);

  while (firstCount >= 1) {
    const hasMore = firstCount < n;
    const afterTableGap = hasMore
      ? PI_GAP.moreNotice + PI_GAP.tableToCharges
      : PI_GAP.tableToCharges;
    const tableH = sumRowHeights(rowHeights, 0, firstCount);
    const used =
      topH + tableH + afterTableGap + bottomH + PI_GAP.termsToFooter;

    if (used <= safeLimit) break;
    if (firstCount <= 1) break;
    firstCount -= 1;
  }

  const contTop = estimateContinuationTopHeight();
  const contAvailable = PI_CONTENT_BOTTOM - contTop - 10 - FIT_SAFETY_PT;
  const pages: number[][] = [];
  const page1: number[] = [];
  for (let i = 0; i < firstCount; i++) page1.push(i);
  pages.push(page1);

  let idx = firstCount;
  while (idx < n) {
    const chunk: number[] = [];
    let usedH = 0;
    while (idx < n) {
      const h = rowHeights[idx] ?? PI_BASE_ROW_H;
      if (chunk.length > 0 && usedH + h > contAvailable) break;
      chunk.push(idx);
      usedH += h;
      idx += 1;
      if (chunk.length === 1 && usedH > contAvailable) break;
    }
    pages.push(chunk);
  }

  return {
    pages,
    page1Count: firstCount,
    totalPages: pages.length,
    rowHeights,
  };
}

/** @deprecated Prefer paginateProformaVehicles */
export function calcPage1VehicleCapacity(opts: {
  yAfterTableHeader: number;
  bottomBlockHeight: number;
  moreNoticeHeight: number;
  itemCount: number;
}): number {
  if (opts.itemCount <= 0) return 0;
  const available =
    PI_CONTENT_BOTTOM -
    opts.yAfterTableHeader -
    opts.bottomBlockHeight -
    6;
  return Math.min(
    PI_PAGE1_TARGET_ROWS,
    Math.max(0, Math.floor(available / PI_BASE_ROW_H)),
    opts.itemCount
  );
}

/** @deprecated Prefer paginateProformaVehicles */
export function calcContinuationRowsPerPage(
  yAfterTableHeader: number
): number {
  const available = PI_CONTENT_BOTTOM - yAfterTableHeader - 8;
  return Math.max(1, Math.floor(available / PI_BASE_ROW_H));
}

/** @deprecated Prefer paginateProformaVehicles */
export function splitVehiclePages(
  itemCount: number,
  page1Rows: number,
  contRowsPerPage: number
): number[][] {
  const pages: number[][] = [];
  if (itemCount <= 0) {
    pages.push([]);
    return pages;
  }
  const first = Math.min(page1Rows, itemCount);
  const page1: number[] = [];
  for (let i = 0; i < first; i++) page1.push(i);
  pages.push(page1);
  let idx = first;
  while (idx < itemCount) {
    const chunk: number[] = [];
    const limit = Math.min(contRowsPerPage, itemCount - idx);
    for (let j = 0; j < limit; j++) chunk.push(idx + j);
    pages.push(chunk);
    idx += limit;
  }
  return pages;
}
