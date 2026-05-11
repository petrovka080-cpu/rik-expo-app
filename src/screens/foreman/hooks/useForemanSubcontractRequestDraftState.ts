import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import type { ReqItemRow, RequestMetaPatch } from "../../../lib/catalog_api";
import { planSubcontractDraftReset } from "./foreman.subcontractController.effects";
import type { FormState } from "./foreman.subcontractController.model";
import { useForemanSubcontractRequestDraftLifecycle } from "./useForemanSubcontractRequestDraftLifecycle";

type ForemanSubcontractRequestDraftStateParams = {
  requestId: string;
  requestMetaPersistPatch: RequestMetaPatch;
  draftItemsLoadSeqRef: MutableRefObject<number>;
  setRequestId: Dispatch<SetStateAction<string>>;
  setDisplayNo: Dispatch<SetStateAction<string>>;
  setDraftItems: Dispatch<SetStateAction<ReqItemRow[]>>;
  setForm: Dispatch<SetStateAction<FormState>>;
  logDebugError: (scope: string, error: unknown) => void;
};

export function useForemanSubcontractRequestDraftState({
  requestId,
  requestMetaPersistPatch,
  draftItemsLoadSeqRef,
  setRequestId,
  setDisplayNo,
  setDraftItems,
  setForm,
  logDebugError,
}: ForemanSubcontractRequestDraftStateParams) {
  const resetSubcontractDraftContext = useCallback((options?: { clearForm?: boolean }) => {
    const resetPlan = planSubcontractDraftReset(options);
    draftItemsLoadSeqRef.current += 1;
    setRequestId(resetPlan.requestId);
    setDisplayNo(resetPlan.displayNo);
    setDraftItems(resetPlan.draftItems);
    if (resetPlan.nextForm) {
      setForm(resetPlan.nextForm);
    }
  }, [draftItemsLoadSeqRef, setDisplayNo, setDraftItems, setForm, setRequestId]);

  const { loadDraftItems } = useForemanSubcontractRequestDraftLifecycle({
    requestId,
    requestMetaPersistPatch,
    draftItemsLoadSeqRef,
    setDraftItems,
    setDisplayNo,
    logDebugError,
  });

  return {
    resetSubcontractDraftContext,
    loadDraftItems,
  };
}
