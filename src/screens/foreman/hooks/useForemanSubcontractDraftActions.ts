import { useCallback } from "react";
import { Alert } from "react-native";

import type { ReqItemRow } from "../../../lib/catalog_api";
import type { ForemanDraftSyncMutationKind } from "../foreman.draftSync.repository";
import type { Subcontract } from "../../subcontracts/subcontracts.shared";
import {
  guardSendToDirector,
  isSubcontractControllerGuardFailure,
} from "./foreman.subcontractController.guards";
import { getForemanSubcontractAlertCopy } from "./foreman.subcontractController.telemetry";
import { toRemoteDraftItemId } from "./foreman.subcontractController.model";

type SaveDraftAtomicParams = {
  submit?: boolean;
  pendingDeleteIds?: string[];
  itemsSnapshot?: ReqItemRow[];
  mutationKind: ForemanDraftSyncMutationKind;
  localBeforeCount?: number | null;
  localAfterCount?: number | null;
};

type UseForemanSubcontractDraftActionsParams = {
  closeSubcontractFlow: () => void;
  draftItems: ReqItemRow[];
  loadHistory: (uid?: string) => Promise<void>;
  requestId: string;
  resetSubcontractDraftContext: (options?: { clearForm?: boolean }) => void;
  saveDraftAtomic: (params: SaveDraftAtomicParams) => Promise<string | null>;
  templateContract: Subcontract | null | undefined;
  userId: string;
};

export function useForemanSubcontractDraftActions({
  closeSubcontractFlow,
  draftItems,
  loadHistory,
  requestId,
  resetSubcontractDraftContext,
  saveDraftAtomic,
  templateContract,
  userId,
}: UseForemanSubcontractDraftActionsParams) {
  const sendToDirector = useCallback(async () => {
    const sendGuard = guardSendToDirector({ templateContract, requestId, draftItems });
    if (isSubcontractControllerGuardFailure(sendGuard)) {
      const copy = getForemanSubcontractAlertCopy(sendGuard.reason);
      Alert.alert(copy.title, copy.message);
      return;
    }

    const okId = await saveDraftAtomic({
      submit: true,
      itemsSnapshot: draftItems,
      mutationKind: "submit",
      localBeforeCount: draftItems.length,
      localAfterCount: draftItems.length,
    });
    if (okId) {
      Alert.alert("Успешно", "Заявка отправлена директору.");
      await loadHistory(userId);
      resetSubcontractDraftContext({ clearForm: true });
      closeSubcontractFlow();
    }
  }, [
    closeSubcontractFlow,
    draftItems,
    loadHistory,
    requestId,
    resetSubcontractDraftContext,
    saveDraftAtomic,
    templateContract,
    userId,
  ]);

  const clearDraft = useCallback(async () => {
    const pendingDeleteIds = draftItems
      .map((item) => toRemoteDraftItemId(item.id))
      .filter((id): id is string => Boolean(id));
    if (draftItems.length > 0 || pendingDeleteIds.length > 0) {
      const cleared = await saveDraftAtomic({
        itemsSnapshot: [],
        pendingDeleteIds,
        mutationKind: "whole_cancel",
        localBeforeCount: draftItems.length,
        localAfterCount: 0,
      });
      if (!cleared) return;
    }
    resetSubcontractDraftContext({ clearForm: true });
    closeSubcontractFlow();
  }, [closeSubcontractFlow, draftItems, resetSubcontractDraftContext, saveDraftAtomic]);

  return {
    clearDraft,
    sendToDirector,
  };
}
