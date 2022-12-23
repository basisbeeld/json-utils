# Functions
All functions in this library have extensive jsdoc comments, with a clear description of the function and possibilities.
Here the functions are briefly summarized.

### Find functions

 - findAvailablePathAndAttachedObject: Get the path and value at path at an object _until_ unable to traverse.
 - findPathBasedOnKeyValue: Get the first path within an object/array with a key-value combination.
 - containsValueAtExactPath: Does this path have a value?
 - getValueAtExactPath: Give me the value at this path.

### Patch functions

 - generateCombinedPatchSet: Generate a concat combination of multiple patches with path-value combinations at a specific object.
 - applyPatchOnObject: Given a patch, apply it on a given object.
 - generatePatchSet: Generate one patch for a path-value combination on a specific object.

### JsonB functions (postgres)

 - isJsonBPath: Is a given path written in jsonb notation?
 - convertJsonPathIntoJsonBPath: Convert a "standard" json path into jsonb notation.

### "Standard" json path functions
With standard is meant: like you write a lookup for a JavaScript object key.

- createJsonPathScope: Create a json path out of any valid path scope (allows jsonb and json pointer values).
- convertJsonBPathIntoJsonPath: Convert a jsonb notated path into standard json path. 
- convertJsonPointerPathIntoJsonPath: Convert a json pointed notated path into standard json path.

### JSON pointer functions
JSON pointer as in RFC 6901 (e.g. used in json patch)

 - isJsonPointerPath: Is a given path written in json pointer notation?
 - convertJsonPathIntoJsonPointerPath: Convert a json pointer notated path into standard json path.
