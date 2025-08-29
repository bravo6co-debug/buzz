import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: 'Buzz Platform',
        short_name: 'Buzz',
        description: '부산 남구 지역경제 활성화 플랫폼',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.buzz-platform\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../../packages/shared')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // 프로덕션에서는 sourcemap 비활성화
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 프로덕션 빌드에서 console 제거
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-label', '@radix-ui/react-slot'],
          'utils': ['axios', 'clsx', 'tailwind-merge']
        }
      }
    },
    chunkSizeWarningLimit: 600,
    reportCompressedSize: false
  },
  server: {
    port: 8010, // 프로덕션 빌드용 포트 (8000번대 사용)
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'https://api.buzz-platform.com',
        changeOrigin: true,
        secure: true
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});