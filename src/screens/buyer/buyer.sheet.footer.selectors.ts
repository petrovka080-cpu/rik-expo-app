export function selectBuyerShowInboxFooter(inboxKeyboardLayoutActive: boolean) {
  return !inboxKeyboardLayoutActive;
}

export function selectBuyerDisableInboxFooterActions(pickedIdsLen: number, creating: boolean) {
  return {
    disableClear: pickedIdsLen === 0 || creating,
    disableRfq: creating || pickedIdsLen === 0,
    disableSend: creating,
  };
}
