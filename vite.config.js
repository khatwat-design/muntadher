import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'command-center': resolve(__dirname, 'command-center.html'),
        workspace: resolve(__dirname, 'workspace.html'),
        khotawat: resolve(__dirname, 'khotawat.html'),
        jahzeen: resolve(__dirname, 'jahzeen.html'),
        rahal: resolve(__dirname, 'rahal.html'),
        study: resolve(__dirname, 'study.html'),
        'finance-unified': resolve(__dirname, 'finance-unified.html'),
        finance: resolve(__dirname, 'finance.html'),
        analytics: resolve(__dirname, 'analytics.html'),
        login: resolve(__dirname, 'login.html')
      }
    }
  }
});
