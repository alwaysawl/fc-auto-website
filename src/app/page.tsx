import { permanentRedirect } from "next/navigation";
import { defaultLocale } from "@/lib/types";

/** Permanent redirect — locale home lives at /en, not apex /. */
export default function RootPage() {
  permanentRedirect(`/${defaultLocale}`);
}
