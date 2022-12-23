module.exports = {
  extends: ["airbnb-base"],
  parserOptions: {
    project: "./tsconfig.json",
    ecmaVersion: 11,
  },
  env: {
    browser: false,
    es2021: true,
    node: true,
    jest: true,
  },
  rules: {
    quotes: ["error", "double"], // We use double quotes since that has been our standard for a long time.
    "max-len": "off", // Enforcing line length doesn't always make code better to read
  },
  settings: {
    "import/resolver": {
      alias: {
        map: [
          ["@", "./"],
        ],
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
  },
};
