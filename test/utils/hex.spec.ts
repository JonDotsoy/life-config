import { test, expect } from "bun:test";
import * as hex from "../../src/utils/hex.js";

test("should transform string to hex", () => {
  expect(hex.stringToHex("hello")).toEqual("68656c6c6f");
});
