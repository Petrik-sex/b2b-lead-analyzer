import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#080A0F",
        panel: "#10141C",
        line: "#232B38",
        mint: "#62D6A3",
        amber: "#F3B95F"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(98,214,163,.15), 0 24px 80px rgba(0,0,0,.35)"
      }
    }
  },
  plugins: []
};

export default config;
