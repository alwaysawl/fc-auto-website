"use client";

import { useCart } from "@/components/CartProvider";

export default function CartToast() {
  const { toast, dismissToast } = useCart();
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-[220] w-[min(92vw,22rem)] -translate-x-1/2 rounded-xl bg-brand-slate text-white px-4 py-3 shadow-elevated text-sm font-medium text-center break-words animate-fade-in-up"
      onClick={dismissToast}
    >
      {toast}
    </div>
  );
}
