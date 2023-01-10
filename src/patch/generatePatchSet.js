import { digitRE, objIdentifierRE } from "../lib/patterns";
import { createJsonPathScope } from "../path/jsonPath";
import { convertJsonPathIntoJsonBPath } from "../path/jsonBPath";
import { findAvailablePathAndAttachedObject, getValueAtExactPath } from "./find";

const isPlainObject = (item) => (item && typeof item === "object" && !Array.isArray(item));

/**
 * Merge two objects/arrays (where the first value is being overwritten by the second one).
 * @param {Object} existingItem Previous item being overwritten/patched.
 * @param {Object} newItem The patch value itself
 * @param {Object} [options] Options that can be provided for the conversation, used to handle type mismatches.
 * @param {boolean} [options.keepDataOnForcedTypeCasting=true] Set to true to add 'replaced' types after casting in some way to the newly casted type. Example: filled array casted to object is added as key to object, object casted to array is added at the end of the newly casted and processed array.
 * @param {"none"|"shallow"|"deep"} [options.mergeWithPreviousData="none"] **Experimental, Alpha feature** Set to 'shallow' or 'deep' to merge previous data of object types. Example: if an object {key:value} is being patched to {}, the key-value pair remain.
 * @returns {{addToArrayAfterProcessing: *[], generatedObj}}
 */
function mergeItem(existingItem, newItem, options = {}) {
  const generatedObj = newItem;
  const addToArrayAfterProcessing = [];
  const opts = {
    keepDataOnForcedTypeCasting: true,
    mergeWithPreviousData: "none",
    ...options,
  };
  if (opts.mergeWithPreviousData !== "none") {
    if (Array.isArray(existingItem)) {
      if (Array.isArray(generatedObj)) {
        generatedObj.push(...existingItem);
      } else if (typeof generatedObj === "object" && opts.keepDataOnForcedTypeCasting) {
        Object.assign(generatedObj, existingItem);
      }
    } else if (typeof existingItem === "object" && existingItem !== null) {
      if (Array.isArray(generatedObj) && opts.keepDataOnForcedTypeCasting) {
        addToArrayAfterProcessing.push(existingItem);
      } else if (typeof generatedObj === "object" && !Array.isArray(generatedObj)) {
        if (opts.mergeWithPreviousData === "shallow") {
          Object.assign(generatedObj, {
            ...existingItem,
            ...generatedObj,
          });
        } else {
          // Beta features based on https://scribe.bus-hit.me/how-to-deep-merge-javascript-objects-12a7235f5573
          // More than enough edge cases not covered yet
          Object.entries(existingItem).forEach(([key, value]) => {
            if (isPlainObject(generatedObj[key])) {
              if (!generatedObj[key]) {
                Object.assign(generatedObj, {
                  [key]: {},
                });
              }
              Object.assign(generatedObj[key], mergeItem(value, generatedObj[key], opts).generatedObj);
            } else {
              Object.assign(generatedObj, {
                [key]: value,
              });
            }
          });
        }
      }
    }
  }

  return {
    generatedObj,
    addToArrayAfterProcessing,
  };
}

/**
 * This function creates a root object for the generatePatch function for it's processing. This function tries to preserve as much information from the root object, but might drop information based on the boolean input parameters when it detects a drift in object type. When a drift is detected the input type is converted to the calculated output type where to information loss occurs.
 * @param {*} existingItem Item containing potential information that might need to be casted.
 * @param {string} lookupPath The root lookup path (e.g. the first item of a json path), used to check whether an array or object must be created.
 * @param {boolean} [forceDigitsToBeTypeArray=true] Set to true to force digits to be interpreted as array values, also when the specific existingItem part is set to a different type. When set to false and an object is found, the digit is used as key for the object.
 * @param {boolean} [keepDataOnForcedTypeCasting=true] Set to true to add 'replaced' types of existingItem after casting in some way to the newly casted type. Example: filled array casted to object is added as key to object, object casted to array is added at the end of the newly casted and processed array.
 * @return {{addToArrayAfterProcessing: *[], generatedObj: *[]}} Where generatedObj contains the (converted) root object/array based on the input parameters. addToArrayAfterProcessing contains an array with, if filled, the existingItem. The last part is applicable when type === object and generateObj === array and keepDataOnForcedTypeCasting is set to true, and can be used to add data after processing the newly generated object.
 */
