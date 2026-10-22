import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import site from "./site.config.ts";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    {
      name: "site-config-html",
      transformIndexHtml: (html) =>
        html
          .replaceAll("%SITE_NAME%", site.name)
          .replaceAll("%SITE_EMOJI%", site.emoji)
          .replaceAll("%SITE_TAGLINE%", site.tagline),
    },
  ],
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
