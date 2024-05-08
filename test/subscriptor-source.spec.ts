import { test, expect } from "bun:test";
import { atom } from "nanostores";
import { SubscriptorSource } from "../src/sources/subscriptor-source.js";
import { LifeConfig } from "../src/life-config";

test("should create a lifeconfig with SubscriptorSource", async () => {
  const config = atom({ logLevel: "info" });

  const lifeConfig = await LifeConfig.create(new SubscriptorSource(config));

  expect(lifeConfig.state).toEqual({ logLevel: "info" });
  config.set({ logLevel: "verbose" });
  await new Promise((r) => setTimeout(r, 100));
  expect(lifeConfig.state).toEqual({ logLevel: "verbose" });
});
