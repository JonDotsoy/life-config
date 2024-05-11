export class EventsSystem<N extends string = string> {
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
