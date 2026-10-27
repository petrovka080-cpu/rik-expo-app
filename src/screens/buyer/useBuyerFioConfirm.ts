import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  loadStoredFioState,
  saveStoredFioState,
} from "../../lib/storage/fioPersistence";

const BUYER_FIO_KEY = "buyer_fio";
const CONFIRM_TS_KEY = "buyer_confirm_ts";
const BUYER_HISTORY_KEY = "buyer_history_v1";

const warnBuyerFio = (scope: "load" | "confirm", error: unknown) => {
  if (__DEV__) {
    console.warn(`[buyerFio] ${scope} failed`, error);
  }
};

export function useBuyerFioConfirm(params: {
  setBuyerFio: Dispatch<SetStateAction<string>>;
}) {
  const { setBuyerFio } = params;
  const [buyerHistory, setBuyerHistory] = useState<string[]>([]);
  const [isFioConfirmVisible, setIsFioConfirmVisible] = useState(false);
  const [isFioLoading, setIsFioLoading] = useState(false);

  const getTodaySixAM = useCallback(() => {
    const d = new Date();
    d.setHours(6, 0, 0, 0);
    return d;
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
          screen: "buyer",
          surface: "buyer_fio_confirm",
          keys: {
            currentKey: BUYER_FIO_KEY,
            confirmKey: CONFIRM_TS_KEY,
            historyKey: BUYER_HISTORY_KEY,
          },
        });

        if (active) {
          if (currentFio) setBuyerFio(currentFio);
          setBuyerHistory(history);

          const sixAM = getTodaySixAM();
          const lastConfirm = lastConfirmIso ? new Date(lastConfirmIso) : null;
          if (!lastConfirm || lastConfirm < sixAM) {
            setIsFioConfirmVisible(true);
          }
        }
      } catch (e) {
        warnBuyerFio("load", e);
      }
    })();

    return () => {
      active = false;
    };
  }, [getTodaySixAM, setBuyerFio]);

  useFocusEffect(
    useCallback(() => {
      const checkFio = async () => {
        const { lastConfirmIso } = await loadStoredFioState({
          screen: "buyer",
          surface: "buyer_fio_confirm",
          keys: {
            currentKey: BUYER_FIO_KEY,
            confirmKey: CONFIRM_TS_KEY,
            historyKey: BUYER_HISTORY_KEY,
          },
        });
        const sixAM = getTodaySixAM();
        const lastConfirm = lastConfirmIso ? new Date(lastConfirmIso) : null;
        if (!lastConfirm || lastConfirm < sixAM) {
          setIsFioConfirmVisible(true);
        }
      };
      void checkFio();
    }, [getTodaySixAM]),
  );

  const handleFioConfirm = useCallback(
    async (fio: string) => {
      setIsFioLoading(true);
      try {
        setBuyerFio(fio);
        const nextHist = await saveStoredFioState({
          screen: "buyer",
          surface: "buyer_fio_confirm",
          keys: {
            currentKey: BUYER_FIO_KEY,
            confirmKey: CONFIRM_TS_KEY,
            historyKey: BUYER_HISTORY_KEY,
          },
          fio,
          history: buyerHistory,
        });
        setBuyerHistory(nextHist);
        setIsFioConfirmVisible(false);
      } catch (e) {
        warnBuyerFio("confirm", e);
      } finally {
        setIsFioLoading(false);
      }
    },
    [buyerHistory, setBuyerFio],
  );

  return {
    buyerHistory,
    isFioConfirmVisible,
    isFioLoading,
    setIsFioConfirmVisible,
    handleFioConfirm,
  };
}
