import type { Locale } from "@/lib/types";

/**
 * Cart multi-vehicle freight grouping (40-foot container rules).
 *
 * Editable SAMPLE rates live on each port in src/data/shippingRates.ts:
 *   port.sampleCartFreightUsd.singleVehicle
 *   port.sampleCartFreightUsd.container40ft
 */

export type GroupedFreightResult = {
  vehicleCount: number;
  fullContainerCount: number;
  singleVehicleCount: number;
  totalFreight: number;
  calculationLabel: string;
  singleVehicleFreight: number;
  container40ftFreight: number;
};

export type FreightLabelStrings = {
  freightCalcSingle: string;
  freightCalcOneContainer: string;
  freightCalcManyContainers: string;
  freightCalcOneContainerPlusSingle: string;
  freightCalcManyContainersPlusSingle: string;
};

/**
 * Group vehicles into 40ft containers of up to 4, with remainder rules:
 * - rem 0 → only full containers
 * - rem 1 → full containers + 1 single
 * - rem 2 or 3 → full containers + 1 extra container
 */
export function calculateGroupedFreight(
  vehicleCount: number,
  singleVehicleFreight: number,
  container40ftFreight: number,
  labels: FreightLabelStrings
): GroupedFreightResult {
  if (vehicleCount <= 0) {
    return {
      vehicleCount: 0,
      fullContainerCount: 0,
      singleVehicleCount: 0,
      totalFreight: 0,
      calculationLabel: labels.freightCalcSingle,
      singleVehicleFreight,
      container40ftFreight,
    };
  }

  let fullContainerCount = 0;
  let singleVehicleCount = 0;

  if (vehicleCount === 1) {
    singleVehicleCount = 1;
  } else {
    const completeGroups = Math.floor(vehicleCount / 4);
    const remainder = vehicleCount % 4;
    fullContainerCount = completeGroups;

    if (remainder === 1) {
      singleVehicleCount = 1;
    } else if (remainder === 2 || remainder === 3) {
      fullContainerCount += 1;
    }
  }

  const totalFreight =
    fullContainerCount * container40ftFreight +
    singleVehicleCount * singleVehicleFreight;

  const calculationLabel = buildFreightCalculationLabel(
    { fullContainerCount, singleVehicleCount, vehicleCount },
    labels
  );

  return {
    vehicleCount,
    fullContainerCount,
    singleVehicleCount,
    totalFreight,
    calculationLabel,
    singleVehicleFreight,
    container40ftFreight,
  };
}

export function buildFreightCalculationLabel(
  result: Pick<
    GroupedFreightResult,
    "fullContainerCount" | "singleVehicleCount" | "vehicleCount"
  >,
  t: FreightLabelStrings
): string {
  const { fullContainerCount, singleVehicleCount, vehicleCount } = result;

  if (
    vehicleCount <= 1 ||
    (fullContainerCount === 0 && singleVehicleCount === 1)
  ) {
    return t.freightCalcSingle;
  }

  if (singleVehicleCount === 0) {
    if (fullContainerCount === 1) return t.freightCalcOneContainer;
    return t.freightCalcManyContainers.replace(
      "{count}",
      String(fullContainerCount)
    );
  }

  if (fullContainerCount === 1) {
    return t.freightCalcOneContainerPlusSingle.replace(
      "{singles}",
      String(singleVehicleCount)
    );
  }

  return t.freightCalcManyContainersPlusSingle
    .replace("{containers}", String(fullContainerCount))
    .replace("{singles}", String(singleVehicleCount));
}

export function buildWhatsAppFreightSummary(
  result: GroupedFreightResult,
  locale: Locale
): string[] {
  const freight = `$${result.totalFreight.toLocaleString("en-US")}`;

  if (locale === "zh") {
    return [
      `车辆数量：${result.vehicleCount} 台`,
      `运输计费：${result.calculationLabel}`,
      `预估运费：${freight}`,
    ];
  }

  if (locale === "fr") {
    return [
      `Nombre de véhicules : ${result.vehicleCount}`,
      `Calcul du transport : ${result.calculationLabel}`,
      `Fret estimé : $${result.totalFreight.toLocaleString("en-US")}`,
    ];
  }

  return [
    `Vehicle quantity: ${result.vehicleCount}`,
    `Freight calculation: ${result.calculationLabel}`,
    `Estimated freight: ${freight}`,
  ];
}
