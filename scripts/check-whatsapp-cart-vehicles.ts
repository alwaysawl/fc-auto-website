import {
  buildWhatsAppCartVehiclePayload,
  formatQualityVehicleDisplay,
} from "../src/lib/whatsapp-cart-vehicles";
import { classifyTrafficSource } from "../src/lib/analytics/source";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const single = buildWhatsAppCartVehiclePayload([
  {
    id: "hyundai-tucsonl-2022",
    title: "2022 Hyundai TucsonL 1.5T Automatic",
    year: 2022,
  },
]);

assert(single, "single payload");
assert(single!.vehicleId === "hyundai-tucsonl-2022", "single vehicleId");
assert(
  single!.vehicleTitle === "2022 Hyundai TucsonL 1.5T Automatic",
  "single title"
);
assert(single!.stockNumber === "hyundai-tucsonl-2022", "single stock");
assert(single!.vehicleYear === "2022", "single year");
assert(single!.analyticsMetadata.cart_vehicle_count === 1, "single count");

const singleDisplay = formatQualityVehicleDisplay({
  assignmentTitle: single!.vehicleTitle,
  assignmentStock: single!.stockNumber,
  analyticsVehicleId: single!.vehicleId,
  cartCount: 1,
  cartTitles: single!.analyticsMetadata.cart_vehicle_titles,
  cartIds: single!.analyticsMetadata.cart_vehicle_ids,
});
assert(
  singleDisplay.title === "2022 Hyundai TucsonL 1.5T Automatic",
  "single display title"
);
assert(singleDisplay.stock === "hyundai-tucsonl-2022", "single display stock");
assert(singleDisplay.multi === false, "single not multi");

const multi = buildWhatsAppCartVehiclePayload([
  {
    id: "hyundai-tucsonl-2022",
    title: "2022 Hyundai TucsonL 1.5T Automatic",
    year: 2022,
  },
  {
    id: "toyota-camry-2021",
    title: "2021 Toyota Camry 2.5",
    year: 2021,
  },
]);

assert(multi, "multi payload");
assert(multi!.vehicleId === undefined, "multi does not set a single vehicleId");
assert(multi!.vehicleTitle?.startsWith("多车型询盘（2）：") === true, "multi title prefix");
assert(
  multi!.vehicleTitle?.includes("2022 Hyundai TucsonL 1.5T Automatic") === true,
  "multi includes first title"
);
assert(
  multi!.vehicleTitle?.includes("2021 Toyota Camry 2.5") === true,
  "multi includes second title"
);
assert(
  multi!.stockNumber === "hyundai-tucsonl-2022,toyota-camry-2021",
  "multi stock ids"
);
assert(multi!.analyticsMetadata.cart_vehicle_count === 2, "multi count");

const multiDisplay = formatQualityVehicleDisplay({
  assignmentTitle: multi!.vehicleTitle,
  assignmentStock: multi!.stockNumber,
  analyticsVehicleId: null,
  cartCount: 2,
  cartTitles: multi!.analyticsMetadata.cart_vehicle_titles,
  cartIds: multi!.analyticsMetadata.cart_vehicle_ids,
});
assert(multiDisplay.multi === true, "multi display flag");
assert(multiDisplay.count === 2, "multi display count");
assert(
  multiDisplay.title?.includes("2022 Hyundai TucsonL 1.5T Automatic") === true,
  "multi display title keeps vehicles"
);
assert(multiDisplay.title?.startsWith("多车型询盘") === false, "badge handles prefix");
assert(
  multiDisplay.stock === "hyundai-tucsonl-2022,toyota-camry-2021",
  "multi display stock"
);

assert(buildWhatsAppCartVehiclePayload([]) === null, "empty cart");

const historicDash = formatQualityVehicleDisplay({
  assignmentTitle: null,
  assignmentStock: null,
  analyticsVehicleId: null,
  lookupTitle: null,
  cartCount: null,
  cartTitles: null,
  cartIds: null,
});
assert(historicDash.title === null, "legacy empty title stays empty");
assert(historicDash.stock === null, "legacy empty stock stays empty");

const direct = classifyTrafficSource({
  firstTouchSource: "direct",
  firstTouchDirect: true,
  attributionVersion: 2,
  referrerHost: null,
});
assert(direct === "direct", "first-touch direct stays direct");

const unknownUnlinked = classifyTrafficSource({
  firstTouchSource: "unknown",
  attributionVersion: 2,
});
assert(unknownUnlinked === "unknown", "true unknown stays unknown");

console.log("whatsapp-cart-vehicles checks passed");
