/**
 * Shared left-aligned label + colon-aligned value layout.
 *
 * Labels stay LEFT aligned.
 * Colon X is driven by the longest label in the column (not a fixed large width).
 * Values start immediately after ": ".
 *
 * Used by both Preview and PDF so coordinates match.
 */

/** Colon + space after the label column — values start immediately after this. */
export const FIELD_COLON_SUFFIX = ": ";

export type AlignedColumnLayout = {
  /** Width of the longest label in the column (pt). */
  maxLabelWidth: number;
  /** Relative X of the colon ( = maxLabelWidth ). */
  colonX: number;
  /** Relative X where every value starts ( = maxLabelWidth + width(": ") ). */
  valueX: number;
  /** Measured width of ": ". */
  colonSuffixWidth: number;
};

/**
 * Estimate label text width (pt) — shared by Preview + PDF so both use
 * the same longest-label → colon → value coordinates.
 */
export function measureLabelWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) {
    const isCjk = /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch);
    // Bold labels read slightly wider than regular body text.
    w += isCjk ? fontSize : fontSize * 0.56;
  }
  return w;
}

/**
 * Build column field layout from the actual labels in that column.
 * Shorter labels are visually left-aligned; only the colon is pushed out
 * to the longest-label edge (padding effect).
 */
export function layoutAlignedColumn(
  labels: string[],
  fontSize: number
): AlignedColumnLayout {
  let maxLabelWidth = 0;
  for (const label of labels) {
    maxLabelWidth = Math.max(maxLabelWidth, measureLabelWidth(label, fontSize));
  }
  const colonSuffixWidth = measureLabelWidth(FIELD_COLON_SUFFIX, fontSize);
  return {
    maxLabelWidth,
    colonX: maxLabelWidth,
    valueX: maxLabelWidth + colonSuffixWidth,
    colonSuffixWidth,
  };
}

export function alignedValueMaxWidth(
  layout: AlignedColumnLayout,
  columnWidth: number,
  padRight = 4
): number {
  return Math.max(24, columnWidth - layout.valueX - padRight);
}

/**
 * Colon immediately after this label (no padding to a shared column width).
 * Used by Buyer and Invoice Information.
 */
export function layoutImmediateColon(
  label: string,
  fontSize: number
): AlignedColumnLayout {
  const maxLabelWidth = measureLabelWidth(label, fontSize);
  const colonSuffixWidth = measureLabelWidth(FIELD_COLON_SUFFIX, fontSize);
  return {
    maxLabelWidth,
    colonX: maxLabelWidth,
    valueX: maxLabelWidth + colonSuffixWidth,
    colonSuffixWidth,
  };
}
