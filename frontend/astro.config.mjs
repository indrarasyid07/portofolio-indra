import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
import { loadEnv } from 'vite';

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const env = loadEnv(mode, process.cwd(), '');
const apiTarget = env.API_INTERNAL_URL ?? 'http://127.0.0.1:8000';

export default defineConfig({
  site: env.SITE_URL ?? 'http://localhost:4321',
  output: 'server',
  adapter: vercel(),
  env: {
    schema: {
      API_INTERNAL_URL: envField.string({ context: 'server', access: 'public', optional: true }),
      AUTH_PROXY_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: {
    server: {
      proxy: {
        '/api/health': {
          target: apiTarget,
          changeOrigin: false,
          rewrite: () => '/health',
        },
        '/api/ready': {
          target: apiTarget,
          changeOrigin: false,
          rewrite: () => '/ready',
        },
      },
    },
  },
});
