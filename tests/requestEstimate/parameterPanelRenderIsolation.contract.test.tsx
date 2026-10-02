import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ConsumerRepairProgressiveEstimatePanel, ParameterDisclosurePanel, canonicalNumericInputRule } from "../../src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel";
import { buildConsumerCanonicalParameterSession } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { buildRequestEstimateViewModel, type RequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import * as cards from "../../src/lib/estimatePresentation/buildCanonicalParameterCards";
import type { CanonicalParameterSession } from "../../src/lib/estimate/canonicalParameters";
import type { EstimateDraftRevision } from "../../src/lib/estimate/estimateDraftRevisionContract";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import { ESTIMATE_PLATFORM_API_VERSION } from "../../src/lib/estimate/backendPlatform/contracts";
import { PRESSURE_SEWER_PIPELINE_CATALOG_ID, PRESSURE_SEWER_PIPELINE_FORMULAS, PRESSURE_SEWER_PIPELINE_PARAMETERS, PRESSURE_SEWER_PIPELINE_RESOURCES, PRESSURE_SEWER_PIPELINE_RUNTIME_CLASSIFICATION, PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT } from "../../src/lib/estimate/v4/pressureSewerPipelineR1";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return { Ionicons: ({ name }: { name: string }) => mockReact.createElement("MockIonicon", { name }) };
});

function pressureSession(): CanonicalParameterSession {
  const catalog: CanonicalEstimateCatalogItem = {
    catalogId: PRESSURE_SEWER_PIPELINE_CATALOG_ID, releaseId: "cff26f4d-563f-5b93-8aae-378a20922a8a",
    namespace: "global", domain: "water_sewer", workKey: "pressure_sewer_pipeline",
    titleRu: "Строительство напорного канализационного трубопровода", definitionVersion: 2,
    applicability: {}, professionalMetadata: {},
    parameterSchema: PRESSURE_SEWER_PIPELINE_PARAMETERS.map(parameter => {
      const truth = parameter.truth_metadata as Record<string, unknown>;
      const constraints = parameter.constraints_json ?? {};
      const formulaConsumers = PRESSURE_SEWER_PIPELINE_FORMULAS.filter(formula => formula.input_parameter_ids.includes(parameter.parameter_id)).map(formula => formula.formula_id);
      return {
        parameterId: parameter.parameter_id, ordinal: parameter.ordinal,
        valueType: parameter.value_type as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
        unitId: parameter.unit_id, titleRu: parameter.title_ru, required: parameter.required,
        preliminaryCompilationAllowed: truth.preliminary_compilation_allowed === true,
        defaultValue: parameter.default_value, constraints,
        visibilityRole: truth.visibility_role as "USER_INPUT", valueSourceRole: truth.value_source_role as never,
        runtimeProfileClassification: PRESSURE_SEWER_PIPELINE_RUNTIME_CLASSIFICATION[parameter.parameter_id],
        requiredWhen: constraints.requiredWhen as Record<string, unknown> | undefined,
        formulaConsumers,
        resourceBranchConsumers: PRESSURE_SEWER_PIPELINE_RESOURCES.filter(resource => formulaConsumers.includes(resource.formula_id)
          || JSON.stringify(resource.resource_graph).includes(`"${parameter.parameter_id}"`)
          || JSON.stringify(resource.inclusion_ast).includes(`"${parameter.parameter_id}"`)).map(resource => resource.row_id),
      };
    }),
  };
  const facts = { psp_route_length_m: 100, psp_pipe_designation: "ПНД PE100 SDR17 PN10 DN110", psp_pipe_outside_diameter_mm: 110,
    psp_average_trench_depth_m: 1.8, psp_fitting_quantity_piece: 4, psp_isolation_valve_quantity_piece: 2, psp_air_valve_quantity_piece: 1, psp_washout_quantity_piece: 1 };
  return buildConsumerCanonicalParameterSession({ catalog, draftId: "parameter-render-owned-fixture", revision: {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION, revisionId: "559595a7-61a0-458a-97e3-cc527cd5bfa4",
    parentRevisionId: null, releaseId: catalog.releaseId, catalogId: catalog.catalogId, revisionNumber: 1,
    status: "ready", currencyCode: "KGS", parameters: { ...facts, ...PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT },
    userInputSnapshot: facts, acceptedBaselineSnapshot: { ...PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT },
    assumptionSnapshot: { ...PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT },
    amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null }, totals: { amount: null }, rowCount: 47,
    checksumSha256: "e".repeat(64), compilerVersion: "canonical-backend.s27-27", parameterSchemaHash: "pressure-sewer-s27-27",
    createdAt: "2026-10-02T00:00:00.000+06:00",
  } });
}

