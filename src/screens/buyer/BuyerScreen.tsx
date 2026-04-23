// app/(tabs)/buyer.tsx
import { formatRequestDisplay } from "../../lib/format";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Platform, ScrollView, Animated,
  TextInput
} from 'react-native';
import { useLatest } from "../../lib/useLatest";
import IconSquareButton from "../../ui/IconSquareButton";
import { pickFileAny } from "../../lib/filePick";
import { Ionicons } from '@expo/vector-icons';
import { UI, KICK_THROTTLE_MS, TOAST_DEFAULT_MS } from "./buyerUi";
import {
  fmtLocal as fmtLocalHelper,
  setDeadlineHours as setDeadlineHoursHelper,
  isDeadlineHoursActive as isDeadlineHoursActiveHelper,
  inferCountryCode as inferCountryCodeHelper,
} from "./buyer.helpers";
import {
  selectPickedIds,
} from "./buyer.selectors";
import {
  selectBuyerMainListHeaderPad,
  selectInboxKeyboardLayoutActive,
} from "./buyer.screen.selectors";
import { BUYER_SEARCH_PLACEHOLDER } from "./buyer.screen.constants";
import { selectBuyerListLoading } from "./buyer.list.ui";
import {
  selectBuyerDisableInboxFooterActions,
  selectBuyerShowInboxFooter,
} from "./buyer.sheet.footer.selectors";
import { useGlobalBusy } from "../../ui/GlobalBusy";
import { useBuyerDocuments } from "./useBuyerDocuments";

import {
  BuyerStickyHeader,
  BuyerMainList,
} from "./buyer.components";
import { BuyerScreenSheets } from "./components/BuyerScreenSheets";
import { useBuyerProposalAttachments } from "./useBuyerProposalAttachments";
import {
  isReqContextNote,
  extractReqContextLines,
} from "./buyerUtils";
import {
  listBuyerInbox,
  proposalSubmit,
  buildProposalPdfHtml,
  uploadProposalAttachment,
  proposalSendToAccountant,
  createProposalsBySupplier as apiCreateProposalsBySupplier,
} from '../../lib/catalog_api';
import { supabase } from '../../lib/supabaseClient';
import { useBuyerFioConfirm } from "./useBuyerFioConfirm";
import { useBuyerSheets } from "./hooks/useBuyerSheets";
import { useBuyerRfqForm } from "./hooks/useBuyerRfqForm";
import { useBuyerRfqPrefill } from "./hooks/useBuyerRfqPrefill";
import { useBuyerDerived } from "./hooks/useBuyerDerived";
import { useBuyerProposalCaches } from "./hooks/useBuyerProposalCaches";
import { useBuyerRequestLabels } from "./hooks/useBuyerRequestLabels";
import { useTimedToast } from "./hooks/useTimedToast";
import { useBuyerTotals } from "./hooks/useBuyerTotals";
import { useBuyerSelectionActions } from "./hooks/useBuyerSelectionActions";
import { reportBuyerTabsScrollToStartFailure } from "./buyer.observability";
import { useBuyerSelection } from "./hooks/useBuyerSelection";
import { useBuyerState } from "./hooks/useBuyerState";
import { useBuyerLoadingController } from "./hooks/useBuyerLoadingController";
import { useBuyerSuppliers } from "./hooks/useBuyerSuppliers";
import { useBuyerKeyboard } from "./hooks/useBuyerKeyboard";
import { useBuyerHeaderCollapse } from "./hooks/useBuyerHeaderCollapse";
import { useBuyerTabsAutoScroll } from "./hooks/useBuyerTabsAutoScroll";
import { useBuyerAutoFio } from "./hooks/useBuyerAutoFio";
import { useBuyerSupplierSuggestions } from "./hooks/useBuyerSupplierSuggestions";
import { useBuyerAccountingModal } from "./hooks/useBuyerAccountingModal";
import { buyerStyles } from "./buyer.styles";
import { useBuyerEnsureAccountingFlags } from "./hooks/useBuyerEnsureAccountingFlags";
import { useBuyerReworkFlow } from "./hooks/useBuyerReworkFlow";
import { useBuyerProposalDetailsFlow } from "./hooks/useBuyerProposalDetailsFlow";
import { useBuyerAccountingSend } from "./hooks/useBuyerAccountingSend";
import { useBuyerCreateGuards } from "./hooks/useBuyerCreateGuards";
import { useBuyerCreateProposalsFlow } from "./hooks/useBuyerCreateProposalsFlow";
import { useBuyerSheetTitle } from "./hooks/useBuyerSheetTitle";
import { useBuyerRfqPublish } from "./hooks/useBuyerRfqPublish";
import { useBuyerInboxRenderers } from "./hooks/useBuyerInboxRenderers";
import { useBuyerProposalCardRenderer } from "./hooks/useBuyerProposalCardRenderer";
import { useBuyerAlerts } from "./hooks/useBuyerAlerts";
import { useBuyerScreenHeader } from "./hooks/useBuyerScreenHeader";
import { useBuyerAccountingSheetState } from "./hooks/useBuyerAccountingSheetState";
import { useBuyerProposalDetailsState } from "./hooks/useBuyerProposalDetailsState";
import { useBuyerStore } from "./buyer.store";
import RoleScreenLayout from "../../components/layout/RoleScreenLayout";
import BuyerSubcontractTab from "./BuyerSubcontractTab";

