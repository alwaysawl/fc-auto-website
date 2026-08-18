import type { Locale } from "@/lib/types";

export type VehicleQuoteCopy = {
  companyName: string;
  tagline: string;
  website: string;
  websiteUrl: string;
  whatsapp: string;
  quotationTitle: string;
  stockId: string;
  availability: string;
  fobChina: string;
  quoteDate: string;
  freightNotIncluded: string;
  vehicleInformation: string;
  vehicleImages: string;
  pageOf: string; // "Page {page} of {pages}"
  disclaimerTitle: string;
  disclaimerBody: string[];
  quotationContact: string;
  assignedContact: string;
  whatsappLabel: string;
  qrCodeLabel: string;
  scanQrHint: string;
  fieldLabels: {
    brand: string;
    model: string;
    year: string;
    mileage: string;
    fuel: string;
    transmission: string;
    driveType: string;
    bodyType: string;
    steering: string;
    engine: string;
    engineCapacity: string;
    exteriorColor: string;
    stockId: string;
    status: string;
    fobChina: string;
    exportPort: string;
    seats: string;
    description: string;
    features: string;
  };
};

const WEBSITE = "fcautoexport.com";
const WEBSITE_URL = "https://fcautoexport.com";
const WHATSAPP_DISPLAY = "+86 16676364929";

export function getVehicleQuoteCopy(locale: Locale): VehicleQuoteCopy {
  if (locale === "zh") {
    return {
      companyName: "FC Auto Export",
      tagline: "Premium Used Cars for Africa",
      website: WEBSITE,
      websiteUrl: WEBSITE_URL,
      whatsapp: WHATSAPP_DISPLAY,
      quotationTitle: "车辆报价单",
      stockId: "库存编号",
      availability: "库存状态",
      fobChina: "车辆价格",
      quoteDate: "报价生成日期",
      freightNotIncluded:
        "本报价不含海运费，除非另行明确列明。",
      vehicleInformation: "车辆信息",
      vehicleImages: "车辆图片",
      pageOf: "第 {page} 页，共 {pages} 页",
      disclaimerTitle: "报价说明",
      disclaimerBody: [
        "本报价单由网站根据当前车辆信息自动生成。车辆状态、价格、库存情况及相关资料可能发生变化。",
        "所列价格为中国港口车辆价格，不包含海运费、保险、目的港费用、进口关税及当地清关费用。",
        "最终车辆价格、车辆状况、运输方案、装柜数量、船期及实际运费，请以 FC Auto Export 客服确认结果为准。",
      ],
      quotationContact: "报价联系人",
      assignedContact: "指定联系人",
      whatsappLabel: "WhatsApp",
      qrCodeLabel: "二维码",
      scanQrHint: "扫描二维码，通过 WhatsApp 联系我们",
      fieldLabels: {
        brand: "品牌",
        model: "车型",
        year: "年份",
        mileage: "里程",
        fuel: "燃料类型",
        transmission: "变速箱",
        driveType: "驱动方式",
        bodyType: "车身类型",
        steering: "方向盘位置",
        engine: "发动机",
        engineCapacity: "排量",
        exteriorColor: "车身颜色",
        stockId: "库存编号",
        status: "车辆状态",
        fobChina: "车辆价格",
        exportPort: "出口港口",
        seats: "座位数",
        description: "车辆描述",
        features: "配置亮点",
      },
    };
  }

  if (locale === "fr") {
    return {
      companyName: "FC Auto Export",
      tagline: "Premium Used Cars for Africa",
      website: WEBSITE,
      websiteUrl: WEBSITE_URL,
      whatsapp: WHATSAPP_DISPLAY,
      quotationTitle: "Devis du véhicule",
      stockId: "N° de stock",
      availability: "Disponibilité",
      fobChina: "Prix du véhicule",
      quoteDate: "Date du devis",
      freightNotIncluded:
        "Le fret n'est pas inclus, sauf indication contraire.",
      vehicleInformation: "Informations sur le véhicule",
      vehicleImages: "Photos du véhicule",
      pageOf: "Page {page} sur {pages}",
      disclaimerTitle: "Avis concernant le devis",
      disclaimerBody: [
        "Ce devis est généré automatiquement à partir des informations actuelles du véhicule publiées sur le site. L'état, le prix, la disponibilité et les informations associées au véhicule peuvent être modifiés.",
        "Le prix indiqué correspond au prix du véhicule dans un port chinois. Il n'inclut pas le fret maritime, l'assurance, les frais au port de destination, les droits d'importation ni les frais locaux de dédouanement.",
        "Le prix final du véhicule, son état, l'organisation du transport, le nombre de véhicules par conteneur, le calendrier du navire et le coût réel du fret doivent être confirmés par FC Auto Export.",
      ],
      quotationContact: "Contact pour le devis",
      assignedContact: "Contact assigné",
      whatsappLabel: "WhatsApp",
      qrCodeLabel: "Code QR",
      scanQrHint: "Scannez pour nous contacter sur WhatsApp",
      fieldLabels: {
        brand: "Marque",
        model: "Modèle",
        year: "Année",
        mileage: "Kilométrage",
        fuel: "Carburant",
        transmission: "Transmission",
        driveType: "Type de transmission",
        bodyType: "Type de carrosserie",
        steering: "Position du volant",
        engine: "Moteur",
        engineCapacity: "Cylindrée",
        exteriorColor: "Couleur extérieure",
        stockId: "N° de stock",
        status: "Statut",
        fobChina: "Prix du véhicule",
        exportPort: "Port d'exportation",
        seats: "Places",
        description: "Description",
        features: "Équipements",
      },
    };
  }

  return {
    companyName: "FC Auto Export",
    tagline: "Premium Used Cars for Africa",
    website: WEBSITE,
    websiteUrl: WEBSITE_URL,
    whatsapp: WHATSAPP_DISPLAY,
    quotationTitle: "Vehicle Quotation",
    stockId: "Stock ID",
    availability: "Availability",
    fobChina: "Vehicle Price",
    quoteDate: "Quote date",
    freightNotIncluded:
      "Freight is not included unless specifically shown.",
    vehicleInformation: "Vehicle Information",
    vehicleImages: "Vehicle Images",
    pageOf: "Page {page} of {pages}",
    disclaimerTitle: "Quotation Notice",
    disclaimerBody: [
      "This quotation is automatically generated from the current vehicle information on the website. Vehicle condition, price, availability and related information may change.",
      "The listed price is the vehicle price at a China port. It does not include ocean freight, insurance, destination port charges, import duties or local customs-clearance costs.",
      "The final vehicle price, vehicle condition, shipping arrangement, container loading quantity, vessel schedule and actual freight are subject to confirmation by FC Auto Export.",
    ],
    quotationContact: "Quotation Contact",
    assignedContact: "Assigned Contact",
    whatsappLabel: "WhatsApp",
    qrCodeLabel: "QR Code",
    scanQrHint: "Scan to contact us on WhatsApp",
    fieldLabels: {
      brand: "Brand",
      model: "Model",
      year: "Year",
      mileage: "Mileage",
      fuel: "Fuel type",
      transmission: "Transmission",
      driveType: "Drive type",
      bodyType: "Body type",
      steering: "Steering position",
      engine: "Engine",
      engineCapacity: "Engine capacity",
      exteriorColor: "Exterior color",
      stockId: "Stock ID",
      status: "Vehicle status",
      fobChina: "Vehicle Price",
      exportPort: "Export port",
      seats: "Seats",
      description: "Description",
      features: "Features",
    },
  };
}
