import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'vite.config.js', 'vite.config.d.ts'] },
  {
    files: ['src/**/*.{ts,tsx}', 'vite.config.ts'],
    languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module' } },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs['eslint-recommended'].overrides[0].rules,
      ...tsPlugin.configs.recommended.rules,
    },
  },
];
