import * as fs from "fs/promises";
import { test, expect } from "bun:test";
import { LifeConfig } from "../src/life-config";
import { FileSource } from "../src/sources/file-source";

test("should watch changes", async () => {
  const configFile = new URL("config.json", import.meta.url);

  await fs.writeFile(configFile, JSON.stringify({ prefixLog: "log" }));

  const lifeConfig = await LifeConfig.create(
    new FileSource<{ prefixLog: string }>(configFile),
  );

  let newState = Promise.withResolvers();

  lifeConfig.subscribe((state) => newState.resolve(state.prefixLog));

  expect(await newState.promise).toEqual("log");
  newState = Promise.withResolvers();

  await fs.writeFile(configFile, JSON.stringify({ prefixLog: "super-log" }));

  expect(await newState.promise).toEqual("super-log");
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
