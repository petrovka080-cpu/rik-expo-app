const globalScope = globalThis as typeof globalThis & {
  WeakRef?: typeof WeakRef;
};

if (typeof globalScope.WeakRef === "undefined") {
  class WeakRefPolyfill<T extends object> {
    private readonly value: T;

    constructor(value: T) {
      this.value = value;
    }

    deref(): T | undefined {
      return this.value;
    }
  }

  globalScope.WeakRef = WeakRefPolyfill as unknown as typeof WeakRef;
}
