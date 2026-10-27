import { useCallback, useMemo, useRef, useState } from "react";
import type { ScrollView } from "react-native";
import type { SupabaseClient } from "@supabase/supabase-js";

import { useLatest } from "../../../lib/useLatest";
import {
  fmtLocal as fmtLocalHelper,
  inferCountryCode as inferCountryCodeHelper,
  isDeadlineHoursActive as isDeadlineHoursActiveHelper,
  setDeadlineHours as setDeadlineHoursHelper,
} from "../buyer.helpers";
import { buyerStyles } from "../buyer.styles";
import { selectPickedIds } from "../buyer.selectors";
import { reportBuyerTabsScrollToStartFailure } from "../buyer.observability";
import { useBuyerFioConfirm } from "../useBuyerFioConfirm";
import { useBuyerAutoFio } from "./useBuyerAutoFio";
import { useBuyerHeaderCollapse } from "./useBuyerHeaderCollapse";
import { useBuyerRequestLabels } from "./useBuyerRequestLabels";
import { useBuyerRfqForm } from "./useBuyerRfqForm";
import { useBuyerRfqPrefill } from "./useBuyerRfqPrefill";
import { useBuyerRfqPublish } from "./useBuyerRfqPublish";
import { useBuyerScreenStoreViewModel } from "./useBuyerScreenStoreViewModel";
import { useBuyerSelection } from "./useBuyerSelection";
import { useBuyerSheets } from "./useBuyerSheets";
import { useBuyerTabsAutoScroll } from "./useBuyerTabsAutoScroll";
import { useTimedToast } from "./useTimedToast";
import { TOAST_DEFAULT_MS } from "../buyerUi";

type AlertFn = (title: string, message?: string) => void;

type UseBuyerScreenUiStateParams = {
  supabase: SupabaseClient;
  alertUser: AlertFn;
};

const s = buyerStyles;

export function useBuyerScreenUiState({ supabase, alertUser }: UseBuyerScreenUiStateParams) {
  const {
    tab,
    setTab,
    searchQuery,
    setFilters,
    setLoading,
    setRefreshReason,
  } = useBuyerScreenStoreViewModel();
  const [buyerFio, setBuyerFio] = useState<string>("");
  const {
    buyerHistory,
    isFioConfirmVisible,
    isFioLoading,
    setIsFioConfirmVisible,
    handleFioConfirm,
  } = useBuyerFioConfirm({ setBuyerFio });
  const { picked, setPicked, meta, setMeta, attachments, setAttachments } = useBuyerSelection();
  const pickedIds = useMemo(() => selectPickedIds(picked), [picked]);

  const pickedIdsRef = useLatest(pickedIds);
  const metaRef = useLatest(meta);
  const attachmentsRef = useLatest(attachments);
  const buyerFioRef = useLatest(buyerFio);
  const pickedRef = useLatest(picked);

  const [showAttachBlock, setShowAttachBlock] = useState(false);
  const closeAttachBlock = useCallback(() => setShowAttachBlock(false), []);
  const {
    sheetKind,
    selectedRequestId,
    isSheetOpen,
    closeSheet,
    openInboxSheet,
    openAccountingSheet,
    openReworkSheet,
    openPropDetailsSheet,
    openRfqSheet,
  } = useBuyerSheets({
    onCloseExtras: closeAttachBlock,
  });

  const { toast, showToast } = useTimedToast(TOAST_DEFAULT_MS);
  const rfqForm = useBuyerRfqForm();
  const {
    rfqDeadlineIso,
    setRfqDeadlineIso,
    rfqDeliveryDays,
    rfqPhone,
    setRfqPhone,
    rfqCountryCode,
    setRfqCountryCode,
    rfqEmail,
    setRfqEmail,
    rfqCity,
    rfqAddressText,
    rfqNote,
    rfqVisibility,
    rfqCountryCodeTouched,
    setRfqBusy,
  } = rfqForm;
  const rfqCityRef = useLatest(rfqCity);
  const rfqEmailRef = useLatest(rfqEmail);
  const rfqPhoneRef = useLatest(rfqPhone);

  const fmtLocal = useCallback((iso: string) => fmtLocalHelper(iso), []);
  const setDeadlineHours = useCallback((hours: number) => {
    setDeadlineHoursHelper(hours, setRfqDeadlineIso);
  }, [setRfqDeadlineIso]);
  const isDeadlineHoursActive = useCallback((hours: number) => {
    return isDeadlineHoursActiveHelper(hours, rfqDeadlineIso);
  }, [rfqDeadlineIso]);

  useBuyerRfqPrefill({
    sheetKind,
    rfqCityRef,
    rfqEmailRef,
    rfqPhoneRef,
    rfqCountryCodeTouchedRef: rfqCountryCodeTouched,
    setRfqCountryCode,
    setRfqEmail,
    setRfqPhone,
  });

  const { publishRfq } = useBuyerRfqPublish({
    pickedIds,
    rfqDeadlineIso,
    rfqDeliveryDays,
    rfqCity,
    rfqAddressText,
    rfqPhone,
    rfqCountryCode,
    rfqEmail,
    rfqVisibility,
    rfqNote,
    supabase,
    setRfqBusy,
    closeSheet,
    alertUser,
  });

  const {
    measuredHeaderMax,
    scrollY,
    headerHeight,
    titleSize,
    subOpacity,
    headerShadow,
    onHeaderMeasure,
  } = useBuyerHeaderCollapse();
  const tabsScrollRef = useRef<ScrollView | null>(null);
  const scrollTabsToStart = useCallback((animated = true) => {
    try {
      tabsScrollRef.current?.scrollTo?.({ x: 0, y: 0, animated });
    } catch (error) {
      reportBuyerTabsScrollToStartFailure(error);
    }
  }, []);

  const { prettyLabel, preloadDisplayNos, preloadPrNosByRequests } = useBuyerRequestLabels();
  useBuyerAutoFio({ supabase, buyerFio, setBuyerFio });
  useBuyerTabsAutoScroll(scrollTabsToStart);

  const setSearchQuery = useCallback((value: string) => {
    setFilters({ searchQuery: value });
  }, [setFilters]);

  return {
    s,
    tab,
    setTab,
    searchQuery,
    setLoading,
    setRefreshReason,
    setSearchQuery,
    buyerFio,
    buyerFioRef,
    buyerHistory,
    isFioConfirmVisible,
    isFioLoading,
    setIsFioConfirmVisible,
    handleFioConfirm,
    picked,
    setPicked,
    pickedRef,
    pickedIds,
    pickedIdsRef,
    meta,
    setMeta,
    metaRef,
    attachments,
    setAttachments,
    attachmentsRef,
    showAttachBlock,
    setShowAttachBlock,
    sheetKind,
    selectedRequestId,
    isSheetOpen,
    closeSheet,
    openInboxSheet,
    openAccountingSheet,
    openReworkSheet,
    openPropDetailsSheet,
    openRfqSheet,
    toast,
    showToast,
    rfqForm,
    publishRfq,
    fmtLocal,
    setDeadlineHours,
    isDeadlineHoursActive,
    inferCountryCode: inferCountryCodeHelper,
    measuredHeaderMax,
    scrollY,
    headerHeight,
    titleSize,
    subOpacity,
    headerShadow,
    onHeaderMeasure,
    tabsScrollRef,
    scrollTabsToStart,
    prettyLabel,
    preloadDisplayNos,
    preloadPrNosByRequests,
  };
}
