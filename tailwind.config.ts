import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marquee: {
          bg: "#12131A",       // near-black, slightly blue — theater dark, not pure black
          panel: "#1A1C26",
          line: "#2C2F3D",
          gold: "#E8B04B",     // marquee bulb gold — the signature accent
          goldDim: "#8A6A2A",
          amber: "#D96C3F",    // secondary warm accent for hover/active states
          text: "#EDEBE3",
          textDim: "#9C9CAA",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      letterSpacing: {
        marquee: "0.18em",
      },
      backgroundImage: {
        bulbs:
          "radial-gradient(circle, rgba(232,176,75,0.55) 0%, rgba(232,176,75,0) 70%)",
      },
    },
  },
  plugins: [],
};
export default config;
