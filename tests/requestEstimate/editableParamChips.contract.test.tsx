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
import { CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

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

function countTestIdsWithPrefix(tree: JsonTree, prefix: string): number {
  if (!tree) return 0;
  if (Array.isArray(tree)) return tree.reduce((count, node) => count + countTestIdsWithPrefix(node, prefix), 0);
  const self = typeof tree.props?.testID === "string" && tree.props.testID.startsWith(prefix) ? 1 : 0;
  return self + (tree.children ?? []).reduce((count, child) => count + countTestIdsWithPrefix(typeof child === "string" ? null : child, prefix), 0);
}

function visibleText(tree: JsonTree): string {
  if (!tree) return "";
  if (Array.isArray(tree)) return tree.map(visibleText).join("\n");
  return (tree.children ?? [])
    .map((child) => (typeof child === "string" ? child : visibleText(child)))
    .join("\n");
}

function renderPanel(rawInput = "вентфасад под ключ 1500 кв метров") {
  __resetConsumerRepairRequestStoreForTests();
  const result = buildEstimateFromInlineWorkPrompt({
    rawInput,
    currency: "KGS",
  });
  if (!result.draft) throw new Error("draft_missing");
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: "editable-param-ui",
    problemText: rawInput,
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
      onApplyParamBatch={onApplyParamBatch}
    />
  );
  act(() => {
    renderer = TestRenderer.create(renderPanelElement());
  });
  return { renderer, onApplyParamPatch, onApplyParamBatch };
}

