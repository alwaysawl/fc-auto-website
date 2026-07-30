/**
 * SAMPLE estimated ocean freight rates (USD) for the public Shipping Calculator.
 *
 * IMPORTANT: These are illustrative estimates for UX testing only.
 * They are NOT guaranteed quotations. Update values here as commercial
 * schedules and carrier pricing change.
 */

export type VehicleTypeId = "sedan" | "suv" | "pickup" | "minivan" | "van";
export type ShippingMethodId = "roro" | "container";

export type LocalizedName = {
  en: string;
  fr: string;
  /** Reserved for future locales without redesigning the calculator */
  es?: string;
  pt?: string;
  ar?: string;
  zh?: string;
};

export type PortRate = {
  portId: string;
  portName: LocalizedName;
  /** SAMPLE estimated ocean freight in USD by vehicle type + method */
  sampleFreightUsd: Record<VehicleTypeId, Record<ShippingMethodId, number>>;
};

export type ShippingDestination = {
  countryId: string;
  countryName: LocalizedName;
  ports: PortRate[];
};

export const SHIPPING_CURRENCY = "USD" as const;

export const VEHICLE_TYPES: VehicleTypeId[] = [
  "sedan",
  "suv",
  "pickup",
  "minivan",
  "van",
];

export const SHIPPING_METHODS: ShippingMethodId[] = ["roro", "container"];

/** Editable sample destination matrix — Africa export focus */
export const SHIPPING_DESTINATIONS: ShippingDestination[] = [
  {
    countryId: "cm",
    countryName: { en: "Cameroon", fr: "Cameroun", zh: "喀麦隆" },
    ports: [
      {
        portId: "douala",
        portName: { en: "Douala", fr: "Douala", zh: "杜阿拉" },
        sampleFreightUsd: {
          sedan: { roro: 1450, container: 2100 },
          suv: { roro: 1750, container: 2450 },
          pickup: { roro: 1850, container: 2550 },
          minivan: { roro: 1900, container: 2600 },
          van: { roro: 2000, container: 2750 },
        },
      },
    ],
  },
  {
    countryId: "gh",
    countryName: { en: "Ghana", fr: "Ghana", zh: "加纳" },
    ports: [
      {
        portId: "tema",
        portName: { en: "Tema", fr: "Tema", zh: "特马" },
        sampleFreightUsd: {
          sedan: { roro: 1350, container: 2000 },
          suv: { roro: 1650, container: 2350 },
          pickup: { roro: 1750, container: 2450 },
          minivan: { roro: 1800, container: 2500 },
          van: { roro: 1900, container: 2650 },
        },
      },
    ],
  },
  {
    countryId: "ng",
    countryName: { en: "Nigeria", fr: "Nigéria", zh: "尼日利亚" },
    ports: [
      {
        portId: "lagos",
        portName: { en: "Lagos", fr: "Lagos", zh: "拉各斯" },
        sampleFreightUsd: {
          sedan: { roro: 1500, container: 2200 },
          suv: { roro: 1800, container: 2550 },
          pickup: { roro: 1900, container: 2650 },
          minivan: { roro: 1950, container: 2700 },
          van: { roro: 2050, container: 2850 },
        },
      },
    ],
  },
  {
    countryId: "bj",
    countryName: { en: "Benin", fr: "Bénin", zh: "贝宁" },
    ports: [
      {
        portId: "cotonou",
        portName: { en: "Cotonou", fr: "Cotonou", zh: "科托努" },
        sampleFreightUsd: {
          sedan: { roro: 1400, container: 2050 },
          suv: { roro: 1700, container: 2400 },
          pickup: { roro: 1800, container: 2500 },
          minivan: { roro: 1850, container: 2550 },
          van: { roro: 1950, container: 2700 },
        },
      },
    ],
  },
  {
    countryId: "tg",
    countryName: { en: "Togo", fr: "Togo", zh: "多哥" },
    ports: [
      {
        portId: "lome",
        portName: { en: "Lomé", fr: "Lomé", zh: "洛美" },
        sampleFreightUsd: {
          sedan: { roro: 1380, container: 2020 },
          suv: { roro: 1680, container: 2380 },
          pickup: { roro: 1780, container: 2480 },
          minivan: { roro: 1830, container: 2530 },
          van: { roro: 1930, container: 2680 },
        },
      },
    ],
  },
  {
    countryId: "ao",
    countryName: { en: "Angola", fr: "Angola", zh: "安哥拉" },
    ports: [
      {
        portId: "luanda",
        portName: { en: "Luanda", fr: "Luanda", zh: "罗安达" },
        sampleFreightUsd: {
          sedan: { roro: 1950, container: 2800 },
          suv: { roro: 2300, container: 3200 },
          pickup: { roro: 2400, container: 3350 },
          minivan: { roro: 2450, container: 3400 },
          van: { roro: 2600, container: 3600 },
        },
      },
    ],
  },
  {
    countryId: "cg",
    countryName: { en: "Congo", fr: "Congo", zh: "刚果" },
    ports: [
      {
        portId: "pointe-noire",
        portName: { en: "Pointe-Noire", fr: "Pointe-Noire", zh: "黑角" },
        sampleFreightUsd: {
          sedan: { roro: 1850, container: 2650 },
          suv: { roro: 2200, container: 3050 },
          pickup: { roro: 2300, container: 3200 },
          minivan: { roro: 2350, container: 3250 },
          van: { roro: 2500, container: 3450 },
        },
      },
    ],
  },
  {
    countryId: "cd",
    countryName: { en: "DR Congo", fr: "RD Congo", zh: "刚果（金）" },
    ports: [
      {
        portId: "matadi",
        portName: { en: "Matadi", fr: "Matadi", zh: "马塔迪" },
        sampleFreightUsd: {
          sedan: { roro: 2100, container: 3000 },
          suv: { roro: 2500, container: 3450 },
          pickup: { roro: 2600, container: 3600 },
          minivan: { roro: 2650, container: 3650 },
          van: { roro: 2800, container: 3850 },
        },
      },
    ],
  },
];

export function getLocalizedName(
  name: LocalizedName,
  locale: keyof LocalizedName
): string {
  return name[locale] ?? name.en;
}

export function findDestination(
  countryId: string
): ShippingDestination | undefined {
  return SHIPPING_DESTINATIONS.find((d) => d.countryId === countryId);
}

export function findPort(
  destination: ShippingDestination,
  portId: string
): PortRate | undefined {
  return destination.ports.find((p) => p.portId === portId);
}

export function getSampleFreightUsd(
  countryId: string,
  portId: string,
  vehicleType: VehicleTypeId,
  method: ShippingMethodId
): number | null {
  const dest = findDestination(countryId);
  if (!dest) return null;
  const port = findPort(dest, portId);
  if (!port) return null;
  return port.sampleFreightUsd[vehicleType]?.[method] ?? null;
}
