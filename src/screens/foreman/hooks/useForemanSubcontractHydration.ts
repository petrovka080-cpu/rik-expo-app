import { useCallback, type Dispatch, type SetStateAction } from "react";

import { findLatestDraftRequestByLink } from "../foreman.requests";
import type { SubcontractFlowScreen } from "../foremanSubcontractUi.store";
import type { Subcontract } from "../../subcontracts/subcontracts.shared";
import { planSelectedSubcontractHydration } from "./foreman.subcontractController.effects";
import type { DictOption, FormState } from "./foreman.subcontractController.model";

type HydrationParams = {
  dicts: {
    objOptions: DictOption[];
    lvlOptions: DictOption[];
    sysOptions: DictOption[];
  };
  form: FormState;
  loadDraftItems: (requestId: string) => Promise<void>;
  openSubcontractFlow: (screen?: SubcontractFlowScreen) => void;
  resetSubcontractDraftContext: (options?: { clearForm?: boolean }) => void;
  setDisplayNo: Dispatch<SetStateAction<string>>;
  setForm: Dispatch<SetStateAction<FormState>>;
  setRequestId: Dispatch<SetStateAction<string>>;
  setSelectedTemplateId: (value: string | null) => void;
};

export function useForemanSubcontractHydration({
  dicts,
  form,
  loadDraftItems,
  openSubcontractFlow,
  resetSubcontractDraftContext,
  setDisplayNo,
  setForm,
  setRequestId,
  setSelectedTemplateId,
}: HydrationParams) {
  const hydrateSelectedSubcontract = useCallback(
    async (it: Subcontract) => {
      const hydrationPlan = planSelectedSubcontractHydration({
        currentForm: form,
        item: it,
        dicts,
      });

      setSelectedTemplateId(String(it.id || "").trim() || null);
      setForm(hydrationPlan.nextForm);

      const existingDraft = await findLatestDraftRequestByLink(String(it.id || "").trim());
      if (existingDraft?.id) {
        const rid = String(existingDraft.id).trim();
        const label = String(existingDraft.request_no || existingDraft.display_no || "").trim();
        setRequestId(rid);
        setDisplayNo(label);
        await loadDraftItems(rid);
      } else {
        resetSubcontractDraftContext();
      }

      openSubcontractFlow("details");
    },
    [
      dicts,
      form,
      loadDraftItems,
      openSubcontractFlow,
      resetSubcontractDraftContext,
      setDisplayNo,
      setForm,
      setRequestId,
      setSelectedTemplateId,
    ],
  );

  const acceptApprovedFromDirector = useCallback(async (it: Subcontract) => {
    await hydrateSelectedSubcontract(it);
  }, [hydrateSelectedSubcontract]);

  return {
    hydrateSelectedSubcontract,
    acceptApprovedFromDirector,
  };
}
