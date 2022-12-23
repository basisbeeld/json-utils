import { convertJsonPathIntoJsonPointerPath } from "../jsonPointerPath";

describe("convertJsonPathIntoJsonPointerPath", () => {
  test("returns the correct json pointer path for valid json paths", () => {
    const test1 = "foo.bar";
    const test2 = "";
    const test3 = "[a/b]";
    const test4 = "[c%d]";
    const test5 = "e^f";
    const test6 = "g|h";
    const test7 = "i\\j";
    const test8 = "k\"l";
    const test9 = " ";
    const test10 = "m~n";

    const result = [test1, test2, test3, test4, test5, test6, test7, test8, test9, test10].map((str) => convertJsonPathIntoJsonPointerPath(str));

    // Solutions retrieved from https://datatracker.ietf.org/doc/html/rfc6901 page 4.
    expect(result).toStrictEqual([
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
    ]);
  });
  test("returns the correct json pointer path for valid json paths arrays", () => {
    const test1 = ["foo", "bar"];
    const test2 = [""];
    const test3 = ["a/b"];
    const test4 = ["c%d"];
    const test5 = ["e^f"];
    const test6 = ["g|h"];
    const test7 = ["i\\j"];
    const test8 = ["k\"l"];
    const test9 = [" "];
    const test10 = ["m~n"];

    const result = [test1, test2, test3, test4, test5, test6, test7, test8, test9, test10].map((str) => convertJsonPathIntoJsonPointerPath(str, "string"));

    // Solutions retrieved from https://datatracker.ietf.org/doc/html/rfc6901 page 4.
    expect(result).toStrictEqual([
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
    ]);
  });
  test("returns the correct json pointer path as array for valid json paths arrays", () => {
    const test1 = ["foo", "bar"];
    const test2 = [""];
    const test3 = ["a/b"];
    const test4 = ["c%d"];
    const test5 = ["e^f"];
    const test6 = ["g|h"];
    const test7 = ["i\\j"];
    const test8 = ["k\"l"];
    const test9 = [" "];
    const test10 = ["m~n"];

    const result = [test1, test2, test3, test4, test5, test6, test7, test8, test9, test10].map((str) => convertJsonPathIntoJsonPointerPath(str, "inherit"));

    // Solutions retrieved from https://datatracker.ietf.org/doc/html/rfc6901 page 4.
    expect(result).toStrictEqual([
      ["foo", "bar"],
      [],
      ["a~1b"],
      ["c%d"],
      ["e^f"],
      ["g|h"],
      ["i\\j"],
      ["k\"l"],
      [" "],
      ["m~0n"],
    ]);
  });
  test("formats a digit within a json pointer as a number in output is array", () => {
    expect(convertJsonPathIntoJsonPointerPath("test[1]", "array", { formatDigitAsNumber: true })).toStrictEqual(["test", 1]);
  });
});
