import type { Source } from "./dtos/source.js";

export class LifeConfig<T> {
  bootstrappingProcess: Promise<void>;
  watchingProcess: null | Promise<void> = null;
  state: null | T = null;
  serviceReady = Promise.withResolvers<null>();
  subs = new Set<(state: T) => void>();

  constructor(private source: Source<T>) {
    this.bootstrappingProcess = this.bootstrap();
  }

  async bootstrap() {
    await this.load();
    this.watchingProcess = this.startWatcher();
  }

  async startWatcher() {
    for await (const event of this.source) {
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

  static create<T>(source: Source<T>) {
    return new LifeConfig(source).wait();
  }
}
