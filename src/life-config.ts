import type { Session } from "./dtos/session.js";
import type { Source } from "./dtos/source.js";

export type LifeConfigOptions = {
  signal?: AbortSignal;
  session?: Session;
};

// export class SubscribeFunction {
//   #stopped = false;

//   constructor(private cb: () => Promise<void>) { }

//   get stopped() { return this.#stopped }
// }

class IterableSubject {
  #stopped = false;

  constructor(iterable: AsyncIterable<any>) {}
}

class EventsSystem<N extends string = string> {
  events = new Set<N>();
  private cbs: Partial<Record<N, Set<() => any>>> = {};

  on(eventName: N, listener: () => any) {
    const callbackStack = (this.cbs[eventName] ??= new Set());
    callbackStack.add(listener);
  }

  delete(eventName: N, listener: () => any) {
    this.cbs[eventName]?.delete(listener);
  }

  emit(eventName: N) {
    this.cbs[eventName]?.forEach((cb) => cb());
  }
}

type Subscription = {
  (): void;
  unsubscribe: Subscription;
} & Disposable;

type CbSubscription<T> = (value: T) => Promise<any>;

class Subscriptor<T> {
  private callbacks = new Set<CbSubscription<T>>();
  private eventSystem = new EventsSystem<"active" | "desactive">();
  private lastState: null | { state: T } = null;

  // state
  #activated = false;

  get activated() {
    return this.#activated;
  }

  private updateActivated() {
    const activated = Boolean(this.callbacks.size);
    if (this.#activated !== activated) {
      this.#activated = activated;
      this.eventSystem.emit(activated ? "active" : "desactive");
    }
  }

  addOnActive(cb: () => any) {
    this.eventSystem.on("active", cb);
    return () => this.eventSystem.delete("active", cb);
  }

  addOnDesactive(cb: () => any) {
    this.eventSystem.on("desactive", cb);
    return () => this.eventSystem.delete("desactive", cb);
  }

  private async send(value: T) {
    this.lastState = { state: value };
    if (this.activated) {
      for (const cb of this.callbacks) {
        await cb(value).catch((ex) => {
          console.error(ex);
        });
      }
    }
  }

  subscribe(cb: CbSubscription<T>): Subscription {
    if (this.lastState) cb(this.lastState.state);

    this.callbacks.add(cb);

    const unsubscribe = () => {
      this.callbacks.delete(cb);
      this.updateActivated();
    };
    const dispose = () => unsubscribe();

    unsubscribe.unsubscribe = unsubscribe;
    unsubscribe[Symbol.dispose] = dispose;

    this.updateActivated();

    return unsubscribe;
  }

  stop() {
    this.callbacks.forEach((cb) => this.callbacks.delete(cb));
    this.updateActivated();
  }

  static fromSource<T>(source: Source<T>, getSession: () => any) {
    const sub = new Subscriptor<T>();

    let alreadySetup = false;

    const setup = () => {
      if (alreadySetup) return;
      alreadySetup = true;
      source.load(getSession()).then(async (state) => {
        await sub.send(state);
        for await (const _event of source) {
          await sub.send(await source.load(getSession()));
        }
      });
    };

    sub.addOnActive(() => {
      setup();
    });

    return sub;
  }
}

const once = (cb: () => void) => {
  const fn = () => {
    if (fn.ready === false) cb();
  };
  fn.ready = false;
  return fn;
};

export class LifeConfig<T> {
  state: null | { state: T } = null;
  promiseReady = Promise.withResolvers<null>();
  listeners = new Set<(state: T) => void>();
  session: Session = {};
  subscriptorSource: Subscriptor<T>;
  startSubscription: { (): void };

  constructor(
    private source: Source<T>,
    private options?: LifeConfigOptions,
  ) {
    this.session = options?.session ?? {};
    this.subscriptorSource = Subscriptor.fromSource<T>(
      source,
      () => this.session,
    );
    this.startSubscription = once(() => {
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
    this.state = { state: newState };
    this.promiseReady.resolve(null);
    this.listeners.forEach((cb) => cb(newState));
  }

  async getState() {
    await this.wait;
    return this.state!.state;
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
    this.startSubscription();
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
