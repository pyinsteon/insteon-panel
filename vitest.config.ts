import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^lit\/((?!.*\.js$).*)$/, replacement: "lit/$1.js" },
      {
        find: /^@lit-labs\/observers\/((?!.*\.js$).*)$/,
        replacement: "@lit-labs/observers/$1.js",
      },
      { find: /^@ha\/(.*)$/, replacement: resolve(__dirname, "homeassistant-frontend/src/$1") },
    ],
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts"],
  },
});
