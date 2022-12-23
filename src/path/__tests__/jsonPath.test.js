import { createJsonPathScope, convertJsonPointerPathIntoJsonPath } from "../jsonPath";

describe("convertJsonPointerPathIntoJsonPath and createJsonPathScope", () => {
  test("converts complex json pointer paths into valid json paths", () => {
    const test = [
      "/foo/bar",
      "/",
      "/a~1b",
      "/c%d",
      "/e^f",
      "/g|h",
      "/i\\j",
      "/k\"l",
      "/ ",
      "/m~0n",
    ];

    const result = test.map((str) => convertJsonPointerPathIntoJsonPath(str));
    const result2 = test.map((str) => createJsonPathScope(str));

    // Solutions retrieved from https://datatracker.ietf.org/doc/html/rfc6901 page 4.
    const expectedResult = [
      "foo.bar",
      "",
      "[a/b]",
      "[c%d]",
      "[e^f]",
      "[g|h]",
      "[i\\j]",
      "[k\"l]",
      "[ ]",
      "[m~n]",
    ];
    expect(result).toStrictEqual(expectedResult);
    expect(result2).toStrictEqual(expectedResult);
  });
});
describe("createJsonPathScope", () => {
  test("returns for the same json path always the exact same output", () => {
    const test1 = "testingOut.me[2]";
    const test2 = "testingOut[me][2]";
    const test3 = "testingOut[me].2";
    const test4 = "testingOut.me.2";
    const test5 = "[testingOut][me][2]";

    const result = [test1, test2, test3, test4, test5].map((str) => createJsonPathScope(str));
    const result2 = [test1, test2, test3, test4, test5].map((str) => createJsonPathScope(str, "array"));

    expect(result).toStrictEqual(new Array(5).fill("testingOut.me[2]"));
    expect(result2).toStrictEqual(new Array(5).fill(["testingOut", "me", "2"]));
  });
  test("returns numeric output when set to true as output and output is array", () => {
    expect(createJsonPathScope("test[bar/dd][1]", "array", { formatDigitAsNumber: true })).toStrictEqual(["test", "bar/dd", 1]);
  });
  test("returns square bracket notation for objects with special characters", () => {
    const findArr = [
      "foo",
      "foo.0",
      "foo[0aa]",
      "foo[0]",
      // "foo.0]", TODO: this input is currently incorrectly parsed!
      "foo.01",
      "",
      "a/b",
      "c%d",
      "e^f",
      "g|h",
      "i\\j",
      "k\"l",
      " ",
      "m~n",
    ];

    const result = findArr.map((str) => createJsonPathScope(str, "string"));

    expect(result).toStrictEqual([
      "foo",
      "foo[0]",
      "foo[0aa]", // TODO: triple check whether dot-notation can be used on this one as well
      "foo[0]",
      // "foo[0]]",
      "foo[01]",
      "",
      "[a/b]",
      "[c%d]",
      "[e^f]",
      "[g|h]",
      "[i\\j]",
      "[k\"l]",
      "[ ]",
      "[m~n]",
    ]);
  });
  describe("with jsonb", () => {
    test("returns a normalized path reference if a jsonb path is specified as string", () => {
      const test1 = "testingOut:me[2]";
      const test2 = "testingOut:[me].2";
      const test3 = "testingOut:me.2";
      // const test4 = "[testingOut]:[me][2]"; // Future todo: support wrong jsonb syntax. Not a priority at the time of coding.

      const result = [test1, test2, test3].map((str) => createJsonPathScope(str));

      expect(result).toStrictEqual(new Array(3).fill("testingOut.me[2]"));
    });
    test("returns a normalized path reference as array if a jsonb path is specified", () => {
      const test1 = "testingOut:me[2]";
      const test2 = "testingOut:[me].2";
      const test3 = "testingOut:me.2";

      const result = [test1, test2, test3].map((str) => createJsonPathScope(str, "array"));

      expect(result).toStrictEqual(new Array(3).fill(["testingOut", "me", "2"]));
    });
  });
});
