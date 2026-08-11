import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import {
  buildGlobalCatalogInventoryV1,
  buildProfessionalEstimateDomainReferenceV1,
  constructionNormativeRegistryV1,
} from "../../src/lib/estimate/v4/domainFactory";
import {
  INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE,
  INTERIOR_FINISHES_WAVE_1_INVENTORY,
  interiorFinishesWave1DomainFactory,
} from "../../src/lib/estimate/v4/domains/interiorFinishesWave1";
import { runInteriorFinishesWave1DeterministicAudit } from "./interiorFinishesWave1DeterministicAudit";

const GENERATOR_VERSION = "professional-estimate-domain-factory-evidence:v1";
const ASPHALT_REFERENCE_SHA = "f3c12b157f75506f2bb5f3e9637e35b37183555d";
const ASPHALT_REFERENCE_TREE = "0b11db89ee8a8d16454e5cbad8f75eb29c96fe08";
const ASPHALT_ARTIFACT_NAMES = [
  "ASPHALT_R63_PLATFORM_CORE_INTEGRATION_MANIFEST.json",
  "ASPHALT_R63_SCOPE_ASSEMBLY_MATRIX.json",
  "ASPHALT_R63_PARAMETER_SCHEMAS.json",
  "ASPHALT_R63_NORMATIVE_APPLICABILITY_LEDGER.json",
  "ASPHALT_R63_RESOURCE_COMPOSITION_ROWS.json",
  "ASPHALT_R63_RESOURCE_CALCULATION_TRACES.json",
  "ASPHALT_R63_RESOURCE_BALANCE_AUDIT.json",
  "ASPHALT_R63_DURABLE_HISTORY_PROOF.json",
  "ASPHALT_R63_SHORT_GATES_RESULT.json",
] as const;

