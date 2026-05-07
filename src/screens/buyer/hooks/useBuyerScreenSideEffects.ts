import { useEffect } from "react";

import {
  buildBuyerScreenLoadingState,
  type BuyerScreenLoadingState,
} from "../buyer.screen.model";
import type { BuyerGroup, BuyerSheetKind, BuyerTab } from "../buyer.types";

type PreloadProposalRequestNumbers = (ids: string[]) => void | Promise<void>;

export function selectBuyerPreloadRequestIds(groups: BuyerGroup[]): string[] {
  return Array.from(
    new Set((groups || []).map((group) => String(group.request_id || "").trim()).filter(Boolean)),
  );
}

export function shouldCloseBuyerAttachBlockForSheet(sheetKind: BuyerSheetKind): boolean {
  return sheetKind === "inbox";
}

export function shouldCloseBuyerAttachBlockForKeyboard(isWeb: boolean, kbOpen: boolean): boolean {
  return isWeb && kbOpen;
}

export function useBuyerPreloadProposalRequestNumbers(params: {
  groups: BuyerGroup[];
  preloadPrNosByRequests: PreloadProposalRequestNumbers;
}) {
  const { groups, preloadPrNosByRequests } = params;

  useEffect(() => {
    const ids = selectBuyerPreloadRequestIds(groups);
    if (ids.length) void preloadPrNosByRequests(ids);
  }, [groups, preloadPrNosByRequests]);
}

export function useBuyerAttachmentBlockAutoClose(params: {
  sheetKind: BuyerSheetKind;
  isWeb: boolean;
  kbOpen: boolean;
  setShowAttachBlock: (value: boolean) => void;
}) {
  const { sheetKind, isWeb, kbOpen, setShowAttachBlock } = params;

  useEffect(() => {
    if (shouldCloseBuyerAttachBlockForSheet(sheetKind)) setShowAttachBlock(false);
  }, [sheetKind, setShowAttachBlock]);

  useEffect(() => {
    if (shouldCloseBuyerAttachBlockForKeyboard(isWeb, kbOpen)) setShowAttachBlock(false);
  }, [isWeb, kbOpen, setShowAttachBlock]);
}

export function useBuyerScreenLoadingPublisher(params: {
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
  setLoading: (state: BuyerScreenLoadingState) => void;
}) {
  const {
    accountingBusy,
    creating,
    loadingBuckets,
    loadingInbox,
    proposalAttachmentsBusy,
    proposalDetailsBusy,
    proposalDocumentBusy,
    refreshing,
    reworkBusy,
    rfqBusy,
    setLoading,
    tab,
  } = params;

  useEffect(() => {
    setLoading(
      buildBuyerScreenLoadingState({
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
      }),
    );
  }, [
    accountingBusy,
    creating,
    loadingBuckets,
    loadingInbox,
    proposalAttachmentsBusy,
    proposalDetailsBusy,
    proposalDocumentBusy,
    refreshing,
    reworkBusy,
    rfqBusy,
    setLoading,
    tab,
  ]);
}
