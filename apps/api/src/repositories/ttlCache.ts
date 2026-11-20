/** Simple in-process TTL cache for bulk Sheets reads. */
export class TtlCache<T> {
  private value: T | undefined;
  private loadedAt = 0;

  constructor(private readonly ttlMs: number) {}

  get(): T | undefined {
    if (this.value === undefined) return undefined;
    if (Date.now() - this.loadedAt > this.ttlMs) {
      this.value = undefined;
      return undefined;
    }
    return this.value;
  }

  set(value: T): void {
    this.value = value;
    this.loadedAt = Date.now();
  }

  invalidate(): void {
    this.value = undefined;
    this.loadedAt = 0;
  }
}
