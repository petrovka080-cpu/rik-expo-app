import { useMemo } from "react";
import { useForemanDraftStore } from "../foremanDraft.store";

export function useForemanDraftUi() {
  const draftOpen = useForemanDraftStore((state) => state.draftOpen);
  const setDraftOpen = useForemanDraftStore((state) => state.setDraftOpen);
  const openDraft = useForemanDraftStore((state) => state.openDraft);
  const closeDraft = useForemanDraftStore((state) => state.closeDraft);
  const busy = useForemanDraftStore((state) => state.busy);
  const setBusy = useForemanDraftStore((state) => state.setBusy);
  const draftDeleteBusy = useForemanDraftStore((state) => state.draftDeleteBusy);
  const setDraftDeleteBusy = useForemanDraftStore((state) => state.setDraftDeleteBusy);
  const draftSendBusy = useForemanDraftStore((state) => state.draftSendBusy);
  const setDraftSendBusy = useForemanDraftStore((state) => state.setDraftSendBusy);
  const aiEstimateVisible = useForemanDraftStore((state) => state.aiEstimateVisible);
  const setAiEstimateVisible = useForemanDraftStore((state) => state.setAiEstimateVisible);
  const catalogVisible = useForemanDraftStore((state) => state.catalogVisible);
  const setCatalogVisible = useForemanDraftStore((state) => state.setCatalogVisible);
  const openCatalog = useForemanDraftStore((state) => state.openCatalog);
  const closeCatalog = useForemanDraftStore((state) => state.closeCatalog);
  const openAiEstimateComposer = useForemanDraftStore((state) => state.openAiEstimateComposer);
  const closeAiEstimateComposer = useForemanDraftStore((state) => state.closeAiEstimateComposer);

  const screenLock = useMemo(() => busy || draftDeleteBusy || draftSendBusy, [busy, draftDeleteBusy, draftSendBusy]);

  return {
    draftOpen,
    setDraftOpen,
    openDraft,
    closeDraft,
    busy,
    setBusy,
    draftDeleteBusy,
    setDraftDeleteBusy,
    draftSendBusy,
    setDraftSendBusy,
    aiEstimateVisible,
    setAiEstimateVisible,
    catalogVisible,
    setCatalogVisible,
    openCatalog,
    closeCatalog,
    openAiEstimateComposer,
    closeAiEstimateComposer,
    screenLock,
  };
}
