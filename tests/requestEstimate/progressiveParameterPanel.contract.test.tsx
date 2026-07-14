import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairDraftPanel } from "../../src/features/consumerRepair/ConsumerRepairDraftPanel";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import type { UserParamPatchOperation } from "../../src/lib/estimate/validateUserParamPatch";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import type { ConsumerRepairParamEditState } from "../../src/features/consumerRepair/requestEstimateScreenActions";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return {
    Ionicons: ({ name }: { name: string }) => mockReact.createElement("MockIonicon", { name }),
  };
});

type JsonTree = ReturnType<TestRenderer.ReactTestRenderer["toJSON"]>;

function countTestIdsWithPrefix(tree: JsonTree, prefix: string): number {
  if (!tree) return 0;
  if (Array.isArray(tree)) return tree.reduce((count, node) => count + countTestIdsWithPrefix(node, prefix), 0);
  const self = typeof tree.props?.testID === "string" && tree.props.testID.startsWith(prefix) ? 1 : 0;
  return self + (tree.children ?? []).reduce((count, child) => count + countTestIdsWithPrefix(typeof child === "string" ? null : child, prefix), 0);
}

function countJsonTestId(tree: JsonTree, testID: string): number {
  if (!tree) return 0;
  if (Array.isArray(tree)) return tree.reduce((count, node) => count + countJsonTestId(node, testID), 0);
  return (tree.props?.testID === testID ? 1 : 0)
    + (tree.children ?? []).reduce((count, child) => count + countJsonTestId(typeof child === "string" ? null : child, testID), 0);
}

function renderPanel() {
  __resetConsumerRepairRequestStoreForTests();
  const result = buildEstimateFromInlineWorkPrompt({
    rawInput: "вентфасад под ключ 1500 кв метров",
    currency: "KGS",
  });
  if (!result.draft) throw new Error("draft_missing");
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: "progressive-parameter-panel",
    problemText: "вентфасад под ключ 1500 кв метров",
    repairType: result.draft.repairType,
    aiDraft: result.draft,
  });
  const onApplyParamPatch = jest.fn();
  const onApplyParamBatch = jest.fn();
  let editingParam: ConsumerRepairParamEditState = null;
  let renderer!: TestRenderer.ReactTestRenderer;
  const renderPanelElement = () => (
    <ConsumerRepairDraftPanel
      bundle={bundle}
      aiAnswerRu={null}
      onDecrease={jest.fn()}
      onIncrease={jest.fn()}
      onQuantityChange={jest.fn()}
      onUnitPriceChange={jest.fn()}
      onRemove={jest.fn()}
      onAddManual={jest.fn()}
      onAddCustom={jest.fn()}
      onOpenCatalog={jest.fn()}
      editingParam={editingParam}
      onOpenParamEditor={(operation: UserParamPatchOperation, paramKey: string) => {
        editingParam = { key: paramKey, operation };
        renderer.update(renderPanelElement());
      }}
      onSaveParamEdit={(rawValue: string) => {
        if (!editingParam) throw new Error("editing_param_missing");
        onApplyParamPatch(editingParam.operation, editingParam.key, rawValue);
        editingParam = null;
        renderer.update(renderPanelElement());
      }}
      onCancelParamEdit={() => {
        editingParam = null;
        renderer.update(renderPanelElement());
      }}
      onApplyParamPatch={onApplyParamPatch}
      onApplyParamBatch={onApplyParamBatch}
    />
  );

  act(() => {
    renderer = TestRenderer.create(renderPanelElement());
  });
  return { renderer, onApplyParamPatch, onApplyParamBatch };
}

describe("progressive parameter panel", () => {
  it("opens on user action, limits visible missing parameters, and uses the existing edit callback", () => {
    const { renderer, onApplyParamPatch, onApplyParamBatch } = renderPanel();

    expect(countJsonTestId(renderer.toJSON(), "request-estimate-parameter-panel")).toBe(0);

    act(() => {
      const openButton = renderer.root
        .findAllByProps({ testID: "request-estimate-parameters-toggle" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!openButton) throw new Error("parameters_toggle_missing");
      openButton.props.onPress();
    });

    const openedTree = renderer.toJSON();
    expect(countJsonTestId(openedTree, "request-estimate-parameter-panel")).toBe(1);
    expect(countTestIdsWithPrefix(openedTree, "request-estimate-missing-param-")).toBeLessThanOrEqual(5);
    expect(countJsonTestId(openedTree, "request-estimate-derived-parameters")).toBe(0);

    const inlineEditors = renderer.root.findAll((node: TestRenderer.ReactTestInstance) =>
      typeof node.props.testID === "string" && node.props.testID.startsWith("editable-param-inline-editor-"),
    );
    expect(inlineEditors.length).toBeGreaterThan(0);
    const editedParamKey = String(inlineEditors[0].props.testID).replace("editable-param-inline-editor-", "");

    expect(countJsonTestId(renderer.toJSON(), "editable-param-popover")).toBeGreaterThan(0);
    expect(countJsonTestId(renderer.toJSON(), `editable-param-inline-editor-${editedParamKey}`)).toBe(1);

    act(() => {
      const input = renderer.root.findAllByProps({ testID: "editable-param-popover-input" })[0];
      input.props.onChangeText("1777");
    });

    expect(countJsonTestId(renderer.toJSON(), "editable-param-batch-bar")).toBe(1);

    act(() => {
      const applyButton = renderer.root
        .findAllByProps({ testID: "editable-param-batch-apply" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!applyButton) throw new Error("batch_apply_missing");
      applyButton.props.onPress();
    });

    expect(onApplyParamBatch).toHaveBeenCalledWith([
      expect.objectContaining({ paramKey: editedParamKey, rawValue: "1777" }),
    ]);
    expect(onApplyParamPatch).not.toHaveBeenCalled();
  });
});
