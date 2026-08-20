import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ruoli chart/chrome dal palette validato (dataviz skill), colonna dark.
        surface: {
          chart: "#1a1a19",
          page: "#0d0d0d",
        },
        ink: {
          primary: "#ffffff",
          secondary: "#c3c2b7",
          muted: "#898781",
        },
        line: {
          grid: "#2c2c2a",
          axis: "#383835",
          border: "rgba(255,255,255,0.10)",
        },
        status: {
          good: "#0ca30c",
          warning: "#fab219",
          serious: "#ec835a",
          critical: "#d03b3b",
        },
        // Ordine categorico fisso (7 slot usati su 8) per gli asset tag.
        cat: {
          1: "#3987e5", // GOLD
          2: "#d95926", // USD
          3: "#199e70", // US_YIELDS
          4: "#c98500", // EQUITIES
          5: "#d55181", // OIL
          6: "#008300", // CRYPTO
          7: "#9085e9", // RATES_GLOBAL
        },
        // Solo per branding/logo, mai per encoding dati.
        brand: {
          gold: "#d4af6a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -8px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
