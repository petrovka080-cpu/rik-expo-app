import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairDraftPanel } from "../../src/features/consumerRepair/ConsumerRepairDraftPanel";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
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
  if (Array.isArray(tree)) {
    return tree.reduce((count, node) => count + countJsonTestId(node, testID), 0);
  }
  return (tree.props?.testID === testID ? 1 : 0)
    + (tree.children ?? []).reduce(
      (count, child) => count + countJsonTestId(typeof child === "string" ? null : child, testID),
      0,
    );
}

function canonicalRuntimeDraft(catalogId: string, title: string) {
  const draft = buildConsumerRepairDraftFromAiEstimateRuntime({
    rawInput: title,
    selectedWorkKey: catalogId,
    selectedTemplateId: catalogId,
    selectedTemplateName: title,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    paramOverrides: {},
    createdAt: "2026-08-17T00:00:00.000Z",
  });
  if (!draft) throw new Error(`canonical_runtime_draft_missing:${catalogId}`);
  return draft;
}

function expectCanonicalBackendRequired(catalogId: string, title: string): void {
  __resetConsumerRepairRequestStoreForTests();
  const aiDraft = canonicalRuntimeDraft(catalogId, title);
  expect(aiDraft.canonicalBackendRequired || aiDraft.runtimeEstimateDraftRevision).toBeTruthy();
  expect(() => createConsumerRepairRequestDraft({
    consumerUserId: "canonical-backend-boundary",
    problemText: title,
    repairType: aiDraft.repairType,
    aiDraft,
  })).toThrow("Расчёт и изменение профессиональной сметы выполняются только canonical backend");
}

describe("canonical progressive parameter boundary", () => {
  it("does not recreate the parking estimate in the legacy client compiler", () => {
    expectCanonicalBackendRequired("built-in-ai-1000:0702", "Асфальтирование парковки 500 м²");
  });

  it("does not recreate the bridge estimate in the legacy client compiler", () => {
    expectCanonicalBackendRequired(
      "bridge_asphalt_preliminary_boq_expanded_complex_v1",
      "Асфальтобетонное покрытие мостового сооружения 500 м²",
    );
  });

  it("routes the visible refine action to the canonical editor and keeps the legacy panel closed", () => {
    __resetConsumerRepairRequestStoreForTests();
    const prompt = "водоснабжение села 5 км труба ПНД 110";
    const aiDraft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Бишкек" });
    const canonicalDraft = {
      ...aiDraft,
      items: aiDraft.items.map((item, index) => ({
        ...item,
        sourceParameters: {
          ...item.sourceParameters,
          canonicalBackendRevisionId: "11111111-2222-4333-8444-555555555556",
          canonicalBackendReleaseId: "progressive-parameter-backend-fixture-v1",
          rowCode: String(item.sourceParameters?.rowCode ?? `progressive-row-${index + 1}`),
        },
      })),
    };
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "canonical-progressive-ui",
      problemText: prompt,
      repairType: aiDraft.repairType,
      aiDraft: canonicalDraft,
    });
    const onRefineCanonicalParameters = jest.fn();
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
          onRefineCanonicalParameters={onRefineCanonicalParameters}
        />,
      );
    });

    act(() => {
      renderer.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress();
    });

    expect(onRefineCanonicalParameters).toHaveBeenCalledTimes(1);
    expect(countJsonTestId(renderer.toJSON(), "request-estimate-parameter-panel")).toBe(1);
  });
});
