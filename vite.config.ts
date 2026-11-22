import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs: the build works from any path (GitHub Pages project
  // site, custom domain, or a plain static host) without per-host settings.
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@engine': path.resolve(__dirname, './src/engine'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@store': path.resolve(__dirname, './src/store'),
      '@ui': path.resolve(__dirname, './src/ui'),
    },
  },
  server: {
    port: 3000,
  },
});
