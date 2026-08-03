/**
 * Shared Proforma Invoice A4 pagination / height measurement.
 * Used by both PDF generator and Admin preview so they stay consistent.
 * Layout-only — does not change totals, prices, or saved invoice data.
 */

export const PI_PAGE_W = 595.28;
export const PI_PAGE_H = 841.89;
export const PI_MARGIN = 28;
export const PI_CONTENT_W = PI_PAGE_W - PI_MARGIN * 2;
/** Footer block + breathing room — content must stay above this Y. */
export const PI_FOOTER_RESERVE = 46;
export const PI_CONTENT_BOTTOM = PI_PAGE_H - PI_FOOTER_RESERVE;

export const PI_TABLE_HEADER_H = 22;
export const PI_PAGE1_TARGET_ROWS = 8;
export const PI_BASE_ROW_H = 18;
/** Alias for callers that still import PI_ROW_H. */
export const PI_ROW_H = PI_BASE_ROW_H;

/** Required gaps between major page-1 sections (pt). */
export const PI_GAP = {
  tableToCharges: 8,
  chargesToPayment: 8,
  paymentToTerms: 8,
  termsToFooter: 12,
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
  /** Payment snapshot fields — empty values keep the block compact. */
  payment?: {
    fullName?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    bankAddress?: string | null;
    swift?: string | null;
  };
};

export type ProformaPagination = {
  /** Item index arrays per page (0-based). */
  pages: number[][];
  page1Count: number;
  totalPages: number;
  /** Measured row heights for every vehicle (same order as items). */
  rowHeights: number[];
};

/** Approximate wrapped line count for PDF/preview width budgets. */
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

/**
 * Dynamic vehicle row height from Brand / Model / Colour wrapping.
 * VIN is truncated in the table, so it does not grow height unboundedly.
 */
export function estimateVehicleRowHeight(item: ProformaLayoutItem): number {
  const brandLines = estimateWrappedLines(item.brand || "—", 60, 7.5);
  const modelLines = estimateWrappedLines(item.model || "—", 74, 7.5);
  const colourLines = estimateWrappedLines(item.colour || "—", 44, 7);
  const lines = Math.max(brandLines, modelLines, colourLines, 1);
  // Single-line rows match the historical 18pt band; extra lines grow the row.
  const contentH = lines * (7.5 + 1.2);
  return Math.max(PI_BASE_ROW_H, contentH + 6);
}

function sumRowHeights(heights: number[], from: number, count: number): number {
  let total = 0;
  for (let i = from; i < from + count && i < heights.length; i++) {
    total += heights[i] ?? PI_BASE_ROW_H;
  }
  return total;
}

/** Small buffer only — avoid large fixed reserves that force early page breaks. */
const FIT_SAFETY_PT = 18;

/** Header + gold rule (full first-page header). */
function estimateHeaderHeight(): number {
  // Matches drawDocHeader: MARGIN + logo(22) + gap(8) + rule padding(8)
  return PI_MARGIN + 22 + 8 + 8;
}

/** Three-column invoice / seller / buyer block. */
function estimateMetaHeight(input: ProformaLayoutInput): number {
  // labelValue ≈ 8 + valueLines*(8+1.8) — short IDs stay ~18pt each
  const idH = 5 * 18;
  let sellerH = 12; // title
  sellerH += Math.max(
    10,
    estimateWrappedLines(
      "FC Auto Fengcheng Auto Trade Co., Ltd.",
      PI_CONTENT_W / 3 - 50,
      7.5
    ) * 9.1
  );
  sellerH += Math.max(
    10,
    estimateWrappedLines(
      input.companyAddress || "",
      PI_CONTENT_W / 3 - 50,
      7.5
    ) * 9.1
  );
  sellerH += 10 * 4; // sales, phone, email, website

  let buyerH = 12;
  buyerH += 11; // customer
  if (input.customerCompany) {
    buyerH += Math.max(
      10,
      estimateWrappedLines(input.customerCompany, PI_CONTENT_W / 3 - 60, 7.5) *
        9.1
    );
  }
  if (input.customerCountry) buyerH += 10;
  if (input.customerWhatsapp) buyerH += 10;
  if (input.customerEmail) buyerH += 10;
  if (input.destinationCountry || input.destinationPort) {
    const dest = [input.destinationCountry, input.destinationPort]
      .filter(Boolean)
      .join(" / ");
    buyerH += Math.max(
      10,
      estimateWrappedLines(dest, PI_CONTENT_W / 3 - 60, 7.5) * 9.1
    );
  }

  return Math.max(idH, sellerH, buyerH) + 14; // + gold rule + padding
}

function estimateVehicleTitleAndHeader(): number {
  return 11 + PI_TABLE_HEADER_H;
}

/** Charges + financial summary (two columns). */
export function estimateChargesSummaryHeight(chargesCount: number): number {
  const rows = Math.max(1, chargesCount) + 1; // + total other charges
  const leftH = 12 + rows * 11 + 2;
  const rightH = 12 + 72; // title + gold box
  return Math.max(leftH, rightH);
}

/** Normalize payment display value (empty → compact dash). */
export function compactPaymentValue(value?: string | null): string {
  const t = (value || "").trim();
  return t || "—";
}

/**
 * Compact payment block height.
 * Empty/dash fields use a single short row; filled values grow with wrap.
 */
export function estimatePaymentHeight(
  payment?: ProformaLayoutInput["payment"]
): number {
  const colW = PI_CONTENT_W / 2 - 14;
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
    if (value === "—") return 10; // label + dash on one compact row
    const lines = estimateWrappedLines(value, colW, 7.5);
    return Math.max(10, 7 + lines * 8.5);
  };

  const leftH = left.reduce((sum, v) => sum + rowH(v), 0);
  const rightH = right.reduce((sum, v) => sum + rowH(v), 0);
  const boxInner = Math.max(leftH, rightH, 28) + 8; // padding inside border
  return 10 + boxInner + 6; // title + box + gap to terms
}

/** Bilingual terms block (EN then ZH) with compact line spacing. */
export function estimateTermsHeight(
  terms: Array<{ textEn: string; textZh: string }>,
  notes?: string | null
): number {
  const lineH = 7.5 + 1.2; // matches compact drawTerms
  let h = 10; // title
  terms.forEach((t, i) => {
    if (t.textEn) {
      const prefix = `${i + 1}. `;
      h +=
        estimateWrappedLines(prefix + t.textEn, PI_CONTENT_W, 7.5) * lineH + 0.5;
    }
    if (t.textZh) {
      h +=
        estimateWrappedLines(t.textZh, PI_CONTENT_W - 8, 7.5) * lineH + 2;
    }
  });
  if (notes) {
    h += estimateWrappedLines(notes, PI_CONTENT_W, 7.5) * lineH + 1;
  }
  return h + 4;
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
  // compact header + title + table header
  return PI_MARGIN + 18 + 6 + 8 + 11 + PI_TABLE_HEADER_H;
}

/**
 * Iterative first-page fit:
 * start at min(8, n), reduce until header+rows+notice+bottom+footer gaps fit.
 * Continuation notice height is included only when vehicles remain after page 1.
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
    // Notice only when continuation page actually exists.
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

  // Continuation pages: pack as many full rows as fit under compact header.
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
      if (chunk.length === 1 && usedH > contAvailable) {
        break;
      }
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

/** @deprecated Prefer paginateProformaVehicles — kept for any residual callers. */
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
