import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { evaluateFormulaGraph, type FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md",
);
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const CANDIDATE_RELEASE_KEY = "p0-r58-cumulative-candidate-4cf42813";
const NO_AUTHORITATIVE_TRACE = process.argv.includes("--no-authoritative-trace");
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const MATRIX_PATH = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/05-baseline/R58_4272_REPAIR_MATRIX.jsonl",
);
const TRACE_PATH = resolve(
  ".release-runtime/p0-one-monolith-r57/evidence/05-baseline/BATCH001_008_ACCEPTED_RUNTIME_TRACE_INPUT_VALUES.jsonl",
);
const OUTPUT_PATH = resolve(".release-runtime/p0-one-monolith-r58/evidence/05-baseline",
  NO_AUTHORITATIVE_TRACE
    ? "R58_NO_AUTHORITATIVE_TRACE_COVERAGE_AUDIT.json"
    : "R58_PENDING_TRACE_COVERAGE_AUDIT.json");
const CONTRACT = NO_AUTHORITATIVE_TRACE
  ? "p0-one-monolith-r58-no-authoritative-trace-coverage-audit.v1"
  : "p0-one-monolith-r58-pending-trace-coverage-audit.v1";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function readJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function collectDeclaredParameterIds(value: unknown, output = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectDeclaredParameterIds(item, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;
  const object = value as Json;
  if (object.kind === "parameter" && typeof object.id === "string") output.add(object.id);
  if (typeof object.parameterId === "string") output.add(object.parameterId);
  if (Array.isArray(object.parameterSources)) {
    for (const id of object.parameterSources) if (typeof id === "string" && id.trim()) output.add(id);
  }
  for (const child of Object.values(object)) collectDeclaredParameterIds(child, output);
  return output;
}

function addValue(target: Map<string, Map<string, unknown>>, parameterId: string, value: unknown): void {
  if (!parameterId || value === undefined || value === null) return;
  const values = target.get(parameterId) ?? new Map<string, unknown>();
  values.set(stable(value), value);
  target.set(parameterId, values);
}

function groupsOf<T>(values: readonly T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) output.push(values.slice(index, index + size));
  return output;
}

