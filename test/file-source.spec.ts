import * as fs from "fs/promises";
import { test, expect } from "bun:test";
import { LifeConfig } from "../src/life-config";
import { FileSource } from "../src/sources/file-source";

test("should watch changes", async () => {
  const waitPrefix1 = Promise.withResolvers();
  const waitPrefix2 = Promise.withResolvers();

  const configFile = new URL("config.json", import.meta.url);

  await fs.writeFile(configFile, JSON.stringify({ prefixLog: "log" }));

  const lifeConfig = await LifeConfig.create(
    new FileSource<{ prefixLog: string }>(configFile),
  );

  lifeConfig.subscribe((state) => {
    if (state.prefixLog === "log") waitPrefix1.resolve();
    if (state.prefixLog === "super-log") waitPrefix2.resolve();
  });

  await waitPrefix1.promise;
  expect((await lifeConfig.getState()).prefixLog).toEqual("log");

  await fs.writeFile(configFile, JSON.stringify({ prefixLog: "super-log" }));

  await waitPrefix2.promise;
  expect((await lifeConfig.getState()).prefixLog).toEqual("super-log");
});

test("should wait the first change with subscribe function", async () => {
  const configFile = new URL("config.json", import.meta.url);

  await fs.writeFile(configFile, JSON.stringify({ prefixLog: "log" }));

  const lifeConfig = await LifeConfig.create(
    new FileSource<{ prefixLog: string }>(configFile),
  );

  let prefixLog = "";

  await lifeConfig.subscribe((state) => (prefixLog = state.prefixLog));

  expect(prefixLog).toEqual("log");
});

test("should watch changes with a loop syntax", async () => {
  const states: any[] = [];
  const configFile = new URL("config.json", import.meta.url);

  await fs.writeFile(configFile, JSON.stringify({ prefixLog: "log" }));

  const lifeConfig = await LifeConfig.create(
    new FileSource<{ prefixLog: string }>(configFile),
  );

  const loop = async () => {
    for await (const newState of lifeConfig) {
      states.push(newState);
      if (states.length >= 3) return;
    }
  };
  const loopProgress = loop();

  await fs.writeFile(configFile, JSON.stringify({ prefixLog: "super-log" }));
  await new Promise((r) => setTimeout(r, 100));
  await fs.writeFile(configFile, JSON.stringify({ prefixLog: "mega-log" }));

  await loopProgress;

  expect(states).toEqual([
    {
      prefixLog: "log",
    },
    {
      prefixLog: "super-log",
    },
    {
      prefixLog: "mega-log",
    },
  ]);
});
