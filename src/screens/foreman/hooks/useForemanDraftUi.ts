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
  const calcVisible = useForemanDraftStore((state) => state.calcVisible);
  const setCalcVisible = useForemanDraftStore((state) => state.setCalcVisible);
  const catalogVisible = useForemanDraftStore((state) => state.catalogVisible);
  const setCatalogVisible = useForemanDraftStore((state) => state.setCatalogVisible);
  const openCatalog = useForemanDraftStore((state) => state.openCatalog);
  const closeCatalog = useForemanDraftStore((state) => state.closeCatalog);
  const workTypePickerVisible = useForemanDraftStore((state) => state.workTypePickerVisible);
  const setWorkTypePickerVisible = useForemanDraftStore((state) => state.setWorkTypePickerVisible);
  const openWorkTypePicker = useForemanDraftStore((state) => state.openWorkTypePicker);
  const closeWorkTypePicker = useForemanDraftStore((state) => state.closeWorkTypePicker);
  const selectedWorkType = useForemanDraftStore((state) => state.selectedWorkType);
  const setSelectedWorkType = useForemanDraftStore((state) => state.setSelectedWorkType);
  const showCalcForWorkType = useForemanDraftStore((state) => state.showCalcForWorkType);
  const closeCalc = useForemanDraftStore((state) => state.closeCalc);
  const backToWorkTypePicker = useForemanDraftStore((state) => state.backToWorkTypePicker);

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
    calcVisible,
    setCalcVisible,
    catalogVisible,
    setCatalogVisible,
    openCatalog,
    closeCatalog,
    workTypePickerVisible,
    setWorkTypePickerVisible,
    openWorkTypePicker,
    closeWorkTypePicker,
    selectedWorkType,
    setSelectedWorkType,
    showCalcForWorkType,
    closeCalc,
    backToWorkTypePicker,
    screenLock,
  };
}
