"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/components/CartProvider";

/**
 * Global cart toast — always portaled to document.body so header/card
 * transforms and overflow never clip or skew fixed positioning.
 */
export default function CartToast() {
  const { toast, dismissToast } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !toast) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      onClick={dismissToast}
      className="fixed z-[150] box-border rounded-xl bg-brand-slate text-white px-4 py-3 shadow-elevated text-sm font-medium"
      style={{
        left: 16,
        right: 16,
        width: "auto",
        maxWidth: "none",
        transform: "none",
        bottom: "calc(160px + env(safe-area-inset-bottom, 0px))",
        display: "flex",
        alignItems: "center",
        gap: 12,
        minWidth: 0,
      }}
    >
      <span
        style={{
          minWidth: 0,
          flex: 1,
          whiteSpace: "normal",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {toast}
      </span>
    </div>,
    document.body
  );
}
