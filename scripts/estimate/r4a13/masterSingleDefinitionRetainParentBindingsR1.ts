// WORK PROPOSAL R2 ONLY; extends frozen R1 without editing it. No writer/API.
import { createHash } from "node:crypto";
import type { Client } from "pg";
import { canonicalDefinitionPublicationStableValueR1 as stable } from
  "../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1";

import { planCanonicalEffectiveResourceQuantitiesV1 } from
  "../../../src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1";

type Json = Record<string, any>;
type QueryClient = Pick<Client, "query">;
export type MasterRetainedParentCaptureR1 = Readonly<{
  definition: Json; baseline: Json; parameters: readonly Json[]; formulas: readonly Json[]; resources: readonly Json[];
  bindings: readonly Json[]; normativeSources: readonly Json[]; normativeLocators: readonly Json[];
}>;
export type MasterRetainParentBindingsR1 = Readonly<{
  capturedParent: MasterRetainedParentCaptureR1;
  capturedParentSha256: string;
  /** Exact keys: ONLY newly declared parameter IDs, including unresolved []. */
  newParameterSources: Readonly<Record<string, Readonly<{
    kind: "KNOWN" | "DERIVED" | "UNRESOLVED"; sourceIds: readonly string[];
  }>>>;
}>;
export type MasterRetainedBindingGuardInputR1 = Readonly<{
  config: Readonly<{
    stopCode: string; catalogId: string; parentReleaseId: string; catalogAppend?: unknown;
    binding: Readonly<{ retainParentBindings?: MasterRetainParentBindingsR1 }>;
  }>;
  /** Full managed source row: every DDL column EXCEPT server-created created_at. */
  newSource: Json;
  /** Exact complete locator rows (DDL has no generated timestamp). */
  newLocators: readonly Json[];
}>;
export type MasterRetainedBindingSnapshotR1 = Readonly<{
  membership: readonly Json[]; capture: MasterRetainedParentCaptureR1;
  newSources: readonly Json[]; newLocators: readonly Json[];
}>;
function fail(input: MasterRetainedBindingGuardInputR1, suffix: string): never {
  throw new Error(`STOP_${input.config.stopCode}_RETAIN_${suffix}`);
}
function requireThat(value: unknown, input: MasterRetainedBindingGuardInputR1,
  suffix: string): asserts value { if (!value) fail(input, suffix); }
