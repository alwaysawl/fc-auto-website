/**
 * Custom car sourcing — validation + WhatsApp summary helpers.
 * No PII is placed into analytics; summaries are for WhatsApp / CRM only.
 */

export type CarSourcingFormValues = {
  customerName: string;
  whatsapp: string;
  country: string;
  brand: string;
  model: string;
  budget: string;
  quantity: string;
  year: string;
  transmission: string;
  fuel: string;
  drive: string;
  color: string;
  destinationCountry: string;
  destinationPort: string;
  needShipping: string;
  otherRequirements: string;
};

export type CarSourcingValidationResult =
  | { ok: true; values: CarSourcingFormValues }
  | { ok: false; error: string; field?: keyof CarSourcingFormValues };

const REQUIRED: Array<keyof CarSourcingFormValues> = [
  "customerName",
  "whatsapp",
  "country",
  "brand",
  "model",
  "budget",
  "quantity",
];

function clean(value: unknown, max = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function normalizeCarSourcingInput(
  raw: Record<string, unknown>
): CarSourcingFormValues {
  return {
    customerName: clean(raw.customerName, 120),
    whatsapp: clean(raw.whatsapp, 40),
    country: clean(raw.country, 80),
    brand: clean(raw.brand, 80),
    model: clean(raw.model, 80),
    budget: clean(raw.budget, 80),
    quantity: clean(raw.quantity, 20),
    year: clean(raw.year, 20),
    transmission: clean(raw.transmission, 40),
    fuel: clean(raw.fuel, 40),
    drive: clean(raw.drive, 40),
    color: clean(raw.color, 40),
    destinationCountry: clean(raw.destinationCountry, 80),
    destinationPort: clean(raw.destinationPort, 80),
    needShipping: clean(raw.needShipping, 20),
    otherRequirements: clean(raw.otherRequirements, 2000),
  };
}

export function validateCarSourcingValues(
  values: CarSourcingFormValues,
  requiredMessage: string
): CarSourcingValidationResult {
  for (const key of REQUIRED) {
    if (!values[key]) {
      return { ok: false, error: requiredMessage, field: key };
    }
  }
  const qty = Number(values.quantity);
  if (!Number.isFinite(qty) || qty < 1 || qty > 999) {
    return { ok: false, error: requiredMessage, field: "quantity" };
  }
  return { ok: true, values };
}

function line(label: string, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  return `${label}: ${v}`;
}

/** Clean WhatsApp / CRM message body (no agent greeting). */
export function buildCarSourcingInquiryNote(values: CarSourcingFormValues): string {
  const lines = [
    "Custom Car Sourcing Request",
    "",
    line("Customer Name", values.customerName),
    line("WhatsApp", values.whatsapp),
    line("Country", values.country),
    line("Brand", values.brand),
    line("Model", values.model),
    line("Year", values.year),
    line("Budget", values.budget),
    line("Quantity", values.quantity),
    line("Transmission", values.transmission),
    line("Fuel", values.fuel),
    line("Drive", values.drive),
    line("Color", values.color),
    line("Destination Country", values.destinationCountry),
    line("Destination Port", values.destinationPort),
    line("Need Shipping", values.needShipping),
    line("Other Requirements", values.otherRequirements),
  ].filter((x): x is string => Boolean(x));

  return lines.join("\n");
}

export function parseBudgetUsd(budget: string): number | null {
  const digits = budget.replace(/[^\d.]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(n, 10_000_000);
}

export function parseQuantity(quantity: string): number | null {
  const n = Number(quantity);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(Math.floor(n), 999);
}
