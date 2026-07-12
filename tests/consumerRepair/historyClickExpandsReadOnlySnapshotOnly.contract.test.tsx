import React from "react";
import { Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairHistory } from "../../src/features/consumerRepair/ConsumerRepairHistory";
import {
  __resetConsumerRepairRequestStoreForTests,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return {
    Ionicons: ({ name }: { name: string }) => mockReact.createElement("MockIonicon", { name }),
  };
});

describe("history click expands read-only snapshot only", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());
  afterEach(() => jest.useRealTimers());

  it("does not restore an approved history item into the active draft editor", () => {
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
          selectedHistoryId={null}
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
      renderer.root.findByProps({ testID: "consumer-repair-history-main" }).props.onPress();
    });

    expect(onToggleHistorySnapshot).toHaveBeenCalledWith(approved.draft.id);
    expect(onOpenDraft).not.toHaveBeenCalled();

    act(() => {
      renderer.update(
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

    expect(renderer.root.findAllByProps({ testID: "consumer-repair-history-selected-summary" }).length).toBeGreaterThan(0);
    expect(renderer.root.findAllByProps({ testID: "consumer-repair-history-selected-preview-item" }).length).toBeGreaterThan(0);
    expect(renderer.root.findAllByProps({ testID: "request-estimate-items-editor" })).toHaveLength(0);

    act(() => {
      renderer.root.findAllByProps({ testID: "consumer-repair-history-edit-revision-inline" })[0].props.onPress();
    });

    expect(onEditHistoryDraft).toHaveBeenCalledWith(approved.draft.id);

    act(() => {
      renderer.root.findByProps({ testID: "consumer-repair-history-button" }).props.onPress();
    });

    expect(
      renderer.root.findAllByProps({ testID: "consumer-repair-history-readonly-snapshot" }).length,
    ).toBeGreaterThan(0);
    expect(renderer.root.findAllByProps({ testID: "consumer-repair-history-readonly-item" }).length).toBeGreaterThan(0);
    expect(renderer.root.findAllByProps({ testID: "request-estimate-items-editor" })).toHaveLength(0);
    expect(JSON.stringify(renderer.toJSON()).toLocaleLowerCase("ru-RU")).toContain("ламинат");

    act(() => {
      renderer.unmount();
    });
  });

  it("opens all approved estimates from the history button with an approved count", () => {
    createApprovedConsumerRepairRequest();
    createApprovedConsumerRepairRequest();
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
          selectedHistoryId={null}
          onOpenPdf={onOpenPdf}
          onOpenDraft={onOpenDraft}
          onToggleHistorySnapshot={onToggleHistorySnapshot}
          onEditHistoryDraft={onEditHistoryDraft}
          onSendHistoryToMarket={onSendHistoryToMarket}
          onLoadMoreHistory={onLoadMoreHistory}
        />,
      );
    });

    const countBadge = renderer.root.findByProps({ testID: "consumer-repair-history-approved-count" });
    const loadedCount = renderer.root.findByProps({ testID: "consumer-repair-history-loaded-count" });
    const loadedCountText = Array.isArray(loadedCount.findByType(Text).props.children)
      ? loadedCount.findByType(Text).props.children.join("")
      : String(loadedCount.findByType(Text).props.children);
    expect(approvedHistoryPage.items).toHaveLength(2);
    expect(countBadge.findByType(Text).props.children).toBe(2);
    expect(loadedCountText).toContain("показано 2 из 2");

    act(() => {
      renderer.root.findByProps({ testID: "consumer-repair-history-button" }).props.onPress();
    });

    expect(renderer.root.findAllByProps({ testID: "consumer-repair-history-row" }).length).toBeGreaterThanOrEqual(2);
    expect(renderer.root.findAllByProps({ testID: "consumer-repair-history-main" }).length).toBeGreaterThanOrEqual(2);

    act(() => {
      renderer.unmount();
    });
  });

  it("shows loaded versus total approved history and exposes paged loading", () => {
    jest.useFakeTimers();
    for (let index = 0; index < 25; index += 1) {
      jest.setSystemTime(new Date(Date.UTC(2026, 5, 29, 8, 0, index)));
      createApprovedConsumerRepairRequest();
    }
    const approvedHistoryPage = listConsumerRepairApprovedHistory(CONSUMER_REPAIR_TEST_USER_ID, { limit: 20 });
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
          selectedHistoryId={null}
          onOpenPdf={onOpenPdf}
          onOpenDraft={onOpenDraft}
          onToggleHistorySnapshot={onToggleHistorySnapshot}
          onEditHistoryDraft={onEditHistoryDraft}
          onSendHistoryToMarket={onSendHistoryToMarket}
          onLoadMoreHistory={onLoadMoreHistory}
        />,
      );
    });

    const loadedCount = renderer.root.findByProps({ testID: "consumer-repair-history-loaded-count" });
    const loadedCountText = Array.isArray(loadedCount.findByType(Text).props.children)
      ? loadedCount.findByType(Text).props.children.join("")
      : String(loadedCount.findByType(Text).props.children);
    expect(loadedCountText).toContain("показано 20 из 25");

    act(() => {
      renderer.root.findByProps({ testID: "consumer-repair-history-button" }).props.onPress();
    });

    const loadCallsBeforePress = onLoadMoreHistory.mock.calls.length;
    act(() => {
      renderer.root.findByProps({ testID: "consumer-repair-history-load-more" }).props.onPress();
    });

    expect(onLoadMoreHistory).toHaveBeenCalledTimes(loadCallsBeforePress + 1);

    act(() => {
      renderer.unmount();
    });
  });
});
