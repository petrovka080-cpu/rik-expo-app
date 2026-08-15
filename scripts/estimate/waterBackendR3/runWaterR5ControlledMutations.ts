import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { buildWaterBackendDefinitions, type JsonRecord, type WaterDefinition } from "./waterDomainModel";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a2");

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertDefinition(definition: WaterDefinition): void {
  const complexity = String((definition.work.passport.professionalObligations as JsonRecord).complexityClass);
  const minimum: Readonly<Record<string, number>> = { L1: 20, L2: 70, L3: 200, L4: 400, L5: 700 };
  if (definition.resources.length < minimum[complexity]) throw new Error("DEPTH");
  if (definition.formulas.length !== definition.resources.length) throw new Error("FORMULA_CARDINALITY");
  if (new Set(definition.resources.map((row) => row.rowId)).size !== definition.resources.length) throw new Error("DUPLICATE_ROW");
  if (new Set(definition.resources.map((row) => row.semanticOwner)).size !== definition.resources.length) throw new Error("DUPLICATE_OWNER");
  const parameters = new Set(definition.parameters.map((parameter) => parameter.parameterId));
  const formulaById = new Map(definition.formulas.map((formula) => [formula.formulaId, formula]));
  for (const parameter of definition.parameters) {
    const constraints = parameter.constraints;
    if (["decimal", "integer"].includes(parameter.valueType) && parameter.defaultValue != null) throw new Error("HIDDEN_DEFAULT");
    if (constraints.hiddenEngineeringDefault !== false) throw new Error("ENGINEERING_POLICY");
  }
  for (const row of definition.resources) {
    const formula = formulaById.get(row.formulaId);
    if (!formula) throw new Error("FORMULA_REFERENCE");
    if (formula.ast.kind === "literal" || /(?:^|\s)[*/]\s*0?\.\d+|\/\s*100(?:\s|$)/.test(formula.expressionSource)) throw new Error("ARBITRARY_LITERAL");
    if (formula.inputParameterIds.some((id) => !parameters.has(id))) throw new Error("UNKNOWN_PARAMETER");
    if (!/^(water:|typed-child:)/.test(row.semanticOwner)) throw new Error("OWNER");
    const graph = row.resourceGraph as JsonRecord;
    if (!graph.componentKey || !graph.actionKey) throw new Error("OBLIGATION_IDENTITY");
    if (!["WATER_BACKEND_OWNER_EXCLUSIVE", "TYPED_CHILD_SCOPE_TRANSFER_NO_COST_DUPLICATION"].includes(String(graph.parentChildDoubleCountGuard))) throw new Error("DOUBLE_COUNT_GUARD");
    const metadata = row.sourceMetadata as JsonRecord;
    if (metadata.paddingRow !== false || metadata.miscellaneousPercentageRow !== false) throw new Error("PADDING_OR_MISC");
    const trace = metadata.normativeTrace;
    if (!Array.isArray(trace) || !trace.some((item) => {
      const locator = String((item as JsonRecord).locator ?? "");
      return String((item as JsonRecord).source_role) === "EXACT_RESOURCE_OR_OPERATION_LOCATOR"
        && (/table:\d{2}-\d{2}-\d{3}/.test(locator) || /collection:09/.test(locator));
    })) throw new Error("NORMATIVE_LOCATOR");
    const price = metadata.priceRoute as JsonRecord;
    if (!price?.sourceId || !price?.artifactSha256 || price.hiddenPriceDefault !== false) throw new Error("PRICE_ROUTE");
    if (/проч(?:ее|ие)|miscellaneous|padding/i.test(row.titleRu)) throw new Error("MISC_TITLE");
  }
}

type Mutator = { id: string; expected: string; mutate: (definition: WaterDefinition) => WaterDefinition };

function replaceFirstResource(definition: WaterDefinition, mutate: (row: WaterDefinition["resources"][number]) => WaterDefinition["resources"][number]): WaterDefinition {
  return { ...definition, resources: [mutate(definition.resources[0]), ...definition.resources.slice(1)] };
}

