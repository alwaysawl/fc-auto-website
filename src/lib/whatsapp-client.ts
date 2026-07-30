"use client";

import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  type WhatsAppAssignRequest,
  type WhatsAppAssignSuccessResponse,
  type WhatsAppAssignErrorResponse,
} from "@/lib/whatsapp";
import { WHATSAPP_URL } from "@/lib/types";

export type OpenAssignedWhatsAppInput = WhatsAppAssignRequest;

function fallbackOpen(input: OpenAssignedWhatsAppInput) {
  const message = buildWhatsAppMessage({
    agentName: "FC Auto Export",
    inquiryId: "",
    sourcePage: input.sourcePage,
    pageUrl: input.pageUrl,
    vehicleTitle: input.vehicleTitle,
    vehicleYear: input.vehicleYear,
    stockNumber: input.stockNumber,
  });
  const url = `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function openAssignedWhatsApp(
  input: OpenAssignedWhatsAppInput
): Promise<boolean> {
  const payload: WhatsAppAssignRequest = {
    sourcePage: input.sourcePage,
    pageUrl: input.pageUrl ?? (typeof window !== "undefined" ? window.location.href : undefined),
    vehicleTitle: input.vehicleTitle,
    vehicleYear: input.vehicleYear,
    stockNumber: input.stockNumber,
  };

  try {
    const response = await fetch("/api/whatsapp/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as
      | WhatsAppAssignSuccessResponse
      | WhatsAppAssignErrorResponse;

    if (!response.ok || !data.success) {
      console.error(
        "[whatsapp] assignment failed:",
        !data.success ? data.error : response.status
      );
      fallbackOpen(payload);
      return false;
    }

    const message = buildWhatsAppMessage({
      agentName: data.assignment.agentName,
      inquiryId: data.assignment.inquiryId,
      sourcePage: payload.sourcePage,
      pageUrl: payload.pageUrl,
      vehicleTitle: payload.vehicleTitle,
      vehicleYear: payload.vehicleYear,
      stockNumber: payload.stockNumber,
    });

    const url = buildWhatsAppUrl(data.assignment.whatsappNumber, message);
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  } catch (error) {
    console.error(
      "[whatsapp] assignment error:",
      error instanceof Error ? error.message : "unknown"
    );
    fallbackOpen(payload);
    return false;
  }
}
