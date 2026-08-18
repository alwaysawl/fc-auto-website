import type { VehicleStatus } from "@/lib/types";
import type { TrafficSource, TrafficSourceFilter } from "@/lib/analytics/source";

export type StatisticsRangePreset =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "month"
  | "custom";

export type DataSourceStatus = {
  id: string;
  name: string;
  available: boolean;
  detail: string;
  lastLoadedAt: string | null;
  error: string | null;
  latestEventAt?: string | null;
  totalEvents?: number | null;
  periodEvents?: number | null;
};

/** Aggregated first-party analytics for Admin 数据统计 (no raw event rows). */
export type AnalyticsDashboard = {
  available: boolean;
  emptyWaiting: boolean;
  error: string | null;
  website: {
    pageViews: number;
    uniqueVisitors: number;
    sessions: number;
    vehicleDetailViews: number;
    pagesPerSession: number | null;
  };
  websiteTrend: {
    key: string;
    label: string;
    pageViews: number;
    visitors: number;
    sessions: number;
  }[];
  popularPages: {
    path: string;
    views: number;
    percent: number;
    visitors: number;
  }[];
  popularVehicles: {
    vehicleId: string;
    title: string;
    coverUrl: string | null;
    detailViews: number;
    whatsappClicks: number;
    quoteDownloads: number;
  }[];
  trafficSources: {
    source: TrafficSource;
    label: string;
    events: number;
    visitors: number;
    percent: number;
  }[];
  devices: {
    device: "mobile" | "desktop" | "tablet" | "other";
    label: string;
    events: number;
    visitors: number;
    percent: number;
  }[];
  geo: {
    available: boolean;
    message: string;
  };
  whatsapp: {
    totalClicks: number;
    uniqueVisitors: number;
    bySource: { source: string; count: number; percent: number }[];
    byContact: { name: string; count: number; percent: number }[];
    vehicleDetail: number;
    cartCheckout: number;
    floatingButton: number;
    contactPage: number;
  };
  cart: {
    addCount: number;
    addVisitors: number;
    viewVisitors: number;
    checkoutVisitors: number;
    conversionRate: number | null;
    avgCartItems: number | null;
    avgCartValue: number | null;
    funnel: { stage: string; visitors: number }[];
  };
  quotes: {
    downloads: number;
    uniqueVisitors: number;
    vehicleCount: number;
    avgPerVehicle: number | null;
    topVehicles: { vehicleId: string; title: string; downloads: number }[];
    trend: { key: string; label: string; count: number }[];
  };
  summaryCards: {
    pageViews: number;
    uniqueVisitors: number;
    whatsappClicks: number;
    cartConversionRate: number | null;
    quoteDownloads: number;
    prevPageViews: number | null;
    prevUniqueVisitors: number | null;
    prevWhatsappClicks: number | null;
    prevCartConversionRate: number | null;
    prevQuoteDownloads: number | null;
  };
  /**
   * Conversion funnel (distinct visitors deduped by anonymous_visitor_id)
   * Home → Vehicle Detail → Cart Add → WhatsApp Click
   */
  funnel: {
    filters: {
      source: TrafficSourceFilter;
      device: "all" | "mobile" | "desktop" | "tablet" | "other";
    };
    homeVisitors: number;
    vehicleDetailVisitors: number;
    cartAddVisitors: number;
    whatsappClickVisitors: number;
    fromPrev: {
      vehicleDetail: number | null;
      cartAdd: number | null;
      whatsappClick: number | null;
    };
    fromHome: {
      vehicleDetail: number | null;
      cartAdd: number | null;
      whatsappClick: number | null;
    };
  };
};

export type RankedItem = {
  name: string;
  count: number;
  percent: number;
};

export type TrendBucket = {
  key: string;
  label: string;
  count: number;
};

export type AssignmentAgentStat = {
  name: string;
  count: number;
  percent: number;
  latestAt: string | null;
};

export type ActivityItem = {
  type: string;
  description: string;
  at: string;
};

export type MetricValue = {
  available: boolean;
  value: number | null;
  message: string | null;
};

export type RankedSection = {
  available: boolean;
  items: RankedItem[];
  error: string | null;
};

export type StatisticsPayload = {
  generatedAt: string;
  timezone: string;
  range: {
    preset: StatisticsRangePreset;
    startIso: string;
    endIso: string;
    startLabel: string;
    endLabel: string;
  };
  inventory: {
    available: boolean;
    total: number;
    onSale: number;
    draft: number;
    sold: number;
    delisted: number;
    featured: number;
    error: string | null;
  };
  period: {
    newVehicles: MetricValue;
    inquiries: MetricValue;
    quotes: MetricValue;
    whatsappAssignments: MetricValue;
    pdfDownloads: MetricValue;
    completedSales: MetricValue;
  };
  statusChart: {
    available: boolean;
    items: { status: VehicleStatus; label: string; count: number }[];
    error: string | null;
  };
  vehicleTrend: {
    available: boolean;
    buckets: TrendBucket[];
    error: string | null;
  };
  breakdowns: {
    brand: RankedSection;
    bodyType: RankedSection;
    year: RankedSection;
    fuel: RankedSection;
    transmission: RankedSection;
  };
  inventoryValue: {
    available: boolean;
    currency: string;
    totalListPrice: number;
    averageListPrice: number | null;
    maxListPrice: number | null;
    minListPrice: number | null;
    vehicleCount: number;
    error: string | null;
  };
  assignments: {
    available: boolean;
    total: number;
    agents: AssignmentAgentStat[];
    balanceLabel: string;
    error: string | null;
  };
  activity: {
    available: boolean;
    items: ActivityItem[];
    error: string | null;
  };
  sources: DataSourceStatus[];
  notEnabled: { name: string; reason: string }[];
  analytics: AnalyticsDashboard;
  vehicleHeat: VehicleHeatDashboard;
};

export type VehicleHeatSort =
  | "heat"
  | "views"
  | "whatsapp"
  | "cart"
  | "quotes"
  | "rate_high"
  | "rate_low";

export type VehicleHeatStatusFilter =
  | "on_sale"
  | "all"
  | "sold"
  | "delisted";

export type VehicleHeatRow = {
  vehicleId: string;
  title: string;
  coverUrl: string | null;
  status: string | null;
  priceLabel: string | null;
  year: number | null;
  brand: string | null;
  model: string | null;
  missing: boolean;
  detailViews: number;
  uniqueViewers: number;
  whatsappClicks: number;
  whatsappVisitors: number;
  cartAdds: number;
  quoteDownloads: number;
  inquiryRate: number | null;
  heatScore: number;
  waSources: { source: string; count: number }[];
};

export type VehicleHeatTrendPoint = {
  key: string;
  label: string;
  views: number;
  uniqueVisitors: number;
  whatsappClicks: number;
  cartAdds: number;
  quoteDownloads: number;
};

export type VehicleHeatDashboard = {
  available: boolean;
  empty: boolean;
  error: string | null;
  leaders: {
    mostViews: VehicleHeatRow | null;
    mostWhatsapp: VehicleHeatRow | null;
    mostCart: VehicleHeatRow | null;
    mostQuotes: VehicleHeatRow | null;
  };
  ranking: VehicleHeatRow[];
  highViewLowInquiry: VehicleHeatRow[];
  lowViewHighInquiry: VehicleHeatRow[];
  sampleNote: string | null;
};
