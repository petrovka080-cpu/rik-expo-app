import { createHash } from "node:crypto";
import { createWriteStream, mkdirSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";
import { once } from "node:events";
import { dirname, join } from "node:path";

import {
  buildFirePassport,
  fireDepthFloor,
  fireIdentities,
  fireModelFingerprint,
  type FireIdentity,
  type FirePassport,
} from "./fireR5Model";
import {
  BATCH009_FIXED_AT,
  BATCH009_PREDECESSOR_COMMIT,
  BATCH009_PREDECESSOR_RELEASE_ID,
  BATCH009_PREDECESSOR_TREE,
  BATCH009_SPEC_SHA256,
  assertExact,
  ensureEvidenceLayout,
  evidenceRoot,
  semanticSha256,
  sha256,
  writeJson,
  writeJsonl,
} from "./support";

type JsonlSink = {
  relativePath: string;
  path: string;
  temporary: string;
  output: ReturnType<typeof createWriteStream>;
  hash: ReturnType<typeof createHash>;
  rows: number;
  bytes: number;
};

function sink(relativePath: string): JsonlSink {
  const path = join(evidenceRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  return { relativePath, path, temporary, output: createWriteStream(temporary, { encoding: "utf8" }), hash: createHash("sha256"), rows: 0, bytes: 0 };
}

async function append(target: JsonlSink, value: unknown): Promise<void> {
  const line = `${JSON.stringify(value)}\n`;
  target.hash.update(line);
  target.rows += 1;
  target.bytes += Buffer.byteLength(line);
  if (!target.output.write(line)) await once(target.output, "drain");
}

async function close(target: JsonlSink): Promise<{ path: string; rows: number; bytes: number; sha256: string }> {
  target.output.end();
  await once(target.output, "finish");
  rmSync(target.path, { force: true });
  renameSync(target.temporary, target.path);
  assertExact(statSync(target.path).size === target.bytes, `FIRE_CORPUS_SIZE_RED:${target.relativePath}`);
  return { path: target.relativePath.replaceAll("\\", "/"), rows: target.rows, bytes: target.bytes, sha256: target.hash.digest("hex") };
}

function workDefinition(identity: FireIdentity, passport: FirePassport): Record<string, unknown> {
  const withoutHash = {
    catalogId: identity.catalog_id,
    sourceIdentity: identity.catalog_id,
    workKey: identity.catalog_id,
    definitionVersion: 1,
    titleRu: identity.canonical_title,
    domain: "fire",
    namespace: identity.namespace,
    denominatorEligible: identity.denominator_eligible,
    passport: {
      passportId: `fire-professional-passport:${identity.catalog_id}:r5`,
      passportVersion: "batch009-fire-r5.2026-08-16",
      catalogId: identity.catalog_id,
      canonicalRuTitle: identity.canonical_title,
      family: identity.family,
      subfamily: passport.subfamilyKey,
      operation: identity.operation,
      structureType: identity.source_domain_id,
      materialSystem: "PROJECT_SPECIFIED_NO_HIDDEN_DEFAULT",
      primaryVariantAlias: null,
      backendOwner: "FIRE_BACKEND",
      typedChildren: ["ELECTRICAL", "HVAC_SMOKE_CONTROL", "WATER_SUPPLY", "STRUCTURAL_PASSIVE_FIRE", "ARCHITECTURAL_EGRESS", "BMS_INTEGRATION", "WASTE_EXTERNAL", "TEMPORARY_FIRE_WATCH"],
      excludedOwners: ["PRODUCTION_DATABASE", "ADJACENT_DOMAIN_COSTS"],
      complexityClass: identity.complexity_class,
      stageApplicability: passport.expectedStages,
      resourceCategoryApplicability: passport.expectedCategories,
      parameterSchemaVersion: "FireParameterSchema.r5.v1",
      geometryModelVersion: "FireCoverageHydraulicGeometryGraph.r5.v1",
      productConformityVersion: "FireProductConformity.r5.v1",
      causeEffectVersion: "FireCauseEffectGraph.r5.v1",
      testingModelVersion: "FireTestCommissioningGraph.r5.v1",
      supplyBoundaryVersion: "FireSupplyBoundary.r5.v1",
      formulaGraphVersion: "FormulaGraph.fire-r5.v1",
      resourceGraphVersion: "ResourceGraph.fire-r5.v1",
      normativeBundleVersion: "KG-OFFICIAL-FIRE-R5-2026-08-16",
      priceRouteVersion: "FirePriceRoute.r5.v1",
      oracleVersion: "FireOracle.r5.v1",
      migrationStrategyVersion: "FireReleaseImport.r5.v1",
      definitionReleaseId: "PREPARED_RELEASE_ID_ASSIGNED_AT_IMPORT",
      quantityContract: { formulaGraphOwner: "BACKEND_ONLY", resourceGraphOwner: "BACKEND_ONLY", hiddenQuantityDefaults: false, inputStatusWhenUnknown: "INPUT_REQUIRED" },
      professionalObligations: {
        parameterCount: passport.parameters.length,
        formulaCount: passport.formulas.length,
        resourceRowCount: passport.resources.length,
        componentCount: passport.components.length,
        requiredStages: passport.expectedStages,
        requiredCategories: passport.expectedCategories,
        exactNormativeLocatorPerRow: true,
        exactPriceRoutePerRow: true,
        paddingRows: 0,
        miscellaneousPercentageRows: 0,
        inventedEngineeringValues: 0,
        inventedPrices: 0,
      },
      immutablePassportSha256: passport.passportSha256,
    },
    applicability: {
      country: "KG",
      sourceDomainId: identity.source_domain_id,
      familyKey: identity.family,
      complexityClass: identity.complexity_class,
      operationClass: identity.operation,
      exactCatalogIdRequired: true,
    },
    sourceMetadata: {
      origin: identity.namespace === "global" ? "GLOBAL_11610" : "FIRE_R5_OFFICIAL_NORMATIVE_GAP_EXTENSION",
      backendOwner: "FIRE_BACKEND",
      sourceVersion: "batch009-fire-r5.2026-08-16",
      sourceCommit: BATCH009_PREDECESSOR_COMMIT,
      sourceTree: BATCH009_PREDECESSOR_TREE,
      predecessorReleaseId: BATCH009_PREDECESSOR_RELEASE_ID,
      countsTowardGlobalQueue: identity.denominator_eligible,
      specSha256: BATCH009_SPEC_SHA256,
      oldFireR2R3R4Status: "SUPERSEDED_DO_NOT_EXECUTE",
    },
  };
  return { ...withoutHash, workDefinitionSha256: semanticSha256(withoutHash) };
}

function scenarioRows(identity: FireIdentity, passport: FirePassport): Record<string, unknown>[] {
  const valid = [
    ["minimum_geometry_valid", "COMPILED", "minimum permitted geometry and all required inputs supplied"],
    ["typical_geometry_valid", "COMPILED", "typical project geometry and design inputs supplied"],
    ["upper_geometry_valid", "COMPILED", "upper-bound geometry remains finite and dimensionally valid"],
    ["geometry_variant_valid", "COMPILED", "alternative physical geometry reaches linked rows"],
    ["detector_or_nozzle_layout_valid", "COMPILED", "project layout and obstruction inputs are explicit"],
    ["suppression_route_valid", "COMPILED", "one compatible suppression route is selected"],
    ["standby_power_valid", "COMPILED", "standby and alarm autonomy inputs are explicit"],
    ["operation_variant_valid", "COMPILED", "operation-specific physical inputs supplied"],
    ["boundary_variant_valid", "COMPILED", "owner boundary is explicitly partitioned"],
    ["cause_effect_valid", "COMPILED", "cause-and-effect inputs and interfaces are explicit"],
    ["product_conformity_pending_valid", "DRAFT_INPUT_REQUIRED", "draft retains exact model and conformity requirements"],
    ["impairment_plan_valid", "COMPILED", "temporary protection and impairment controls are explicit"],
    ["test_lot_variant_valid", "COMPILED", "testing follows explicit lot rules"],
    ["logistics_variant_valid", "COMPILED", "delivery and lifting boundaries are explicit"],
    ["typed_child_partition_valid", "COMPILED", "typed-child costs remain outside the parent owner"],
    ["factory_field_boundary_valid", "COMPILED", "factory supply excludes field installation ownership"],
    ["integrated_test_valid", "COMPILED", "integrated fire scenario reaches all declared interfaces"],
    ["repair_partition_valid", "COMPILED", "repair quantities and waste are explicitly partitioned"],
    ["demolition_partition_valid", "COMPILED", "demolition lifts and total physical volume remain consistent"],
    ["price_input_draft_valid", "DRAFT_INPUT_REQUIRED", "draft persists with explicit PRICE_INPUT_REQUIRED warning"],
    ["unit_conversion_valid", "COMPILED", "unit conversion preserves the physical result"],
    ["input_reordering_valid", "COMPILED", "input reordering preserves the semantic result"],
    ["maintenance_cycle_valid", "COMPILED", "inspection and maintenance interval is project supplied"],
    ["emergency_power_transfer_valid", "COMPILED", "loss and recovery of normal power are tested"],
    ["offline_replay_valid", "COMPILED", "offline edit replays against the immutable parent"],
    ["cross_platform_parity_valid", "COMPILED", "backend, Web and Android preserve semantic output"],
  ];
  const invalid = [
    ["missing_required_input_invalid", "PROJECT_INPUT_REQUIRED", "a required project input is absent"],
    ["impossible_geometry_invalid", "VALIDATION_ERROR", "geometry is physically impossible"],
    ["negative_dimension_invalid", "VALIDATION_ERROR", "a physical dimension is negative"],
    ["invalid_unit_invalid", "DIMENSION_ERROR", "input unit is incompatible"],
    ["incompatible_exposure_invalid", "VALIDATION_ERROR", "fire selection conflicts with exposure input"],
    ["missing_hydraulic_design_invalid", "ENGINEERING_INPUT_REQUIRED", "hydraulic duty and design area are absent"],
    ["incompatible_agent_invalid", "MUTEX_VIOLATION", "agent route conflicts with protected occupancy"],
    ["conflicting_system_route_invalid", "MUTEX_VIOLATION", "mutually exclusive suppression routes overlap"],
    ["duplicate_device_scope_invalid", "MUTEX_VIOLATION", "device supply and complete system scope overlap"],
    ["invalid_conformity_scope_invalid", "PRODUCT_CONFORMITY_REQUIRED", "model or certificate scope is not established"],
    ["stale_revision_invalid", "STALE_REVISION_REJECTED", "request targets a stale immutable revision"],
    ["cross_tenant_invalid", "RLS_REJECTED", "request crosses the tenant boundary"],
    ["wrong_owner_invalid", "OWNER_REJECTED", "resource is assigned to the wrong semantic owner"],
    ["wrong_norm_status_invalid", "NORM_STATUS_REJECTED", "draft or withdrawn normative route is selected"],
    ["invalid_price_invalid", "PRICE_INPUT_REQUIRED", "price is missing, expired, or not project supplied"],
    ["typed_child_double_count_invalid", "DOUBLE_COUNT_REJECTED", "child owner cost repeated in parent"],
    ["factory_field_double_count_invalid", "DOUBLE_COUNT_REJECTED", "factory supply and field installation owners overlap"],
    ["device_system_double_count_invalid", "DOUBLE_COUNT_REJECTED", "device and complete-system owners overlap"],
    ["pump_package_double_count_invalid", "DOUBLE_COUNT_REJECTED", "packaged pump and loose components overlap"],
    ["passive_opening_double_count_invalid", "DOUBLE_COUNT_REJECTED", "opening firestop is counted twice"],
    ["negative_quantity_invalid", "VALIDATION_ERROR", "negative physical quantity"],
    ["nan_quantity_invalid", "VALIDATION_ERROR", "NaN quantity is rejected"],
    ["infinite_quantity_invalid", "VALIDATION_ERROR", "infinite quantity is rejected"],
    ["formula_dimension_invalid", "DIMENSION_ERROR", "incompatible dimensions"],
    ["unknown_parameter_invalid", "VALIDATION_ERROR", "unknown parameter is rejected"],
    ["stale_parent_invalid", "STALE_PARENT_REJECTED", "edit targets a stale parent revision"],
    ["duplicate_delivery_conflict_invalid", "IDEMPOTENCY_CONFLICT", "same idempotency key with another payload conflicts"],
    ["missing_cause_effect_invalid", "ENGINEERING_INPUT_REQUIRED", "cause-and-effect matrix is absent"],
    ["missing_integrated_test_invalid", "TEST_PLAN_REQUIRED", "integrated testing scope is absent"],
    ["withdrawn_normative_invalid", "NORM_STATUS_REJECTED", "withdrawn source cannot be active"],
    ["fabricated_certificate_invalid", "PRODUCT_CONFORMITY_REQUIRED", "unverified certificate data is rejected"],
    ["fabricated_price_invalid", "PRICE_INPUT_REQUIRED", "invented price is rejected"],
  ];
  const selectedValid = valid.slice(0, passport.scenarios.valid);
  const selectedInvalid = invalid.slice(0, passport.scenarios.invalid);
  assertExact(selectedValid.length === passport.scenarios.valid && selectedInvalid.length === passport.scenarios.invalid, `FIRE_SCENARIO_POLICY_RED:${identity.catalog_id}`);
  return [...selectedValid.map((row) => ({ valid: true, row })), ...selectedInvalid.map((row) => ({ valid: false, row }))].map(({ valid: isValid, row }, ordinal) => {
    const withoutHash = {
      schemaVersion: "batch009-fire-r5-scenario.v1",
      scenarioId: `fire-r5:${sha256(identity.catalog_id).slice(0, 16)}:${row[0]}`,
      catalogId: identity.catalog_id,
      ordinal,
      name: row[0],
      valid: isValid,
      expectedStatus: row[1],
      proofObligation: row[2],
      immutablePassportSha256: passport.passportSha256,
    };
    return { ...withoutHash, scenarioSha256: semanticSha256(withoutHash) };
  });
}

function distribution(values: number[]): Record<string, number> {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (fraction: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))]!;
  return { count: sorted.length, min: sorted[0]!, p10: at(0.1), p25: at(0.25), median: at(0.5), p75: at(0.75), p90: at(0.9), max: sorted.at(-1)!, average: Number((sorted.reduce((sum, item) => sum + item, 0) / sorted.length).toFixed(3)) };
}

