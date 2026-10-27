import { useEffect, useRef, type MutableRefObject } from "react";

export type WarehouseScreenActiveRef = MutableRefObject<boolean>;

export function useWarehouseScreenActiveRef(
  isScreenFocused: boolean,
): WarehouseScreenActiveRef {
  const mountedRef = useRef(true);
  const activeRef = useRef(isScreenFocused);

  activeRef.current = mountedRef.current && isScreenFocused;

  useEffect(
    () => () => {
      mountedRef.current = false;
      activeRef.current = false;
    },
    [],
  );

  return activeRef;
}

export function useWarehouseFallbackActiveRef(
  activeRef?: WarehouseScreenActiveRef,
): WarehouseScreenActiveRef {
  const fallbackRef = useWarehouseScreenActiveRef(true);
  return activeRef ?? fallbackRef;
}

export function isWarehouseScreenActive(
  activeRef?: WarehouseScreenActiveRef,
): boolean {
  return activeRef?.current ?? true;
}
