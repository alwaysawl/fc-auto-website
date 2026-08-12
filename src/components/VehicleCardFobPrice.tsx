interface VehicleCardFobPriceProps {
  label: string;
  price: string;
  /** Light cards (inventory / homepage) use brand slate; dark premium cards use gold. */
  variant?: "light" | "dark";
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
  className = "",
}: VehicleCardFobPriceProps) {
  const priceColor =
    variant === "dark" ? "text-gold font-display" : "text-brand-slate";

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <p className="text-[13px] md:text-[16px] font-bold uppercase tracking-wide text-slate-400 leading-tight">
        {label}
      </p>
      <p
        className={`mt-1.5 text-[24px] md:text-[32px] font-extrabold leading-[1.1] whitespace-nowrap overflow-hidden text-ellipsis tabular-nums ${priceColor}`}
      >
        {price}
      </p>
    </div>
  );
}
