/**
 * Proforma Invoice A4 layout measurement helpers.
 * Layout-only — does not change totals, prices, or saved invoice data.
 */

export const PI_PAGE_W = 595.28;
export const PI_PAGE_H = 841.89;
export const PI_MARGIN = 28;
export const PI_CONTENT_W = PI_PAGE_W - PI_MARGIN * 2;
export const PI_FOOTER_RESERVE = 42;
export const PI_CONTENT_BOTTOM = PI_PAGE_H - PI_FOOTER_RESERVE;

export const PI_ROW_H = 18;
export const PI_TABLE_HEADER_H = 22;
export const PI_PAGE1_TARGET_ROWS = 8;

/** Estimate page-1 vehicle capacity from remaining content height. */
export function calcPage1VehicleCapacity(opts: {
  yAfterTableHeader: number;
  bottomBlockHeight: number;
  moreNoticeHeight: number;
  itemCount: number;
}): number {
  if (opts.itemCount <= 0) return 0;

  const availableWithoutNotice =
    PI_CONTENT_BOTTOM -
    opts.yAfterTableHeader -
    opts.bottomBlockHeight -
    6;
  let byHeight = Math.max(0, Math.floor(availableWithoutNotice / PI_ROW_H));
  let first = Math.min(PI_PAGE1_TARGET_ROWS, byHeight, opts.itemCount);

  if (first < opts.itemCount) {
    const availableWithNotice =
      PI_CONTENT_BOTTOM -
      opts.yAfterTableHeader -
      opts.moreNoticeHeight -
      opts.bottomBlockHeight -
      6;
    byHeight = Math.max(0, Math.floor(availableWithNotice / PI_ROW_H));
    first = Math.min(PI_PAGE1_TARGET_ROWS, byHeight, opts.itemCount);
  }

  return Math.max(0, first);
}

export function calcContinuationRowsPerPage(
  yAfterTableHeader: number
): number {
  const available = PI_CONTENT_BOTTOM - yAfterTableHeader - 8;
  return Math.max(1, Math.floor(available / PI_ROW_H));
}

/** Split items into page chunks: first page capped, then continuation pages. */
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
