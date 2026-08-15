import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream, mkdirSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";
import { open } from "node:fs/promises";
import { join, resolve } from "node:path";

import { WATER_BACKEND_CONTENT_VERSION, buildWaterBackendDefinitions, type JsonRecord, type WaterFormula, type WaterResource } from "./waterDomainModel";

type Json = Record<string, any>;

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a2");
const PREDECESSOR = "eaaa1404939cc627fdc86a64fa28ebb127734b68";

function stable(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const row = value as Json;
  return `{${Object.keys(row).filter((key) => row[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${stable(row[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
}

async function hashFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 }).trimEnd();
}

async function openAtomic(name: string) {
  mkdirSync(EVIDENCE, { recursive: true });
  const target = join(EVIDENCE, name);
  const temporary = `${target}.tmp-${process.pid}`;
  const handle = await open(temporary, "w");
  return {
    handle,
    target,
    temporary,
    async finish() {
      await handle.sync();
      await handle.close();
      rmSync(target, { force: true });
      renameSync(temporary, target);
    },
  };
}

function rowTarget(resource: WaterResource, formula: WaterFormula): Json {
  const graph = resource.resourceGraph as Json;
  const source = resource.sourceMetadata as Json;
  const norm = (source.normativeTrace as Json[] | undefined)?.[0] ?? {};
  const price = source.priceRoute as Json;
  const target = {
    catalog_id: resource.catalogId,
    row_id: resource.rowId,
    resource_type: resource.rowType,
    resource_code: graph.resourceCode,
    resource_name_ru: resource.titleRu,
    uom: resource.unitId,
    quantity_formula_id: resource.formulaId,
    formula_output_uom: formula.outputUnitId,
    formula_ast: formula.ast,
    formula_ast_hash: sha256(formula.ast),
    formula_input_parameter_ids: formula.inputParameterIds,
    inclusion_ast: resource.inclusionAst,
    dimension_signature: graph.dimensionSignature,
    applicability_condition_id: graph.applicabilityConditionId,
    stage_id: graph.stageId,
    technology_kind: graph.technologyKind,
    component_role: graph.componentRole,
    component_key: graph.componentKey,
    action_key: graph.actionKey,
    semantic_owner: resource.semanticOwner,
    cost_owner_id: resource.costOwnerId,
    parent_child_double_count_guard: graph.parentChildDoubleCountGuard,
    norm_source_id: norm.source_id,
    norm_locator: norm.locator,
    norm_applicability: norm.applicability,
    norm_artifact_sha256: norm.official_artifact_sha256,
    norm_value_or_input_rule: source.normValueOrInputRule,
    waste_rule: source.wasteRule,
    price_source_id: price.sourceId,
    price_source_type: price.routePolicy,
    price_region: source.priceRegion,
    price_date: source.priceDate,
    price_status: source.priceStatus,
    hidden_price_default: price.hiddenPriceDefault,
    procurement_eligible: resource.procurementEligible,
    procurement_category: source.procurementCategory,
    supplier_specification: source.supplierSpecification,
    input_required_state: source.inputRequiredState,
    revision_policy: source.revisionPolicy,
    padding_row: source.paddingRow,
    miscellaneous_percentage_row: source.miscellaneousPercentageRow,
    row_hash: "",
  };
  return { ...target, row_hash: sha256({ resource, formula }) };
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const definitions = buildWaterBackendDefinitions();
  const definitionOutput = await openAtomic("A2_06_CLEAN_AUDIT_DEFINITIONS.jsonl");
  const parameterOutput = await openAtomic("A2_06_CLEAN_AUDIT_PARAMETERS.jsonl");
  const rowOutput = await openAtomic("A2_06_CLEAN_AUDIT_ROWS.jsonl");
  let parameterCount = 0;
  let rowCount = 0;
  try {
    for (const definition of definitions) {
      const formulaById = new Map(definition.formulas.map((formula) => [formula.formulaId, formula]));
      const definitionRow = {
        schema_version: "water-r6-a2-clean-audit-definition.v1",
        catalog_id: definition.work.catalogId,
        namespace: definition.work.namespace,
        denominator_eligible: definition.work.denominatorEligible,
        title_ru: definition.work.titleRu,
        work_key: definition.work.workKey,
        passport: definition.work.passport,
        applicability: definition.work.applicability,
        source_metadata: definition.work.sourceMetadata,
        parameter_count: definition.parameters.length,
        formula_count: definition.formulas.length,
        resource_count: definition.resources.length,
        parameter_id_set_sha256: sha256(definition.parameters.map((parameter) => parameter.parameterId).sort().join("\n")),
        formula_id_set_sha256: sha256(definition.formulas.map((formula) => formula.formulaId).sort().join("\n")),
        resource_id_set_sha256: sha256(definition.resources.map((resource) => resource.rowId).sort().join("\n")),
        definition_hash: sha256(definition),
      };
      await definitionOutput.handle.write(`${JSON.stringify(definitionRow)}\n`);
      for (const parameter of definition.parameters) {
        await parameterOutput.handle.write(`${JSON.stringify({
          catalog_id: parameter.catalogId,
          parameter_id: parameter.parameterId,
          ordinal: parameter.ordinal,
          value_type: parameter.valueType,
          unit_id: parameter.unitId,
          title_ru: parameter.titleRu,
          required: parameter.required,
          default_value: parameter.defaultValue,
          constraints: parameter.constraints,
          parameter_hash: sha256(parameter),
        })}\n`);
        parameterCount += 1;
      }
      for (const resource of definition.resources) {
        const formula = formulaById.get(resource.formulaId);
        if (!formula) throw new Error(`AUDIT_TARGET_FORMULA_MISSING:${resource.catalogId}:${resource.formulaId}`);
        await rowOutput.handle.write(`${JSON.stringify(rowTarget(resource, formula))}\n`);
        rowCount += 1;
      }
    }
    await definitionOutput.finish();
    await parameterOutput.finish();
    await rowOutput.finish();
  } catch (error) {
    await Promise.allSettled([definitionOutput.handle.close(), parameterOutput.handle.close(), rowOutput.handle.close()]);
    throw error;
  }
  const files = ["A2_06_CLEAN_AUDIT_DEFINITIONS.jsonl", "A2_06_CLEAN_AUDIT_PARAMETERS.jsonl", "A2_06_CLEAN_AUDIT_ROWS.jsonl"];
  const artifacts: Json = {};
  for (const name of files) artifacts[name] = { bytes: statSync(join(EVIDENCE, name)).size, sha256: await hashFile(join(EVIDENCE, name)) };
  const productionSourceFiles = [
    "scripts/estimate/waterBackendR3/waterDomainModel.ts",
    "scripts/estimate/waterBackendR3/waterR5ProfessionalModel.ts",
    "scripts/estimate/waterBackendR3/waterOwnedFamilies.ts",
    "src/lib/estimate/backendPlatform/formulaGraph.ts",
  ];
  const sourceFiles = productionSourceFiles.map((path) => ({ path, sha256: sha256(readFileSync(join(ROOT, path))) }));
  const manifest = {
    schemaVersion: "water-r6-a2-clean-audit-target-manifest.v1",
    generatedAt,
    predecessor: PREDECESSOR,
    sourceHead: git("rev-parse", "HEAD"),
    sourceTree: git("rev-parse", "HEAD^{tree}"),
    worktreeDiffSha256: sha256(git("diff", "--binary")),
    contentVersion: WATER_BACKEND_CONTENT_VERSION,
    sourceFiles,
    sourceFingerprint: sha256(sourceFiles),
    actual: {
      definitions: definitions.length,
      globalDefinitions: definitions.filter((definition) => definition.work.namespace === "global").length,
      externalDefinitions: definitions.filter((definition) => definition.work.namespace === "external").length,
      parameters: parameterCount,
      formulas: rowCount,
      resources: rowCount,
    },
    artifacts,
    exporterIsOracle: false,
    status: definitions.length === 874 && parameterCount === 180_755 && rowCount === 232_011 ? "GREEN_AUDIT_TARGET_EXPORTED" : "RED",
  };
  const manifestPath = join(EVIDENCE, "A2_06_CLEAN_AUDIT_TARGET_MANIFEST.json");
  const temporaryManifest = `${manifestPath}.tmp-${process.pid}`;
  const manifestHandle = await open(temporaryManifest, "w");
  await manifestHandle.write(`${JSON.stringify(manifest, null, 2)}\n`);
  await manifestHandle.sync();
  await manifestHandle.close();
  rmSync(manifestPath, { force: true });
  renameSync(temporaryManifest, manifestPath);
  process.stdout.write(`${JSON.stringify({ ...manifest.actual, sourceFingerprint: manifest.sourceFingerprint, status: manifest.status })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
