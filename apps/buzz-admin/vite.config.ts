import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@buzz/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 8013, // PORTS.BUZZ_ADMIN 고정
    strictPort: true, // 포트가 사용 중이면 에러 발생 (포트 변경 금지)
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
    },
  },
});