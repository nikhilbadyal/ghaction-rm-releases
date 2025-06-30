const typescriptEslint = require("@typescript-eslint/eslint-plugin")
const typescriptParser = require("@typescript-eslint/parser")
const prettierPlugin = require("eslint-plugin-prettier")
const githubPlugin = require("eslint-plugin-github")
const unicornPlugin = require("eslint-plugin-unicorn")
const importPlugin = require("eslint-plugin-import")
const sortKeysFixPlugin = require("eslint-plugin-sort-keys-fix")
const prettierConfig = require("eslint-config-prettier")

module.exports = [
  {
    ignores: ["dist/", "node_modules/", "jest.config.ts", "coverage/"]
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        console: "readonly",
        document: "readonly",
        exports: "writable",
        global: "readonly",
        module: "readonly",
        navigator: "readonly",
        process: "readonly",
        require: "readonly",
        window: "readonly"
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        ecmaVersion: 2022,
        project: "tsconfig.eslint.json",
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
      github: githubPlugin,
      import: importPlugin,
      prettier: prettierPlugin,
      "sort-keys-fix": sortKeysFixPlugin,
      unicorn: unicornPlugin
    },
    rules: {
      ...prettierConfig.rules,

      "@typescript-eslint/explicit-module-boundary-types": 0,

      "@typescript-eslint/init-declarations": 0,

      "@typescript-eslint/naming-convention": 0,

      "@typescript-eslint/no-floating-promises": 0,

      "@typescript-eslint/no-unsafe-argument": 0,

      "@typescript-eslint/no-unsafe-assignment": 0,

      "@typescript-eslint/no-unsafe-call": 0,

      "@typescript-eslint/no-unsafe-member-access": 0,

      "@typescript-eslint/no-unsafe-return": 0,

      "@typescript-eslint/prefer-readonly-parameter-types": 0,

      "@typescript-eslint/restrict-template-expressions": 0,

      // Core ESLint rules
      "accessor-pairs": [
        "error",
        { enforceForClassMembers: true, setWithoutGet: true }
      ],

      "array-bracket-spacing": ["error", "never"],

      "array-callback-return": [
        "error",
        {
          allowImplicit: false,
          checkForEach: false
        }
      ],

      "arrow-spacing": ["error", { after: true, before: true }],

      "block-spacing": ["error", "always"],

      "brace-style": ["error", "1tbs", { allowSingleLine: true }],

      camelcase: [
        "error",
        {
          allow: ["^UNSAFE_"],
          ignoreGlobals: true,
          properties: "never"
        }
      ],

      "comma-dangle": [
        "error",
        {
          arrays: "never",
          exports: "never",
          functions: "never",
          imports: "never",
          objects: "never"
        }
      ],

      "comma-spacing": ["error", { after: true, before: false }],

      "comma-style": ["error", "last"],

      "computed-property-spacing": [
        "error",
        "never",
        { enforceForClassMembers: true }
      ],

      "constructor-super": "error",

      curly: ["error", "multi-line"],

      "default-case-last": "error",

      "dot-location": ["error", "property"],

      "dot-notation": ["error", { allowKeywords: true }],

      "eol-last": "error",

      eqeqeq: ["error", "always", { null: "ignore" }],

      "func-call-spacing": ["error", "never"],

      "generator-star-spacing": ["error", { after: true, before: true }],

      "i18n-text/no-en": 0,

      "import/export": "error",
      "import/first": "error",
      "import/no-absolute-path": [
        "error",
        { amd: false, commonjs: true, esmodule: true }
      ],
      "import/no-duplicates": "error",
      "import/no-named-default": "error",

      "import/no-webpack-loader-syntax": "error",

      indent: [
        "error",
        2,
        {
          ArrayExpression: 1,
          CallExpression: { arguments: 1 },
          FunctionDeclaration: { body: 1, parameters: 1 },
          FunctionExpression: { body: 1, parameters: 1 },
          ImportDeclaration: 1,
          MemberExpression: 1,
          ObjectExpression: 1,
          SwitchCase: 1,
          VariableDeclarator: 1,
          flatTernaryExpressions: false,
          ignoreComments: false,
          ignoredNodes: [
            "TemplateLiteral *",
            "JSXElement",
            "JSXElement > *",
            "JSXAttribute",
            "JSXIdentifier",
            "JSXNamespacedName",
            "JSXMemberExpression",
            "JSXSpreadAttribute",
            "JSXExpressionContainer",
            "JSXOpeningElement",
            "JSXClosingElement",
            "JSXFragment",
            "JSXOpeningFragment",
            "JSXClosingFragment",
            "JSXText",
            "JSXEmptyExpression",
            "JSXSpreadChild"
          ],
          offsetTernaryExpressions: true,
          outerIIFEBody: 1
        }
      ],

      "key-spacing": ["error", { afterColon: true, beforeColon: false }],

      "keyword-spacing": ["error", { after: true, before: true }],

      "lines-between-class-members": [
        "error",
        "always",
        { exceptAfterSingleLine: true }
      ],

      "max-params": ["error", { max: 5 }],

      "multiline-ternary": ["error", "always-multiline"],

      "new-cap": [
        "error",
        { capIsNew: false, newIsCap: true, properties: true }
      ],

      "new-parens": "error",

      "no-array-constructor": "error",

      "no-async-promise-executor": "error",

      "no-await-in-loop": 0,

      "no-caller": "error",
      "no-case-declarations": "error",
      "no-class-assign": "error",
      "no-compare-neg-zero": "error",
      "no-cond-assign": "error",
      "no-const-assign": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-control-regex": "error",
      "no-debugger": "error",
      "no-delete-var": "error",
      "no-dupe-args": "error",
      "no-dupe-class-members": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-empty-character-class": "error",
      "no-empty-pattern": "error",
      "no-eval": "error",
      "no-ex-assign": "error",
      "no-extend-native": 0,
      "no-extra-bind": "error",
      "no-extra-boolean-cast": "error",
      "no-extra-parens": ["error", "functions"],
      "no-fallthrough": "error",
      "no-floating-decimal": "error",
      "no-func-assign": "error",
      "no-global-assign": "error",
      "no-implied-eval": "error",
      "no-import-assign": "error",
      "no-invalid-regexp": "error",
      "no-irregular-whitespace": "error",
      "no-iterator": "error",
      "no-labels": ["error", { allowLoop: false, allowSwitch: false }],
      "no-lone-blocks": "error",
      "no-loss-of-precision": "error",
      "no-misleading-character-class": "error",
      "no-mixed-operators": [
        "error",
        {
          allowSamePrecedence: true,
          groups: [
            ["==", "!=", "===", "!==", ">", ">=", "<", "<="],
            ["&&", "||"],
            ["in", "instanceof"]
          ]
        }
      ],
      "no-mixed-spaces-and-tabs": "error",
      "no-multi-spaces": "error",
      "no-multi-str": "error",
      "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
      "no-new": "error",
      "no-new-func": "error",
      "no-new-object": "error",
      "no-new-symbol": "error",
      "no-new-wrappers": "error",
      "no-obj-calls": "error",
      "no-octal": "error",
      "no-octal-escape": "error",
      "no-plusplus": ["error", { allowForLoopAfterthoughts: true }],
      "no-proto": "error",
      "no-prototype-builtins": "error",
      "no-redeclare": ["error", { builtinGlobals: false }],
      "no-regex-spaces": "error",
      "no-return-assign": ["error", "except-parens"],
      "no-self-assign": ["error", { props: true }],
      "no-self-compare": "error",
      "no-sequences": "error",
      "no-shadow-restricted-names": "error",
      "no-sparse-arrays": "error",
      "no-tabs": "error",
      "no-template-curly-in-string": "error",
      "no-this-before-super": "error",
      "no-throw-literal": "error",
      "no-trailing-spaces": "error",
      "no-undef": "error",
      "no-undef-init": "error",

      "no-underscore-dangle": 0,

      "no-unexpected-multiline": "error",

      "no-unmodified-loop-condition": "error",

      "no-unneeded-ternary": ["error", { defaultAssignment: false }],

      "no-unreachable": "error",

      "no-unreachable-loop": "error",

      "no-unsafe-finally": "error",

      "no-unsafe-negation": "error",

      "no-unused-expressions": [
        "error",
        {
          allowShortCircuit: true,
          allowTaggedTemplates: true,
          allowTernary: true
        }
      ],

      "no-unused-vars": [
        "error",
        {
          args: "none",
          caughtErrors: "none",
          ignoreRestSiblings: true,
          vars: "all"
        }
      ],

      "no-use-before-define": [
        "error",
        { classes: false, functions: false, variables: false }
      ],

      "no-useless-backreference": "error",

      "no-useless-call": "error",

      "no-useless-catch": "error",

      "no-useless-computed-key": "error",

      "no-useless-constructor": "error",

      "no-useless-escape": "error",

      "no-useless-rename": "error",

      "no-useless-return": "error",

      "no-var": "warn",

      "no-void": "error",

      "no-whitespace-before-property": "error",

      "no-with": "error",

      "object-curly-newline": ["error", { consistent: true, multiline: true }],

      "object-curly-spacing": ["error", "always"],

      "object-property-newline": [
        "error",
        { allowMultiplePropertiesPerLine: true }
      ],

      "object-shorthand": ["warn", "properties"],
      "one-var": ["error", { initialized: "never" }],
      "operator-linebreak": [
        "error",
        "after",
        { overrides: { ":": "before", "?": "before", "|>": "before" } }
      ],

      "padded-blocks": [
        "error",
        { blocks: "never", classes: "never", switches: "never" }
      ],

      "prefer-const": ["error", { destructuring: "all" }],

      "prefer-promise-reject-errors": "error",

      "prefer-regex-literals": ["error", { disallowRedundantWrapping: true }],

      "quote-props": ["error", "as-needed"],

      quotes: [
        "error",
        "double",
        { allowTemplateLiterals: false, avoidEscape: true }
      ],

      "rest-spread-spacing": ["error", "never"],

      semi: ["error", "never"],

      "semi-spacing": ["error", { after: true, before: false }],

      "sort-imports": 0,

      "sort-keys-fix/sort-keys-fix": "error",

      "space-before-blocks": ["error", "always"],

      "space-in-parens": ["error", "never"],

      "space-infix-ops": "error",

      "space-unary-ops": ["error", { nonwords: false, words: true }],

      "spaced-comment": [
        "error",
        "always",
        {
          block: {
            balanced: true,
            exceptions: ["*"],
            markers: ["*package", "!", ",", ":", "::", "flow-include"]
          },
          line: { markers: ["*package", "!", "/", ",", "="] }
        }
      ],

      "symbol-description": "error",

      "template-curly-spacing": ["error", "never"],

      "template-tag-spacing": ["error", "never"],

      "unicode-bom": ["error", "never"],
      "unicorn/prefer-top-level-await": 0,
      "use-isnan": [
        "error",
        {
          enforceForIndexOf: true,
          enforceForSwitchCase: true
        }
      ],
      "valid-typeof": ["error", { requireStringLiterals: true }],
      "wrap-iife": ["error", "any", { functionPrototypeMethods: true }],
      "yield-star-spacing": ["error", "both"],
      yoda: ["error", "never"]
    }
  },
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        console: "readonly",
        document: "readonly",
        exports: "writable",
        global: "readonly",
        module: "readonly",
        navigator: "readonly",
        process: "readonly",
        require: "readonly",
        window: "readonly"
      },
      sourceType: "module"
    },
    plugins: {
      github: githubPlugin,
      import: importPlugin,
      prettier: prettierPlugin,
      "sort-keys-fix": sortKeysFixPlugin,
      unicorn: unicornPlugin
    },
    rules: {
      ...prettierConfig.rules,
      // Core ESLint rules (same as TypeScript config but without TypeScript-specific rules)
      "accessor-pairs": [
        "error",
        { enforceForClassMembers: true, setWithoutGet: true }
      ],
      "array-bracket-spacing": ["error", "never"],
      "array-callback-return": [
        "error",
        {
          allowImplicit: false,
          checkForEach: false
        }
      ],
      "arrow-spacing": ["error", { after: true, before: true }],
      "block-spacing": ["error", "always"],
      "brace-style": ["error", "1tbs", { allowSingleLine: true }],
      camelcase: [
        "error",
        {
          allow: ["^UNSAFE_"],
          ignoreGlobals: true,
          properties: "never"
        }
      ],
      "comma-dangle": [
        "error",
        {
          arrays: "never",
          exports: "never",
          functions: "never",
          imports: "never",
          objects: "never"
        }
      ],
      "comma-spacing": ["error", { after: true, before: false }],
      "comma-style": ["error", "last"],
      "computed-property-spacing": [
        "error",
        "never",
        { enforceForClassMembers: true }
      ],
      "constructor-super": "error",
      curly: ["error", "multi-line"],
      "default-case-last": "error",
      "dot-location": ["error", "property"],
      "dot-notation": ["error", { allowKeywords: true }],
      "eol-last": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "func-call-spacing": ["error", "never"],
      "generator-star-spacing": ["error", { after: true, before: true }],
      "i18n-text/no-en": 0,
      "import/export": "error",
      "import/first": "error",
      "import/no-absolute-path": [
        "error",
        { amd: false, commonjs: true, esmodule: true }
      ],
      "import/no-duplicates": "error",
      "import/no-named-default": "error",
      "import/no-webpack-loader-syntax": "error",
      indent: [
        "error",
        2,
        {
          ArrayExpression: 1,
          CallExpression: { arguments: 1 },
          FunctionDeclaration: { body: 1, parameters: 1 },
          FunctionExpression: { body: 1, parameters: 1 },
          ImportDeclaration: 1,
          MemberExpression: 1,
          ObjectExpression: 1,
          SwitchCase: 1,
          VariableDeclarator: 1,
          flatTernaryExpressions: false,
          ignoreComments: false,
          ignoredNodes: [
            "TemplateLiteral *",
            "JSXElement",
            "JSXElement > *",
            "JSXAttribute",
            "JSXIdentifier",
            "JSXNamespacedName",
            "JSXMemberExpression",
            "JSXSpreadAttribute",
            "JSXExpressionContainer",
            "JSXOpeningElement",
            "JSXClosingElement",
            "JSXFragment",
            "JSXOpeningFragment",
            "JSXClosingFragment",
            "JSXText",
            "JSXEmptyExpression",
            "JSXSpreadChild"
          ],
          offsetTernaryExpressions: true,
          outerIIFEBody: 1
        }
      ],
      "key-spacing": ["error", { afterColon: true, beforeColon: false }],
      "keyword-spacing": ["error", { after: true, before: true }],
      "lines-between-class-members": [
        "error",
        "always",
        { exceptAfterSingleLine: true }
      ],
      "new-parens": "error",
      "no-array-constructor": "error",
      "no-async-promise-executor": "error",
      "no-caller": "error",
      "no-case-declarations": "error",
      "no-class-assign": "error",
      "no-compare-neg-zero": "error",
      "no-cond-assign": "error",
      "no-const-assign": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-control-regex": "error",
      "no-debugger": "error",
      "no-delete-var": "error",
      "no-dupe-args": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-empty-character-class": "error",
      "no-empty-pattern": "error",
      "no-eval": "error",
      "no-ex-assign": "error",
      "no-extend-native": "error",
      "no-extra-bind": "error",
      "no-extra-boolean-cast": "error",
      "no-extra-parens": ["error", "functions"],
      "no-fallthrough": "error",
      "no-floating-decimal": "error",
      "no-func-assign": "error",
      "no-global-assign": "error",
      "no-implied-eval": "error",
      "no-import-assign": "error",
      "no-invalid-regexp": "error",
      "no-irregular-whitespace": "error",
      "no-iterator": "error",
      "no-labels": ["error", { allowLoop: false, allowSwitch: false }],
      "no-lone-blocks": "error",
      "no-loss-of-precision": "error",
      "no-misleading-character-class": "error",
      "no-mixed-operators": [
        "error",
        {
          allowSamePrecedence: true,
          groups: [
            ["==", "!=", "===", "!==", ">", ">=", "<", "<="],
            ["&&", "||"],
            ["in", "instanceof"]
          ]
        }
      ],
      "no-mixed-spaces-and-tabs": "error",
      "no-multi-spaces": "error",
      "no-multi-str": "error",
      "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
      "no-new": "error",
      "no-new-func": "error",
      "no-new-object": "error",
      "no-new-symbol": "error",
      "no-new-wrappers": "error",
      "no-obj-calls": "error",
      "no-octal": "error",
      "no-octal-escape": "error",
      "no-plusplus": ["error", { allowForLoopAfterthoughts: true }],
      "no-proto": "error",
      "no-prototype-builtins": "error",
      "no-redeclare": ["error", { builtinGlobals: false }],
      "no-regex-spaces": "error",
      "no-return-assign": ["error", "except-parens"],
      "no-self-assign": ["error", { props: true }],
      "no-self-compare": "error",
      "no-sequences": "error",
      "no-shadow-restricted-names": "error",
      "no-sparse-arrays": "error",
      "no-tabs": "error",
      "no-template-curly-in-string": "error",
      "no-this-before-super": "error",
      "no-throw-literal": "error",
      "no-trailing-spaces": "error",
      "no-undef": "error",
      "no-undef-init": "error",
      "no-underscore-dangle": 0,
      "no-unexpected-multiline": "error",
      "no-unmodified-loop-condition": "error",
      "no-unneeded-ternary": ["error", { defaultAssignment: false }],
      "no-unreachable": "error",
      "no-unreachable-loop": "error",
      "no-unsafe-finally": "error",
      "no-unsafe-negation": "error",
      "no-unused-expressions": [
        "error",
        {
          allowShortCircuit: true,
          allowTaggedTemplates: true,
          allowTernary: true
        }
      ],
      "no-unused-vars": [
        "error",
        {
          args: "none",
          caughtErrors: "none",
          ignoreRestSiblings: true,
          vars: "all"
        }
      ],
      "no-use-before-define": [
        "error",
        { classes: false, functions: false, variables: false }
      ],
      "no-useless-backreference": "error",
      "no-useless-call": "error",
      "no-useless-catch": "error",
      "no-useless-computed-key": "error",
      "no-useless-constructor": "error",
      "no-useless-escape": "error",
      "no-useless-rename": "error",
      "no-useless-return": "error",
      "no-var": "warn",
      "no-void": "error",
      "no-whitespace-before-property": "error",
      "no-with": "error",
      "object-curly-newline": ["error", { consistent: true, multiline: true }],
      "object-curly-spacing": ["error", "always"],
      "object-property-newline": [
        "error",
        { allowMultiplePropertiesPerLine: true }
      ],
      "object-shorthand": ["warn", "properties"],
      "one-var": ["error", { initialized: "never" }],
      "operator-linebreak": [
        "error",
        "after",
        { overrides: { ":": "before", "?": "before", "|>": "before" } }
      ],
      "padded-blocks": [
        "error",
        { blocks: "never", classes: "never", switches: "never" }
      ],
      "prefer-const": ["error", { destructuring: "all" }],
      "prefer-promise-reject-errors": "error",
      "prefer-regex-literals": ["error", { disallowRedundantWrapping: true }],
      "quote-props": ["error", "as-needed"],
      quotes: [
        "error",
        "double",
        { allowTemplateLiterals: false, avoidEscape: true }
      ],
      "rest-spread-spacing": ["error", "never"],
      semi: ["error", "never"],
      "semi-spacing": ["error", { after: true, before: false }],
      "sort-imports": 0,
      "sort-keys-fix/sort-keys-fix": "error",
      "space-before-blocks": ["error", "always"],
      "space-in-parens": ["error", "never"],
      "space-infix-ops": "error",
      "space-unary-ops": ["error", { nonwords: false, words: true }],
      "spaced-comment": [
        "error",
        "always",
        {
          block: {
            balanced: true,
            exceptions: ["*"],
            markers: ["*package", "!", ",", ":", "::", "flow-include"]
          },
          line: { markers: ["*package", "!", "/", ",", "="] }
        }
      ],
      "symbol-description": "error",
      "template-curly-spacing": ["error", "never"],
      "template-tag-spacing": ["error", "never"],
      "unicode-bom": ["error", "never"],
      "unicorn/prefer-top-level-await": 0,
      "use-isnan": [
        "error",
        {
          enforceForIndexOf: true,
          enforceForSwitchCase: true
        }
      ],
      "valid-typeof": ["error", { requireStringLiterals: true }],
      "wrap-iife": ["error", "any", { functionPrototypeMethods: true }],
      "yield-star-spacing": ["error", "both"],
      yoda: ["error", "never"]
    }
  }
]
