import {
  applyPatchOnObject,
  generateCombinedPatchSet,
  generatePatchSet,
} from "../generatePatchSet";

describe("generatePatchSet", () => {
  describe("with objects as lookup input", () => {
    test("returns an empty json lookup path and a new object with content if the top level key does not exist", () => {
      const rootObj = {};
      const patchJsonPath = "someObj:aNewObj.aNewKey";
      const newValue = "new";

      const result = generatePatchSet(rootObj, patchJsonPath, newValue);

      expect(result).toMatchObject(["", { someObj: { aNewObj: { aNewKey: newValue } } }]);
    });
    test("returns an object within a new object with a new key if all do not exist", () => {
      const rootObj = {
        someObj: {},
      };
      const patchJsonPath = "someObj:aNewObj.aNewKey";
      const newValue = "new";

      const result = generatePatchSet(rootObj, patchJsonPath, newValue);

      expect(result).toMatchObject(["someObj", { aNewObj: { aNewKey: newValue } }]);
    });
    test("returns a new object with a new key if both do not exist", () => {
      const rootObj = { topObj: { aNewObj: {} } };
      const patchJsonPath = "topObj:aNewObj.aNewKey";
      const newValue = "new";

      const result = generatePatchSet(rootObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });

      expect(result).toMatchObject(["topObj:aNewObj", {
        aNewKey: newValue,
      }]);
    });
    test("returns only the new value if the path exists", () => {
      const rootObj = {
        topObj: {
          aNewObj: {
            aNewKey: "old",
          },
        },
      };
      const patchJsonPath = "topObj:aNewObj.aNewKey";
      const newValue = "new";

      const result = generatePatchSet(rootObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });
      expect(result).toMatchObject([patchJsonPath, newValue]);
    });
    test("returns the input variables as output if nothing changed", () => {
      const rootObj = {
        topObj: {
          aNewObj: {
            aNewKey: "current",
          },
        },
      };
      const patchJsonPath = "topObj:aNewObj.aNewKey";
      const newValue = "current";

      const result = generatePatchSet(rootObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });
      expect(result).toMatchObject([patchJsonPath, newValue]);
    });
    test("returns an object when an identifier contains, besides text, also an id", () => {
      const rootObj = {
        topObj: {
          aNewObj: {
            test: "current",
          },
        },
      };
      const patchJsonPath = "topObj:aNewObj.test2";
      const newValue = "added";

      const result = generatePatchSet(rootObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });
      expect(result).toMatchObject(["topObj:aNewObj", { test: "current", test2: "added" }]);
    });
    test("returns a merged object if the object exists but not the requested object key in the lookup path", () => {
      const rootObj = {
        topObj: {
          aNewObj: {
            anExistingKey: "keep me",
          },
        },
      };
      const patchJsonPath = "topObj:aNewObj.aNewKey";
      const newValue = "current";

      const result = generatePatchSet(rootObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });
      expect(result).toMatchObject(["topObj:aNewObj", {
        anExistingKey: "keep me",
        aNewKey: "current",
      }]);
    });
    describe("and as value parameter", () => {
      test("an integer value", () => {
        const rootObj = {
          topObj: "currentValue",
        };
        const patchJsonPath = "topObj";
        const newValue = 0;

        const result = generatePatchSet(rootObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });
        expect(result).toMatchObject([patchJsonPath, newValue]);
      });
      test("a boolean value", () => {
        const rootObj = {
          topObj: "currentValue",
        };
        const patchJsonPath = "topObj";
        const newValue = false;

        const result = generatePatchSet(rootObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });
        expect(result).toMatchObject([patchJsonPath, newValue]);
      });
      test("a null value", () => {
        const rootObj = {
          topObj: "currentValue",
        };
        const patchJsonPath = "topObj";
        const newValue = null;

        const result = generatePatchSet(rootObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });
        expect(result).toMatchObject([patchJsonPath, newValue]);
      });
    });
  });
  describe("with arrays as lookup input", () => {
    test("extends an existing array as output and adds a new object at the related index", () => {
      const rootObj = {
        topObj: {
          anExistingArray: ["I'm first"],
        },
      };
      const patchJsonPath = "topObj:anExistingArray[2].aNewKey";
      const newValue = "I'm new";

      const result = generatePatchSet(rootObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });

      expect(result).toMatchObject(["topObj:anExistingArray", ["I'm first", undefined, { aNewKey: newValue }]]);
    });
    test("extends an existing array with another array with content at the related index", () => {
      const rootObj = {
        topObj: {
          someArray: [],
        },
      };

      const patchJsonPath = "topObj:someArray[2][0][aNewKey].anotherKey";
      const newValue = "nieuw";

      const result = generatePatchSet(rootObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });

      expect(result).toMatchObject(["topObj:someArray", [undefined, undefined, [{ aNewKey: { anotherKey: newValue } }]]]);
    });
    test("returns only the changed value if the array length covers the requested json path", () => {
      const existingObj = {
        foobar: {
          someObj: {
            aKey: ["first value", "third value"],
          },
        },
      };
      const patchJsonPath = "foobar:someObj.aKey[1]";
      const newValue = "second value";

      const result = generatePatchSet(existingObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });

      expect(result).toMatchObject(["foobar:someObj.aKey[1]", newValue]);
    });
    test("returns a filled in array when the requested top level json path is an empty array", () => {
      const existingObj = {
        foobar: [],
      };
      const patchJsonPath = "foobar:[1]";

      const newValue = "added";
      const result = generatePatchSet(existingObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });

      expect(result).toMatchObject(["foobar", [undefined, newValue]]);
    });
  });
  describe("with non-objects as lookup input", () => {
    test("returns the value when input is type string", () => {
      const result = generatePatchSet("input", "", "output");

      expect(result).toMatchObject(["", "output"]);
    });
    test("returns the value when input is type boolean", () => {
      const result = generatePatchSet(true, "", false);

      expect(result).toMatchObject(["", false]);
    });
    test("returns the value when input is type integer", () => {
      const result = generatePatchSet(0, "", 1);

      expect(result).toMatchObject(["", 1]);
    });
    test("returns undefined if undefined input is patched with undefined", () => {
      const result = generatePatchSet(undefined, "", undefined);

      expect(result).toMatchObject(["", undefined]);
    });
  });
  describe("resolves json path output by", () => {
    test("returning a json path with square-bracket notation for objects that contain special characters", () => {
      const existingObj = {
        foobar: {
          "special-value": {
            "I know": "wrong",
          },
        },
      };
      const patchJsonPath = "foobar:[special-value][I know]";

      const newValue = "valid";
      const result = generatePatchSet(existingObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });

      expect(result).toMatchObject([patchJsonPath, newValue]);
    });
    test("returning a json path with dot notation for objects that does not contain special characters", () => {
      const existingObj = {
        foobar: {
          noSpecialValue: {
            good: "wrong",
          },
        },
      };
      const patchJsonPath = "foobar:[noSpecialValue][good]";

      const newValue = "valid";
      const result = generatePatchSet(existingObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });

      expect(result).toMatchObject(["foobar:noSpecialValue.good", newValue]);
    });
    test("returning a json path with dot notation when annotated with a digit", () => {
      const existingObj = {
        foobar: {
          aSimpleArray: [
            "first",
          ],
        },
      };
      const patchJsonPath = "foobar:aSimpleArray.0";

      const newValue = "first value";
      const result = generatePatchSet(existingObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });

      expect(result).toMatchObject(["foobar:aSimpleArray[0]", newValue]);
    });
  });
  describe("resolves type cast conflicts", () => {
    describe("with default options (forceDigitsToBeTypeArray = true, keepDataOnForcedTypeCasting = true)", () => {
      test("and array as lookup input, casts an existing object to an array, adds the requested object at the related index and extends the new array with the old values of the existing object", () => {
        const rootObj = {
          topObj: {
            someObj: {
              currentKey: "currentValue",
            },
          },
        };
        const patchJsonPath = "topObj:someObj[2].aRandomKey";
        const newValue = "aRandomValue";

        const result = generatePatchSet(rootObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });

        expect(result).toMatchObject(["topObj:someObj", [undefined, undefined, { aRandomKey: newValue }, { currentKey: "currentValue" }]]);
      });
      test("casts an existing array to an object, results into a key-value pair of the array as the new object key-value", () => {
        const rootObj = {
          topObj: {
            someObj: [{
              currentKey: "currentValue",
            }],
          },
        };
        const patchJsonPath = "topObj:someObj.aRandomKey";
        const newValue = "aRandomValue";

        const result = generatePatchSet(rootObj, patchJsonPath, newValue, { pathAnnotationOutput: "jsonb" });

        expect(result).toMatchObject(["topObj:someObj", { aRandomKey: newValue, 0: { currentKey: "currentValue" } }]);
      });
    });
    describe("with forceDigitsToBeTypeArray = true, keepDataOnForcedTypeCasting = false", () => {
      test("and digit as lookup input, replaces the existing object with an empty array", () => {
        const rootObj = {
          topObj: {
            someObj: {
              currentKey: "currentValue",
            },
          },
        };
        const patchJsonPath = "topObj:someObj[2].aRandomKey";
        const newValue = "aRandomValue";

        const result = generatePatchSet(rootObj, patchJsonPath, newValue, {
          forceDigitsToBeTypeArray: true,
          keepDataOnForcedTypeCasting: false,
          pathAnnotationOutput: "jsonb",
        });

        expect(result).toMatchObject(["topObj:someObj", [undefined, undefined, { aRandomKey: newValue }]]);
      });
      test("casts an existing array to an object, results into a key-value pair of the array as the new object key-value", () => {
        const rootObj = {
          topObj: {
            someObj: [{
              currentKey: "currentValue",
            }],
          },
        };
        const patchJsonPath = "topObj:someObj.aRandomKey";
        const newValue = "aRandomValue";

        const result = generatePatchSet(rootObj, patchJsonPath, newValue, {
          forceDigitsToBeTypeArray: true,
          keepDataOnForcedTypeCasting: false,
          pathAnnotationOutput: "jsonb",
        });

        expect(result).toMatchObject(["topObj:someObj", { aRandomKey: newValue }]);
      });
    });
    describe("with forceDigitsToBeTypeArray = false, keepDataOnForcedTypeCasting = true", () => {
      test("and digit as lookup input, keeps an existing object and adds a digit as key", () => {
        const rootObj = {
          topObj: {
            someObj: {
              currentKey: "currentValue",
            },
          },
        };
        const patchJsonPath = "topObj:someObj[2].aRandomKey";
        const newValue = "aRandomValue";

        const result = generatePatchSet(rootObj, patchJsonPath, newValue, {
          forceDigitsToBeTypeArray: false,
          keepDataOnForcedTypeCasting: true,
          pathAnnotationOutput: "jsonb",
        });

        expect(result).toMatchObject(["topObj:someObj", { currentKey: "currentValue", 2: { aRandomKey: "aRandomValue" } }]);
      });
      test("casts an array to an object when a non-digit key is provided, create an object with new key and the array converted as key-value object pair", () => {
        const rootObj = {
          topObj: {
            someObj: [{
              currentKey: "currentValue",
            }],
          },
        };
        const patchJsonPath = "topObj:someObj.aRandomKey";
        const newValue = "aRandomValue";

        const result = generatePatchSet(rootObj, patchJsonPath, newValue, {
          forceDigitsToBeTypeArray: false,
          keepDataOnForcedTypeCasting: true,
          pathAnnotationOutput: "jsonb",
        });

        expect(result).toMatchObject(["topObj:someObj", { aRandomKey: newValue, 0: { currentKey: "currentValue" } }]);
      });
    });
    describe("with forceDigitsToBeTypeArray = false and keepDataOnForcedTypeCasting = false", () => {
      test("and digit as lookup input, keeps an existing object and adds a digit as key, same result as keepDataOnForcedTypeCasting = true", () => {
        const rootObj = {
          topObj: {
            someObj: {
              currentKey: "currentValue",
            },
          },
        };
        const patchJsonPath = "topObj:someObj[2].aRandomKey";
        const newValue = "aRandomValue";

        const result = generatePatchSet(rootObj, patchJsonPath, newValue, {
          forceDigitsToBeTypeArray: false,
          keepDataOnForcedTypeCasting: false,
          pathAnnotationOutput: "jsonb",
        });

        expect(result).toMatchObject(["topObj:someObj", { currentKey: "currentValue", 2: { aRandomKey: "aRandomValue" } }]);
      });
      test("casts an array to an object when a non-digit key is provided, replacing the entire array with an object with one key", () => {
        const rootObj = {
          topObj: {
            someObj: [{
              currentKey: "currentValue",
            }],
          },
        };
        const patchJsonPath = "topObj:someObj.aRandomKey";
        const newValue = "aRandomValue";

        const result = generatePatchSet(rootObj, patchJsonPath, newValue, {
          forceDigitsToBeTypeArray: false,
          keepDataOnForcedTypeCasting: false,
          pathAnnotationOutput: "jsonb",
        });

        expect(result).toMatchObject(["topObj:someObj", { aRandomKey: newValue }]);
      });
    });
  });
  describe("with the option applyNullAtUndecidedArrayItems", () => {
    test("set to false, an enlarged array contains undefined values", () => {
      // treatInputAsImmutable is set to false to ensure no JSON encoding takes place.
      const rootObj = ["foo"];
      const patch = ["[2]", "added"];

      const result = generatePatchSet(rootObj, ...patch, { treatInputAsImmutable: false, applyNullAtUndecidedArrayItems: false });

      expect(result).toMatchObject(["", ["foo", undefined, "added"]]);
    });
    test("set to true, an enlarged array contains null values", () => {
      // treatInputAsImmutable is set to false to ensure no JSON encoding takes place.
      const rootObj = ["foo"];
      const patch = ["[2]", "added"];

      const result = generatePatchSet(rootObj, ...patch, { treatInputAsImmutable: false, applyNullAtUndecidedArrayItems: true });

      expect(result).toMatchObject(["", ["foo", null, "added"]]);
    });
  });
});
describe("generateCombinedPatchSet", () => {
  test("combines multiple array patches in an array with insufficient length to one patch", () => {
    const rootObj = {
      plan: {
        iciRatings: [null, null, null],
      },
    };

    const patch1 = ["plan:iciRatings[1]", 2];
    const patch2 = ["plan:iciRatings[3]", 5];
    const patch3 = ["plan:iciRatings[5]", 3];

    const finalResult = generateCombinedPatchSet(rootObj, [patch1, patch2, patch3]);
    expect(finalResult).toMatchObject([[
      "plan.iciRatings",
      [
        null,
        2,
        null,
        5,
        undefined,
        3,
      ],
    ],
    ]);
    expect(finalResult).toHaveLength(1);
  });
  test("combines multiple object patches to one patch", () => {
    const rootObj = {
      plan: {
        pars: {
          overview: {
            value: "old",
          },
        },
      },
    };

    const patch1 = ["plan:pars.overview.value", "new"];
    const patch2 = ["plan:pars", {
      overview: { foo: "bar" },
    }];
    const patch3 = ["plan:pars.random.value", "foo"];

    const finalResult = generateCombinedPatchSet(rootObj, [patch1, patch2, patch3]);
    expect(finalResult).toMatchObject([[
      "plan.pars",
      {
        overview: {
          value: "new",
          foo: "bar",
        },
        random: {
          value: "foo",
        },
      },
    ],
    ]);
    expect(finalResult).toHaveLength(1);
  });
  test("combines multiple object patches to one patch if the keys contains a digit within the name", () => {
    const rootObj = {
      plan: {
        test: {
          value: "old",
        },
      },
    };

    const patch1 = ["plan:test", {
      value: "",
    }];
    const patch2 = ["plan:test2", {
      value: "",
      aRandomKey: "not-updated",
    }];
    const patch3 = ["plan:test2.aRandomKey", "updated"];

    const finalResult = generateCombinedPatchSet(rootObj, [patch1, patch2, patch3]);
    expect(finalResult).toMatchObject([[
      "plan",
      {
        test: {
          value: "",
        },
        test2: {
          value: "",
          aRandomKey: "updated",
        },
      },
    ],
    ]);
    expect(finalResult).toHaveLength(1);
  });
  test("diverges between keys that overlap in name but have are different object keys, while also changing the structure of an array into an object", () => {
    const rootObj = {
      plan: {
        test: [
          null,
          null,
          {
            value: "",
            blablabla: "aaa",
          },
          {
            value: "",
          },
        ],
        test2: {},
      },
    };

    const patch1 = ["plan:test", { value: "" }];
    const patch2 = ["plan:test2", { value: "", aRandomKey: "not-updated" }];
    const patch3 = ["plan:test2.aRandomKey", "updated"];

    const finalResult = generateCombinedPatchSet(rootObj, [patch1, patch2, patch3]);
    expect(finalResult).toMatchObject(
      [[
        "plan.test",
        {
          value: "",
        },
      ],
      [
        "plan.test2",
        {
          value: "",
          aRandomKey: "updated",
        },
      ]],
    );
    expect(finalResult).toHaveLength(2);
  });
  test("combines root patches with incremental patches", () => {
    const rootObj = {
      iciRatingsOld: [1, 2, 1, 4],
    };

    const patch1 = ["", { iciRatings: [1, 2, 3, 5] }];
    const patch2 = ["iciRatings:[3]", 4];

    const finalResult = generateCombinedPatchSet(rootObj, [patch1, patch2]);
    expect(finalResult).toMatchObject([["", { iciRatings: [1, 2, 3, 4] }]]);
    expect(finalResult).toHaveLength(1);
  });
  test("returns the same array as the original if all patches summed up result into that", () => {
    const rootObj = {
      iciRatings: [1, 2, 1, 4],
    };

    const patch1 = ["iciRatings", [1, 2, 3, 5]];
    const patch2 = ["iciRatings:[3]", 4];
    const patch3 = ["iciRatings:[2]", 1];

    const finalResult = generateCombinedPatchSet(rootObj, [patch1, patch2, patch3]);
    expect(finalResult).toMatchObject([["iciRatings", [1, 2, 1, 4]]]);
    expect(finalResult).toHaveLength(1);
  });
  test("handles null as jsonObj input", () => {
    const rootObj = null;
    const patches = [["relationship[0]", "foo"]];

    const finalResult = generateCombinedPatchSet(rootObj, patches);
    expect(finalResult).toMatchObject([["", { relationship: ["foo"] }]]);
  });
  test("handles undefined as jsonObj and patch input", () => {
    const rootObj = undefined;
    const patches = [["", undefined]];

    const finalResult = generateCombinedPatchSet(rootObj, patches);
    expect(finalResult).toMatchObject([["", undefined]]);
  });
  describe("with the experimental option mergeWithPreviousData", () => {
    test("merges an object one level deep if set to shallow", () => {
      const rootObject = {
        subKey: {
          subKey2: {
            value1: "foo",
            value2: "bar",
          },
          subKey1: {
            value1: "otherFoo",
          },
        },
        subKeyOther: {},
      };

      const patches = [["", { subKey: { subKey2: { value3: "patch" } } }]];
      const altPatches = [["subKey", { subKey2: { value3: "patch" } }]];
      const finalResult = generateCombinedPatchSet(rootObject, patches, { mergeWithPreviousData: "shallow" });
      const altFinalResult = generateCombinedPatchSet(rootObject, altPatches, { mergeWithPreviousData: "shallow" });

      expect(finalResult).toMatchObject([["", { subKey: { subKey2: { value3: "patch" } }, subKeyOther: {} }]]);
      expect(altFinalResult).toMatchObject([["subKey", { subKey2: { value3: "patch" }, subKey1: { value1: "otherFoo" } }]]);
    });
    test("merges an object entirely if set to deep and one value to undefined", () => {
      const rootObject = {
        value1: { foo: "bar" },
        value2: { foo: "bar" },
        value3: { foo: "bar" },
        value4: { foo: "bar" },
      };

      const patches = [["", { value1: { }, value2: { }, value3: { } }], ["value4", undefined]];
      const finalResult = generateCombinedPatchSet(rootObject, patches, { mergeWithPreviousData: "deep" });
      expect(finalResult).toMatchObject([["", {
        value1: { foo: "bar" },
        value2: { foo: "bar" },
        value3: { foo: "bar" },
        value4: undefined,
      }]]);
    });
    test("merges an object entirely if set to deep", () => {
      const rootObject = {
        subKey: {
          subKey2: {
            value1: "value",
            value2: "bar",
          },
        },
      };

      const patches = [["", { subKey: { subKey2: { value3: "patch" } } }]];
      const finalResult = generateCombinedPatchSet(rootObject, patches, { mergeWithPreviousData: "deep" });
      expect(finalResult).toMatchObject([["", { subKey: { subKey2: { value1: "value", value2: "bar", value3: "patch" } } }]]);
    });
    test("by default (set to 'none') overwrites the object", () => {
      const rootObject = {
        subKey: {
          subKey2: {
            value1: "value",
            value2: "bar",
          },
        },
      };

      const patches = [["", { subKey: { subKey2: { value3: "patch" } } }]];
      const finalResult = generateCombinedPatchSet(rootObject, patches, { mergeWithPreviousData: "none" });
      const defaultFinalResult = generateCombinedPatchSet(rootObject, patches);

      expect(finalResult).toMatchObject([["", { subKey: { subKey2: { value3: "patch" } } }]]);
      expect(defaultFinalResult).toMatchObject([["", { subKey: { subKey2: { value3: "patch" } } }]]);
    });
  });
  describe("takes weights into account", () => {
    test("overwrites incremental patches with a global patch with a higher weight", () => {
      const rootObj = {
        iciRatings: [1, 2, 1, 3],
      };

      const patch1 = ["", { iciRatings: [1, 2, 3, 5] }, 1];
      const patch2 = ["iciRatings:[3]", 4];

      const finalResult = generateCombinedPatchSet(rootObj, [patch1, patch2]);
      expect(finalResult).toMatchObject([["", { iciRatings: [1, 2, 3, 5] }]]);
      expect(finalResult).toHaveLength(1);
    });
    test("combines root patches with incremental patches with the same or higher weight, overwriting incremental patches with a lower weight in an overwritten key", () => {
      const rootObj = {
        iciRatings: [1, 2, 1, 3],
        iciRatingsOther: [0, 1, 2, 3, 4],
      };

      const patch1 = ["", { iciRatings: [1, 2, 3, 5] }, 1];
      const patch2 = ["iciRatingsOther:[0]", 10]; // This one is overwritten by patch1, as patch1 overwrites the entire object with weight 1. This is weight 0.
      const patch3 = ["iciRatingsOther:[1]", 20, 1];
      const patch4 = ["iciRatingsOther:[2]", 30, 2];

      const finalResult = generateCombinedPatchSet(rootObj, [patch1, patch2, patch3, patch4]);
      expect(finalResult).toMatchObject([
        ["", { iciRatings: [1, 2, 3, 5], iciRatingsOther: [undefined, 20, 30] }],
      ]);
      expect(finalResult).toHaveLength(1);
    });
    test("combines incremental patches with different weight", () => {
      const rootObj = {
        iciRatings: [1, 2, 1, 3],
        iciRatingsOther: [0, 1, 2, 3, 4],
      };

      const patch1 = ["iciRatingsOther:[0]", 10];
      const patch2 = ["iciRatingsOther:[1]", 20, 1];
      const patch3 = ["iciRatingsOther:[2]", 30, 2];
      const patch4 = ["iciRatingsOther:[1]", 0, 2]; // overwrites patch2

      const finalResult = generateCombinedPatchSet(rootObj, [patch1, patch2, patch3, patch4]);
      expect(finalResult).toMatchObject([
        ["iciRatingsOther[0]", 10],
        ["iciRatingsOther[1]", 0],
        ["iciRatingsOther[2]", 30],
      ]);
      expect(finalResult).toHaveLength(3);
    });
    test("overwrite incremental patches with root patches using undefined with different weights", () => {
      const rootObj = {
        iciRatings: [1, 2, 1, 3],
        iciRatingsOther: [0, 1, 2, 3, 4],
      };

      const patch1 = ["iciRatingsOther:[0]", 10]; // Weight 0, so overwritten
      const patch2 = ["", undefined, 1];

      const sameWeightPatch1 = ["iciRatingsOther:[0]", 10]; // Both have equal weight, so the sorted patch order is applied.
      const sameWeightPatch2 = ["", undefined];

      const finalResult = generateCombinedPatchSet(rootObj, [patch1, patch2]);
      const finalResult2 = generateCombinedPatchSet(rootObj, [sameWeightPatch1, sameWeightPatch2]);
      expect(finalResult).toMatchObject([["", undefined]]);
      expect(finalResult2).toMatchObject([["", { iciRatingsOther: [10] }]]);
    });
  });
});
describe("applyPatchOnObject", () => {
  describe("with treatInputAsImmutable = true", () => {
    test("and JS env does not have the structuredClone function available, undefined is changed to null", () => {
      const rootObj = ["foo", undefined, "original"];
      const patch = ["[2]", "changed"];

      const restore = global.structuredClone;
      global.structuredClone = undefined;

      const result = applyPatchOnObject(rootObj, ...patch);
      global.structuredClone = restore;

      expect(result).toMatchObject(["foo", null, "changed"]);
      expect(rootObj).toMatchObject(["foo", undefined, "original"]);
    });
    test("the rootObj is not changed", () => {
      const rootObj = ["foo", 1, "original"];
      const patch = ["[2]", "changed"];

      const result = applyPatchOnObject(rootObj, ...patch);

      expect(result).toMatchObject(["foo", 1, "changed"]);
      expect(rootObj).toMatchObject(["foo", 1, "original"]);
    });
  });
  test("with treatInputAsImmutable = false the rootObj is changed", () => {
    const rootObj = ["foo", undefined, "original"];
    const patch = ["[2]", "changed"];

    const result = applyPatchOnObject(rootObj, ...patch, { treatInputAsImmutable: false });

    expect(result).toMatchObject(["foo", undefined, "changed"]);
    expect(rootObj).toMatchObject(["foo", undefined, "changed"]);
  });
});
