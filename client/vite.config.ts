import { readFileSync } from 'node:fs';
import path from 'path';

import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const isAnalyzeMode = process.argv.includes('analyze');
const { version: appVersion } = JSON.parse(
  readFileSync(new URL('../desktop/package.json', import.meta.url), 'utf8'),
) as { version: string };
const modeArgumentIndex = process.argv.indexOf('--mode');
const buildMode =
  modeArgumentIndex === -1 ? undefined : process.argv[modeArgumentIndex + 1];

// https://vite.dev/config/
export default defineConfig({
  base: buildMode === 'electron' ? './' : '/',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    tsconfigPaths(),
    isAnalyzeMode &&
      visualizer({
        filename: 'dist/bundle-report.html',
        gzipSize: true,
        open: false,
        template: 'treemap',
      }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    entries: ['src/app/setupDayjs.ts'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks:
          buildMode === 'electron'
            ? undefined
            : (id) => {
                if (!id.includes('node_modules')) {
                  return undefined;
                }

                if (/node_modules\/@protobi\/exceljs\//.test(id)) {
                  return 'vendor-excel';
                }

                if (/node_modules\/(react|react-dom|react-router)\//.test(id)) {
                  return 'vendor-react';
                }

                if (
                  /node_modules\/(antd|@ant-design\/icons|@ant-design\/cssinjs)\//.test(
                    id,
                  )
                ) {
                  return 'vendor-antd';
                }

                if (/node_modules\/(rc-|@rc-component\/)/.test(id)) {
                  return 'vendor-rc';
                }

                if (/node_modules\/@emotion\//.test(id)) {
                  return 'vendor-emotion';
                }

                if (
                  /node_modules\/(axios|swr|zustand|immer|es-toolkit)\//.test(
                    id,
                  )
                ) {
                  return 'vendor-data';
                }

                return 'vendor';
              },
      },
    },
  },
});
