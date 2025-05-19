import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 只有你的代码真的用到了 fs 再加，否则可以去掉
      // fs: 'browserify-fs',
    },
  },
});
