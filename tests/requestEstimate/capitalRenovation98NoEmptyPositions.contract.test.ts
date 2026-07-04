import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairDraftPanel } from "../../src/features/consumerRepair/ConsumerRepairDraftPanel";
import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return {
    Ionicons: ({ name }: { name: string }) => mockReact.createElement("MockIonicon", { name }),
  };
});

describe("capital renovation 98 no empty positions", () => {
  it("does not render the empty draft state after the valid prompt produces rows", () => {
    const bundle = capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT);
    const noop = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(React.createElement(ConsumerRepairDraftPanel, {
        bundle,
        aiAnswerRu: null,
        onDecrease: noop,
        onIncrease: noop,
        onQuantityChange: noop,
        onUnitPriceChange: noop,
        onRemove: noop,
        onAddManual: noop,
        onAddPhotoMaterialRecognition: noop,
        onOpenPhotoForEstimateItem: noop,
        onAddCustom: noop,
        onOpenCatalog: noop,
      }));
    });

    const tree = JSON.stringify(renderer.toJSON());
    expect(renderer.root.findAllByProps({ testID: "request-estimate-summary-card" }).length).toBeGreaterThan(0);
    expect(renderer.root.findAllByProps({ testID: "request-estimate-items-editor" }).length).toBeGreaterThan(0);
    expect(tree).not.toContain("\u041f\u043e\u0437\u0438\u0446\u0438\u0438 \u043f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442\u044b\u0435");

    act(() => {
      renderer.unmount();
    });
  });
});
