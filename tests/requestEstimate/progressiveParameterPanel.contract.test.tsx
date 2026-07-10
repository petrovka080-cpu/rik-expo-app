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
    />
  );

  act(() => {
    renderer = TestRenderer.create(renderPanelElement());
  });
  return { renderer, onApplyParamPatch };
}

describe("progressive parameter panel", () => {
  it("opens on user action, limits visible missing parameters, and uses the existing edit callback", () => {
    const { renderer, onApplyParamPatch } = renderPanel();

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

    let editedParamKey = "";
    act(() => {
      const editButton = renderer.root
        .findAll((node: TestRenderer.ReactTestInstance) =>
          typeof node.props.testID === "string"
          && node.props.testID.startsWith("editable-param-edit-")
          && typeof node.props.onPress === "function",
        )[0];
      if (!editButton) throw new Error("edit_button_missing");
      editedParamKey = editButton.props.testID.replace("editable-param-edit-", "");
      editButton.props.onPress();
    });

    expect(countJsonTestId(renderer.toJSON(), "editable-param-popover")).toBe(1);

    act(() => {
      const saveButton = renderer.root
        .findAllByProps({ testID: "editable-param-popover-save" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!saveButton) throw new Error("save_button_missing");
      saveButton.props.onPress();
    });

    expect(onApplyParamPatch).toHaveBeenCalledWith(expect.any(String), editedParamKey, expect.any(String));
  });
});
