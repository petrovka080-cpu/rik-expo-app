import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairDraftPanel } from "../../src/features/consumerRepair/ConsumerRepairDraftPanel";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import type { UserParamPatchOperation } from "../../src/lib/estimate/validateUserParamPatch";
import {
  __resetConsumerRepairRequestStoreForTests,
  applyConsumerRepairDraftRevisionParamBatchPatch,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairDraftRevisionParamBatchPatch,
} from "../../src/lib/consumerRequests";
import type { ConsumerRepairParamEditState } from "../../src/features/consumerRepair/requestEstimateScreenActions";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return {
    Ionicons: ({ name }: { name: string }) => mockReact.createElement("MockIonicon", { name }),
  };
});

type JsonTree = ReturnType<TestRenderer.ReactTestRenderer["toJSON"]>;

const MINIMAL_RESOURCE_UI_VALUES: Readonly<Record<string, string>> = Object.freeze({
  asphalt_waste_percent: "3",
  base_emulsion_rate_l_m2: "0.3",
  surface_cleaner_productivity_m2_per_machine_hour: "500",
  bitumen_distributor_productivity_m2_per_machine_hour: "800",
  paver_productivity_m2_per_machine_hour: "300",
  roller_productivity_m2_per_machine_hour: "250",
  pneumatic_roller_productivity_m2_per_machine_hour: "250",
  road_worker_productivity_m2_per_man_hour: "25",
  asphalt_plant_distance_km: "10",
  truck_payload_t: "20",
  truck_average_speed_km_per_machine_hour: "40",
  truck_turnaround_machine_hours: "0.5",
  laboratory_control: "contractor",
  incoming_control_interval_m2_per_test: "1000",
  compaction_control_interval_m2_per_test: "1000",
  core_sampling_interval_m2_per_test: "1000",
  laboratory_test_interval_m2_per_test: "1000",
  temperature_control_trips_per_test: "5",
  smoothness_control_interval_m2_per_test: "1000",
  thickness_control_interval_m2_per_test: "1000",
  laboratory_protocol_count: "1",
  executive_survey_service_count: "1",
  execution_documentation_count: "1",
});

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

function renderInitialParkingPanel() {
  __resetConsumerRepairRequestStoreForTests();
  const createdAt = "2026-08-11T04:30:00.000Z";
  const aiDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
    rawInput: "асфальтирование парковки 5000 м²",
    selectedWorkKey: "built-in-ai-1000:0702",
    selectedTemplateId: "built-in-ai-1000:0702",
    selectedTemplateName: "Асфальтирование парковки",
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    paramOverrides: {
      area_m2: { value: 5000, source: "user_input", lastChangedAt: createdAt },
    },
    createdAt,
  });
  if (!aiDraft) throw new Error("parking_draft_missing");
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: "parking-one-of-apply",
    problemText: "асфальтирование парковки 5000 м²",
    repairType: aiDraft.repairType,
    aiDraft,
  });
  let appliedBundle: ConsumerRepairDraftBundle | null = null;
  const onApplyParamBatch = jest.fn((patches: ConsumerRepairDraftRevisionParamBatchPatch[]) => {
    appliedBundle = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      patches,
    });
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
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
        editingParam={null}
        onOpenParamEditor={jest.fn()}
        onSaveParamEdit={jest.fn()}
        onCancelParamEdit={jest.fn()}
        onApplyParamPatch={jest.fn()}
        onApplyParamBatch={onApplyParamBatch}
      />,
    );
  });
  return { renderer, onApplyParamBatch, getAppliedBundle: () => appliedBundle };
}