function object(value: unknown): value is Json {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function normalized(value: unknown): any { return JSON.parse(JSON.stringify(value)); }
function encoded(value: unknown): string { return JSON.stringify(stable(normalized(value))); }
function same(left: unknown, right: unknown): boolean { return encoded(left) === encoded(right); }
function records(rows: readonly Json[]): Json[] {
  return [...rows].map(row => normalized(row)).sort((a, b) => {
    const x = encoded(a), y = encoded(b); return x < y ? -1 : x > y ? 1 : 0;
  });
}
function setOf(values: readonly string[]): string[] { return [...new Set(values)].sort(); }
function exactKeys(value: Json, keys: readonly string[]): boolean {
  return same(Object.keys(value).sort(), [...keys].sort());
}
function captureValue(capture: MasterRetainedParentCaptureR1): Json {
  return { definition: capture.definition, baseline: capture.baseline,
    parameters: records(capture.parameters), formulas: records(capture.formulas), resources: records(capture.resources),
    bindings: records(capture.bindings), normativeSources: records(capture.normativeSources),
    normativeLocators: records(capture.normativeLocators) };
}
export function masterRetainedParentCaptureSha256R1(capture: MasterRetainedParentCaptureR1): string {
  return createHash("sha256").update(encoded(captureValue(capture))).digest("hex");
}
/** An omitted property is the ONLY fallback. Present undefined/null is not omission. */
export function masterRetainParentBindingsOptInR1(
  input: MasterRetainedBindingGuardInputR1,
): MasterRetainParentBindingsR1 | null {
  if (!Object.prototype.hasOwnProperty.call(input.config.binding, "retainParentBindings")) return null;
  const value = input.config.binding.retainParentBindings;
  requireThat(object(value), input, "OPT_IN_OBJECT_REQUIRED");
  requireThat(input.config.catalogAppend == null, input, "REPLACE_ONLY");
  requireThat(object(value.capturedParent) && typeof value.capturedParentSha256 === "string"
    && /^[0-9a-f]{64}$/u.test(value.capturedParentSha256), input, "CAPTURE_REQUIRED");
  const c = value.capturedParent;
  requireThat(object(c.definition) && object(c.baseline) && [c.parameters, c.formulas, c.resources, c.bindings,
    c.normativeSources, c.normativeLocators].every(Array.isArray), input, "CAPTURE_SHAPE");
  requireThat(masterRetainedParentCaptureSha256R1(c) === value.capturedParentSha256,
    input, "CAPTURE_SHA256");
  requireThat(c.definition.catalog_id === input.config.catalogId
    && /^[0-9a-f]{64}$/u.test(c.definition.definition_sha256)
    && c.baseline.catalog_id === input.config.catalogId
    && c.baseline.definition_version_id === c.definition.id, input, "CAPTURE_ANCHOR");
  const unique = (rows: readonly Json[], key: (row: Json) => string, suffix: string) => {
    requireThat(rows.every(object), input, suffix);
    const keys = rows.map(key);
    requireThat(keys.every(k => k.length > 0) && new Set(keys).size === keys.length, input, suffix);
  };
  unique(c.parameters, p => String(p.parameter_id ?? ""), "CAPTURE_PARAMETERS");
  unique(c.formulas, f => String(f.formula_id ?? ""), "CAPTURE_FORMULA_IDS");
  unique(c.resources, r => String(r.id ?? ""), "CAPTURE_RESOURCE_IDS");
  unique(c.resources, r => String(r.row_id ?? ""), "CAPTURE_ROW_IDS");
  unique(c.bindings, b => `${b.resource_spec_id}/${b.locator_id}`, "CAPTURE_BINDING_DUPLICATES");
  unique(c.normativeSources, s => String(s.id ?? ""), "CAPTURE_SOURCE_IDS");
  unique(c.normativeSources, s => String(s.source_key ?? ""), "CAPTURE_SOURCE_KEYS");
  unique(c.normativeLocators, l => String(l.id ?? ""), "CAPTURE_LOCATOR_IDS");
  const resources = new Set(c.resources.map(r => r.id));
  const formulas = new Set(c.formulas.map(f => f.formula_id));
  const locators = new Map(c.normativeLocators.map(l => [l.id, l]));
  const sources = new Set(c.normativeSources.map(s => s.id));
  requireThat(c.parameters.every(p => p.definition_version_id === c.definition.id)
    && c.formulas.every(f => f.definition_version_id === c.definition.id)
    && c.resources.every(r => r.definition_version_id === c.definition.id && formulas.has(r.formula_id))
    && c.bindings.every(b => b.definition_version_id === c.definition.id && resources.has(b.resource_spec_id)
      && locators.has(b.locator_id) && object(b.applicability))
    && c.normativeLocators.every(l => sources.has(l.source_id)), input, "CAPTURE_REFERENCE_CLOSURE");
  requireThat(object(c.baseline.normative_source_ids)
    && exactKeys(c.baseline.normative_source_ids, c.parameters.map(p => p.parameter_id)),
    input, "CAPTURE_BASELINE_SOURCE_KEYS");
  const sourceKeys = c.normativeSources.map(s => s.source_key);
  const baselineSources = Object.values(c.baseline.normative_source_ids);
  requireThat(baselineSources.every(v => Array.isArray(v) && v.every(s => sourceKeys.includes(s))
    && new Set(v).size === v.length), input, "CAPTURE_BASELINE_SOURCE_CLOSURE");
  const referencedLocators = setOf(c.bindings.map(b => String(b.locator_id)));
  requireThat(same(referencedLocators, c.normativeLocators.map(l => String(l.id)).sort()),
    input, "CAPTURE_LOCATOR_CLOSURE");
  const referencedSources = setOf([
    ...c.normativeLocators.map(l => String(l.source_id)),
    ...c.normativeSources.filter(s => baselineSources.some(ids => (ids as string[]).includes(s.source_key)))
      .map(s => String(s.id)),
  ]);
  requireThat(same(referencedSources, c.normativeSources.map(s => String(s.id)).sort()),
    input, "CAPTURE_SOURCE_CLOSURE");
  requireThat(object(value.newParameterSources), input, "NEW_PARAMETER_SOURCE_MAP_REQUIRED");
  requireThat(object(input.newSource) && exactKeys(input.newSource, ["id", "source_key", "title_ru",
    "authority", "official_url", "artifact_sha256", "effective_from", "effective_to", "metadata"])
    && object(input.newSource.metadata) && typeof input.newSource.id === "string"
    && typeof input.newSource.source_key === "string" && input.newSource.source_key.length > 0
    && !sources.has(input.newSource.id) && !sourceKeys.includes(input.newSource.source_key),
    input, "NEW_SOURCE_MUST_BE_DISTINCT_COMPLETE_ROW");
  requireThat(Array.isArray(input.newLocators) && input.newLocators.length > 0
    && input.newLocators.every(l => object(l) && exactKeys(l,
      ["id", "source_id", "locator_key", "locator", "excerpt_sha256"])
      && l.source_id === input.newSource.id && !locators.has(l.id) && object(l.locator)),
    input, "NEW_LOCATOR_DISTINCT_COMPLETE_ROWS");
  unique(input.newLocators, l => String(l.id ?? ""), "NEW_LOCATOR_IDS");
  unique(input.newLocators, l => String(l.locator_key ?? ""), "NEW_LOCATOR_KEYS");
  return value;
}
function required(input: MasterRetainedBindingGuardInputR1): MasterRetainParentBindingsR1 {
  const opt = masterRetainParentBindingsOptInR1(input);
  requireThat(opt != null, input, "EXPLICIT_OPT_IN_REQUIRED"); return opt;
}
/** Call this at normal preflight, and again immediately after table locks before DML. */
export function assertMasterRetainedBindingSnapshotR1(
  input: MasterRetainedBindingGuardInputR1, actual: MasterRetainedBindingSnapshotR1,
): void {
  const c = required(input).capturedParent;
  requireThat(same(actual.membership, [{release_id: input.config.parentReleaseId,
    catalog_id: input.config.catalogId, definition_version_id: c.definition.id,
    approved_template_baseline_id: c.baseline.id, definition_hash: c.definition.definition_sha256}]),
    input, "MANIFEST_ANCHOR_DRIFT");
  requireThat(same(captureValue(actual.capture), captureValue(c)), input, "PARENT_FULL_CAPTURE_DRIFT");
  requireThat(Array.isArray(actual.newSources) && actual.newSources.length <= 1,
    input, "NEW_SOURCE_ID_OR_KEY_COLLISION");
  if (actual.newSources.length === 1) {
    const {created_at: _serverTimestamp, ...managed} = actual.newSources[0];
    requireThat(same(managed, input.newSource), input, "NEW_SOURCE_NOT_EXACT");
  }
  requireThat(Array.isArray(actual.newLocators), input, "NEW_LOCATOR_SNAPSHOT_REQUIRED");
  requireThat(actual.newSources.length === 1 || actual.newLocators.length === 0,
    input, "NEW_LOCATOR_WITHOUT_SOURCE");
  const newById = new Map(input.newLocators.map(l => [l.id, l]));
  const observedIds = new Set<string>();
  for (const locator of actual.newLocators) {
    requireThat(newById.has(locator.id) && !observedIds.has(locator.id)
      && same(locator, newById.get(locator.id)), input, "NEW_LOCATOR_NOT_EXACT");
    observedIds.add(locator.id);
  }
}
export function assertMasterRetainedBindingPreflightUnchangedR1(
  input: MasterRetainedBindingGuardInputR1, before: MasterRetainedBindingSnapshotR1,
  locked: MasterRetainedBindingSnapshotR1,
): void {
  assertMasterRetainedBindingSnapshotR1(input, before);
  assertMasterRetainedBindingSnapshotR1(input, locked);
  const value = (s: MasterRetainedBindingSnapshotR1) => ({membership: records(s.membership),
    capture: captureValue(s.capture), newSources: records(s.newSources), newLocators: records(s.newLocators)});
  requireThat(same(value(before), value(locked)), input, "PREFLIGHT_CHANGED_BEFORE_DML");
}
/** No writes. Table locks, not advisory/row locks alone, exclude a phantom19th/9th binding. */
export async function lockMasterRetainedBindingPreconditionsR1(
  client: QueryClient, input: MasterRetainedBindingGuardInputR1,
): Promise<void> {
  const c = required(input).capturedParent;
  const isolation = await client.query("show transaction_isolation");
  requireThat(isolation.rows[0]?.transaction_isolation === "read committed", input,
    "LOCKED_REREAD_REQUIRES_READ_COMMITTED");
  const keys = setOf([`definition:${c.definition.id}`, `source-key:${input.newSource.source_key}`,
    ...c.normativeSources.map(s => `source-key:${s.source_key}`)]);
  for (const key of keys) await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",
    [`master-single-definition-retain:v1:${key}`]);
  await client.query(`lock table
    public.estimate_cumulative_manifest_entry,
    public.estimate_definition_release,
    public.estimate_definition_version,
    public.estimate_normative_locator,
    public.estimate_normative_source,
    public.estimate_formula_graph,
    public.estimate_approved_template_baseline,
    public.estimate_parameter_definition,
    public.estimate_resource_spec,
    public.estimate_work_normative_binding
    in share row exclusive mode`);
}
/** Raw row_to_json text prevents PG Date conversion from changing captured microseconds. */
export async function readMasterRetainedBindingPreconditionsR1(
  client: QueryClient, input: MasterRetainedBindingGuardInputR1,
): Promise<MasterRetainedBindingSnapshotR1> {
  const c = required(input).capturedParent;
  const read = async (sql: string, values: unknown[], cap: number): Promise<Json[]> => {
    const result = await client.query(sql, values);
    requireThat(result.rows.length <= cap, input, "READ_CAP");
    return result.rows.map(row => {
      requireThat(typeof row.raw === "string", input, "RAW_JSON_REQUIRED");
      const parsed: unknown = JSON.parse(row.raw);
      requireThat(object(parsed), input, "RAW_OBJECT_REQUIRED"); return parsed;
    });
  };
  const membership = await read(`select row_to_json(t)::text raw from (
    select release_id,catalog_id,definition_version_id,approved_template_baseline_id,definition_hash
    from public.estimate_cumulative_manifest_entry where release_id=$1 and catalog_id=$2 limit 2)t`,
    [input.config.parentReleaseId, input.config.catalogId], 1);
  const full = async (table: string, predicate: string, values: unknown[], cap: number) =>
    read(`select row_to_json(t)::text raw from (select * from public.${table}
      where ${predicate} limit ${cap + 1})t`, values, cap);
  const definition = await full("estimate_definition_version", "id=$1", [c.definition.id], 1);
  const baseline = await full("estimate_approved_template_baseline", "id=$1 and definition_version_id=$2",
    [c.baseline.id, c.definition.id], 1);
  requireThat(definition.length === 1 && baseline.length === 1, input, "PARENT_MISSING");
  const parameters = await full("estimate_parameter_definition", "definition_version_id=$1",
    [c.definition.id], c.parameters.length);
  const formulas = await full("estimate_formula_graph", "definition_version_id=$1",
    [c.definition.id], c.formulas.length);
  const resources = await full("estimate_resource_spec", "definition_version_id=$1",
    [c.definition.id], c.resources.length);
  const bindings = await full("estimate_work_normative_binding", "definition_version_id=$1",
    [c.definition.id], c.bindings.length);
  const normativeLocators = await full("estimate_normative_locator", `id=any($1::uuid[]) or id in (
    select locator_id from public.estimate_work_normative_binding where definition_version_id=$2)`,
    [c.normativeLocators.map(l => l.id), c.definition.id], c.normativeLocators.length);
  const normativeSources = await full("estimate_normative_source", `id=any($1::uuid[])
    or source_key=any($2::text[]) or id in (select source_id from public.estimate_normative_locator
      where id in(select locator_id from public.estimate_work_normative_binding where definition_version_id=$3))`,
    [c.normativeSources.map(s => s.id), c.normativeSources.map(s => s.source_key), c.definition.id], c.normativeSources.length);
  const newSources = await full("estimate_normative_source", "id=$1 or source_key=$2",
    [input.newSource.id, input.newSource.source_key], 1);
  const newLocators = await full("estimate_normative_locator", "id=any($1::uuid[]) or source_id=$2",
    [input.newLocators.map(l => l.id), input.newSource.id], input.newLocators.length);
  const snapshot = {membership, capture: {definition: definition[0], baseline: baseline[0], parameters, formulas,
    resources, bindings, normativeSources, normativeLocators}, newSources, newLocators};
  assertMasterRetainedBindingSnapshotR1(input, snapshot); return snapshot;
}
type Computation = Readonly<{
  parameters: readonly Json[]; formulas: readonly Json[]; resources: readonly Json[];
}>;
function formulaValue(row: Json, phase: "REPRESENTATIVE" | "PLAN"): Json {
  if (phase === "REPRESENTATIVE") return normalized(row);
  // Only the new definition FK and DB-created timestamp may differ on clone.
  const {definition_version_id: _definition, created_at: _created, ...semantic} = row;
  return semantic;
}
function paymentValue(row: Json): Json {
  return Object.fromEntries(["unit_id", "formula_id", "category", "row_type", "cost_owner_id",
    "semantic_owner", "procurement_eligible", "source_metadata"].map(key => [key, row[key]]).concat([
      ["resource_graph.costTreatment", row.resource_graph?.costTreatment],
    ]));
}
/** A retained locator must remain attached to the SAME physical arithmetic,
 * unit, owner and payment. Gates/input refs may grow; they are not a new norm. */
