import type { Source } from "./dtos/source.js";

export type LifeConfigOptions = {
  signal?: AbortSignal;
};

export class LifeConfig<T> {
  bootstrappingProcess: Promise<void>;
  watchingProcess: null | Promise<void> = null;
  state: null | T = null;
  serviceReady = Promise.withResolvers<null>();
  subs = new Set<(state: T) => void>();

  constructor(
    private source: Source<T>,
    private options?: LifeConfigOptions,
  ) {
    this.bootstrappingProcess = this.bootstrap();
  }

  async bootstrap() {
    await this.load();
    this.watchingProcess = this.startWatcher();
  }

  async startWatcher() {
    const originalIterable = this.source[Symbol.asyncIterator]();
    const safeIterable: AsyncIterableIterator<any> = {
      next: async () => {
        const aborted = this.options?.signal?.aborted ?? false;
        if (aborted) return { done: true, value: null };
        const p = Promise.withResolvers<IteratorResult<any>>();
        const abortCb = () => {
          p.resolve({ done: true, value: null });
        };
        this.options?.signal?.addEventListener("abort", abortCb);
        p.resolve(originalIterable.next());
        const r = await p.promise;
        this.options?.signal?.removeEventListener("abort", abortCb);
        return r;
      },
      [Symbol.asyncIterator]: () => safeIterable,
    };

    for await (const event of safeIterable) {
      await this.load();
    }
  }

  async load() {
    const state = await this.source.load();
    this.state = state;
    this.serviceReady.resolve(null);
    this.subs.forEach((cb) => cb(state));
  }

  /**
   * @example
   * const lifeConfig = await createLifeConfig(new FileSource("config.json"));
   */
  async wait() {
    await this.bootstrappingProcess;
    await this.serviceReady.promise;
    return this;
  }

  async subscribe(cb: (state: T) => void) {
    await this.wait();
    cb(this.state!);
    this.subs.add(cb);
    return () => {
      this.subs.delete(cb);
    };
  }

  async *[Symbol.asyncIterator]() {
    let waitChange = Promise.withResolvers<T>();
    this.subscribe((state) => {
      waitChange.resolve(state);
      waitChange = Promise.withResolvers<T>();
    });

    while (true) {
      yield await waitChange.promise;
    }
  }

  static create<T>(source: Source<T>, options?: LifeConfigOptions) {
    return new LifeConfig(source, options).wait();
  }
}
