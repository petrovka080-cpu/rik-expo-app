// app/(tabs)/buyer.tsx
import { formatRequestDisplay } from "../../src/lib/format";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Platform, ScrollView, Animated,
  TextInput
} from 'react-native';
import { useLatest } from "../../src/lib/useLatest";
import IconSquareButton from "../../src/ui/IconSquareButton";
import SendPrimaryButton from "../../src/ui/SendPrimaryButton";
import { pickFileAny } from "../../src/lib/filePick";
import { Ionicons } from '@expo/vector-icons';
import { UI, KICK_THROTTLE_MS, TOAST_DEFAULT_MS } from "../../src/screens/buyer/buyerUi";
import type {
  Attachment,
  ProposalHeadLite,
  ProposalViewLine,
} from "../../src/screens/buyer/buyer.types";
import ToastOverlay from "../../src/screens/buyer/ToastOverlay";
import {
  fmtLocal as fmtLocalHelper,
  setDeadlineHours as setDeadlineHoursHelper,
  isDeadlineHoursActive as isDeadlineHoursActiveHelper,
  inferCountryCode as inferCountryCodeHelper,
} from "../../src/screens/buyer/buyer.helpers";
import {
  selectPickedIds,
} from "../../src/screens/buyer/buyer.selectors";
import {
  selectBuyerMainListHeaderPad,
  selectInboxKeyboardLayoutActive,
} from "../../src/screens/buyer/buyer.screen.selectors";
import { BUYER_SEARCH_PLACEHOLDER } from "../../src/screens/buyer/buyer.screen.constants";
import { selectBuyerListLoading } from "../../src/screens/buyer/buyer.list.ui";
import {
  selectBuyerDisableInboxFooterActions,
  selectBuyerShowInboxFooter,
} from "../../src/screens/buyer/buyer.sheet.footer.selectors";
import { useGlobalBusy } from "../../src/ui/GlobalBusy";
import { useBuyerDocuments } from "../../src/screens/buyer/useBuyerDocuments";

