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

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <p className="text-[14px] md:text-[16px] font-bold uppercase tracking-[0.04em] text-[#374151] opacity-100 leading-tight">
        {label}
      </p>
      <p className={`mt-1 ${priceType} ${priceColor}`}>{price}</p>
    </div>
  );
}
