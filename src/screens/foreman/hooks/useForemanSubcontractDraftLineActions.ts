import { useCallback } from "react";

import { type PickedRow as CatalogPickedRow } from "../../../components/foreman/CatalogModal";
import type { ReqItemRow } from "../../../lib/catalog_api";
import type { ForemanAiEstimateDraftMapping } from "../../../lib/foremanAiEstimate";
import type { RequestDraftSyncLineInput } from "../foreman.draftSync.repository";
import {
  appendLineInputsToDraftItems,
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
  openDraft: () => void;
};

export function useForemanSubcontractDraftLineActions({
  scopeNote,
  draftItems,
  requestId,
  saveDraftAtomic,
  openDraft,
}: DraftLineActionsParams) {
  const appendCatalogRows = useCallback(async (rows: CatalogPickedRow[]) => {
    if (!rows?.length) return;
    const lineInputs: RequestDraftSyncLineInput[] = rows.map((row) => ({
      rik_code: row.rik_code || "",
      qty: toPositiveQty(row.qty, 1),
      uom: row.uom || null,
      name_human: row.name || "",
      note: scopeNote || null,
    }));
    const nextItems = appendLineInputsToDraftItems(draftItems, lineInputs, requestId);
    await saveDraftAtomic({
      itemsSnapshot: nextItems,
      mutationKind: "catalog_add",
      localBeforeCount: draftItems.length,
      localAfterCount: nextItems.length,
    });
    openDraft();
  }, [saveDraftAtomic, scopeNote, draftItems, requestId, openDraft]);

  const appendAiEstimateRows = useCallback(async (mapping: ForemanAiEstimateDraftMapping) => {
    const prepared = mapping?.requestDraftLines ?? [];
    if (!prepared.length) return;

    const lineInputs: RequestDraftSyncLineInput[] = prepared.map((line) => {
      const noteParts = [scopeNote, line.meta?.note].map(trim).filter(Boolean);
      return {
        rik_code: line.rik_code || "",
        qty: toPositiveQty(line.qty, 1),
        uom: line.meta?.uom || null,
        name_human: line.meta?.name_human || line.errorLabel || line.rik_code || "",
        app_code: line.meta?.app_code || null,
        kind: line.meta?.kind || null,
        note: noteParts.length ? noteParts.join("; ") : null,
      };
    });
    const nextItems = appendLineInputsToDraftItems(draftItems, lineInputs, requestId);
    await saveDraftAtomic({
      itemsSnapshot: nextItems,
      mutationKind: "ai_local_add",
      localBeforeCount: draftItems.length,
      localAfterCount: nextItems.length,
    });
    openDraft();
  }, [saveDraftAtomic, scopeNote, draftItems, requestId, openDraft]);

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
    appendAiEstimateRows,
    removeDraftItem,
  };
}
