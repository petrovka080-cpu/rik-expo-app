import React from "react";
import { Animated, Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import {
  isBuyerTechnicalPublicationMessage,
  normalizeBuyerPublicationMessage,
  selectBuyerMainListData,
  selectBuyerShouldShowEmptyState,
} from "./buyer.list.ui";
import { buyerStyles } from "./buyer.styles";
import { BuyerMainList } from "./components/BuyerMainList";

describe("buyer.list.ui", () => {
  it("publishes honest empty state only for ready non-loading lists", () => {
    expect(selectBuyerShouldShowEmptyState(false, "ready")).toBe(true);
    expect(selectBuyerShouldShowEmptyState(true, "ready")).toBe(false);
  });

  it("blocks false-empty publish for error and degraded loader states", () => {
    expect(selectBuyerShouldShowEmptyState(false, "error")).toBe(false);
    expect(selectBuyerShouldShowEmptyState(false, "degraded")).toBe(false);
    expect(selectBuyerShouldShowEmptyState(false, "idle")).toBe(false);
  });

  it("keeps skeleton ownership for initial loading without mutating ready data", () => {
    const initial = selectBuyerMainListData([], true, false);
    const ready = selectBuyerMainListData([{ id: "proposal-1" }], false, false);

    expect(initial).toHaveLength(4);
    expect(initial.every((row) => row.__skeleton === true)).toBe(true);
    expect(ready).toEqual([{ id: "proposal-1" }]);
  });

  it("redacts technical buyer RPC validation messages before UI publication", () => {
    const technicalMessage =
      "Invalid RPC response shape for buyer_summary_buckets_scope_v1 at src/screens/buyer/buyer.fetchers.loadBuyerBucketsDataRpcInternal";
    const normalized = normalizeBuyerPublicationMessage("buckets", "error", technicalMessage);

    expect(isBuyerTechnicalPublicationMessage(technicalMessage)).toBe(true);
    expect(normalized).not.toContain("Invalid RPC response shape");
    expect(normalized).not.toContain("buyer_summary_buckets_scope_v1");
    expect(normalized).not.toContain("src/screens/");
    expect(normalized.length).toBeGreaterThan(0);
  });

  it("preserves non-technical retry messages", () => {
    const message = "Можно повторить загрузку.";
    expect(normalizeBuyerPublicationMessage("buckets", "error", message)).toBe(message);
  });

  it("keeps BuyerMainList from rendering technical RPC details", () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        React.createElement(BuyerMainList, {
          s: buyerStyles,
          tab: "pending",
          data: [],
          publicationState: "error",
          publicationMessage:
            "Invalid RPC response shape for buyer_summary_buckets_scope_v1 at src/screens/buyer/buyer.fetchers.loadBuyerBucketsDataRpcInternal",
          measuredHeaderMax: 0,
          refreshing: false,
          onRefresh: () => undefined,
          loadingInbox: false,
          loadingBuckets: false,
          scrollY: new Animated.Value(0),
          renderGroupBlock: () => null,
          renderProposalCard: () => null,
        }),
      );
    });

    const visibleText = renderer.root
      .findAllByType(Text)
      .map((node) => String(node.props.children ?? ""))
      .join(" ");

    expect(visibleText).not.toContain("Invalid RPC response shape");
    expect(visibleText).not.toContain("buyer_summary_buckets_scope_v1");
    expect(visibleText).not.toContain("src/screens/");
    expect(visibleText.length).toBeGreaterThan(0);
  });
});
