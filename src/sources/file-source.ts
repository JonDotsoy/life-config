import * as fs from "fs/promises";
import type { Source } from "../dtos/source";

export class FileSource<T> implements Source<T> {
  constructor(private file: string | { toString(): string }) {}

  async load(): Promise<T> {
    return JSON.parse(await fs.readFile(new URL(this.file), "utf-8"));
  }

  async *[Symbol.asyncIterator]() {
    for await (const event of fs.watch(new URL(this.file).pathname)) {
      yield event;
    }
  }
}