export function assertMasterRetainedParentComputationR1(
  input: MasterRetainedBindingGuardInputR1, next: Computation,
  phase: "REPRESENTATIVE" | "PLAN",
): void {
  const c = required(input).capturedParent;
  requireThat(Array.isArray(next.formulas), input, "NEXT_FORMULAS_REQUIRED");
  const formulaIds = next.formulas.map(f => f.formula_id);
  requireThat(formulaIds.every(id => typeof id === "string" && id.length > 0)
    && new Set(formulaIds).size === formulaIds.length, input, "NEXT_FORMULA_IDS");
  const formulas = new Map(next.formulas.map(f => [f.formula_id, f]));
  for (const old of c.formulas) {
    const actual = formulas.get(old.formula_id);
    requireThat(actual != null && same(formulaValue(old, phase), formulaValue(actual, phase)),
      input, "OLD_FORMULA_SEMANTICS_DRIFT");
  }
  requireThat(Array.isArray(next.resources) && Array.isArray(next.parameters), input, "NEXT_COMPUTATION_REQUIRED");
  const rows = next.resources.map(r => r.row_id);
  requireThat(new Set(rows).size === rows.length, input, "OLD_ROW_REMOVED_OR_NEXT_DUPLICATE");
  const byRow = new Map(next.resources.map(r => [r.row_id, r]));
  const oldRows = new Set(c.resources.map(r => r.row_id));
  const bound = new Set(c.bindings.map(b => b.resource_spec_id));
  const parameterIds = new Set(next.parameters.map(p => p.parameter_id));
  for (const old of c.resources) {
    const actual = byRow.get(old.row_id);
    requireThat(actual != null, input, "OLD_ROW_REMOVED_OR_NEXT_DUPLICATE");
    // Snapshot UUIDs are immutable. A representative retains them; the shared
    // clone publisher allocates NEW physical UUIDs but keeps every logical row_id.
    if (phase === "REPRESENTATIVE") requireThat(actual.id === old.id,
      input, "OLD_REPRESENTATIVE_RESOURCE_ID_DRIFT");
    requireThat(formulas.has(actual.formula_id), input, "RESOURCE_FORMULA_MISSING");
    if (bound.has(old.id)) {
      requireThat(same(paymentValue(old), paymentValue(actual)), input, "OLD_BOUND_RESOURCE_PHYSICAL_PAYMENT_DRIFT");
    } else if (!object(actual.source_metadata) || !same(old.source_metadata, actual.source_metadata)) {
      // The existing ELECOR APPLICATION need may gain explicit method evidence;
      // it does not gain a locator, source norm, paid quantity or migrated price.
      const metadata = actual.source_metadata;
      const evidence = metadata?.completionNeedTransitionV1;
      const owner = byRow.get(evidence?.resolvedThroughPaidOwnerRowId);
      requireThat(old.source_metadata?.sourceRole === "UNRESOLVED_APPLICATION_NORM"
        && object(metadata) && object(evidence)
        && typeof evidence.featureContract === "string" && evidence.featureContract.length > 0
        && parameterIds.has(evidence.selectedMethodParameterId)
        && typeof evidence.resolvedOnlyForMethod === "string" && evidence.resolvedOnlyForMethod.length > 0
        && evidence.automaticLegacyPriceOrQuantityTransferAllowed === false
        && owner != null && !oldRows.has(owner.row_id)
        && owner.resource_graph?.costTreatment === "OWN_COST",
        input, "OLD_UNBOUND_NEED_COMPLETION_EVIDENCE_REQUIRED");
      const {completionNeedTransitionV1: _transition, ...rest} = metadata;
      requireThat(!Object.hasOwn(old.source_metadata, "completionNeedTransitionV1")
        && same(rest, old.source_metadata), input, "OLD_UNBOUND_NEED_PROVENANCE_DRIFT");
    }
  }
}
/** Empty [] is an output marker, never a fictitious external normative source.
 * It is admitted only for a real, reciprocal compiler control on a NEW row. */
