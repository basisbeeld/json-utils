import { createJsonPathScope } from "../path/jsonPath";
import { digitRE } from "../lib/patterns";

/**
 * Function to search through objects or arrays, based on a json path, which returns the first time a 'miss' in the path lookup occurs. The returns contains the successful lookup path and the object when the miss occurred.
 * @param {string} path Json path for object traversal.
 * @param {*} jsonObj The object to traverse.
 * @return {[string, *]} First array item is the successful looked-up path, second item is the object found at the path.
 */
function findAvailablePathAndAttachedObject(path, jsonObj) {
  if (!path) {
    return ["", jsonObj];
  }
  // Convert any path to a normalized json path.
  const pathArray = createJsonPathScope(path, "array");

  // Loop through all (small) json paths in ascending order and when a mismatch is found, trigger the generatePatch function.
  return pathArray.reduce(([validScope, previousObj], lookupScope, index, arr) => {
    if (validScope !== null) {
      // Just forward, we are already finished
      arr.splice(index); // Break reduce loop as fast as possible to reduce cycles.
      return [validScope, previousObj];
    }
    if (typeof previousObj === "object" && previousObj !== null && previousObj[lookupScope] && index + 1 < pathArray.length) {
      // Check if previousObj contained the key, but ignore this statement if we are at the end of the json path, as we do want to return a patch set, even if the value already exists.
      return [null, previousObj[lookupScope]];
    }
    // Either the whole search path was found, and we need to return the last item, or we have the return the current search path
    return typeof previousObj === "object" && previousObj !== null && typeof previousObj[lookupScope] !== "undefined" ? [createJsonPathScope(pathArray.slice(0, index + 1)), previousObj[lookupScope]] : [createJsonPathScope(pathArray.slice(0, index)), previousObj];
  }, [null, jsonObj]);
}

/**
 * Search through any json compatible object structure for the value on a given path.
 * In contradiction to findAvailablePathAndAttachedObject only an exact match will be returned.
 * If no exact match is found the specified default value is returned.
 * If a callback function is defined, the function is called with the path and default value as input.
 * @param {[string]|string} path Json/jsonb/json pointer path
 * @param {*} jsonObj Any json compatible object.
 * @param {Object} [options] Options that can be provided for when a miss occurs.
 * @param {*} [options.defaultValueOnMiss=undefined] Default value that is returned when a miss occurs and defaultValueCallback is not used. Otherwise used as input value for the callback.
 * @param {function} [options.defaultValueCallback] Callback value to call when a miss occurs, return value is directly returned as value. Input is path, defaultValueOnMiss in exact order.
 * @return {*} Either a match or the default value (which is by default set to undefined).
 */
function getValueAtExactPath(path, jsonObj, options = {}) {
  const opts = {
    defaultValueOnMiss: undefined,
    defaultValueCallback: undefined,
    ...options,
  };
  // Could not resolve the path, handling as value not found.
  const returnCallback = () => (typeof opts.defaultValueCallback === "function" ? opts.defaultValueCallback(path, opts.defaultValueOnMiss) : opts.defaultValueOnMiss);

  const resolvedPath = path;
  // TODO: currently if a path equals "$" it is interpreted as a key. Think about a possible solution if required.
  // Check if the path starts with a 'complex' json path
  if (((!Array.isArray(path) && path.startsWith("$.")) || (Array.isArray(path) && path.length > 1 && path[0] === "$"))) {
    // When you entered this if statement a key is requested, so the jsonObj must be type object.
    if (typeof jsonObj !== "object" || jsonObj === null) {
      return returnCallback();
    }
    throw new Error("Sorry but we removed JSONPath as the package is really unmaintained");
  }

  const lookupPath = createJsonPathScope(resolvedPath);
  const [foundPath, foundObj] = findAvailablePathAndAttachedObject(resolvedPath, jsonObj);

  if (lookupPath === foundPath && typeof foundObj !== "undefined") {
    return foundObj;
  }
  return returnCallback();
}

