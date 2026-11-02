module.exports = {
  root: true,
  extends: ["@everypaper/eslint-config"],
  parserOptions: {
    ecmaFeatures: { jsx: true },
    sourceType: "module"
  },
  settings: {
    react: { version: "detect" }
  },
  ignorePatterns: ["dist", "node_modules", "tests/e2e", "playwright-report", "test-results"]
};
