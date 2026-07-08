import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairRequestStickyActions } from "../../src/features/consumerRepair/ConsumerRepairRequestChrome";
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

describe("consumer repair history marketplace UI boundary", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("keeps marketplace send out of the active workspace sticky actions", () => {
    const noop = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairRequestStickyActions
          approved
          sent={false}
          hasBundle
          hasSnapshot
          onOpenPdf={noop}
          onMakePdf={noop}
          onCreateNew={noop}
          onDeleteDraft={noop}
          onApproveDraft={noop}
          onPrepareDraft={noop}
        />,
      );
    });

    expect(renderer.root.findAllByProps({ testID: "consumer-repair-send-market" })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: "consumer-repair-open-pdf" }).length).toBeGreaterThan(0);
    expect(renderer.root.findAllByProps({ testID: "consumer-repair-new" }).length).toBeGreaterThan(0);

    act(() => {
      renderer.unmount();
    });
  });

  it("exposes marketplace send only on an approved history snapshot", () => {
    const approved = createApprovedConsumerRepairRequest();
    const noop = jest.fn();
    const approvedHistoryPage = listConsumerRepairApprovedHistory(CONSUMER_REPAIR_TEST_USER_ID);
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairHistory
          approvedHistoryPage={approvedHistoryPage}
          selectedHistoryId={approved.draft.id}
          onOpenPdf={noop}
          onOpenDraft={noop}
          onToggleHistorySnapshot={noop}
          onEditHistoryDraft={noop}
          onSendHistoryToMarket={noop}
          onLoadMoreHistory={noop}
        />,
      );
    });
    act(() => {
      renderer.root.findByProps({ testID: "consumer-repair-history-button" }).props.onPress();
    });

    expect(renderer.root.findAllByProps({ testID: "consumer-repair-history-send-market" }).length).toBeGreaterThan(0);
    expect(renderer.root.findAllByProps({ testID: "consumer-repair-send-market" })).toHaveLength(0);

    act(() => {
      renderer.unmount();
    });
  });
});
