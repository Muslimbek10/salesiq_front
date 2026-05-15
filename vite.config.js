import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          query: ['@tanstack/react-query'],
          utils: ['axios', 'date-fns', 'clsx', 'lucide-react'],
        },
      },
    },
  },

  server: {
    host: '0.0.0.0',
    port: 3000,

    proxy: {
      '/api': {
        target: 'https://salesiq-backend.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});