import { test, expect } from "bun:test";
import { generateSID } from "../../src/utils/generate-sid.js";

test("should generate a unique id with a format 'w+.w+'", async () => {
  expect(generateSID()).toMatch(/^\w+\.\w+$/);
});

test("should parse a sid", async () => {
  const sid = generateSID();

  const description = generateSID.describe(sid);

  expect(description.date).toBeInstanceOf(Date);
});
