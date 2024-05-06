export interface Source<T> {
  [Symbol.asyncIterator]: () => AsyncIterableIterator<any>;
  load(): Promise<T>;
}
