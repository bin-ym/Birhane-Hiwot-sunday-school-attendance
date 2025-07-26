import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off', // Disable unused vars
      'react/prop-types': 'off', // Disable prop-types (using TypeScript)
      '@typescript-eslint/explicit-mat-boundary-types': 'off', // Allow omitting return types
      'no-console': ['warn', { allow: ['warn', 'error'] }], // Allow console.warn and console.error, warn on console.log
      'react/jsx-key': 'error', // Require keys in JSX
      '@typescript-eslint/no-explicit-any': 'warn', // Warn on 'any' types
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'], // Prefer interfaces
      // 'react/no-unescaped-entities': offset', 
      'react-hooks/exhaustive-deps': 'warn', // Warn on missing hook dependencies
    },
    ignores: [
      'scripts/',
      'node_modules/',
      '.next/',
      'dist/',
      'build/',
    ],
  },
];

export default eslintConfig;