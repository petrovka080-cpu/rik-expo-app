import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  loadStoredFioState,
  saveStoredFioState,
} from "../../../lib/storage/fioPersistence";
import { useWarehouseUiStore } from "../warehouseUi.store";
import { useWarehouseUnmountSafety } from "./useWarehouseUnmountSafety";

type UseWarehousemanFioArgs = {
  getTodaySixAM: () => Date;
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

export function useWarehousemanFio({ getTodaySixAM, onError }: UseWarehousemanFioArgs): UseWarehousemanFioResult {
  const [warehousemanFio, setWarehousemanFio] = useState("");
  const [warehousemanHistory, setWarehousemanHistory] = useState<string[]>([]);
  const isFioConfirmVisible = useWarehouseUiStore((state) => state.isFioConfirmVisible);
  const setIsFioConfirmVisible = useWarehouseUiStore((state) => state.setIsFioConfirmVisible);
  const [isFioLoading, setIsFioLoading] = useState(false);
  const unmountSafety = useWarehouseUnmountSafety("warehouseman_fio");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const {
          currentFio,
          history,
          lastConfirmIso,
        } = await loadStoredFioState({
          screen: "warehouse",
          surface: "warehouseman_fio",
          keys: {
            currentKey: "wh_warehouseman_fio",
            confirmKey: CONFIRM_TS_KEY,
            historyKey: WAREHOUSEMAN_HISTORY_KEY,
          },
        });

        if (
          !active ||
          !unmountSafety.shouldHandleAsyncResult({
            resource: "load_stored_fio_state",
          })
        ) {
          return;
        }

        if (currentFio) {
          unmountSafety.guardStateUpdate(
            () => {
              setWarehousemanFio(currentFio);
            },
            {
              resource: "apply_current_fio",
            },
          );
        }
        unmountSafety.guardStateUpdate(
          () => {
            setWarehousemanHistory(history);
          },
          {
            resource: "apply_fio_history",
          },
        );

        const sixAM = getTodaySixAM();
        const lastConfirm = lastConfirmIso ? new Date(lastConfirmIso) : null;
        if (!lastConfirm || lastConfirm < sixAM) {
          unmountSafety.guardStateUpdate(
            () => {
              setIsFioConfirmVisible(true);
            },
            {
              resource: "show_fio_confirm_after_load",
            },
          );
        }
      } catch (e) {
        if (__DEV__) {
          console.warn("[warehousemanFio] load failed", e);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [getTodaySixAM, setIsFioConfirmVisible, unmountSafety]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const checkFio = async () => {
        const { lastConfirmIso } = await loadStoredFioState({
          screen: "warehouse",
          surface: "warehouseman_fio",
          keys: {
            currentKey: "wh_warehouseman_fio",
            confirmKey: CONFIRM_TS_KEY,
            historyKey: WAREHOUSEMAN_HISTORY_KEY,
          },
        });
        if (
          !active ||
          !unmountSafety.shouldHandleAsyncResult({
            resource: "focus_check_fio",
          })
        ) {
          return;
        }
        const sixAM = getTodaySixAM();
        const lastConfirm = lastConfirmIso ? new Date(lastConfirmIso) : null;
        if (!lastConfirm || lastConfirm < sixAM) {
          unmountSafety.guardStateUpdate(
            () => {
              setIsFioConfirmVisible(true);
            },
            {
              resource: "show_fio_confirm_on_focus",
            },
          );
        }
      };
      void checkFio().catch((error) => {
        if (active) {
          onError?.(error);
        }
      });
      return () => {
        active = false;
      };
    }, [getTodaySixAM, onError, setIsFioConfirmVisible, unmountSafety]),
  );

  const handleFioConfirm = useCallback(
    async (fio: string) => {
      unmountSafety.guardStateUpdate(
        () => {
          setIsFioLoading(true);
        },
        {
          resource: "fio_confirm_loading_start",
          reason: "submit",
        },
      );
      try {
        unmountSafety.guardStateUpdate(
          () => {
            setWarehousemanFio(fio);
          },
          {
            resource: "fio_confirm_apply_value",
          },
        );
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
        if (
          !unmountSafety.shouldHandleAsyncResult({
            resource: "save_stored_fio_state",
          })
        ) {
          return;
        }
        unmountSafety.guardStateUpdate(
          () => {
            setWarehousemanHistory(nextHist);
            setIsFioConfirmVisible(false);
          },
          {
            resource: "fio_confirm_apply_result",
          },
        );
      } catch (e) {
        onError?.(e);
      } finally {
        unmountSafety.guardStateUpdate(
          () => {
            setIsFioLoading(false);
          },
          {
            resource: "fio_confirm_loading_finish",
            reason: "submit",
          },
        );
      }
    },
    [warehousemanHistory, onError, setIsFioConfirmVisible, unmountSafety],
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
