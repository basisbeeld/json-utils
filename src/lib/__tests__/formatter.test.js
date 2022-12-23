import { formatJsonPath } from "../formatter";

describe("formatJsonPath", () => {
  test("returns for the same path reference (as string) always the exact same result", () => {
    const test1 = "testingOut.me[2]";
    const test2 = "testingOut[me][2]";
    const test3 = "testingOut[me].2";
    const test4 = "testingOut.me.2";
    const test5 = "[testingOut][me][2]";

    const result = [test1, test2, test3, test4, test5].map((str) => formatJsonPath(str));

    expect(result).toStrictEqual(new Array(5).fill("testingOut.me[2]"));
  });
  test("returns a path reference as array if a path as string is specified", () => {
    const test1 = "testingOut.me[2]";
    const test2 = "testingOut[me][2]";
    const test3 = "testingOut[me].2";
    const test4 = "testingOut.me.2";
    const test5 = "[testingOut][me][2]";

    const result = [test1, test2, test3, test4, test5].map((str) => formatJsonPath(str, "array"));

    expect(result).toStrictEqual(new Array(5).fill(["testingOut", "me", "2"]));
  });
  test("returns a path reference as array if a path as string is specified", () => {
    const test1 = ["testingOut", "me", "2"];

    const otherPathTest1 = ["testingOut", ".me", "[2]"];
    const otherPathTest2 = ["testingOut", "[me]", "[2]"];
    const otherPathTest3 = ["testingOut", "[me]", ".2"];
    const otherPathTest4 = ["testingOut", ".me", ".2"];
    const otherPathTest5 = ["[testingOut]", "[me]", "[2]"];

    const result = [test1].map((str) => formatJsonPath(str, "string"));
    const resultOtherPath = [otherPathTest1, otherPathTest2, otherPathTest3, otherPathTest4, otherPathTest5].map((str) => formatJsonPath(str, "string"));

    expect(result).toStrictEqual(new Array(1).fill("testingOut.me[2]"));
    expect(resultOtherPath).not.toStrictEqual(new Array(5).fill("testingOut.me[2]"));
  });
  test("returns a path reference as string if a path as array is specified", () => {
    const test1 = ["testingOut", "me", "2"];

    const otherPathTest1 = ["testingOut", ".me", "[2]"];
    const otherPathTest2 = ["testingOut", "[me]", "[2]"];
    const otherPathTest3 = ["testingOut", "[me]", ".2"];
    const otherPathTest4 = ["testingOut", ".me", ".2"];
    const otherPathTest5 = ["[testingOut]", "[me]", "[2]"];

    const result = [test1].map((str) => formatJsonPath(str, "array"));
    const resultOtherPath = [otherPathTest1, otherPathTest2, otherPathTest3, otherPathTest4, otherPathTest5].map((str) => formatJsonPath(str, "array"));

    expect(result).toStrictEqual(new Array(1).fill(["testingOut", "me", "2"]));
    expect(resultOtherPath).not.toStrictEqual(new Array(5).fill(["testingOut", "me", "2"]));
  });
  test("returns digits as numbers when specified as option and output is array", () => {
    expect(formatJsonPath("test[bar/dd][1]", "array", { formatDigitAsNumber: true })).toStrictEqual(["test", "bar/dd", 1]);
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

    // TODO: also "test[foo[bar/dd]]" does not work!

    const result = findArr.map((str) => formatJsonPath(str, "string"));

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
});
