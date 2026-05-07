import React, { useCallback, useMemo } from "react";
import { Animated, StyleSheet } from "react-native";

import RoleScreenLayout from "../../../components/layout/RoleScreenLayout";
import { UI } from "../buyerUi";
import type { BuyerTab } from "../buyer.types";
import BuyerSubcontractTab from "../BuyerSubcontractTab";
import { BuyerMainList, BuyerStickyHeader } from "../buyer.components";
import { BuyerScreenSheets, type BuyerScreenSheetsProps } from "./BuyerScreenSheets";
import { BuyerSearchBar } from "./BuyerSearchBar";
import type { StylesBag } from "./component.types";

type BuyerStickyHeaderProps = React.ComponentProps<typeof BuyerStickyHeader>;
type BuyerMainListProps = React.ComponentProps<typeof BuyerMainList>;

export type BuyerScreenContentProps = {
  s: StylesBag;
  isWeb: boolean;
  tab: BuyerTab;
  buyerFio: string;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  onRefresh: () => void;
  showWebRefreshButton: boolean;
  refreshAccessibilityLabel: string;
  measuredHeaderMax: number;
  scrollY: Animated.Value;
  stickyHeader: BuyerStickyHeaderProps;
  mainListHeaderPad: number;
  mainList: Omit<BuyerMainListProps, "s" | "tab" | "measuredHeaderMax" | "scrollY">;
  sheets: Omit<BuyerScreenSheetsProps, "s" | "isWeb">;
};

type RefreshFn = () => void | Promise<void>;

export type UseBuyerScreenContentPropsParams = Omit<
  BuyerScreenContentProps,
  "onRefresh" | "mainList"
> & {
  onRefresh: RefreshFn;
  fetchInboxNextPage: RefreshFn;
  mainList: Omit<BuyerScreenContentProps["mainList"], "onLoadMoreInbox">;
};

export const BuyerScreenContent = React.memo(function BuyerScreenContent({
  s,
  isWeb,
  tab,
  buyerFio,
  searchQuery,
  onChangeSearchQuery,
  onRefresh,
  showWebRefreshButton,
  refreshAccessibilityLabel,
  measuredHeaderMax,
  scrollY,
  stickyHeader,
  mainListHeaderPad,
  mainList,
  sheets,
}: BuyerScreenContentProps) {
  const subcontractScrollHandler = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
      }),
    [scrollY],
  );
  const searchBarHostStyle = useMemo(
    () => [styles.searchBarHost, { top: stickyHeader.headerHeight }],
    [stickyHeader.headerHeight],
  );
  const rootStyle = useMemo(() => [s.screen, styles.root], [s.screen]);

  return (
    <RoleScreenLayout style={rootStyle}>
      <BuyerStickyHeader {...stickyHeader} />

      <Animated.View style={searchBarHostStyle}>
        <BuyerSearchBar
          s={s}
          searchQuery={searchQuery}
          onChangeSearchQuery={onChangeSearchQuery}
          showWebRefreshButton={showWebRefreshButton}
          onRefresh={onRefresh}
          refreshAccessibilityLabel={refreshAccessibilityLabel}
        />
      </Animated.View>

      {tab === "subcontracts" ? (
        <BuyerSubcontractTab
          contentTopPad={measuredHeaderMax}
          onScroll={subcontractScrollHandler}
          buyerFio={buyerFio}
        />
      ) : (
        <BuyerMainList
          {...mainList}
          s={s}
          tab={tab}
          measuredHeaderMax={mainListHeaderPad}
          scrollY={scrollY}
        />
      )}

      <BuyerScreenSheets {...sheets} s={s} isWeb={isWeb} />
    </RoleScreenLayout>
  );
});

