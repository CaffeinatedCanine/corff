import { defineConfig, globalIgnores } from "eslint/config";

import eslint from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default defineConfig([
  globalIgnores(["node_modules/"]),

  eslint.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "no-var": "warn",
      "prefer-const": "warn",
    },
  },

  // Must be last: turns off any rules that conflict with Prettier.
  prettier,
]);