import AppButton from "../../src/ui/AppButton";
import {
  BuyerStickyHeader,
  BuyerMainList,
  BuyerSheetShell,
  BuyerAccountingSheetBody,
  BuyerReworkSheetBody,
  SheetFooterActions,
  BuyerRfqSheetBody,
  BuyerPropDetailsSheetBody,
  BuyerInboxSheetBody,
} from "../../src/screens/buyer/buyer.components";
import { useBuyerProposalAttachments } from "../../src/screens/buyer/useBuyerProposalAttachments";
import {
  isReqContextNote,
  extractReqContextLines,
} from "../../src/screens/buyer/buyerUtils";
import {
  listBuyerInbox,
  proposalSubmit,
  buildProposalPdfHtml,
  uploadProposalAttachment,
  proposalSendToAccountant,
  createProposalsBySupplier as apiCreateProposalsBySupplier,
} from '../../src/lib/catalog_api';
import { supabase } from '../../src/lib/supabaseClient';
import WarehouseFioModal from "../../src/screens/warehouse/components/WarehouseFioModal";
import { useBuyerFioConfirm } from "../../src/screens/buyer/useBuyerFioConfirm";
import { useBuyerSheets } from "../../src/screens/buyer/hooks/useBuyerSheets";
import { useBuyerRfqForm } from "../../src/screens/buyer/hooks/useBuyerRfqForm";
import { useBuyerRfqPrefill } from "../../src/screens/buyer/hooks/useBuyerRfqPrefill";
import { useBuyerDerived } from "../../src/screens/buyer/hooks/useBuyerDerived";
import { useBuyerProposalCaches } from "../../src/screens/buyer/hooks/useBuyerProposalCaches";
import { useBuyerRequestLabels } from "../../src/screens/buyer/hooks/useBuyerRequestLabels";
import { useTimedToast } from "../../src/screens/buyer/hooks/useTimedToast";
import { useBuyerTotals } from "../../src/screens/buyer/hooks/useBuyerTotals";
import { useBuyerSelectionActions } from "../../src/screens/buyer/hooks/useBuyerSelectionActions";
import { useBuyerSelection } from "../../src/screens/buyer/hooks/useBuyerSelection";
import { useBuyerState } from "../../src/screens/buyer/hooks/useBuyerState";
import { useBuyerLoadingController } from "../../src/screens/buyer/hooks/useBuyerLoadingController";
import { useBuyerSuppliers } from "../../src/screens/buyer/hooks/useBuyerSuppliers";
import { useBuyerKeyboard } from "../../src/screens/buyer/hooks/useBuyerKeyboard";
import { useBuyerHeaderCollapse } from "../../src/screens/buyer/hooks/useBuyerHeaderCollapse";
import { useBuyerTabsAutoScroll } from "../../src/screens/buyer/hooks/useBuyerTabsAutoScroll";
import { useBuyerAutoFio } from "../../src/screens/buyer/hooks/useBuyerAutoFio";
import { useBuyerSupplierSuggestions } from "../../src/screens/buyer/hooks/useBuyerSupplierSuggestions";
import { useBuyerAccountingModal } from "../../src/screens/buyer/hooks/useBuyerAccountingModal";
import { buyerStyles } from "../../src/screens/buyer/buyer.styles";
import { useBuyerEnsureAccountingFlags } from "../../src/screens/buyer/hooks/useBuyerEnsureAccountingFlags";
import { useBuyerReworkFlow } from "../../src/screens/buyer/hooks/useBuyerReworkFlow";
import { useBuyerProposalDetailsFlow } from "../../src/screens/buyer/hooks/useBuyerProposalDetailsFlow";
import { useBuyerAccountingSend } from "../../src/screens/buyer/hooks/useBuyerAccountingSend";
import { useBuyerCreateGuards } from "../../src/screens/buyer/hooks/useBuyerCreateGuards";
import { useBuyerCreateProposalsFlow } from "../../src/screens/buyer/hooks/useBuyerCreateProposalsFlow";
import { useBuyerSheetTitle } from "../../src/screens/buyer/hooks/useBuyerSheetTitle";
import { useBuyerRfqPublish } from "../../src/screens/buyer/hooks/useBuyerRfqPublish";
import { useBuyerInboxRenderers } from "../../src/screens/buyer/hooks/useBuyerInboxRenderers";
import { useBuyerProposalCardRenderer } from "../../src/screens/buyer/hooks/useBuyerProposalCardRenderer";
import { useBuyerAlerts } from "../../src/screens/buyer/hooks/useBuyerAlerts";
import { useBuyerScreenHeader } from "../../src/screens/buyer/hooks/useBuyerScreenHeader";
import { useBuyerStore } from "../../src/screens/buyer/buyer.store";
import RoleScreenLayout from "../../src/components/layout/RoleScreenLayout";
import BuyerSubcontractTab from "../../src/screens/buyer/BuyerSubcontractTab";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

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
  const {
    rfqBusy,
    setRfqBusy,
    rfqDeadlineIso,
    setRfqDeadlineIso,
    rfqDeliveryDays,
    setRfqDeliveryDays,
    rfqPhone,
    setRfqPhone,
    rfqCountryCode,
    setRfqCountryCode,
    rfqEmail,
    setRfqEmail,
    rfqCity,
    setRfqCity,
    rfqAddressText,
    setRfqAddressText,
    rfqNote,
    setRfqNote,
    rfqShowItems,
    setRfqShowItems,
    rfqVisibility,
    setRfqVisibility,
    rfqPaymentTerms,
    setRfqPaymentTerms,
    rfqDeliveryType,
    setRfqDeliveryType,
    rfqDeliveryWindow,
    setRfqDeliveryWindow,
    rfqNeedInvoice,
    setRfqNeedInvoice,
    rfqNeedWaybill,
    setRfqNeedWaybill,
    rfqNeedCert,
    setRfqNeedCert,
    rfqRememberContacts,
    setRfqRememberContacts,
    rfqCountryCodeTouched,
  } = useBuyerRfqForm();

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


  const [acctProposalId, setAcctProposalId] = useState<string | number | null>(null);
  const [invNumber, setInvNumber] = useState('');
  const [invDate, setInvDate] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invCurrency, setInvCurrency] = useState('KGS');
  const [invFile, setInvFile] = useState<Attachment["file"] | null>(null);
  const [acctBusy, setAcctBusy] = useState(false);

  const [propViewId, setPropViewId] = useState<string | null>(null);
  const [propViewBusy, setPropViewBusy] = useState(false);
  const [propViewLines, setPropViewLines] = useState<ProposalViewLine[]>([]);
  const [propViewHead, setPropViewHead] = useState<ProposalHeadLite | null>(null);

  const [acctSupp, setAcctSupp] = useState<{
    name: string;
    inn?: string | null;
    bank?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null>(null);

  const tabsScrollRef = useRef<ScrollView | null>(null);
  const scrollTabsToStart = useCallback((animated = true) => {
    try { tabsScrollRef.current?.scrollTo?.({ x: 0, y: 0, animated }); } catch { }
  }, []);

  const [propDocAttached, setPropDocAttached] = useState<{ name: string; url?: string } | null>(null);
  const [propDocBusy, setPropDocBusy] = useState(false);


  const [invoiceUploadedName, setInvoiceUploadedName] = useState<string>('');

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
    setPropDocBusy,
    setPropDocAttached,
    setInvAmount,
    setAcctSupp,
    setAcctProposalId,
    setInvNumber,
    setInvDate,
    setInvCurrency,
    setInvFile,
    openAccountingSheet,
  });
  const { ensureAccountingFlags } = useBuyerEnsureAccountingFlags({
    supabase,
    proposalSubmit: async (pid) => {
      await proposalSubmit(pid);
    },
  });
  const { openInvoicePickerWeb, pickInvoiceFile, sendToAccounting } = useBuyerAccountingSend({
    acctProposalId,
    invNumber,
    invDate,
    invAmount,
    invCurrency,
    invFile,
    invoiceUploadedName,
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
    setAcctBusy,
    setInvoiceUploadedName,
    alertUser: screenAlertUser,
  });

  const {
    rwBusy,
    rwPid,
    rwReason,
    rwItems,
    setRwItems,
    rwInvNumber,
    setRwInvNumber,
    rwInvDate,
    setRwInvDate,
    rwInvAmount,
    setRwInvAmount,
    rwInvCurrency,
    setRwInvCurrency,
    rwInvFile,
    setRwInvFile,
    rwInvUploadedName,
    openRework,
    rwSaveItems,
    rwPickInvoiceNative,
    rwSendToDirector,
    rwSendToAccounting,
  } = useBuyerReworkFlow({
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
  const { openProposalDetailsLines, openProposalDetailsAttachments } = useBuyerProposalDetailsFlow({
    supabase,
    isPropDetailsOpen: sheetKind === "prop_details",
    preloadProposalNosByIds,
    loadProposalAttachments,
    openPropDetailsSheet,
    setPropViewId,
    setPropViewHead,
    setPropViewLines,
    setPropViewBusy,
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
        || acctBusy
        || propViewBusy
        || propDocBusy
        || propAttBusy
        || rwBusy
        || rfqBusy,
    });
  }, [
    acctBusy,
    creating,
    loadingBuckets,
    loadingInbox,
    propAttBusy,
    propDocBusy,
    propViewBusy,
    refreshing,
    rfqBusy,
    rwBusy,
    setLoading,
    tab,
  ]);

  const sheetTitle = useBuyerSheetTitle({
    sheetKind,
    sheetGroup,
    acctProposalId,
    rwPid,
    propViewId,
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

      <WarehouseFioModal
        visible={isFioConfirmVisible}
        initialFio={buyerFio}
        onConfirm={handleFioConfirm}
        loading={isFioLoading}
        history={buyerHistory}
      />



      <BuyerSheetShell
        isOpen={isSheetOpen}
        onClose={closeSheet}
        s={s}
        title={sheetTitle}

      >
        <View style={[s.sheetBody, { flex: 1, minHeight: 0 }]}>
            {sheetKind === "inbox" && sheetGroup ? (
              <BuyerInboxSheetBody
                s={s}
                sheetGroup={sheetGroup}
                sheetData={sheetData}
                kbOpen={inboxKeyboardLayoutActive}
                creating={creating}
                needAttachWarn={needAttachWarn}
                showAttachBlock={showAttachBlock}
                setShowAttachBlock={setShowAttachBlock}
                requiredSuppliers={requiredSuppliers}
                missingAttachSuppliers={missingAttachSuppliers}
                attachMissingCount={attachMissingCount}
                attachFilledCount={attachFilledCount}
                attachSlotsTotal={attachSlotsTotal}
                pickedIdsLen={pickedIds.length}
                attachments={attachments}
                setAttachments={setAttachments}
                renderItemRow={renderItemRow}
                footer={
                  showInboxFooter ? (
                    <SheetFooterActions
                      s={s}
                      left={
                        <IconSquareButton
                          onPress={clearPick}
                          disabled={disableClear}
                          accessibilityLabel="Очистить выбор"
                          width={52}
                          height={52}
                          radius={16}
                          bg="#1F2933"
                          bgPressed="#273341"
                          bgDisabled="#111827"
                          spinnerColor="#FFFFFF"
                        >
                          <Ionicons name="close" size={22} color="#FFFFFF" />
                        </IconSquareButton>
                      }
                      center={
                        <AppButton
                          label="ТОРГИ"
                          variant="blue"
                          shape="wide"
                          disabled={disableRfq}
                          onPress={openRfqSheet}
                        />
                      }
                      right={
                        <View style={needAttachWarn ? s.sendBtnWarnWrap : null}>
                          <SendPrimaryButton
                            variant="green"
                            disabled={disableSend}
                            loading={creating}
                            accessibilityLabel="Отправить директору"
                            onPress={handleCreateProposalsBySupplier}
                          />
                        </View>
                      }
                    />
                  ) : null
                }
              />
            ) : null}

            {renderMobileEditorModal?.()}

            {sheetKind === "prop_details" ? (
              <BuyerPropDetailsSheetBody
                s={s}
                head={propViewHead}
                propViewBusy={propViewBusy}
                propViewLines={propViewLines}
                isReqContextNote={isReqContextNote}
                extractReqContextLines={extractReqContextLines}

                propAttBusy={propAttBusy}
                propAttErr={propViewId ? (propAttErrByPid[propViewId] || "") : ""}
                attachments={propViewId ? (propAttByPid[propViewId] || []) : []}

                onReloadAttachments={() => {
                  if (propViewId) loadProposalAttachments(propViewId);
                }}
                onAttachFile={() => {
                  if (propViewId) attachFileToProposal(propViewId, "extra");
                }}
                onOpenAttachment={openPropAttachment}
                onOpenPdf={openProposalPdf}
                onOpenAccounting={openAccountingModal}
                onOpenRework={openRework}
              />
            ) : null}

            {sheetKind === "accounting" ? (
              <BuyerAccountingSheetBody
                s={s}
                isWeb={isWeb}
                acctProposalId={acctProposalId}
                propDocBusy={propDocBusy}
                propDocAttached={propDocAttached}
                acctSupp={acctSupp}
                invNumber={invNumber}
                setInvNumber={setInvNumber}
                invDate={invDate}
                setInvDate={setInvDate}
                invAmount={invAmount}
                setInvAmount={setInvAmount}
                invCurrency={invCurrency}
                setInvCurrency={setInvCurrency}
                invoiceUploadedName={invoiceUploadedName}
                openInvoicePickerWeb={openInvoicePickerWeb}
                invFile={invFile}
                pickInvoiceFile={pickInvoiceFile}
                setInvFile={setInvFile}
                acctBusy={acctBusy}
                sendToAccounting={sendToAccounting}
                closeSheet={closeSheet}
              />
            ) : null}

            {sheetKind === "rework" ? (
              <BuyerReworkSheetBody
                s={s}
                rwBusy={rwBusy}
                rwPid={rwPid}
                rwReason={rwReason}
                rwItems={rwItems}
                setRwItems={setRwItems}
                rwInvNumber={rwInvNumber}
                setRwInvNumber={setRwInvNumber}
                rwInvDate={rwInvDate}
                setRwInvDate={setRwInvDate}
                rwInvAmount={rwInvAmount}
                setRwInvAmount={setRwInvAmount}
                rwInvCurrency={rwInvCurrency}
                setRwInvCurrency={setRwInvCurrency}
                rwInvFile={rwInvFile}
                setRwInvFile={setRwInvFile}
                rwInvUploadedName={rwInvUploadedName}
                pickInvoiceFile={rwPickInvoiceNative}
                rwSaveItems={rwSaveItems}
                rwSendToDirector={rwSendToDirector}
                rwSendToAccounting={rwSendToAccounting}
                closeSheet={closeSheet}
              />
            ) : null}

            {sheetKind === "rfq" ? (
              <BuyerRfqSheetBody
                s={s}
                rfqBusy={rfqBusy}
                closeSheet={closeSheet}
                pickedIdsLen={pickedIds.length}
                rfqShowItems={rfqShowItems}
                setRfqShowItems={setRfqShowItems}
                rfqPickedPreview={rfqPickedPreview}
                fmtLocal={fmtLocal}
                rfqDeadlineIso={rfqDeadlineIso}
                setDeadlineHours={setDeadlineHours}
                isDeadlineHoursActive={isDeadlineHoursActive}
                rfqDeliveryDays={rfqDeliveryDays}
                setRfqDeliveryDays={setRfqDeliveryDays}
                rfqDeliveryType={rfqDeliveryType}
                setRfqDeliveryType={setRfqDeliveryType}
                rfqCity={rfqCity}
                setRfqCity={setRfqCity}
                rfqCountryCodeTouchedRef={rfqCountryCodeTouched}
                inferCountryCode={inferCountryCodeHelper}
                setRfqCountryCode={setRfqCountryCode}
                rfqAddressText={rfqAddressText}
                setRfqAddressText={setRfqAddressText}
                rfqDeliveryWindow={rfqDeliveryWindow}
                setRfqDeliveryWindow={setRfqDeliveryWindow}
                rfqCountryCode={rfqCountryCode}
                rfqPhone={rfqPhone}
                setRfqPhone={setRfqPhone}
                rfqEmail={rfqEmail}
                setRfqEmail={setRfqEmail}
                rfqRememberContacts={rfqRememberContacts}
                setRfqRememberContacts={setRfqRememberContacts}
                rfqVisibility={rfqVisibility}
                setRfqVisibility={setRfqVisibility}
                rfqPaymentTerms={rfqPaymentTerms}
                setRfqPaymentTerms={setRfqPaymentTerms}
                rfqNeedInvoice={rfqNeedInvoice}
                setRfqNeedInvoice={setRfqNeedInvoice}
                rfqNeedWaybill={rfqNeedWaybill}
                setRfqNeedWaybill={setRfqNeedWaybill}
                rfqNeedCert={rfqNeedCert}
                setRfqNeedCert={setRfqNeedCert}
                rfqNote={rfqNote}
                setRfqNote={setRfqNote}
                publishRfq={publishRfq}
              />
            ) : null}
          </View>

      </BuyerSheetShell>
      <ToastOverlay toast={toast} />
    </RoleScreenLayout>
  );
  return ScreenBody;
}

export default withScreenErrorBoundary(BuyerScreen, {
  screen: "buyer",
  route: "/buyer",
});

const s = buyerStyles;
