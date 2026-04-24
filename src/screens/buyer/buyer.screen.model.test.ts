import {
  buildBuyerScreenLoadingState,
  buildBuyerScreenViewModel,
} from "./buyer.screen.model";

describe("buyer.screen.model", () => {
  it("derives stable inbox footer and action flags from keyboard/layout state", () => {
    expect(
      buildBuyerScreenViewModel({
        measuredHeaderMax: 180,
        kbOpen: true,
        isMobileEditorVisible: false,
        pickedIdsLength: 2,
        creating: false,
        tab: "inbox",
        isWeb: true,
        isDev: true,
      }),
    ).toEqual({
      mainListHeaderPad: 238,
      inboxKeyboardLayoutActive: true,
      showInboxFooter: false,
      disableClear: false,
      disableRfq: false,
      disableSend: false,
      showWebRefreshButton: true,
    });
  });

  it("keeps the web refresh affordance off outside the supported tab context", () => {
    expect(
      buildBuyerScreenViewModel({
        measuredHeaderMax: 96,
        kbOpen: false,
        isMobileEditorVisible: false,
        pickedIdsLength: 0,
        creating: false,
        tab: "subcontracts",
        isWeb: true,
        isDev: true,
      }).showWebRefreshButton,
    ).toBe(false);
  });

  it("classifies list and action loading independently", () => {
    expect(
      buildBuyerScreenLoadingState({
        tab: "pending",
        loadingInbox: false,
        loadingBuckets: true,
        refreshing: false,
        creating: false,
        accountingBusy: false,
        proposalDetailsBusy: false,
        proposalDocumentBusy: false,
        proposalAttachmentsBusy: false,
        reworkBusy: true,
        rfqBusy: false,
      }),
    ).toEqual({
      list: true,
      action: true,
    });
  });
});
