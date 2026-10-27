import { useDeferredValue } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  void delayMs;
  return useDeferredValue(value);
}
