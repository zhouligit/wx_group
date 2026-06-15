import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    // Nginx 反代时 Host 为域名，需放行（Vite 6 默认仅允许 localhost）
    allowedHosts: ['jiaoyou.yikuaikaixin.cn', 'localhost', '127.0.0.1'],
  },
});
