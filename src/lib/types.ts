export type Locale = "en" | "fr" | "zh";

export interface ShippingTier {
  quantity: number;
  price: number;
}

export type VehicleStatus = "在售" | "已售" | "草稿" | "已下架";

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  fuel: string;
  transmission: string;
  steering: string;
  /** Admin-only chassis number. Never select/return on public paths. */
  vin?: string;
  fobPrice: number;
  photos: string[];
  shippingTiers: ShippingTier[];
  featured?: boolean;

  // Extended fields added in Phase 2A (all optional for backwards compatibility)
  status?: VehicleStatus;
  currency?: string;          // e.g. "USD"
  bodyType?: string;          // e.g. "SUV"
  /** Drivetrain: FWD | RWD | 2WD | 4WD | AWD */
  driveType?: string;
  displacement?: string;      // e.g. "2.0L"
  color?: string;
  seats?: number;
  exportPort?: string;        // e.g. "Guangzhou"
  location?: string;          // e.g. "广州"
  titleEn?: string;           // English title for listing
  descriptionEn?: string;     // English description
  features?: string;          // Key features, newline-separated
  /** Admin-only internal notes. Never select/return on public paths. */
  notes?: string;             // Internal notes
  updatedAt?: string;         // ISO timestamp
  createdAt?: string;         // ISO timestamp

  // Structured image fields (Phase 2B+). photos[] kept for public-site compat.
  mainImageUrl?: string;        // primary display image URL (Supabase Storage)
  galleryImageUrls?: string[];  // ordered gallery image URLs
}

export interface Review {
  id: string;
  name: string;
  country: string;
  text: { en: string; fr: string; zh?: string };
  rating: number;
}

export interface StoreData {
  vehicles: Vehicle[];
  reviews: Review[];
}

export const locales: Locale[] = ["en", "fr", "zh"];
export const defaultLocale: Locale = "en";

export const WHATSAPP_NUMBER = "8616676364929";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
