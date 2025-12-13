import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Premium AI-themed palette
        ai: {
          primary: "#00ff85", // Neon green
          secondary: "#06b6d4", // Cyan
          accent: "#8b5cf6", // Purple
          pink: "#ec4899",
          blue: "#3b82f6",
          dark: "#0a0a0a",
          darker: "#050505",
          light: "#1a1a1a",
          lighter: "#2a2a2a",
        },
        fpl: {
          purple: "#37003c",
          "purple-light": "#4a0052",
          "purple-dark": "#250029",
          green: "#00ff85",
          "green-dark": "#00cc6a",
          "green-light": "#33ff99",
          black: "#000000",
          white: "#ffffff",
          gray: "#1a1a1a",
          "gray-light": "#2a2a2a",
        },
        neon: {
          green: "#00ff85",
          purple: "#8b5cf6",
          blue: "#3b82f6",
          cyan: "#06b6d4",
          pink: "#ec4899",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-premier": "linear-gradient(135deg, #37003c 0%, #000000 50%, #37003c 100%)",
        "gradient-ai": "linear-gradient(135deg, #00ff85 0%, #06b6d4 50%, #8b5cf6 100%)",
        "gradient-ai-dark": "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)",
        "gradient-neon-green": "linear-gradient(135deg, #00ff85 0%, #00cc6a 100%)",
        "gradient-neon-purple": "linear-gradient(135deg, #8b5cf6 0%, #37003c 100%)",
        "gradient-spectrum": "linear-gradient(90deg, #00ff85 0%, #06b6d4 25%, #3b82f6 50%, #8b5cf6 75%, #ec4899 100%)",
      },
      boxShadow: {
        "neon-green": "0 0 20px rgba(0, 255, 133, 0.5), 0 0 40px rgba(0, 255, 133, 0.3)",
        "neon-purple": "0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)",
        "neon-blue": "0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)",
        "neon-cyan": "0 0 20px rgba(6, 182, 212, 0.5), 0 0 40px rgba(6, 182, 212, 0.3)",
        glow: "0 0 30px rgba(0, 255, 133, 0.4)",
        "glow-purple": "0 0 30px rgba(139, 92, 246, 0.4)",
        "glow-cyan": "0 0 30px rgba(6, 182, 212, 0.4)",
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
        "glass-glow": "0 8px 32px 0 rgba(0, 255, 133, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "fade-in-up": "fadeInUp 0.6s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "slide-left": "slideLeft 0.3s ease-out",
        "slide-right": "slideRight 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "glow-pulse-slow": "glowPulse 3s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        particle: "particle 20s linear infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
        "magnetic": "magnetic 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideLeft: {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        slideRight: {
          "0%": { transform: "translateX(-20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0, 255, 133, 0.5)" },
          "50%": { boxShadow: "0 0 40px rgba(0, 255, 133, 0.8), 0 0 60px rgba(0, 255, 133, 0.4)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        particle: {
          "0%": { transform: "translateY(100vh) translateX(0) rotate(0deg)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { transform: "translateY(-100vh) translateX(100px) rotate(360deg)", opacity: "0" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        magnetic: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      outlineColor: {
        "ai-primary": "#00ff85",
        "ai-secondary": "#06b6d4",
        "ai-accent": "#8b5cf6",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-satoshi)", "system-ui", "sans-serif"],
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "128": "32rem",
      },
    },
  },
  plugins: [],
}
export default config
