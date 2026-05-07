import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import {
  selectBuyerPreloadRequestIds,
  shouldCloseBuyerAttachBlockForKeyboard,
  shouldCloseBuyerAttachBlockForSheet,
  useBuyerAttachmentBlockAutoClose,
  useBuyerPreloadProposalRequestNumbers,
  useBuyerScreenLoadingPublisher,
} from "./useBuyerScreenSideEffects";
import type { BuyerGroup, BuyerSheetKind, BuyerTab } from "../buyer.types";
import type { BuyerScreenLoadingState } from "../buyer.screen.model";

const emptyItems: BuyerGroup["items"] = [];

describe("useBuyerScreenSideEffects", () => {
  it("selects unique non-empty request ids for proposal number preloading", () => {
    expect(
      selectBuyerPreloadRequestIds([
        { request_id: " req-1 ", items: emptyItems },
        { request_id: "req-1", items: emptyItems },
        { request_id: "", items: emptyItems },
        { request_id: "req-2", items: emptyItems },
      ]),
    ).toEqual(["req-1", "req-2"]);
  });

  it("preserves attachment auto-close conditions", () => {
    expect(shouldCloseBuyerAttachBlockForSheet("inbox")).toBe(true);
    expect(shouldCloseBuyerAttachBlockForSheet("rfq")).toBe(false);
    expect(shouldCloseBuyerAttachBlockForKeyboard(true, true)).toBe(true);
    expect(shouldCloseBuyerAttachBlockForKeyboard(true, false)).toBe(false);
    expect(shouldCloseBuyerAttachBlockForKeyboard(false, true)).toBe(false);
  });

  it("runs proposal request preload only when ids exist", () => {
    const preload = jest.fn();

    function Harness(props: { groups: BuyerGroup[] }) {
      useBuyerPreloadProposalRequestNumbers({
        groups: props.groups,
        preloadPrNosByRequests: preload,
      });
      return null;
    }

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = TestRenderer.create(React.createElement(Harness, { groups: [] }));
    });
    expect(preload).not.toHaveBeenCalled();

    act(() => {
      renderer?.update(
        React.createElement(Harness, {
          groups: [{ request_id: "req-1", items: emptyItems }],
        }),
      );
    });

    expect(preload).toHaveBeenCalledTimes(1);
    expect(preload).toHaveBeenCalledWith(["req-1"]);

    act(() => {
      renderer?.unmount();
    });
  });

  it("runs attachment auto-close from sheet and keyboard state", () => {
    const setShowAttachBlock = jest.fn();

    function Harness(props: { sheetKind: BuyerSheetKind; isWeb: boolean; kbOpen: boolean }) {
      useBuyerAttachmentBlockAutoClose({
        sheetKind: props.sheetKind,
        isWeb: props.isWeb,
        kbOpen: props.kbOpen,
        setShowAttachBlock,
      });
      return null;
    }

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = TestRenderer.create(
        React.createElement(Harness, { sheetKind: "none", isWeb: true, kbOpen: false }),
      );
    });
    expect(setShowAttachBlock).not.toHaveBeenCalled();

    act(() => {
      renderer?.update(
        React.createElement(Harness, { sheetKind: "inbox", isWeb: true, kbOpen: false }),
      );
    });
    expect(setShowAttachBlock).toHaveBeenCalledTimes(1);
    expect(setShowAttachBlock).toHaveBeenLastCalledWith(false);

    act(() => {
      renderer?.update(
        React.createElement(Harness, { sheetKind: "rfq", isWeb: true, kbOpen: true }),
      );
    });
    expect(setShowAttachBlock).toHaveBeenCalledTimes(2);
    expect(setShowAttachBlock).toHaveBeenLastCalledWith(false);

    act(() => {
      renderer?.unmount();
    });
  });

  it("publishes the same aggregate loading model as BuyerScreen", () => {
    const setLoading = jest.fn<void, [BuyerScreenLoadingState]>();

    function Harness(props: { tab: BuyerTab; refreshing: boolean; reworkBusy: boolean }) {
      useBuyerScreenLoadingPublisher({
        tab: props.tab,
        loadingInbox: false,
        loadingBuckets: true,
        refreshing: props.refreshing,
        creating: false,
        accountingBusy: false,
        proposalDetailsBusy: false,
        proposalDocumentBusy: false,
        proposalAttachmentsBusy: false,
        reworkBusy: props.reworkBusy,
        rfqBusy: false,
        setLoading,
      });
      return null;
    }

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = TestRenderer.create(
        React.createElement(Harness, { tab: "pending", refreshing: false, reworkBusy: true }),
      );
    });

    expect(setLoading).toHaveBeenCalledWith({ list: true, action: true });

    act(() => {
      renderer?.update(
        React.createElement(Harness, { tab: "inbox", refreshing: false, reworkBusy: false }),
      );
    });

    expect(setLoading).toHaveBeenLastCalledWith({ list: false, action: false });

    act(() => {
      renderer?.unmount();
    });
  });
});
