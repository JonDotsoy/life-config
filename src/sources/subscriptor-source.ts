import type { Source } from "../dtos/source.js";

type Subscriptor<T> = {
  subscribe(cb: (value: T) => void): () => any;
};

export class SubscriptorSource<T> implements Source<T> {
  subsChanges = new Set<() => void>();
  unsubscribe: () => any;
  readyState = Promise.withResolvers<{ current: T }>();
  partialState?: { current: T };

  constructor(subscriptor: Subscriptor<T>) {
    this.unsubscribe = subscriptor.subscribe((value) => {
      this.partialState ??= { current: value };
      this.partialState.current = value;
      this.readyState.resolve(this.partialState);
      this.subsChanges.forEach((cb) => cb());
    });
  }

  async load(): Promise<T> {
    const state = await this.readyState.promise;
    return state.current;
  }

  [Symbol.asyncIterator]() {
    const e: AsyncIterableIterator<any> = {
      next: async () => {
        await this.nextChange();
        return {
          value: null,
        };
      },
      [Symbol.asyncIterator]: () => e,
    };
    return e;
  }

  async nextChange() {
    const p = Promise.withResolvers<null>();
    const cb = () => p.resolve(null);
    this.subsChanges.add(cb);
    await p.promise;
    this.subsChanges.delete(cb);
  }
}
