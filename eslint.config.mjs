import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import tsparser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error",
    },
  },
  { files: ["**/*.js"], languageOptions: { sourceType: "module" } },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.jsonc"],
    plugins: { json },
    language: "json/jsonc",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.ts"],

    languageOptions: {
      parser: tsparser,
      sourceType: "module",
    },

    rules: {
      ...prettierConfig.rules,
      "no-console": "warn",
      semi: ["error", "always"],
      quotes: ["error", "double"],
      "prettier/prettier": "error",
    },
  },
]);
