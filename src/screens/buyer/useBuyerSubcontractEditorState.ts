import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

import {
  BUYER_SUBCONTRACT_EMPTY_FORM as EMPTY_FORM,
  buyerSubcontractToNum as toNum,
  type BuyerSubcontractFormState as FormState,
} from "./buyerSubcontractForm.model";
import {
  buyerSubcontractToFormState,
  type BuyerSubcontractDateTarget,
} from "./BuyerSubcontractTab.model";
import type { Subcontract } from "../subcontracts/subcontracts.shared";

export type BuyerSubcontractEditorState = {
  showForm: boolean;
  form: FormState;
  subId: string;
  dateTarget: BuyerSubcontractDateTarget | null;
  setForm: Dispatch<SetStateAction<FormState>>;
  setSubId: Dispatch<SetStateAction<string>>;
  setDateTarget: Dispatch<SetStateAction<BuyerSubcontractDateTarget | null>>;
  openForm: () => void;
  closeForm: () => void;
  openEditableItem: (item: Subcontract) => void;
};

export function useBuyerSubcontractEditorState(): BuyerSubcontractEditorState {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [subId, setSubId] = useState("");
  const [dateTarget, setDateTarget] = useState<BuyerSubcontractDateTarget | null>(null);

  useEffect(() => {
    const qty = toNum(form.qtyPlanned);
    const ppu = toNum(form.pricePerUnit);
    if (qty != null && ppu != null && qty > 0 && ppu > 0) {
      setForm((prev) => ({ ...prev, totalPrice: String(qty * ppu) }));
      return;
    }
    setForm((prev) => ({ ...prev, totalPrice: "" }));
  }, [form.qtyPlanned, form.pricePerUnit]);

  const openForm = useCallback(() => {
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setSubId("");
    setForm(EMPTY_FORM);
    setDateTarget(null);
  }, []);

  const openEditableItem = useCallback((item: Subcontract) => {
    setSubId(item.id);
    setForm(buyerSubcontractToFormState(item));
    setShowForm(true);
  }, []);

  return {
    showForm,
    form,
    subId,
    dateTarget,
    setForm,
    setSubId,
    setDateTarget,
    openForm,
    closeForm,
    openEditableItem,
  };
}
