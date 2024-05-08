import { test, expect, beforeAll, afterAll } from "bun:test";
import { TextServer } from "../utils/test-server";
import { LifeConfig } from "../../src/life-config";
import { HTTPSource } from "../../src/sources/http-source";

const sumEtag = async (body: unknown) => {
  return JSON.stringify(
    Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-1",
          new TextEncoder().encode(JSON.stringify(body)),
        ),
      ),
      (chart) => chart.toString(16).padStart(2, "0"),
    ).join(""),
  );
};

test("should connect with server", async () => {
  const testServer = await new TextServer().start();
  const abortController = new AbortController();
  await using _ = {
    async [Symbol.asyncDispose]() {
      abortController.abort();
      await testServer.stop();
    },
  };
  // using spyRequests = textServer.spyRequests();
  testServer.response(async () => Response.json({ level: "default" }));

  const lifeConfig = await LifeConfig.create<{ level: string }>(
    new HTTPSource(await testServer.url()),
    { signal: abortController.signal },
  );

  expect(lifeConfig.state).toEqual({ level: "default" });
});

test("should work with cache state", async () => {
  const testServer = await new TextServer().start();
  const wait2Response = Promise.withResolvers<null>();
  const debugRequests: any[] = [];
  const unListener = testServer.subscribeDebug((val) => {
    debugRequests.push(val);
    if (debugRequests.length >= 2) wait2Response.resolve();
  });
  const abortController = new AbortController();
  await using _ = {
    async [Symbol.asyncDispose]() {
      abortController.abort();
      unListener();
      await testServer.stop();
    },
  };

  let body = { level: "default" };

  testServer.response(async (req) => {
    const bodyEtag = await sumEtag(body);
    const etag = req.headers.get("if-none-match");
    if (etag === bodyEtag) {
      return Response.json(null, { status: 304, headers: { ETag: bodyEtag } });
    }
    return Response.json(body, {
      headers: {
        ETag: bodyEtag,
      },
    });
  });

  const lifeConfig = await LifeConfig.create<{ level: string }>(
    new HTTPSource(await testServer.url()),
    { signal: abortController.signal },
  );

  await lifeConfig.load();
  await wait2Response.promise;

  expect(debugRequests.at(0).response.status).toEqual(200);
  expect(debugRequests.at(1).response.status).toEqual(304);
});
