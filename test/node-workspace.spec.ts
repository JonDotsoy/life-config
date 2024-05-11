import { URL } from "url";
import { test, beforeAll, expect, describe } from "bun:test";
import * as fs from "fs/promises";
import { useWorkspace } from "use-workspace";
import { useNpmPack } from "use-workspace/use-npm-pack";
import { readableStreamToText } from "bun";

const enableTestE2E = !!process.env.ABLE_E2E_TESTS;

describe.if(enableTestE2E)("Node Environment", async () => {
  const jsEnginesRc = new URL(".js_engines.json", import.meta.url);
  const getJSEngines = async (): Promise<Record<string, string>> => {
    const exists = await fs.exists(jsEnginesRc);
    const stat = exists ? await fs.stat(jsEnginesRc) : null;
    const isFile = stat?.isFile() ?? false;
    return isFile ? JSON.parse(await fs.readFile(jsEnginesRc, "utf-8")) : [];
  };

  const workspace = await useWorkspace("default", {
    cleanBefore: true,
    template: new URL("usage_samples/", import.meta.url),
  });
  const jsEngines = await getJSEngines();

  beforeAll(async () => {
    const packWorkspace = await useWorkspace(new URL("../", import.meta.url));
    const packLocation = await useNpmPack(packWorkspace, [
      "package.json",
      "src/**/*",
    ]);

    await fs.writeFile(new URL("package.json", workspace.location), `{}`);
    await workspace.exec({
      cmd: [
        "npm",
        "install",
        "--omit",
        "dev",
        "--omit",
        "peer",
        new URL(packLocation).pathname,
      ],
    });
  });

  for (const [engineName, enginePath] of Object.entries(jsEngines)) {
    test.if(enableTestE2E)(
      `${engineName}: should import the import("life-config").LifeConfig`,
      async () => {
        await workspace.exec({ cmd: ["npm", "pkg", "set", "type=commonjs"] });
        const process = await workspace.exec({
          cmd: [enginePath, "script1.js"],
        });
        if (process.exitCode !== 0) {
          console.error(`Expect exit code 0 but receive ${process.exitCode}`);
          console.error(await readableStreamToText(process.stdout));
        }
      },
    );

    test.if(enableTestE2E)(
      `${engineName}: should import the import("life-config/sources/http-source").HTTPSource`,
      async () => {
        await workspace.exec({ cmd: ["npm", "pkg", "set", "type=commonjs"] });
        const process = await workspace.exec({
          cmd: [enginePath, "script2.js"],
        });
        if (process.exitCode !== 0) {
          console.error(`Expect exit code 0 but receive ${process.exitCode}`);
          console.error(await readableStreamToText(process.stdout));
        }
      },
    );

    test.if(enableTestE2E)(
      `${engineName}: should import the module life-config with esm`,
      async () => {
        await workspace.exec({ cmd: ["npm", "pkg", "set", "type=module"] });
        const process = await workspace.exec({
          cmd: [enginePath, "script3.js"],
        });
        if (process.exitCode !== 0) {
          console.error(`Expect exit code 0 but receive ${process.exitCode}`);
          console.error(await readableStreamToText(process.stdout));
        }
      },
    );

    test.if(enableTestE2E)(
      `${engineName}: should import the module life-config with esm`,
      async () => {
        await workspace.exec({ cmd: ["npm", "pkg", "set", "type=module"] });
        const process = await workspace.exec({
          cmd: [enginePath, "script4.js"],
        });
        if (process.exitCode !== 0) {
          console.error(`Expect exit code 0 but receive ${process.exitCode}`);
          console.error(await readableStreamToText(process.stdout));
        }
      },
    );
  }
});
