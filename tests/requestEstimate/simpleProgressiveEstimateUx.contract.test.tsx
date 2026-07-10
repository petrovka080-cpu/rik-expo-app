import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairDraftPanel } from "../../src/features/consumerRepair/ConsumerRepairDraftPanel";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return {
    Ionicons: ({ name }: { name: string }) => mockReact.createElement("MockIonicon", { name }),
  };
});

type JsonTree = ReturnType<TestRenderer.ReactTestRenderer["toJSON"]>;

function countJsonTestId(tree: JsonTree, testID: string): number {
  if (!tree) return 0;
  if (Array.isArray(tree)) return tree.reduce((count, node) => count + countJsonTestId(node, testID), 0);
  return (tree.props?.testID === testID ? 1 : 0)
    + (tree.children ?? []).reduce((count, child) => count + countJsonTestId(typeof child === "string" ? null : child, testID), 0);
}

function visibleText(tree: JsonTree): string {
  if (!tree) return "";
  if (Array.isArray(tree)) return tree.map(visibleText).join("\n");
  return (tree.children ?? [])
    .map((child) => (typeof child === "string" ? child : visibleText(child)))
    .join("\n");
}

function renderWaterSupplyPanel() {
  __resetConsumerRepairRequestStoreForTests();
  const prompt = "водоснабжение села 5 км труба ПНД 110 водонапорная башня 25 м3";
  const aiDraft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Бишкек" });
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: "simple-progressive-estimate-ux",
    problemText: prompt,
    repairType: aiDraft.repairType,
    city: "Бишкек",
    addressText: "Бишкек, тестовый адрес",
    contactPhone: "+996700000000",
    aiDraft,
  });
  const noop = jest.fn();
  let renderer!: TestRenderer.ReactTestRenderer;

  act(() => {
    renderer = TestRenderer.create(
      <ConsumerRepairDraftPanel
        bundle={bundle}
        aiAnswerRu={null}
        onDecrease={noop}
        onIncrease={noop}
        onQuantityChange={noop}
        onUnitPriceChange={noop}
        onRemove={noop}
        onAddManual={noop}
        onAddPhotoMaterialRecognition={noop}
        onOpenPhotoForEstimateItem={noop}
        onAddCustom={noop}
        onOpenCatalog={noop}
      />,
    );
  });
  return renderer;
}

describe("simple progressive estimate UX", () => {
  it("keeps the calculated request screen compact until the user opens parameters or positions", () => {
    const renderer = renderWaterSupplyPanel();
    const initialTree = renderer.toJSON();
    const initialText = visibleText(initialTree);

    expect(countJsonTestId(initialTree, "request-estimate-summary-card")).toBe(1);
    expect(countJsonTestId(initialTree, "request-estimate-selected-work-title")).toBe(1);
    expect(countJsonTestId(initialTree, "request-estimate-parameters-toggle")).toBe(1);
    expect(countJsonTestId(initialTree, "request-estimate-positions-toggle")).toBe(1);
    expect(countJsonTestId(initialTree, "request-estimate-parameter-panel")).toBe(0);
    expect(countJsonTestId(initialTree, "request-estimate-positions-panel")).toBe(0);
    expect(countJsonTestId(initialTree, "request-estimate-items-editor")).toBe(0);
    expect(countJsonTestId(initialTree, "request-estimate-assumptions")).toBe(0);
    expect(countJsonTestId(initialTree, "request-estimate-runtime-details-panel")).toBe(0);
    expect(initialText).toContain("Уточнить параметры");
    expect(initialText).toContain("Показать позиции");
    expect(initialText).not.toMatch(/Assumption|Professional cost breakdown|Material quantity trace|Waste and Packaging|Material formulas/i);
    expect(initialText).not.toMatch(/PRICE_MISSING|source_parameters|template_id|formula_id|inlineWorkPromptTemplateId|expandedComplex|village_water_supply/i);

    act(() => {
      const positionsButton = renderer.root
        .findAllByProps({ testID: "request-estimate-positions-toggle" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!positionsButton) throw new Error("positions_toggle_missing");
      positionsButton.props.onPress();
    });

    expect(countJsonTestId(renderer.toJSON(), "request-estimate-positions-panel")).toBe(1);
    expect(countJsonTestId(renderer.toJSON(), "request-estimate-items-editor")).toBe(1);
  });
});
