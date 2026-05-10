import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { Alert } from "react-native";

import {
  getBuyerSubcontractErrorText as errText,
  type BuyerSubcontractFormState as FormState,
} from "./buyerSubcontractForm.model";
import {
  buildBuyerSubcontractPatch,
} from "./BuyerSubcontractTab.model";
import type { BuyerSubcontractLoad, ResolveBuyerSubcontractUserId } from "./useBuyerSubcontractDataModel";
import {
  createSubcontractDraftWithPatch,
  submitSubcontract,
  updateSubcontract,
} from "../subcontracts/subcontracts.shared";

type BuyerSubcontractActionsParams = {
  form: FormState;
  subId: string;
  buyerFio: string;
  load: BuyerSubcontractLoad;
  closeForm: () => void;
  setSubId: Dispatch<SetStateAction<string>>;
  resolveCurrentUserId: ResolveBuyerSubcontractUserId;
  resolveContractorIdByPhone: (phoneNormalized: string) => Promise<string | null>;
  attachContractorIdIfPossible: (subcontractId: string, contractorId: string | null) => Promise<void>;
};

export function useBuyerSubcontractActions({
  form,
  subId,
  buyerFio,
  load,
  closeForm,
  setSubId,
  resolveCurrentUserId,
  resolveContractorIdByPhone,
  attachContractorIdIfPossible,
}: BuyerSubcontractActionsParams) {
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const uid = await resolveCurrentUserId();
      if (!uid) throw new Error("Пользователь не авторизован");
      const patch = buildBuyerSubcontractPatch(form, buyerFio);
      const contractorId = await resolveContractorIdByPhone(String(patch.contractor_phone || ""));

      if (!subId) {
        const row = await createSubcontractDraftWithPatch(
          uid,
          form.foremanName.trim() || buyerFio || "\u0421\u043d\u0430\u0431\u0436\u0435\u043d\u0435\u0446",
          patch,
        );
        await attachContractorIdIfPossible(row.id, contractorId);
        setSubId(row.id);
      } else {
        await updateSubcontract(subId, patch);
        await attachContractorIdIfPossible(subId, contractorId);
      }

      Alert.alert("Черновик сохранён");
      await load({ reset: true });
    } catch (error) {
      Alert.alert("Ошибка сохранения", errText(error, "Не удалось сохранить черновик"));
    } finally {
      setSaving(false);
    }
  }, [
    attachContractorIdIfPossible,
    buyerFio,
    form,
    load,
    resolveContractorIdByPhone,
    resolveCurrentUserId,
    setSubId,
    subId,
  ]);

  const handleSubmit = useCallback(async () => {
    setSending(true);
    try {
      const uid = await resolveCurrentUserId();
      if (!uid) throw new Error("Пользователь не авторизован");
      const patch = buildBuyerSubcontractPatch(form, buyerFio);
      const contractorId = await resolveContractorIdByPhone(String(patch.contractor_phone || ""));

      let activeId = subId;
      if (!activeId) {
        const row = await createSubcontractDraftWithPatch(
          uid,
          form.foremanName.trim() || buyerFio || "\u0421\u043d\u0430\u0431\u0436\u0435\u043d\u0435\u0446",
          patch,
        );
        activeId = row.id;
        await attachContractorIdIfPossible(activeId, contractorId);
      } else {
        await updateSubcontract(activeId, patch);
        await attachContractorIdIfPossible(activeId, contractorId);
      }

      await submitSubcontract(activeId);
      Alert.alert("Отправлено директору");
      closeForm();
      await load({ reset: true });
    } catch (error) {
      Alert.alert("Ошибка отправки", errText(error, "Не удалось отправить директору"));
    } finally {
      setSending(false);
    }
  }, [
    attachContractorIdIfPossible,
    buyerFio,
    closeForm,
    form,
    load,
    resolveContractorIdByPhone,
    resolveCurrentUserId,
    subId,
  ]);

  return {
    saving,
    sending,
    handleSave,
    handleSubmit,
  };
}