function typeCasting(existingItem, lookupPath, forceDigitsToBeTypeArray = true, keepDataOnForcedTypeCasting = true) {
  const generatedObj = lookupPath.match(digitRE) && (Array.isArray(existingItem) || typeof existingItem === "undefined" || Object.keys(existingItem).length === 0 || forceDigitsToBeTypeArray) ? [] : {};
  return mergeItem(existingItem, generatedObj, {
    keepDataOnForcedTypeCasting,
    mergeWithPreviousData: "shallow",
  });
}

/**
 * Generate the patch value based on a json path, split into an array, where the index failed to perform a lookup.
 * @param {*} existingItem The item being processed by the path lookup where the lookup found a mismatch.
 * @param {[string]} pathArray The lookup path divided into array/object lookup requests in ascending order.
 * @param {number} index The index where the lookup mismatch on the pathArray failed.
 * @param {*} value Any value that must be added at the end of the path range.
 * @param {Object} [opts] Options that can be provided for the conversation, used to handle type mismatches. Check generateCombinedPatchSet documentation for specifics.
 * @return {[string, *]} Where the first item is the patch key, second the patch value.
 */
function generatePatch(existingItem, pathArray, index, value, opts = {}) {
  // Generate the path that needs to be created in the patch object.
  const leftOverPath = pathArray.slice(index);
  // Decide which type will be used as root object.
  const { generatedObj, addToArrayAfterProcessing } = typeCasting(existingItem, leftOverPath[0], opts.forceDigitsToBeTypeArray, opts.keepDataOnForcedTypeCasting);
  // Set the boolean whether the json path needs to be shortened by default to false.
  let shortenTheReturnedJsonPath = false;

  // Go through all keys that must be created, assign the new values directly to the generatedObject.
  leftOverPath.reduce((o, p, i) => {
    const isDigit = p.match(digitRE);
    let key = p;
    if (isDigit) {
      // Key is a pure digit and we prefer to use arrays in those cases (as preferred by the jsonb and json pointer standard)
      key = parseInt(key, 10);
    }
    if (typeof o[key] !== "undefined" && leftOverPath.length === 1) {
      // If the leftOverPath is only one long, it means we do not have to use the generated object as the key is available.
      shortenTheReturnedJsonPath = true;
    }
    if (isDigit) {
      const arraySize = key + 1;
      if (Array.isArray(o) && o.length < arraySize) {
        // The current array in the object is not long enough for our path request, enlarge it.
        o.push(...Array(arraySize - o.length - 1).fill(opts.applyNullAtUndecidedArrayItems === true ? null : undefined));
      }
    }
    // Assign new value to the object and return it so the next lookup request can use it as well.
    // eslint-disable-next-line no-param-reassign
    o[key] = leftOverPath.length === i + 1 ? value : o[key] ?? typeCasting({}, leftOverPath[i + 1], opts.forceDigitsToBeTypeArray, opts.keepDataOnForcedTypeCasting).generatedObj;
    return o[key];
  }, generatedObj);

  if (Array.isArray(generatedObj) && addToArrayAfterProcessing.length > 0) {
    // If an array was generated and the original existingItem was an object, and opts.keepDataOnForcedTypeCasting is set, the addToArrayAfterProcessing array contains the original object so we can add it to the array.
    // This way we preserve the data, although the end result might conflict with a JSON schema.
    generatedObj.push(...addToArrayAfterProcessing);
  }
  // Generate the scope where the root object must be inserted within the provided json path.
  const scope = createJsonPathScope(pathArray.slice(0, shortenTheReturnedJsonPath ? index + 1 : index));
  return [scope, shortenTheReturnedJsonPath ? generatedObj[leftOverPath[0]] : generatedObj];
}