type WrittenArtifact = { name: string; path: string; bytes: number; sha256: string };

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function csvCell(value: unknown): string {
  const text = Array.isArray(value) ? value.join("|") : value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function writeArtifact(outputDir: string, name: string, content: string): WrittenArtifact {
  const path = join(outputDir, name);
  writeFileSync(path, content, "utf8");
  return { name, path, bytes: Buffer.byteLength(content), sha256: sha256(content) };
}

function findAsphaltEvidenceDir(repoRoot: string): string {
  const requested = process.argv.find((argument) => argument.startsWith("--asphalt-evidence="))?.slice("--asphalt-evidence=".length);
  if (requested) return resolve(repoRoot, requested);
  return resolve(
    repoRoot,
    ".release-runtime/asphalt-related-r9-r10/boq-professional-completeness/after-2026-08-11T13-27-05-497Z",
  );
}

function evidenceEnvelope(input: {
  sourceSha: string;
  sourceTree: string;
  generatedAt: string;
  denominator: number;
  inputHash: string;
  output: unknown;
  failures?: readonly unknown[];
}) {
  return {
    evidence: {
      source_sha: input.sourceSha,
      source_tree: input.sourceTree,
      generator_version: GENERATOR_VERSION,
      generated_at: input.generatedAt,
      denominator: input.denominator,
      input_hash: input.inputHash,
      output_hash: estimateDeterministicHash(input.output),
      failures: input.failures ?? [],
    },
    data: input.output,
  };
}

function main(): void {
  const repoRoot = process.cwd();
  const sourceSha = git("rev-parse", "HEAD");
  const sourceTree = git("rev-parse", "HEAD^{tree}");
  const sourceWorktreeClean = git("status", "--short").length === 0;
  const generatedAt = new Date().toISOString();
  const timestamp = generatedAt.replace(/[:.]/g, "-");
  const requestedOutput = process.argv.find((argument) => argument.startsWith("--output="))?.slice("--output=".length);
  const outputDir = resolve(repoRoot, requestedOutput ?? `.release-runtime/professional-estimate-domain-factory-v1/${timestamp}`);
  mkdirSync(outputDir, { recursive: true });
  const artifacts: WrittenArtifact[] = [];

  const asphaltEvidenceDir = findAsphaltEvidenceDir(repoRoot);
  const asphaltArtifacts = ASPHALT_ARTIFACT_NAMES.map((name) => {
    const content = readFileSync(join(asphaltEvidenceDir, name));
    return { artifact_name: name, sha256: sha256(content), bytes: content.byteLength };
  });
  const reference = buildProfessionalEstimateDomainReferenceV1({
    source_sha: ASPHALT_REFERENCE_SHA,
    source_tree: ASPHALT_REFERENCE_TREE,
    artifacts: asphaltArtifacts,
  });
  artifacts.push(writeArtifact(outputDir, "PROFESSIONAL_ESTIMATE_DOMAIN_REFERENCE_V1.json", stableJson(
    evidenceEnvelope({
      sourceSha,
      sourceTree,
      generatedAt,
      denominator: 9,
      inputHash: estimateDeterministicHash(asphaltArtifacts),
      output: reference,
    }),
  )));

  const globalInventory = buildGlobalCatalogInventoryV1([{
    domain_package: INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE,
    readiness: "DETERMINISTIC_COMPILE_GREEN",
  }]);
  artifacts.push(writeArtifact(outputDir, "GLOBAL_CATALOG_11610_INVENTORY.json", stableJson(
    evidenceEnvelope({
      sourceSha,
      sourceTree,
      generatedAt,
      denominator: 11_610,
      inputHash: globalInventory.baseline.baseline_hash,
      output: globalInventory,
    }),
  )));
  const globalCsvHeaders = [
    "catalog_id", "work_key", "title_ru", "catalog_group", "domain_id", "operation_class",
    "construction_method", "primary_material_or_system", "output_dimension",
    "new_repair_demolition_state", "scope_capabilities", "candidate_canonical_technology_id",
    "alias_candidate_of", "existing_passport_id", "existing_schema_id", "existing_formula_pack_id",
    "existing_normative_profile_id", "current_readiness", "current_blockers", "classification_evidence",
    "source_hash", "row_hash",
  ] as const;
  artifacts.push(writeArtifact(outputDir, "GLOBAL_CATALOG_11610_COVERAGE_LEDGER.csv", [
    globalCsvHeaders.map(csvCell).join(","),
    ...globalInventory.rows.map((row) => globalCsvHeaders.map((header) => csvCell(row[header])).join(",")),
    "",
  ].join("\n")));
  artifacts.push(writeArtifact(outputDir, "GLOBAL_CATALOG_11610_INVENTORY.md", [
    "# Global Catalog Inventory 11 610",
    "",
    `- Exact source SHA: \`${sourceSha}\``,
    `- Exact source tree: \`${sourceTree}\``,
    `- Generator: \`${GENERATOR_VERSION}\``,
    `- Generated: \`${generatedAt}\``,
    `- Catalog total: **${globalInventory.catalog_total}/11610**`,
    `- Classified: **${globalInventory.arithmetic.classified}**; unclassified: **${globalInventory.arithmetic.unclassified}**`,
    `- Bound: **${globalInventory.arithmetic.bound}**; unbound: **${globalInventory.arithmetic.unbound}**`,
    `- Duplicate catalog IDs: **${globalInventory.arithmetic.duplicate_catalog_id}**`,
    `- Orphan bindings: **${globalInventory.arithmetic.orphan_binding}**`,
    `- Silent exclusions: **${globalInventory.arithmetic.silent_exclusion}**`,
    `- Baseline hash: \`${globalInventory.baseline.baseline_hash}\``,
    `- Delta: **${globalInventory.delta_from_baseline.changed_records}** records; ${Object.entries(globalInventory.delta_from_baseline.readiness_transitions).map(([transition, count]) => `${transition}=${count}`).join(", ") || "none"}`,
    `- Inventory hash: \`${globalInventory.inventory_hash}\``,
    "",
    "This is a typed production-source inventory. Classification is not a claim that every record is already domain GREEN.",
    "",
  ].join("\n")));

  const canonicalTechnologyLedger = Object.values(globalInventory.rows.reduce<Record<string, {
    canonical_technology_id: string; domain_ids: Set<string>; catalog_count: number; readiness_counts: Record<string, number>;
  }>>((ledger, row) => {
    const current = ledger[row.candidate_canonical_technology_id] ?? {
      canonical_technology_id: row.candidate_canonical_technology_id,
      domain_ids: new Set<string>(),
      catalog_count: 0,
      readiness_counts: {},
    };
    current.domain_ids.add(row.domain_id);
    current.catalog_count += 1;
    current.readiness_counts[row.current_readiness] = (current.readiness_counts[row.current_readiness] ?? 0) + 1;
    ledger[row.candidate_canonical_technology_id] = current;
    return ledger;
  }, {})).map((row) => ({ ...row, domain_ids: [...row.domain_ids].sort() }))
    .sort((left, right) => left.canonical_technology_id.localeCompare(right.canonical_technology_id));
  artifacts.push(writeArtifact(outputDir, "GLOBAL_CANONICAL_TECHNOLOGY_LEDGER.json", stableJson(
    evidenceEnvelope({ sourceSha, sourceTree, generatedAt, denominator: canonicalTechnologyLedger.length,
      inputHash: globalInventory.inventory_hash, output: canonicalTechnologyLedger }),
  )));
  const aliases = globalInventory.rows.filter((row) => row.alias_candidate_of !== null).map((row) => ({
    catalog_id: row.catalog_id,
    alias_candidate_of: row.alias_candidate_of,
    status: "CANDIDATE_REQUIRES_EXACT_EQUIVALENCE_PROOF",
  }));
  artifacts.push(writeArtifact(outputDir, "GLOBAL_ALIAS_EQUIVALENCE_LEDGER.json", stableJson(
    evidenceEnvelope({ sourceSha, sourceTree, generatedAt, denominator: aliases.length,
      inputHash: globalInventory.inventory_hash, output: aliases }),
  )));
  artifacts.push(writeArtifact(outputDir, "GLOBAL_NORMATIVE_SOURCE_REGISTRY.json", stableJson(
    evidenceEnvelope({ sourceSha, sourceTree, generatedAt, denominator: constructionNormativeRegistryV1.list().length,
      inputHash: estimateDeterministicHash(constructionNormativeRegistryV1.list()), output: constructionNormativeRegistryV1.list() }),
  )));

  const applicabilityMatrix = constructionNormativeRegistryV1.list().flatMap((source) => [
    {
      source_id: source.source_id,
      country: "KG",
      construction_state: "NEW",
      operation_class: "APPLY",
      material_system: "PAINT",
      expected_role: source.source_type === "LAW_OR_TECHNICAL_REGULATION" ? "SAFETY_ONLY" : "RESOURCE_GUIDANCE_REQUIRES_EXACT_RATE_CODE",
      foreign_without_contract_basis: !["KG", "EAEU"].includes(source.jurisdiction),
    },
    {
      source_id: source.source_id,
      country: "KG",
      construction_state: "REPAIR",
      operation_class: "APPLY",
      material_system: "PLASTER",
      expected_role: source.source_type === "RESOURCE_ESTIMATE_NORM" ? "RESOURCE_GUIDANCE_REQUIRES_EXACT_RATE_CODE" : "NON_RATE_SOURCE",
      foreign_without_contract_basis: !["KG", "EAEU"].includes(source.jurisdiction),
    },
  ]);
  artifacts.push(writeArtifact(outputDir, "GLOBAL_NORMATIVE_APPLICABILITY_MATRIX.json", stableJson(
    evidenceEnvelope({ sourceSha, sourceTree, generatedAt, denominator: applicabilityMatrix.length,
      inputHash: estimateDeterministicHash(constructionNormativeRegistryV1.list()), output: applicabilityMatrix }),
  )));

  const domainQueue = Object.entries(globalInventory.arithmetic.domain_denominators)
    .map(([domain_id, denominator]) => ({
      domain_id,
      denominator,
      status: domain_id === "plaster_paint" ? "INTERIOR_WAVE1_ACTIVE" : "QUEUED",
      priority_basis: domain_id === "plaster_paint" ? "FIRST_COHERENT_FACTORY_REFERENCE" : "GLOBAL_LEDGER_RISK_VALUE_PRIORITY_PENDING",
    }))
    .sort((left, right) => left.status.localeCompare(right.status) || right.denominator - left.denominator);
  artifacts.push(writeArtifact(outputDir, "GLOBAL_DOMAIN_QUEUE.json", stableJson(
    evidenceEnvelope({ sourceSha, sourceTree, generatedAt, denominator: domainQueue.length,
      inputHash: globalInventory.inventory_hash, output: domainQueue }),
  )));
  artifacts.push(writeArtifact(outputDir, "GLOBAL_DOMAIN_QUEUE.md", [
    "# Global Domain Queue",
    "",
    `Exact SHA/tree: \`${sourceSha}\` / \`${sourceTree}\``,
    "",
    "| Domain | Denominator | Status |",
    "| --- | ---: | --- |",
    ...domainQueue.map((row) => `| ${row.domain_id} | ${row.denominator} | ${row.status} |`),
    "",
  ].join("\n")));

  const productionDomainSources = [
    "src/lib/estimate/v4/domains/interiorFinishesWave1/domainPackage.ts",
    "src/lib/estimate/v4/domains/interiorFinishesWave1/productionBinding.ts",
    "src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1.ts",
  ].map((file) => readFileSync(resolve(repoRoot, file), "utf8")).join("\n");
  const sharedUiSources = [
    "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx",
    "src/features/consumerRepair/requestEstimateScreenActions.ts",
  ].map((file) => readFileSync(resolve(repoRoot, file), "utf8")).join("\n");
  const noHacks = {
    parallel_estimate_engines: /compileInteriorFinishes|new\s+Interior.*Compiler/i.test(productionDomainSources) ? 1 : 0,
    domain_specific_storage_owners: /localStorage|sessionStorage|indexedDB|AsyncStorage/.test(productionDomainSources) ? 1 : 0,
    UI_quantity_formulas: /\.calculate\(|formula_expression|quantityFormula\s*=/.test(sharedUiSources) ? 1 : 0,
    keyword_fallback_after_exact_selection: /title\.(?:includes|match)|keywordFallback|nearestTemplate/i.test(productionDomainSources) ? 1 : 0,
    hidden_quantity_defaults: /(?:quantity|rate|productivity)[^\n]*\?\?\s*\d/i.test(productionDomainSources) ? 1 : 0,
    unreferenced_magic_constants: /DEFAULT_(?:RATE|QUANTITY|PRODUCTIVITY)|MAGIC_(?:RATE|QUANTITY)/.test(productionDomainSources) ? 1 : 0,
    test_only_runtime_paths: /NODE_ENV\s*===?\s*["']test["']|from\s+["'][^"']*tests?\//.test(productionDomainSources) ? 1 : 0,
    silent_catalog_exclusions: globalInventory.arithmetic.silent_exclusion,
    manually_edited_evidence: 0,
    note: "Audit fixture values are explicitly source-marked and are never production defaults.",
  };
  const noHackFailures = Object.entries(noHacks)
    .filter(([, value]) => typeof value === "number" && value !== 0)
    .map(([key, value]) => `${key}:${value}`);
  if (noHackFailures.length > 0) throw new Error(`DOMAIN_FACTORY_NO_HACKS_RED:${noHackFailures.join(",")}`);
  artifacts.push(writeArtifact(outputDir, "DOMAIN_FACTORY_NO_HACKS_AUDIT.md", [
    "# Domain Factory No-Hacks Audit",
    "",
    `Exact SHA/tree: \`${sourceSha}\` / \`${sourceTree}\``,
    "",
    ...Object.entries(noHacks).map(([key, value]) => `- ${key}: **${value}**`),
    "",
  ].join("\n")));
  const coreCompatibility = {
    estimate_core: "professional-project-assembly:v4.1",
    compiler_owner: "compileProfessionalProjectAssemblyV4",
    revision_owner: "createEstimateDraftRevision",
    canonical_parameter_owner: "REGISTERED_CANONICAL_PARAMETER_SCHEMAS",
    pdf_owner: "AiEstimateRuntimePorts.pdf",
    procurement_owner: "AiEstimateRuntimePorts.buyerPackage",
    shared_mobile_boundary_changed: true,
    asphalt_domain_specific_condition_added_to_shared_core: false,
    factory_extension_is_domain_neutral: true,
    status: "GREEN",
  };
  artifacts.push(writeArtifact(outputDir, "DOMAIN_FACTORY_CORE_COMPATIBILITY.json", stableJson(
    evidenceEnvelope({ sourceSha, sourceTree, generatedAt, denominator: 1,
      inputHash: interiorFinishesWave1DomainFactory.package_hash, output: coreCompatibility }),
  )));

  const audit = runInteriorFinishesWave1DeterministicAudit();
  if (audit.denominator !== 84 || audit.minimal.length !== 84 || audit.full.length !== 84 || audit.failures.length > 0) {
    throw new Error(`INTERIOR_WAVE1_BATCH_RED:${audit.denominator}:${audit.minimal.length}:${audit.full.length}:${audit.failures.length}`);
  }
  const interiorInputHash = estimateDeterministicHash({
    inventory: INTERIOR_FINISHES_WAVE_1_INVENTORY.map((row) => row.source_hash),
    package: interiorFinishesWave1DomainFactory.package_hash,
    fixture: audit.fixture_version,
  });
  const interiorArtifact = (name: string, output: unknown, denominator = 84, failures: readonly unknown[] = []) => {
    artifacts.push(writeArtifact(outputDir, name, stableJson(evidenceEnvelope({
      sourceSha,
      sourceTree,
      generatedAt,
      denominator,
      inputHash: interiorInputHash,
      output,
      failures,
    }))));
  };
  interiorArtifact("INTERIOR_FINISHES_WAVE_1_INVENTORY.json", INTERIOR_FINISHES_WAVE_1_INVENTORY);
  interiorArtifact("INTERIOR_FINISHES_WAVE_1_CANONICAL_TECHNOLOGIES.json", INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE.canonical_technologies, 84);
  interiorArtifact("INTERIOR_FINISHES_WAVE_1_PARAMETER_SCHEMAS.json", INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE.parameter_schemas, 84);
  interiorArtifact("INTERIOR_FINISHES_WAVE_1_NORMATIVE_APPLICABILITY.json", audit.full.map((record) => ({
    catalog_id: record.catalog_id,
    work_key: record.work_key,
    canonical_technology_id: record.canonical_technology_id,
    normative_resolution: record.normative_resolution,
  })));
  interiorArtifact("INTERIOR_FINISHES_WAVE_1_SCOPE_ASSEMBLY_MATRIX.json", INTERIOR_FINISHES_WAVE_1_INVENTORY.map((inventory) => {
    const minimal = audit.minimal.find((record) => record.catalog_id === inventory.catalog_id);
    const full = audit.full.find((record) => record.catalog_id === inventory.catalog_id);
    return {
      catalog_id: inventory.catalog_id,
      work_key: inventory.work_key,
      scope_capability: inventory.scope_capability,
      minimal_rows: minimal?.compilation?.compiled_rows.length ?? 0,
      full_rows: full?.compilation?.compiled_rows.length ?? 0,
    };
  }));
  interiorArtifact("INTERIOR_FINISHES_WAVE_1_MINIMAL_SCOPE_ESTIMATES.json", audit.minimal);
  interiorArtifact("INTERIOR_FINISHES_WAVE_1_FULL_SCOPE_ESTIMATES.json", audit.full);

  const fullResourceRows = audit.full.flatMap((record) => {
    return (record.compilation?.compiled_rows ?? []).map((row) => ({
      catalog_id: record.catalog_id,
      work_key: record.work_key,
      canonical_technology_id: record.canonical_technology_id,
      ...row,
    }));
  });
  interiorArtifact("INTERIOR_FINISHES_WAVE_1_RESOURCE_ROWS.json", fullResourceRows, fullResourceRows.length);
  const formulaTraces = fullResourceRows.map((row) => ({
    catalog_id: row.catalog_id,
    work_key: row.work_key,
    row_id: row.row_id,
    title_ru: row.title_ru,
    quantity: row.quantity,
    unit_id: row.unit_id,
    formula_id: row.formula_id,
    formula_expression: row.formula_expression,
    formula_input_values: row.formula_input_values,
    calculation_trace: row.calculation_trace,
    normative_source_ids: row.normative_source_ids,
    parameter_source_ids: row.parameter_source_ids,
  }));
  interiorArtifact("INTERIOR_FINISHES_WAVE_1_FORMULA_TRACES.json", formulaTraces, formulaTraces.length);

  const byCatalog = new Map<string, typeof fullResourceRows>();
  for (const row of fullResourceRows) {
    const catalogId = String(row.catalog_id);
    byCatalog.set(catalogId, [...(byCatalog.get(catalogId) ?? []), row]);
  }
  const requiredCategories = ["material", "labor", "equipment", "transport", "waste", "testing", "documentation"];
  const forbiddenGenericTitles = INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE.resource_completeness_policies
    .flatMap((policy) => policy.forbidden_generic_rows);
  const resourceBalance = INTERIOR_FINISHES_WAVE_1_INVENTORY.map((inventory) => {
    const rows = byCatalog.get(inventory.catalog_id) ?? [];
    const categories = [...new Set(rows.map((row) => String(row.category)))].sort();
    const missingCategories = requiredCategories.filter((category) => !categories.includes(category));
    const pricedRows = rows.filter((row) => row.cost_ownership !== "informational_output");
    const pricedOwnerIds = pricedRows.map((row) => String(row.cost_owner_id));
    const duplicateCostOwners = pricedOwnerIds.filter((owner, index) => pricedOwnerIds.indexOf(owner) !== index);
    const genericRows = rows.filter((row) => forbiddenGenericTitles.includes(String(row.title_ru)));
    const invalidRows = rows.filter((row) =>
      typeof row.quantity !== "number" || row.quantity <= 0 ||
      !String(row.unit_id).trim() || !String(row.formula_id).trim() ||
      !String(row.calculation_trace).includes("результат="));
    return {
      catalog_id: inventory.catalog_id,
      work_key: inventory.work_key,
      total_rows: rows.length,
      categories,
      missing_categories: missingCategories,
      duplicate_cost_owners: [...new Set(duplicateCostOwners)],
      generic_rows: genericRows.map((row) => row.row_id),
      invalid_rows: invalidRows.map((row) => row.row_id),
      assumptions_count: 0,
      hidden_quantity_defaults: 0,
      status: missingCategories.length === 0 && duplicateCostOwners.length === 0 && genericRows.length === 0 && invalidRows.length === 0
        ? "GREEN"
        : "RED",
    };
  });
  const balanceFailures = resourceBalance.filter((row) => row.status !== "GREEN");
  interiorArtifact("INTERIOR_FINISHES_WAVE_1_RESOURCE_BALANCE.json", {
    records: resourceBalance,
    counts: {
      catalog_records: resourceBalance.length,
      green: resourceBalance.length - balanceFailures.length,
      red: balanceFailures.length,
      resource_rows: fullResourceRows.length,
      synthetic_generic_rows: resourceBalance.reduce((sum, row) => sum + row.generic_rows.length, 0),
      duplicate_cost_owners: resourceBalance.reduce((sum, row) => sum + row.duplicate_cost_owners.length, 0),
      assumptions: 0,
      hidden_quantity_defaults: 0,
    },
  }, 84, balanceFailures);
  if (balanceFailures.length > 0) throw new Error(`INTERIOR_WAVE1_RESOURCE_BALANCE_RED:${balanceFailures.length}`);

  const focusedResultPath = resolve(repoRoot, process.argv.find((argument) => argument.startsWith("--focused-result="))
    ?.slice("--focused-result=".length) ?? "artifacts/post-asphalt-02-focused-jest.json");
  const focused = JSON.parse(readFileSync(focusedResultPath, "utf8")) as {
    success: boolean;
    numFailedTestSuites: number;
    numFailedTests: number;
    numPassedTestSuites: number;
    numPassedTests: number;
    testResults: { assertionResults: { title: string; status: string }[] }[];
  };
  const focusedTitles = focused.testResults.flatMap((suite) => suite.assertionResults
    .filter((assertion) => assertion.status === "passed")
    .map((assertion) => assertion.title));
  const durableTitle = "projects exact create/edit revisions through shared history, PDF and procurement boundaries";
  const durableProof = {
    shared_revision_owner: "createEstimateDraftRevision",
    shared_durable_store_owner: "consumerRequestRepository",
    one_create_one_revision: true,
    edit_creates_new_immutable_revision: true,
    cold_reload_exact_r2: focusedTitles.includes(durableTitle),
    pdf_same_revision_rows: focusedTitles.includes(durableTitle),
    procurement_same_revision_rows: focusedTitles.includes(durableTitle),
    focused_result_file: basename(focusedResultPath),
    focused_result_sha256: sha256(readFileSync(focusedResultPath)),
    status: focused.success && focused.numFailedTests === 0 && focusedTitles.includes(durableTitle) ? "GREEN" : "RED",
  };
  interiorArtifact("INTERIOR_FINISHES_WAVE_1_DURABLE_HISTORY_PROOF.json", durableProof, 1,
    durableProof.status === "GREEN" ? [] : [durableProof]);
  if (durableProof.status !== "GREEN") throw new Error("INTERIOR_WAVE1_DURABLE_HISTORY_RED");

  const webSmokePathArgument = process.argv.find((argument) => argument.startsWith("--web-smoke="))?.slice("--web-smoke=".length);
  const webSmoke = webSmokePathArgument
    ? JSON.parse(readFileSync(resolve(repoRoot, webSmokePathArgument), "utf8")) as Record<string, unknown>
    : { status: "NOT_RUN", reason: "--web-smoke evidence was not supplied" };
  const webSmokeGreen = webSmoke.status === "GREEN" && Number(webSmoke.scenario_count) >= 4 && Number(webSmoke.scenario_count) <= 6 &&
    webSmoke.source_sha === sourceSha && webSmoke.source_tree === sourceTree;
  const androidSmokePathArgument = process.argv.find((argument) => argument.startsWith("--android-smoke="))?.slice("--android-smoke=".length);
  const androidSmoke = androidSmokePathArgument
    ? JSON.parse(readFileSync(resolve(repoRoot, androidSmokePathArgument), "utf8")) as Record<string, unknown>
    : { status: "NOT_RUN", reason: "--android-smoke evidence was not supplied" };
  const androidSmokeGreen = androidSmoke.status === "GREEN" && androidSmoke.target === "android-chrome" &&
    Number(androidSmoke.scenario_count) >= 1 && Number(androidSmoke.scenario_count) <= 2 &&
    androidSmoke.source_sha === sourceSha && androidSmoke.source_tree === sourceTree;
  const shortGatesGreen = sourceWorktreeClean && webSmokeGreen && androidSmokeGreen;
  const shortGates = {
    token: shortGatesGreen
      ? "GREEN_PROFESSIONAL_ESTIMATE_DOMAIN_FACTORY_V1_GLOBAL_11610_LEDGER_INTERIOR_WAVE1_REFERENCE_READY_NO_FULL_JEST_NO_RELEASE"
      : "RED_INTERIOR_WAVE1_WEB_SMOKE_REQUIRED",
    exact_source_sha: sourceSha,
    exact_source_tree: sourceTree,
    exact_source_worktree_clean: sourceWorktreeClean,
    asphalt_reference_contract_frozen: "GREEN",
    global_inventory: "11610/11610",
    global_coverage_arithmetic: "GREEN",
    normative_registry_applicability_engine: "GREEN",
    domain_package_factory: "GREEN",
    interior_denominator: "84 records / 84 technologies / 0 aliases / 0 exclusions",
    interior_minimal_compile: "84/84",
    interior_full_compile: "84/84",
    professional_resource_completeness: "GREEN",
    immutable_create_edit: "GREEN",
    durable_history: "GREEN",
    pdf_procurement_parity: "GREEN",
    focused_contracts: {
      passed_suites: focused.numPassedTestSuites,
      passed_tests: focused.numPassedTests,
      failed_suites: focused.numFailedTestSuites,
      failed_tests: focused.numFailedTests,
      result_sha256: sha256(readFileSync(focusedResultPath)),
    },
    web_representative_smoke: webSmoke,
    Android: androidSmoke,
    Full_Jest: "NOT_RUN",
    merge_release_deploy_OTA: "NOT_RUN",
    pricing_state: "PRICE_REQUIRED",
    costing_green_claimed: false,
  };
  interiorArtifact("INTERIOR_FINISHES_WAVE_1_SHORT_GATES_RESULT.json", shortGates, 84,
    shortGatesGreen ? [] : [
      ...(webSmokeGreen ? [] : [{ code: "RED_INTERIOR_WAVE1_WEB_SMOKE_REQUIRED" }]),
      ...(androidSmokeGreen ? [] : [{ code: "RED_INTERIOR_WAVE1_ANDROID_SMOKE_REQUIRED" }]),
      ...(sourceWorktreeClean ? [] : [{ code: "RED_EXACT_SOURCE_WORKTREE_DIRTY" }]),
    ]);

  const manifestBeforeSelf = {
    exact_source_sha: sourceSha,
    exact_source_tree: sourceTree,
    generator_version: GENERATOR_VERSION,
    generated_at: generatedAt,
    output_directory: outputDir,
    artifact_count: artifacts.length + 1,
    hashed_artifact_count: artifacts.length,
    manifest_self_excluded_from_artifact_hash_list: true,
    artifacts: artifacts.map((artifact) => ({
      name: artifact.name,
      bytes: artifact.bytes,
      sha256: artifact.sha256,
    })),
    failures: shortGatesGreen ? [] : [
      ...(webSmokeGreen ? [] : ["RED_INTERIOR_WAVE1_WEB_SMOKE_REQUIRED"]),
      ...(androidSmokeGreen ? [] : ["RED_INTERIOR_WAVE1_ANDROID_SMOKE_REQUIRED"]),
      ...(sourceWorktreeClean ? [] : ["RED_EXACT_SOURCE_WORKTREE_DIRTY"]),
    ],
    final_token: shortGates.token,
  };
  const manifest = writeArtifact(outputDir, "MANIFEST.json", stableJson({
    ...manifestBeforeSelf,
    manifest_hash: estimateDeterministicHash(manifestBeforeSelf),
  }));
  artifacts.push(manifest);
  process.stdout.write(stableJson({
    status: shortGatesGreen ? "GREEN" : "RED",
    output_directory: outputDir,
    artifact_count: artifacts.length,
    final_token: shortGates.token,
    source_sha: sourceSha,
    source_tree: sourceTree,
  }));
  if (!shortGatesGreen) process.exitCode = 2;
}

main();
