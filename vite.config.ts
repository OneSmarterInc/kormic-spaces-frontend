import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      strictPort: true,
      proxy: {
        '/spaces/': {
          target: env.SPACES_DEV_BACKEND || 'http://localhost:8900',
          changeOrigin: true,
        },
      },
    },
  };
});
