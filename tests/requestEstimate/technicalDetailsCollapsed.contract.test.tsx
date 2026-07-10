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

function renderPanel() {
  __resetConsumerRepairRequestStoreForTests();
  const prompt = "водоснабжение села наружный водопровод";
  const aiDraft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Бишкек" });
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: "technical-details-collapsed",
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
        onAddCustom={noop}
        onOpenCatalog={noop}
      />,
    );
  });
  return renderer;
}

describe("technical details collapsed", () => {
  it("keeps assumptions, line details, and revision history closed by default", () => {
    const renderer = renderPanel();
    const initialTree = renderer.toJSON();

    expect(countJsonTestId(initialTree, "request-estimate-details-panel")).toBe(0);
    expect(countJsonTestId(initialTree, "request-estimate-assumptions")).toBe(0);
    expect(countJsonTestId(initialTree, "request-estimate-runtime-details-panel")).toBe(0);
    expect(countJsonTestId(initialTree, "estimate-revision-timeline")).toBe(0);
    expect(visibleText(initialTree)).not.toMatch(/Assumption|Material quantity trace|Waste and Packaging|Material formulas/i);
    expect(visibleText(initialTree)).not.toMatch(/revisionId|snapshot_hash|source_sha|inlineWorkPromptTemplateId/i);

    act(() => {
      const detailsButton = renderer.root
        .findAllByProps({ testID: "request-estimate-details-toggle" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!detailsButton) throw new Error("details_toggle_missing");
      detailsButton.props.onPress();
    });

    expect(countJsonTestId(renderer.toJSON(), "request-estimate-details-panel")).toBe(1);

    act(() => {
      const runtimeButton = renderer.root
        .findAllByProps({ testID: "request-estimate-runtime-details-toggle" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!runtimeButton) throw new Error("runtime_toggle_missing");
      runtimeButton.props.onPress();
    });

    const openedText = visibleText(renderer.toJSON());
    expect(countJsonTestId(renderer.toJSON(), "request-estimate-runtime-details-panel")).toBe(1);
    expect(countJsonTestId(renderer.toJSON(), "estimate-revision-timeline")).toBe(1);
    expect(openedText).toContain("Текущая версия");
    expect(openedText).not.toMatch(/revisionId|snapshot_hash|source_sha|inlineWorkPromptTemplateId/i);
  });
});
