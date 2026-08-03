/** Consistent USD display: "USD 3,500.00" (never "3500USD"). */

export function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatUsd(amount: number): string {
  const n = roundMoney(Number.isFinite(amount) ? amount : 0);
  const body = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `USD ${body}`;
}

export function calcLineTotal(unitPrice: number, quantity: number): number {
  return roundMoney(roundMoney(unitPrice) * Math.max(0, Math.floor(quantity)));
}

export function calcTotals(input: {
  itemTotals: number[];
  chargeAmounts: number[];
  depositUsd: number;
}): {
  vehicleSubtotalUsd: number;
  chargesTotalUsd: number;
  totalUsd: number;
  depositUsd: number;
  balanceUsd: number;
} {
  const vehicleSubtotalUsd = roundMoney(
    input.itemTotals.reduce((s, n) => s + roundMoney(n), 0)
  );
  const chargesTotalUsd = roundMoney(
    input.chargeAmounts.reduce((s, n) => s + roundMoney(n), 0)
  );
  const totalUsd = roundMoney(vehicleSubtotalUsd + chargesTotalUsd);
  const depositUsd = roundMoney(Math.max(0, input.depositUsd));
  const balanceUsd = roundMoney(totalUsd - depositUsd);
  return {
    vehicleSubtotalUsd,
    chargesTotalUsd,
    totalUsd,
    depositUsd,
    balanceUsd,
  };
}

/** Asia/Shanghai calendar date as YYYY-MM-DD */
export function todayShanghaiDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
