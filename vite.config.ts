import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import monkey, { cdn, util } from 'vite-plugin-monkey';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import { fileURLToPath } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    AutoImport({
      imports: ['vue', util.unimportPreset],
      eslintrc: {
        enabled: true,
      },
    }),
    Components({
      resolvers: [NaiveUiResolver()],
    }),
    monkey({
      entry: 'src/main.ts',
      userscript: {
        icon: 'https://115.com/favicon.ico',
        namespace: 'https://github.com/lvzhenbo/115-plus',
        match: ['https://115.com/*'],
        name: '115+',
        description: '为115网盘添加一些功能',
        connect: ['proapi.115.com', 'v.anxia.com'],
        supportURL: 'https://github.com/lvzhenbo/115-plus/issues',
      },
      build: {
        externalGlobals: {
          vue: cdn.jsdelivr('Vue', 'dist/vue.global.prod.js'),
          xgplayer: cdn.jsdelivr('Player', 'dist/index.min.js'),
          'xgplayer-hls.js': cdn.jsdelivr('HlsJsPlugin', 'dist/index.min.js'),
          'big-integer': cdn.staticfile('bigInt', 'BigInteger.min.js'),
          'crypto-js': cdn.staticfile('CryptoJS', 'crypto-js.min.js'),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
