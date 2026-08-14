import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateLegacyTestActions";
import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  applyConsumerRepairDraftRevisionParamBatchPatch,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequest,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import type { EstimateDraftRevisionParam } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import { buildProjectExecutionDraftFromRevision } from "../../src/lib/projectExecution/buildProjectExecutionDraftFromRevision";

const CREATED_AT = "2026-08-10T09:00:00.000Z";
const FORBIDDEN_PURE_DEMOLITION_OWNERS = new Set([
  "asphalt_mix",
  "new_asphalt_material",
  "tack_coat",
  "prime_coat",
  "paver",
  "new_layer_laying",
  "new_layer_compaction",
  "interlayer_spray",
  "new_surface_quality_control",
]);

function installStorage(): () => void {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return () => { delete (globalThis as { localStorage?: Storage }).localStorage; };
}

function params(values: Record<string, number | string | boolean>): Record<string, EstimateDraftRevisionParam> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, {
    value,
    source: "user_input" as const,
    sourceText: `D0-D5:${key}`,
    lastChangedAt: CREATED_AT,
  }]));
}

function fullDemolition(overrides: Record<string, number | string | boolean> = {}) {
  return params({
    removal_area_m2: 2000,
    removal_depth_mm: 50,
    removal_method: "MECHANICAL_BREAKOUT",
    removal_extent: "FULL",
    existing_asphalt_density_t_m3: 2.35,
    haul_required: true,
    haul_distance_km: 20,
    truck_payload_t: 20,
    material_destination: "RECYCLING",
    work_scope: "PURE_DEMOLITION",
    ...overrides,
  });
}

function runtimeDraft(
  workKey: "asphalt_demolition" | "asphalt_milling",
  paramOverrides: Record<string, EstimateDraftRevisionParam>,
) {
  const draft = buildConsumerRepairDraftFromAiEstimateRuntime({
    rawInput: workKey === "asphalt_milling"
      ? "Холодное фрезерование асфальта 2000 м²"
      : "Демонтаж асфальта 2000 м²",
    selectedWorkKey: workKey,
    selectedTemplateId: workKey,
    selectedTemplateName: workKey,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    paramOverrides,
    createdAt: CREATED_AT,
  });
  if (!draft?.runtimeEstimateDraftRevision) throw new Error(`D0_D5_RUNTIME_REVISION_MISSING:${workKey}`);
  return draft;
}