function numeric(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function close(left: number, right: number): boolean {
  return Math.abs(left - right) <= Math.max(1e-7, Math.abs(right) * 1e-7);
}

function recoverLinearFormulaInputs(
  formulas: readonly Json[],
  resources: readonly Json[],
  values: Map<string, Map<string, unknown>>,
): { derived: Set<string>; conflicts: Set<string> } {
  const formulaById = new Map(formulas.map((formula) => [String(formula.formula_id), formula]));
  const derived = new Set<string>();
  const conflicts = new Set<string>();
  for (let pass = 0; pass < 10; pass += 1) {
    const proposals = new Map<string, number[]>();
    for (const resource of resources) {
      const expected = numeric(resource.accepted_quantity);
      if (expected == null) continue;
      const formula = formulaById.get(String(resource.formula_id));
      if (!formula) continue;
      const inputs = [...new Set((formula.input_parameter_ids ?? []).map(String))];
      const known: Record<string, number> = {};
      const missing: string[] = [];
      for (const id of inputs) {
        const entries = values.get(id);
        const value = entries?.size === 1 ? numeric([...entries.values()][0]) : undefined;
        if (value == null) missing.push(id);
        else known[id] = value;
      }
      if (missing.length !== 1) continue;
      const parameterId = missing[0];
      try {
        const evaluate = (candidate: number): number => Number(evaluateFormulaGraph(
          formula.ast as FormulaAst, { ...known, [parameterId]: candidate },
        ));
        const atOne = evaluate(1);
        const atTwo = evaluate(2);
        const atThree = evaluate(3);
        const slope = atTwo - atOne;
        if (![atOne, atTwo, atThree, slope].every(Number.isFinite) || close(slope, 0)
          || !close(atThree - atTwo, slope)) continue;
        const candidate = 1 + (expected - atOne) / slope;
        if (!Number.isFinite(candidate) || !close(evaluate(candidate), expected)) continue;
        proposals.set(parameterId, [...(proposals.get(parameterId) ?? []), candidate]);
      } catch {
        // Non-linear, conditional or otherwise non-invertible with this bounded proof.
      }
    }
    let changed = 0;
    for (const [parameterId, candidates] of proposals) {
      const first = candidates[0];
      if (!candidates.every((candidate) => close(candidate, first))) {
        conflicts.add(parameterId);
        continue;
      }
      const existing = values.get(parameterId);
      if (existing?.size === 1) {
        const current = numeric([...existing.values()][0]);
        if (current == null || !close(current, first)) conflicts.add(parameterId);
        continue;
      }
      addValue(values, parameterId, first);
      derived.add(parameterId);
      changed += 1;
    }
    if (changed === 0) break;
  }
  return { derived, conflicts };
}

async function main(): Promise<void> {
  invariant(process.argv.length === 2 || (process.argv.length === 3 && NO_AUTHORITATIVE_TRACE),
    "R58_PENDING_TRACE_AUDIT_USAGE_OPTIONAL_NO_AUTHORITATIVE_TRACE");
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R58_PENDING_TRACE_AUDIT_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === "codex/p0-one-monolith-r5", `R58_PENDING_TRACE_AUDIT_BRANCH_DRIFT:${branch}`);
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  const targets = readJsonl(MATRIX_PATH).filter((row) => NO_AUTHORITATIVE_TRACE
    ? row.partition === "NO_AUTHORITATIVE_TRACE_1286"
      && (row.domain === "concrete" || row.domain === "hvac_heat_supply")
    : row.partition === "TRACE_NOT_ADMITTED_1432"
      && (row.domain === "drywall" || row.domain === "hvac_heat_supply"));
  const expectedTargets = NO_AUTHORITATIVE_TRACE ? 1_286 : 1_394;
  invariant(targets.length === expectedTargets,
    `R58_PENDING_TRACE_AUDIT_TARGETS:${targets.length}/${expectedTargets}`);
  const targetByVersion = new Map(targets.map((row) => [String(row.definition_version_id), row]));
  const traceByCatalog = new Map(readJsonl(TRACE_PATH).map((row) => [String(row.catalog_id), row]));
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const candidate = (await client.query(
      "select id,status,sealed_at from public.estimate_definition_release where release_key=$1",
      [CANDIDATE_RELEASE_KEY],
    )).rows[0] as Json;
    invariant(candidate?.status === "draft" && candidate.sealed_at == null,
      "R58_PENDING_TRACE_AUDIT_CANDIDATE_NOT_DRAFT");
    const runtime = (await client.query(`
      select
        (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_total,
        (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1
          and baseline_ready and scenario_ready and approved_template_baseline_id is not null) ready,
        (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1
          and domain_id='asphalt' and baseline_ready and scenario_ready) asphalt_ready,
        (select count(*)::int from public.estimate_definition_version where release_id=$1) direct_definitions,
        (select id from public.estimate_definition_release where status='active') active_release_id,
        (select count(*)::int from public.estimate_definition_release where status='active') active_release_count,
        (select count(*)::int from public.estimate_revision) revision_count,
        (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1
          and upper(source_batch) like 'BATCH009%') batch009_rows,
        case when to_regclass('public.estimate_search_document') is null then 0
          else (select count(*)::int from public.estimate_search_document) end search_documents
    `, [candidate.id])).rows[0] as Json;
    invariant(runtime.manifest_total === 4_272 && runtime.ready === 3_054
      && runtime.asphalt_ready === 63 && runtime.direct_definitions === 2_793,
    `R58_PENDING_TRACE_AUDIT_CANDIDATE_COUNTS:${stable(runtime)}`);
    invariant(runtime.active_release_id === ACTIVE_RELEASE_ID && runtime.active_release_count === 1
      && runtime.batch009_rows === 0 && runtime.search_documents === 0,
    `R58_PENDING_TRACE_AUDIT_ACTIVE_INVARIANT:${stable(runtime)}`);

    const definitionAudits: Json[] = [];
    const missingProfiles = new Map<string, {
      definitions: Set<string>;
      valueTypes: Set<string>;
      units: Set<string>;
      titles: Set<string>;
      constraintVariants: Map<string, Json>;
      formulaExpressions: Set<string>;
    }>();
    for (const versionIds of groupsOf([...targetByVersion.keys()], 25)) {
      const parameters = (await client.query(`
        select definition_version_id,parameter_id,value_type,unit_id,title_ru,required,default_value,constraints_json
        from public.estimate_parameter_definition where definition_version_id=any($1::uuid[])
        order by definition_version_id,ordinal
      `, [versionIds])).rows as Json[];
      const formulas = (await client.query(`
        select definition_version_id,formula_id,input_parameter_ids,ast,expression_source
        from public.estimate_formula_graph where definition_version_id=any($1::uuid[])
      `, [versionIds])).rows as Json[];
      const resources = (await client.query(`
        select definition_version_id,row_id,formula_id,inclusion_ast,resource_graph,semantic_owner,cost_owner_id,
          procurement_eligible,source_metadata #>> '{priceStatus}' price_status,
          source_metadata #>> '{priceRoute}' price_route,
          source_metadata #> '{acceptedTrace,quantity}' accepted_quantity,
          source_metadata #> '{formula,inputParameterIds}' formula_input_parameter_ids,
          source_metadata #> '{ownerBoundary,handoff_inputs}' owner_handoff_parameter_ids
        from public.estimate_resource_spec where definition_version_id=any($1::uuid[])
      `, [versionIds])).rows as Json[];
      const acceptedValues = (await client.query(`
        select resource.definition_version_id,values.parameter_id,values.parameter_value
        from public.estimate_resource_spec resource
        cross join lateral jsonb_each(
          case when jsonb_typeof(resource.source_metadata #> '{acceptedTrace,source_parameters,formulaInputValues}')='object'
            then resource.source_metadata #> '{acceptedTrace,source_parameters,formulaInputValues}'
            else '{}'::jsonb end
        ) values(parameter_id,parameter_value)
        where resource.definition_version_id=any($1::uuid[])
        group by resource.definition_version_id,values.parameter_id,values.parameter_value
      `, [versionIds])).rows as Json[];

      const paramsByVersion = new Map<string, Json[]>();
      const formulasByVersion = new Map<string, Json[]>();
      const resourcesByVersion = new Map<string, Json[]>();
      const acceptedByVersion = new Map<string, Map<string, Map<string, unknown>>>();
      for (const parameter of parameters) {
        const key = String(parameter.definition_version_id);
        paramsByVersion.set(key, [...(paramsByVersion.get(key) ?? []), parameter]);
      }
      for (const formula of formulas) {
        const key = String(formula.definition_version_id);
        formulasByVersion.set(key, [...(formulasByVersion.get(key) ?? []), formula]);
      }
      for (const resource of resources) {
        const key = String(resource.definition_version_id);
        resourcesByVersion.set(key, [...(resourcesByVersion.get(key) ?? []), resource]);
      }
      for (const value of acceptedValues) {
        const key = String(value.definition_version_id);
        const collected = acceptedByVersion.get(key) ?? new Map<string, Map<string, unknown>>();
        addValue(collected, String(value.parameter_id), value.parameter_value);
        acceptedByVersion.set(key, collected);
      }

      for (const versionId of versionIds) {
        const target = targetByVersion.get(versionId)!;
        const definitionParameters = paramsByVersion.get(versionId) ?? [];
        const definitionFormulas = formulasByVersion.get(versionId) ?? [];
        const definitionResources = resourcesByVersion.get(versionId) ?? [];
        const used = new Set<string>();
        for (const formula of definitionFormulas) {
          for (const id of formula.input_parameter_ids ?? []) used.add(String(id));
        }
        for (const resource of definitionResources) {
          collectDeclaredParameterIds(resource.inclusion_ast, used);
          collectDeclaredParameterIds(resource.resource_graph, used);
          for (const values of [resource.formula_input_parameter_ids, resource.owner_handoff_parameter_ids]) {
            if (!Array.isArray(values)) continue;
            for (const id of values) if (typeof id === "string" && id.trim()) used.add(id);
          }
        }
        const rowsById = new Set(definitionResources.map((row) => String(row.row_id)));
        for (const parameter of definitionParameters) {
          if ((parameter.constraints_json?.consumers ?? []).some((rowId: unknown) => rowsById.has(String(rowId)))) {
            used.add(String(parameter.parameter_id));
          }
        }
        if (definitionParameters.some((row) => row.parameter_id === "estimate_scope_mode")) used.add("estimate_scope_mode");

        const values = acceptedByVersion.get(versionId) ?? new Map<string, Map<string, unknown>>();
        const external = traceByCatalog.get(String(target.catalog_id));
        for (const [parameterId, value] of Object.entries(external?.input_values ?? {})) {
          addValue(values, parameterId, value);
        }
        const recovery = recoverLinearFormulaInputs(definitionFormulas, definitionResources, values);
        const declared = new Set(definitionParameters.map((row) => String(row.parameter_id)));
        const usedDeclared = [...used].filter((id) => declared.has(id)).sort();
        const unused = [...declared].filter((id) => !used.has(id)).sort();
        const requiredUsed = definitionParameters.filter((row) => row.required && used.has(String(row.parameter_id)))
          .map((row) => String(row.parameter_id));
        const conflicts = usedDeclared.filter((id) => (values.get(id)?.size ?? 0) > 1
          || recovery.conflicts.has(id));
        const resolved = usedDeclared.filter((id) => values.get(id)?.size === 1);
        const missing = requiredUsed.filter((id) => !values.has(id));
        const valuesOutsideSchema = [...values.keys()].filter((id) => !declared.has(id)).sort();
        const semanticOwnerCounts = new Map<string, number>();
        const localCostOwnerCounts = new Map<string, number>();
        const childCostOwnerCounts = new Map<string, number>();
        for (const resource of definitionResources) {
          const owner = String(resource.semantic_owner ?? "").trim();
          semanticOwnerCounts.set(owner, (semanticOwnerCounts.get(owner) ?? 0) + 1);
          const costOwner = String(resource.cost_owner_id ?? "").trim();
          if (!costOwner) continue;
          const child = resource.price_status === "CHILD_OWNER" || resource.price_route === "CHILD_OWNER_ESTIMATE";
          const counts = child ? childCostOwnerCounts : localCostOwnerCounts;
          counts.set(costOwner, (counts.get(costOwner) ?? 0) + 1);
        }
        const semanticRepairRows = [...semanticOwnerCounts.entries()]
          .filter(([owner, count]) => !owner || count > 1).reduce((sum, [, count]) => sum + count, 0);
        const nullCostRows = definitionResources.filter((row) => !String(row.cost_owner_id ?? "").trim());
        const nullCostRouteCounts = new Map<string, number>();
        for (const resource of nullCostRows) {
          const route = `${resource.price_status ?? "NO_STATUS"}|${resource.price_route ?? "NO_ROUTE"}`;
          nullCostRouteCounts.set(route, (nullCostRouteCounts.get(route) ?? 0) + 1);
        }
        const parameterById = new Map(definitionParameters.map((row) => [String(row.parameter_id), row]));
        for (const parameterId of missing) {
          const parameter = parameterById.get(parameterId)!;
          const profile = missingProfiles.get(parameterId) ?? {
            definitions: new Set<string>(), valueTypes: new Set<string>(), units: new Set<string>(),
            titles: new Set<string>(), constraintVariants: new Map<string, Json>(), formulaExpressions: new Set<string>(),
          };
          profile.definitions.add(String(target.catalog_id));
          profile.valueTypes.add(String(parameter.value_type));
          if (parameter.unit_id) profile.units.add(String(parameter.unit_id));
          profile.titles.add(String(parameter.title_ru));
          profile.constraintVariants.set(sha256(parameter.constraints_json ?? {}), parameter.constraints_json ?? {});
          for (const formula of definitionFormulas) {
            if ((formula.input_parameter_ids ?? []).includes(parameterId) && profile.formulaExpressions.size < 10) {
              profile.formulaExpressions.add(String(formula.expression_source));
            }
          }
          missingProfiles.set(parameterId, profile);
        }
        definitionAudits.push({
          catalogId: target.catalog_id,
          definitionVersionId: versionId,
          domain: target.domain,
          parameters: definitionParameters.length,
          used: usedDeclared.length,
          unused: unused.length,
          requiredUsed: requiredUsed.length,
          resolved: resolved.length,
          missing: missing.length,
          conflicts: conflicts.length,
          resources: definitionResources.length,
          semanticRepairRows,
          localDuplicateCostGroups: [...localCostOwnerCounts.values()].filter((count) => count > 1).length,
          childCostBoundaryGroups: [...childCostOwnerCounts.values()].filter((count) => count > 1).length,
          nullCostRows: nullCostRows.length,
          nullCostProcurementRows: nullCostRows.filter((row) => row.procurement_eligible).length,
          nullCostRouteCounts: Object.fromEntries([...nullCostRouteCounts.entries()].sort()),
          derivedFromAcceptedQuantity: recovery.derived.size,
          acceptedRowValues: [...values.values()].filter((entry) => entry.size === 1).length,
          externalTracePresent: Boolean(external),
          missingParameterIds: missing,
          conflictParameterIds: conflicts,
          unusedParameterIds: unused,
          valuesOutsideSchema,
        });
      }
    }

    const aggregate = (rows: Json[]): Json => ({
      definitions: rows.length,
      parameters: rows.reduce((sum, row) => sum + row.parameters, 0),
      used: rows.reduce((sum, row) => sum + row.used, 0),
      unused: rows.reduce((sum, row) => sum + row.unused, 0),
      requiredUsed: rows.reduce((sum, row) => sum + row.requiredUsed, 0),
      resolved: rows.reduce((sum, row) => sum + row.resolved, 0),
      missing: rows.reduce((sum, row) => sum + row.missing, 0),
      conflicts: rows.reduce((sum, row) => sum + row.conflicts, 0),
      resources: rows.reduce((sum, row) => sum + row.resources, 0),
      semanticRepairRows: rows.reduce((sum, row) => sum + row.semanticRepairRows, 0),
      localDuplicateCostGroups: rows.reduce((sum, row) => sum + row.localDuplicateCostGroups, 0),
      childCostBoundaryGroups: rows.reduce((sum, row) => sum + row.childCostBoundaryGroups, 0),
      nullCostRows: rows.reduce((sum, row) => sum + row.nullCostRows, 0),
      nullCostProcurementRows: rows.reduce((sum, row) => sum + row.nullCostProcurementRows, 0),
      nullCostRouteCounts: rows.reduce((output: Json, row) => {
        for (const [route, count] of Object.entries(row.nullCostRouteCounts ?? {})) {
          output[route] = Number(output[route] ?? 0) + Number(count);
        }
        return output;
      }, {}),
      derivedFromAcceptedQuantity: rows.reduce((sum, row) => sum + row.derivedFromAcceptedQuantity, 0),
      externalTraceDefinitions: rows.filter((row) => row.externalTracePresent).length,
    });
    const missingFrequency = new Map<string, number>();
    for (const row of definitionAudits) {
      for (const id of row.missingParameterIds) missingFrequency.set(id, (missingFrequency.get(id) ?? 0) + 1);
    }
    const report = {
      status: "GREEN_READ_ONLY_AUDIT",
      contract: CONTRACT,
      specSha256: SPEC_SHA256,
      head,
      tree,
      candidateReleaseId: candidate.id,
      runtime,
      aggregate: aggregate(definitionAudits),
      byDomain: Object.fromEntries((NO_AUTHORITATIVE_TRACE
        ? ["concrete", "hvac_heat_supply"] : ["drywall", "hvac_heat_supply"]).map((domain) => [
        domain, aggregate(definitionAudits.filter((row) => row.domain === domain)),
      ])),
      missingFrequency: [...missingFrequency.entries()].sort((left, right) => right[1] - left[1]
        || left[0].localeCompare(right[0])).map(([parameterId, definitions]) => ({ parameterId, definitions })),
      missingProfiles: [...missingProfiles.entries()].sort((left, right) => left[0].localeCompare(right[0]))
        .map(([parameterId, profile]) => ({
          parameterId,
          definitions: profile.definitions.size,
          valueTypes: [...profile.valueTypes].sort(),
          units: [...profile.units].sort(),
          titles: [...profile.titles].sort().slice(0, 10),
          constraintVariants: [...profile.constraintVariants.entries()].slice(0, 10)
            .map(([constraintsSha256, constraints]) => ({ constraintsSha256, constraints })),
          formulaExpressions: [...profile.formulaExpressions].sort(),
        })),
      definitions: definitionAudits,
    };
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({
      status: report.status,
      candidateReleaseId: candidate.id,
      runtime,
      aggregate: report.aggregate,
      byDomain: report.byDomain,
      topMissing: report.missingFrequency.slice(0, 30),
      evidencePath: OUTPUT_PATH,
      evidenceSha256: sha256File(OUTPUT_PATH),
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
