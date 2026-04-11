import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  recordOfficeWarehouseRuntimeStateWriteAccepted,
  recordOfficeWarehouseRuntimeStateWriteSkipped,
} from "../../../lib/navigation/officeReentryBreadcrumbs";
import {
  loadStoredFioState,
  saveStoredFioState,
} from "../../../lib/storage/fioPersistence";
import { useWarehouseUiStore } from "../warehouseUi.store";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

type UseWarehousemanFioArgs = {
  getTodaySixAM: () => Date;
  isScreenFocused: boolean;
  screenActiveRef?: WarehouseScreenActiveRef;
  onError?: (e: unknown) => void;
};

type UseWarehousemanFioResult = {
  warehousemanFio: string;
  warehousemanHistory: string[];
  isFioConfirmVisible: boolean;
  isFioLoading: boolean;
  setIsFioConfirmVisible: (value: boolean) => void;
  handleFioConfirm: (fio: string) => Promise<void>;
};

const CONFIRM_TS_KEY = "wh_warehouseman_confirm_ts";
const WAREHOUSEMAN_HISTORY_KEY = "wh_warehouseman_history_v1";

const logSuppressedPostUnmount = (scope: string, details?: Record<string, unknown>) => {
  console.info(`[warehouse:${scope}] suppressed post-unmount`, details);
};

