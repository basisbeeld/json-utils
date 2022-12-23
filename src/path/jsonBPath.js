import { jsonBPatternRE, objIdentifierRE } from "../lib/patterns";

/**
 * Check whether a string is a json path written in jsonb notation.
 * @param {string} path Json path
 * @return {boolean} Written in jsonb notation.
 */
function isJsonBPath(path) {
  if (typeof path !== "string") {
    // Something wrong happened, this should not happen so just return.
    throw Error("You provided an invalid path (not string) to isJsonBPath()");
  }
  const firstMatchRegex = path.match(jsonBPatternRE);
  return !!firstMatchRegex;
}

/**
 * Convert a path written in jsonb notation into 'normal' json path notation.
 * @param {string} jsonPath Json path written in jsonb notation.
 * @return {string} Json path with jsonb notation.
 */
function convertJsonPathIntoJsonBPath(jsonPath) {
  // The generatePatchset function returns a 'normal' json jsonPath value. We want to convert this to jsonb notation.
  if (typeof jsonPath !== "string") {
    // Something wrong happened, this should not happen so just return.
    throw Error("You provided an invalid path (not string) to convertJsonPathIntoJsonBPath()");
  }
  if (isJsonBPath(jsonPath)) {
    return jsonPath;
  }
  const firstMatchRegex = jsonPath.match(objIdentifierRE);
  if (!firstMatchRegex) {
    // Json path is to simple, we don't need to do anything.
    return jsonPath;
  }
  // Check whether we need to replace a dot with ":" or need to prepend ":" to the found character.
  return firstMatchRegex[0] === "." ? jsonPath.replace(firstMatchRegex[0], ":") : jsonPath.replace(firstMatchRegex[0], `:${firstMatchRegex[0]}`);
}

export {
  isJsonBPath,
  convertJsonPathIntoJsonBPath,
};