const MUTATORS: readonly Mutator[] = [
  { id: "REMOVE_RESOURCE", expected: "FORMULA_CARDINALITY", mutate: (d) => ({ ...d, resources: d.resources.slice(1) }) },
  { id: "REMOVE_FORMULA", expected: "FORMULA_CARDINALITY", mutate: (d) => ({ ...d, formulas: d.formulas.slice(1) }) },
  { id: "DUPLICATE_ROW_ID", expected: "DUPLICATE_ROW", mutate: (d) => ({ ...d, resources: [d.resources[0], { ...d.resources[1], rowId: d.resources[0].rowId }, ...d.resources.slice(2)] }) },
  { id: "DUPLICATE_OWNER", expected: "DUPLICATE_OWNER", mutate: (d) => ({ ...d, resources: [d.resources[0], { ...d.resources[1], semanticOwner: d.resources[0].semanticOwner }, ...d.resources.slice(2)] }) },
  { id: "BROKEN_FORMULA_REFERENCE", expected: "FORMULA_REFERENCE", mutate: (d) => replaceFirstResource(d, (row) => ({ ...row, formulaId: "missing:formula" })) },
  { id: "UNKNOWN_FORMULA_PARAMETER", expected: "UNKNOWN_PARAMETER", mutate: (d) => ({ ...d, formulas: [{ ...d.formulas[0], inputParameterIds: [...d.formulas[0].inputParameterIds, "fabricated_parameter"] }, ...d.formulas.slice(1)] }) },
  { id: "HIDDEN_NUMERIC_DEFAULT", expected: "HIDDEN_DEFAULT", mutate: (d) => ({ ...d, parameters: [{ ...d.parameters.find((p) => p.valueType === "decimal")!, defaultValue: 1 }, ...d.parameters.filter((p) => p !== d.parameters.find((x) => x.valueType === "decimal"))] }) },
  { id: "ENGINEERING_POLICY_REMOVED", expected: "ENGINEERING_POLICY", mutate: (d) => ({ ...d, parameters: [{ ...d.parameters[0], constraints: { ...d.parameters[0].constraints, hiddenEngineeringDefault: true } }, ...d.parameters.slice(1)] }) },
  { id: "PADDING_ROW", expected: "PADDING_OR_MISC", mutate: (d) => replaceFirstResource(d, (row) => ({ ...row, sourceMetadata: { ...row.sourceMetadata, paddingRow: true } })) },
  { id: "MISC_PERCENTAGE_ROW", expected: "PADDING_OR_MISC", mutate: (d) => replaceFirstResource(d, (row) => ({ ...row, sourceMetadata: { ...row.sourceMetadata, miscellaneousPercentageRow: true } })) },
  { id: "MISC_TITLE", expected: "MISC_TITLE", mutate: (d) => replaceFirstResource(d, (row) => ({ ...row, titleRu: "Прочее" })) },
  { id: "NORMATIVE_TRACE_REMOVED", expected: "NORMATIVE_LOCATOR", mutate: (d) => replaceFirstResource(d, (row) => ({ ...row, sourceMetadata: { ...row.sourceMetadata, normativeTrace: [] } })) },
  { id: "PRICE_ROUTE_HIDDEN", expected: "PRICE_ROUTE", mutate: (d) => replaceFirstResource(d, (row) => ({ ...row, sourceMetadata: { ...row.sourceMetadata, priceRoute: { ...row.sourceMetadata.priceRoute as JsonRecord, hiddenPriceDefault: true } } })) },
  { id: "SEMANTIC_OWNER_INVALID", expected: "OWNER", mutate: (d) => replaceFirstResource(d, (row) => ({ ...row, semanticOwner: "frontend:water" })) },
  { id: "DOUBLE_COUNT_GUARD_REMOVED", expected: "DOUBLE_COUNT_GUARD", mutate: (d) => replaceFirstResource(d, (row) => ({ ...row, resourceGraph: { ...row.resourceGraph, parentChildDoubleCountGuard: null } })) },
  { id: "OBLIGATION_COMPONENT_REMOVED", expected: "OBLIGATION_IDENTITY", mutate: (d) => replaceFirstResource(d, (row) => ({ ...row, resourceGraph: { ...row.resourceGraph, componentKey: "" } })) },
];

