import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  build: {
    rollupOptions: {
      // 确保 axios 被正确打包
      external: ['axios']
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      // 如果需要兼容 Node.js 模块，可以使用 polyfill
      fs: 'browserify-fs', // 替换为兼容的浏览器实现
    },
  },
});
