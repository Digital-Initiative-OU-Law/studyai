import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ou: {
          crimson: "#841617",
          cream: "#FFF0D4",
          surface: "#0A0A0A",
          panel: "#121212",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      animation: {
        "pulse-soft": "pulse 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;