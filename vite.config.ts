import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['lucide-react', 'embla-carousel-react', 'embla-carousel-autoplay'],
          'vendor-state': ['zustand'],
        },
      },
    },
  },
  server: { port: 3000, host: '0.0.0.0' },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    '__GA_ID__': JSON.stringify(process.env.VITE_GA_ID || ''),
    '__CLARITY_ID__': JSON.stringify(process.env.VITE_CLARITY_ID || ''),
  },
});
