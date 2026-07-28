import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairDraftPanel } from "../../src/features/consumerRepair/ConsumerRepairDraftPanel";
import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { __resetConsumerRepairRequestStoreForTests } from "../../src/lib/consumerRequests";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return {
    Ionicons: ({ name }: { name: string }) =>
      mockReact.createElement("MockIonicon", { name }),
  };
});

describe("structured estimate legacy session UI ownership", () => {
  beforeEach(() => {
    __resetConsumerRepairRequestStoreForTests();
  });

  it("keeps a compiled roof BOQ, units, and PDF visible despite its compatibility session", () => {
    const { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "structured-roof-ui-owner",
      problemText: "гидроизоляция крыши 100 кв м",
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });
    expect(bundle.structuredEstimatePayload?.workKey).toMatch(/waterproofing/);
    expect(bundle.estimateDraftSession?.status).toBe("PARAMETERS_REQUIRED");
    expect(bundle.items.length).toBeGreaterThan(0);
    const requestViewSource = require("node:fs").readFileSync(
      "src/features/consumerRepair/ConsumerRepairRequestScreenView.tsx",
      "utf8",
    );
    expect(requestViewSource).toContain(
      "renderModel.bundle.structuredEstimatePayload != null",
    );
    const itemRowSource = require("node:fs").readFileSync(
      "src/features/consumerRepair/ConsumerRepairItemRow.tsx",
      "utf8",
    );
    expect(itemRowSource).toContain(
      '"\\u0415\\u0434\\u0438\\u043d\\u0438\\u0446\\u0430 \\u0438\\u0437\\u043c\\u0435\\u0440\\u0435\\u043d\\u0438\\u044f: \\u043c\\u00b2 (m2, \\u043c2)"',
    );

    const noop = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairDraftPanel
          bundle={bundle}
          aiAnswerRu={null}
          showPdfAction
          onMakePdf={noop}
          onDecrease={noop}
          onIncrease={noop}
          onQuantityChange={noop}
          onUnitPriceChange={noop}
          onRemove={noop}
          onAddManual={noop}
          onAddCustom={noop}
        />,
      );
    });

    expect(
      renderer.root.findAllByProps({ testID: "estimate-draft-session-blocked" }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: "request-estimate-summary-card" }),
    ).not.toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: "request-estimate-items-editor" }),
    ).not.toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: "consumer-estimate-make-pdf" }),
    ).not.toHaveLength(0);
    const visibleText = JSON.stringify(renderer.toJSON());
    expect(visibleText).toContain("request-estimate-unit-semantics");
    expect(visibleText).toMatch(/м² \(м2\)/u);
    expect(visibleText).toMatch(/кров|гидроизоля/u);

    act(() => renderer.unmount());
  });
});
