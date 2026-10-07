import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), '');
  return {
    plugins: [react()],
    envDir: '..',
    define: {
      __API_ORIGIN__: JSON.stringify(env.API_ORIGIN || ''),
      __PUBLIC_WEB_ORIGIN__: JSON.stringify(env.PUBLIC_WEB_ORIGIN || ''),
      __KAKAO_JS_KEY__: JSON.stringify(env.KAKAO_JS_KEY || ''),
    },
    preview: { port: 5392 },
    server: { port: 5391, strictPort: true, fs: { allow: ['..'] } },
  };
});
