import {
  __resetConsumerRepairRequestStoreForTests,
  type ConsumerRepairDraftRevisionParamBatchPatch,
} from "../../src/lib/consumerRequests";
import {
  applyCanonicalConsumerRepairAuditParamBatchPatch as applyConsumerRepairDraftRevisionParamBatchPatch,
  createCanonicalConsumerRepairAuditDraft as createConsumerRepairRequestDraft,
} from "../../scripts/estimate/canonicalConsumerRepairAuditHarness";
import { ConsumerRepairValidationError } from "../../src/lib/consumerRequests/consumerRequestMarketplaceService";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import {
  bindEstimateDraftScope,
  commitEstimateCompileResult,
  createEstimateDraftSession,
  prepareEstimateCompile,
  selectEstimateDraftWork,
} from "../../src/lib/estimate/draftSession/estimateDraftSession";
import { REGISTERED_CANONICAL_PARAMETER_SCHEMAS } from "../../src/lib/estimate/canonicalParameters/registeredCanonicalParameterSchemas";
import type { EstimateDraftRevisionParam } from "../../src/lib/estimate/estimateDraftRevisionContract";

const CREATED_AT = "2026-08-11T11:30:00.000Z";

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

function overrides(values: Record<string, string | number | boolean>): Record<string, EstimateDraftRevisionParam> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, {
    value,
    source: "user_input" as const,
    sourceText: `apply-regression:${key}`,
    lastChangedAt: CREATED_AT,
  }]));
}

function incompleteExactDraft(input: {
  userId: string;
  catalogId: string;
  title: string;
  rawInput: string;
  values: Record<string, string | number | boolean>;
}) {
  const aiDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
    rawInput: input.rawInput,
    selectedWorkKey: input.catalogId,
    selectedTemplateId: input.catalogId,
    selectedTemplateName: input.title,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    paramOverrides: overrides(input.values),
    createdAt: CREATED_AT,
  });
  if (!aiDraft) throw new Error(`EXACT_DRAFT_MISSING:${input.catalogId}`);
  return createConsumerRepairRequestDraft({
    consumerUserId: input.userId,
    problemText: input.rawInput,
    repairType: aiDraft.repairType,
    city: "Bishkek",
    aiDraft,
  });
}

const PARKING_PATCHES: ConsumerRepairDraftRevisionParamBatchPatch[] = [
  { operation: "add_param", paramKey: "estimate_scope_mode", rawValue: "MINIMAL_EXPLICIT_SCOPE" },
  { operation: "add_param", paramKey: "project_scope", rawValue: "SURFACING_ONLY" },
  { operation: "add_param", paramKey: "parking_purpose", rawValue: "PASSENGER_CARS" },
  { operation: "add_param", paramKey: "traffic_class", rawValue: "LIGHT" },
  { operation: "add_param", paramKey: "base_condition", rawValue: "ACCEPTED" },
  { operation: "add_param", paramKey: "prepared_base_confirmed", rawValue: "true" },
  { operation: "add_param", paramKey: "wearing_layer_thickness_mm", rawValue: "50" },
  { operation: "add_param", paramKey: "wearing_mix_type", rawValue: "DENSE_FINE_GRAINED" },
  { operation: "add_param", paramKey: "asphalt_density_t_m3", rawValue: "2.35" },
  { operation: "add_param", paramKey: "asphalt_waste_percent", rawValue: "3" },
  { operation: "add_param", paramKey: "base_emulsion_rate_l_m2", rawValue: "0.3" },
  { operation: "add_param", paramKey: "surface_cleaner_productivity_m2_per_machine_hour", rawValue: "500" },
  { operation: "add_param", paramKey: "bitumen_distributor_productivity_m2_per_machine_hour", rawValue: "800" },
  { operation: "add_param", paramKey: "paver_productivity_m2_per_machine_hour", rawValue: "300" },
  { operation: "add_param", paramKey: "roller_productivity_m2_per_machine_hour", rawValue: "250" },
  { operation: "add_param", paramKey: "pneumatic_roller_productivity_m2_per_machine_hour", rawValue: "250" },
  { operation: "add_param", paramKey: "road_worker_productivity_m2_per_man_hour", rawValue: "25" },
  { operation: "add_param", paramKey: "asphalt_plant_distance_km", rawValue: "10" },
  { operation: "add_param", paramKey: "truck_payload_t", rawValue: "20" },
  { operation: "add_param", paramKey: "truck_average_speed_km_per_machine_hour", rawValue: "40" },
  { operation: "add_param", paramKey: "truck_turnaround_machine_hours", rawValue: "0.5" },
  { operation: "add_param", paramKey: "laboratory_control", rawValue: "contractor" },
  { operation: "add_param", paramKey: "incoming_control_interval_m2_per_test", rawValue: "1000" },
  { operation: "add_param", paramKey: "compaction_control_interval_m2_per_test", rawValue: "1000" },
  { operation: "add_param", paramKey: "core_sampling_interval_m2_per_test", rawValue: "1000" },
  { operation: "add_param", paramKey: "laboratory_test_interval_m2_per_test", rawValue: "1000" },
  { operation: "add_param", paramKey: "temperature_control_trips_per_test", rawValue: "5" },
  { operation: "add_param", paramKey: "smoothness_control_interval_m2_per_test", rawValue: "1000" },
  { operation: "add_param", paramKey: "thickness_control_interval_m2_per_test", rawValue: "1000" },
  { operation: "add_param", paramKey: "laboratory_protocol_count", rawValue: "1" },
  { operation: "add_param", paramKey: "executive_survey_service_count", rawValue: "1" },
  { operation: "add_param", paramKey: "execution_documentation_count", rawValue: "1" },
];

