import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15201d",
        panel: "#f7f8f4",
        line: "#d7ded3",
        accent: "#0f766e",
        danger: "#b42318",
        warn: "#b25e09"
      }
    }
  },
  plugins: []
};

export default config;
