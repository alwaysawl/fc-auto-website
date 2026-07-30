import { redirect } from "next/navigation";
import { defaultLocale } from "@/lib/types";

export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
