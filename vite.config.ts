import { writeFile } from 'node:fs/promises';
import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';

/** Dev-only: Save Layout writes src/data/desk-layout.json. */
function deskLayoutWritePlugin(): Plugin {
  const dest = resolve(__dirname, 'src/data/desk-layout.json');
  return {
    name: 'desk-layout-write',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev/desk-layout', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        req.on('end', () => {
          void (async () => {
            try {
              const raw = Buffer.concat(chunks).toString('utf8');
              if (raw.length > 200_000) {
                res.statusCode = 413;
                res.end('payload too large');
                return;
              }
              const parsed = JSON.parse(raw) as { version?: number; objects?: unknown };
              if (parsed.version !== 2 || !parsed.objects || typeof parsed.objects !== 'object') {
                res.statusCode = 400;
                res.end('invalid layout');
                return;
              }
              await writeFile(dest, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, path: 'src/data/desk-layout.json' }));
            } catch (err) {
              res.statusCode = 500;
              res.end(err instanceof Error ? err.message : 'write failed');
            }
          })();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [deskLayoutWritePlugin()],
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
        // Save Layout writes this; watching it would HMR-kick Dev Mode.
        '**/src/data/desk-layout.json',
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
