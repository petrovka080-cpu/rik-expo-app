import { useCallback, type Dispatch, type SetStateAction } from "react";
import { Alert } from "react-native";

import type { ReqItemRow, RequestMetaPatch } from "../../../lib/catalog_api";
import {
  mapReqItemsToDraftSyncLines,
  syncForemanAtomicDraft,
  type ForemanDraftSyncMutationKind,
} from "../foreman.draftSync.repository";
import type { Subcontract } from "../../subcontracts/subcontracts.shared";
import {
  filterActiveDraftItems,
  type FormState,
  trim,
} from "./foreman.subcontractController.model";
import {
  guardDraftUser,
  guardTemplateContract,
  isSubcontractControllerGuardFailure,
} from "./foreman.subcontractController.guards";
import {
  getForemanSubcontractAlertCopy,
  getForemanSubcontractErrorMessage,
} from "./foreman.subcontractController.telemetry";

type SaveDraftAtomicParams = {
  templateContract: Subcontract | null;
  userId: string;
  requestId: string;
  draftItems: ReqItemRow[];
  requestMetaFromTemplate: RequestMetaPatch;
  templateObjectName: string;
  objectName: string;
  levelName: string;
  templateLevelName: string;
  systemName: string;
  templateSystemName: string;
  form: FormState;
  draftScopeKey: string;
  setRequestId: Dispatch<SetStateAction<string>>;
  setDisplayNo: Dispatch<SetStateAction<string>>;
  setDraftItems: Dispatch<SetStateAction<ReqItemRow[]>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setSending: Dispatch<SetStateAction<boolean>>;
};

export type SaveForemanSubcontractDraftAtomic = (
  params: {
    submit?: boolean;
    pendingDeleteIds?: string[];
    itemsSnapshot?: ReqItemRow[];
    mutationKind: ForemanDraftSyncMutationKind;
    localBeforeCount?: number | null;
    localAfterCount?: number | null;
  }
) => Promise<string | null>;

export function useForemanSubcontractSaveDraftAtomic({
  templateContract,
  userId,
  requestId,
  draftItems,
  requestMetaFromTemplate,
  templateObjectName,
  objectName,
  levelName,
  templateLevelName,
  systemName,
  templateSystemName,
  form,
  draftScopeKey,
  setRequestId,
  setDisplayNo,
  setDraftItems,
  setSaving,
  setSending,
}: SaveDraftAtomicParams) {
  const ensureTemplateContractStrict = useCallback((): string | null => {
    const result = guardTemplateContract(templateContract);
    if (result.ok) {
      return result.subcontractId ?? null;
    }
    if (isSubcontractControllerGuardFailure(result)) {
      const copy = getForemanSubcontractAlertCopy(result.reason);
      Alert.alert(copy.title, copy.message);
      return null;
    }
    return null;
  }, [templateContract]);

  const saveDraftAtomic = useCallback<SaveForemanSubcontractDraftAtomic>(
    async (params) => {
      const subcontractId = ensureTemplateContractStrict();
      if (!subcontractId) return null;

      const userGuard = guardDraftUser(userId);
      if (isSubcontractControllerGuardFailure(userGuard)) {
        const copy = getForemanSubcontractAlertCopy(userGuard.reason);
        Alert.alert(copy.title, copy.message);
        return null;
      }

      const snapshotItems = params.itemsSnapshot ?? draftItems;
      const lines = mapReqItemsToDraftSyncLines(snapshotItems);
      const pendingDeleteIds = Array.from(
        new Set((params.pendingDeleteIds || []).map((id) => trim(id)).filter(Boolean)),
      );

      if (!requestId && lines.length === 0 && pendingDeleteIds.length === 0 && params.submit !== true) {
        return null;
      }

      setSaving(true);
      if (params.submit) setSending(true);

      try {
        const objectNameForRequest = String(
          templateObjectName || objectName || templateContract?.object_name || "",
        ).trim();

        const res = await syncForemanAtomicDraft({
          mutationKind: params.mutationKind,
          sourcePath: "foreman_subcontract",
          draftScopeKey,
          requestId: requestId || null,
          submit: params.submit,
          pendingDeleteIds,
          lines,
          meta: requestMetaFromTemplate,
          subcontractId,
          contractorJobId: subcontractId,
          objectName: objectNameForRequest || null,
          levelName: levelName || templateLevelName || null,
          systemName: systemName || templateSystemName || null,
          zoneName: trim(form.zoneText) || null,
          beforeLineCount: params.localBeforeCount ?? draftItems.length,
          afterLocalSnapshotLineCount: params.localAfterCount ?? snapshotItems.length,
        });

        const rid = String(res.request.id);
        const displayLabel = String(res.request.display_no || res.request.id || "DRAFT");

        setRequestId(rid);
        setDisplayNo(displayLabel);
        setDraftItems(filterActiveDraftItems(res.items));
        return rid;
      } catch (e) {
        Alert.alert(
          "РћС€РёР±РєР°",
          getForemanSubcontractErrorMessage(e, "РќРµ СѓРґР°Р»РѕСЃСЊ РІС‹РїРѕР»РЅРёС‚СЊ Р°С‚РѕРјР°СЂРЅРѕРµ СЃРѕС…СЂР°РЅРµРЅРёРµ Р·Р°СЏРІРєРё."),
        );
        return null;
      } finally {
        setSaving(false);
        if (params.submit) setSending(false);
      }
    },
    [
      ensureTemplateContractStrict,
      userId,
      requestId,
      draftItems,
      requestMetaFromTemplate,
      templateObjectName,
      objectName,
      templateContract?.object_name,
      levelName,
      templateLevelName,
      systemName,
      templateSystemName,
      form.zoneText,
      draftScopeKey,
      setDisplayNo,
      setDraftItems,
      setRequestId,
      setSaving,
      setSending,
    ],
  );

  return { saveDraftAtomic };
}
