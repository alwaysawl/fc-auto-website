import fs from "fs";
import path from "path";
import { StoreData, Vehicle } from "./types";

const DATA_FILE = path.join(process.cwd(), "data", "store.json");

function ensureDataFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(getDefaultData(), null, 2));
  }
}

export function getDefaultData(): StoreData {
  return {
    vehicles: [
      {
        id: "toyota-rav4-2021",
        brand: "Toyota",
        model: "RAV4",
        year: 2021,
        mileage: 45000,
        fuel: "Petrol",
        transmission: "Automatic",
        steering: "Left Hand Drive",
        vin: "JTMRFREV8MD123456",
        fobPrice: 18500,
        photos: ["/images/rav4.jpg", "/images/hero-rav4.jpg"],
        shippingTiers: [
          { quantity: 1, price: 1200 },
          { quantity: 2, price: 2200 },
          { quantity: 3, price: 2200 },
        ],
        featured: true,
      },
      {
        id: "landwind-x7-2020",
        brand: "Landwind",
        model: "X7",
        year: 2020,
        mileage: 62000,
        fuel: "Diesel",
        transmission: "Automatic",
        steering: "Left Hand Drive",
        vin: "LJ166A250M7123456",
        fobPrice: 12800,
        photos: ["/images/prado.jpg"],
        shippingTiers: [
          { quantity: 1, price: 1100 },
          { quantity: 2, price: 2000 },
          { quantity: 3, price: 2000 },
          { quantity: 4, price: 2000 },
        ],
        featured: true,
      },
      {
        id: "honda-crv-2022",
        brand: "Honda",
        model: "CR-V",
        year: 2022,
        mileage: 28000,
        fuel: "Hybrid",
        transmission: "Automatic",
        steering: "Left Hand Drive",
        vin: "2HKRW2H50NH789012",
        fobPrice: 22400,
        photos: ["/images/rav4.jpg"],
        shippingTiers: [
          { quantity: 1, price: 1300 },
          { quantity: 2, price: 2400 },
          { quantity: 3, price: 2400 },
        ],
        featured: true,
      },
      {
        id: "nissan-xtrail-2019",
        brand: "Nissan",
        model: "X-Trail",
        year: 2019,
        mileage: 78000,
        fuel: "Petrol",
        transmission: "Automatic",
        steering: "Left Hand Drive",
        vin: "5N1AT2MT5KC345678",
        fobPrice: 14200,
        photos: ["/images/rav4.jpg"],
        shippingTiers: [
          { quantity: 1, price: 1150 },
          { quantity: 2, price: 2100 },
          { quantity: 3, price: 2100 },
        ],
        featured: false,
      },
      {
        id: "toyota-hilux-2020",
        brand: "Toyota",
        model: "Hilux",
        year: 2020,
        mileage: 55000,
        fuel: "Diesel",
        transmission: "Manual",
        steering: "Left Hand Drive",
        vin: "MR0KA3CD0L0123456",
        fobPrice: 19800,
        photos: ["/images/hilux.jpg"],
        shippingTiers: [
          { quantity: 1, price: 1400 },
          { quantity: 2, price: 2600 },
          { quantity: 3, price: 2600 },
        ],
        featured: false,
      },
      {
        id: "toyota-prado-2021",
        brand: "Toyota",
        model: "Land Cruiser Prado",
        year: 2021,
        mileage: 42000,
        fuel: "Diesel",
        transmission: "Automatic",
        steering: "Left Hand Drive",
        vin: "JTEBU3FJ5MK234567",
        fobPrice: 32800,
        photos: ["/images/prado.jpg"],
        shippingTiers: [
          { quantity: 1, price: 1500 },
          { quantity: 2, price: 2800 },
          { quantity: 3, price: 2800 },
        ],
        featured: true,
      },
      {
        id: "toyota-corolla-2022",
        brand: "Toyota",
        model: "Corolla",
        year: 2022,
        mileage: 32000,
        fuel: "Hybrid",
        transmission: "Automatic",
        steering: "Left Hand Drive",
        vin: "5YFB4MDE8NP345678",
        fobPrice: 15600,
        photos: ["/images/corolla.jpg"],
        shippingTiers: [
          { quantity: 1, price: 1100 },
          { quantity: 2, price: 2000 },
          { quantity: 3, price: 2000 },
        ],
        featured: true,
      },
      {
        id: "mercedes-glc-2021",
        brand: "Mercedes-Benz",
        model: "GLC 300",
        year: 2021,
        mileage: 35000,
        fuel: "Petrol",
        transmission: "Automatic",
        steering: "Left Hand Drive",
        vin: "WDC0G4KB1MF567890",
        fobPrice: 35600,
        photos: ["/images/rav4.jpg"],
        shippingTiers: [
          { quantity: 1, price: 1500 },
          { quantity: 2, price: 2800 },
          { quantity: 3, price: 2800 },
        ],
        featured: true,
      },
    ],
    reviews: [
      {
        id: "review-1",
        name: "Jean-Pierre M.",
        country: "Cameroon",
        text: {
          en: "Excellent service! My Toyota RAV4 arrived in Douala in perfect condition. FC Auto Export handled everything professionally.",
          fr: "Excellent service ! Ma Toyota RAV4 est arrivée à Douala en parfait état. FC Auto Export a tout géré de manière professionnelle.",
          zh: "服务非常出色！我的丰田 RAV4 完好抵达杜阿拉。FC Auto Export 全程处理专业高效。",
        },
        rating: 5,
      },
      {
        id: "review-2",
        name: "Amadou S.",
        country: "Senegal",
        text: {
          en: "Very transparent pricing and fast shipping to Dakar. I recommend FC Auto Export to anyone looking for quality used cars.",
          fr: "Prix très transparents et expédition rapide vers Dakar. Je recommande FC Auto Export à tous ceux qui cherchent des voitures d'occasion de qualité.",
          zh: "价格非常透明，发往达喀尔的运输也很快。我向任何寻找优质二手车的客户推荐 FC Auto Export。",
        },
        rating: 5,
      },
      {
        id: "review-3",
        name: "Grace O.",
        country: "Nigeria",
        text: {
          en: "The team was responsive on WhatsApp throughout the entire process. My Mercedes arrived exactly as described.",
          fr: "L'équipe était réactive sur WhatsApp tout au long du processus. Ma Mercedes est arrivée exactement comme décrit.",
          zh: "整个过程中团队在 WhatsApp 上响应及时。我的奔驰到货情况与描述完全一致。",
        },
        rating: 5,
      },
    ],
  };
}

