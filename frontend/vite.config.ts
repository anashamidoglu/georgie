import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendHost = env.VITE_BACKEND_HOST || '100.67.230.102';
  const target = env.VITE_BACKEND_TARGET || `http://${backendHost}:8000`;
  const wsTarget = env.VITE_BACKEND_WS_TARGET || `ws://${backendHost}:8000`;

  return {
    plugins: [
      tailwindcss(),
      react(),
    ],
    server: {
      host: true,
      port: 5173,
      proxy: {
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
