import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server on 5173; proxy /api to the backend on 3000 so the frontend
// can call relative /api paths without CORS fuss.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