/**
 * Search through any json compatible object structure whether any non-undefined value is set on a given path (exact match).
 * @param {[string]|string} path Json/jsonb/json pointer path
 * @param {*} jsonObj Any json compatible object.
 * @return {boolean} When a value is found at the exact path.
 */
function containsValueAtExactPath(path, jsonObj) {
  const lookupPath = createJsonPathScope(path);
  const [foundPath, foundObj] = findAvailablePathAndAttachedObject(path, jsonObj);
  return lookupPath === foundPath && typeof foundObj !== "undefined";
}

/**
 * Find a combination of key, value or key-value in any type of json compatible object.
 * In case you want to extract the found path, you can use the findAvailablePathAndAttachedObject function.
 * @param {*} jsonObj Any json compatible object.
 * @param {string|boolean|number|null|undefined} value The value you are searching for. If undefined, the value is ignored.
 * @param {string|number|undefined} [key] The key you are searching for. If undefined, the key is ignored.
 * @return {[string]|string|false} False is no match was found, string is one path is found, array of strings if multiple paths were found. Empty path if root object contains key.
 * @param {Object} [options] Options that can be provided for the type/character of the search
 * @param {boolean} [options.stopOnFirstMatch=true] Set the boolean whether the stop of the first match on the provided key-value match.
 */
function findPathBasedOnKeyValue(jsonObj, value, key, options = {}) {
  // Check if there is anything to search for/in.
  if ((typeof value === "undefined" && typeof key === "undefined") || typeof jsonObj === "undefined") {
    return false;
  }

  // Set option defaults.
  const opts = {
    stopOnFirstMatch: true,
    ...options,
  };

  /**
   * Loop through all values of the object/array inserted in the main function, in search of a valid path within the values.
   * @return {[string]|string|false} False is no match was found, string is one path is found, array of strings if multiple paths were found.
   */
  const loopThroughObjectValues = () => {
    const foundResult = Object.entries(jsonObj).reduce((status, [itemKey, item], index, arr) => {
      if (status && opts.stopOnFirstMatch) {
        // We already found a match, abort mission!
        arr.splice(index); // Break reduce loop as fast as possible to reduce cycles.
        return status;
      }
      if (typeof value !== "undefined" && item === value) {
        return [createJsonPathScope(itemKey)];
      }
      let paths = findPathBasedOnKeyValue(item, value, key);
      if (paths === false) {
        return status;
      }
      paths = Array.isArray(paths) ? paths.map((path) => createJsonPathScope(`${itemKey}.${path}`)) : createJsonPathScope(`${itemKey}.${paths}`);
      return status === false ? [paths] : status.concat([paths]);
    }, false);
    // Check if we need to send only one string or an array of strings back.
    return (opts.stopOnFirstMatch && foundResult) || (foundResult && foundResult.length === 1) ? foundResult[0] : foundResult;
  };

  // Check if the provided key is a number.
  const isKeyNumeric = typeof key !== "undefined" ? !!key.toString().match(digitRE) : false;
  if (Array.isArray(jsonObj) && (isKeyNumeric || !key)) {
    // Check if there is an exact match in key and value within the array.
    if (isKeyNumeric && (jsonObj.length - 1) >= parseInt(key, 10) && (typeof value === "undefined" || jsonObj[parseInt(key, 10)] === value)) {
      return ""; // match!
    }
    // We know at this point there is no match on key and value if set, so now we only focus on value.
    return loopThroughObjectValues();
  }
  if (typeof jsonObj === "object" && jsonObj !== null) {
    // Do we have a valid key-value combination?
    if (key && typeof value !== "undefined" && jsonObj[key] === value) {
      return "";
    }
    // Do we have a valid key?
    if (key && typeof value === "undefined" && jsonObj[key]) {
      return "";
    }
    // We know at this point there is no match on key and value if set, so now we only focus on value.
    return loopThroughObjectValues();
  }
  // Does the value match?
  if (jsonObj === value) {
    return "";
  }
  return false;
}

export {
  findAvailablePathAndAttachedObject,
  findPathBasedOnKeyValue,
  containsValueAtExactPath,
  getValueAtExactPath,
};
