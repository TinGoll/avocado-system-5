// eslint.config.ts
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactX from 'eslint-plugin-react-x';
import unusedImports from 'eslint-plugin-unused-imports';
import vitest from 'eslint-plugin-vitest';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config([
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs['recommended-latest'],
  reactRefresh.configs.vite,

  {
    name: 'custom:base',
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    extends: [prettier, reactX.configs['recommended-typescript']],
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
      prettier: prettierPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'warn',

      // imports
      'unused-imports/no-unused-imports': 'warn',
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          pathGroups: [
            {
              pattern: '@{app,pages,widgets,features,entities,shared}/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],

      'prettier/prettier': [
        'warn',
        {
          endOfLine: 'crlf',
          semi: true,
          singleQuote: true,
        },
      ],
    },
  },

  {
    name: 'custom:tests',
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    plugins: { vitest },
    extends: [vitest.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },

  {
    ignores: ['dist', 'build', 'coverage', 'node_modules', '.eslintcache'],
  },
]);