function renderInitialBridgePanel() {
  __resetConsumerRepairRequestStoreForTests();
  const createdAt = "2026-08-11T04:31:00.000Z";
  const aiDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
    rawInput: "Асфальтобетонное покрытие мостового сооружения 500 м²",
    selectedWorkKey: "bridge_asphalt_preliminary_boq_expanded_complex_v1",
    selectedTemplateId: "bridge_asphalt_preliminary_boq_expanded_complex_v1",
    selectedTemplateName: "Асфальтобетонное покрытие мостового сооружения",
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    paramOverrides: {},
    createdAt,
  });
  if (!aiDraft) throw new Error("bridge_draft_missing");
  const created = createConsumerRepairRequestDraft({
    consumerUserId: "consumer-demo-user",
    problemText: "Асфальтобетонное покрытие мостового сооружения 500 м²",
    repairType: aiDraft.repairType,
    aiDraft,
  });
  const bundle = applyConsumerRepairDraftRevisionParamBatchPatch({
    requestDraftId: created.draft.id,
    userId: created.draft.consumerUserId,
    patches: [{ operation: "add_param", paramKey: "area_m2", rawValue: "500" }],
  });
  let appliedBundle: ConsumerRepairDraftBundle | null = null;
  const onApplyParamBatch = jest.fn((patches: ConsumerRepairDraftRevisionParamBatchPatch[]) => {
    appliedBundle = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      patches,
    });
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
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
        editingParam={null}
        onOpenParamEditor={jest.fn()}
        onSaveParamEdit={jest.fn()}
        onCancelParamEdit={jest.fn()}
        onApplyParamPatch={jest.fn()}
        onApplyParamBatch={onApplyParamBatch}
      />,
    );
  });
  return { renderer, onApplyParamBatch, getAppliedBundle: () => appliedBundle };
}

