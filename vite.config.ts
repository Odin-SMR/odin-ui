/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/rest_api": {
        target: "https://odin-smr.org",
        changeOrigin: true,
        secure: false
      },
      "/l2": {
        target: "https://odin-smr.org",
        changeOrigin: true,
        secure: true,
        proxyTimeout: 120_000,
        timeout: 120_000
      },
      "/api": {
        target: "https://odin-smr.org",
        changeOrigin: true,
        secure: true,
        configure: proxy => {
          proxy.on("proxyRes", proxyRes => {
            const loc = proxyRes.headers["location"];
            if (typeof loc === "string") {
              // Keep browser on the Vite dev server instead of following origin’s absolute redirect
              proxyRes.headers["location"] = loc.replace(/^https?:\/\/[^/]+/i, "") // strip scheme+host
              .replace(/^\/+/, "/"); // ensure leading slash
            }
            // If the origin sets domain cookies, keep them for localhost
            const cookies = proxyRes.headers["set-cookie"];
            if (Array.isArray(cookies)) {
              proxyRes.headers["set-cookie"] = cookies.map(c => c.replace(/;\s*Domain=[^;]+/i, "; Domain=localhost"));
            }
          });
        }
      }
    }
  },
  test: {
    projects: [{
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        },
        setupFiles: ['.storybook/vitest.setup.ts']
      }
    }]
  }
});