import { useCallback } from "react";

import { type PickedRow as CatalogPickedRow } from "../../../components/foreman/CatalogModal";
import type { ReqItemRow } from "../../../lib/catalog_api";
import type { SubcontractFlowScreen } from "../foremanSubcontractUi.store";
import type { RequestDraftSyncLineInput } from "../foreman.draftSync.repository";
import {
  appendLineInputsToDraftItems,
  type CalcPickedRow,
  toPositiveQty,
  toRemoteDraftItemId,
  trim,
} from "./foreman.subcontractController.model";
import type { SaveForemanSubcontractDraftAtomic } from "./useForemanSubcontractSaveDraftAtomic";

type DraftLineActionsParams = {
  scopeNote: string;
  draftItems: ReqItemRow[];
  requestId: string;
  saveDraftAtomic: SaveForemanSubcontractDraftAtomic;
  setSubcontractFlowScreen: (screen: SubcontractFlowScreen) => void;
};

export function useForemanSubcontractDraftLineActions({
  scopeNote,
  draftItems,
  requestId,
  saveDraftAtomic,
  setSubcontractFlowScreen,
}: DraftLineActionsParams) {
  const appendCatalogRows = useCallback(async (rows: CatalogPickedRow[]) => {
    if (!rows?.length) return;
    const lineInputs: RequestDraftSyncLineInput[] = rows.map((r) => ({
      rik_code: r.rik_code || "",
      qty: toPositiveQty(r.qty, 1),
      uom: r.uom || null,
      name_human: r.name || "",
      note: scopeNote || null,
    }));
    const nextItems = appendLineInputsToDraftItems(draftItems, lineInputs, requestId);
    await saveDraftAtomic({
      itemsSnapshot: nextItems,
      mutationKind: "catalog_add",
      localBeforeCount: draftItems.length,
      localAfterCount: nextItems.length,
    });
    setSubcontractFlowScreen("draft");
  }, [saveDraftAtomic, scopeNote, draftItems, requestId, setSubcontractFlowScreen]);

  const appendCalcRows = useCallback(async (rows: CalcPickedRow[]) => {
    if (!rows?.length) return;
    const lineInputs: RequestDraftSyncLineInput[] = rows.map((r) => ({
      rik_code: r.rik_code || "",
      qty: toPositiveQty(r.qty, 1),
      uom: r.uom_code || null,
      name_human: r.item_name_ru || r.name_human || "Р‘РµР· РЅР°Р·РІР°РЅРёСЏ",
      note: scopeNote || null,
    }));
    const nextItems = appendLineInputsToDraftItems(draftItems, lineInputs, requestId);
    await saveDraftAtomic({
      itemsSnapshot: nextItems,
      mutationKind: "calc_add",
      localBeforeCount: draftItems.length,
      localAfterCount: nextItems.length,
    });
    setSubcontractFlowScreen("draft");
  }, [saveDraftAtomic, scopeNote, draftItems, requestId, setSubcontractFlowScreen]);

  const removeDraftItem = useCallback(async (id: string) => {
    const nextItems = draftItems.filter((item) => trim(item.id) !== trim(id));
    await saveDraftAtomic({
      itemsSnapshot: nextItems,
      pendingDeleteIds: toRemoteDraftItemId(id) ? [id] : [],
      mutationKind: "row_remove",
      localBeforeCount: draftItems.length,
      localAfterCount: nextItems.length,
    });
  }, [saveDraftAtomic, draftItems]);

  return {
    appendCatalogRows,
    appendCalcRows,
    removeDraftItem,
  };
}
