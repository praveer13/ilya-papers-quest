/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // shadcn semantic tokens (dark-only site, values set in index.css)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // NINETY PERCENT design tokens (hex, dark-only)
        void: "#07070D",
        abyss: "#0C0C16",
        surface: "#12121F",
        "surface-2": "#1A1A2C",
        line: "#24243A",
        txt: "#E8EAF4",
        "txt-dim": "#9AA1B8",
        "txt-faint": "#5B6178",
        xp: "#FBBF24",
        success: "#34D399",
        danger: "#FB7185",
        focus: "#7DD3FC",
        // track (world) colors
        t1: "#22D3EE",
        t2: "#A78BFA",
        t3: "#4ADE80",
        t4: "#FB923C",
        t5: "#F472B6",
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'ui-sans-serif', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        shell: "1200px",
        prose2: "760px",
        map: "1440px",
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "glow-cyan": "0 0 24px rgba(34, 211, 238, 0.25)",
        "glow-cyan-lg": "0 0 48px rgba(34, 211, 238, 0.35)",
        "glow-xp": "0 0 24px rgba(251, 191, 36, 0.25)",
        "glow-danger": "0 0 24px rgba(251, 113, 133, 0.30)",
      },
      transitionTimingFunction: {
        "expo-out": "cubic-bezier(.22,1,.36,1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        bob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(8px)" },
        },
        breathe: {
          "0%, 100%": { boxShadow: "0 0 24px rgba(34,211,238,0.22)" },
          "50%": { boxShadow: "0 0 48px rgba(34,211,238,0.45)" },
        },
        "node-pulse": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        "scan-shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        ignite: {
          "0%": { transform: "scale(0.8)" },
          "55%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
        "flame-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
        },
        "danger-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        blink: "blink 1.06s step-end infinite",
        bob: "bob 1.6s ease-in-out infinite",
        breathe: "breathe 2.4s ease-in-out infinite",
        "node-pulse": "node-pulse 1.8s ease-out infinite",
        "scan-shimmer": "scan-shimmer 4s linear infinite",
        ignite: "ignite 500ms cubic-bezier(.22,1,.36,1) 1",
        "flame-pulse": "flame-pulse 400ms ease-in-out 2",
        "danger-pulse": "danger-pulse 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