function assertMasterNewEmptyDerivedControlR1(
  input: MasterRetainedBindingGuardInputR1, parameter: Json, next: Computation,
): void {
  const opt = required(input), c = opt.capturedParent;
  const spec = opt.newParameterSources[parameter.parameter_id];
  const meta = parameter.truth_metadata?.effective_resource_quantity_v1;
  const oldRows = new Set(c.resources.map(r => r.row_id));
  const owner = next.resources.find(r => r.row_id === meta?.sourceRowId);
  requireThat(spec?.kind === "DERIVED" && Array.isArray(spec.sourceIds) && spec.sourceIds.length === 0
    && parameter.truth_metadata?.value_source_role === "COMPILER_DERIVED_RESOURCE_QUANTITY"
    && parameter.truth_metadata?.visibility_role === "INTERNAL_ONLY"
    && object(meta) && exactKeys(meta, ["sourceRowId", "unitId"])
    && typeof meta.sourceRowId === "string" && !oldRows.has(meta.sourceRowId)
    && owner != null && typeof parameter.unit_id === "string" && parameter.unit_id.length > 0
    && meta.unitId === parameter.unit_id && owner.unit_id === parameter.unit_id,
    input, "EMPTY_DERIVED_CONTROL_INVALID");
  try {
    // Reuse the SAME canonical definition-integrity validator; no arithmetic or
    // quantity engine is implemented here. It checks reciprocal output, unit,
    // required/default/type/visibility, formula unit and duplicate ownership.
    const controls = planCanonicalEffectiveResourceQuantitiesV1(
      next.parameters as unknown as Parameters<typeof planCanonicalEffectiveResourceQuantitiesV1>[0],
      next.resources as unknown as Parameters<typeof planCanonicalEffectiveResourceQuantitiesV1>[1],
      next.formulas as unknown as Parameters<typeof planCanonicalEffectiveResourceQuantitiesV1>[2]);
    requireThat(controls.outputs.get(meta.sourceRowId)?.parameterId === parameter.parameter_id,
      input, "EMPTY_DERIVED_CONTROL_INVALID");
  } catch {
    fail(input, "EMPTY_DERIVED_CONTROL_INVALID");
  }
}

