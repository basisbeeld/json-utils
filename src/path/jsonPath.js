import { jsonBPatternRE } from "../lib/patterns";
import { isJsonPointerPath } from "./jsonPointerPath";
import { isJsonBPath } from "./jsonBPath";
import { formatJsonPath } from "../lib/formatter";

/**
 * Convert a json pointer path into json path notation with initial immer variant support
 * Important note: the special '-' sign for a new item within an array is currently not supported by the patch utils.
 * @param {[string]|string} jsonPointerPath Json pointer path
 * @return {string} Json path.
 */
function convertJsonPointerPathIntoJsonPath(jsonPointerPath) {
  if (typeof jsonPointerPath !== "string" && !Array.isArray(jsonPointerPath)) {
    // Something wrong happened, this should not happen so just return.
    throw Error("You provided an invalid path (not string) to convertJsonPointerPathIntoJsonPath()");
  }
  const pointer = Array.isArray(jsonPointerPath) ? `/${jsonPointerPath.join("/")}` : jsonPointerPath;
  if (!isJsonPointerPath(pointer)) {
    // No json pointer path
    return pointer;
  }
  // First the json pointer path is converted in a normalized json path by replacing all / characters with square bracket notation.
  // Then the encoded characters of / and ~ are decoded in the correct order.
  // As last item the json path formatter is placed over the values, in order to change unnecessarily square brackets into dot notation.
  return formatJsonPath(pointer.replaceAll("/", "][").substring(1).replaceAll("~1", "/").replaceAll("~0", "~"));
}

/**
 * Convert a path into json path notation.
 * @param {string} jsonBPath Json path
 * @return {string} Json path without jsonb notation.
 */
function convertJsonBPathIntoJsonPath(jsonBPath) {
  // The generatePatchset function returns a 'normal' json jsonPath value. We want to convert this to jsonb notation.
  if (typeof jsonBPath !== "string") {
    // Something wrong happened, this should not happen so just return.
    throw Error("You provided an invalid path (not string) to convertJsonBPathIntoJsonPath()");
  }
  if (!isJsonBPath(jsonBPath)) {
    // No jsonb path or path is too simple to contain jsonb characters.
    return jsonBPath;
  }
  const firstMatchRegex = jsonBPath.match(jsonBPatternRE);
  return formatJsonPath(firstMatchRegex[1] === ":" ? jsonBPath.replace(firstMatchRegex[1], ".") : jsonBPath.replace(firstMatchRegex[1], firstMatchRegex[1].replace(":", "")));
}

/**
 * Function to create a json path based on lookup paths as string or array in ascending order. Accepts jsonb and json pointers paths as well.
 * The output as string (default) prefers the dot notation and uses square-notation where needed.
 * @param {[string]|string} objectNotations Array with json paths as separate values or string containing the entire path. Array values starting with object notations are corrected.
 * @param {("string"|"array"|"inherit")} [expectedReturnType="string"] Indicate what type you want the json path returned. Array is split per key, values are not notated. Inherit option checks the objectNotations type and returns the same type as input.
 * @param {Object} [options] Options that can be provided to change the output format.
 * @param {boolean} [options.formatDigitAsNumber=false] Change digits to a numeric value if the return type is set to array.
 * @param {boolean} [options.enforceDotNotation=false] Force the dot notation for libraries that cannot handle other object notations
 * @return {string|[string]} Json path
 */
function createJsonPathScope(objectNotations, expectedReturnType = "string", options = {}) {
  let arrayOfObjectNotationKeys = objectNotations;
  let expectedReturnTypeFormat = expectedReturnType;
  if (expectedReturnType === "inherit") {
    expectedReturnTypeFormat = Array.isArray(objectNotations) ? "array" : "string";
  }
  if (typeof arrayOfObjectNotationKeys === "string") {
    if (arrayOfObjectNotationKeys.startsWith("$.")) {
      return arrayOfObjectNotationKeys; // Currently, do not alter complex search paths.
    } if (isJsonBPath(arrayOfObjectNotationKeys)) {
      arrayOfObjectNotationKeys = convertJsonBPathIntoJsonPath(arrayOfObjectNotationKeys);
    } else if (isJsonPointerPath(arrayOfObjectNotationKeys)) {
      arrayOfObjectNotationKeys = convertJsonPointerPathIntoJsonPath(arrayOfObjectNotationKeys);
    }
  }
  return formatJsonPath(arrayOfObjectNotationKeys, expectedReturnTypeFormat, options);
}

export {
  createJsonPathScope,
  convertJsonBPathIntoJsonPath,
  convertJsonPointerPathIntoJsonPath,
};
