import { TestServer } from "../../test-server.js";

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

export const testServerBehaviorRequestByStatusCacheable = async () => {
  const ctx = {
    testServer: await new TestServer().start(),
    state: {},
    async [Symbol.asyncDispose]() {
      await ctx.testServer[Symbol.asyncDispose]();
    },
  };

  ctx.testServer.response(async (req) => {
    const bodyEtag = await sumEtag(ctx.state);
    const clientIfNoneMatch = req.headers.get("if-none-match");
    if (clientIfNoneMatch === bodyEtag) {
      return Response.json(null, { status: 304, headers: { ETag: bodyEtag } });
    }
    return Response.json(ctx.state, {
      headers: {
        ETag: bodyEtag,
      },
    });
  });

  return ctx;
};
