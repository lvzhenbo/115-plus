import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import {
  defineConfigWithVueTs,
  vueTsConfigs,
  configureVueProject,
} from '@vue/eslint-config-typescript';
import prettierConfig from '@vue/eslint-config-prettier';
import parserVue from 'vue-eslint-parser';
import AutoImport from './.eslintrc-auto-import.json' with { type: 'json' };

configureVueProject({
  tsSyntaxInTemplates: true,
  scriptLangs: ['ts', 'tsx'],
});

export default defineConfigWithVueTs(
  pluginVue.configs['flat/recommended'],
  js.configs.recommended,
  vueTsConfigs.recommended,
  {
    name: 'app/vue-files',
    files: ['**/*.vue'],
    languageOptions: {
      parser: parserVue,
      parserOptions: {
        ecmaVersion: 'latest',
      },
    },
  },
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
    languageOptions: {
      globals: {
        ...AutoImport.globals,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'vue/no-v-html': 'off',
    },
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },
  prettierConfig,
);
