import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '::',
    port: 5188,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '::',
    port: 5188,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    cssMinify: true,
    minify: 'esbuild',
    reportCompressedSize: true,
  },
});
