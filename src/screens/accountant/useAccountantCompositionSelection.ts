import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import type { AccountantInboxUiRow } from "./types";

type AccountantCompositionSelectionParams = {
  cardOpen: boolean;
  freezeWhileOpen: boolean;
  setFreezeWhileOpen: Dispatch<SetStateAction<boolean>>;
  currentPaymentId: number | null;
  setCurrentPaymentId: Dispatch<SetStateAction<number | null>>;
};

export function useAccountantCompositionSelection({
  cardOpen,
  freezeWhileOpen,
  setFreezeWhileOpen,
  currentPaymentId,
  setCurrentPaymentId,
}: AccountantCompositionSelectionParams) {
  const [current, setCurrent] = useState<AccountantInboxUiRow | null>(null);

  useEffect(() => {
    if (cardOpen || !freezeWhileOpen) return;
    setFreezeWhileOpen(false);
  }, [cardOpen, freezeWhileOpen, setFreezeWhileOpen]);

  return {
    current,
    setCurrent,
    currentPaymentId,
    setCurrentPaymentId,
  };
}
