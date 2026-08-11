import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    // Don't reopen a browser tab on every Vite restart (OneDrive mtime churn
    // under Documents/ can look like mass file edits and restart the server).
    open: false,
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/test-results/**',
        '**/.playwright-mcp/**',
        '**/scripts/**',
      ],
      // Debounce OneDrive re-touch bursts so we get one reload, not a storm.
      awaitWriteFinish: {
        stabilityThreshold: 800,
        pollInterval: 100,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
