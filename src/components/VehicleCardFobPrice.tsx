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

/** Split "CHINA PRICE" / "PRIX CHINE" / "中国价格" for the existing two-weight label. */
function splitPriceLabel(label: string): { lead: string; trail: string } | null {
  const value = label.trim();
  if (/^CHINA\s+PRICE$/i.test(value)) return { lead: "CHINA", trail: "PRICE" };
  if (/^PRIX\s+CHINE$/i.test(value)) return { lead: "PRIX", trail: "CHINE" };
  if (value === "中国价格") return { lead: "中国", trail: "价格" };
  return null;
}

/**
 * Shared China-price block for vehicle list cards (homepage + inventory).
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
  const parts = splitPriceLabel(label);

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      {parts ? (
        <span className="fob-label">
          <span className="fob-text">{parts.lead}</span>
          <span className="china-text">{parts.trail}</span>
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
