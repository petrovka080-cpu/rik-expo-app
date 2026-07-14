import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairHistory } from "../../src/features/consumerRepair/ConsumerRepairHistory";
import {
  __resetConsumerRepairRequestStoreForTests,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "../consumerRepair/consumerRepairTestHelpers";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return {
    Ionicons: ({ name }: { name: string }) => mockReact.createElement("MockIonicon", { name }),
  };
});

describe("approved history PDF/edit/market actions", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("keeps PDF, edit, and market actions attached to the selected approved history record", () => {
    const approved = createApprovedConsumerRepairRequest();
    const approvedHistoryPage = listConsumerRepairApprovedHistory(CONSUMER_REPAIR_TEST_USER_ID);
    const onOpenPdf = jest.fn();
    const onOpenDraft = jest.fn();
    const onToggleHistorySnapshot = jest.fn();
    const onEditHistoryDraft = jest.fn();
    const onSendHistoryToMarket = jest.fn();
    const onLoadMoreHistory = jest.fn();

    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairHistory
          approvedHistoryPage={approvedHistoryPage}
          selectedHistoryId={approved.draft.id}
          onOpenPdf={onOpenPdf}
          onOpenDraft={onOpenDraft}
          onToggleHistorySnapshot={onToggleHistorySnapshot}
          onEditHistoryDraft={onEditHistoryDraft}
          onSendHistoryToMarket={onSendHistoryToMarket}
          onLoadMoreHistory={onLoadMoreHistory}
        />,
      );
    });

    act(() => {
      renderer.root.findByProps({ testID: "consumer-repair-history-button" }).props.onPress();
    });
    act(() => {
      renderer.root.findByProps({ testID: "consumer-repair-history-open-pdf-expanded" }).props.onPress();
      renderer.root.findByProps({ testID: "consumer-repair-history-edit-revision" }).props.onPress();
      renderer.root.findByProps({ testID: "consumer-repair-history-send-market" }).props.onPress();
    });

    expect(renderer.root.findAllByProps({ testID: "consumer-repair-history-readonly-snapshot" }).length).toBeGreaterThan(0);
    expect(renderer.root.findAllByProps({ testID: "consumer-repair-history-pdf" }).length).toBeGreaterThan(0);
    expect(onOpenPdf).toHaveBeenCalledWith(approved.draft.id);
    expect(onEditHistoryDraft).toHaveBeenCalledWith(approved.draft.id);
    expect(onSendHistoryToMarket).toHaveBeenCalledWith(approved.draft.id);
    expect(onOpenDraft).not.toHaveBeenCalled();

    act(() => {
      renderer.unmount();
    });
  });
});
