import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static",
  devToolbar: { enabled: false },
  trailingSlash: "always",
  build: { format: "directory" },
  vite: { plugins: [tailwindcss()], server: { proxy: { "/api/training-signup/": "http://127.0.0.1:8787" } } },
});
