/// <reference types='vitest' />
import { createReadStream, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { nxReadySignal } from '@nx/vite/plugins/nx-ready-signal.plugin';

const mediapipeDir = join(import.meta.dirname, 'node_modules/@mediapipe/tasks-vision');
const mediapipeVersion: string = JSON.parse(readFileSync(join(mediapipeDir, 'package.json'), 'utf8')).version;

/**
 * MediaPipe의 ES 모듈용 WASM 로더와 바이너리를 /mediapipe/tasks-vision-<버전>/에서 제공한다.
 * 개발 서버는 node_modules에서 바로 읽고, 빌드는 dist에 내보낸다. Worker는 ES 모듈용 로더만 쓴다 (기획 8.1).
 */
function mediapipeWasm(): Plugin {
  const files = ['vision_wasm_module_internal.js', 'vision_wasm_module_internal.wasm'];
  const base = `mediapipe/tasks-vision-${mediapipeVersion}/`;
  return {
    name: 'smilerider-mediapipe-wasm',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? '';
        const file = path.startsWith(`/${base}`) ? path.slice(base.length + 1) : '';
        if (!files.includes(file)) return next();
        res.setHeader('Content-Type', file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
        createReadStream(join(mediapipeDir, 'wasm', file)).pipe(res);
      });
    },
    generateBundle() {
      for (const file of files) {
        this.emitFile({ type: 'asset', fileName: base + file, source: readFileSync(join(mediapipeDir, 'wasm', file)) });
      }
    },
  };
}

export default defineConfig(() => ({
  root: import.meta.dirname,
  define: {
    __MEDIAPIPE_VERSION__: JSON.stringify(mediapipeVersion),
  },
  cacheDir: '../../node_modules/.vite/apps/game',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [react(), nxReadySignal(), mediapipeWasm()],
  // MediaPipe Worker는 모듈 Worker로 띄우고 WASM 로더를 동적 import한다
  worker: {
    format: 'es' as const,
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: '@smilerider/game',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
