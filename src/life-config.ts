import type { Session } from "./dtos/session.js";
import type { Source } from "./dtos/source.js";
import { generateSID } from "./utils/generate-sid.js";
import { onceFn, type OnceFn } from "./utils/once-fn.js";
import { Subscriptor } from "./utils/subscriptor.js";

export type LifeConfigOptions = {
  signal?: AbortSignal;
  session?: Session;
};

export class LifeConfig<T> {
  memory: null | { state: T } = null;
  promiseReady = Promise.withResolvers<null>();
  listeners = new Set<(state: T) => void>();
  session: Session = {
    sid: generateSID(),
  };
  subscriptorSource: Subscriptor<T>;
  onceSubscriptionToSource: OnceFn;

  constructor(
    private source: Source<T>,
    private options?: LifeConfigOptions,
  ) {
    this.session = {
      ...this.session,
      ...options?.session,
    };
    this.subscriptorSource = Subscriptor.fromSource<T>(
      source,
      () => this.session,
    );
    this.onceSubscriptionToSource = onceFn(() => {
      this.subscriptorSource.subscribe(async (state) => {
        this.updateState(state);
      });
    });
  }

  async stop() {
    this.subscriptorSource.stop();
    await this.source[Symbol.asyncDispose]?.();
  }

  async [Symbol.asyncDispose]() {
    await this.stop();
  }

  private updateState(newState: T) {
    this.memory = { state: newState };
    this.promiseReady.resolve(null);
    this.listeners.forEach((listener) => listener(newState));
  }

  async getState() {
    await this.wait;
    return this.state.get();
  }

  get state() {
    const get = () => {
      if (this.memory === null) throw new Error(`Life config is not ready`);
      return this.memory.state;
    };

    const computed = <R>(transform: (state: T) => R) => ({
      get: () => transform(get()),
    });

    return {
      get,
      computed,
    };
  }

  async load() {
    const state = await this.source.load(this.session);
    this.updateState(state);
  }

  /**
   * @example
   * await new LifeConfig(new FileSource("config.json")).wait();
   */
  async wait() {
    this.onceSubscriptionToSource();
    await this.promiseReady.promise;
    return this;
  }

  async subscribe(cb: (state: T) => void) {
    await this.wait();
    const state = await this.getState();
    cb(state);
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
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
