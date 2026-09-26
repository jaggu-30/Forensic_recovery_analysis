import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '**/*backup*', 'recoverai_intro_v2/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Vite uses React's automatic JSX runtime; legacy files may still import React.
      'no-unused-vars': ['error', { varsIgnorePattern: '^React$' }],
      // React Three Fiber updates GPU objects imperatively inside frame callbacks.
      'react-hooks/immutability': 'off',
    },
  },
])
