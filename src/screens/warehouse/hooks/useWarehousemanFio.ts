import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

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
          if (!active || !mountedRef.current) return;
          const sixAM = getTodaySixAM();
          const lastConfirm = lastConfirmIso ? new Date(lastConfirmIso) : null;
          if (!lastConfirm || lastConfirm < sixAM) {
            setIsFioConfirmVisible(true);
          }
        } catch (e) {
          if (active && mountedRef.current) {
            onError?.(e);
          }
        }
      };
      void checkFio();
      return () => {
        active = false;
      };
    }, [getTodaySixAM, onError, setIsFioConfirmVisible]),
  );

  const handleFioConfirm = useCallback(
    async (fio: string) => {
      setIsFioLoading(true);
      try {
        if (!mountedRef.current) return;
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
        if (!mountedRef.current) return;
        setWarehousemanHistory(nextHist);
        setIsFioConfirmVisible(false);
      } catch (e) {
        if (mountedRef.current) {
          onError?.(e);
        }
      } finally {
        if (mountedRef.current) {
          setIsFioLoading(false);
        }
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