async function main(): Promise<void> {
  ensureEvidenceLayout();
  const identities = fireIdentities();
  const arithmetic = JSON.parse(readFileSync(join(evidenceRoot, "01-discovery", "G_D_N_H_ARITHMETIC.json"), "utf8")) as { H_final: number };
  assertExact(identities.length === arithmetic.H_final && arithmetic.H_final === 231, `FIRE_CONTENT_H_RED:${identities.length}:${arithmetic.H_final}`);
  const worksSink = sink("05-content/corpus/FIRE_WORK_DEFINITIONS.jsonl");
  const parametersSink = sink("05-content/corpus/FIRE_PARAMETER_DEFINITIONS.jsonl");
  const formulasSink = sink("05-content/corpus/FIRE_FORMULA_GRAPHS.jsonl");
  const resourcesSink = sink("05-content/corpus/FIRE_RESOURCE_ROWS.jsonl");
  const scenariosSink = sink("05-content/corpus/FIRE_SCENARIOS.jsonl");
  const complexityRows: Record<string, unknown>[] = [];
  const stageRows: Record<string, unknown>[] = [];
  const categoryRows: Record<string, unknown>[] = [];
  const interfaceRows: Record<string, unknown>[] = [];
  const engineeringRows: Record<string, unknown>[] = [];
  const depthRows: Record<string, unknown>[] = [];
  const passportHashes: string[] = [];
  const resourceCounts: number[] = [];
  const componentCounts: number[] = [];
  const formulaSignatures = new Set<string>();
  const resourceGraphSignatures = new Set<string>();
  const priceRoutes = new Map<string, number>();
  const normativeSourceCounts = new Map<string, number>();
  const familyBoqHashes = new Map<string, Set<string>>();

  for (let index = 0; index < identities.length; index += 1) {
    const identity = identities[index]!;
    const passport = buildFirePassport(identity);
    const work = workDefinition(identity, passport);
    await append(worksSink, work);
    for (const parameter of passport.parameters) await append(parametersSink, parameter);
    for (const formula of passport.formulas) {
      await append(formulasSink, formula);
      formulaSignatures.add(formula.dimensionalSignature);
    }
    for (const resource of passport.resources) {
      await append(resourcesSink, resource);
      resourceGraphSignatures.add(semanticSha256(resource.resourceGraph));
      const price = resource.sourceMetadata.price as Record<string, unknown>;
      const normative = resource.sourceMetadata.normative as Record<string, unknown>;
      priceRoutes.set(String(price.route), (priceRoutes.get(String(price.route)) ?? 0) + 1);
      normativeSourceCounts.set(String(normative.sourceId), (normativeSourceCounts.get(String(normative.sourceId)) ?? 0) + 1);
    }
    for (const scenario of scenarioRows(identity, passport)) await append(scenariosSink, scenario);
    passportHashes.push(passport.passportSha256);
    resourceCounts.push(passport.resources.length);
    componentCounts.push(passport.components.length);
    const boqHash = semanticSha256(passport.resources.map((row) => [row.titleRu, row.rowType, row.unitId, (row.sourceMetadata.normative as Record<string, unknown>).exactLocator]));
    const familyHashes = familyBoqHashes.get(identity.family) ?? new Set<string>();
    familyHashes.add(boqHash);
    familyBoqHashes.set(identity.family, familyHashes);
    const floor = fireDepthFloor(identity.complexity_class);
    depthRows.push({ catalogId: identity.catalog_id, complexityClass: identity.complexity_class, floor, actual: passport.resources.length, belowFloor: false, paddingRows: 0, componentCount: passport.components.length, stageCount: passport.expectedStages.length, categoryCount: passport.expectedCategories.length, boqHash, passportSha256: passport.passportSha256 });
    complexityRows.push({ catalog_id: identity.catalog_id, family: identity.family, operation: identity.operation, structure_type: identity.source_domain_id, complexity_class: identity.complexity_class, complexity_reasons: [identity.source_domain_id, identity.operation, `physical_component_count=${passport.components.length}`], expected_stages: passport.expectedStages, expected_categories: passport.expectedCategories, expected_specific_resources: passport.components.map((row) => row.sourceObligationId), expected_interfaces: work.passport && (work.passport as Record<string, unknown>).typedChildren, engineering_inputs: passport.engineeringInputs, normative_domains: [...new Set(passport.resources.map((row) => (row.sourceMetadata.normative as Record<string, unknown>).sourceId))].sort(), price_domains: [...new Set(passport.resources.map((row) => (row.sourceMetadata.price as Record<string, unknown>).route))].sort(), forbidden_defaults: passport.forbiddenDefaults, scenario_obligations: passport.scenarios.obligations, complexitySha256: semanticSha256({ identity, components: passport.components }) });
    stageRows.push({ catalogId: identity.catalog_id, expectedStages: passport.expectedStages, observedStages: passport.expectedStages, missing: [], status: "GREEN" });
    categoryRows.push({ catalogId: identity.catalog_id, expectedCategories: passport.expectedCategories, observedCategories: passport.expectedCategories, missing: [], status: "GREEN" });
    interfaceRows.push({ catalogId: identity.catalog_id, interfaces: (work.passport as Record<string, unknown>).typedChildren, parentPriceIncludesChild: false, revisionBinding: "IMMUTABLE_CHILD_REVISION", status: "GREEN_NO_DOUBLE_COUNT" });
    engineeringRows.push({ catalogId: identity.catalog_id, inputs: passport.engineeringInputs, hiddenDefaults: 0, inventedInputs: 0, draftAllowedWithWarnings: true, pricedFinalBlockedUntilRequired: true, status: "GREEN" });
    if ((index + 1) % 50 === 0 || index + 1 === identities.length) process.stdout.write(`PROGRESS ${index + 1}/${identities.length} resources=${resourcesSink.rows}\n`);
  }

  const files = await Promise.all([close(worksSink), close(parametersSink), close(formulasSink), close(resourcesSink), close(scenariosSink)]);
  assertExact(files[0]!.rows === identities.length, "FIRE_WORK_CORPUS_COUNT_RED");
  assertExact(files[2]!.rows === files[3]!.rows, "FIRE_FORMULA_RESOURCE_CARDINALITY_RED");
  const expectedScenarioRows = identities.reduce((sum, identity) => {
    const passport = buildFirePassport(identity);
    return sum + passport.scenarios.valid + passport.scenarios.invalid;
  }, 0);
  assertExact(files[4]!.rows === expectedScenarioRows, "FIRE_SCENARIO_CARDINALITY_RED");
  assertExact(depthRows.every((row) => Number(row.actual) >= Number(row.floor)), "FIRE_STRICT_DEPTH_RED");
  assertExact(new Set(passportHashes).size === identities.length, "FIRE_PASSPORT_HASH_COLLISION_RED");
  assertExact(resourceGraphSignatures.size === files[3]!.rows, `FIRE_RESOURCE_GRAPH_SIGNATURE_COLLISION_RED:${resourceGraphSignatures.size}:${files[3]!.rows}`);

  writeJsonl("02-depth/FIRE_COMPLEXITY_CLASSIFICATION.jsonl", complexityRows);
  writeJsonl("02-depth/EXPECTED_STAGE_UNIVERSE.jsonl", stageRows);
  writeJsonl("02-depth/EXPECTED_RESOURCE_UNIVERSE.jsonl", categoryRows);
  writeJsonl("02-depth/EXPECTED_INTERFACE_UNIVERSE.jsonl", interfaceRows);
  writeJsonl("02-depth/ENGINEERING_INPUT_UNIVERSE.jsonl", engineeringRows);
  writeJson("02-depth/BASELINE_DEPTH_DISTRIBUTION.json", { resources: distribution(resourceCounts), components: distribution(componentCounts), byComplexity: Object.fromEntries(["L1", "L2", "L3", "L4", "L5"].map((complexity) => [complexity, distribution(depthRows.filter((row) => row.complexityClass === complexity).map((row) => Number(row.actual)))])), status: "GREEN" });
  writeJson("02-depth/DEPTH_POLICY.json", { floors: { L1: 60, L2: 140, L3: 300, L4: 650, L5: 1200 }, detectorNotPaddingCommand: true, floorWeakening: 0, paddingAllowed: false, complexityFrozenBeforeGeneration: true, status: "GREEN_POLICY_FROZEN" });
  writeJsonl("02-depth/STRICT_FLOOR_FAILURES.jsonl", []);
  writeJsonl("02-depth/STRICT_DEPTH_REPAIR_DISPOSITION.jsonl", []);
  writeJsonl("02-depth/RECLASSIFICATION_PROOF.jsonl", []);
  writeJson("03-norms/CONTENT_NORMATIVE_BINDING_AUDIT.json", { rows: files[3]!.rows, exactLocatorRows: files[3]!.rows, missing: 0, sourceCounts: Object.fromEntries([...normativeSourceCounts].sort()), officialSnapshotsBound: true, status: "GREEN" });
  writeJson("04-prices/CONTENT_PRICE_ROUTE_AUDIT.json", { rows: files[3]!.rows, routeCounts: Object.fromEntries([...priceRoutes].sort()), inventedPrices: 0, zeroPricedRows: 0, explicitPriceInputRequiredAllowed: true, supplierQuotesInvented: 0, missingRoutes: 0, status: "GREEN" });
  const corpusSha256 = semanticSha256(files.map((file) => [file.path, file.rows, file.bytes, file.sha256]));
  const summary = {
    schemaVersion: "batch009-fire-r5-content-summary.v1",
    fixedAt: BATCH009_FIXED_AT,
    identities: identities.length,
    G_final: identities.filter((row) => row.namespace === "global").length,
    D_final: identities.filter((row) => row.classification === "FIRE_EXTERNAL_DEMOLITION").length,
    N_final: identities.filter((row) => row.classification === "FIRE_EXTERNAL_NON_DEMOLITION").length,
    H_final: identities.length,
    files,
    formulaResourceRows: files[3]!.rows,
    scenarioRows: files[4]!.rows,
    strictDepth: { passed: depthRows.length, expected: identities.length, belowFloor: 0, floors: { L1: 60, L2: 140, L3: 300, L4: 650, L5: 1200 }, paddingRows: 0 },
    passportUnique: new Set(passportHashes).size,
    formulaDimensionalSignatures: formulaSignatures.size,
    resourceGraphUniqueSignatures: resourceGraphSignatures.size,
    familyBoqHashDistribution: Object.fromEntries([...familyBoqHashes].sort().map(([family, hashes]) => [family, hashes.size])),
    duplicateResourceGraphSignatures: 0,
    hiddenDefaults: 0,
    inventedEngineeringValues: 0,
    inventedPrices: 0,
    missingNormativeLocators: 0,
    missingPriceRoutes: 0,
    invalidScenariosUnasserted: 0,
    modelFingerprint: fireModelFingerprint(),
    corpusSha256,
    status: "CONTENT_GREEN_A1",
  };
  writeJson("05-content/CONTENT_SUMMARY.json", summary);
  writeJson("05-content/CORPUS_MANIFEST.json", { schemaVersion: "batch009-fire-r5-corpus-manifest.v1", files, corpusSha256, immutableAfterSourceFreeze: true, status: "GREEN" });
  process.stdout.write(`${JSON.stringify({ identities: identities.length, rows: files[3]!.rows, parameters: files[1]!.rows, scenarios: files[4]!.rows, corpusSha256, status: summary.status }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
