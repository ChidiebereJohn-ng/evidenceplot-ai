import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'cloudflare-worker-local-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/')) {
            return next();
          }
          try {
            const { handleApiRequest } = await server.ssrLoadModule('/worker/index.ts');
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const bodyBuffer = Buffer.concat(chunks);
            const url = `http://${req.headers.host || 'localhost:5173'}${req.url}`;
            const request = new Request(url, {
              method: req.method || 'GET',
              headers: req.headers as Record<string, string>,
              body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : bodyBuffer,
            });
            const response: Response = await handleApiRequest(request, {});
            res.statusCode = response.status;
            response.headers.forEach((value, key) => {
              res.setHeader(key, value);
            });
            const text = await response.text();
            res.end(text);
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: {
                  code: 'INTERNAL_ERROR',
                  message: err instanceof Error ? err.message : 'Local API error',
                  retryable: true,
                },
              })
            );
          }
        });
      },
    },
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
