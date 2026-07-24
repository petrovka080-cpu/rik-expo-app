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

describe("production estimate UI", () => {
  it("does not render technical assumptions, raw traces, or revision diagnostics", () => {
    const renderer = renderPanel();
    const initialTree = renderer.toJSON();

    expect(countJsonTestId(initialTree, "request-estimate-details-panel")).toBe(0);
    expect(countJsonTestId(initialTree, "request-estimate-assumptions")).toBe(0);
    expect(countJsonTestId(initialTree, "request-estimate-runtime-details-panel")).toBe(0);
    expect(countJsonTestId(initialTree, "estimate-revision-timeline")).toBe(0);
    expect(visibleText(initialTree)).not.toMatch(/Assumption|Material quantity trace|Waste and Packaging|Material formulas/i);
    expect(visibleText(initialTree)).not.toMatch(/revisionId|snapshot_hash|source_sha|inlineWorkPromptTemplateId/i);

    expect(countJsonTestId(initialTree, "request-estimate-details-toggle")).toBe(0);
    expect(countJsonTestId(initialTree, "request-estimate-runtime-details-toggle")).toBe(0);
  });
});
