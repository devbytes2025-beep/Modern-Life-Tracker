import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env variables based on mode (e.g. .env, .env.production)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    define: {
      // This allows 'process.env.API_KEY' to work in the browser
      // It pulls from VITE_API_KEY if available, or falls back to system API_KEY
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY),
      // Prevent other process.env usage from crashing
      'process.env': {}
    },
    envPrefix: 'VITE_'
  };
});