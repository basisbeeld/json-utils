export {
  findAvailablePathAndAttachedObject,
  findPathBasedOnKeyValue,
  containsValueAtExactPath,
  getValueAtExactPath,
} from "./patch/find";
export {
  generateCombinedPatchSet,
  applyPatchOnObject,
  generatePatchSet,
} from "./patch/generatePatchSet";

export {
  isJsonBPath,
  convertJsonPathIntoJsonBPath,
} from "./path/jsonBPath";
export {
  createJsonPathScope,
  convertJsonBPathIntoJsonPath,
  convertJsonPointerPathIntoJsonPath,
} from "./path/jsonPath";
export {
  isJsonPointerPath,
  convertJsonPathIntoJsonPointerPath,
} from "./path/jsonPointerPath";

export {
  digitRE,
  objIdentifierRE,
  jsonBPatternRE,
  validObjectIdentifierDotNotationRE,
} from "./lib/patterns";
