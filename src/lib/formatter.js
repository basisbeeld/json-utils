import { digitRE, objIdentifierRE, validObjectIdentifierDotNotationRE } from "./patterns";

/**
 * Function to create a json path based on lookup paths as string or array in ascending order.
 * The output as string prefers the dot notation and uses square-notation where needed.
 * @param {[string]|string} objectNotations Array with json paths as separate values or string containing the entire path. Array values starting with object notations are corrected.
 * @param {("string"|"array"|"inherit")} [expectedReturnType="inherit"] Indicate what type you want the json path returned. Array is split per key, values do not contain object notation. Inherit option checks the objectNotations type and returns the same type (string, array) as input.
 * @param {Object} [options] Options that can be provided to change the output format.
 * @param {boolean} [options.formatDigitAsNumber=false] Change digits to a numeric value if the return type is set to array.
 * @param {boolean} [options.enforceDotNotation=false] Force the dot notation for libraries that cannot handle other object notations
 * @return {string|[string]} Json path
 */
function formatJsonPath(objectNotations, expectedReturnType = "inherit", options = {}) {
  let arrayOfObjectNotationKeys = objectNotations;
  if (typeof arrayOfObjectNotationKeys === "string") {
    arrayOfObjectNotationKeys = arrayOfObjectNotationKeys.split(objIdentifierRE);
  }
  arrayOfObjectNotationKeys = arrayOfObjectNotationKeys.filter((v) => v !== "").map((path) => {
    if (options.formatDigitAsNumber && path.match(digitRE)) {
      return parseInt(path, 10);
    }
    if (typeof path !== "string") {
      return path.toString(); // Try to convert 'wrong' arrays, like the ones from the immer package who uses numbers.
    }
    return path;
  });
  if (expectedReturnType === "array" || (Array.isArray(objectNotations) && expectedReturnType === "inherit")) {
    return arrayOfObjectNotationKeys;
  }
  // For string output the dot or square notation is added to each key.
  arrayOfObjectNotationKeys = arrayOfObjectNotationKeys.map((path, i) => {
    if (i === 0) {
      // The first item in a path scope does not use dot notation as it's the first element
      return (path.match(digitRE) || !path.match(validObjectIdentifierDotNotationRE)) && options.enforceDotNotation !== true ? `[${path}]` : path;
    }
    return (path.match(digitRE) || !path.match(validObjectIdentifierDotNotationRE)) && options.enforceDotNotation !== true ? `[${path}]` : `.${path}`;
  });

  return arrayOfObjectNotationKeys.join("");
}

export {
  // eslint-disable-next-line import/prefer-default-export
  formatJsonPath,
};