/**
 * Apply a patch on an object, based on the provided path and value as patch.
 * Note: objects as input are by default treated as immutable, unless options are set.
 * Please note that when the JS environment has not implemented structuredClone, a JSON copy is created which it's caveats (e.g. change arrays from undefined to null!).
 * Information about JSON Copy caveats: https://scribe.bus-hit.me/@pmzubar/why-json-parse-json-stringify-is-a-bad-practice-to-clone-an-object-in-javascript-b28ac5e36521
 * @param {*} jsonObj Any object or array.
 * @param {string} path The path on which to replace the specific part of the jsonObj with.
 * @param {*} value Any value that you want to replace at the path of the object.
 * @param {Object} [options] Options that influence how the patch is applied
 * @param {boolean} [options.treatInputAsImmutable=true] True to make a deep copy of the input that is patched, false to change the original object.
 * @return {*} The adjusted object.
 */
function applyPatchOnObject(jsonObj, path, value, options = {}) {
  // If path is undefined or an empty string is provided, we simpy return the value.
  if (!path) {
    return value;
  }
  const opts = {
    treatInputAsImmutable: true,
    ...options,
  };
  // Make a quick copy of the json object, so we do not change the original object.
  let jsonObjCopy = jsonObj;
  if (opts.treatInputAsImmutable === true && typeof jsonObj === "object" && jsonObj !== null) {
    // Do not json parse non-objects, as JSON conversion will for example convert undefined into null.
    // eslint-disable-next-line no-undef
    jsonObjCopy = typeof structuredClone !== "undefined" ? structuredClone(jsonObj) : JSON.parse(JSON.stringify(jsonObj));
  }
  // Get an array of the patch path, so it's easy to split up in last entry and before the last entry.
  const patchPathArray = createJsonPathScope(path, "array");
  // Get the object one path up the requested path, so we can easily replace the value down the road.
  const baseObject = getValueAtExactPath(createJsonPathScope(patchPathArray.slice(0, -1)), jsonObjCopy);
  // Get the 'missing' requested path that is leftover.
  const lookupKey = patchPathArray.slice(-1);
  // Replace the value on the requested path, while keeping the references from the root object to the key.
  baseObject[lookupKey] = value;
  return jsonObjCopy;
}

/**
 * Generate a [key, patch] pair which indicates what changes must be done to a provided object to be able to insert a specific value at a requested path.
 * It generates objects or arrays, based on the keys in the path, that are not in the object when requested.
 * This function can make it easy for a developer to calculate changes that need to be executed on an object to get the object in a requested shape.
 * When chosen for jsonb output the [key, patch] pair can be used for Objection.js to execute on a Postgres instance.
 * For Postgres it's good to know that the patch parameters for this pair are generated based on the current available knowledge of the object to patch.
 * Flush these changes to Postgres as fast as possible to avoid race conditions between multiple patches in the same path.
 * @param {*} jsonObj The item being processed by the path lookup and expected value.
 * @param {string} path The lookup path to calculate the range of the json patch.
 * @param {*} value Any value that must be added at the end of the path range.
 * @param {Object} [options] Options that can be provided for the conversation, used to handle type mismatches.
 * @param {boolean} [options.forceDigitsToBeTypeArray=true] Set to true to force digits to be interpreted as array values, also when the specific jsonObj part is set to a different type. When set to false and an object is found, the digit is used as key for the object. Important note for jsonb output! When set to false, Postgres will not handle these objects properly on updates, as Postgres interprets digits as number, while only string values can be used as lookup key for objects!
 * @param {boolean} [options.keepDataOnForcedTypeCasting=true] Set to true to add 'replaced' types after casting in some way to the newly casted type. Example: filled array casted to object is added as key to object, object casted to array is added at the end of the newly casted and processed array.
 * @param {("json"|"jsonb")} [options.pathAnnotationOutput="json"] The annotation type the json path output must be exported.
 * @param {boolean} [options.applyNullAtUndecidedArrayItems=false] Arrays that are enlarged or (partly) overwritten might contain items without value (undefined). If boolean is set to true, the value is set to null. Recommended setting in case a JSON format or alike is expected as output.
 * @param {"none"|"shallow"|"deep"} [options.mergeWithPreviousData="none"] **Experimental, Alpha feature** Set to 'shallow' to merge previous data of object types. Example: if an object {key:value} is being patched to {}, the key-value pair remain.
 * @return {[string, *]} Where the first item is the patch key and the second item the patch value.
 */
