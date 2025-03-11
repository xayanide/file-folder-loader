import globals from "globals";
import eslintPluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import stylisticEslintPlugin from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";
import eslintPluginErasableSyntaxOnly from "eslint-plugin-erasable-syntax-only";

const stylisticConfigPreferences = {
    formatting: {
        rules: {
            /** Commented rules = Turned off by eslint-config-prettier */
            // "@stylistic/no-trailing-spaces": ["error", { skipBlankLines: false, ignoreComments: true }],
            // "@stylistic/arrow-spacing": ["error", { before: true, after: true }],
            // "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: true }],
            // "@stylistic/comma-dangle": ["error", "always-multiline"],
            // "@stylistic/comma-style": ["error", "last"],
            // "@stylistic/no-floating-decimal": "error",
            // "@stylistic/indent": ["error", 4, { SwitchCase: 1, tabLength: 4 }],
            // "@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0, maxBOF: 0 }],
            // "@stylistic/multiline-comment-style": ["error", "bare-block"]
        },
    },
};

const eslintConfigPreferences = {
    formatting: {
        rules: {
            /** Commented rules = Turned off by eslint-config-prettier */
            // "curly": ["error", "all"], "no-inline-comments": "error"
            "arrow-body-style": ["error", "always"],
        },
    },
    codeQuality: {
        rules: {
            "func-style": ["error", "declaration", { overrides: { namedExports: "declaration" } }],
            "no-console": "off",
            "radix": ["error", "always"],
            "no-shadow": ["error", { builtinGlobals: true, ignoreOnInitialization: true }],
            "no-negated-condition": "error",
            "no-unneeded-ternary": ["error", { defaultAssignment: true }],
            "no-nested-ternary": "error",
            "no-var": "error",
            "no-use-before-define": ["error", { functions: false }],
            "prefer-const": ["error"],
            "require-await": "error",
            "strict": ["error", "global"],
            "yoda": "error",
        },
    },
};

const tseslintStrictConfigArr = tseslint.configs.strict;
const tseslintBaseConfig = tseslintStrictConfigArr[0];
const tseslintRecommendedConfig = tseslintStrictConfigArr[1];
const tseslintStrictConfig = tseslintStrictConfigArr[2];

/**
 * @see https://eslint.org/docs/latest/rules
 * @see https://eslint.org/docs/latest/use/configure
 * @type {import('eslint').Linter.Config[]}
 */
export default [
    /** Global config object that applies to both JavaScript and TypeScript files and can be overriden */
    { languageOptions: { globals: { ...globals.node, ...globals.es2025, ...globals.browser } } },
    /** Global config object with rules that applies to both JavaScript and TypeScript files and can be overriden */
    {
        plugins: { "@stylistic": stylisticEslintPlugin },
        rules: {
            ...eslintPluginJs.configs.recommended.rules,
            ...eslintConfigPreferences.formatting.rules,
            ...eslintConfigPreferences.codeQuality.rules,
        },
    },
    /** Global config object that only applies to JavaScript files and can be overriden */
    {
        name: "personal/js/stylistic",
        files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
        rules: {
            ...stylisticConfigPreferences.formatting.rules,
        },
    },
    /** Global config object that only applies to TypeScript files and can be overriden */
    {
        ...tseslintBaseConfig,
        // Override the name from the base config
        name: "personal/ts/strict",
        files: tseslintRecommendedConfig.files,
        rules: {
            ...tseslintRecommendedConfig.rules,
            ...tseslintStrictConfig.rules,
            "no-use-before-define": "off",
            "@typescript-eslint/no-use-before-define": "error",
        },
    },
    /** Global config object that only applies to Test files and can be overriden */
    {
        name: "personal/test",
        languageOptions: { globals: { ...globals.jest } },
        files: ["**/*.spec.*", "**/*.test.*"],
        rules: {
            "no-shadow": "off",
        },
    },
    /** Global config object with rules that may or may not override specific rules to work well with ESLint */
    eslintConfigPrettier,
    eslintPluginErasableSyntaxOnly.configs.recommended,
    /**
     * Global config object with rules I don't want to be overriden no matter what rules are set above
     * https://github.com/prettier/eslint-config-prettier?tab=readme-ov-file#forbid-unnecessary-backticks
     */
    { rules: { "@stylistic/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: false }] } },
    /**
    Global config object with ignores that applies to both JavaScript and TypeScript that I don't want to be overriden
    https://eslint.org/docs/latest/use/configure/configuration-files#globally-ignoring-files-with-ignores
    https://github.com/eslint/eslint/discussions/18304#discussioncomment-9069706
    */
    {
        ignores: [
            "!**/*.ts",
            "!**/*.js",
            "!**/*.cjs",
            "!**/*.mjs",
            "!**/*.mts",
            "!**/*.cts",
            "**/.git",
            "**/node_modules",
            "**/build/**",
            "**/tmp/**",
            "**/temp/**",
            "**/coverage/**",
            "**/logs",
            "**/dist",
            "**/sandbox",
        ],
    },
];