function main(): void {
  mkdirSync(EVIDENCE, { recursive: true });
  const definitions = buildWaterBackendDefinitions();
  const global = definitions.filter((definition) => definition.work.namespace === "global");
  const external = definitions.filter((definition) => definition.work.namespace === "external");
  const representatives = [
    ...global.filter((definition) => String((definition.work.passport.professionalObligations as JsonRecord).complexityClass) === "L1").slice(0, 4),
    ...global.filter((definition) => String((definition.work.passport.professionalObligations as JsonRecord).complexityClass) === "L2").slice(0, 4),
    ...global.filter((definition) => String((definition.work.passport.professionalObligations as JsonRecord).complexityClass) === "L3").slice(0, 4),
    ...global.filter((definition) => String((definition.work.passport.professionalObligations as JsonRecord).complexityClass) === "L4").slice(0, 4),
    ...global.filter((definition) => String((definition.work.passport.professionalObligations as JsonRecord).complexityClass) === "L5").slice(0, 2),
    ...external.slice(0, 10),
  ];
  const requiredMutations = Math.max(400, Math.ceil(definitions.length * 0.5));
  if (representatives.length !== 28 || MUTATORS.length !== 16
    || representatives.length * MUTATORS.length < requiredMutations) throw new Error("WATER_R6_A2_MUTATION_MATRIX_SHAPE_RED");
  const results: JsonRecord[] = [];
  for (const definition of representatives) {
    assertDefinition(definition);
    for (const mutator of MUTATORS) {
      let killed = false;
      let rejection = "SURVIVED";
      try {
        assertDefinition(mutator.mutate(definition));
      } catch (error) {
        rejection = error instanceof Error ? error.message : String(error);
        killed = rejection === mutator.expected;
      }
      results.push({
        mutation_id: `${definition.work.catalogId}:${mutator.id}`,
        catalog_id: definition.work.catalogId,
        complexity_class: (definition.work.passport.professionalObligations as JsonRecord).complexityClass,
        mutator: mutator.id,
        expected_rejection: mutator.expected,
        actual_rejection: rejection,
        killed,
        status: killed ? "GREEN" : "RED",
      });
    }
  }
  const killed = results.filter((result) => result.killed === true).length;
  const report = {
    schemaVersion: "water-r6-a2-controlled-mutation-report.v1",
    representativeDefinitions: representatives.map((definition) => definition.work.catalogId),
    representativeNamespaces: {
      global: representatives.filter((definition) => definition.work.namespace === "global").length,
      external: representatives.filter((definition) => definition.work.namespace === "external").length,
    },
    mutationClasses: MUTATORS.map((mutator) => mutator.id),
    minimumRequired: requiredMutations,
    expected: representatives.length * MUTATORS.length,
    executed: results.length,
    killed,
    survived: results.length - killed,
    matrixSha256: sha256(results),
    status: results.length >= requiredMutations && killed === results.length ? "GREEN" : "RED",
  };
  writeFileSync(join(EVIDENCE, "A2_12_CONTROLLED_MUTATIONS.jsonl"), `${results.map((result) => JSON.stringify(result)).join("\n")}\n`, "utf8");
  writeFileSync(join(EVIDENCE, "A2_12_CONTROLLED_MUTATION_REPORT.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (report.status !== "GREEN") throw new Error(`WATER_R6_A2_MUTATIONS_RED:${JSON.stringify(report)}`);
}

main();
