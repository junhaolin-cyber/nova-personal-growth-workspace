import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./features/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F6F7F9",
        ink: "#17191C",
        muted: "#737982",
        line: "#E3E6EA",
        accent: "#5E5CE6",
      },
      boxShadow: {
        card: "0 10px 30px rgba(24, 31, 45, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
