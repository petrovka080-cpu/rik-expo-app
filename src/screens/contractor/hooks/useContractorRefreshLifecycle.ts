import { useCallback, useEffect, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useFocusEffect } from "expo-router";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../../../lib/observability/platformGuardDiscipline";
import type { ContractorReloadTrigger } from "./useContractorScreenData";

const CONTRACTOR_FOCUS_REFRESH_MIN_INTERVAL_MS = 1200;

export function useContractorRefreshLifecycle(params: {
  supabaseClient: any;
  focusedRef: MutableRefObject<boolean>;
  lastKickRef: MutableRefObject<number>;
  reloadContractorScreenData: (trigger?: ContractorReloadTrigger) => Promise<void>;
  setRefreshing: Dispatch<SetStateAction<boolean>>;
}) {
  const {
    supabaseClient,
    focusedRef,
    lastKickRef,
    reloadContractorScreenData,
    setRefreshing,
  } = params;

  const [authReady, setAuthReady] = useState(false);
  const [focusEpoch, setFocusEpoch] = useState(0);

  useEffect(() => {
    let alive = true;

    const syncAuth = async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        if (!alive) return;
        setAuthReady(Boolean(data?.session?.user));
      } catch {
        if (!alive) return;
        setAuthReady(false);
      }
    };

    void syncAuth();

    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event: string, session: { user?: unknown } | null) => {
      if (!alive) return;
      setAuthReady(Boolean(session?.user));
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [supabaseClient]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      setFocusEpoch((value) => value + 1);

      return () => {
        focusedRef.current = false;
      };
    }, [focusedRef]),
  );

  useEffect(() => {
    if (!focusedRef.current || !authReady) return;

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
      return;
    }

    lastKickRef.current = now;
    void reloadContractorScreenData("focus");
  }, [authReady, focusEpoch, focusedRef, lastKickRef, reloadContractorScreenData]);

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
