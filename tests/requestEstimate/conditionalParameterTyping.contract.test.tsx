import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { InlineParamEditor, ParameterDisclosurePanel } from "../../src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel";
import { buildConsumerCanonicalPrecompileParameterSession } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { jubilee110BinDefinitionS2758, jubilee110BinPackS2758 as pack, includedBinFixingsS2758, separateBinFixingsS2758 } from "../../src/lib/estimate/v4/jubilee110BinPreparedConcreteS2758";
import { jubilee110BinControlS2758 } from "../../scripts/estimate/r4a13/preflightS2758Jubilee110Bin";
import { buildMasterParameterCalculationConsumers } from "../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import type { CanonicalParameterSession } from "../../src/lib/estimate/canonicalParameters/canonicalParameterCore";
import type { EstimateDraftRevision } from "../../src/lib/estimate/estimateDraftRevisionContract";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

function catalog(): CanonicalEstimateCatalogItem {
  const definition = jubilee110BinDefinitionS2758();
  const consumers = buildMasterParameterCalculationConsumers(definition);
  return {
    catalogId: pack.catalogId, titleRu: pack.titleRu,
    releaseId: "00000000-0000-5000-8000-000000000001", namespace: "global", domain: "landscape",
    workKey: pack.workKey, definitionVersion: 1,
    applicability: { primaryMeasureParameterId: "bin_count" }, professionalMetadata: {},
    parameterSchema: definition.parameters.map(parameter => {
      const truth = parameter.truth_metadata;
      const guide = truth.guide as Record<string, unknown>;
      return {
        parameterId: parameter.parameter_id, ordinal: parameter.ordinal, titleRu: parameter.title_ru,
        valueType: parameter.value_type, unitId: parameter.unit_id, required: parameter.required,
        defaultValue: parameter.default_value, constraints: parameter.constraints_json,
        visibilityRole: truth.visibility_role, valueSourceRole: truth.value_source_role,
        preliminaryCompilationAllowed: truth.preliminary_compilation_allowed,
        semanticParameterKey: truth.semantic_parameter_key, provenance: truth.provenance, requiredWhen: truth.required_when,
        formulaConsumers: consumers.formulaConsumers[parameter.parameter_id],
        resourceBranchConsumers: consumers.resourceConsumers[parameter.parameter_id],
        guide: {
          guideKind: guide.guide_kind, guideShortRu: guide.guide_short_ru, guideValidationPolicy: guide.guide_validation_policy,
          sourceRole: guide.source_role, sourceDocument: guide.source_document, sourceLocator: guide.source_locator,
          sourceSnapshotHash: guide.source_snapshot_hash, guideVersion: guide.guide_version,
          applicability: guide.applicability, verifiedAt: guide.verified_at,
        },
      } as CanonicalEstimateCatalogItem["parameterSchema"][number];
    }),
  };
}

function session(parameters: Record<string, unknown>): CanonicalParameterSession {
  return buildConsumerCanonicalPrecompileParameterSession({
    catalog: catalog(), draftId: "conditional-typing", parameters: parameters as Record<string, string | number>,
    userExplicitParameterIds: Object.keys(parameters), missingParameterIds: [],
  });
}

// R15 has saved values in a branch that is initially inactive.
function savedParameters(): Record<string, unknown> {
  return { ...jubilee110BinControlS2758(3, true), anchor_supply_scope: includedBinFixingsS2758,
    fixing_stock: 16, fixing_quantum: 4,
    fixing_stock_compatibility_reference: "CONTROL_ONLY: saved compatible complete fixing assemblies" };
}

