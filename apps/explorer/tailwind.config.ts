import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "var(--t-bg)",
          panel: "var(--t-panel)",
          border: "var(--t-border)",
          text: "var(--t-text)",
          dim: "var(--t-dim)",
          green: "var(--t-green)",
          amber: "var(--t-amber)",
          red: "var(--t-red)",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