describe("asphalt-related demolition D0-D5 exact production contract", () => {
  let cleanupStorage: () => void;

  beforeEach(() => {
    cleanupStorage = installStorage();
    __resetConsumerRepairRequestStoreForTests();
  });

  afterEach(() => {
    __resetConsumerRepairRequestStoreForTests();
    cleanupStorage();
  });

  test("D0 keeps exact demolition identity and creates only a blocking parameter session", () => {
    const result = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "asphalt-related-d0",
      problemText: "Демонтаж асфальта 2000 м²",
      repairType: "demolition",
      city: "Bishkek",
      addressText: "D0",
      preferredTimeText: "today",
      contactPhone: "0700000000",
      selectedWork: {
        selectedWorkKey: "asphalt_demolition",
        selectedTitleRu: "Демонтаж асфальта",
        selectedCategoryKey: "demolition",
        selectedCategoryTitleRu: "Демонтаж",
        rawInput: "Демонтаж асфальта 2000 м²",
        source: "user_selected",
        resolverReGuessed: false,
      },
    });

    expect(result.aiDraft.selectedWork).toMatchObject({
      selectedCatalogWorkId: "asphalt_demolition",
      selectedWorkKey: "asphalt_demolition",
      selectedWorkResolverReGuessed: false,
    });
    expect(result.aiDraft.items).toHaveLength(0);
    expect(result.aiDraft.missingData.length).toBeGreaterThan(0);
    expect(result.bundle.items).toHaveLength(0);
    expect(result.bundle.estimateDraftRevisionState).toBeNull();
    expect(result.bundle.estimateRevisionState ?? null).toBeNull();
    expect(result.bundle.pdfs).toHaveLength(0);
    expect(result.bundle.canonicalParameterSession).toMatchObject({
      canonicalWorkKey: "asphalt_demolition",
      status: "BLOCKING_REQUIRED",
    });
    expect(result.bundle.canonicalParameterSession?.parameters.find(
      (parameter) => parameter.parameterId === "removal_area_m2",
    )?.value).toBe(2000);
    expect(result.bundle.draft.aiSummaryRu).not.toContain("NEEDS_REQUIRED_INPUTS");
    expect(result.bundle.canonicalParameterSession?.parameters.find(
      (parameter) => parameter.parameterId === "removal_method",
    )?.allowedValues).toContainEqual({
      value: "MECHANICAL_BREAKOUT",
      label: "Механизированный демонтаж",
    });
    expect(result.bundle.canonicalParameterSession?.blockingMissingParameterIds.length).toBeGreaterThan(0);
  });

  test("D0 applies one complete parameter batch and atomically creates the first exact demolition revision", () => {
    const result = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "asphalt-related-d0-transition",
      problemText: "Демонтаж асфальта 2000 м²",
      repairType: "demolition",
      city: "Bishkek",
      addressText: "D0 transition",
      preferredTimeText: "today",
      contactPhone: "0700000000",
      selectedWork: {
        selectedWorkKey: "asphalt_demolition",
        selectedTitleRu: "Демонтаж асфальта",
        selectedCategoryKey: "demolition",
        selectedCategoryTitleRu: "Демонтаж",
        rawInput: "Демонтаж асфальта 2000 м²",
        source: "user_selected",
        resolverReGuessed: false,
      },
    });
    const requestDraftId = result.bundle.draft.id;
    const completePatches = [
      { operation: "add_param" as const, paramKey: "removal_depth_mm", rawValue: "50" },
      { operation: "add_param" as const, paramKey: "removal_method", rawValue: "MECHANICAL_BREAKOUT" },
      { operation: "add_param" as const, paramKey: "removal_extent", rawValue: "FULL" },
      { operation: "add_param" as const, paramKey: "existing_asphalt_density_t_m3", rawValue: "2,35" },
      { operation: "add_param" as const, paramKey: "haul_required", rawValue: "false" },
      { operation: "add_param" as const, paramKey: "material_destination", rawValue: "RECYCLING" },
    ];

    expect(() => applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId,
      userId: "asphalt-related-d0-transition",
      patches: completePatches.slice(0, 4),
      createdAt: CREATED_AT,
    })).toThrow(/Заполните все обязательные параметры/);
    expect(getConsumerRepairRequest(requestDraftId).items).toHaveLength(0);
    expect(getConsumerRepairRequest(requestDraftId).estimateDraftRevisionState).toBeNull();

    const calculated = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId,
      userId: "asphalt-related-d0-transition",
      patches: completePatches,
      createdAt: CREATED_AT,
    });
    const revision = calculated.estimateDraftRevisionState?.revisions[0];
    expect(result.bundle.items).toHaveLength(0);
    expect(result.bundle.estimateDraftRevisionState).toBeNull();
    expect(calculated.estimateDraftRevisionState?.revisions).toHaveLength(1);
    expect(calculated.estimateDraftRevisionState?.currentRevisionId).toBe(revision?.revisionId);
    expect(revision).toMatchObject({
      professionalWorkId: "asphalt_demolition",
      status: "draft_ready",
    });
    expect(revision?.params.haul_required.value).toBe(false);
    expect(revision?.boq.rows.length).toBeGreaterThan(0);
    expect(revision?.boq.rows.every((row) => row.sourceParameters?.asphaltRelatedV4 === true)).toBe(true);
    expect(calculated.items.length).toBe(revision?.boq.rows.length);
    expect(calculated.estimateDraftSession).toMatchObject({
      activeRevisionId: revision?.revisionId,
      status: "REVIEW",
    });
    expect(calculated.canonicalParameterSession).toMatchObject({
      canonicalWorkKey: "asphalt_demolition",
      status: "COMPLETE",
    });
    expect(calculated.estimateRevisionState?.current_revision_id).toBeTruthy();

    __simulateConsumerRepairRequestStoreReloadForTests();
    const restored = getConsumerRepairRequest(requestDraftId);
    expect(restored.estimateDraftRevisionState?.currentRevisionId).toBe(revision?.revisionId);
    expect(restored.items).toHaveLength(revision?.boq.rows.length ?? 0);
  });

  test("D0 reveals haul-dependent inputs without a crash and calculates after the second atomic batch", () => {
    const result = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "asphalt-related-d0-haul",
      problemText: "Демонтаж асфальта 2000 м²",
      repairType: "demolition",
      city: "Bishkek",
      addressText: "D0 haul",
      preferredTimeText: "today",
      contactPhone: "0700000000",
      selectedWork: {
        selectedWorkKey: "asphalt_demolition",
        selectedTitleRu: "Демонтаж асфальта",
        selectedCategoryKey: "demolition",
        selectedCategoryTitleRu: "Демонтаж",
        rawInput: "Демонтаж асфальта 2000 м²",
        source: "user_selected",
        resolverReGuessed: false,
      },
    });
    const requestDraftId = result.bundle.draft.id;
    const parametersRequired = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId,
      userId: "asphalt-related-d0-haul",
      createdAt: CREATED_AT,
      patches: [
        { operation: "add_param", paramKey: "removal_depth_mm", rawValue: "50" },
        { operation: "add_param", paramKey: "removal_method", rawValue: "MECHANICAL_BREAKOUT" },
        { operation: "add_param", paramKey: "removal_extent", rawValue: "FULL" },
        { operation: "add_param", paramKey: "existing_asphalt_density_t_m3", rawValue: "2.35" },
        { operation: "add_param", paramKey: "haul_required", rawValue: "true" },
        { operation: "add_param", paramKey: "material_destination", rawValue: "RECYCLING" },
      ],
    });

    expect(parametersRequired.items).toHaveLength(0);
    expect(parametersRequired.estimateDraftRevisionState).toBeNull();
    expect(parametersRequired.estimateDraftSession?.status).toBe("PARAMETERS_REQUIRED");
    expect(parametersRequired.canonicalParameterSession?.blockingMissingParameterIds).toEqual([
      "haul_distance_km",
      "truck_payload_t",
    ]);

    const calculated = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId,
      userId: "asphalt-related-d0-haul",
      createdAt: CREATED_AT,
      patches: [
        { operation: "add_param", paramKey: "haul_distance_km", rawValue: "20" },
        { operation: "add_param", paramKey: "truck_payload_t", rawValue: "20" },
      ],
    });
    const revision = calculated.estimateDraftRevisionState?.revisions[0];
    expect(calculated.estimateDraftRevisionState?.revisions).toHaveLength(1);
    expect(revision?.professionalWorkId).toBe("asphalt_demolition");
    expect(revision?.boq.rows.find((row) => row.formulaId === "truck_trip_ceiling_v1")?.quantity).toBe(12);
    expect(calculated.canonicalParameterSession?.status).toBe("COMPLETE");
  });

  test("an exact calculated demolition estimate approves even when its catalog title is the whole short description", () => {
    const draft = runtimeDraft("asphalt_demolition", fullDemolition({ haul_required: false }));
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "asphalt-related-short-approval",
      problemText: "Демонтаж асфальта",
      repairType: "asphalt_demolition",
      city: "Bishkek",
      aiDraft: draft,
    });

    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: CREATED_AT,
    });
    expect(approved.draft.status).toBe("consumer_approved");
    expect(approved.pdfs[0]?.pdfStatus).toBe("generated");
  });

  test.each([
    {
      id: "D1",
      workKey: "asphalt_demolition" as const,
      operation: "FULL_DEPTH_DEMOLITION",
      overrides: fullDemolition(),
      expectedArea: 2000,
      expectedVolume: 100,
      expectedMass: 235,
      expectedTrips: 12,
    },
    {
      id: "D2",
      workKey: "asphalt_demolition" as const,
      operation: "PARTIAL_DEPTH_REMOVAL",
      overrides: fullDemolition({
        removal_extent: "PARTIAL",
        removal_method: "COMBINED",
        total_area_m2: 2000,
        removal_share: 0.2,
      }),
      expectedArea: 400,
      expectedVolume: 20,
      expectedMass: 47,
      expectedTrips: 3,
    },
    {
      id: "D3",
      workKey: "asphalt_milling" as const,
      operation: "COLD_MILLING",
      overrides: params({
        removal_area_m2: 2000,
        removal_depth_mm: 40,
        existing_asphalt_density_t_m3: 2.35,
        haul_required: true,
        haul_distance_km: 20,
        truck_payload_t: 20,
        material_destination: "RECYCLING",
        number_of_passes: 2,
      }),
      expectedArea: 2000,
      expectedVolume: 80,
      expectedMass: 188,
      expectedTrips: 10,
    },
    {
      id: "D4",
      workKey: "asphalt_demolition" as const,
      operation: "LOCAL_BREAKUP",
      overrides: fullDemolition({
        removal_extent: "PARTIAL",
        removal_method: "MANUAL_BREAKOUT",
        total_area_m2: 2000,
        removal_share: 0.05,
        number_of_cards: 4,
      }),
      expectedArea: 100,
      expectedVolume: 5,
      expectedMass: 11.75,
      expectedTrips: 1,
    },
    {
      id: "D5",
      workKey: "asphalt_demolition" as const,
      operation: "DEMOLITION_AND_REINSTATEMENT",
      overrides: fullDemolition({
        work_scope: "DEMOLITION_AND_REINSTATEMENT",
        reinstatement_depth_mm: 50,
        new_asphalt_density_t_m3: 2.4,
      }),
      expectedArea: 2000,
      expectedVolume: 100,
      expectedMass: 235,
      expectedTrips: 12,
    },
  ])("$id preserves exact operation, formulas, revision, storage, PDF and procurement owners", (scenario) => {
    const draft = runtimeDraft(scenario.workKey, scenario.overrides);
    const revision = draft.runtimeEstimateDraftRevision!;
    const sources = revision.boq.rows.map((row) => row.sourceParameters ?? {});
    const removal = revision.boq.rows.find((row) =>
      ["removed_volume_geometry_v1", "milled_volume_geometry_v1"].includes(row.formulaId ?? "")
    );
    const removedMaterial = revision.boq.rows.find((row) =>
      ["removed_mass_geometry_density_v1", "milled_mass_geometry_density_v1"].includes(row.formulaId ?? "")
    );
    const trips = revision.boq.rows.find((row) => row.formulaId === "truck_trip_ceiling_v1");
    const survey = revision.boq.rows.find((row) =>
      ["confirmed_removal_area_v1", "effective_partial_removal_area_v1"].includes(row.formulaId ?? "")
    );

    expect(draft.selectedWork).toMatchObject({
      selectedCatalogWorkId: scenario.workKey,
      selectedWorkKey: scenario.workKey,
      selectedWorkResolverReGuessed: false,
    });
    expect(revision.professionalWorkId).toBe(scenario.workKey);
    expect(revision.status).toBe("draft_ready");
    expect(revision.legacyRowsCount).toBe(0);
    expect(sources.every((source) => source.asphaltRelatedV4 === true)).toBe(true);
    expect(sources.every((source) => source.operationClass === scenario.operation)).toBe(true);
    expect(sources.every((source) => source.exactSelectionGenericFallbackUsed === false)).toBe(true);
    expect(sources.every((source) => source.professionalEstimatePassportId)).toBe(true);
    expect(sources.every((source) => source.calculationStrategyId && source.parameterSchemaId)).toBe(true);
    expect(survey?.quantity).toBeCloseTo(scenario.expectedArea, 4);
    expect(removal?.quantity).toBeCloseTo(scenario.expectedVolume, 4);
    expect(removedMaterial?.quantity).toBeCloseTo(scenario.expectedMass, 4);
    expect(trips?.quantity).toBe(scenario.expectedTrips);

    if (scenario.id === "D2" || scenario.id === "D4") {
      expect(survey?.quantityFormula).toBe("Q = total_area_m2 * removal_share");
      expect(scenario.operation).not.toBe("FULL_DEPTH_DEMOLITION");
    }
    if (scenario.id === "D3") {
      expect(removal?.formulaId).toBe("milled_volume_geometry_v1");
      expect(removal?.calculationTrace).toContain("passes=2");
      expect(removedMaterial?.formulaId).toBe("milled_mass_geometry_density_v1");
    }
    if (scenario.id === "D5") {
      expect(sources.some((source) => source.phaseOwner === "PHASE_1_DEMOLITION")).toBe(true);
      expect(sources.some((source) => source.phaseOwner === "PHASE_2_INSTALLATION")).toBe(true);
    } else {
      const owners = sources.map((source) => String(source.boqSemanticOwner ?? "").toLocaleLowerCase("en-US"));
      expect(owners.some((owner) => FORBIDDEN_PURE_DEMOLITION_OWNERS.has(owner))).toBe(false);
    }

    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: `asphalt-related-${scenario.id.toLowerCase()}`,
      problemText: draft.selectedWork?.selectedWorkRawInput ?? scenario.id,
      repairType: draft.repairType,
      city: "Bishkek",
      aiDraft: draft,
    });
    expect(bundle.estimateDraftRevisionState?.currentRevisionId).toBe(revision.revisionId);
    __simulateConsumerRepairRequestStoreReloadForTests();
    const restored = getConsumerRepairRequest(bundle.draft.id);
    expect(restored.estimateDraftRevisionState?.currentRevisionId).toBe(revision.revisionId);
    expect(restored.items.every((item) => item.sourceParameters?.asphaltRelatedV4 === true)).toBe(true);

    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: restored.draft,
      items: restored.items,
      media: restored.media,
      generatedAt: CREATED_AT,
    });
    expect(pdf).not.toBeNull();
    expect(JSON.stringify(pdf)).toContain(draft.selectedWork?.selectedWorkTitleRu);

    const project = buildProjectExecutionDraftFromRevision(revision, {
      source: "request_estimate",
      sourceRequestId: restored.draft.id,
      generatedAt: CREATED_AT,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    expect(project.customerVisibleTitle).toBe(draft.selectedWork?.selectedWorkTitleRu);
    expect(project.tasks.every((task) => task.sourceParameters?.asphaltRelatedV4 === true)).toBe(true);
    expect(project.procurementItems.every((item) => item.sourceParameters?.asphaltRelatedV4 === true)).toBe(true);

    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: restored.draft.id,
      userId: restored.draft.consumerUserId,
      generatedAt: CREATED_AT,
    });
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
    expect(approved.pdfs[0]?.pdfStatus).toBe("generated");
    expect(handoff.revisionId).toBeTruthy();
    expect(handoff.items.length).toBeGreaterThan(0);
  });
});
