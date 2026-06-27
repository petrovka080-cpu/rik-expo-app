import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairHistory } from "../../src/features/consumerRepair/ConsumerRepairHistory";
import {
  __resetConsumerRepairRequestStoreForTests,
  listConsumerRepairRequestHistory,
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

  it("does not restore an approved history item into the active draft editor", () => {
    const approved = createApprovedConsumerRepairRequest();
    const history = listConsumerRepairRequestHistory(CONSUMER_REPAIR_TEST_USER_ID);
    const onOpenPdf = jest.fn();
    const onOpenDraft = jest.fn();
    const onToggleHistorySnapshot = jest.fn();
    const onEditHistoryDraft = jest.fn();
    const onSendHistoryToMarket = jest.fn();

    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairHistory
          history={history}
          selectedHistoryId={null}
          onOpenPdf={onOpenPdf}
          onOpenDraft={onOpenDraft}
          onToggleHistorySnapshot={onToggleHistorySnapshot}
          onEditHistoryDraft={onEditHistoryDraft}
          onSendHistoryToMarket={onSendHistoryToMarket}
        />,
      );
    });

    act(() => {
      renderer.root.findByProps({ testID: "consumer-repair-history-main" }).props.onPress();
    });

    expect(onToggleHistorySnapshot).toHaveBeenCalledWith(approved.draft.id);
    expect(onOpenDraft).not.toHaveBeenCalled();

    act(() => {
      renderer.update(
        <ConsumerRepairHistory
          history={history}
          selectedHistoryId={approved.draft.id}
          onOpenPdf={onOpenPdf}
          onOpenDraft={onOpenDraft}
          onToggleHistorySnapshot={onToggleHistorySnapshot}
          onEditHistoryDraft={onEditHistoryDraft}
          onSendHistoryToMarket={onSendHistoryToMarket}
        />,
      );
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
});
