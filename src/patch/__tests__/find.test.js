import {
  findAvailablePathAndAttachedObject,
  findPathBasedOnKeyValue,
  containsValueAtExactPath,
  getValueAtExactPath,
} from "../find";

describe("findAvailablePathAndAttachedObject", () => {
  test("is able to lookup within objects that have a null value", () => {
    const obj = {
      foo: null,
    };

    const obj2 = null;

    const result = findAvailablePathAndAttachedObject("foo.bar", obj);
    const result2 = findAvailablePathAndAttachedObject("foo.bar", obj2);

    expect(result).toStrictEqual(["foo", null]);
    expect(result2).toStrictEqual(["", null]);
  });
  test("is able to lookup complex json paths", () => {
    // Example retrieved from https://datatracker.ietf.org/doc/html/rfc6901 page 4.
    const obj = {
      foo: ["bar", "baz"],
      "": 0,
      "a/b": 1,
      "c%d": 2,
      "e^f": 3,
      "g|h": 4,
      "i\\j": 5,
      "k\"l": 6,
      " ": 7,
      "m~n": 8,
    };
    const findArr = [
      "foo",
      "foo[0]",
      // "", // TODO: in the future support Objects where the key is set to ""
      "[a/b]",
      "[c%d]",
      "[e^f]",
      "[g|h]",
      "[i\\j]",
      "[k\"l]",
      "[ ]",
      "[m~n]",
    ];

    const result = findArr.map((path) => findAvailablePathAndAttachedObject(path, obj)[1]);

    expect(result).toStrictEqual([
      ["bar", "baz"],
      "bar",
      // 0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
    ]);
  });
  test("is able to lookup values with a 'falsely' value", () => {
    const obj = {
      test: 0,
      test2: false,
      test3: -1,
      test4: null,
    };

    const result = ["test", "test2", "test3", "test4"].map((path) => findAvailablePathAndAttachedObject(path, obj)[1]);

    expect(result).toStrictEqual([
      0,
      false,
      -1,
      null,
    ]);
  });
});
describe("containsValueAtExactPath", () => {
  test("return false if a path is not found", () => {
    expect(containsValueAtExactPath("foo.bar", { foo: { nobar: "a" } })).toStrictEqual(false);
    expect(containsValueAtExactPath("[1]", ["foo"])).toStrictEqual(false);
    expect(containsValueAtExactPath("foo.bar", "foobar")).toStrictEqual(false);
  });
  test("return true if a path is found", () => {
    expect(containsValueAtExactPath("foo.bar", { foo: { bar: "a" } })).toStrictEqual(true);
    expect(containsValueAtExactPath("[1]", ["foo", "bar"])).toStrictEqual(true);
    expect(containsValueAtExactPath("", "foobar")).toStrictEqual(true);
  });
});
describe("getValueAtExactPath", () => {
  test("return default value if a path is not found", () => {
    expect(getValueAtExactPath("foo.bar", { foo: { nobar: "a" } }, { defaultValueOnMiss: "test" })).toStrictEqual("test");
    expect(getValueAtExactPath("[1]", ["foo"], { defaultValueOnMiss: 0 })).toStrictEqual(0);
    expect(getValueAtExactPath("foo.bar", "foobar")).toStrictEqual(undefined);
  });
  test("calls the default value callback when it's a function, applies default value otherwise, if a path is not found", () => {
    expect(getValueAtExactPath("foo.bar", { foo: { nobar: "a" } }, { defaultValueCallback: () => "hello" })).toStrictEqual("hello");
    expect(getValueAtExactPath("[1]", ["foo"], { defaultValueCallback: "bogus" })).toStrictEqual(undefined);
    expect(getValueAtExactPath("foo.bar", "foobar", { defaultValueOnMiss: "notthisone", defaultValueCallback: () => "hello" })).toStrictEqual("hello");
    expect(getValueAtExactPath("foo.bar", "foobar", { defaultValueOnMiss: "thisone", defaultValueCallback: "hello" })).toStrictEqual("thisone");
  });
  test("return the value at a path if the path is found", () => {
    expect(getValueAtExactPath("foo.bar", { foo: { bar: "a" } }, { defaultValueOnMiss: "test" })).toStrictEqual("a");
    expect(getValueAtExactPath("[1]", ["foo", "bar"])).toStrictEqual("bar");
    expect(getValueAtExactPath("", "foobar")).toStrictEqual("foobar");
  });
  test.skip("works with 'simple' complex json path examples", () => {
    // Skipped as we dropped support for the lib 'jsonpath'
    const obj = {
      arr: [{
        id: "findMe",
      }],
    };

    expect(getValueAtExactPath("$.arr[?(@.id == 'findMe')]", obj)).toStrictEqual({ id: "findMe" });
  });
  test("does not throw an error if a complex json path is defined on any other variable than an object", () => {
    expect(getValueAtExactPath("$.arr[?(@.id == 'findMe')]", "a string")).toBeUndefined();
    expect(getValueAtExactPath("$.arr[?(@.id == 'findMe')]", 0)).toBeUndefined();
    expect(getValueAtExactPath("$.arr[?(@.id == 'findMe')]", null)).toBeUndefined();
    expect(getValueAtExactPath("$.arr[?(@.id == 'findMe')]", true)).toBeUndefined();
    expect(getValueAtExactPath("$.arr[?(@.id == 'findMe')]", undefined)).toBeUndefined();
  });
});
describe("findPathBasedOnKeyValue", () => {
  test("returns false if key and value are undefined", () => {
    expect(findPathBasedOnKeyValue({}, undefined, undefined)).toStrictEqual(false);
  });
  test("returns false if search object is undefined", () => {
    expect(findPathBasedOnKeyValue(undefined, "foo", "bar")).toStrictEqual(false);
  });
  test("finds a value within an array by returning the index", () => {
    const rootObj = ["me"];

    const result = findPathBasedOnKeyValue(rootObj, "me");

    expect(result).toStrictEqual("[0]");
  });
  test("finds a value within an array, with expected key, and returns empty", () => {
    const rootObj = ["me"];

    const result = findPathBasedOnKeyValue(rootObj, "me", "0");

    expect(result).toStrictEqual("");
  });
  test("finds a value within an array within an object, and returns the array with index", () => {
    const rootObj = {
      arr: ["me"],
    };

    const result = findPathBasedOnKeyValue(rootObj, "me");

    expect(result).toStrictEqual("arr[0]");
  });
  test("finds the first array with a min length of 2 within an object, and returns the array", () => {
    const rootObj = {
      arr: ["me"],
      arr2: ["me0", "me1"],
    };

    const result = findPathBasedOnKeyValue(rootObj, undefined, 1);

    expect(result).toStrictEqual("arr2");
  });
  test("finds the first array with a min length of 2 with the right value within an object, and returns the array", () => {
    const rootObj = {
      arr: ["me"],
      arr2: ["me0", "me1"],
      arr3: ["me2", "meGood"],
    };

    const result = findPathBasedOnKeyValue(rootObj, "meGood", 1);

    expect(result).toStrictEqual("arr3");
  });
  test("finds the first object with a key and any value, returning the root object", () => {
    const rootObj = {
      foo: {
        value: "me",
      },
      bar: {
        value: "me",
      },
    };

    const result = findPathBasedOnKeyValue(rootObj, undefined, "value");

    expect(result).toStrictEqual("foo");
  });
  test("finds the key within a rootObj, returning '' as result", () => {
    const rootObj = {
      foo: {
        value: "me",
      },
      bar: {
        value: "me",
      },
    };

    const result = findPathBasedOnKeyValue(rootObj, undefined, "foo");

    expect(result).toStrictEqual("");
  });
  test("finds the first object with a value, returning the root object with key", () => {
    const rootObj = {
      foo: {
        value: "me",
      },
      bar: {
        value: "me",
      },
    };

    const result = findPathBasedOnKeyValue(rootObj, "me");

    expect(result).toStrictEqual("foo.value");
  });
  test("finds an object with a key and value within an array, returning the array index", () => {
    const rootObj = [{
      value: "me",
    }];

    const result = findPathBasedOnKeyValue(rootObj, "me", "value");

    expect(result).toStrictEqual("[0]");
  });
  test("finds the root key of an object containing a value, returning the key and root", () => {
    const rootObj = {
      value: "me",
    };

    const result = findPathBasedOnKeyValue(rootObj, "me");

    expect(result).toStrictEqual("value");
  });
  test("finds the root key of an object within an object containing a value, returning the key and root path", () => {
    const rootObj = {
      foo: {
        bar: {
          value: "me",
        },
      },
    };

    const result = findPathBasedOnKeyValue(rootObj, "me");

    expect(result).toStrictEqual("foo.bar.value");
  });
  test("finds the value of an object within an array, returning the key and array index", () => {
    const rootObj = [{
      value: "me",
    }];

    const result = findPathBasedOnKeyValue(rootObj, "me");

    expect(result).toStrictEqual("[0].value");
  });
  test("finds a boolean as root value, returning an empty string, and returns false if not the same", () => {
    const rootObj = false;
    const rootObj2 = "false";

    const result = findPathBasedOnKeyValue(rootObj, false);
    const result2 = findPathBasedOnKeyValue(rootObj2, false);
    const result3 = findPathBasedOnKeyValue(rootObj, false, "notBeingUsed");

    expect(result).toStrictEqual("");
    expect(result2).toStrictEqual(false);
    expect(result3).toStrictEqual("");
  });
  test("finds a string as root value, returning an empty string, and returns false if not the same", () => {
    const rootObj = "foo";
    const rootObj2 = "bar";

    const result = findPathBasedOnKeyValue(rootObj, "foo");
    const result2 = findPathBasedOnKeyValue(rootObj2, "foo");

    expect(result).toStrictEqual("");
    expect(result2).toStrictEqual(false);
  });
  test("finds an integer as root value, returning an empty string, and returns false if not the same", () => {
    const rootObj = 0;
    const rootObj2 = 1;

    const result = findPathBasedOnKeyValue(rootObj, 0);
    const result2 = findPathBasedOnKeyValue(rootObj2, 0);

    expect(result).toStrictEqual("");
    expect(result2).toStrictEqual(false);
  });
  test("finds null as root value, returning an empty string, and returns false if not the same", () => {
    const rootObj = null;
    const rootObj2 = "null";

    const result = findPathBasedOnKeyValue(rootObj, null);
    const result2 = findPathBasedOnKeyValue(rootObj2, null);

    expect(result).toStrictEqual("");
    expect(result2).toStrictEqual(false);
  });
  test("returns false if a jsonObj is undefined and only a key is requested", () => {
    const result = findPathBasedOnKeyValue(undefined, undefined, "targetRelationshipLevel");
    expect(result).toStrictEqual(false);
  });
  describe("with stopOnFirstMatch on false", () => {
    test("finds all objects with a key and any value, returning the root object", () => {
      const rootObj = {
        foo: {
          value: "me",
        },
        bar: {
          value: "me",
        },
      };

      const result = findPathBasedOnKeyValue(rootObj, undefined, "value", {
        stopOnFirstMatch: false,
      });

      expect(result).toStrictEqual(["foo", "bar"]);
    });
    test("finds all objects with a specific value, returning the root object with key", () => {
      const rootObj = {
        foo: {
          value: "me",
        },
        bar: {
          value: "me",
        },
      };

      const result = findPathBasedOnKeyValue(rootObj, "me", undefined, {
        stopOnFirstMatch: false,
      });

      expect(result).toStrictEqual(["foo.value", "bar.value"]);
    });
    test("finds all deeply nested objects with a specific value, returning the path, including key", () => {
      const rootObj = {
        foo: {
          foo2: {
            foo3: {
              value: "me",
            },
          },
        },
        bar: {
          bar2: {
            bar3: {
              value: "me",
            },
          },
        },
      };

      const result = findPathBasedOnKeyValue(rootObj, "me", undefined, {
        stopOnFirstMatch: false,
      });

      expect(result).toStrictEqual(["foo.foo2.foo3.value", "bar.bar2.bar3.value"]);
    });
  });
});
