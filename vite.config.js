import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Relative assets support both a domain root and a cPanel subfolder.
export default defineConfig({ base: './', plugins: [react()], server: {
  fs: { deny: ['**/.env', '**/.env.*', '**/*.{crt,pem}', '**/.git/**', '**/.local-api/**', '**/.local-credentials/**', '**/deployment/.private/**', '**/server/private/**'] },
  proxy: { '/api': { target: 'http://127.0.0.1:8173', changeOrigin: false, rewrite: path => path.replace(/^\/api/, '') } },
} });