function viewModel(): RequestEstimateViewModel {
  return buildRequestEstimateViewModel({
    draft: { id: "parameter-render-owned-fixture", consumerUserId: "test-user", title: "Тест формы", status: "draft", repairType: "construction", missingData: [], createdAt: "2026-10-02T00:00:00Z" },
    items: [], media: [], pdfs: [], projectExecutionDrafts: [], events: [],
    marketplaceLink: { id: "test-link", requestDraftId: "parameter-render-owned-fixture", status: "not_sent", createdAt: "2026-10-02T00:00:00Z" },
  })!;
}

function field(renderer: ReactTestRenderer, key = "psp_route_length_m") {
  return renderer.root.findByProps({ testID: `editable-param-chip-${key}` }).findByProps({ testID: "editable-param-popover-input" });
}

// Presentation-only revision fixture; no compile, checksum admission or save is claimed.
function revision(session: CanonicalParameterSession, previousRevisionId: string | null = null): EstimateDraftRevision {
  const revisionId = session.revisionId!;
  return {
    estimateDraftId: session.draftId, revisionId, previousRevisionId, source: "param_batch",
    rawInput: "Тест формы", selectedTemplateId: PRESSURE_SEWER_PIPELINE_CATALOG_ID, matchedFamily: "pressure_sewer_pipeline",
    estimateLevel: "PRELIMINARY_QUANTITY_BOQ", rawInputFacts: [],
    rawInputFactMetrics: { explicit_input_facts_ignored: 0, explicit_input_unit_mismatches: 0, explicit_input_facts_overwritten_by_default: 0 },
    params: Object.fromEntries(session.parameters.filter(parameter => parameter.value != null).map(parameter => [parameter.parameterId, {
      value: parameter.value!, source: "user_input" as const, lastChangedAt: session.updatedAt,
    }])), assumptions: [], missingInputs: [], boq: { sections: [], rows: [] },
    trace: { traceId: "test-trace", revisionId, selectedTemplateId: PRESSURE_SEWER_PIPELINE_CATALOG_ID, params: [], rows: [], staleTraceAccepted: false },
    status: "draft_ready", artifacts: { snapshotId: null, pdfArtifactId: null, buyerHandoffId: null, artifactsValidForRevisionId: null },
  };
}

