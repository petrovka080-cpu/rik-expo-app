import React, { useCallback, useEffect } from "react";
import { Alert, View } from "react-native";
import { supabase } from "../../../lib/supabaseClient";
import { type PickedRow as CatalogPickedRow } from "../../../components/foreman/CatalogModal";
import {
  rikQuickSearch,
  updateRequestMeta,
  listRequestItems,
  type ReqItemRow,
} from "../../../lib/catalog_api";
import {
  mapReqItemsToDraftSyncLines,
  syncForemanAtomicDraft,
  type ForemanDraftSyncMutationKind,
  type RequestDraftSyncLineInput,
} from "../foreman.draftSync.repository";
import { buildPdfFileName } from "../../../lib/documents/pdfDocument";
import { prepareAndPreviewGeneratedPdfFromDescriptorFactory } from "../../../lib/pdf/pdf.runner";
import {
  ForemanSubcontractMainSections,
  ForemanSubcontractModalStack,
} from "../ForemanSubcontractTab.sections";
import { s } from "../foreman.styles";
import { REQUEST_STATUS_STYLES, UI } from "../foreman.ui";
import { resolveStatusInfo as resolveStatusHelper, shortId } from "../foreman.helpers";
import {
  listForemanSubcontracts,
  type Subcontract,
} from "../../subcontracts/subcontracts.shared";
import {
  fetchForemanRequestDisplayLabel,
  findLatestDraftRequestByLink,
} from "../foreman.requests";
import { readForemanProfileName } from "../foreman.dicts.repo";
import type { SubcontractFlowScreen } from "../foremanSubcontractUi.store";
import { buildForemanRequestPdfDescriptor } from "../foreman.requestPdf.service";
import {
  appendLineInputsToDraftItems,
  filterActiveDraftItems,
  type CalcPickedRow,
  type DictOption,
  type FormState,
  toPositiveQty,
  toRemoteDraftItemId,
  trim,
} from "./foreman.subcontractController.model";
import {
  guardDraftUser,
  guardPdfRequest,
  guardSendToDirector,
  guardTemplateContract,
  isSubcontractControllerGuardFailure,
} from "./foreman.subcontractController.guards";
import {
  planSelectedSubcontractHydration,
  planSubcontractDraftReset,
  planSubcontractTotalPriceSync,
} from "./foreman.subcontractController.effects";
import {
  buildForemanSubcontractDebugPayload,
  getForemanSubcontractAlertCopy,
  getForemanSubcontractErrorMessage,
} from "./foreman.subcontractController.telemetry";
import {
  loadCurrentForemanAuthIdentity,
  loadCurrentForemanAuthUserId,
} from "../foreman.auth.transport";
import { useForemanSubcontractControllerUiState } from "./useForemanSubcontractControllerUiState";

export type ForemanSubcontractTabProps = {
  contentTopPad: number;
  onScroll: (event: unknown) => void;
  dicts: {
    objOptions: DictOption[];
    lvlOptions: DictOption[];
    sysOptions: DictOption[];
  };
};

const logForemanSubcontractDebug = (scope: string, error: unknown) => {
  if (!__DEV__) return;
  const payload = buildForemanSubcontractDebugPayload(scope, error);
  console.warn(payload.message, payload.error);
};
const resolveRequestStatusInfo = (raw?: string | null) =>
  resolveStatusHelper(raw, REQUEST_STATUS_STYLES);

