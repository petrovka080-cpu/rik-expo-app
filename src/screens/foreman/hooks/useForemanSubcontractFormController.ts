import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";

import { planSubcontractTotalPriceSync } from "./foreman.subcontractController.effects";
import type { FormState } from "./foreman.subcontractController.model";

type FormControllerParams = {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
};

export function useForemanSubcontractFormController({
  form,
  setForm,
}: FormControllerParams) {
  const setField = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  }, [setForm]);

  useEffect(() => {
    const priceSync = planSubcontractTotalPriceSync(form);
    if (!priceSync.shouldUpdate) return;
    setForm((prev) => ({ ...prev, totalPrice: priceSync.nextTotalPrice }));
  }, [form, setForm]);

  return { setField };
}
