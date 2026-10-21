import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin API calls in dev: the auth cookies stay first-party.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