function generatePatchSet(jsonObj, path, value, options) {
  const opts = {
    forceDigitsToBeTypeArray: true,
    keepDataOnForcedTypeCasting: true,
    pathAnnotationOutput: "json",
    applyNullAtUndecidedArrayItems: false,
    mergeWithPreviousData: "none",
    ...options,
  };
  if (!path) {
    if (typeof jsonObj === "object" && jsonObj !== null && typeof value === "object" && value !== null && opts.mergeWithPreviousData !== "none") {
      return ["", mergeItem(jsonObj, value, opts).generatedObj];
    }
    return ["", value];
  }

  // Convert any jsonb path (if applicable) to a normalized json path.
  const lookupPath = createJsonPathScope(path);
  const pathArray = lookupPath.split(objIdentifierRE).filter((v) => v !== "");

  // Loop through all (small) json paths in ascending order and when a mismatch is found, trigger the generatePatch function.
  let result = pathArray.reduce(([validScope, previousObj], lookupScope, index, arr) => {
    if (validScope !== null) {
      // Just forward, we are already finished
      arr.splice(index); // Break reduce loop as fast as possible
      return [validScope, previousObj];
    }
    if (typeof previousObj === "object" && previousObj !== null && previousObj[lookupScope] && index + 1 < pathArray.length) {
      // Check if previousObj contained the key, but ignore this statement if we are at the end of the json path, as we do want to return a patch set, even if the value already exists.
      return [null, previousObj[lookupScope]];
    }
    // Call the function that does the real magic.
    return generatePatch(previousObj, pathArray, index, value, opts);
  }, [null, jsonObj]);

  if (opts.pathAnnotationOutput === "jsonb") {
    result = result.map((item, i) => {
      // The generatePatch function returns a 'normal' json path value. We want to convert this to jsonb notation.
      if (i !== 0) {
        // Only the first item is the json path.
        return item;
      }
      return convertJsonPathIntoJsonBPath(item);
    });
  }

  return result;
}

/**
 * Process and generate one or more [key, patch] pairs that indicates what changes must be done to a provided object to be able to insert a specific value at the requested paths.
 * It generates objects or arrays, based on the keys in the path, that are not in the object when requested.
 * This function can make it easy for a developer to calculate changes that need to be executed on an object to get the object in a requested shape.
 * When chosen for jsonb output the [key, patch] pair can be used for Objection.js to execute on a Postgres instance.
 * For Postgres it's good to know that the patch parameters for this pair are generated based on the current available knowledge of the object to patch.
 * Flush these changes to Postgres as fast as possible to avoid race conditions between multiple patches in the same path.
 * @param {*} originalJsonObj The item being processed by the path lookup and expected value of patchSets.
 * @param {[[string, any, number|undefined]]} patchSets The combinations of [path, value, weight] pairs, where the path represents the lookup path to calculate the range of the json patch, the value is the actual patch and the weight is optional to indicate an order within the patch sets. The higher the weight number, the later the patch is executed. Weight minimum is 0.
 * @param {Object} [options] Options that can be provided for the conversation, used to handle type mismatches.
 * @param {boolean} [options.forceDigitsToBeTypeArray=true] Set to true to force digits to be interpreted as array values, also when the specific jsonObj part is set to a different type. When set to false and an object is found, the digit is used as key for the object. Important note for jsonb output! When set to false, Postgres will not handle these objects properly on updates, as Postgres interprets digits as number, while only string values can be used as lookup key for objects!
 * @param {boolean} [options.keepDataOnForcedTypeCasting=true] Set to true to add 'replaced' types after casting in some way to the newly casted type. Example: filled array casted to object is added as key to object, object casted to array is added at the end of the newly casted and processed array.
 * @param {("json"|"jsonb")} [options.pathAnnotationOutput="json"] The annotation type the json path output must be exported.
 * @param {boolean} [options.treatInputAsImmutable=true] True to make a deep copy of the input that is patched, false to change the original object.
 * @param {boolean} [options.applyNullAtUndecidedArrayItems=false] Arrays that are enlarged or (partly) overwritten might contain items without value (undefined). If boolean is set to true, the value is set to null. Recommended setting in case a JSON format or alike is expected as output.
 * @param {"none"|"shallow"|"deep"} [options.mergeWithPreviousData="none"] **Experimental, Alpha feature** Set to 'shallow' to merge previous data of object types. Example: if an object {key:value} is being patched to {}, the key-value pair remain.
 * @return {[[string, *]]} Double-dimension arrays items where for each sub-array record the first item is the patch key and the second item the patch value.
 */