function revision(value: CanonicalParameterSession, id: string, parent: string | null = null): EstimateDraftRevision {
  return {
    estimateDraftId: value.draftId, revisionId: id, previousRevisionId: parent, source: "param_batch",
    rawInput: "Тест условного ввода", selectedTemplateId: pack.catalogId, matchedFamily: pack.workKey,
    estimateLevel: "PRELIMINARY_QUANTITY_BOQ", rawInputFacts: [],
    rawInputFactMetrics: { explicit_input_facts_ignored: 0, explicit_input_unit_mismatches: 0, explicit_input_facts_overwritten_by_default: 0 },
    params: Object.fromEntries([...value.parameters, ...(value.inactiveConditionalParameters ?? [])]
      .filter(parameter => parameter.value != null).map(parameter => [parameter.parameterId, {
        value: parameter.value!, source: "user_input" as const, lastChangedAt: value.updatedAt,
      }])), assumptions: [], missingInputs: [], boq: { sections: [], rows: [] },
    trace: { traceId: "conditional-typing", revisionId: id, selectedTemplateId: pack.catalogId, params: [], rows: [], staleTraceAccepted: false },
    status: "draft_ready", artifacts: { snapshotId: null, pdfArtifactId: null, buyerHandoffId: null, artifactsValidForRevisionId: null },
  };
}

let renderer: TestRenderer.ReactTestRenderer;
let apply: jest.Mock;
function mount(parameters = savedParameters(), saved = false) {
  apply = jest.fn(() => true);
  const value = session(parameters);
  act(() => { renderer = TestRenderer.create(<ParameterDisclosurePanel revision={saved ? revision(value, "R15") : null}
    viewModel={null} canonicalParameterSession={value} latestDiff={null} paramEditorEnabled onApplyParamBatch={apply} />); });
  expand();
  return value;
}
function press(id: string) {
  const node = renderer.root.findAll(node => node.props.testID === id && typeof node.props.onPress === "function")[0];
  expect(node).toBeDefined();
  act(() => node.props.onPress());
}
function expand() {
  for (const id of ["request-estimate-filled-parameters-toggle", "request-estimate-show-more-parameters", "request-estimate-advanced-parameters-toggle"]) {
    const node = renderer.root.findAll(node => node.props.testID === id && typeof node.props.onPress === "function")[0];
    if (node && (id !== "request-estimate-filled-parameters-toggle" || !renderer.root.findByType(ParameterDisclosurePanel).instance.state.filledOpen)) act(() => node.props.onPress());
  }
}
function editor(id: string) { return renderer.root.findAllByType(InlineParamEditor).find(node => node.props.paramKey === id)!; }
function input(id: string) { return editor(id).findAll(node => node.props.testID === "editable-param-popover-input" && typeof node.props.onChangeText === "function")[0]; }
function placement(id: string) {
  let node: TestRenderer.ReactTestInstance | null = editor(id);
  while (node && !String(node.props.testID ?? "").startsWith("request-estimate-")) node = node.parent;
  return node;
}
function dirtyIds() { return renderer.root.findAllByType(InlineParamEditor).filter(node => node.props.dirty).map(node => node.props.paramKey).sort(); }
afterEach(() => { if (renderer) act(() => renderer.unmount()); });

it.each([false, true])("retains the same newly activated scalar input through 16 → 1 → empty → 0 (saved=%s)", saved => {
  mount(savedParameters(), saved);
  press("editable-param-option-anchor_supply_scope-" + separateBinFixingsS2758);
  expand();
  const owner = editor("fixing_stock").instance as InlineParamEditor;
  const host = input("fixing_stock");
  const parent = placement("fixing_stock");
  act(() => host.props.onFocus());
  for (const value of ["1", "", "0"]) {
    act(() => input("fixing_stock").props.onChangeText(value));
    expect(editor("fixing_stock").instance === owner).toBe(true);
    expect(input("fixing_stock") === host).toBe(true);
    expect(placement("fixing_stock") === parent).toBe(true);
    expect(owner.state.focusedControlId).toBe("fixing_stock");
    expect(input("fixing_stock").props.value).toBe(value);
  }
  expect(dirtyIds()).toEqual(["anchor_supply_scope", "fixing_stock"]);
  const quantumOwner = editor("fixing_quantum").instance;
  for (const value of ["", "1"]) {
    act(() => input("fixing_quantum").props.onChangeText(value));
    expect(editor("fixing_quantum").instance === quantumOwner).toBe(true);
  }
  expect(apply).not.toHaveBeenCalled();
  press("editable-param-batch-apply");
  expect(apply).toHaveBeenCalledTimes(1);
  expect(apply.mock.calls[0][0]).toEqual([
    { operation: "update_param", paramKey: "anchor_supply_scope", rawValue: separateBinFixingsS2758 },
    { operation: saved ? "update_param" : "add_param", paramKey: "fixing_stock", rawValue: "0" },
    { operation: saved ? "update_param" : "add_param", paramKey: "fixing_quantum", rawValue: "1" },
  ]);
});

