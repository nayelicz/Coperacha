import type { Config } from "tailwindcss";

// Sistema visual: fondo oscuro tipo app bancaria, "hojas" color durazno para listas y formularios,
// y tarjetas neón (sol / lima / cielo) para cada coperacha.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Superficies oscuras
        tinta: "#0B0B0C",
        capa: "#151517",
        capa2: "#1F1F22",
        humo: "#9A968F", // texto secundario sobre oscuro
        // Hojas claras
        papel: "#FAEDE6",
        papel2: "#F3DDD1",
        carbon: "#1B1714", // texto sobre hoja
        ceniza: "#85766C", // texto secundario sobre hoja
        // Marca
        barrio: { DEFAULT: "#FF8A3D", suave: "#FFE1CC", oscuro: "#B04210" },
        impulso: { DEFAULT: "#A6F04A", suave: "#E3F8CC", oscuro: "#3B7209" },
        sol: "#F6E43A",
        cielo: "#8CBFFF",
        // Compatibilidad
        crema: "#FAEDE6",
        gris: "#85766C",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        brillo: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".7" } },
        caer: {
          "0%": { transform: "translateY(-10px) rotate(0)", opacity: "1" },
          "100%": { transform: "translateY(120px) rotate(260deg)", opacity: "0" },
        },
        subir: { "0%": { transform: "translateY(16px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        aparecer: { "0%": { opacity: "0", transform: "scale(.96)" }, "100%": { opacity: "1", transform: "scale(1)" } },
      },
      animation: {
        brillo: "brillo 1.6s ease-in-out infinite",
        caer: "caer 1.8s ease-out forwards",
        subir: "subir .45s cubic-bezier(.2,.8,.2,1) both",
        aparecer: "aparecer .35s cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