export function useForemanSubcontractController({
  contentTopPad,
  onScroll,
  dicts,
}: ForemanSubcontractTabProps) {
  const {
    router,
    modalHeaderTopPad,
    historyRequests,
    requestHistoryLoading,
    requestHistoryVisible,
    fetchRequestHistory,
    closeRequestHistory,
    userId,
    setUserId,
    foremanName,
    setForemanName,
    form,
    setForm,
    displayNo,
    setDisplayNo,
    saving,
    setSaving,
    sending,
    setSending,
    historyLoading,
    setHistoryLoading,
    history,
    setHistory,
    historyOpen,
    setHistoryOpen,
    setSubcontractFlowOpen,
    setSubcontractFlowScreen,
    selectedWorkType,
    setSelectedWorkType,
    draftItems,
    setDraftItems,
    dateTarget,
    setDateTarget,
    selectedTemplateId,
    setSelectedTemplateId,
    closeSubcontractFlowUi,
    requestId,
    setRequestId,
    draftItemsLoadSeqRef,
    draftScopeKey,
    templateContract,
    objectName,
    levelName,
    systemName,
    zoneName,
    templateObjectName,
    templateLevelName,
    templateSystemName,
    subcontractDetailsVisible,
    draftOpen,
    catalogVisible,
    workTypePickerVisible,
    calcVisible,
    scopeNote,
    requestMetaFromTemplate,
    requestMetaPersistPatch,
    approvedContracts,
    contractorName,
    phoneName,
    volumeText,
  } = useForemanSubcontractControllerUiState({ dicts });

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

  const setField = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  }, [setForm]);

  const openSubcontractFlow = useCallback((screen: SubcontractFlowScreen = "details") => {
    setSubcontractFlowScreen(screen);
    setSubcontractFlowOpen(true);
  }, [setSubcontractFlowOpen, setSubcontractFlowScreen]);

  const closeSubcontractFlow = useCallback(() => {
    closeSubcontractFlowUi();
  }, [closeSubcontractFlowUi]);

  useEffect(() => {
    const priceSync = planSubcontractTotalPriceSync(form);
    if (!priceSync.shouldUpdate) return;
    setForm((prev) => ({ ...prev, totalPrice: priceSync.nextTotalPrice }));
  }, [form, setForm]);

  const loadHistory = useCallback(async (uid = userId) => {
    let nextUserId = String(uid || "").trim();
    if (!nextUserId) {
      nextUserId = await loadCurrentForemanAuthUserId() ?? "";
    }
    if (!nextUserId) return;
    setHistoryLoading(true);
    try {
      const rows = await listForemanSubcontracts(nextUserId);
      setHistory(rows);
    } catch (e) {
      Alert.alert(
        "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РґР°РЅРЅС‹Рµ",
        getForemanSubcontractErrorMessage(e, "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РёСЃС‚РѕСЂРёСЋ РїРѕРґСЂСЏРґРѕРІ."),
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [setHistory, setHistoryLoading, userId]);

  const loadDraftItems = useCallback(async (rid: string) => {
    const requestSeq = ++draftItemsLoadSeqRef.current;
    const id = String(rid || "").trim();
    if (!id) {
      setDraftItems([]);
      return;
    }
    try {
      const rows = await listRequestItems(id);
      if (requestSeq !== draftItemsLoadSeqRef.current) return;
      setDraftItems(filterActiveDraftItems(rows || []));
    } catch (e) {
      if (requestSeq !== draftItemsLoadSeqRef.current) return;
      logForemanSubcontractDebug("loadDraftItems failed", e);
      setDraftItems([]);
    }
  }, [draftItemsLoadSeqRef, setDraftItems]);

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

  useEffect(() => {
    (async () => {
      const identity = await loadCurrentForemanAuthIdentity();
      const uid = identity.id ?? "";
      if (!uid) return;
      setUserId(uid);

      const nm = identity.fullName;
      if (nm) setForemanName(nm);

      if (!nm) {
        try {
          const x = await readForemanProfileName(uid);
          if (x) setForemanName(x);
        } catch (e) {
          logForemanSubcontractDebug("foreman profile load failed", e);
        }
      }

      await loadHistory(uid);
    })();
  }, [loadHistory, setForemanName, setUserId]);

  const saveDraftAtomic = useCallback(
    async (
      params: {
        submit?: boolean;
        pendingDeleteIds?: string[];
        itemsSnapshot?: ReqItemRow[];
        mutationKind: ForemanDraftSyncMutationKind;
        localBeforeCount?: number | null;
        localAfterCount?: number | null;
      }
    ): Promise<string | null> => {
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
          templateObjectName || objectName || templateContract?.object_name || ""
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
    ]
  );

  useEffect(() => {
    void loadDraftItems(requestId);
  }, [requestId, loadDraftItems]);

  useEffect(() => {
    if (!requestId) return;
    const rid = String(requestId || "").trim();
    if (!rid) return;
    let cancelled = false;
    void (async () => {
      const ok = await updateRequestMeta(rid, requestMetaPersistPatch);
      if (!ok || cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [
    requestId,
    requestMetaPersistPatch,
  ]);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    (async () => {
      try {
        const label = await fetchForemanRequestDisplayLabel(requestId);
        if (cancelled || !label) return;
        if (label) setDisplayNo(label);
      } catch (error) {
        if (cancelled) return;
        logForemanSubcontractDebug("request label refresh failed", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId, setDisplayNo]);

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

  const onPdf = useCallback(async () => {
    const pdfGuard = guardPdfRequest(requestId);
    if (!pdfGuard.ok) {
      Alert.alert("PDF", "РЎРЅР°С‡Р°Р»Р° СЃРѕР·РґР°Р№С‚Рµ С‡РµСЂРЅРѕРІРёРє Р·Р°СЏРІРєРё.");
      return;
    }
    const rid = pdfGuard.requestId;
    const createDescriptor = async () => {
      const template = await buildForemanRequestPdfDescriptor({
        requestId: rid,
        generatedBy: foremanName || null,
        displayNo: displayNo || null,
        title: displayNo ? `Черновик ${displayNo}` : `Черновик ${rid}`,
      });
      const title = displayNo ? `Черновик ${displayNo}` : `Черновик ${rid}`;
      return {
        ...template,
        title,
        fileName: buildPdfFileName({
          documentType: "request",
          title: displayNo || "chernovik",
          entityId: rid,
        }),
      };
    };
    await prepareAndPreviewGeneratedPdfFromDescriptorFactory({
      supabase,
      key: `pdf:subcontracts-request:${rid}`,
      label: "РћС‚РєСЂС‹РІР°СЋ PDFвЂ¦",
      createDescriptor,
      router,
      // XR-PDF: dismiss the subcontract DraftSheet modal before pushing PDF viewer
      onBeforeNavigate: closeSubcontractFlow,
    });
  }, [closeSubcontractFlow, displayNo, foremanName, requestId, router]);

  const openRequestHistoryPdf = useCallback(async (reqId: string) => {
    const rid = String(reqId || "").trim();
    if (!rid) return;
    const createDescriptor = async () => {
      const template = await buildForemanRequestPdfDescriptor({
        requestId: rid,
        generatedBy: foremanName || null,
        title: `Заявка ${rid}`,
      });
      return {
        ...template,
        title: `Заявка ${rid}`,
        fileName: buildPdfFileName({
          documentType: "request",
          title: rid,
          entityId: rid,
        }),
      };
    };
    await prepareAndPreviewGeneratedPdfFromDescriptorFactory({
      supabase,
      key: `pdf:history:${rid}`,
      label: "РћС‚РєСЂС‹РІР°СЋ PDFвЂ¦",
      createDescriptor,
      router,
      // XR-PDF: dismiss the request history modal before pushing PDF viewer
      onBeforeNavigate: closeRequestHistory,
    });
  }, [closeRequestHistory, foremanName, router]);

  // XR-PDF: closeRequestHistory is now wired via onBeforeNavigate inside openRequestHistoryPdf,
  // so no manual dismiss is needed here.
  const handleRequestHistorySelect = useCallback(async (reqId: string) => {
    await openRequestHistoryPdf(reqId);
  }, [openRequestHistoryPdf]);

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
  }, [draftItems, closeSubcontractFlow, resetSubcontractDraftContext, saveDraftAtomic]);

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

  return (
    <View style={{ flex: 1 }}>
      <ForemanSubcontractMainSections
        approvedContracts={approvedContracts}
        approvedContractsLoading={historyLoading}
        contentTopPad={contentTopPad}
        onScroll={onScroll}
        objOptions={dicts.objOptions}
        sysOptions={dicts.sysOptions}
        selectedTemplateId={selectedTemplateId}
        onSelectApprovedContract={acceptApprovedFromDirector}
        busy={saving || sending}
        onOpenRequestHistory={() => fetchRequestHistory(foremanName)}
        onOpenSubcontractHistory={() => {
          void loadHistory(userId);
          setHistoryOpen(true);
        }}
        ui={UI}
        styles={s}
      />

      <ForemanSubcontractModalStack
        subcontractDetailsVisible={subcontractDetailsVisible}
        onCloseSubcontractFlow={closeSubcontractFlow}
        modalHeaderTopPad={modalHeaderTopPad}
        templateContract={templateContract}
        templateObjectName={templateObjectName}
        templateLevelName={templateLevelName}
        templateSystemName={templateSystemName}
        formLevelCode={form.levelCode}
        formSystemCode={form.systemCode}
        formZoneText={form.zoneText}
        draftItemsCount={draftItems.length}
        lvlOptions={dicts.lvlOptions}
        sysOptions={dicts.sysOptions}
        onChangeLevelCode={(value) => setField("levelCode", value)}
        onChangeSystemCode={(value) => setField("systemCode", value)}
        onChangeZoneText={(value) => setField("zoneText", value)}
        onOpenCatalog={() => setSubcontractFlowScreen("catalog")}
        onOpenCalc={() => setSubcontractFlowScreen("workType")}
        onOpenDraft={() => setSubcontractFlowScreen("draft")}
        displayNo={displayNo}
        draftOpen={draftOpen}
        onCloseDraft={() => setSubcontractFlowScreen("details")}
        objectName={objectName}
        levelName={levelName}
        systemName={systemName}
        zoneName={zoneName}
        contractorName={contractorName}
        phoneName={phoneName}
        volumeText={volumeText}
        draftItems={draftItems}
        saving={saving}
        sending={sending}
        requestId={requestId}
        onRemoveDraftItem={removeDraftItem}
        onClearDraft={() => void clearDraft()}
        onPdf={() => void onPdf()}
        onExcel={() => Alert.alert("Excel", "Экспорт Excel для подрядов будет добавлен.")}
        onSendToDirector={() => void sendToDirector()}
        periodPickerVisible={!!dateTarget}
        onClosePeriodPicker={() => setDateTarget(null)}
        periodInitialFrom={dateTarget ? String(form[dateTarget] || "") : ""}
        periodInitialTo={dateTarget ? String(form[dateTarget] || "") : ""}
        onClearPeriod={() => {
          if (!dateTarget) return;
          setField(dateTarget, "");
          setDateTarget(null);
        }}
        onApplyPeriod={(from) => {
          if (!dateTarget) return;
          setField(dateTarget, String(from || ""));
          setDateTarget(null);
        }}
        ui={UI}
        catalogVisible={catalogVisible}
        onCloseCatalog={() => setSubcontractFlowScreen("details")}
        rikQuickSearch={rikQuickSearch}
        onCommitCatalogToDraft={(rows) => void appendCatalogRows(rows)}
        onOpenDraftFromCatalog={() => {
          setSubcontractFlowScreen("draft");
        }}
        workTypePickerVisible={workTypePickerVisible}
        onCloseWorkTypePicker={() => setSubcontractFlowScreen("details")}
        onSelectWorkType={(wt) => {
          setSelectedWorkType(wt);
          setSubcontractFlowScreen("calc");
        }}
        calcVisible={calcVisible}
        onCloseCalc={() => {
          setSubcontractFlowScreen("details");
          setSelectedWorkType(null);
        }}
        onBackFromCalc={() => {
          setSubcontractFlowScreen("workType");
        }}
        selectedWorkType={selectedWorkType}
        onAddCalcToRequest={async (rows) => {
          await appendCalcRows(rows);
          setSubcontractFlowScreen("details");
          setSelectedWorkType(null);
        }}
        requestHistoryVisible={requestHistoryVisible}
        onCloseRequestHistory={closeRequestHistory}
        requestHistoryLoading={requestHistoryLoading}
        requestHistoryRequests={historyRequests}
        resolveRequestStatusInfo={resolveRequestStatusInfo}
        onShowRequestDetails={(request) => void handleRequestHistorySelect(request.id)}
        onSelectRequest={(request) => void handleRequestHistorySelect(request.id)}
        onReopenRequest={(request) => void handleRequestHistorySelect(request.id)}
        onOpenRequestPdf={(reqId) => void openRequestHistoryPdf(reqId)}
        shortId={shortId}
        styles={s}
        subcontractHistoryVisible={historyOpen}
        onCloseSubcontractHistory={() => setHistoryOpen(false)}
        subcontractHistoryLoading={historyLoading}
        subcontractHistory={history}
      />
    </View>
  );
}
