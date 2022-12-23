module.exports = (api) => {
  api.cache(true);

  // Presets will run from last to first.
  const presets = [
    [
      "@babel/preset-env",
      {
        modules: process.env.BUILD_ESM === "true" ? false : "auto",
        targets: {
          node: "14",
        },
      },
    ],
  ];

  // Make mocking exported function of the same module much easier
  // See solution 2 of https://medium.com/welldone-software/jest-how-to-mock-a-function-call-inside-a-module-21c05c57a39f
  const env = {
    test: {
      plugins: ["explicit-exports-references"],
    },
  };

  return {
    presets,
    env,
  };
};
