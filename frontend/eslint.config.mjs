import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Project-specific rule overrides to reduce noisy build-blocking errors
  {
    rules: {
      // Allow explicit any in places where types are difficult to infer quickly
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow unescaped entities in JSX where appropriate
      'react/no-unescaped-entities': 'warn'
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
