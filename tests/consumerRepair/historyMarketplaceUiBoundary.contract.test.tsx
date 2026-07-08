import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairRequestStickyActions } from "../../src/features/consumerRepair/ConsumerRepairRequestChrome";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return {
    Ionicons: ({ name }: { name: string }) => mockReact.createElement("MockIonicon", { name }),
  };
});

describe("consumer repair history marketplace UI boundary", () => {
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
});
