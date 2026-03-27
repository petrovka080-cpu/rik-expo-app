import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useFocusEffect } from "expo-router";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../../../lib/observability/platformGuardDiscipline";

const CONTRACTOR_FOCUS_REFRESH_MIN_INTERVAL_MS = 1200;

export function useContractorRefreshLifecycle(params: {
  focusedRef: MutableRefObject<boolean>;
  lastKickRef: MutableRefObject<number>;
  reloadContractorScreenData: (trigger?: "focus" | "manual" | "activation") => Promise<void>;
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
      if (
        isPlatformGuardCoolingDown({
          lastAt: lastKickRef.current,
          minIntervalMs: CONTRACTOR_FOCUS_REFRESH_MIN_INTERVAL_MS,
          now,
        })
      ) {
        recordPlatformGuardSkip("recent_same_scope", {
          screen: "contractor",
          surface: "screen_reload",
          event: "reload_screen",
          trigger: "focus",
        });
      } else {
        lastKickRef.current = now;
        (async () => {
          await reloadContractorScreenData("focus");
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
      await reloadContractorScreenData("manual");
    } finally {
      setRefreshing(false);
    }
  }, [setRefreshing, reloadContractorScreenData]);

  return { handleRefresh };
}
