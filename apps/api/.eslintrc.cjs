module.exports = {
  root: true,
  extends: ["@everypaper/eslint-config"],
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 2022
  },
  env: { node: true, es2022: true },
  ignorePatterns: ["dist", "node_modules"]
};
