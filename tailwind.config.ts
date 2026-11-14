import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        crema: "#FAF9F6",
        barrio: { DEFAULT: "#EA580C", suave: "#FFF1E8", oscuro: "#C2410C" },
        impulso: { DEFAULT: "#059669", suave: "#E7F6F0", oscuro: "#047857" },
        tinta: "#1F1B16",
        gris: "#6B635A",
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      keyframes: {
        brillo: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".75" } },
        caer: { "0%": { transform: "translateY(-10px) rotate(0)", opacity: "1" }, "100%": { transform: "translateY(90px) rotate(260deg)", opacity: "0" } },
      },
      animation: { brillo: "brillo 1.6s ease-in-out infinite", caer: "caer 1.8s ease-out forwards" },
    },
  },
  plugins: [],
};
export default config;
