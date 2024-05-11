import { test, expect, beforeAll, afterAll } from "bun:test";
import { TestServer, type RequestResponseDebug } from "../utils/test-server.js";
import { LifeConfig } from "../../src/life-config.js";
import { HTTPSource } from "../../src/sources/http-source.js";
import { testServerBehaviorRequestByStatusCacheable } from "../utils/test-server/behavior/request-by-status-cacheable.js";

test("should connect with server", async () => {
  await using testServerBehavior =
    await testServerBehaviorRequestByStatusCacheable();
  const testServer = testServerBehavior.testServer;

  testServerBehavior.state = { level: "default" };

  const lifeConfig = await LifeConfig.create<{ level: string }>(
    new HTTPSource(await testServer.url()),
  );

  expect(await lifeConfig.getState()).toEqual({ level: "default" });
});

test("should work with cache state", async () => {
  await using testServerBehavior =
    await testServerBehaviorRequestByStatusCacheable();
  const testServer = testServerBehavior.testServer;
  const wait2Response = Promise.withResolvers<null>();

  const debugRequests: any[] = [];
  using _unListener = testServer.subscribeDebug((val) => {
    debugRequests.push(val);
    if (debugRequests.length >= 2) wait2Response.resolve();
  });

  await using lifeConfig = await LifeConfig.create<{ level: string }>(
    new HTTPSource(await testServer.url()),
  );

  await lifeConfig.load();
  await wait2Response.promise;

  expect(debugRequests.at(0).response.status).toEqual(200);
  expect(debugRequests.at(1).response.status).toEqual(304);
});

test("should send session data on headers", async () => {
  await using testServerBehavior =
    await testServerBehaviorRequestByStatusCacheable();
  const testServer = testServerBehavior.testServer;

  const debugRequests: RequestResponseDebug[] = [];
  using _unListener = testServer.subscribeDebug((val) => {
    debugRequests.push(val);
  });

  await using lifeConfig = await LifeConfig.create<{ level: string }>(
    new HTTPSource(await testServer.url()),
    {
      session: {
        foo: "biz",
      },
    },
  );

  const firstRequest = debugRequests.at(0)!;
  expect(firstRequest).not.toBeUndefined();
  expect(firstRequest.request.header["x-life-config-sid"]).toMatch(
    /^\w+\.\w+$/,
  );
  expect(firstRequest.request.header["x-life-config-foo"]).toMatch("biz");
});
