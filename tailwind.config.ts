import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/world/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/sonaris/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.25rem",
        lg: "2rem"
      }
    },
    extend: {
      fontSize: {
        'fluid-h1': ['clamp(3rem, 10vw, 7rem)', { lineHeight: '0.8', letterSpacing: '-0.05em' }],
        'large-h1': ['clamp(2.5rem, 8vw, 4.5rem)', { lineHeight: '0.85', letterSpacing: '-0.04em' }],
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        heading: ["var(--font-heading)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        elevated: "rgb(var(--elevated) / <alpha-value>)",
        "elevated-hover": "rgb(var(--elevated-hover) / <alpha-value>)",
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-subtle": "rgb(var(--text) / 0.6)",
        "primary-dim": "rgb(var(--text) / 0.4)",
        accent: "rgb(var(--accent-blue) / <alpha-value>)",
        "accent-blue": "rgb(var(--accent-blue) / <alpha-value>)",
        "accent-orange": "rgb(var(--accent-orange) / <alpha-value>)",
        "accent-violet": "rgb(var(--accent-violet) / <alpha-value>)",
        "accent-green": "rgb(var(--accent-green) / <alpha-value>)",
        "accent-red": "rgb(var(--accent-red) / <alpha-value>)",
        copper: "rgb(var(--copper) / <alpha-value>)",
        "copper-hover": "rgb(var(--copper-hover) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-subtle": "rgb(var(--border-subtle) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)"
      },
      borderRadius: {
        sm: "0.2rem",
        DEFAULT: "0.4rem",
        md: "0.6rem",
        lg: "0.8rem",
        xl: "1rem"
      },
      transitionDuration: {
        200: "200ms",
        400: "400ms"
      },
      keyframes: {
        jump: {
          "15%": { "border-bottom-right-radius": "3px" },
          "25%": { transform: "translateY(9px) rotate(22.5deg)" },
          "50%": {
            transform: "translateY(18px) scale(1, .9) rotate(45deg)",
            "border-bottom-right-radius": "40px"
          },
          "75%": { transform: "translateY(9px) rotate(67.5deg)" },
          "100%": { transform: "translateY(0) rotate(90deg)" }
        },
        shadow: {
          "0%, 100%": { transform: "scale(1, 1)" },
          "50%": { transform: "scale(1.2, 1)" }
        },
        "reverse-spin": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" }
        },
        meteor: {
          "0%": {
            transform: "rotate(var(--angle)) translateX(0)",
            opacity: "1"
          },
          "70%": {
            opacity: "1"
          },
          "100%": {
            transform: "rotate(var(--angle)) translateX(700px)",
            opacity: "0"
          }
        }
      },
      animation: {
        jump: "jump 0.5s linear infinite",
        shadow: "shadow 0.5s linear infinite",
        "reverse-spin": "reverse-spin 3s linear infinite",
        "spin-slow": "spin 6s linear infinite",
        meteor: "meteor 5s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