describe("progressive parameter panel", () => {
  it("applies all eight bridge parameters through the shared batch path and creates the estimate", () => {
    const { renderer, onApplyParamBatch, getAppliedBundle } = renderInitialBridgePanel();
    if (countJsonTestId(renderer.toJSON(), "request-estimate-parameter-panel") === 0) {
      act(() => {
        renderer.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress();
      });
    }
    const select = (parameter: string, value: string) => act(() => {
      renderer.root.findByProps({
        testID: `editable-param-option-${parameter}-${value}`,
      }).props.onPress();
    });
    const enter = (parameter: string, value: string) => act(() => {
      renderer.root
        .findByProps({ testID: `editable-param-inline-editor-${parameter}` })
        .findByProps({ testID: "editable-param-popover-input" })
        .props.onChangeText(value);
    });

    select("bridge_deck_system_confirmed", "true");
    select("waterproofing_type", "ROLLED");
    select("waterproofing_condition", "ACCEPTED");
    enter("protective_layer_thickness_mm", "40");
    enter("wearing_layer_thickness_mm", "50");
    select("wearing_mix_type", "DENSE_FINE_GRAINED");
    enter("asphalt_density_t_m3", "2.35");
    select("traffic_class", "LIGHT");
    select("estimate_scope_mode", "MINIMAL_EXPLICIT_SCOPE");
    for (const [parameter, value] of Object.entries(MINIMAL_RESOURCE_UI_VALUES)) {
      if (parameter === "laboratory_control") select(parameter, value);
      else enter(parameter, value);
    }

    expect(renderer.root.findByProps({ testID: "editable-param-batch-dirty-count" }).props.children)
      .toContain(32);
    act(() => {
      renderer.root.findByProps({ testID: "editable-param-batch-apply" }).props.onPress();
    });

    expect(onApplyParamBatch).toHaveBeenCalledTimes(1);
    expect(onApplyParamBatch.mock.calls[0][0]).toHaveLength(32);
    const applied = getAppliedBundle();
    expect(applied?.canonicalParameterSession?.status).toBe("COMPLETE");
    expect(applied?.estimateDraftRevisionState?.revisions).toHaveLength(1);
    const currentRevision = applied?.estimateDraftRevisionState?.revisions.find((revision) =>
      revision.revisionId === applied.estimateDraftRevisionState?.currentRevisionId
    );
    expect(currentRevision?.status).toBe("draft_ready");
    expect(currentRevision?.boq.rows.length).toBeGreaterThan(4);
  });

  it("submits every visible parking P0 value in one batch without validating the unused geometry branch", () => {
    const { renderer, onApplyParamBatch, getAppliedBundle } = renderInitialParkingPanel();
    if (countJsonTestId(renderer.toJSON(), "request-estimate-parameter-panel") === 0) {
      act(() => {
        renderer.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress();
      });
    }

    const select = (parameter: string, value: string) => act(() => {
      const option = renderer.root.findAllByProps({
        testID: `editable-param-option-${parameter}-${value}`,
      })[0];
      if (option) {
        option.props.onPress();
        return;
      }
      const editor = renderer.root.findAllByProps({
        testID: `editable-param-inline-editor-${parameter}`,
      })[0];
      if (!editor) {
        const available = renderer.root.findAll((node: TestRenderer.ReactTestInstance) =>
          typeof node.props.testID === "string" && node.props.testID.startsWith("editable-param-"),
        ).map((node: TestRenderer.ReactTestInstance) => node.props.testID);
        throw new Error(`parking_parameter_editor_missing:${parameter}:${available.join("|")}`);
      }
      editor
        .findByProps({ testID: "editable-param-popover-input" })
        .props.onChangeText(value);
    });
    const enter = (parameter: string, value: string) => act(() => {
      renderer.root
        .findByProps({ testID: `editable-param-inline-editor-${parameter}` })
        .findByProps({ testID: "editable-param-popover-input" })
        .props.onChangeText(value);
    });
    select("parking_purpose", "PASSENGER_CARS");
    select("traffic_class", "LIGHT");
    select("base_condition", "ACCEPTED");
    select("prepared_base_confirmed", "true");
    enter("wearing_layer_thickness_mm", "50");
    select("wearing_mix_type", "DENSE_FINE_GRAINED");
    enter("asphalt_density_t_m3", "2.35");
    select("estimate_scope_mode", "MINIMAL_EXPLICIT_SCOPE");
    select("project_scope", "SURFACING_ONLY");
    for (const [parameter, value] of Object.entries(MINIMAL_RESOURCE_UI_VALUES)) {
      select(parameter, value);
    }

    expect(renderer.root.findByProps({ testID: "editable-param-batch-dirty-count" })).toBeTruthy();
    act(() => {
      renderer.root.findByProps({ testID: "editable-param-batch-apply" }).props.onPress();
    });

    expect(onApplyParamBatch).toHaveBeenCalledTimes(1);
    expect(onApplyParamBatch.mock.calls[0][0]).toHaveLength(32);
    expect(onApplyParamBatch.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ paramKey: "parking_purpose", rawValue: "PASSENGER_CARS" }),
      expect.objectContaining({ paramKey: "asphalt_density_t_m3", rawValue: "2.35" }),
    ]));
    const applied = getAppliedBundle();
    expect(applied?.estimateDraftRevisionState?.revisions).toHaveLength(1);
    expect(applied?.estimateDraftRevisionState?.revisions[0]?.boq.rows.length).toBeGreaterThan(0);
    expect(applied?.draft.selectedCatalogWorkId).toBe("built-in-ai-1000:0702");
    expect(applied?.draft.selectedWorkKey).toBe("asphalt_parking_lot");
  });

  it("shows the canonical numeric tolerance beside every numeric field and rejects an out-of-range value inline", () => {
    const { renderer, onApplyParamBatch } = renderInitialParkingPanel();
    if (countJsonTestId(renderer.toJSON(), "request-estimate-parameter-panel") === 0) {
      act(() => {
        renderer.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress();
      });
    }

    const densityHint = String(
      renderer.root.findByProps({ testID: "editable-param-validation-hint-asphalt_density_t_m3" }).props.children,
    );
    const thicknessHint = String(
      renderer.root.findByProps({ testID: "editable-param-validation-hint-wearing_layer_thickness_mm" }).props.children,
    );
    expect(densityHint).toContain("от 1,8");
    expect(densityHint).toContain("до 2,8");
    expect(densityHint).toContain("т/м³");
    expect(thicknessHint).toContain("от 20");
    expect(thicknessHint).toContain("до 150");
    expect(thicknessHint).toContain("мм");

    act(() => {
      renderer.root
        .findByProps({ testID: "editable-param-inline-editor-asphalt_density_t_m3" })
        .findByProps({ testID: "editable-param-popover-input" })
        .props.onChangeText("1");
    });
    act(() => {
      renderer.root.findByProps({ testID: "editable-param-batch-apply" }).props.onPress();
    });

    expect(onApplyParamBatch).not.toHaveBeenCalled();
    expect(String(renderer.root.findByProps({
      testID: "editable-param-validation-error-asphalt_density_t_m3",
    }).props.children)).toContain("от 1,8");
    expect(renderer.root.findByProps({ testID: "editable-param-batch-validation-error" })).toBeTruthy();
  });

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