const isWeb = Platform.OS === 'web';


export function BuyerScreen() {
  const busy = useGlobalBusy();
  const { alertUser: screenAlertUser } = useBuyerAlerts();
  const tab = useBuyerStore((state) => state.activeTab);
  const setTab = useBuyerStore((state) => state.setTab);
  const searchQuery = useBuyerStore((state) => state.filters.searchQuery ?? "");
  const setFilters = useBuyerStore((state) => state.setFilters);
  const setLoading = useBuyerStore((state) => state.setLoading);
  const setRefreshReason = useBuyerStore((state) => state.setRefreshReason);
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

  const [showAttachBlock, setShowAttachBlock] = useState(false);
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
    onCloseExtras: () => setShowAttachBlock(false),
  });

  const { toast, showToast } = useTimedToast(TOAST_DEFAULT_MS);
  const rfqForm = useBuyerRfqForm();
  const {
    rfqBusy,
    setRfqBusy,
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
  } = rfqForm;

  const rfqCityRef = useLatest(rfqCity);
  const rfqEmailRef = useLatest(rfqEmail);
  const rfqPhoneRef = useLatest(rfqPhone);
  const {
    measuredHeaderMax,
    scrollY,
    headerHeight,
    titleSize,
    subOpacity,
    headerShadow,
    onHeaderMeasure,
  } = useBuyerHeaderCollapse();

  const fmtLocal = (iso: string) => fmtLocalHelper(iso);

  const setDeadlineHours = (hours: number) => {
    setDeadlineHoursHelper(hours, setRfqDeadlineIso);
  };

  const isDeadlineHoursActive = (hours: number) => {
    return isDeadlineHoursActiveHelper(hours, rfqDeadlineIso);
  };

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

  const {
    rows,
    setRows,
    loadingInbox,
    setLoadingInbox,
    loadingInboxMore,
    setLoadingInboxMore,
    inboxHasMore,
    setInboxHasMore,
    inboxTotalCount,
    setInboxTotalCount,
    inboxPublicationState,
    setInboxPublicationState,
    inboxPublicationMessage,
    setInboxPublicationMessage,
    refreshing,
    setRefreshing,
    pending,
    setPending,
    approved,
    setApproved,
    rejected,
    setRejected,
    loadingBuckets,
    setLoadingBuckets,
    bucketsPublicationState,
    setBucketsPublicationState,
    bucketsPublicationMessage,
    setBucketsPublicationMessage,
    subcontractCount,
    setSubcontractCount,
  } = useBuyerState();

  const {
    titleByPid,
    proposalNoByPid,
    preloadProposalNosByIds,
    preloadProposalTitles,
  } = useBuyerProposalCaches();

  const { suppliers, counterparties, hasAnyOptions, hasHardFailure } = useBuyerSuppliers();


  const accountingSheet = useBuyerAccountingSheetState();
  const proposalDetailsSheet = useBuyerProposalDetailsState();

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
  const { fetchInbox, fetchInboxNextPage, fetchBuckets, onRefresh } = useBuyerLoadingController({
    supabase,
    activeTab: tab,
    searchQuery,
    rows,
    pending,
    approved,
    rejected,
    listBuyerInbox,
    preloadDisplayNos,
    preloadProposalTitles,
    setLoadingInbox,
    setLoadingInboxMore,
    setInboxHasMore,
    setInboxTotalCount,
    setInboxPublicationState,
    setInboxPublicationMessage,
    setRows,
    setLoadingBuckets,
    setBucketsPublicationState,
    setBucketsPublicationMessage,
    setPending,
    setApproved,
    setRejected,
    setSubcontractCount,
    setRefreshing,
    setRefreshReason,
    kickMsInbox: KICK_THROTTLE_MS,
    kickMsBuckets: 900,
    alert: screenAlertUser,
    log: console.warn,
  });
  const { getSupplierSuggestions } = useBuyerSupplierSuggestions(counterparties);

  const {
    groups,
    sheetGroup,
    rfqPickedPreview,
    supplierGroups,
    requiredSuppliers,
    missingAttachSuppliers,
    attachSlotsTotal,
    attachMissingCount,
    attachFilledCount,
    needAttachWarn,
    sheetData,
    listData,
    tabCounts,
  } = useBuyerDerived({
    rows,
    inboxTotalCount,
    pickedIds,
    meta,
    attachments,
    sheetKind,
    selectedRequestId,
    tab,
    pending,
    approved,
    rejected,
    searchQuery,
    titleByPid
  });

  const setSearchQuery = useCallback((value: string) => {
    setFilters({ searchQuery: value });
  }, [setFilters]);

  useEffect(() => {
    const ids = Array.from(
      new Set((groups || []).map(g => String(g.request_id || "").trim()).filter(Boolean))
    );
    if (ids.length) void preloadPrNosByRequests(ids);
  }, [groups, preloadPrNosByRequests]);
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
    alertUser: screenAlertUser,
  });
  const { lineTotal, requestSum } = useBuyerTotals({ rows, pickedIds, meta });


  const pickedRef = useLatest(picked);
  const { togglePick, clearPick, setLineMeta } = useBuyerSelectionActions({
    setPicked,
    setMeta,
    pickedRef,
    showToast,
  });
  const {
    renderItemRow,
    renderGroupBlock,
    renderMobileEditorModal,
    isMobileEditorVisible,
  } = useBuyerInboxRenderers({
    s,
    picked,
    meta,
    lineTotal,
    togglePick,
    setLineMeta,
    getSupplierSuggestions,
    suppliers,
    isSheetOpen,
    sheetKind,
    setShowAttachBlock,
    requestSum,
    prettyLabel,
    openInboxSheet,
    supplierGroups,
    attachments,
    setAttachments,
    isWeb,
    hasAnyCounterpartyOptions: hasAnyOptions,
    counterpartyHardFailure: hasHardFailure,
  });
  const { kbOpen } = useBuyerKeyboard({ enabled: !isMobileEditorVisible });

  useEffect(() => {
    if (sheetKind === "inbox") setShowAttachBlock(false);
  }, [sheetKind]);

  useEffect(() => {
    if (isWeb && kbOpen) setShowAttachBlock(false);
  }, [kbOpen]);

  const { validatePicked, removeFromInboxLocally, confirmSendWithoutAttachments } = useBuyerCreateGuards({
    groups,
    picked,
    meta,
    attachments,
    attachMissingCount,
    attachSlotsTotal,
    missingAttachSuppliers,
    setRows,
    formatRequestDisplay,
    alertUser: screenAlertUser,
  });

  const { creating, handleCreateProposalsBySupplier } = useBuyerCreateProposalsFlow({
    pickedIdsRef,
    metaRef,
    attachmentsRef,
    buyerFioRef,
    needAttachWarn,
    kbOpen,
    validatePicked,
    confirmSendWithoutAttachments,
    apiCreateProposalsBySupplier,
    supabase,
    uploadProposalAttachment: async (proposalId, file, fileName, groupKey) => {
      await uploadProposalAttachment(proposalId, file, fileName, groupKey);
    },
    setAttachments,
    removeFromInboxLocally,
    clearPick,
    fetchInbox,
    fetchBuckets,
    setTab: (nextTab) => setTab(nextTab),
    closeSheet,
    setShowAttachBlock,
    showToast,
    alertUser: screenAlertUser,
  });

  const { openProposalPdf } = useBuyerDocuments({ busy, supabase });
  const openProposalPdfFromDetails = useCallback(
    (pid: string) =>
      openProposalPdf(pid, {
        head: proposalDetailsSheet.propViewHead,
        lines: proposalDetailsSheet.propViewLines,
      }),
    [openProposalPdf, proposalDetailsSheet.propViewHead, proposalDetailsSheet.propViewLines],
  );
  const {
    propAttBusy,
    propAttByPid,
    propAttErrByPid,
    loadProposalAttachments,
    openPropAttachment,
    attachFileToProposal,
  } = useBuyerProposalAttachments({
    supabase,
    pickFileAny,
    uploadProposalAttachment,
    alert: screenAlertUser,
  });
  const { openAccountingModal } = useBuyerAccountingModal({
    supabase,
    buildProposalPdfHtml,
    uploadProposalAttachment,
    setPropDocBusy: accountingSheet.setPropDocBusy,
    setPropDocAttached: accountingSheet.setPropDocAttached,
    setInvAmount: accountingSheet.setInvAmount,
    setAcctSupp: accountingSheet.setAcctSupp,
    setAcctProposalId: accountingSheet.setAcctProposalId,
    setInvNumber: accountingSheet.setInvNumber,
    setInvDate: accountingSheet.setInvDate,
    setInvCurrency: accountingSheet.setInvCurrency,
    setInvFile: accountingSheet.setInvFile,
    openAccountingSheet,
  });
  const { ensureAccountingFlags } = useBuyerEnsureAccountingFlags({
    supabase,
    proposalSubmit: async (pid) => {
      await proposalSubmit(pid);
    },
  });
  const { openInvoicePickerWeb, pickInvoiceFile, sendToAccounting } = useBuyerAccountingSend({
    acctProposalId: accountingSheet.acctProposalId,
    invNumber: accountingSheet.invNumber,
    invDate: accountingSheet.invDate,
    invAmount: accountingSheet.invAmount,
    invCurrency: accountingSheet.invCurrency,
    invFile: accountingSheet.invFile,
    invoiceUploadedName: accountingSheet.invoiceUploadedName,
    buildProposalPdfHtml,
    proposalSendToAccountant: async (payload) => {
      await proposalSendToAccountant(payload);
    },
    uploadProposalAttachment: async (proposalId, file, fileName, groupKey) => {
      await uploadProposalAttachment(proposalId, file, fileName, groupKey);
    },
    ensureAccountingFlags,
    supabase,
    fetchBuckets,
    closeSheet,
    setApproved,
    setAcctBusy: accountingSheet.setAcctBusy,
    setInvoiceUploadedName: accountingSheet.setInvoiceUploadedName,
    alertUser: screenAlertUser,
  });

  const reworkFlow = useBuyerReworkFlow({
    supabase,
    openReworkSheet,
    proposalSubmit: async (pid) => {
      await proposalSubmit(pid);
    },
    fetchInbox,
    fetchBuckets,
    setRejected,
    closeSheet,
    buildProposalPdfHtml,
    uploadProposalAttachment: async (proposalId, file, fileName, groupKey) => {
      await uploadProposalAttachment(proposalId, file, fileName, groupKey);
    },
    proposalSendToAccountant: async (payload) => {
      await proposalSendToAccountant(payload);
    },
    ensureAccountingFlags,
    alertUser: screenAlertUser,
  });
  const { openRework } = reworkFlow;
  const { openProposalDetailsLines, openProposalDetailsAttachments } = useBuyerProposalDetailsFlow({
    supabase,
    isPropDetailsOpen: sheetKind === "prop_details",
    preloadProposalNosByIds,
    loadProposalAttachments,
    openPropDetailsSheet,
    setPropViewId: proposalDetailsSheet.setPropViewId,
    setPropViewHead: proposalDetailsSheet.setPropViewHead,
    setPropViewLines: proposalDetailsSheet.setPropViewLines,
    setPropViewBusy: proposalDetailsSheet.setPropViewBusy,
  });

  const { renderProposalCard } = useBuyerProposalCardRenderer({
    s,
    titleByPid,
    propAttByPid,
    openProposalPdf,
    openAccountingModal,
    openRework,
    openProposalDetailsLines,
    openProposalDetailsAttachments,
  });

  useEffect(() => {
    setLoading({
      list: selectBuyerListLoading(tab, loadingInbox, loadingBuckets) || refreshing,
      action:
        creating
        || accountingSheet.acctBusy
        || proposalDetailsSheet.propViewBusy
        || accountingSheet.propDocBusy
        || propAttBusy
        || reworkFlow.rwBusy
        || rfqBusy,
    });
  }, [
    accountingSheet.acctBusy,
    creating,
    loadingBuckets,
    loadingInbox,
    propAttBusy,
    accountingSheet.propDocBusy,
    proposalDetailsSheet.propViewBusy,
    refreshing,
    rfqBusy,
    reworkFlow.rwBusy,
    setLoading,
    tab,
  ]);

  const sheetTitle = useBuyerSheetTitle({
    sheetKind,
    sheetGroup,
    acctProposalId: accountingSheet.acctProposalId,
    rwPid: reworkFlow.rwPid,
    propViewId: proposalDetailsSheet.propViewId,
    proposalNoByPid,
    prettyLabel,
  });
  const inboxKeyboardLayoutActive = selectInboxKeyboardLayoutActive(kbOpen, isMobileEditorVisible);
  const header = useBuyerScreenHeader({
    s,
    tab,
    setTab,
    buyerFio,
    onOpenFioModal: () => setIsFioConfirmVisible(true),
    titleSize,
    subOpacity,
    counts: {
      ...tabCounts,
      subcontractCount,
    },
    tabsScrollRef,
    scrollTabsToStart,
  });
  const mainListHeaderPad = selectBuyerMainListHeaderPad(measuredHeaderMax);
  const showInboxFooter = selectBuyerShowInboxFooter(inboxKeyboardLayoutActive);
  const { disableClear, disableRfq, disableSend } = selectBuyerDisableInboxFooterActions(
    pickedIds.length,
    creating
  );
  const showWebRefreshButton = isWeb && __DEV__ && tab !== "subcontracts";

  const ScreenBody = (
    <RoleScreenLayout style={[s.screen, { backgroundColor: UI.bg }]}>
      <BuyerStickyHeader
        header={header}
        onHeaderMeasure={onHeaderMeasure}
        headerHeight={headerHeight}
        headerShadow={headerShadow}
      />

      <Animated.View style={{
        position: 'absolute',
        top: headerHeight,
        left: 0,
        right: 0,
        zIndex: 40,
        backgroundColor: UI.bg,
        paddingHorizontal: 16,
        paddingBottom: 10,
        paddingTop: 4
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TextInput
            testID="buyer-search-input"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={BUYER_SEARCH_PLACEHOLDER}
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={[
              s.fieldInput,
              {
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 16,
                height: 44,
                borderStyle: 'solid',
              },
            ]}
          />
          {showWebRefreshButton ? (
            <IconSquareButton
              onPress={() => {
                void onRefresh();
              }}
              accessibilityLabel="Обновить buyer"
              width={44}
              height={44}
              radius={14}
              bg="rgba(255,255,255,0.08)"
              bgPressed="rgba(255,255,255,0.14)"
              bgDisabled="rgba(255,255,255,0.04)"
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
            </IconSquareButton>
          ) : null}
        </View>
      </Animated.View>

      {tab === "subcontracts" ? (
        <BuyerSubcontractTab
          contentTopPad={measuredHeaderMax}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          buyerFio={buyerFio}
        />
      ) : (
        <BuyerMainList
          s={s}
          tab={tab}
          data={listData}
          publicationState={tab === "inbox" ? inboxPublicationState : bucketsPublicationState}
          publicationMessage={tab === "inbox" ? inboxPublicationMessage : bucketsPublicationMessage}
          measuredHeaderMax={mainListHeaderPad}
          refreshing={refreshing}
          onRefresh={onRefresh}
          loadingInbox={loadingInbox}
          loadingBuckets={loadingBuckets}
          loadingInboxMore={loadingInboxMore}
          inboxHasMore={inboxHasMore}
          onLoadMoreInbox={() => {
            void fetchInboxNextPage();
          }}
          scrollY={scrollY}
          renderGroupBlock={renderGroupBlock}
          renderProposalCard={renderProposalCard}
        />
      )}

      <BuyerScreenSheets
        s={s}
        isWeb={isWeb}
        sheetKind={sheetKind}
        sheetTitle={sheetTitle}
        isSheetOpen={isSheetOpen}
        closeSheet={closeSheet}
        fioModal={{
          visible: isFioConfirmVisible,
          initialFio: buyerFio,
          onConfirm: handleFioConfirm,
          loading: isFioLoading,
          history: buyerHistory,
        }}
        inbox={{
          sheetGroup,
          sheetData,
          kbOpen: inboxKeyboardLayoutActive,
          creating,
          needAttachWarn,
          showAttachBlock,
          setShowAttachBlock,
          requiredSuppliers,
          missingAttachSuppliers,
          attachMissingCount,
          attachFilledCount,
          attachSlotsTotal,
          pickedIdsLen: pickedIds.length,
          attachments,
          setAttachments,
          renderItemRow,
          showFooter: showInboxFooter,
          clearPick,
          openRfqSheet,
          handleCreateProposalsBySupplier,
          disableClear,
          disableRfq,
          disableSend,
        }}
        renderMobileEditorModal={renderMobileEditorModal}
        proposalDetails={{
          state: proposalDetailsSheet,
          isReqContextNote,
          extractReqContextLines,
          propAttBusy,
          propAttErrByPid,
          propAttByPid,
          loadProposalAttachments,
          attachFileToProposal,
          openPropAttachment,
          openProposalPdfFromDetails,
          openAccountingModal,
          openRework,
        }}
        accounting={{
          ...accountingSheet,
          openInvoicePickerWeb,
          pickInvoiceFile,
          sendToAccounting,
        }}
        rework={{
          ...reworkFlow,
          pickInvoiceFile: reworkFlow.rwPickInvoiceNative,
        }}
        rfq={{
          form: rfqForm,
          pickedIdsLen: pickedIds.length,
          rfqPickedPreview,
          fmtLocal,
          setDeadlineHours,
          isDeadlineHoursActive,
          inferCountryCode: inferCountryCodeHelper,
          publishRfq,
        }}
        toast={toast}
      />

    </RoleScreenLayout>
  );
  return ScreenBody;
}

const s = buyerStyles;
