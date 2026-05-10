// app/(tabs)/buyer.tsx
import { formatRequestDisplay } from "../../../lib/format";

import { useCallback } from 'react';
import {
  Platform,
} from 'react-native';
import { pickFileAny } from "../../../lib/filePick";
import { KICK_THROTTLE_MS } from "../buyerUi";
import { useGlobalBusy } from "../../../ui/GlobalBusy";
import { useBuyerDocuments } from "../useBuyerDocuments";

import { useBuyerScreenContentProps, type BuyerScreenContentProps } from "../components/BuyerScreenContent";
import { useBuyerProposalAttachments } from "../useBuyerProposalAttachments";
import {
  isReqContextNote,
  extractReqContextLines,
} from "../buyerUtils";
import {
  listBuyerInbox,
  proposalSubmit,
  buildProposalPdfHtml,
  uploadProposalAttachment,
  proposalSendToAccountant,
  createProposalsBySupplier as apiCreateProposalsBySupplier,
} from '../../../lib/catalog_api';
import { supabase } from '../../../lib/supabaseClient';
import { useBuyerDerived } from "./useBuyerDerived";
import { useBuyerProposalCaches } from "./useBuyerProposalCaches";
import { useBuyerTotals } from "./useBuyerTotals";
import { useBuyerSelectionActions } from "./useBuyerSelectionActions";
import { useBuyerState } from "./useBuyerState";
import { useBuyerLoadingController } from "./useBuyerLoadingController";
import { useBuyerSuppliers } from "./useBuyerSuppliers";
import { useBuyerKeyboard } from "./useBuyerKeyboard";
import { useBuyerSupplierSuggestions } from "./useBuyerSupplierSuggestions";
import { useBuyerAccountingModal } from "./useBuyerAccountingModal";
import { useBuyerEnsureAccountingFlags } from "./useBuyerEnsureAccountingFlags";
import { useBuyerReworkFlow } from "./useBuyerReworkFlow";
import { useBuyerProposalDetailsFlow } from "./useBuyerProposalDetailsFlow";
import { useBuyerAccountingSend } from "./useBuyerAccountingSend";
import { useBuyerCreateGuards } from "./useBuyerCreateGuards";
import { useBuyerCreateProposalsFlow } from "./useBuyerCreateProposalsFlow";
import { useBuyerSheetTitle } from "./useBuyerSheetTitle";
import { useBuyerInboxRenderers } from "./useBuyerInboxRenderers";
import { useBuyerProposalCardRenderer } from "./useBuyerProposalCardRenderer";
import { useBuyerAlerts } from "./useBuyerAlerts";
import { useBuyerAccountingSheetState } from "./useBuyerAccountingSheetState";
import { useBuyerProposalDetailsState } from "./useBuyerProposalDetailsState";
import {
  useBuyerAttachmentBlockAutoClose,
  useBuyerPreloadProposalRequestNumbers,
  useBuyerScreenLoadingPublisher,
} from "./useBuyerScreenSideEffects";
import { useBuyerScreenUiState } from "./useBuyerScreenUiState";
import { useBuyerScreenChromeModel } from "./useBuyerScreenChromeModel";

const isWeb = Platform.OS === 'web';


export function useBuyerScreenController(): BuyerScreenContentProps {
  const busy = useGlobalBusy();
  const { alertUser: screenAlertUser } = useBuyerAlerts();
  const {
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
    inferCountryCode,
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
  } = useBuyerScreenUiState({ supabase, alertUser: screenAlertUser });
  const {
    rfqBusy,
  } = rfqForm;

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

  useBuyerPreloadProposalRequestNumbers({ groups, preloadPrNosByRequests });
  const { lineTotal, requestSum } = useBuyerTotals({ rows, pickedIds, meta });


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

  useBuyerAttachmentBlockAutoClose({ sheetKind, isWeb, kbOpen, setShowAttachBlock });

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

  const { viewModel, header } = useBuyerScreenChromeModel({
    s,
    tab,
    setTab,
    buyerFio,
    setIsFioConfirmVisible,
    measuredHeaderMax,
    kbOpen,
    isMobileEditorVisible,
    pickedIdsLength: pickedIds.length,
    creating,
    isWeb,
    tabCounts,
    subcontractCount,
    titleSize,
    subOpacity,
    tabsScrollRef,
    scrollTabsToStart,
  });

  useBuyerScreenLoadingPublisher({
    tab,
    loadingInbox,
    loadingBuckets,
    refreshing,
    creating,
    accountingBusy: accountingSheet.acctBusy,
    proposalDetailsBusy: proposalDetailsSheet.propViewBusy,
    proposalDocumentBusy: accountingSheet.propDocBusy,
    proposalAttachmentsBusy: propAttBusy,
    reworkBusy: reworkFlow.rwBusy,
    rfqBusy,
    setLoading,
  });

  const sheetTitle = useBuyerSheetTitle({
    sheetKind,
    sheetGroup,
    acctProposalId: accountingSheet.acctProposalId,
    rwPid: reworkFlow.rwPid,
    propViewId: proposalDetailsSheet.propViewId,
    proposalNoByPid,
    prettyLabel,
  });

  const contentProps = useBuyerScreenContentProps({
    s,
    isWeb,
    tab,
    buyerFio,
    searchQuery,
    onChangeSearchQuery: setSearchQuery,
    onRefresh,
    fetchInboxNextPage,
    showWebRefreshButton: viewModel.showWebRefreshButton,
    refreshAccessibilityLabel: "Refresh buyer",
    measuredHeaderMax,
    scrollY,
    stickyHeader: {
        header,
        onHeaderMeasure,
        headerHeight,
        headerShadow,
    },
    mainListHeaderPad: viewModel.mainListHeaderPad,
    mainList: {
        data: listData,
        publicationState: tab === "inbox" ? inboxPublicationState : bucketsPublicationState,
        publicationMessage: tab === "inbox" ? inboxPublicationMessage : bucketsPublicationMessage,
        refreshing,
        onRefresh,
        loadingInbox,
        loadingBuckets,
        loadingInboxMore,
        inboxHasMore,
        renderGroupBlock,
        renderProposalCard,
    },
    sheets: {
        sheetKind,
        sheetTitle,
        isSheetOpen,
        closeSheet,
        fioModal: {
          visible: isFioConfirmVisible,
          initialFio: buyerFio,
          onConfirm: handleFioConfirm,
          loading: isFioLoading,
          history: buyerHistory,
        },
        inbox: {
          sheetGroup,
          sheetData,
          kbOpen: viewModel.inboxKeyboardLayoutActive,
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
          showFooter: viewModel.showInboxFooter,
          clearPick,
          openRfqSheet,
          handleCreateProposalsBySupplier,
          disableClear: viewModel.disableClear,
          disableRfq: viewModel.disableRfq,
          disableSend: viewModel.disableSend,
        },
        renderMobileEditorModal,
        proposalDetails: {
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
        },
        accounting: {
          ...accountingSheet,
          openInvoicePickerWeb,
          pickInvoiceFile,
          sendToAccounting,
        },
        rework: {
          ...reworkFlow,
          pickInvoiceFile: reworkFlow.rwPickInvoiceNative,
        },
        rfq: {
          form: rfqForm,
          pickedIdsLen: pickedIds.length,
          rfqPickedPreview,
          fmtLocal,
          setDeadlineHours,
          isDeadlineHoursActive,
          inferCountryCode,
          publishRfq,
        },
        toast,
    },
  });

  return contentProps;
}