function currentRevision(bundle: ReturnType<typeof createConsumerRepairRequestDraft>) {
  const state = bundle.estimateDraftRevisionState;
  return state?.revisions.find((revision) => revision.revisionId === state.currentRevisionId) ?? null;
}

describe("PRODUCT RED APPLY_WITHOUT_COMPILED_REVISION", () => {
  let cleanupStorage: () => void;

  beforeEach(() => {
    cleanupStorage = installStorage();
    __resetConsumerRepairRequestStoreForTests();
  });

  afterEach(() => {
    __resetConsumerRepairRequestStoreForTests();
    cleanupStorage();
  });

  test("area_m2 closes the geometry oneOf and one Apply creates one exact non-empty revision", () => {
    const created = incompleteExactDraft({
      userId: "apply-area-owner",
      catalogId: "built-in-ai-1000:0702",
      title: "Асфальтирование парковки",
      rawInput: "Асфальтирование парковки 5000 м2",
      values: { area_m2: 5000 },
    });
    expect(created.estimateDraftRevisionState).toBeNull();

    const applied = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: created.draft.id,
      userId: created.draft.consumerUserId,
      patches: PARKING_PATCHES,
    });
    const revision = currentRevision(applied);
    expect(applied.estimateDraftRevisionState?.revisions).toHaveLength(1);
    expect(revision?.boq.rows.length).toBeGreaterThanOrEqual(25);
    const semanticOwners = revision?.boq.rows.map((row) => String(row.sourceParameters?.boqSemanticOwner ?? "")) ?? [];
    expect(semanticOwners.every((owner) => owner.length > 0)).toBe(true);
    expect(semanticOwners.some((owner) => owner.startsWith("asphalt_"))).toBe(true);
    const equipmentRows = revision?.boq.rows.filter((row) => row.category === "machinery") ?? [];
    const laborRows = revision?.boq.rows.filter((row) => row.category === "labor") ?? [];
    expect(equipmentRows.length).toBeGreaterThanOrEqual(5);
    expect(equipmentRows.every((row) => row.unit === "machine_hour")).toBe(true);
    expect(equipmentRows.some((row) => row.unit === "m2")).toBe(false);
    expect(laborRows.length).toBeGreaterThan(0);
    expect(laborRows.every((row) => row.unit === "man_hour")).toBe(true);
    expect(applied.draft.selectedCatalogWorkId).toBe("built-in-ai-1000:0702");
    expect(applied.draft.selectedWorkKey).toBe("asphalt_parking_lot");
    expect(revision?.professionalWorkId).toBe("asphalt_parking_lot");
    expect(applied.canonicalParameterSession).toBeNull();
    expect(applied.items.every((item) =>
      item.sourceParameters?.canonicalBackendRevisionId ===
        applied.estimateDraftRevisionState?.currentRevisionId
    )).toBe(true);
  });

  test("length_m plus width_m closes the same geometry oneOf without area_m2 input", () => {
    const created = incompleteExactDraft({
      userId: "apply-length-width-owner",
      catalogId: "built-in-ai-1000:0702",
      title: "Асфальтирование парковки",
      rawInput: "Асфальтирование парковки, длина 100 м, ширина 50 м",
      values: { length_m: 100, width_m: 50 },
    });
    const applied = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: created.draft.id,
      userId: created.draft.consumerUserId,
      patches: PARKING_PATCHES,
    });
    const revision = currentRevision(applied);
    expect(applied.estimateDraftRevisionState?.revisions).toHaveLength(1);
    expect(revision?.quantityBasis?.area_m2).toBe(5000);
    expect(revision?.boq.rows.length).toBeGreaterThan(0);
    expect(applied.canonicalParameterSession).toBeNull();
    expect(applied.items.every((item) =>
      item.sourceParameters?.canonicalBackendRevisionId ===
        applied.estimateDraftRevisionState?.currentRevisionId
    )).toBe(true);
  });

  test("editing an existing revision appends exactly one immutable revision", () => {
    const created = incompleteExactDraft({
      userId: "apply-edit-owner",
      catalogId: "built-in-ai-1000:0702",
      title: "Асфальтирование парковки",
      rawInput: "Асфальтирование парковки 5000 м2",
      values: { area_m2: 5000 },
    });
    const first = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: created.draft.id,
      userId: created.draft.consumerUserId,
      patches: PARKING_PATCHES,
    });
    const firstRevision = currentRevision(first);
    const firstBytes = JSON.stringify(firstRevision);
    const second = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: first.draft.id,
      userId: first.draft.consumerUserId,
      patches: [{ operation: "update_param", paramKey: "area_m2", rawValue: "6000" }],
    });
    expect(second.estimateDraftRevisionState?.revisions).toHaveLength(2);
    expect(JSON.stringify(second.estimateDraftRevisionState?.revisions[0])).toBe(firstBytes);
    expect(currentRevision(second)?.revisionId).not.toBe(firstRevision?.revisionId);
    expect(currentRevision(second)?.boq.rows.length).toBeGreaterThan(0);
  });

  test("demolition P0 parameters compile a non-empty exact revision", () => {
    const created = incompleteExactDraft({
      userId: "apply-demolition-owner",
      catalogId: "asphalt_demolition",
      title: "Демонтаж асфальта",
      rawInput: "Демонтаж асфальта 500 м2",
      values: { removal_area_m2: 500 },
    });
    const applied = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: created.draft.id,
      userId: created.draft.consumerUserId,
      patches: [
        { operation: "add_param", paramKey: "removal_depth_mm", rawValue: "50" },
        { operation: "add_param", paramKey: "removal_method", rawValue: "MECHANICAL_BREAKOUT" },
        { operation: "add_param", paramKey: "removal_extent", rawValue: "FULL" },
        { operation: "add_param", paramKey: "existing_asphalt_density_t_m3", rawValue: "2.35" },
        { operation: "add_param", paramKey: "haul_required", rawValue: "false" },
        { operation: "add_param", paramKey: "material_destination", rawValue: "RECYCLING" },
        { operation: "add_param", paramKey: "loading_required", rawValue: "true" },
        { operation: "add_param", paramKey: "base_cleaning_required", rawValue: "true" },
        { operation: "add_param", paramKey: "work_scope", rawValue: "PURE_DEMOLITION" },
        { operation: "add_param", paramKey: "estimate_scope_mode", rawValue: "MINIMAL_EXPLICIT_SCOPE" },
        { operation: "add_param", paramKey: "asphalt_removal_package_required", rawValue: "true" },
        { operation: "add_param", paramKey: "removal_labor_productivity_m2_per_man_hour", rawValue: "20" },
        { operation: "add_param", paramKey: "removal_control_interval_m2_per_test", rawValue: "500" },
        { operation: "add_param", paramKey: "removal_documentation_count", rawValue: "1" },
        { operation: "add_param", paramKey: "breakout_productivity_m3_per_machine_hour", rawValue: "15" },
        { operation: "add_param", paramKey: "loader_productivity_t_per_machine_hour", rawValue: "30" },
        { operation: "add_param", paramKey: "base_cleaning_productivity_m2_per_man_hour", rawValue: "40" },
        { operation: "add_param", paramKey: "surface_cleaner_productivity_m2_per_machine_hour", rawValue: "500" },
      ],
    });
    expect(applied.estimateDraftRevisionState?.revisions).toHaveLength(1);
    expect(currentRevision(applied)?.professionalWorkId).toBe("asphalt_demolition");
    expect(currentRevision(applied)?.boq.rows.length).toBeGreaterThan(0);
    const resourceRows = currentRevision(applied)?.boq.rows.filter((row) =>
      row.category === "labor" || row.category === "machinery"
    ) ?? [];
    expect(resourceRows.length).toBeGreaterThanOrEqual(4);
    expect(resourceRows.some((row) => row.unit === "man_hour")).toBe(true);
    expect(resourceRows.some((row) => row.unit === "machine_hour")).toBe(true);
  });

  test("driveway eight visible P0 parameters compile on the same shared Apply path", () => {
    const created = incompleteExactDraft({
      userId: "apply-driveway-owner",
      catalogId: "built-in-ai-1000:0703",
      title: "Асфальтирование заезда",
      rawInput: "Асфальтирование заезда 50 м2",
      values: { area_m2: 50 },
    });
    const applied = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: created.draft.id,
      userId: created.draft.consumerUserId,
      patches: [
        { operation: "add_param", paramKey: "vehicle_type", rawValue: "LIGHT_COMMERCIAL" },
        { operation: "add_param", paramKey: "traffic_class", rawValue: "MEDIUM" },
        { operation: "add_param", paramKey: "base_condition", rawValue: "LOCAL_REPAIR_REQUIRED" },
        { operation: "add_param", paramKey: "prepared_base_confirmed", rawValue: "true" },
        { operation: "add_param", paramKey: "connection_width_m", rawValue: "10" },
        { operation: "add_param", paramKey: "wearing_layer_thickness_mm", rawValue: "100" },
        { operation: "add_param", paramKey: "wearing_mix_type", rawValue: "DENSE_FINE_GRAINED" },
        { operation: "add_param", paramKey: "asphalt_density_t_m3", rawValue: "2.35" },
        { operation: "add_param", paramKey: "project_scope", rawValue: "SURFACING_ONLY" },
        { operation: "add_param", paramKey: "base_repair_area_m2", rawValue: "5" },
        { operation: "add_param", paramKey: "base_layer_thickness_mm", rawValue: "100" },
        { operation: "add_param", paramKey: "base_material_type", rawValue: "CRUSHED_STONE" },
        { operation: "add_param", paramKey: "base_material_compaction_factor", rawValue: "1.15" },
        ...PARKING_PATCHES.filter((patch) => [
          "estimate_scope_mode",
          "asphalt_waste_percent",
          "base_emulsion_rate_l_m2",
          "surface_cleaner_productivity_m2_per_machine_hour",
          "bitumen_distributor_productivity_m2_per_machine_hour",
          "paver_productivity_m2_per_machine_hour",
          "roller_productivity_m2_per_machine_hour",
          "pneumatic_roller_productivity_m2_per_machine_hour",
          "road_worker_productivity_m2_per_man_hour",
          "asphalt_plant_distance_km",
          "truck_payload_t",
          "truck_average_speed_km_per_machine_hour",
          "truck_turnaround_machine_hours",
          "laboratory_control",
          "incoming_control_interval_m2_per_test",
          "compaction_control_interval_m2_per_test",
          "core_sampling_interval_m2_per_test",
          "laboratory_test_interval_m2_per_test",
          "temperature_control_trips_per_test",
          "smoothness_control_interval_m2_per_test",
          "thickness_control_interval_m2_per_test",
          "laboratory_protocol_count",
          "executive_survey_service_count",
          "execution_documentation_count",
        ].includes(patch.paramKey)),
      ],
    });
    expect(applied.estimateDraftRevisionState?.revisions).toHaveLength(1);
    expect(applied.draft.selectedCatalogWorkId).toBe("built-in-ai-1000:0703");
    expect(applied.draft.selectedWorkKey).toBe("asphalt_driveway");
    expect(currentRevision(applied)?.professionalWorkId).toBe("asphalt_driveway");
    expect(currentRevision(applied)?.boq.rows.length).toBeGreaterThan(0);
  });

  test("foreign owner and stale compile result are rejected", () => {
    const created = incompleteExactDraft({
      userId: "apply-real-owner",
      catalogId: "built-in-ai-1000:0702",
      title: "Асфальтирование парковки",
      rawInput: "Асфальтирование парковки 5000 м2",
      values: { area_m2: 5000 },
    });
    expect(() => applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: created.draft.id,
      userId: "foreign-owner",
      patches: PARKING_PATCHES,
    })).toThrow(ConsumerRepairValidationError);

    const selected = selectEstimateDraftWork(createEstimateDraftSession({ draftId: "stale-draft" }), {
      catalogWorkId: "built-in-ai-1000:0702",
      canonicalWorkKey: "asphalt_parking_lot",
      source: "EXPLICIT_SELECTION",
      scopeRequired: false,
    });
    const ready = bindEstimateDraftScope(selected, {
      scopePresetId: "parking",
      calculationStrategyId: "parking:v1",
      parameterSchemaVersion: "parking:v1",
      engineVersion: "parking:v1",
      requiredParameterAlternatives: [],
    });
    const compiling = prepareEstimateCompile(ready).session;
    const stale = commitEstimateCompileResult(compiling, {
      draftId: compiling.draftId,
      selectionEpoch: compiling.selectionEpoch + 1,
      contextHash: compiling.contextHash!,
      revisionId: "foreign-revision",
      scopePresetId: compiling.scopePresetId!,
      parameterSchemaVersion: compiling.parameterSchemaVersion!,
      calculationStrategyId: compiling.calculationStrategyId!,
    });
    expect(stale.status).toBe("STALE_RESULT_REJECTED");
    expect(stale.activeRevisionId).toBeNull();
  });

  test("overlay conditional required fields use the same visibility condition", () => {
    const schema = REGISTERED_CANONICAL_PARAMETER_SCHEMAS.getByCanonicalWorkKey("asphalt_overlay");
    const millingDepth = schema?.definitions.find((item) => item.parameterId === "milling_depth_mm");
    const passes = schema?.definitions.find((item) => item.parameterId === "number_of_passes");
    expect(millingDepth?.requiredLevel).toBe("BLOCKING_REQUIRED");
    expect(passes?.requiredLevel).toBe("BLOCKING_REQUIRED");
    expect(millingDepth?.visibilityCondition).toEqual({
      kind: "PARAMETER_EQUALS",
      parameterId: "milling_required",
      value: true,
    });
    expect(passes?.visibilityCondition).toEqual(millingDepth?.visibilityCondition);
  });

  test("local base repair fields are visible under the same condition that makes them required", () => {
    const schema = REGISTERED_CANONICAL_PARAMETER_SCHEMAS.getByCanonicalWorkKey("asphalt_parking_lot");
    for (const key of [
      "base_layer_thickness_mm",
      "base_material_type",
      "base_material_compaction_factor",
    ]) {
      expect(schema?.definitions.find((item) => item.parameterId === key)?.visibilityCondition).toEqual({
        kind: "ANY_OF",
        conditions: [
          { parameterId: "base_construction_required", value: true },
          { parameterId: "base_condition", value: "LOCAL_REPAIR_REQUIRED" },
        ],
      });
    }
  });
});
