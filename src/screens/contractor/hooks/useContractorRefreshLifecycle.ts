import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useFocusEffect } from "expo-router";

export function useContractorRefreshLifecycle(params: {
  focusedRef: MutableRefObject<boolean>;
  lastKickRef: MutableRefObject<number>;
  reloadContractorScreenData: () => Promise<void>;
  setRefreshing: Dispatch<SetStateAction<boolean>>;
}) {
  const {
    focusedRef,
    lastKickRef,
    reloadContractorScreenData,
    setRefreshing,
  } = params;

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;

      const now = Date.now();
      if (now - lastKickRef.current > 900) {
        lastKickRef.current = now;
        (async () => {
          await reloadContractorScreenData();
        })();
      }

      return () => {
        focusedRef.current = false;
      };
    }, [focusedRef, lastKickRef, reloadContractorScreenData]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reloadContractorScreenData();
    } finally {
      setRefreshing(false);
    }
  }, [setRefreshing, reloadContractorScreenData]);

  return { handleRefresh };
}
