import { buildAsphaltRelatedR8Inventory } from "../../scripts/estimate/buildAsphaltRelatedR8Inventory";
import {
  COMPLETE_INPUTS as ASPHALT_R63_COMPLETE_INPUTS,
  FULL_APPLICABLE_EXPLICIT_INPUTS as ASPHALT_R63_FULL_INPUTS,
} from "../../scripts/estimate/auditAsphaltM44ProfessionalBoqR9";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequest,
} from "../../src/lib/consumerRequests";
import type { EstimateDraftRevisionParam } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import { resolveAsphaltRelatedAssemblyProfileV4 } from "../../src/lib/estimate/v4/asphalt/compileAsphaltRelatedThroughCoreV4";
import { ASPHALT_RELATED_PROFESSIONAL_PASSPORTS_V4 } from "../../src/lib/estimate/v4/asphalt/asphaltRelatedProfessionalPassportsV4";
import { resolveAsphaltRelatedExactRoutingV4 } from "../../src/lib/estimate/v4/asphalt/asphaltRelatedExactRoutingV4";
import { ASPHALT_RELATED_EXTRA_PROFILES_V4 } from "../../src/lib/estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4";
import { professionalEstimatePassportId } from "../../src/lib/estimate/v4/professionalEstimatePassportV4";
import { buildProjectExecutionDraftFromRevision } from "../../src/lib/projectExecution/buildProjectExecutionDraftFromRevision";

const CREATED_AT = "2026-08-10T10:00:00.000Z";

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

function params(values: Record<string, string | number | boolean>): Record<string, EstimateDraftRevisionParam> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, {
    value,
    source: "user_input" as const,
    sourceText: `R8:${key}`,
    lastChangedAt: CREATED_AT,
  }]));
}

const COMPLETE_PARAMETERS = params({
  ...ASPHALT_R63_COMPLETE_INPUTS,
  ...ASPHALT_R63_FULL_INPUTS,
  estimate_scope_mode: "MINIMAL_EXPLICIT_SCOPE",
  project_scope: "SURFACING_ONLY",
  area_m2: 120,
  removal_area_m2: 120,
  removal_depth_mm: 50,
  removal_method: "MECHANICAL_BREAKOUT",
  removal_extent: "FULL",
  existing_asphalt_density_t_m3: 2.35,
  haul_required: false,
  material_destination: "RECYCLING",
  work_scope: "PURE_DEMOLITION",
  wearing_layer_thickness_mm: 50,
  binder_layer_thickness_mm: 60,
  asphalt_density_t_m3: 2.35,
  prepared_base_confirmed: true,
  bridge_deck_system_confirmed: true,
  traffic_class_confirmed: true,
  thickness_mm: 50,
  density_t_m3: 2.35,
  waste_factor: 1.05,
  haul_distance_km: 10,
  productivity_m2_h: 100,
  labor_productivity_m2_per_man_hour: 100,
  truck_average_speed_km_per_machine_hour: 40,
  truck_turnaround_machine_hours: 0.5,
  machine_breakdown_roller_productivity_m2_per_machine_hour: 100,
  machine_roller_productivity_m2_per_machine_hour: 100,
  machine_finish_roller_productivity_m2_per_machine_hour: 100,
  machine_surface_cleaner_productivity_m2_per_machine_hour: 100,
  machine_bitumen_distributor_productivity_m2_per_machine_hour: 100,
  machine_paver_productivity_m2_per_machine_hour: 100,
  machine_boundary_saw_productivity_m2_per_machine_hour: 100,
  machine_breakout_equipment_productivity_m2_per_machine_hour: 100,
  machine_loader_productivity_m2_per_machine_hour: 100,
  machine_repair_paver_productivity_m2_per_machine_hour: 100,
  machine_cleaner_productivity_m2_per_machine_hour: 100,
  machine_air_compressor_productivity_m2_per_machine_hour: 100,
  machine_leveling_paver_productivity_m2_per_machine_hour: 100,
  machine_profiling_productivity_m2_per_machine_hour: 100,
  machine_survey_equipment_productivity_m2_per_machine_hour: 100,
  machine_joint_equipment_productivity_m2_per_machine_hour: 100,
  machine_finishing_cleaner_productivity_m2_per_machine_hour: 100,
  tack_coat_l_m2: 0.3,
  truck_capacity_t: 20,
  waste_truck_capacity_t: 20,
  acceptance_lot_m2: 1000,
  work_journal_count: 1,
  execution_documentation_count: 1,
  material_passport_register_count: 1,
  joint_sealant_l_m2: 0.1,
  exterior_surface_kind: "PARKING",
  drainage_outfall_confirmed: true,
  base_dry_and_accepted: true,
  floor_mechanical_impact_class: "LOW",
  floor_liquid_exposure_class: "NONE",
  approved_floor_mix_type: "CAST_ASPHALT",
});

function selectedRecordId(record: ReturnType<typeof buildAsphaltRelatedR8Inventory>["records"][number]): string {
  return record.previous_35 ? record.work_key : record.catalog_id;
}

