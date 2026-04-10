import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  loadStoredFioState,
  saveStoredFioState,
} from "../../../lib/storage/fioPersistence";
import { useWarehouseUiStore } from "../warehouseUi.store";

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

        if (!active) return;

        if (currentFio) setWarehousemanFio(currentFio);
        setWarehousemanHistory(history);

        const sixAM = getTodaySixAM();
        const lastConfirm = lastConfirmIso ? new Date(lastConfirmIso) : null;
        if (!lastConfirm || lastConfirm < sixAM) {
          setIsFioConfirmVisible(true);
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
  }, [getTodaySixAM, setIsFioConfirmVisible]);

  useFocusEffect(
    useCallback(() => {
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
        const sixAM = getTodaySixAM();
        const lastConfirm = lastConfirmIso ? new Date(lastConfirmIso) : null;
        if (!lastConfirm || lastConfirm < sixAM) {
          setIsFioConfirmVisible(true);
        }
      };
      void checkFio();
    }, [getTodaySixAM, setIsFioConfirmVisible]),
  );

  const handleFioConfirm = useCallback(
    async (fio: string) => {
      setIsFioLoading(true);
      try {
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
        setWarehousemanHistory(nextHist);
        setIsFioConfirmVisible(false);
      } catch (e) {
        onError?.(e);
      } finally {
        setIsFioLoading(false);
      }
    },
    [warehousemanHistory, onError, setIsFioConfirmVisible],
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
