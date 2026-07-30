import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand-slate": "#1E293B",
        "accent-yellow": {
          DEFAULT: "#FACC15",
          hover: "#EAB308",
        },
        gold: {
          DEFAULT: "#C9A962",
          light: "#D4BC7D",
          dark: "#A88B3D",
          muted: "#C9A96233",
        },
        charcoal: {
          DEFAULT: "#1A1A1A",
          light: "#2A2A2A",
          dark: "#0D0D0D",
          deeper: "#080808",
        },
        surface: {
          DEFAULT: "#141414",
          elevated: "#1E1E1E",
          card: "#222222",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-noto-sc)",
          "PingFang SC",
          "Microsoft YaHei",
          "system-ui",
          "sans-serif",
        ],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.8s ease-out forwards",
        "fade-in-up": "fadeInUp 0.8s ease-out forwards",
        "fade-in-up-delay": "fadeInUp 0.8s ease-out 0.2s forwards",
        "fade-in-up-delay-2": "fadeInUp 0.8s ease-out 0.4s forwards",
        "shimmer": "shimmer 2.5s ease-in-out infinite",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(201, 169, 98, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(201, 169, 98, 0)" },
        },
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #C9A962 0%, #A88B3D 100%)",
        "dark-gradient": "linear-gradient(180deg, #0D0D0D 0%, #1A1A1A 100%)",
      },
      boxShadow: {
        soft: "0 4px 24px rgba(15, 23, 42, 0.06)",
        "soft-lg": "0 8px 40px rgba(15, 23, 42, 0.1)",
        gold: "0 4px 24px rgba(201, 169, 98, 0.15)",
        "gold-lg": "0 8px 32px rgba(201, 169, 98, 0.2)",
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
        elevated: "0 8px 40px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