export function useBuyerScreenContentProps({
  s,
  isWeb,
  tab,
  buyerFio,
  searchQuery,
  onChangeSearchQuery,
  onRefresh,
  fetchInboxNextPage,
  showWebRefreshButton,
  refreshAccessibilityLabel,
  measuredHeaderMax,
  scrollY,
  stickyHeader,
  mainListHeaderPad,
  mainList,
  sheets,
}: UseBuyerScreenContentPropsParams): BuyerScreenContentProps {
  const buyerContentRefresh = useCallback(() => {
    void onRefresh();
  }, [onRefresh]);

  const loadMoreInbox = useCallback(() => {
    void fetchInboxNextPage();
  }, [fetchInboxNextPage]);

  const stableStickyHeader = useMemo<BuyerScreenContentProps["stickyHeader"]>(
    () => ({
      header: stickyHeader.header,
      onHeaderMeasure: stickyHeader.onHeaderMeasure,
      headerHeight: stickyHeader.headerHeight,
      headerShadow: stickyHeader.headerShadow,
    }),
    [stickyHeader.header, stickyHeader.headerHeight, stickyHeader.headerShadow, stickyHeader.onHeaderMeasure],
  );

  const stableMainList = useMemo<BuyerScreenContentProps["mainList"]>(
    () => ({
      data: mainList.data,
      publicationState: mainList.publicationState,
      publicationMessage: mainList.publicationMessage,
      refreshing: mainList.refreshing,
      onRefresh: mainList.onRefresh,
      loadingInbox: mainList.loadingInbox,
      loadingBuckets: mainList.loadingBuckets,
      loadingInboxMore: mainList.loadingInboxMore,
      inboxHasMore: mainList.inboxHasMore,
      onLoadMoreInbox: loadMoreInbox,
      renderGroupBlock: mainList.renderGroupBlock,
      renderProposalCard: mainList.renderProposalCard,
    }),
    [
      mainList.data,
      mainList.publicationState,
      mainList.publicationMessage,
      mainList.refreshing,
      mainList.onRefresh,
      mainList.loadingInbox,
      mainList.loadingBuckets,
      mainList.loadingInboxMore,
      mainList.inboxHasMore,
      mainList.renderGroupBlock,
      mainList.renderProposalCard,
      loadMoreInbox,
    ],
  );

  const stableSheets = useMemo<BuyerScreenContentProps["sheets"]>(
    () => ({
      sheetKind: sheets.sheetKind,
      sheetTitle: sheets.sheetTitle,
      isSheetOpen: sheets.isSheetOpen,
      closeSheet: sheets.closeSheet,
      fioModal: {
        visible: sheets.fioModal.visible,
        initialFio: sheets.fioModal.initialFio,
        onConfirm: sheets.fioModal.onConfirm,
        loading: sheets.fioModal.loading,
        history: sheets.fioModal.history,
      },
      inbox: {
        sheetGroup: sheets.inbox.sheetGroup,
        sheetData: sheets.inbox.sheetData,
        kbOpen: sheets.inbox.kbOpen,
        creating: sheets.inbox.creating,
        needAttachWarn: sheets.inbox.needAttachWarn,
        showAttachBlock: sheets.inbox.showAttachBlock,
        setShowAttachBlock: sheets.inbox.setShowAttachBlock,
        requiredSuppliers: sheets.inbox.requiredSuppliers,
        missingAttachSuppliers: sheets.inbox.missingAttachSuppliers,
        attachMissingCount: sheets.inbox.attachMissingCount,
        attachFilledCount: sheets.inbox.attachFilledCount,
        attachSlotsTotal: sheets.inbox.attachSlotsTotal,
        pickedIdsLen: sheets.inbox.pickedIdsLen,
        attachments: sheets.inbox.attachments,
        setAttachments: sheets.inbox.setAttachments,
        renderItemRow: sheets.inbox.renderItemRow,
        showFooter: sheets.inbox.showFooter,
        clearPick: sheets.inbox.clearPick,
        openRfqSheet: sheets.inbox.openRfqSheet,
        handleCreateProposalsBySupplier: sheets.inbox.handleCreateProposalsBySupplier,
        disableClear: sheets.inbox.disableClear,
        disableRfq: sheets.inbox.disableRfq,
        disableSend: sheets.inbox.disableSend,
      },
      renderMobileEditorModal: sheets.renderMobileEditorModal,
      proposalDetails: {
        state: {
          propViewId: sheets.proposalDetails.state.propViewId,
          setPropViewId: sheets.proposalDetails.state.setPropViewId,
          propViewBusy: sheets.proposalDetails.state.propViewBusy,
          setPropViewBusy: sheets.proposalDetails.state.setPropViewBusy,
          propViewLines: sheets.proposalDetails.state.propViewLines,
          setPropViewLines: sheets.proposalDetails.state.setPropViewLines,
          propViewHead: sheets.proposalDetails.state.propViewHead,
          setPropViewHead: sheets.proposalDetails.state.setPropViewHead,
        },
        isReqContextNote: sheets.proposalDetails.isReqContextNote,
        extractReqContextLines: sheets.proposalDetails.extractReqContextLines,
        propAttBusy: sheets.proposalDetails.propAttBusy,
        propAttErrByPid: sheets.proposalDetails.propAttErrByPid,
        propAttByPid: sheets.proposalDetails.propAttByPid,
        loadProposalAttachments: sheets.proposalDetails.loadProposalAttachments,
        attachFileToProposal: sheets.proposalDetails.attachFileToProposal,
        openPropAttachment: sheets.proposalDetails.openPropAttachment,
        openProposalPdfFromDetails: sheets.proposalDetails.openProposalPdfFromDetails,
        openAccountingModal: sheets.proposalDetails.openAccountingModal,
        openRework: sheets.proposalDetails.openRework,
      },
      accounting: {
        acctProposalId: sheets.accounting.acctProposalId,
        setAcctProposalId: sheets.accounting.setAcctProposalId,
        invNumber: sheets.accounting.invNumber,
        setInvNumber: sheets.accounting.setInvNumber,
        invDate: sheets.accounting.invDate,
        setInvDate: sheets.accounting.setInvDate,
        invAmount: sheets.accounting.invAmount,
        setInvAmount: sheets.accounting.setInvAmount,
        invCurrency: sheets.accounting.invCurrency,
        setInvCurrency: sheets.accounting.setInvCurrency,
        invFile: sheets.accounting.invFile,
        setInvFile: sheets.accounting.setInvFile,
        acctBusy: sheets.accounting.acctBusy,
        setAcctBusy: sheets.accounting.setAcctBusy,
        acctSupp: sheets.accounting.acctSupp,
        setAcctSupp: sheets.accounting.setAcctSupp,
        propDocAttached: sheets.accounting.propDocAttached,
        setPropDocAttached: sheets.accounting.setPropDocAttached,
        propDocBusy: sheets.accounting.propDocBusy,
        setPropDocBusy: sheets.accounting.setPropDocBusy,
        invoiceUploadedName: sheets.accounting.invoiceUploadedName,
        setInvoiceUploadedName: sheets.accounting.setInvoiceUploadedName,
        openInvoicePickerWeb: sheets.accounting.openInvoicePickerWeb,
        pickInvoiceFile: sheets.accounting.pickInvoiceFile,
        sendToAccounting: sheets.accounting.sendToAccounting,
      },
      rework: {
        rwBusy: sheets.rework.rwBusy,
        rwPid: sheets.rework.rwPid,
        rwReason: sheets.rework.rwReason,
        rwItems: sheets.rework.rwItems,
        setRwItems: sheets.rework.setRwItems,
        rwInvNumber: sheets.rework.rwInvNumber,
        setRwInvNumber: sheets.rework.setRwInvNumber,
        rwInvDate: sheets.rework.rwInvDate,
        setRwInvDate: sheets.rework.setRwInvDate,
        rwInvAmount: sheets.rework.rwInvAmount,
        setRwInvAmount: sheets.rework.setRwInvAmount,
        rwInvCurrency: sheets.rework.rwInvCurrency,
        setRwInvCurrency: sheets.rework.setRwInvCurrency,
        rwInvFile: sheets.rework.rwInvFile,
        setRwInvFile: sheets.rework.setRwInvFile,
        rwInvUploadedName: sheets.rework.rwInvUploadedName,
        pickInvoiceFile: sheets.rework.pickInvoiceFile,
        rwSaveItems: sheets.rework.rwSaveItems,
        rwSendToDirector: sheets.rework.rwSendToDirector,
        rwSendToAccounting: sheets.rework.rwSendToAccounting,
      },
      rfq: {
        form: {
          rfqBusy: sheets.rfq.form.rfqBusy,
          setRfqBusy: sheets.rfq.form.setRfqBusy,
          rfqDeadlineIso: sheets.rfq.form.rfqDeadlineIso,
          setRfqDeadlineIso: sheets.rfq.form.setRfqDeadlineIso,
          rfqDeliveryDays: sheets.rfq.form.rfqDeliveryDays,
          setRfqDeliveryDays: sheets.rfq.form.setRfqDeliveryDays,
          rfqPhone: sheets.rfq.form.rfqPhone,
          setRfqPhone: sheets.rfq.form.setRfqPhone,
          rfqCountryCode: sheets.rfq.form.rfqCountryCode,
          setRfqCountryCode: sheets.rfq.form.setRfqCountryCode,
          rfqEmail: sheets.rfq.form.rfqEmail,
          setRfqEmail: sheets.rfq.form.setRfqEmail,
          rfqCity: sheets.rfq.form.rfqCity,
          setRfqCity: sheets.rfq.form.setRfqCity,
          rfqAddressText: sheets.rfq.form.rfqAddressText,
          setRfqAddressText: sheets.rfq.form.setRfqAddressText,
          rfqNote: sheets.rfq.form.rfqNote,
          setRfqNote: sheets.rfq.form.setRfqNote,
          rfqShowItems: sheets.rfq.form.rfqShowItems,
          setRfqShowItems: sheets.rfq.form.setRfqShowItems,
          rfqVisibility: sheets.rfq.form.rfqVisibility,
          setRfqVisibility: sheets.rfq.form.setRfqVisibility,
          rfqPaymentTerms: sheets.rfq.form.rfqPaymentTerms,
          setRfqPaymentTerms: sheets.rfq.form.setRfqPaymentTerms,
          rfqDeliveryType: sheets.rfq.form.rfqDeliveryType,
          setRfqDeliveryType: sheets.rfq.form.setRfqDeliveryType,
          rfqDeliveryWindow: sheets.rfq.form.rfqDeliveryWindow,
          setRfqDeliveryWindow: sheets.rfq.form.setRfqDeliveryWindow,
          rfqNeedInvoice: sheets.rfq.form.rfqNeedInvoice,
          setRfqNeedInvoice: sheets.rfq.form.setRfqNeedInvoice,
          rfqNeedWaybill: sheets.rfq.form.rfqNeedWaybill,
          setRfqNeedWaybill: sheets.rfq.form.setRfqNeedWaybill,
          rfqNeedCert: sheets.rfq.form.rfqNeedCert,
          setRfqNeedCert: sheets.rfq.form.setRfqNeedCert,
          rfqRememberContacts: sheets.rfq.form.rfqRememberContacts,
          setRfqRememberContacts: sheets.rfq.form.setRfqRememberContacts,
          rfqCountryCodeTouched: sheets.rfq.form.rfqCountryCodeTouched,
        },
        pickedIdsLen: sheets.rfq.pickedIdsLen,
        rfqPickedPreview: sheets.rfq.rfqPickedPreview,
        fmtLocal: sheets.rfq.fmtLocal,
        setDeadlineHours: sheets.rfq.setDeadlineHours,
        isDeadlineHoursActive: sheets.rfq.isDeadlineHoursActive,
        inferCountryCode: sheets.rfq.inferCountryCode,
        publishRfq: sheets.rfq.publishRfq,
      },
      toast: sheets.toast,
    }),
    [
      sheets.sheetKind,
      sheets.sheetTitle,
      sheets.isSheetOpen,
      sheets.closeSheet,
      sheets.fioModal.visible,
      sheets.fioModal.initialFio,
      sheets.fioModal.onConfirm,
      sheets.fioModal.loading,
      sheets.fioModal.history,
      sheets.inbox.sheetGroup,
      sheets.inbox.sheetData,
      sheets.inbox.kbOpen,
      sheets.inbox.creating,
      sheets.inbox.needAttachWarn,
      sheets.inbox.showAttachBlock,
      sheets.inbox.setShowAttachBlock,
      sheets.inbox.requiredSuppliers,
      sheets.inbox.missingAttachSuppliers,
      sheets.inbox.attachMissingCount,
      sheets.inbox.attachFilledCount,
      sheets.inbox.attachSlotsTotal,
      sheets.inbox.pickedIdsLen,
      sheets.inbox.attachments,
      sheets.inbox.setAttachments,
      sheets.inbox.renderItemRow,
      sheets.inbox.showFooter,
      sheets.inbox.clearPick,
      sheets.inbox.openRfqSheet,
      sheets.inbox.handleCreateProposalsBySupplier,
      sheets.inbox.disableClear,
      sheets.inbox.disableRfq,
      sheets.inbox.disableSend,
      sheets.renderMobileEditorModal,
      sheets.proposalDetails.state.propViewId,
      sheets.proposalDetails.state.setPropViewId,
      sheets.proposalDetails.state.propViewBusy,
      sheets.proposalDetails.state.setPropViewBusy,
      sheets.proposalDetails.state.propViewLines,
      sheets.proposalDetails.state.setPropViewLines,
      sheets.proposalDetails.state.propViewHead,
      sheets.proposalDetails.state.setPropViewHead,
      sheets.proposalDetails.isReqContextNote,
      sheets.proposalDetails.extractReqContextLines,
      sheets.proposalDetails.propAttBusy,
      sheets.proposalDetails.propAttErrByPid,
      sheets.proposalDetails.propAttByPid,
      sheets.proposalDetails.loadProposalAttachments,
      sheets.proposalDetails.attachFileToProposal,
      sheets.proposalDetails.openPropAttachment,
      sheets.proposalDetails.openProposalPdfFromDetails,
      sheets.proposalDetails.openAccountingModal,
      sheets.proposalDetails.openRework,
      sheets.accounting.acctProposalId,
      sheets.accounting.setAcctProposalId,
      sheets.accounting.invNumber,
      sheets.accounting.setInvNumber,
      sheets.accounting.invDate,
      sheets.accounting.setInvDate,
      sheets.accounting.invAmount,
      sheets.accounting.setInvAmount,
      sheets.accounting.invCurrency,
      sheets.accounting.setInvCurrency,
      sheets.accounting.invFile,
      sheets.accounting.setInvFile,
      sheets.accounting.acctBusy,
      sheets.accounting.setAcctBusy,
      sheets.accounting.acctSupp,
      sheets.accounting.setAcctSupp,
      sheets.accounting.propDocAttached,
      sheets.accounting.setPropDocAttached,
      sheets.accounting.propDocBusy,
      sheets.accounting.setPropDocBusy,
      sheets.accounting.invoiceUploadedName,
      sheets.accounting.setInvoiceUploadedName,
      sheets.accounting.openInvoicePickerWeb,
      sheets.accounting.pickInvoiceFile,
      sheets.accounting.sendToAccounting,
      sheets.rework.rwBusy,
      sheets.rework.rwPid,
      sheets.rework.rwReason,
      sheets.rework.rwItems,
      sheets.rework.setRwItems,
      sheets.rework.rwInvNumber,
      sheets.rework.setRwInvNumber,
      sheets.rework.rwInvDate,
      sheets.rework.setRwInvDate,
      sheets.rework.rwInvAmount,
      sheets.rework.setRwInvAmount,
      sheets.rework.rwInvCurrency,
      sheets.rework.setRwInvCurrency,
      sheets.rework.rwInvFile,
      sheets.rework.setRwInvFile,
      sheets.rework.rwInvUploadedName,
      sheets.rework.pickInvoiceFile,
      sheets.rework.rwSaveItems,
      sheets.rework.rwSendToDirector,
      sheets.rework.rwSendToAccounting,
      sheets.rfq.form.rfqBusy,
      sheets.rfq.form.setRfqBusy,
      sheets.rfq.form.rfqDeadlineIso,
      sheets.rfq.form.setRfqDeadlineIso,
      sheets.rfq.form.rfqDeliveryDays,
      sheets.rfq.form.setRfqDeliveryDays,
      sheets.rfq.form.rfqPhone,
      sheets.rfq.form.setRfqPhone,
      sheets.rfq.form.rfqCountryCode,
      sheets.rfq.form.setRfqCountryCode,
      sheets.rfq.form.rfqEmail,
      sheets.rfq.form.setRfqEmail,
      sheets.rfq.form.rfqCity,
      sheets.rfq.form.setRfqCity,
      sheets.rfq.form.rfqAddressText,
      sheets.rfq.form.setRfqAddressText,
      sheets.rfq.form.rfqNote,
      sheets.rfq.form.setRfqNote,
      sheets.rfq.form.rfqShowItems,
      sheets.rfq.form.setRfqShowItems,
      sheets.rfq.form.rfqVisibility,
      sheets.rfq.form.setRfqVisibility,
      sheets.rfq.form.rfqPaymentTerms,
      sheets.rfq.form.setRfqPaymentTerms,
      sheets.rfq.form.rfqDeliveryType,
      sheets.rfq.form.setRfqDeliveryType,
      sheets.rfq.form.rfqDeliveryWindow,
      sheets.rfq.form.setRfqDeliveryWindow,
      sheets.rfq.form.rfqNeedInvoice,
      sheets.rfq.form.setRfqNeedInvoice,
      sheets.rfq.form.rfqNeedWaybill,
      sheets.rfq.form.setRfqNeedWaybill,
      sheets.rfq.form.rfqNeedCert,
      sheets.rfq.form.setRfqNeedCert,
      sheets.rfq.form.rfqRememberContacts,
      sheets.rfq.form.setRfqRememberContacts,
      sheets.rfq.form.rfqCountryCodeTouched,
      sheets.rfq.pickedIdsLen,
      sheets.rfq.rfqPickedPreview,
      sheets.rfq.fmtLocal,
      sheets.rfq.setDeadlineHours,
      sheets.rfq.isDeadlineHoursActive,
      sheets.rfq.inferCountryCode,
      sheets.rfq.publishRfq,
      sheets.toast,
    ],
  );

  return useMemo<BuyerScreenContentProps>(
    () => ({
      s,
      isWeb,
      tab,
      buyerFio,
      searchQuery,
      onChangeSearchQuery,
      onRefresh: buyerContentRefresh,
      showWebRefreshButton,
      refreshAccessibilityLabel,
      measuredHeaderMax,
      scrollY,
      stickyHeader: stableStickyHeader,
      mainListHeaderPad,
      mainList: stableMainList,
      sheets: stableSheets,
    }),
    [
      s,
      isWeb,
      tab,
      buyerFio,
      searchQuery,
      onChangeSearchQuery,
      buyerContentRefresh,
      showWebRefreshButton,
      refreshAccessibilityLabel,
      measuredHeaderMax,
      scrollY,
      stableStickyHeader,
      mainListHeaderPad,
      stableMainList,
      stableSheets,
    ],
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: UI.bg,
  },
  searchBarHost: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: UI.bg,
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 4,
  },
});
