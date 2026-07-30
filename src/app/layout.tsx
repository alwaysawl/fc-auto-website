import { Inter, Playfair_Display, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sc",
  display: "swap",
});

export const metadata = {
  title: "FC Auto Export | International Premium Auto Trading",
  description:
    "FC Auto Export — Your trusted international automobile exporter. Premium pre-owned vehicles from China, shipped worldwide to Africa. Browse inventory, calculate shipping, and get instant quotes on WhatsApp.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${notoSansSc.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
