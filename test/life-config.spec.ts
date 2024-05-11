import { test, expect } from "bun:test";
import type { Source } from "../src/dtos/source";
import { LifeConfig } from "../src/life-config";

const source: Source<{ level: string }> = {
  load: async () => ({ level: "foo" }),
  [Symbol.asyncIterator]: () => ({
    next: () => Promise.withResolvers<any>().promise,
  }),
};

test("should catch if not ready the life-config", async () => {
  const lifeConfig = new LifeConfig(source);

  expect(() => {
    console.log(lifeConfig.state.get().level);
  }).toThrow();
});

test("should get state with a computed function", async () => {
  const lifeConfig = await LifeConfig.create(source);

  const level = lifeConfig.state.computed((state) => state.level);

  expect(level.get()).toEqual("foo");
});
