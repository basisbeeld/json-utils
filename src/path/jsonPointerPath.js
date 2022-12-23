import { digitRE, objIdentifierRE } from "../lib/patterns";

/**
 * Check whether a string is a json pointer path, according to RFC 6901 (https://datatracker.ietf.org/doc/html/rfc6901)
 * @param {string} path Path
 * @return {boolean} Written in json patch notation.
 */
function isJsonPointerPath(path) {
  if (typeof path !== "string") {
    // Something wrong happened, this should not happen so just return.
    throw Error("You provided an invalid path (not string) to isJsonPointerPath()");
  }
  // json pointers must starts with a '/', no exceptions
  const firstMatchRegex = path.startsWith("/");
  return !!firstMatchRegex;
}

/**
 * Convert a json path into json pointer notation. Does NOT perform any reverse-lookup magic to cast array index numbers into '-' if applicable.
 * If you need that reverse-lookup magic, you can manually find the array index path with getValueAtExactPath and check if array index === latest.
 * @param {[string]|string} jsonPath Json path
 * @param {("string"|"array"|"inherit")} [expectedReturnType="string"] Indicate what type you want the json pointer returned. Array is split per key, values are not notated. Inherit option checks the jsonPath type and returns the same type as input.
 * @param {Object} [options] Options that can be provided to change the output format.
 * @param {boolean} [options.formatDigitAsNumber=false] Change digits to a numeric value if the return type is set to array.
 * @return {[string|number]|string} Json pointer path.
 */
function convertJsonPathIntoJsonPointerPath(jsonPath, expectedReturnType = "string", options = {}) {
  if (typeof jsonPath !== "string" && !Array.isArray(jsonPath)) {
    // Something wrong happened, this should not happen so just return.
    throw Error("You provided an invalid path (not string) to convertJsonPathIntoJsonPointerPath()");
  }
  const returnType = expectedReturnType === "inherit" && Array.isArray(jsonPath) ? "array" : expectedReturnType;
  if (typeof jsonPath === "string" && isJsonPointerPath(jsonPath)) {
    // Is already json pointer path
    return jsonPath;
  }
  let path = jsonPath;
  if (typeof path === "string") {
    path = path.split(objIdentifierRE);
  }
  // Remove obsolete path entries that only pollute our end result
  path = path.filter((v) => v !== ""); // Future support: objects are allowed to have an empty key.
  // Replace the ~ and / characters within the paths.
  const resultAsArray = path.map((key) => {
    if (options.formatDigitAsNumber && returnType === "array" && key.match(digitRE)) {
      return parseInt(key, 10);
    }
    return key.replaceAll("~", "~0").replaceAll("/", "~1");
  });
  if (returnType === "array") {
    return resultAsArray;
  }
  // If it needs to be returned as a string place the / between each path (and as starting character)
  return `/${resultAsArray.join("/")}`;
}

export {
  isJsonPointerPath,
  convertJsonPathIntoJsonPointerPath,
};
