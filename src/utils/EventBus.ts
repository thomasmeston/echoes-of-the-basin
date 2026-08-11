type Handler = (...args: unknown[]) => void;

export class EventBus<Events extends Record<string, unknown[]>> {
  private listeners = new Map<keyof Events, Set<Handler>>();

  on<K extends keyof Events>(event: K, handler: (...args: Events[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as Handler);
  }

  off<K extends keyof Events>(event: K, handler: (...args: Events[K]) => void): void {
    this.listeners.get(event)?.delete(handler as Handler);
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    this.listeners.get(event)?.forEach((handler) => handler(...args));
  }
}
