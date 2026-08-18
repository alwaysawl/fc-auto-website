export type WhatsAppAssignRequest = {
  sourcePage?: string;
  pageUrl?: string;
  vehicleTitle?: string;
  vehicleYear?: string;
  stockNumber?: string;
  /** Client-side only: appended to the WhatsApp message (not persisted). */
  inquiryNote?: string;
};

export type WhatsAppAssignment = {
  inquiryId: string;
  agentName: string;
  agentRole: string;
  whatsappNumber: string;
};

export type WhatsAppAssignSuccessResponse = {
  success: true;
  assignment: WhatsAppAssignment;
};

export type WhatsAppAssignErrorResponse = {
  success: false;
  error: string;
};

export type WhatsAppMessageContext = {
  agentName: string;
  inquiryId: string;
  sourcePage?: string;
  pageUrl?: string;
  vehicleTitle?: string;
  vehicleYear?: string;
  stockNumber?: string;
  inquiryNote?: string;
};

function cleanOptional(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function buildWhatsAppMessage(context: WhatsAppMessageContext): string {
  const agentName = cleanOptional(context.agentName) ?? "Sales Consultant";
  const inquiryId = cleanOptional(context.inquiryId);
  const pageUrl = cleanOptional(context.pageUrl);
  const sourcePage = cleanOptional(context.sourcePage);
  const vehicleTitle = cleanOptional(context.vehicleTitle);
  const vehicleYear = cleanOptional(context.vehicleYear);
  const stockNumber = cleanOptional(context.stockNumber);
  const inquiryNote = cleanOptional(context.inquiryNote);

  const isVehicleInquiry = Boolean(vehicleTitle || vehicleYear || stockNumber);
  const lines: string[] = [];

  lines.push(`Hello ${agentName},`);
  lines.push("");

  if (inquiryNote) {
    lines.push(inquiryNote);
    lines.push("");
    if (vehicleTitle && !inquiryNote.includes(vehicleTitle)) {
      lines.push(`Vehicle: ${vehicleTitle}`);
    }
    if (inquiryId) lines.push(`Inquiry ID: ${inquiryId}`);
    if (pageUrl) lines.push(`Page: ${pageUrl}`);
  } else if (isVehicleInquiry) {
    lines.push("I am interested in this vehicle.");
    lines.push("");
    if (vehicleTitle) lines.push(`Vehicle: ${vehicleTitle}`);
    if (vehicleYear) lines.push(`Year: ${vehicleYear}`);
    if (stockNumber) lines.push(`Stock No: ${stockNumber}`);
    if (inquiryId) lines.push(`Inquiry ID: ${inquiryId}`);
    if (pageUrl) lines.push(`Page: ${pageUrl}`);
    lines.push("");
    lines.push("Please send me the best vehicle price and shipping details.");
  } else {
    lines.push("I would like more information about FC Auto Export.");
    lines.push("");
    if (inquiryId) lines.push(`Inquiry ID: ${inquiryId}`);
    if (sourcePage) lines.push(`Source: ${sourcePage}`);
    if (pageUrl) lines.push(`Page: ${pageUrl}`);
  }

  return lines.join("\n").trim();
}

export function buildWhatsAppUrl(whatsappNumber: string, message: string): string {
  const digits = digitsOnly(whatsappNumber);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encodedMessage}`;
}
