// @ts-check

/* eslint-disable import/no-extraneous-dependencies */
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import { configs as litConfigs } from "eslint-plugin-lit";
import { configs as wcConfigs } from "eslint-plugin-wc";
import litA11yPlugin from "eslint-plugin-lit-a11y";

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);
const compat = new FlatCompat({
  baseDirectory: _dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default tseslint.config(
  ...compat.extends("airbnb-base"),
  eslintConfigPrettier,
  litConfigs["flat/all"],
  tseslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  wcConfigs["flat/recommended"],
  {
    plugins: {
      "unused-imports": unusedImports,
      "lit-a11y": litA11yPlugin,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        __DEV__: false,
        __DEMO__: false,
        __BUILD__: false,
        __VERSION__: false,
        __STATIC_PATH__: false,
        __SUPERVISOR__: false,
      },

      parser: tseslint.parser,
      ecmaVersion: 2020,
      sourceType: "module",

      parserOptions: {
        ecmaFeatures: {
          modules: true,
        },
        tsconfigRootDir: _dirname,
      },
    },

    settings: {
      "import/resolver": {
        webpack: {
          // Point the resolver to our actual Rspack config location
          config: "./build-scripts/rspack.cjs",
        },
      },
    },

    rules: {
      "class-methods-use-this": "off",
      "new-cap": "off",
      "prefer-template": "off",
      "object-shorthand": "off",
      "func-names": "off",
      "no-underscore-dangle": "off",
      strict: "off",
      "no-plusplus": "off",
      "no-bitwise": "error",
      "comma-dangle": "off",
      "vars-on-top": "off",
      "no-continue": "off",
      "no-param-reassign": "off",
      "no-multi-assign": "off",
      "no-console": "error",
      radix: "off",
      "no-alert": "off",
      "no-nested-ternary": "off",
      "prefer-destructuring": "off",
      "no-restricted-globals": [2, "event"],
      "prefer-promise-reject-errors": "off",
      "import/prefer-default-export": "off",
      "import/no-default-export": "off",
      "import/no-unresolved": "off",
      "import/no-cycle": "off",

      "import/extensions": "off",
      "import/order": "off",

      "no-restricted-syntax": ["error", "LabeledStatement", "WithStatement"],
      "object-curly-newline": "off",
      "default-case": "off",
      "wc/no-self-class": "off",
      eqeqeq: ["error", "always"],
      "no-shadow": "off",
      "arrow-body-style": "off",
      "no-return-await": "off",
      "no-var": "off",
      "no-undef-init": "off",
      "no-useless-escape": "off",
      "no-unsafe-optional-chaining": "off",
      "no-prototype-builtins": "off",
      "array-callback-return": "off",
      "guard-for-in": "off",
      "import/no-mutable-exports": "off",
      "import/no-extraneous-dependencies": "off",
      "@typescript-eslint/camelcase": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-shadow": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/consistent-indexed-object-style": "off",
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/prefer-for-of": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/class-literal-property-style": "off",
      "@typescript-eslint/no-unused-expressions": "off",

      "@typescript-eslint/naming-convention": "off",

      "@typescript-eslint/no-unused-vars": "off",

      "unused-imports/no-unused-imports": "error",
      "lit/attribute-names": "off",
      "lit/attribute-value-entities": "off",
      "lit/no-template-map": "off",
      "lit/no-native-attributes": "off",
      "lit/no-this-assign-in-render": "error",
      "lit/no-template-arrow": "off",
      "lit/quoted-expressions": "off",
      "lit/prefer-nothing": "off",
      "lit-a11y/click-events-have-key-events": ["off"],
      "lit-a11y/no-autofocus": "off",
      "lit-a11y/alt-text": "off",
      "lit-a11y/anchor-is-valid": "error",
      "lit-a11y/role-has-required-aria-attrs": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      camelcase: "off",
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/no-empty-object-type": [
        "error",
        {
          allowInterfaces: "always",
          allowObjectTypes: "always",
        },
      ],
      "no-use-before-define": "off",
    },
  },
  // Special rules for test files
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/test/**/*.ts", "**/tests/**/*.ts"],
    rules: {
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: true,
          optionalDependencies: false,
          peerDependencies: false,
        },
      ],
      // Allow extending prototypes in tests for mocking
      "no-extend-native": "off",
    },
  },
);
