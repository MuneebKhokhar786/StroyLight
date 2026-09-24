import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/.claude/worktrees/**",
      "**/node_modules/**",
      "**/coverage/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-redeclare": "off",
      "@typescript-eslint/no-redeclare": "off",
      // TS itself catches genuinely undefined identifiers; no-undef doesn't
      // understand ambient/global types (NodeJS.*) and produces false positives.
      "no-undef": "off",
      "react/no-danger": "error",
    },
  },
  {
    // Server-side and tooling code: Node globals.
    files: ["apps/api/**/*.ts", "scripts/**/*.ts", "*.config.{js,ts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Browser code: DOM globals.
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Test files: vitest globals plus whichever runtime they exercise.
    files: ["**/*.test.ts", "**/*.unit.test.ts", "**/*.integration.test.ts"],
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
    },
  },
  prettier,
];