export function useWarehousemanFio({
  getTodaySixAM,
  isScreenFocused,
  screenActiveRef: externalScreenActiveRef,
  onError,
}: UseWarehousemanFioArgs): UseWarehousemanFioResult {
  const screenActiveRef = useWarehouseFallbackActiveRef(externalScreenActiveRef);
  const [warehousemanFio, setWarehousemanFio] = useState("");
  const [warehousemanHistory, setWarehousemanHistory] = useState<string[]>([]);
  const isFioConfirmVisible = useWarehouseUiStore((state) => state.isFioConfirmVisible);
  const setIsFioConfirmVisible = useWarehouseUiStore((state) => state.setIsFioConfirmVisible);
  const [isFioLoading, setIsFioLoading] = useState(false);
  const mountedRef = useRef(true);
  const focusedRef = useRef(isScreenFocused);
  focusedRef.current = isScreenFocused;

  const getCommitSkipReason = useCallback(() => {
    if (!mountedRef.current || !isWarehouseScreenActive(screenActiveRef)) return "after_unmount";
    if (!focusedRef.current) return "after_blur";
    return "inactive_scope";
  }, [screenActiveRef]);

  const canCommit = useCallback(
    () => mountedRef.current && focusedRef.current && isWarehouseScreenActive(screenActiveRef),
    [screenActiveRef],
  );

  const recordStateWriteAccepted = useCallback(
    (writeTarget: string, source: string) => {
      recordOfficeWarehouseRuntimeStateWriteAccepted({
        owner: "warehouseman_fio",
        route: "/office/warehouse",
        writeTarget,
        source,
      });
    },
    [],
  );

  const recordStateWriteSkipped = useCallback(
    (
      writeTarget: string,
      source: string,
      reason = getCommitSkipReason(),
      extra?: Record<string, unknown>,
    ) => {
      recordOfficeWarehouseRuntimeStateWriteSkipped({
        owner: "warehouseman_fio",
        route: "/office/warehouse",
        writeTarget,
        source,
        reason,
        ...(extra ?? {}),
      });
    },
    [getCommitSkipReason],
  );

  useEffect(() => {
    return () => {
      focusedRef.current = false;
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const {
          currentFio,
          history,
        } = await loadStoredFioState({
          screen: "warehouse",
          surface: "warehouseman_fio",
          keys: {
            currentKey: "wh_warehouseman_fio",
            confirmKey: CONFIRM_TS_KEY,
            historyKey: WAREHOUSEMAN_HISTORY_KEY,
          },
        });

        if (!active || !canCommit()) {
          recordStateWriteSkipped("bootstrap_state", "mount_bootstrap");
          logSuppressedPostUnmount("warehousemanFio.bootstrap", {
            source: "mount_bootstrap",
          });
          return;
        }

        if (currentFio) setWarehousemanFio(currentFio);
        setWarehousemanHistory(history);
        recordStateWriteSkipped(
          "bootstrap_state",
          "mount_bootstrap",
          "mount_bootstrap_local_only",
          {
            visibleScope: "local_state",
            skippedScope: "shared_store",
          },
        );
      } catch (e) {
        if (__DEV__) {
          console.warn("[warehousemanFio] load failed", e);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [
    canCommit,
    recordStateWriteSkipped,
  ]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const checkFio = async () => {
        try {
          const { lastConfirmIso } = await loadStoredFioState({
            screen: "warehouse",
            surface: "warehouseman_fio",
            keys: {
              currentKey: "wh_warehouseman_fio",
              confirmKey: CONFIRM_TS_KEY,
              historyKey: WAREHOUSEMAN_HISTORY_KEY,
            },
          });
          if (!active || !canCommit()) {
            recordStateWriteSkipped("focus_confirm_visible", "focus_check");
            logSuppressedPostUnmount("warehousemanFio.focusCheck", {
              source: "focus_check",
            });
            return;
          }
          const sixAM = getTodaySixAM();
          const lastConfirm = lastConfirmIso ? new Date(lastConfirmIso) : null;
          if (!lastConfirm || lastConfirm < sixAM) {
            setIsFioConfirmVisible(true);
            recordStateWriteAccepted("focus_confirm_visible", "focus_check");
          }
        } catch (e) {
          if (active && canCommit()) {
            onError?.(e);
          }
        }
      };
      void checkFio();
      return () => {
        active = false;
      };
    }, [
      canCommit,
      getTodaySixAM,
      onError,
      recordStateWriteAccepted,
      recordStateWriteSkipped,
      setIsFioConfirmVisible,
    ]),
  );

  const handleFioConfirm = useCallback(
    async (fio: string) => {
      if (!canCommit()) {
        recordStateWriteSkipped("confirm_loading", "confirm_submit");
        return;
      }
      setIsFioLoading(true);
      try {
        if (!canCommit()) {
          recordStateWriteSkipped("confirm_state", "confirm_submit");
          logSuppressedPostUnmount("warehousemanFio.confirm", {
            source: "confirm_submit",
            stage: "start",
          });
          return;
        }
        setWarehousemanFio(fio);
        const nextHist = await saveStoredFioState({
          screen: "warehouse",
          surface: "warehouseman_fio",
          keys: {
            currentKey: "wh_warehouseman_fio",
            confirmKey: CONFIRM_TS_KEY,
            historyKey: WAREHOUSEMAN_HISTORY_KEY,
          },
          fio,
          history: warehousemanHistory,
        });
        if (!canCommit()) {
          recordStateWriteSkipped("confirm_state", "confirm_submit");
          logSuppressedPostUnmount("warehousemanFio.confirm", {
            source: "confirm_submit",
            stage: "persisted",
          });
          return;
        }
        setWarehousemanHistory(nextHist);
        setIsFioConfirmVisible(false);
        recordStateWriteAccepted("confirm_state", "confirm_submit");
      } catch (e) {
        if (canCommit()) {
          onError?.(e);
        }
      } finally {
        if (!canCommit()) {
          recordStateWriteSkipped("confirm_loading", "confirm_submit");
          logSuppressedPostUnmount("warehousemanFio.confirmLoading", {
            source: "confirm_submit",
          });
          return;
        }
        setIsFioLoading(false);
      }
    },
    [
      canCommit,
      onError,
      recordStateWriteAccepted,
      recordStateWriteSkipped,
      warehousemanHistory,
      setIsFioConfirmVisible,
    ],
  );

  return {
    warehousemanFio,
    warehousemanHistory,
    isFioConfirmVisible,
    isFioLoading,
    setIsFioConfirmVisible,
    handleFioConfirm,
  };
}