export function readStore(): StoreData {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as StoreData;
}

export function writeStore(data: StoreData): void {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function getVehicles(): Vehicle[] {
  return readStore().vehicles;
}

export function getVehicleById(id: string): Vehicle | undefined {
  return readStore().vehicles.find((v) => v.id === id);
}

export function getFeaturedVehicles(): Vehicle[] {
  return readStore().vehicles.filter((v) => v.featured);
}

const HOMEPAGE_SHOWCASE_MODELS: Array<{ brand: string; model: string }> = [
  { brand: "Toyota", model: "RAV4" },
  { brand: "Toyota", model: "Land Cruiser Prado" },
  { brand: "Toyota", model: "Hilux" },
  { brand: "Toyota", model: "Corolla" },
];

export function getHomepageShowcaseVehicles(): Vehicle[] {
  const vehicles = getVehicles();
  return HOMEPAGE_SHOWCASE_MODELS.map(({ brand, model }) =>
    vehicles.find((v) => v.brand === brand && v.model === model)
  ).filter((v): v is Vehicle => v !== undefined);
}

export function getReviews() {
  return readStore().reviews;
}

export function updateVehicle(id: string, updates: Partial<Vehicle>): Vehicle | null {
  const store = readStore();
  const index = store.vehicles.findIndex((v) => v.id === id);
  if (index === -1) return null;
  store.vehicles[index] = { ...store.vehicles[index], ...updates };
  writeStore(store);
  return store.vehicles[index];
}

export function updateShippingTiers(id: string, tiers: Vehicle["shippingTiers"]): Vehicle | null {
  return updateVehicle(id, { shippingTiers: tiers });
}

export function addVehicle(vehicle: Vehicle): Vehicle {
  const store = readStore();
  // Guard against duplicate IDs
  if (store.vehicles.some((v) => v.id === vehicle.id)) {
    throw new Error(`Vehicle with id "${vehicle.id}" already exists`);
  }
  store.vehicles.unshift(vehicle); // newest first
  writeStore(store);
  return vehicle;
}

export function deleteVehicle(id: string): boolean {
  const store = readStore();
  const before = store.vehicles.length;
  store.vehicles = store.vehicles.filter((v) => v.id !== id);
  if (store.vehicles.length === before) return false;
  writeStore(store);
  return true;
}

import { getShippingPrice } from "./shipping";
