import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendHost = env.VITE_BACKEND_HOST || '100.67.230.102';
  const backendPort = env.VITE_BACKEND_PORT || '8001';
  const target = env.VITE_BACKEND_TARGET || `http://${backendHost}:${backendPort}`;
  const wsTarget = env.VITE_BACKEND_WS_TARGET || `ws://${backendHost}:${backendPort}`;

  return {
    plugins: [
      tailwindcss(),
      react(),
    ],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/google-places': {
          target: 'https://places.googleapis.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/google-places/, ''),
        },
        '/api': {
          target,
          changeOrigin: true,
        },
        '/ws': {
          target: wsTarget,
          ws: true,
        },
      },
    },
  };
});
