import { selectBuyerListLoading } from "./buyer.list.ui";
import {
  selectBuyerMainListHeaderPad,
  selectInboxKeyboardLayoutActive,
  type BuyerTabCounts,
} from "./buyer.screen.selectors";
import { selectBuyerDisableInboxFooterActions, selectBuyerShowInboxFooter } from "./buyer.sheet.footer.selectors";
import type { BuyerTab } from "./buyer.types";

type BuyerScreenViewModelInput = {
  measuredHeaderMax: number;
  kbOpen: boolean;
  isMobileEditorVisible: boolean;
  pickedIdsLength: number;
  creating: boolean;
  tab: BuyerTab;
  isWeb: boolean;
  isDev: boolean;
};

type BuyerScreenLoadingStateInput = {
  tab: BuyerTab;
  loadingInbox: boolean;
  loadingBuckets: boolean;
  refreshing: boolean;
  creating: boolean;
  accountingBusy: boolean;
  proposalDetailsBusy: boolean;
  proposalDocumentBusy: boolean;
  proposalAttachmentsBusy: boolean;
  reworkBusy: boolean;
  rfqBusy: boolean;
};

export type BuyerScreenLoadingState = {
  list: boolean;
  action: boolean;
};

export type BuyerScreenViewModel = {
  mainListHeaderPad: number;
  inboxKeyboardLayoutActive: boolean;
  showInboxFooter: boolean;
  disableClear: boolean;
  disableRfq: boolean;
  disableSend: boolean;
  showWebRefreshButton: boolean;
};

export type BuyerScreenHeaderCounts = BuyerTabCounts & {
  subcontractCount: number;
};

export function buildBuyerScreenViewModel({
  measuredHeaderMax,
  kbOpen,
  isMobileEditorVisible,
  pickedIdsLength,
  creating,
  tab,
  isWeb,
  isDev,
}: BuyerScreenViewModelInput): BuyerScreenViewModel {
  const inboxKeyboardLayoutActive = selectInboxKeyboardLayoutActive(kbOpen, isMobileEditorVisible);

  return {
    mainListHeaderPad: selectBuyerMainListHeaderPad(measuredHeaderMax),
    inboxKeyboardLayoutActive,
    showInboxFooter: selectBuyerShowInboxFooter(inboxKeyboardLayoutActive),
    ...selectBuyerDisableInboxFooterActions(pickedIdsLength, creating),
    showWebRefreshButton: isWeb && isDev && tab !== "subcontracts",
  };
}

export function buildBuyerScreenLoadingState({
  tab,
  loadingInbox,
  loadingBuckets,
  refreshing,
  creating,
  accountingBusy,
  proposalDetailsBusy,
  proposalDocumentBusy,
  proposalAttachmentsBusy,
  reworkBusy,
  rfqBusy,
}: BuyerScreenLoadingStateInput): BuyerScreenLoadingState {
  return {
    list: selectBuyerListLoading(tab, loadingInbox, loadingBuckets) || refreshing,
    action:
      creating ||
      accountingBusy ||
      proposalDetailsBusy ||
      proposalDocumentBusy ||
      proposalAttachmentsBusy ||
      reworkBusy ||
      rfqBusy,
  };
}
