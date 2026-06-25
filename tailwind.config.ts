import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        moss: "#426b5a",
        persimmon: "#c45f35",
        straw: "#f6c85f",
        paper: "#fbfaf7"
      },
      boxShadow: {
        panel: "0 8px 24px rgba(31, 41, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

