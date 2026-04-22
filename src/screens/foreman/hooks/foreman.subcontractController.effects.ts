import type { ReqItemRow } from "../../../lib/catalog_api";
import type { Subcontract } from "../../subcontracts/subcontracts.shared";
import {
  EMPTY_FORM,
  type DictOption,
  type FormState,
  buildDraftScopeKey,
  resolveCodeFromDict,
  toNum,
} from "./foreman.subcontractController.model";

export function planSubcontractTotalPriceSync(form: Pick<FormState, "qtyPlanned" | "pricePerUnit" | "totalPrice">) {
  const qty = toNum(form.qtyPlanned);
  const pricePerUnit = toNum(form.pricePerUnit);
  const nextTotalPrice =
    qty != null && pricePerUnit != null
      ? String(Number.isFinite(qty * pricePerUnit) ? qty * pricePerUnit : "")
      : "";

  return {
    nextTotalPrice,
    shouldUpdate: nextTotalPrice !== form.totalPrice,
  };
}

export function planSubcontractDraftReset(options?: { clearForm?: boolean }) {
  return {
    requestId: "",
    displayNo: "",
    draftItems: [] as ReqItemRow[],
    activeDraftScopeKey: "",
    nextForm: options?.clearForm ? EMPTY_FORM : null,
  };
}

export function planSelectedSubcontractHydration(params: {
  currentForm: FormState;
  item: Subcontract;
  dicts: {
    objOptions: DictOption[];
    lvlOptions: DictOption[];
    sysOptions: DictOption[];
  };
}) {
  const { currentForm, item, dicts } = params;
  const nextForm: FormState = {
    ...currentForm,
    objectCode: resolveCodeFromDict(dicts.objOptions || [], item.object_name) || currentForm.objectCode,
    levelCode: resolveCodeFromDict(dicts.lvlOptions || [], item.work_zone) || currentForm.levelCode,
    systemCode: resolveCodeFromDict(dicts.sysOptions || [], item.work_type) || currentForm.systemCode,
    zoneText: currentForm.zoneText || "",
  };

  return {
    nextForm,
    nextScopeKey: buildDraftScopeKey(nextForm, item.id),
  };
}