describe("editable param chips UI", () => {
  it("opens one parameter UI and applies local edits through the batch callback", () => {
    const { renderer, onApplyParamPatch, onApplyParamBatch } = renderPanel();
    const hostTree = renderer.toJSON();

    expect(countJsonTestId(hostTree, "request-estimate-parameter-panel")).toBe(0);
    expect(countJsonTestId(hostTree, "editable-param-chip-facade_area_m2")).toBe(0);
    expect(countJsonTestId(hostTree, "estimate-revision-timeline")).toBe(0);
    expect(visibleText(hostTree)).not.toMatch(/PRICE_MISSING|prices:|estimate_level:|Price source not selected|buyer handoff/);

    act(() => {
      const openButton = renderer.root
        .findAllByProps({ testID: "request-estimate-parameters-toggle" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!openButton) throw new Error("parameters_toggle_missing");
      openButton.props.onPress();
    });

    expect(countJsonTestId(renderer.toJSON(), "request-estimate-parameter-panel")).toBe(1);
    expect(countTestIdsWithPrefix(renderer.toJSON(), "editable-param-chip-")).toBeGreaterThan(0);
    expect(countJsonTestId(renderer.toJSON(), "request-estimate-visible-missing-parameters")).toBeLessThanOrEqual(1);
    expect(countJsonTestId(renderer.toJSON(), "estimate-revision-timeline")).toBe(0);

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

  it("keeps three local parameter edits until one Apply All payload is submitted", () => {
    const { renderer, onApplyParamPatch, onApplyParamBatch } = renderPanel();

    act(() => {
      const openButton = renderer.root
        .findAllByProps({ testID: "request-estimate-parameters-toggle" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!openButton) throw new Error("parameters_toggle_missing");
      openButton.props.onPress();
    });

    const inlineEditors = renderer.root.findAll((node: TestRenderer.ReactTestInstance) =>
      typeof node.props.testID === "string" && node.props.testID.startsWith("editable-param-inline-editor-"),
    );
    const uniqueEditors = [...new Map(inlineEditors.map((node) => [String(node.props.testID), node])).values()];
    const editedKeys = uniqueEditors.slice(0, 3).map((node) =>
      String(node.props.testID).replace("editable-param-inline-editor-", ""),
    );
    expect(editedKeys).toHaveLength(3);

    ["111", "222", "333"].forEach((value, index) => {
      act(() => {
        const editor = renderer.root.findByProps({ testID: `editable-param-inline-editor-${editedKeys[index]}` });
        const input = editor.findByProps({ testID: "editable-param-popover-input" });
        input.props.onChangeText(value);
      });
    });

    const values = editedKeys.map((key) => {
      const editor = renderer.root.findByProps({ testID: `editable-param-inline-editor-${key}` });
      return editor.findByProps({ testID: "editable-param-popover-input" }).props.value;
    });
    expect(values).toEqual(["111", "222", "333"]);
    expect(onApplyParamPatch).not.toHaveBeenCalled();
    expect(onApplyParamBatch).not.toHaveBeenCalled();
    expect(countJsonTestId(renderer.toJSON(), "editable-param-batch-bar")).toBe(1);
    expect(visibleText(renderer.toJSON())).toContain("Изменено параметров");

    act(() => {
      const applyButton = renderer.root
        .findAllByProps({ testID: "editable-param-batch-apply" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!applyButton) throw new Error("batch_apply_missing");
      applyButton.props.onPress();
    });

    expect(onApplyParamBatch).toHaveBeenCalledTimes(1);
    const [payload] = onApplyParamBatch.mock.calls[0];
    expect(payload).toHaveLength(3);
    expect(payload).toEqual(expect.arrayContaining([
      expect.objectContaining({ paramKey: editedKeys[0], rawValue: "111" }),
      expect.objectContaining({ paramKey: editedKeys[1], rawValue: "222" }),
      expect.objectContaining({ paramKey: editedKeys[2], rawValue: "333" }),
    ]));
    expect(onApplyParamPatch).not.toHaveBeenCalled();
  });

  it("cancels local parameter edits without submitting a recalculation", () => {
    const { renderer, onApplyParamPatch, onApplyParamBatch } = renderPanel();

    act(() => {
      const openButton = renderer.root
        .findAllByProps({ testID: "request-estimate-parameters-toggle" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!openButton) throw new Error("parameters_toggle_missing");
      openButton.props.onPress();
    });

    const editor = renderer.root.findAll((node: TestRenderer.ReactTestInstance) =>
      typeof node.props.testID === "string" && node.props.testID.startsWith("editable-param-inline-editor-"),
    )[0];
    const baselineValue = editor.findByProps({ testID: "editable-param-popover-input" }).props.value;

    act(() => {
      editor.findByProps({ testID: "editable-param-popover-input" }).props.onChangeText("999");
    });

    expect(countJsonTestId(renderer.toJSON(), "editable-param-batch-bar")).toBe(1);

    act(() => {
      const cancelButton = renderer.root
        .findAllByProps({ testID: "editable-param-batch-cancel" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!cancelButton) throw new Error("batch_cancel_missing");
      cancelButton.props.onPress();
    });

    const sameEditor = renderer.root.findByProps({ testID: String(editor.props.testID) });
    expect(sameEditor.findByProps({ testID: "editable-param-popover-input" }).props.value).toBe(baselineValue);
    expect(countJsonTestId(renderer.toJSON(), "editable-param-batch-bar")).toBe(0);
    expect(onApplyParamBatch).not.toHaveBeenCalled();
    expect(onApplyParamPatch).not.toHaveBeenCalled();
  });

  it("edits calculated parameters through the same batch revision path", () => {
    const { renderer, onApplyParamPatch, onApplyParamBatch } = renderPanel(CAPITAL_RENOVATION_98_PROMPT);

    act(() => {
      const openButton = renderer.root
        .findAllByProps({ testID: "request-estimate-parameters-toggle" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!openButton) throw new Error("parameters_toggle_missing");
      openButton.props.onPress();
    });

    expect(countJsonTestId(renderer.toJSON(), "request-estimate-derived-parameters")).toBe(0);

    act(() => {
      const derivedToggle = renderer.root
        .findAllByProps({ testID: "request-estimate-derived-parameters-toggle" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!derivedToggle) throw new Error("derived_parameters_toggle_missing");
      derivedToggle.props.onPress();
    });

    const derivedSection = renderer.root.findByProps({ testID: "request-estimate-derived-parameters" });
    const derivedEditors = derivedSection.findAll((node: TestRenderer.ReactTestInstance) =>
      typeof node.props.testID === "string" && node.props.testID.startsWith("editable-param-inline-editor-"),
    );
    expect(derivedEditors.length).toBeGreaterThan(0);
    const derivedParamKey = String(derivedEditors[0].props.testID).replace("editable-param-inline-editor-", "");

    act(() => {
      const input = derivedEditors[0].findByProps({ testID: "editable-param-popover-input" });
      input.props.onChangeText("444");
    });

    expect(countJsonTestId(renderer.toJSON(), "editable-param-batch-bar")).toBe(1);

    act(() => {
      const applyButton = renderer.root
        .findAllByProps({ testID: "editable-param-batch-apply" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!applyButton) throw new Error("batch_apply_missing");
      applyButton.props.onPress();
    });

    expect(onApplyParamBatch).toHaveBeenCalledTimes(1);
    expect(onApplyParamBatch).toHaveBeenCalledWith([
      expect.objectContaining({ operation: "update_param", paramKey: derivedParamKey, rawValue: "444" }),
    ]);
    expect(onApplyParamPatch).not.toHaveBeenCalled();
  });

  it("renders capital renovation calculated cards as inline editors in place", () => {
    const { renderer, onApplyParamBatch } = renderPanel(CAPITAL_RENOVATION_98_PROMPT);

    act(() => {
      const openButton = renderer.root
        .findAllByProps({ testID: "request-estimate-parameters-toggle" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!openButton) throw new Error("parameters_toggle_missing");
      openButton.props.onPress();
    });

    act(() => {
      const derivedToggle = renderer.root
        .findAllByProps({ testID: "request-estimate-derived-parameters-toggle" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!derivedToggle) throw new Error("derived_parameters_toggle_missing");
      derivedToggle.props.onPress();
    });

    const requiredDerivedKeys = [
      "ceiling_height_m",
      "baseboard_lm",
      "doors_count",
      "bathrooms_count",
      "waste_volume_m3",
      "paint_total_area_m2",
      "electrical_points",
    ];
    for (const key of requiredDerivedKeys) {
      const editor = renderer.root.findByProps({ testID: `editable-param-inline-editor-${key}` });
      expect(editor.findByProps({ testID: "editable-param-popover-input" })).toBeTruthy();
    }

    const edits = [
      ["ceiling_height_m", "3.2"],
      ["doors_count", "8"],
      ["electrical_points", "99"],
    ] as const;
    for (const [key, value] of edits) {
      act(() => {
        const editor = renderer.root.findByProps({ testID: `editable-param-inline-editor-${key}` });
        editor.findByProps({ testID: "editable-param-popover-input" }).props.onChangeText(value);
      });
    }

    act(() => {
      const applyButton = renderer.root
        .findAllByProps({ testID: "editable-param-batch-apply" })
        .find((node: TestRenderer.ReactTestInstance) => typeof node.props.onPress === "function");
      if (!applyButton) throw new Error("batch_apply_missing");
      applyButton.props.onPress();
    });

    expect(onApplyParamBatch).toHaveBeenCalledTimes(1);
    expect(onApplyParamBatch).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ operation: "update_param", paramKey: "ceiling_height_m", rawValue: "3.2" }),
      expect.objectContaining({ operation: "update_param", paramKey: "doors_count", rawValue: "8" }),
      expect.objectContaining({ operation: "update_param", paramKey: "electrical_points", rawValue: "99" }),
    ]));
  });
});
