"use client";

import { useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import {
  openAssignedWhatsApp,
  type OpenAssignedWhatsAppInput,
} from "@/lib/whatsapp-client";

type WhatsAppAssignLinkProps = OpenAssignedWhatsAppInput & {
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  title?: string;
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
      await openAssignedWhatsApp({
        sourcePage,
        pageUrl: pageUrl ?? window.location.href,
        vehicleTitle,
        vehicleYear,
        stockNumber,
        inquiryNote,
      });
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