describe("canonical parameter presentation isolation, not calculation caching", () => {
  let renderer: ReactTestRenderer | undefined;
  afterEach(() => { act(() => renderer?.unmount()); renderer = undefined; jest.restoreAllMocks(); });

  it("builds at most the baseline and current cards when mounting the actual 54-input profile", () => {
    const build = jest.spyOn(cards, "buildCanonicalParameterCards");
    act(() => { renderer = TestRenderer.create(<ParameterDisclosurePanel viewModel={viewModel()} revision={null} canonicalParameterSession={pressureSession()} latestDiff={null} paramEditorEnabled onApplyParamBatch={jest.fn()} />); });
    const visibleKeys = new Set(renderer!.root.findAll(node => typeof node.props.testID === "string" && node.props.testID.startsWith("editable-param-chip-")).map(node => node.props.testID));
    expect(visibleKeys.size).toBe(54);
    expect(field(renderer!).props.value).toBe("100");
    expect(field(renderer!, "psp_excavator_productivity_m3_h").props.value).toBe("35");
    expect(build.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("does not rebuild the retained form for BOQ-only changes, but keeps dirty fields and current source gates", () => {
    const session = pressureSession();
    const build = jest.spyOn(cards, "buildCanonicalParameterCards");
    const noop = jest.fn();
    const first = viewModel();
    const props = { revisionState: null, currentRevision: null, latestDiff: null, canonicalParameterSession: session,
      onDecrease: noop, onIncrease: noop, onQuantityChange: noop, onUnitPriceChange: noop, onRemove: noop, onAddManual: noop, onAddCustom: noop, onApplyParamBatch: noop };
    const render = (model: RequestEstimateViewModel) => <ConsumerRepairProgressiveEstimatePanel {...props} viewModel={model} />;
    act(() => { renderer = TestRenderer.create(render(first)); });
    act(() => renderer!.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress());
    act(() => field(renderer!).props.onChangeText("150.250001"));
    act(() => renderer!.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress());
    build.mockClear();
    act(() => renderer!.update(render({ ...first, totalLabel: "Сумма уточняется", sourceGates: [...(first.sourceGates ?? [])] })));
    expect(build).not.toHaveBeenCalled();
    expect(field(renderer!).props.value).toBe("150.250001");
    const gate = { parameterId: "supplier_norm", title: "Норма изготовителя", sourceRequirement: "Паспорт изготовителя", affectedPositionCount: 2 };
    act(() => renderer!.update(render({ ...first, sourceGates: [gate] })));
    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain("Паспорт изготовителя");
    expect(field(renderer!).props.value).toBe("150.250001");
    act(() => renderer!.update(render({ ...first, sourceGates: [{ ...gate, title: "Обновлённая норма", sourceRequirement: "Новый паспорт", affectedPositionCount: 3 }] })));
    expect(JSON.stringify(renderer!.toJSON())).toContain("Новый паспорт");
    act(() => renderer!.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress());
    expect(field(renderer!).props.value).toBe("150.250001");
    act(() => renderer!.root.findByProps({ testID: "editable-param-batch-apply" }).props.onPress());
    expect(noop).toHaveBeenCalledWith([expect.objectContaining({ paramKey: "psp_route_length_m", rawValue: "150.250001" })]);
  });

  it("invalidates presentation on a replacement session even if its fingerprint was not changed", () => {
    const session = pressureSession();
    const props = { viewModel: viewModel(), revision: null, latestDiff: null, paramEditorEnabled: true, onApplyParamBatch: jest.fn() };
    act(() => { renderer = TestRenderer.create(<ParameterDisclosurePanel {...props} canonicalParameterSession={session} />); });
    const next = { ...session, parameters: session.parameters.map(parameter => parameter.parameterId === "psp_route_length_m" ? { ...parameter, value: 250.123456789 } : parameter) };
    act(() => renderer!.update(<ParameterDisclosurePanel {...props} canonicalParameterSession={next} />));
    expect(field(renderer!).props.value).toBe("250.123456789");
    expect(session.parameters.find(parameter => parameter.parameterId === "psp_route_length_m")!.value).toBe(100);
  });

  it("rebases on a real replacement revision without promoting the old pending preview to its baseline", () => {
    const session = pressureSession();
    const firstRevision = revision(session);
    const props = { viewModel: viewModel(), latestDiff: null, paramEditorEnabled: true, onApplyParamBatch: jest.fn() };
    act(() => { renderer = TestRenderer.create(<ParameterDisclosurePanel {...props} revision={firstRevision} canonicalParameterSession={session} />); });
    act(() => field(renderer!).props.onChangeText("150"));
    const next = { ...session, revisionId: "f4c81949-d6e1-40b6-a20f-b5f2c1872d3f", parameters: session.parameters.map(parameter => parameter.parameterId === "psp_route_length_m" ? { ...parameter, value: 250 } : parameter) };
    act(() => renderer!.update(<ParameterDisclosurePanel {...props} revision={revision(next, firstRevision.revisionId)} canonicalParameterSession={next} />));
    expect(field(renderer!).props.value).toBe("150");
    act(() => renderer!.root.findByProps({ testID: "editable-param-batch-cancel" }).props.onPress());
    expect(field(renderer!).props.value).toBe("250");
  });

  it("clears accepted submitted values but preserves edits made while their child revision was arriving", () => {
    const session = pressureSession();
    const firstRevision = revision(session);
    const apply = jest.fn();
    const props = { viewModel: viewModel(), latestDiff: null, paramEditorEnabled: true, onApplyParamBatch: apply };
    act(() => { renderer = TestRenderer.create(<ParameterDisclosurePanel {...props} revision={firstRevision} canonicalParameterSession={session} />); });
    act(() => field(renderer!).props.onChangeText("150"));
    act(() => renderer!.root.findByProps({ testID: "editable-param-batch-apply" }).props.onPress());
    act(() => field(renderer!).props.onChangeText("160"));
    const next = { ...session, revisionId: "f4c81949-d6e1-40b6-a20f-b5f2c1872d3f", parameters: session.parameters.map(parameter => parameter.parameterId === "psp_route_length_m" ? { ...parameter, value: 150 } : parameter) };
    act(() => renderer!.update(<ParameterDisclosurePanel {...props} revision={revision(next, firstRevision.revisionId)} canonicalParameterSession={next} />));
    expect(field(renderer!).props.value).toBe("160");
    act(() => renderer!.root.findByProps({ testID: "editable-param-batch-cancel" }).props.onPress());
    expect(field(renderer!).props.value).toBe("150");
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("reuses at most two display formatters without rounding input values or changing numeric gray rules", () => {
    const session = pressureSession();
    const expectedRule = canonicalNumericInputRule({ min: 0.000001, max: 1234567.891234, unit: "м" });
    const formatter = jest.spyOn(Intl, "NumberFormat");
    act(() => { renderer = TestRenderer.create(<ParameterDisclosurePanel viewModel={null} revision={null} canonicalParameterSession={session} latestDiff={null} paramEditorEnabled onApplyParamBatch={jest.fn()} />); });
    act(() => field(renderer!).props.onChangeText("150.123456789"));
    expect(field(renderer!).props.value).toBe("150.123456789");
    expect(canonicalNumericInputRule({ min: 0.000001, max: 1234567.891234, unit: "м" })).toBe(expectedRule);
    expect(formatter.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("still refreshes legacy assumption cards when no canonical session owns the form", () => {
    const noop = jest.fn();
    const first = { ...viewModel(), assumptionRows: [{ id: "area", label: "Площадь", value: "10 м²" }] };
    const props = { revisionState: null, currentRevision: null, latestDiff: null,
      onDecrease: noop, onIncrease: noop, onQuantityChange: noop, onUnitPriceChange: noop, onRemove: noop, onAddManual: noop, onAddCustom: noop };
    act(() => { renderer = TestRenderer.create(<ConsumerRepairProgressiveEstimatePanel {...props} viewModel={first} />); });
    act(() => renderer!.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress());
    expect(JSON.stringify(renderer!.toJSON())).toContain("10 м²");
    act(() => renderer!.update(<ConsumerRepairProgressiveEstimatePanel {...props} viewModel={{ ...first, assumptionRows: [{ id: "area", label: "Площадь", value: "20 м²" }] }} />));
    expect(JSON.stringify(renderer!.toJSON())).toContain("20 м²");
  });

  it("does not hide replacement apply callbacks or validation while retaining the form", () => {
    const session = pressureSession();
    const noop = jest.fn();
    const oldApply = jest.fn();
    const newApply = jest.fn();
    const model = viewModel();
    const props = { revisionState: null, currentRevision: null, latestDiff: null, canonicalParameterSession: session,
      onDecrease: noop, onIncrease: noop, onQuantityChange: noop, onUnitPriceChange: noop, onRemove: noop, onAddManual: noop, onAddCustom: noop };
    act(() => { renderer = TestRenderer.create(<ConsumerRepairProgressiveEstimatePanel {...props} viewModel={model} onApplyParamBatch={oldApply} />); });
    act(() => renderer!.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress());
    act(() => field(renderer!).props.onChangeText("-1"));
    act(() => renderer!.update(<ConsumerRepairProgressiveEstimatePanel {...props} viewModel={{ ...model }} onApplyParamBatch={newApply} />));
    act(() => renderer!.root.findByProps({ testID: "editable-param-batch-apply" }).props.onPress());
    expect(oldApply).not.toHaveBeenCalled();
    expect(newApply).not.toHaveBeenCalled();
    expect(renderer!.root.findByProps({ testID: "editable-param-validation-error-psp_route_length_m" })).toBeTruthy();
    act(() => field(renderer!).props.onChangeText("150.123456789"));
    act(() => renderer!.root.findByProps({ testID: "editable-param-batch-apply" }).props.onPress());
    expect(newApply).toHaveBeenCalledWith([expect.objectContaining({ paramKey: "psp_route_length_m", rawValue: "150.123456789" })]);
    expect(oldApply).not.toHaveBeenCalled();
  });
});
