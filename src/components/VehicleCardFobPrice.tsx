interface VehicleCardFobPriceProps {
  label: string;
  price: string;
  /** Light cards (inventory / homepage) use brand slate; dark premium cards use gold. */
  variant?: "light" | "dark";
  /**
   * Original site price sizes:
   * - inventory list cards used text-xl
   * - homepage VehicleCard used text-2xl
   */
  priceSize?: "xl" | "2xl";
  className?: string;
}

/** Split "FOB China" / "FOB Chine" into lead + trail; leave other locales intact. */
function splitFobLabel(label: string): { fob: string; china: string } | null {
  const match = label.trim().match(/^FOB\s+(.+)$/i);
  if (!match) return null;
  return { fob: "FOB", china: match[1] };
}

/**
 * Shared FOB price block for vehicle list cards (homepage + inventory).
 * Typography only — callers own label copy and formatted price strings.
 */
export default function VehicleCardFobPrice({
  label,
  price,
  variant = "light",
  priceSize = "xl",
  className = "",
}: VehicleCardFobPriceProps) {
  const priceColor =
    variant === "dark" ? "text-gold font-display" : "text-brand-slate";
  const priceType =
    priceSize === "2xl" ? "text-2xl font-bold" : "text-xl font-bold";
  const parts = splitFobLabel(label);

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      {parts ? (
        <span className="fob-label">
          <span className="fob-text">{parts.fob}</span>
          <span className="china-text">{parts.china}</span>
        </span>
      ) : (
        <span className="fob-label">
          <span className="fob-text">{label}</span>
        </span>
      )}
      <p className={`mt-1 ${priceType} ${priceColor}`}>{price}</p>
    </div>
  );
}
