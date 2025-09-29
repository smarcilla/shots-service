// eslint.config.mjs
import simpleImportSort from "eslint-plugin-simple-import-sort";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  // 1) Ignorar build, dependencias y configs JS/CJS/MJS
  {
    ignores: [
      "dist",
      "node_modules",
      "eslint.config.mjs",
      "prettier.config.cjs",
      "**/*.config.js",
      "**/*.config.cjs",
      "**/*.config.mjs",
      "**/vite.config.*",
      "**/vitest.config.*",
      "**/jest.config.*",
    ],
  },

  // 2) Reglas TS con tipado SOLO para *.ts
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.ts"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.dev.json"],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "no-console": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },

  // 3) Para JS/CJS/MJS forzamos base sin parser TS (evita que se cuele)
  {
    files: ["**/*.{js,cjs,mjs}"],
    plugins: {},
    rules: {},
  },
];
