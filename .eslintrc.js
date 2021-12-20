module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    jest: true,
  },
  extends: ['airbnb', 'prettier', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['import', 'prettier', '@typescript-eslint'],
  ignorePatterns: [
    'dist/*',
    '**/node_modules/*',
    'config-overrides.js',
    '**/temp/*',
  ],
  rules: {
    'dot-notation': 'off',
    'import/extensions': 'off',
    'arrow-body-style': ['error', 'as-needed'],
    quotes: [
      'warn',
      'single',
      {
        avoidEscape: true,
        allowTemplateLiterals: true,
      },
    ],
    'no-restricted-syntax': 'off',
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],
    'no-use-before-define': [
      'error',
      {
        functions: false,
        classes: true,
      },
    ],
    'no-underscore-dangle': [
      'error',
      {
        allow: [
          '_id',
          '__',
          '_locale',
          '__PROD__',
          '__DEV__',
          '__DEBUG__',
          '__TEST__',
        ],
      },
    ],
    'prettier/prettier': [
      'warn',
      {
        endOfLine: 'lf',
      },
    ], // [_, _, { usePrettierrc: true }]: Enables loading of the Prettier configuration file, (default: true)
    'import/first': 'error',
    'import/no-unresolved': 'off',
    'import/no-duplicates': 'error',
    'import/prefer-default-export': 'off',
    'import/order': 'off',
    'import/newline-after-import': 'error',
    camelcase: 'off',
    '@typescript-eslint/camelcase': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/ban-types': [
      'error',
      {
        types: {
          String: false,
          Boolean: false,
          Number: false,
          Symbol: false,
          '{}': false,
          Object: false,
          object: false,
          Function: false,
        },
        extendDefaults: true,
      },
    ],
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
  },
  settings: {
    'import/ignore': [{}],
  },
};
