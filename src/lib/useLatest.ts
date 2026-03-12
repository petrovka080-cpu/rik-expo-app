import { useEffect, useRef } from "react";

export function useLatest<T>(value: T) {
  const ref = useRef(value);
  // Keep the ref fresh during the same render cycle so event handlers
  // can read the newest snapshot without waiting for an effect flush.
  ref.current = value;
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