/** Pure representative assembly. Existing clone publisher remains the ONLY writer. */
export function prepareMasterRetainedBindingRepresentativeR1(
  input: MasterRetainedBindingGuardInputR1,
  next: Readonly<{parameters: readonly Json[]; formulas: readonly Json[]; resources: readonly Json[]; newBindings: readonly Json[];
    successorProvenance: Json; lifecycleMetadata?: Json}>,
): Readonly<{bindings: readonly Json[]; normativeSourceIds: Json; sourceMetadata: Json;
  expectedNormativeBindingCount: number; normativeSourceClosure: readonly string[]}> {
  const opt = required(input), c = opt.capturedParent;
  assertMasterRetainedParentComputationR1(input, next, "REPRESENTATIVE");
  const oldResourceIds = new Map(c.resources.map(r => [r.id, r.row_id]));
  const oldRows = new Set(c.resources.map(r => r.row_id));
  const nextRows = next.resources.map(r => r.row_id);
  requireThat(nextRows.every(id => typeof id === "string" && id.length > 0)
    && new Set(nextRows).size === nextRows.length
    && [...oldRows].every(id => nextRows.includes(id)), input, "OLD_ROW_REMOVED_OR_NEXT_DUPLICATE");
  const locators = new Set(input.newLocators.map(l => l.id));
  requireThat(Array.isArray(next.newBindings) && next.newBindings.length > 0
    && next.newBindings.every(b => typeof b.row_id === "string" && nextRows.includes(b.row_id)
      && !oldRows.has(b.row_id) && locators.has(b.locator_id) && object(b.applicability)),
    input, "NEW_BINDING_MUST_USE_NEW_ROW_AND_SOURCE");
  const keys = next.newBindings.map(b => `${b.row_id}/${b.locator_id}`);
  requireThat(new Set(keys).size === keys.length, input, "NEW_BINDING_DUPLICATE");
  const oldBindings = c.bindings.map(b => ({row_id: oldResourceIds.get(b.resource_spec_id),
    locator_id: b.locator_id, applicability: normalized(b.applicability)}));
  const oldParamIds = new Set(c.parameters.map(p => p.parameter_id));
  const nextParamIds = next.parameters.map(p => p.parameter_id);
  requireThat(nextParamIds.every(id => typeof id === "string" && id.length > 0)
    && new Set(nextParamIds).size === nextParamIds.length
    && [...oldParamIds].every(id => nextParamIds.includes(id)), input, "OLD_PARAMETER_REMOVED_OR_NEXT_DUPLICATE");
  const newParameters = next.parameters.filter(p => !oldParamIds.has(p.parameter_id));
  requireThat(exactKeys(opt.newParameterSources, newParameters.map(p => p.parameter_id)),
    input, "NEW_PARAMETER_SOURCE_EXACT_KEYS");
  const sourceClosure = setOf([...c.normativeSources.map(s => s.source_key), input.newSource.source_key]);
  // Historical old unresolved slots may have old source arrays: preserve them EXACTLY.
  // Only newly introduced unresolved slots are required to have []. Do not rewrite history.
  const normativeSourceIds = normalized(c.baseline.normative_source_ids);
  for (const p of newParameters) {
    const spec = opt.newParameterSources[p.parameter_id];
    requireThat(object(spec) && ["KNOWN", "DERIVED", "UNRESOLVED"].includes(spec.kind)
      && Array.isArray(spec.sourceIds) && spec.sourceIds.every(s => typeof s === "string"
        && sourceClosure.includes(s)) && new Set(spec.sourceIds).size === spec.sourceIds.length,
      input, "NEW_PARAMETER_SOURCE_VALUE");
    const role = p.truth_metadata?.value_source_role;
    requireThat(typeof role === "string" && role.length > 0, input, "NEW_PARAMETER_TRUTH_ROLE_REQUIRED");
    const unresolved = role === "UNRESOLVED_APPLICATION_NORM";
    requireThat((spec.kind === "UNRESOLVED") === unresolved, input, "NEW_UNRESOLVED_KIND_MISMATCH");
    if (unresolved) requireThat(spec.sourceIds.length === 0, input, "NEW_UNRESOLVED_SOURCE_FORBIDDEN");
    else {
      requireThat((spec.kind === "DERIVED") === role.includes("DERIVED"), input, "NEW_DERIVED_KIND_MISMATCH");
      if (spec.sourceIds.length === 0) {
        requireThat(spec.kind === "DERIVED", input, "NEW_KNOWN_SOURCE_REQUIRED");
        assertMasterNewEmptyDerivedControlR1(input, p, next);
      }
    }
    normativeSourceIds[p.parameter_id] = [...spec.sourceIds];
  }
  const oldMetadata = c.definition.source_metadata;
  requireThat(object(oldMetadata) && object(next.successorProvenance)
    && !Object.prototype.hasOwnProperty.call(oldMetadata, "retainedParentBindingSuccessorV1"),
    input, "SUCCESSOR_PROVENANCE_SLOT_COLLISION");
  const lifecycle = next.lifecycleMetadata ?? {};
  requireThat(object(lifecycle) && Object.keys(lifecycle).every(key =>
    ["contract", "masterSha256", "sourceFingerprint"].includes(key)), input, "LIFECYCLE_OVERWRITE_KEYS");
  return {bindings: [...oldBindings, ...next.newBindings.map(b => normalized(b))],
    normativeSourceIds, sourceMetadata: {...normalized(oldMetadata), ...normalized(lifecycle),
      retainedParentBindingSuccessorV1: normalized(next.successorProvenance)},
    expectedNormativeBindingCount: oldBindings.length + next.newBindings.length,
    normativeSourceClosure: sourceClosure};
}
/** Final plan check: run before publisher preflight, and reuse for independent readback. */
export function assertMasterRetainedBindingPlanR1(
  input: MasterRetainedBindingGuardInputR1,
  plan: Readonly<{parameters: readonly Json[]; formulas: readonly Json[]; resources: readonly Json[]; bindings: readonly Json[]; baseline: Json; definition: Json}>,
  expected: ReturnType<typeof prepareMasterRetainedBindingRepresentativeR1>,
): void {
  const opt = required(input);
  assertMasterRetainedParentComputationR1(input, plan, "PLAN");
  for (const p of plan.parameters) {
    const spec = opt.newParameterSources[p.parameter_id];
    if (spec?.kind === "DERIVED" && Array.isArray(spec.sourceIds) && spec.sourceIds.length === 0) {
      assertMasterNewEmptyDerivedControlR1(input, p, plan);
    }
  }
  const idToRow = new Map(plan.resources.map(r => [r.id, r.row_id]));
  const semantics = plan.bindings.map(b => ({row_id: idToRow.get(b.resource_spec_id),
    locator_id: b.locator_id, applicability: b.applicability}));
  requireThat(same(records(semantics), records(expected.bindings)), input, "PLAN_FULL_BINDING_SET_DRIFT");
  requireThat(same(plan.baseline.normative_source_ids, expected.normativeSourceIds),
    input, "PLAN_BASELINE_SOURCE_ARRAYS_DRIFT");
  requireThat(same(plan.definition.source_metadata, expected.sourceMetadata),
    input, "PLAN_TOP_PROVENANCE_DRIFT");
}
