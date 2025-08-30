import type { Config } from 'tailwindcss'

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ou: { crimson: "#841617", cream: "#FFF0D4", surface: "#0A0A0A", panel: "#121212" }
      },
      boxShadow: { soft: "0 10px 30px rgba(0,0,0,.25)" },
      borderRadius: { xl2: "1.25rem" }
    }
  },
  plugins: []
} satisfies Config

