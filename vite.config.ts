import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['axios'], // 确保 axios 被正确打包
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      // 确保不使用 Node.js 模块
      fs: false,
    },
  },
});
