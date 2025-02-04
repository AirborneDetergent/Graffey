import globals from "globals";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["*.js"], languageOptions: {sourceType: "script"}},
  {languageOptions: { globals: globals.browser }},
];