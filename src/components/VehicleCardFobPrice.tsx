interface VehicleCardFobPriceProps {
  /** Kept for callers; frontend no longer shows a FOB / China-price label. */
  label?: string;
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

/**
 * Shared price block for vehicle list cards (homepage + inventory).
 * Price only — no FOB / China-price label.
 */
export default function VehicleCardFobPrice({
  price,
  variant = "light",
  priceSize = "xl",
  className = "",
}: VehicleCardFobPriceProps) {
  const priceColor =
    variant === "dark" ? "text-gold font-display" : "text-brand-slate";
  const priceType =
    priceSize === "2xl" ? "text-2xl font-bold" : "text-xl font-bold";

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <p className={`${priceType} ${priceColor}`}>{price}</p>
    </div>
  );
}
