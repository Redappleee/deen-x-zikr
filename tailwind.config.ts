import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f7f2e8",
        surface: "#fffdf8",
        emerald: {
          50: "#e9f8ef",
          100: "#d1f1de",
          500: "#0f9d58",
          700: "#0c7f46",
          900: "#095433"
        },
        gold: {
          200: "#f6dfaa",
          400: "#d4af6a",
          600: "#b58e48"
        },
        dark: {
          900: "#121512",
          800: "#1a221d",
          700: "#243228"
        }
      },
      boxShadow: {
        aura: "0 15px 40px rgba(15, 157, 88, 0.18)",
        card: "0 20px 40px rgba(18, 21, 18, 0.08)"
      },
      backgroundImage: {
        "islamic-pattern":
          "radial-gradient(circle at 1px 1px, rgba(180,142,72,0.15) 1px, transparent 0)"
      },
      fontFamily: {
        sans: ["Poppins", "Segoe UI", "ui-sans-serif", "system-ui"],
        arabic: ["Amiri", "Scheherazade New", "serif"]
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        pulseSoft: "pulseSoft 3s ease-in-out infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.8" },
          "50%": { opacity: "1" }
        }
      }
    }
  },
  plugins: []
};

export default config;
