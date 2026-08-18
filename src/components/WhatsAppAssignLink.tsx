"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  openAssignedWhatsApp,
  type OpenAssignedWhatsAppInput,
} from "@/lib/whatsapp-client";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { mapWhatsAppSource } from "@/lib/analytics/types";

type WhatsAppAssignLinkProps = OpenAssignedWhatsAppInput & {
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  title?: string;
  vehicleId?: string;
  cartItemCount?: number;
  countryId?: string;
  portId?: string;
  analyticsMetadata?: Record<string, unknown> | null;
};

export default function WhatsAppAssignLink({
  className,
  children,
  sourcePage,
  pageUrl,
  vehicleTitle,
  vehicleYear,
  stockNumber,
  inquiryNote,
  vehicleId,
  cartItemCount,
  countryId,
  portId,
  analyticsMetadata,
  "aria-label": ariaLabel,
  title,
}: WhatsAppAssignLinkProps) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [busy, setBusy] = useState(false);
  const [lockedSize, setLockedSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (busy) return;

    const el = anchorRef.current;
    if (el) {
      setLockedSize({
        width: el.offsetWidth,
        height: el.offsetHeight,
      });
    }

    setBusy(true);
    try {
      const opened = await openAssignedWhatsApp({
        sourcePage,
        pageUrl: pageUrl ?? window.location.href,
        vehicleTitle,
        vehicleYear,
        stockNumber,
        inquiryNote,
      });

      const page = sourcePage ?? "unknown";
      const inquiryId = opened.inquiryId?.trim() || null;
      const analyticsVehicleId =
        vehicleId?.trim() ||
        (stockNumber && !stockNumber.includes(",") ? stockNumber : null) ||
        null;
      trackAnalyticsEvent("whatsapp_click", {
        vehicleId: analyticsVehicleId,
        cartItemCount: cartItemCount ?? null,
        countryId: countryId ?? null,
        portId: portId ?? null,
        metadata: {
          source: mapWhatsAppSource(page),
          source_page: page.slice(0, 40),
          assigned_contact_name: opened.agentName?.slice(0, 40) ?? null,
          ...(inquiryId ? { inquiry_id: inquiryId.slice(0, 80) } : {}),
          ...(analyticsMetadata ?? {}),
        },
        dedupeKey: `whatsapp_click|${page}|${Date.now()}`,
      });

      if (page.includes("cart")) {
        trackAnalyticsEvent("cart_checkout_click", {
          vehicleId: vehicleId ?? null,
          cartItemCount: cartItemCount ?? null,
          countryId: countryId ?? null,
          portId: portId ?? null,
          metadata: {
            assigned_contact_name: opened.agentName?.slice(0, 40) ?? null,
          },
          dedupeKey: `cart_checkout_click|${Date.now()}`,
        });
      }
    } finally {
      setBusy(false);
      setLockedSize(null);
    }
  }

  const lockStyle: CSSProperties | undefined = lockedSize
    ? {
        width: lockedSize.width,
        height: lockedSize.height,
        boxSizing: "border-box",
        overflow: "hidden",
      }
    : undefined;

  return (
    <a
      ref={anchorRef}
      href="/api/whatsapp/assign"
      onClick={handleClick}
      className={className}
      style={lockStyle}
      aria-label={busy ? "Connecting..." : ariaLabel}
      title={title}
      aria-busy={busy}
      aria-disabled={busy}
      tabIndex={busy ? -1 : undefined}
      rel="noopener noreferrer"
    >
      {busy ? "Connecting..." : children}
    </a>
  );
}
