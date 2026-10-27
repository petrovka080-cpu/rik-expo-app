import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import { useAccountantFioConfirm } from "./useAccountantFioConfirm";
import { useAccountantNotifications } from "./useAccountantNotifications";

type AccountantCompositionVisibilityParams = {
  focusedRef: MutableRefObject<boolean>;
  setAccountantFio: Dispatch<SetStateAction<string>>;
};

export function useAccountantCompositionVisibility({
  focusedRef,
  setAccountantFio,
}: AccountantCompositionVisibilityParams) {
  const notifications = useAccountantNotifications({ focusedRef });
  const fioConfirm = useAccountantFioConfirm({ setAccountantFio });

  return {
    ...notifications,
    ...fioConfirm,
  };
}
