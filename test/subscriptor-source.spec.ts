import { test, expect } from "bun:test";
import { atom } from "nanostores";
import { SubscriptorSource } from "../src/sources/subscriptor-source.js";
import { LifeConfig } from "../src/life-config";

test("should create a lifeconfig with SubscriptorSource", async () => {
  const config = atom({ logLevel: "info" });
  const waitingChangeState = Promise.withResolvers();

  const lifeConfig = await LifeConfig.create(new SubscriptorSource(config));

  expect(await lifeConfig.getState()).toEqual({ logLevel: "info" });

  lifeConfig.subscribe((state) => {
    if (state.logLevel === "verbose") waitingChangeState.resolve();
  });

  config.set({ logLevel: "verbose" });
  await waitingChangeState.promise;
  expect(await lifeConfig.getState()).toEqual({ logLevel: "verbose" });
});
