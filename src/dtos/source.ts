import type { Session } from "./session.js";

export type Source<T> = {
  load(session: Session): Promise<T>;
} & Partial<AsyncDisposable> &
  AsyncIterable<any>;
