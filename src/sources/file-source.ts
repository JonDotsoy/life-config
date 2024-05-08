import * as fs from "fs/promises";
import type { Source } from "../dtos/source";

export type FileSourceOptions<T> = {
  deserialize?: (payload: string) => Promise<T>;
};

export const defaultFileSourceOptions = {
  deserialize: async (payload: string) => JSON.parse(payload),
};

export class FileSource<T> implements Source<T> {
  readonly abortController = new AbortController();
  readonly options: Required<FileSourceOptions<T>>;

  constructor(
    private file: string | { toString(): string },
    options?: FileSourceOptions<T>,
  ) {
    this.options = {
      ...options,
      ...defaultFileSourceOptions,
    };
  }

  async load(): Promise<T> {
    return await this.options.deserialize(
      await fs.readFile(new URL(this.file), "utf-8"),
    );
  }

  async *[Symbol.asyncIterator]() {
    for await (const event of fs.watch(new URL(this.file).pathname)) {
      yield event;
    }
  }
}
