"use client";

import { useCart } from "@/components/CartProvider";

export default function CartToast() {
  const { toast, dismissToast } = useCart();
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={dismissToast}
      className="fixed z-[120] rounded-xl bg-brand-slate text-white px-4 py-3 shadow-elevated text-sm font-medium text-center animate-fade-in-up box-border"
      style={{
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100vw - 32px)",
        maxWidth: "420px",
        bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
        wordBreak: "break-word",
        whiteSpace: "normal",
      }}
    >
      {toast}
    </div>
  );
}
