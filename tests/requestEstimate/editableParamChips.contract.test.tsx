import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { ConsumerRepairDraftPanel } from "../../src/features/consumerRepair/ConsumerRepairDraftPanel";
import type { ConsumerRepairParamEditState } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import type { UserParamPatchOperation } from "../../src/lib/estimate/validateUserParamPatch";

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
    consumerUserId: "editable-param-ui",
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
      onRestoreLastRemoved={jest.fn()}
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

describe("editable param chips UI", () => {
  it("shows editable chips, missing quick form, timeline and popover save", () => {
    const { renderer, onApplyParamPatch } = renderPanel();
    const hostTree = renderer.toJSON();

    expect(countJsonTestId(hostTree, "editable-param-revision-panel")).toBe(1);
    expect(countJsonTestId(hostTree, "editable-param-chips")).toBe(1);
    expect(countJsonTestId(hostTree, "editable-param-chip-area_m2")).toBe(1);
    expect(renderer.root.findAllByProps({ testID: "missing-input-quick-form" }).length).toBeGreaterThan(0);
    expect(countJsonTestId(hostTree, "estimate-revision-timeline")).toBe(1);
    expect(countJsonTestId(hostTree, "recalculate-estimate-button")).toBe(1);

    act(() => {
      const editButton = renderer.root
        .findAllByProps({ testID: "editable-param-edit-area_m2" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!editButton) throw new Error("edit_button_missing");
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
    expect(onApplyParamPatch).toHaveBeenCalledWith("update_param", "area_m2", "1500");
  });
});