describe("Asphalt-related R63 exact binding matrix", () => {
  let cleanupStorage: () => void;

  beforeEach(() => {
    cleanupStorage = installStorage();
    __resetConsumerRepairRequestStoreForTests();
  });

  afterEach(() => {
    __resetConsumerRepairRequestStoreForTests();
    cleanupStorage();
  });

  test("registers nine concrete ProfessionalEstimatePassportV4 owners behind the thin adapter", () => {
    expect(ASPHALT_RELATED_PROFESSIONAL_PASSPORTS_V4).toHaveLength(9);
    expect(new Set(ASPHALT_RELATED_PROFESSIONAL_PASSPORTS_V4.map((passport) => passport.passportId)).size).toBe(9);
    for (const profile of ASPHALT_RELATED_EXTRA_PROFILES_V4) {
      const passport = ASPHALT_RELATED_PROFESSIONAL_PASSPORTS_V4.find(
        (candidate) => candidate.catalogWorkId === profile.canonicalWorkKey,
      );
      expect(passport).toBeDefined();
      expect(profile.passportId).toBe(professionalEstimatePassportId(profile.canonicalWorkKey));
      expect(passport?.passportId).toBe(profile.passportId);
      expect(passport?.boq.semanticOwner).toBe(profile.passportId);
      expect(passport?.calculation.calculationStrategyId).toBe(profile.calculationStrategyId);
      expect(passport?.contracts.revision.immutableSnapshotRequired).toBe(true);
      expect(passport?.contracts.pdfProjection.sourceOfTruth).toBe("IMMUTABLE_REVISION");
      expect(passport?.contracts.procurementProjection.sourceOfTruth).toBe("IMMUTABLE_REVISION");
    }
  });

  test("fails closed when a known exact key has no registered owner", () => {
    const requestedId = "known_asphalt_owner_removed_for_contract_test";
    expect(resolveAsphaltRelatedExactRoutingV4(requestedId, {
      knownExactIds: new Set([requestedId]),
      extraOwnerResolver: () => null,
      roadworksOwnerResolver: () => null,
    })).toEqual({
      status: "UNSUPPORTED_EXACT_WORK_KEY",
      requestedId,
      canonicalWorkKey: null,
    });
  });

  test("keeps a confirmed canonical road scope in the established Asphalt V4 compiler", () => {
    const result = buildEstimateFromInlineWorkPrompt({
      rawInput:
        "\u041f\u043e\u043b\u043d\u043e\u0435 \u0441\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e \u0434\u043e\u0440\u043e\u0433\u0438, \u0434\u043b\u0438\u043d\u0430 5400 \u043c, \u0448\u0438\u0440\u0438\u043d\u0430 15 \u043c",
      selectedWorkKey: "asphalt_concrete_pavement",
      selectedTemplateId: "asphalt_concrete_pavement",
      paramOverrides: {
        selectedRoadScope: {
          value: "FULL_ROAD_INFRASTRUCTURE",
          source: "user_input",
        },
      },
    });

    expect(result.canBuildPreliminaryEstimate).toBe(true);
    expect(result.draft?.items.length).toBeGreaterThan(500);
    expect(result.draft?.items.every((item) => item.sourceParameters?.asphaltV4 === true)).toBe(true);
    expect(result.draft?.items.some((item) => item.sourceParameters?.asphaltRelatedV4 === true)).toBe(false);
  });

  test("keeps an exact related full-infrastructure scope out of the pavement-only profile", () => {
    const profile = ASPHALT_RELATED_EXTRA_PROFILES_V4.find(
      (candidate) => candidate.canonicalWorkKey === "asphalt_concrete_pavement",
    );
    expect(profile).toBeDefined();
    expect(resolveAsphaltRelatedAssemblyProfileV4(
      profile!,
      { project_scope: "FULL_ROAD_INFRASTRUCTURE" },
      "FULL_APPLICABLE_SCOPE",
    )).toBe("new_full_road_infrastructure");
    expect(resolveAsphaltRelatedAssemblyProfileV4(
      profile!,
      { project_scope: "PAVEMENT_STRUCTURE" },
      "FULL_APPLICABLE_SCOPE",
    )).toBe("new_full_road_pavement");
  });

  test("routes all R=63 records through exact owners, revision, durable history, PDF and procurement", () => {
    const inventory = buildAsphaltRelatedR8Inventory();
    const related = inventory.records.filter((record) => record.canonical_technology_id !== null);
    expect(related).toHaveLength(63);
    expect(related.every((record) =>
      resolveAsphaltRelatedExactRoutingV4(selectedRecordId(record)).status.startsWith("BOUND_")
    )).toBe(true);

    const persisted: {
      id: string;
      owner: string;
      selectedId: string;
      technology: string;
      signature: string;
      previous35: boolean;
    }[] = [];
    const readinessBlockers: Array<{
      catalog_id: string;
      status: string | null;
      missing_inputs: string[];
    }> = [];
    const signatureByCanonical = new Map<string, string>();

    for (const [index, record] of related.entries()) {
      const selectedId = selectedRecordId(record);
      const runtime = buildConsumerRepairDraftFromAiEstimateRuntime({
        rawInput: `${record.name_ru} 120 m2`,
        selectedWorkKey: selectedId,
        selectedTemplateId: selectedId,
        selectedTemplateName: record.name_ru,
        city: "Bishkek",
        currency: "KGS",
        countryCode: "KG",
        paramOverrides: COMPLETE_PARAMETERS,
        selectedRoadScope: record.canonical_technology_id === "asphalt_concrete_pavement"
          ? "ROAD_SURFACING_ONLY"
          : null,
        createdAt: CREATED_AT,
      });
      const revision = runtime?.runtimeEstimateDraftRevision;
      if (!revision || revision.status !== "draft_ready" || revision.missingInputs.length > 0) {
        readinessBlockers.push({
          catalog_id: record.catalog_id,
          status: revision?.status ?? null,
          missing_inputs: revision?.missingInputs.map((input) => input.key) ?? [],
        });
        continue;
      }
      expect(revision?.professionalWorkId).toBe(record.canonical_technology_id);
      expect(revision?.legacyRowsCount).toBe(0);
      expect(runtime?.selectedWork?.selectedWorkResolverReGuessed).toBe(false);
      expect(runtime?.selectedWork?.selectedCatalogWorkId ?? runtime?.selectedWork?.selectedWorkKey).toBe(selectedId);
      expect(revision?.boq.rows.length).toBeGreaterThan(0);

      const rows = revision!.boq.rows;
      const firstSource = rows[0].sourceParameters ?? {};
      const expectedOwner = record.passport_id!;
      expect(firstSource.professionalEstimatePassportId).toBe(expectedOwner);
      expect(firstSource.semanticOwner).toBe(expectedOwner);
      expect(firstSource.parameterSchemaId).toBe(record.parameter_schema_id);
      expect(rows.every((row) => row.sourceParameters?.exactSelectionGenericFallbackUsed !== true)).toBe(true);
      expect(rows.every((row) => record.previous_35
        ? row.sourceParameters?.roadworksWaveA === true
        : row.sourceParameters?.asphaltRelatedV4 === true)).toBe(true);

      const signature = rows.map((row) => [
        row.formulaId,
        row.quantity,
        row.unit,
        row.sourceParameters?.boqSemanticOwner ?? row.sourceParameters?.semanticOwner,
      ].join(":" )).join("|");
      if (record.classification === "EXECUTABLE") signatureByCanonical.set(record.canonical_technology_id!, signature);

      const bundle = createConsumerRepairRequestDraft({
        consumerUserId: `r8-binding-${index}`,
        problemText: runtime!.selectedWork?.selectedWorkRawInput ?? record.name_ru,
        repairType: runtime!.repairType,
        city: "Bishkek",
        aiDraft: runtime!,
      });
      expect(bundle.estimateDraftRevisionState?.currentRevisionId).toBe(revision!.revisionId);
      persisted.push({
        id: bundle.draft.id,
        owner: expectedOwner,
        selectedId,
        technology: record.canonical_technology_id!,
        signature,
        previous35: record.previous_35,
      });
    }

    expect(readinessBlockers).toEqual([]);
    expect(persisted).toHaveLength(63);
    __simulateConsumerRepairRequestStoreReloadForTests();

    for (const record of persisted) {
      const restored = getConsumerRepairRequest(record.id);
      const revision = restored.estimateDraftRevisionState?.revisions.find(
        (candidate) => candidate.revisionId === restored.estimateDraftRevisionState?.currentRevisionId,
      );
      expect(revision).toBeDefined();
      expect(revision?.professionalWorkId).toBe(record.technology);
      expect(revision?.boq.rows[0]?.sourceParameters?.professionalEstimatePassportId).toBe(record.owner);
      const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
        draft: restored.draft,
        items: restored.items,
        media: restored.media,
        generatedAt: CREATED_AT,
      });
      expect(pdf).not.toBeNull();
      const project = buildProjectExecutionDraftFromRevision(revision!, {
        source: "request_estimate",
        sourceRequestId: restored.draft.id,
        generatedAt: CREATED_AT,
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });
      expect(project.tasks.length).toBeGreaterThan(0);
      expect(project.tasks[0].sourceParameters?.professionalEstimatePassportId).toBe(record.owner);
      expect(project.procurementItems.every((item) =>
        item.sourceParameters?.professionalEstimatePassportId === record.owner
      )).toBe(true);
    }

    const aliases = related.filter((record) => record.classification === "ALIAS");
    expect(aliases).toHaveLength(19);
    for (const alias of aliases) {
      const stored = persisted.find((candidate) => candidate.selectedId === selectedRecordId(alias));
      expect(stored?.signature).toBe(signatureByCanonical.get(alias.canonical_technology_id!));
    }
  }, 120_000);
});
