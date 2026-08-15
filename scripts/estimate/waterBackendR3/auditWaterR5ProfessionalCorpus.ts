import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { buildGlobalCatalogInventoryV1 } from "../../../src/lib/estimate/v4/domainFactory/globalCatalogInventoryV1";
import { buildWaterBackendDefinitions, WATER_BACKEND_CONTENT_VERSION, type JsonRecord } from "./waterDomainModel";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a1");
const CATEGORY_UNIVERSE = [
  "MATERIALS",
  "OPERATIONS",
  "LABOR",
  "EQUIPMENT",
  "LOGISTICS",
  "TESTING",
  "FLUSHING",
  "DISINFECTION",
  "WASTE",
  "DOCUMENTATION",
] as const;

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

function writeJson(name: string, value: unknown): void {
  writeFileSync(join(EVIDENCE, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(name: string, values: readonly unknown[]): void {
  writeFileSync(join(EVIDENCE, name), `${values.map((value) => JSON.stringify(value)).join("\n")}\n`, "utf8");
}

function categoryReached(category: typeof CATEGORY_UNIVERSE[number], resources: ReturnType<typeof buildWaterBackendDefinitions>[number]["resources"]): string[] {
  const rows = resources.filter((resource) => {
    const graph = resource.resourceGraph as JsonRecord;
    const component = String(graph.componentKey ?? "");
    if (category === "MATERIALS") return resource.rowType === "material";
    if (category === "OPERATIONS") return ["service", "labor"].includes(resource.rowType);
    if (category === "LABOR") return resource.rowType === "labor";
    if (category === "EQUIPMENT") return resource.rowType === "equipment";
    if (category === "LOGISTICS") return resource.section === "Логистика";
    if (category === "TESTING") return resource.section === "Испытания" || resource.section === "Пусконаладка" || resource.section === "Контроль качества";
    if (category === "FLUSHING") return /flush|cleaning/.test(component);
    if (category === "DISINFECTION") return /disinfect|chlorine|microbiology|water_quality/.test(component);
    if (category === "WASTE") return resource.rowType === "waste";
    return /Документац|документац/.test(resource.section) || ["passport", "protocol", "record", "document", "as_built_trace"].includes(String(graph.actionKey));
  });
  return rows.map((row) => row.rowId);
}

function notApplicableReason(category: typeof CATEGORY_UNIVERSE[number], definition: ReturnType<typeof buildWaterBackendDefinitions>[number]): string {
  const passport = definition.work.passport;
  const technology = passport.technology as JsonRecord;
  const operation = String((passport.exactWorkIdentity as JsonRecord).operationClass ?? "");
  if (category === "FLUSHING") return `NOT_APPLICABLE_TO_OPERATION_OR_COMPONENT_SET:${operation}`;
  if (category === "DISINFECTION") return technology.fluid === "POTABLE_WATER"
    ? `NOT_APPLICABLE_TO_SELECTED_OPERATION:${operation}`
    : `NOT_POTABLE_WATER:${String(technology.fluid)}`;
  if (category === "WASTE") return `NO_PHYSICAL_WASTE_BEARING_ACTION_AT_THIS_ESTIMATE_MATURITY:${operation}`;
  if (category === "LOGISTICS") return `NO_TRANSPORT_OR_HANDLING_ACTION_AT_THIS_ESTIMATE_MATURITY:${operation}`;
  if (category === "EQUIPMENT") return `NO_MACHINE_OR_EQUIPMENT_ACTION_AT_THIS_ESTIMATE_MATURITY:${operation}`;
  return `CATEGORY_NOT_APPLICABLE_TO_EXACT_WORK_IDENTITY:${operation}`;
}

function jaccard(left: Set<string>, right: Set<string>): number {
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function main(): void {
  mkdirSync(EVIDENCE, { recursive: true });
  const definitions = buildWaterBackendDefinitions();
  const inventoryById = new Map(buildGlobalCatalogInventoryV1().rows.map((row) => [row.catalog_id, row]));
  if (definitions.length !== 845) throw new Error(`WATER_R5_ID_COUNT_RED:${definitions.length}`);

  const classification: JsonRecord[] = [];
  const obligationUniverse: JsonRecord[] = [];
  const stageCategory: JsonRecord[] = [];
  const perId: JsonRecord[] = [];
  const skeletons = new Map<string, string[]>();
  const semanticSets = new Map<string, Set<string>>();
  let formulaLiteralMultiplierRows = 0;
  let paddingRows = 0;
  let miscellaneousRows = 0;
  let missingNormativeLocator = 0;
  let missingPriceRoute = 0;
  let hiddenEngineeringDefaults = 0;
  let duplicateRows = 0;

  for (const definition of definitions) {
    const inventory = inventoryById.get(definition.work.catalogId);
    if (!inventory) throw new Error(`WATER_R5_INVENTORY_ORPHAN:${definition.work.catalogId}`);
    const obligations = definition.work.passport.professionalObligations as JsonRecord;
    const complexity = String(obligations.complexityClass);
    const estimateMaturity = String(obligations.estimateMaturity);
    const family = inventory.domain_id.startsWith("expanded:") ? inventory.domain_id.slice(9) : null;
    const rowIds = definition.resources.map((resource) => resource.rowId);
    duplicateRows += rowIds.length - new Set(rowIds).size;
    const semanticTokens = new Set(definition.resources.map((resource) => {
      const graph = resource.resourceGraph as JsonRecord;
      return `${String(graph.componentKey)}|${String(graph.actionKey)}|${resource.rowType}|${resource.unitId}|${resource.category}`;
    }));
    semanticSets.set(definition.work.catalogId, semanticTokens);
    const skeletonHash = sha256([...semanticTokens].sort());
    skeletons.set(skeletonHash, [...(skeletons.get(skeletonHash) ?? []), definition.work.catalogId]);

    for (const parameter of definition.parameters) {
      const constraints = parameter.constraints;
      if (parameter.valueType !== "boolean" && parameter.defaultValue != null && constraints.hiddenEngineeringDefault !== false) {
        hiddenEngineeringDefaults += 1;
      }
    }
    for (const [ordinal, resource] of definition.resources.entries()) {
      const formula = definition.formulas[ordinal];
      if (!formula || formula.formulaId !== resource.formulaId) throw new Error(`WATER_R5_FORMULA_ALIGNMENT_RED:${resource.rowId}`);
      if (formula.ast.kind === "literal" || /(?:^|\s)[*/]\s*0?\.\d+|\/\s*100(?:\s|$)/.test(formula.expressionSource)) formulaLiteralMultiplierRows += 1;
      const metadata = resource.sourceMetadata as JsonRecord;
      if (metadata.paddingRow === true) paddingRows += 1;
      if (metadata.miscellaneousPercentageRow === true || /проч(?:ее|ие)|miscellaneous|padding/i.test(resource.titleRu)) miscellaneousRows += 1;
      const trace = metadata.normativeTrace;
      if (!Array.isArray(trace) || !trace.some((item) => {
        const locator = String((item as JsonRecord).locator ?? "");
        return String((item as JsonRecord).source_role) === "EXACT_RESOURCE_OR_OPERATION_LOCATOR"
          && (/table:\d{2}-\d{2}-\d{3}/.test(locator) || /collection:09/.test(locator));
      })) missingNormativeLocator += 1;
      const price = metadata.priceRoute as JsonRecord;
      if (!price?.sourceId || !price?.artifactSha256 || price.hiddenPriceDefault !== false) missingPriceRoute += 1;
    }

    const components = new Map<string, { role: string; actions: Set<string>; rows: string[] }>();
    for (const resource of definition.resources) {
      const graph = resource.resourceGraph as JsonRecord;
      const componentKey = String(graph.componentKey);
      const value = components.get(componentKey) ?? { role: String(graph.componentRole), actions: new Set<string>(), rows: [] };
      value.actions.add(String(graph.actionKey));
      value.rows.push(resource.rowId);
      components.set(componentKey, value);
    }
    for (const [componentKey, value] of components) {
      obligationUniverse.push({
        catalog_id: definition.work.catalogId,
        component_key: componentKey,
        component_role: value.role,
        action_count: value.actions.size,
        actions: [...value.actions].sort(),
        row_ids: value.rows,
        disposition: "INCLUDED_WITH_EXACT_BACKEND_ROWS",
      });
    }
    const categoryDisposition = CATEGORY_UNIVERSE.map((category) => {
      const reached = categoryReached(category, definition.resources);
      return {
        category,
        disposition: reached.length ? "INCLUDED" : "NOT_APPLICABLE",
        reason: reached.length ? "EXACT_BACKEND_ROWS_PRESENT" : notApplicableReason(category, definition),
        row_count: reached.length,
        row_ids: reached,
      };
    });
    stageCategory.push({ catalog_id: definition.work.catalogId, categories: categoryDisposition });
    const perIdProof = {
      catalog_id: definition.work.catalogId,
      work_key: inventory.work_key,
      title_ru: inventory.title_ru,
      source_domain_id: inventory.domain_id,
      family,
      system: inventory.primary_material_or_system,
      operation: inventory.operation_class,
      scope_capabilities: inventory.scope_capabilities,
      complexity_class: complexity,
      estimate_maturity: estimateMaturity,
      parameter_count: definition.parameters.length,
      component_count: components.size,
      formula_count: definition.formulas.length,
      resource_count: definition.resources.length,
      required_stages: obligations.requiredStages,
      optional_stages: obligations.optionalStages,
      semantic_skeleton_sha256: skeletonHash,
      category_disposition_sha256: sha256(categoryDisposition),
      definition_sha256: sha256({ work: definition.work, parameters: definition.parameters, formulas: definition.formulas, resources: definition.resources }),
      status: "GREEN",
    };
    classification.push({
      catalog_id: definition.work.catalogId,
      source_domain_id: inventory.domain_id,
      family,
      system: inventory.primary_material_or_system,
      operation: inventory.operation_class,
      scope_capabilities: inventory.scope_capabilities,
      complexity_class: complexity,
      estimate_maturity: estimateMaturity,
      component_count: components.size,
      resource_count: definition.resources.length,
      classification_basis: family
        ? "PHYSICAL_FACILITY_OR_NETWORK_FAMILY_PLUS_ESTIMATE_MATURITY"
        : "EXACT_SYSTEM_PLUS_OPERATION_PLUS_SCOPE_CAPABILITY",
    });
    perId.push(perIdProof);
  }

  const exactSkeletonDuplicates = [...skeletons.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([hash, ids]) => ({ hash, catalog_ids: ids }));
  const nearDuplicates: JsonRecord[] = [];
  for (let left = 0; left < definitions.length; left += 1) {
    const leftId = definitions[left].work.catalogId;
    for (let right = left + 1; right < definitions.length; right += 1) {
      const rightId = definitions[right].work.catalogId;
      const similarity = jaccard(semanticSets.get(leftId)!, semanticSets.get(rightId)!);
      if (similarity >= 0.985) nearDuplicates.push({ left_catalog_id: leftId, right_catalog_id: rightId, jaccard: similarity });
    }
  }
  const counts = definitions.map((definition) => definition.resources.length).sort((left, right) => left - right);
  const byComplexity = Object.fromEntries(["L1", "L2", "L3", "L4", "L5"].map((complexity) => {
    const members = classification.filter((item) => item.complexity_class === complexity);
    const rows = members.map((item) => Number(item.resource_count));
    return [complexity, {
      works: members.length,
      rows: rows.reduce((sum, value) => sum + value, 0),
      min: Math.min(...rows),
      max: Math.max(...rows),
    }];
  }));
  const summary = {
    schemaVersion: "water-r5-professional-corpus-audit.v1",
    contentVersion: WATER_BACKEND_CONTENT_VERSION,
    definitions: definitions.length,
    parameters: definitions.reduce((sum, definition) => sum + definition.parameters.length, 0),
    formulas: definitions.reduce((sum, definition) => sum + definition.formulas.length, 0),
    resources: definitions.reduce((sum, definition) => sum + definition.resources.length, 0),
    rowCountDistribution: {
      min: counts[0],
      p50: counts[Math.floor(counts.length * 0.5)],
      p90: counts[Math.floor(counts.length * 0.9)],
      max: counts[counts.length - 1],
    },
    byComplexity,
    formulaLiteralMultiplierRows,
    paddingRows,
    miscellaneousRows,
    missingNormativeLocator,
    missingPriceRoute,
    hiddenEngineeringDefaults,
    duplicateRows,
    exactSkeletonDuplicates: exactSkeletonDuplicates.length,
    nearDuplicateSkeletonPairs: nearDuplicates.length,
    all845IndividuallyClassified: classification.length === 845,
    all845StageCategoryDispositioned: stageCategory.length === 845,
    diagnosticRangesAreNotQuotas: true,
    status: "GREEN",
  };
  if (
    formulaLiteralMultiplierRows || paddingRows || miscellaneousRows || missingNormativeLocator || missingPriceRoute
    || hiddenEngineeringDefaults || duplicateRows || exactSkeletonDuplicates.length || nearDuplicates.length
    || definitions.length !== 845 || Number((byComplexity.L5 as JsonRecord).max) < 700
  ) throw new Error(`WATER_R5_PROFESSIONAL_CORPUS_RED:${JSON.stringify(summary)}`);

  writeJsonl("WATER_R5_COMPLEXITY_CLASSIFICATION_845.jsonl", classification);
  writeJsonl("WATER_R5_OBLIGATION_UNIVERSE_845.jsonl", obligationUniverse);
  writeJsonl("WATER_R5_STAGE_CATEGORY_DISPOSITION_845.jsonl", stageCategory);
  writeJsonl("WATER_R5_PER_ID_PROOF_845.jsonl", perId);
  writeJson("WATER_R5_ANTI_TEMPLATE_AUDIT.json", {
    schemaVersion: "water-r5-anti-template-audit.v1",
    exactSkeletonDuplicates,
    nearDuplicateThreshold: 0.985,
    nearDuplicates,
    exactDuplicates: exactSkeletonDuplicates.length,
    nearDuplicatePairs: nearDuplicates.length,
    status: "GREEN",
  });
  writeJson("WATER_R5_CARDINALITY_PRE_FREEZE.json", summary);
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

main();