function generateCombinedPatchSet(originalJsonObj, patchSets, options) {
  const opts = {
    forceDigitsToBeTypeArray: true,
    keepDataOnForcedTypeCasting: true,
    pathAnnotationOutput: "json",
    treatInputAsImmutable: true,
    applyNullAtUndecidedArrayItems: false,
    mergeWithPreviousData: "none",
    ...options,
  };

  // Go through all patchSets and arrange them based on a given weight. If no weight is specified, 0 is being used as default.
  const weightedPathSet = [];
  patchSets.forEach(([path, value, weight = 0]) => {
    // Overwrite any number lower than 0 with 0.
    const dueWeight = Math.max(0, weight);
    if (Array.isArray(weightedPathSet[dueWeight])) {
      weightedPathSet[dueWeight].push([path, value]);
    } else {
      weightedPathSet[dueWeight] = [[path, value]];
    }
  });

  // Sort an array on the paths within it.
  const sortPathArray = (arr) => arr.sort(([firstPath], [secondPath]) => {
    const firstLookupKey = firstPath;
    const secondLookupKey = secondPath;
    if (firstLookupKey < secondLookupKey) {
      return -1;
    }
    if (firstLookupKey > secondLookupKey) {
      return 1;
    }
    // Same lookup key (depending on the scenario, this is most commonly not wanted as during processing the 'last' sorted item is the 'winner'). This function cannot ensure the 'right' 'winner' patch is chosen.
    return 0;
  });

  // Create an overview of all unique patchKeys per weight that are reachable within the current original json object
  const patchKeys = weightedPathSet.map((patchSet) => [...new Set(patchSet.map(([path]) => findAvailablePathAndAttachedObject(path, originalJsonObj)[0]))]
    .sort() // Must be sorted!
    .map((path) => createJsonPathScope(path, "array"))); // Add the path as array
  const mergeTable = [];
  weightedPathSet.forEach((patchSet, weight) => {
    // Skip weights that do not contain patches
    if (!Array.isArray(patchSet)) {
      return;
    }
    // Create an overview of all unique keys in previous weights and the current one. Higher weights are relevant and ignored.
    const previousResolvedKeyNamesAndCurrentWeightedKeyNames = [...new Set(mergeTable.slice(0, weight).filter((obj) => obj).flatMap((obj) => Object.keys(obj)).concat(patchKeys[weight]))].sort().map((path) => createJsonPathScope(path, "array"));
    patchSet.forEach(([path, value]) => {
      // Ensure no errors occur later on.
      if (!mergeTable[weight]) {
        mergeTable[weight] = {};
      }
      // Go through all patches and combine those who overlap in path by getting the key name of the first match (order of patchKeys is therefore important).
      const [rootPath] = findAvailablePathAndAttachedObject(path, originalJsonObj);
      const rootPathArray = createJsonPathScope(rootPath, "array");
      // Short note: we must always retrieve back a key, either a 'parent' or itself.
      const keyName = createJsonPathScope(previousResolvedKeyNamesAndCurrentWeightedKeyNames.find((keyArray) => keyArray.reduce((stillMatching, partOfPath, index, arr) => {
        // The path is still matching with the root path.
        if (stillMatching) {
          return partOfPath === rootPathArray[index];
        }
        // Path is not matching with root path anymore.
        arr.splice(index); // Break reduce loop as fast as possible
        return false;
      }, true)));
      // We change the way the json path is written so preferences in how to type path names cannot mess with our sorting algorithm.
      const record = [createJsonPathScope(path), value];
      // Store the record under the root key name.
      if (!mergeTable[weight][keyName]) {
        mergeTable[weight][keyName] = [record];
      } else {
        mergeTable[weight][keyName].push(record);
      }
    });
  });
  // Detect the first weight in the merge table, in case no patch with weight 0 is inserted.
  const firstWeightWithTableWithinMergeTable = mergeTable.findIndex((obj) => obj);
  // If your patch(es) do not match with your expected output, mergeTable at this point is your number 1 source to debug.
  // Go through all weights in the merge table in ascending order.
  let result = mergeTable.reduce((prevResult, table, weight) => {
    // Check if the current weight has any patches.
    if (!table) {
      return prevResult;
    }
    // Set the original root object as patch source by default.
    let rootObject = originalJsonObj;
    // Init the array with all previous results from earlier weights.
    let filterPrevResult = [];
    // Check if this is the first patch run, if not go into the if statement.
    if (firstWeightWithTableWithinMergeTable !== weight) {
      // Quickly get all paths to still need to be processed in this run.
      const unprocessedPaths = Object.keys(table);
      // Check if from any previous runs of lower weights a patch matched the patch path of this run.
      filterPrevResult = prevResult.filter(([path]) => {
        // Convert a patch path form previous run into an array.
        const previousPatchPathArray = createJsonPathScope(path, "array");
        // Return true if any path from the new run matches a path from previous run exactly OR if the entire path of the new run overlaps with a path of a previous patch path.
        return unprocessedPaths.includes(path) || unprocessedPaths.filter((p) => createJsonPathScope(p, "array").reduce((prev, part, i, arr) => {
          // If no overlap is found, return false as the path itself is unique.
          if (prev === false) {
            arr.splice(i);
            return false;
          }
          // Check if the current part of a path is the same as the other part of a path.
          return previousPatchPathArray[i] === part;
        }, true)).length > 0; // If the length is higher than 0 then there is a match.
      });
      // filterPrevResult contains at this point all patches that overlap with the paths of this run. Therefore, apply the patches on the rootObject so patches from this run do not 'forget' overwritten patches.
      filterPrevResult.forEach(([path, value]) => {
        rootObject = applyPatchOnObject(rootObject, path, value, opts);
      });
    }
    // Sort all keys that we are going to process. The order is important for Postgres!
    const newPatches = sortPathArray(Object.entries(table)).map(([mainPath, patchArray]) => {
      // Set the lookup value and key for the first item in the patchArray.
      // eslint-disable-next-line prefer-const
      let [mainLookupKey, mainLookUpValue] = findAvailablePathAndAttachedObject(mainPath, rootObject);
      // Very important! We must sort all values in the array as the lookup key decides the order of the mutations. First insert the destructive inserts, then the small updates.
      sortPathArray(patchArray).forEach(([path, value]) => {
        // Calculate the base path based on the path - mainLookupKey
        const basePath = path.slice(mainLookupKey.length);
        // Generate the patch!
        const patchSet = generatePatchSet(mainLookUpValue, basePath, value, opts);
        // Apply the patch and re-use the value for the next item in this array.
        mainLookUpValue = applyPatchOnObject(mainLookUpValue, ...patchSet, opts);
      });
      return [mainPath, mainLookUpValue];
    });
    // Concat the patches from this run with any patches from the previous run that did NOT overlap with the paths of this run patches.
    // Secondly sort the result of this combination. Not needed per se, but nice for consistent output.
    return sortPathArray(newPatches.concat(prevResult.filter(([path]) => filterPrevResult.findIndex(([path2]) => path === path2) === -1)));
  }, []);

  // Check if the developer specified if jsonb notation must be used for patch output.
  if (opts.pathAnnotationOutput === "jsonb") {
    result = result.map((arr) => arr.map((item, i) => {
      // The generatePatch function returns a 'normal' json path value. We want to convert this to jsonb notation.
      if (i !== 0) {
        // Only the first item is the json path.
        return item;
      }
      return convertJsonPathIntoJsonBPath(item);
    }));
  }

  return result;
}

export {
  generateCombinedPatchSet,
  applyPatchOnObject,
  generatePatchSet,
};
