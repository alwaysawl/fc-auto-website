/**
 * Shared top-information data for Preview + PDF.
 * Three horizontal columns: Seller | Buyer | Invoice Information.
 */

import {
  formatSellerAddressDisplayLines,
  formatSellerCompanyDisplay,
} from "@/lib/proforma/displayFormat";

export type TopInfoPartyField = {
  kind: "party";
  label: string;
  value: string;
  maxLines?: number;
};

export type TopInfoAddressField = {
  kind: "address";
  label: string;
  lines: string[];
};

export type TopInfoMetaField = {
  kind: "meta";
  label: string;
  value: string;
};

export type ProformaTopInformationData = {
  seller: {
    title: string;
    fields: Array<TopInfoPartyField | TopInfoAddressField>;
  };
  buyer: {
    title: string;
    fields: TopInfoPartyField[];
  };
  invoice: {
    title: string;
    fields: TopInfoMetaField[];
  };
};

/** Raw fields needed to build the shared top-info columns. */
export type ProformaTopInformationInput = {
  invoiceNumber: string;
  contractNumber: string;
  offerDate: string;
  validityText: string;
  customerName: string;
  customerCompany: string;
  customerCountry: string;
  customerWhatsapp: string;
  customerEmail: string;
  destinationCountry: string;
  destinationPort: string;
  salespersonName: string;
  salespersonPhone: string;
  salespersonEmail: string;
  companyName: string;
  companyAddress: string;
  companyWebsite: string;
};

function party(
  label: string,
  value: string,
  maxLines?: number
): TopInfoPartyField {
  return {
    kind: "party",
    label,
    value: (value || "").trim() || "—",
    maxLines,
  };
}

function meta(label: string, value: string): TopInfoMetaField {
  return {
    kind: "meta",
    label,
    value: (value || "").trim() || "—",
  };
}

/** Build the three-column top-information model used by Preview and PDF. */
export function buildProformaTopInformation(
  input: ProformaTopInformationInput
): ProformaTopInformationData {
  const website =
    (input.companyWebsite || "").trim() || "fcautoexport.com";
  const dest = [input.destinationCountry, input.destinationPort]
    .filter(Boolean)
    .join(" / ");

  return {
    seller: {
      title: "Seller / 卖方",
      fields: [
        party(
          "Company / 公司",
          formatSellerCompanyDisplay(input.companyName),
          2
        ),
        {
          kind: "address",
          label: "Address / 地址",
          lines: formatSellerAddressDisplayLines(input.companyAddress),
        },
        party("Sales / 销售", input.salespersonName, 1),
        party("Phone / 电话", input.salespersonPhone, 1),
        party("Email / 邮箱", input.salespersonEmail, 1),
        party("Website / 网站", website, 1),
      ],
    },
    buyer: {
      title: "Buyer / 买方",
      fields: [
        party("Customer / 客户", input.customerName, 2),
        party("Company / 公司", input.customerCompany, 2),
        party("Country / 国家", input.customerCountry),
        party("WhatsApp / 电话", input.customerWhatsapp),
        party("Email / 邮箱", input.customerEmail),
        party("Destination Port / 目的港", dest || "—", 2),
      ],
    },
    invoice: {
      title: "Invoice Information / 发票信息",
      fields: [
        // Compact bilingual labels (no padding spaces around "/") so values
        // like PI-/CT- numbers keep full visible width.
        meta("Invoice No./发票号", input.invoiceNumber),
        meta(
          "Contract No./合同号",
          input.contractNumber || input.invoiceNumber
        ),
        meta("Offer Date/报价日期", input.offerDate),
        meta("Validity/有效期", input.validityText || "7 Days"),
        meta("Currency/货币", "USD"),
      ],
    },
  };
}
