"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/types";

/** Syncs <html lang> and Chinese typography class without restructuring the root layout. */
export default function LocaleDocumentSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale === "zh" ? "zh-CN" : locale;
    html.classList.toggle("locale-zh", locale === "zh");
    return () => {
      html.classList.remove("locale-zh");
    };
  }, [locale]);

  return null;
}
