export type ShippingCountryRow = {
  id: string;
  name_en: string;
  name_fr: string | null;
  name_zh: string | null;
  enabled: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ShippingPortRow = {
  id: string;
  country_id: string;
  port_id: string;
  name_en: string;
  name_fr: string | null;
  name_zh: string | null;
  single_vehicle_usd: number;
  container_40ft_usd: number;
  enabled: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ShippingCountryWithPorts = ShippingCountryRow & {
  ports: ShippingPortRow[];
};

export type ShippingCountryInput = {
  id: string;
  name_en: string;
  name_fr?: string | null;
  name_zh?: string | null;
  enabled?: boolean;
  display_order?: number;
};

export type ShippingPortInput = {
  country_id: string;
  port_id: string;
  name_en: string;
  name_fr?: string | null;
  name_zh?: string | null;
  single_vehicle_usd: number;
  container_40ft_usd: number;
  enabled?: boolean;
  display_order?: number;
};