it("does not mark untouched saved fields dirty when their branch first opens", () => {
  mount();
  press("editable-param-option-anchor_supply_scope-" + separateBinFixingsS2758);
  expand();
  expect(dirtyIds()).toEqual(["anchor_supply_scope"]);
  expect(input("fixing_stock").props.value).toBe("16");
  expect(input("fixing_quantum").props.value).toBe("4");
});

it.each([false, true])("keeps a newly required empty specification in its original group while another field is missing=%s", otherMissing => {
  const values = savedParameters();
  delete values.fixing_supply_specification;
  if (otherMissing) delete values.fixing_stock;
  mount(values);
  press("editable-param-option-anchor_supply_scope-" + separateBinFixingsS2758);
  expand();
  const owner = editor("fixing_supply_specification").instance as InlineParamEditor;
  const host = input("fixing_supply_specification");
  const parent = placement("fixing_supply_specification");
  expect(parent?.props.testID).toBe("request-estimate-visible-missing-parameters");
  if (otherMissing) expect(input("fixing_stock").props.value).toBe("");
  act(() => host.props.onFocus());
  for (const value of ["M", "M10", ""]) {
    act(() => input("fixing_supply_specification").props.onChangeText(value));
    expect(editor("fixing_supply_specification").instance === owner).toBe(true);
    expect(input("fixing_supply_specification") === host).toBe(true);
    expect(placement("fixing_supply_specification") === parent).toBe(true);
    expect(owner.state.focusedControlId).toBe("fixing_supply_specification");
  }
  press("editable-param-batch-apply");
  expect(apply).not.toHaveBeenCalled();
});

it("cancels branch edits and restores the saved inactive values without submitting", () => {
  mount();
  press("editable-param-option-anchor_supply_scope-" + separateBinFixingsS2758);
  expand();
  act(() => input("fixing_stock").props.onChangeText(""));
  press("editable-param-batch-cancel");
  expect(apply).not.toHaveBeenCalled();
  expect(editor("fixing_stock")).toBeUndefined();
  expect(dirtyIds()).toEqual([]);
  press("editable-param-option-anchor_supply_scope-" + separateBinFixingsS2758);
  expand();
  expect(input("fixing_stock").props.value).toBe("16");
  expect(input("fixing_quantum").props.value).toBe("4");
  expect(dirtyIds()).toEqual(["anchor_supply_scope"]);
});

it("rebases an accepted child to the saved conditional values and clears submitted dirty keys", () => {
  mount(savedParameters(), true);
  press("editable-param-option-anchor_supply_scope-" + separateBinFixingsS2758);
  expand();
  act(() => input("fixing_stock").props.onChangeText("0"));
  press("editable-param-batch-apply");
  const next = session({ ...savedParameters(), anchor_supply_scope: separateBinFixingsS2758, fixing_stock: 0 });
  act(() => renderer.update(<ParameterDisclosurePanel revision={revision(next, "R16", "R15")} viewModel={null}
    canonicalParameterSession={next} latestDiff={null} paramEditorEnabled onApplyParamBatch={apply} />));
  expect(dirtyIds()).toEqual([]);
  expect(input("fixing_stock").props.value).toBe("0");
  act(() => input("fixing_stock").props.onChangeText("1"));
  press("editable-param-batch-cancel");
  expect(input("fixing_stock").props.value).toBe("0");
  expect(apply).toHaveBeenCalledTimes(1);
});
