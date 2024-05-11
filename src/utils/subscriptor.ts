import type { Source } from "../dtos/source.js";
import { EventsSystem } from "./events-system.js";

export type Subscription = {
  (): void;
  unsubscribe: Subscription;
} & Disposable;

export type CbSubscription<T> = (value: T) => Promise<any>;

export class Subscriptor<T> {
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
