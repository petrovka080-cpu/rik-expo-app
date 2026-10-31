import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {canonicalEstimateOperationReferences} from './canonicalEstimateOperationComposition';
import {resolveInclusionGraph} from './inclusionGraph';

type Json = Readonly<Record<string, unknown>>;
const object = (value: unknown): Json | null => value != null && typeof value === 'object' && !Array.isArray(value)
  ? value as Json : null;
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 2000;
const hash = (value: unknown) => canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
const fail = (): never => { throw new Error('DEFINITION_COMPOSITION_SCOPE_INVALID'); };
type Scope = {lockedParameterValues: Record<string, string>; inactiveRows: {rowId: string; inclusionSha256: string}[];
  inactiveOperationIds: string[]};
type Projection = {independentComposition: unknown; inactiveRowIds: ReadonlySet<string>};

/** Source-declared inactive history is still stored in the same map. This is
 * never an author-supplied permission to skip a reachable resource. */
function scopeOf(map: unknown): Scope | null {
  const root = object(map);
  if (!root || !Object.hasOwn(root, 'definitionCompositionScopeV1')) return null;
  const raw = object(root.definitionCompositionScopeV1), values = object(raw?.lockedParameterValues);
  if (!raw || raw.contractVersion !== 'canonical-definition-composition-scope/v1' || !values
    || Object.keys(values).length === 0 || Object.keys(values).length > 16
    || Object.entries(values).some(([id, value]) => !text(id) || !text(value))
    || !Array.isArray(raw.inactiveRows) || raw.inactiveRows.length === 0 || raw.inactiveRows.length > 512
    || !Array.isArray(raw.inactiveOperationIds) || raw.inactiveOperationIds.length > 256
    || raw.inactiveOperationIds.some(id => !text(id))
    || new Set(raw.inactiveOperationIds).size !== raw.inactiveOperationIds.length
    || !Array.isArray(raw.sourceEvidence) || raw.sourceEvidence.length === 0 || raw.sourceEvidence.length > 8
    || raw.sourceEvidence.some(value => {const e = object(value); return !e || !/^[a-f0-9]{64}$/u.test(String(e.sha256)) || !text(e.locator);})) return fail();
  const rows = raw.inactiveRows.map(value => {
    const row = object(value);
    if (!row || !text(row.rowId) || !/^[a-f0-9]{64}$/u.test(String(row.inclusionSha256))) return fail();
    return {rowId: row.rowId, inclusionSha256: String(row.inclusionSha256)};
  });
  if (new Set(rows.map(row => row.rowId)).size !== rows.length) return fail();
  return {lockedParameterValues: {...values} as Record<string, string>, inactiveRows: rows,
    inactiveOperationIds: [...raw.inactiveOperationIds] as string[]};
}

function project(map: unknown, scope: Scope): Projection {
  const root = object(map), inactive = new Set(scope.inactiveRows.map(row => row.rowId)), ops = new Set(scope.inactiveOperationIds);
  if (!root || !Array.isArray(root.entries) || !Array.isArray(root.operationRoster)
    || !Array.isArray(root.operationRequirements)) return fail();
  const entries = root.entries, rowOf = (value: unknown): string => {
    const e = object(value), resolution = object(e?.resolution);
    return String(resolution?.rowId ?? resolution?.parentRowId ?? '');
  };
  for (const id of inactive) if (!entries.some(entry => rowOf(entry) === id)) return fail();
  for (const id of ops) {
    if (!root.operationRoster.some(op => object(op)?.operationId === id)
      || !entries.some(entry => object(entry)?.operationId === id)
      || entries.some(entry => object(entry)?.operationId === id && !inactive.has(rowOf(entry)))) return fail();
  }
  const activeEntries = entries.filter(entry => !inactive.has(rowOf(entry)));
  if (activeEntries.some(value => {const e = object(value); return !e || ops.has(String(e.operationId))
    || (Array.isArray(e.requiredOperationIds) && e.requiredOperationIds.some(id => ops.has(String(id))));})) return fail();
  // Project an independently authored map; do not generate expectations from
  // actual output rows or invent an exclusion for an unreviewed resource class.
  return {inactiveRowIds: inactive, independentComposition: {...root,
    entries: activeEntries,
    operationRoster: root.operationRoster.filter(op => !ops.has(String(object(op)?.operationId))),
    operationRequirements: root.operationRequirements.filter(review => !ops.has(String(object(review)?.operationId))).map(value => {
      const review = object(value), requirements = object(review?.requirements);
      if (!review || !requirements) return value;
      return {...review, requirements: Object.fromEntries(Object.entries(requirements).map(([kind, value]) => {
        const r = object(value);
        return [kind, r && Array.isArray(r.rowIds) ? {...r, rowIds: r.rowIds.filter(id => !inactive.has(String(id)))} : value];
      }))};
    })}};
}

/** New definition admission proves every declared inactive row false using
 * singleton INTERNAL_ONLY enum domains, never defaults or runtime inputs. */
export function canonicalDefinitionCompositionScopeV1(input: {
  independentComposition: unknown; parameterDefinitions?: readonly Json[]; resourceDefinitions: readonly Json[];
}): Projection {
  const scope = scopeOf(input.independentComposition);
  if (!scope) return {independentComposition: input.independentComposition, inactiveRowIds: new Set()};
  if (!input.parameterDefinitions) return fail();
  for (const [id, value] of Object.entries(scope.lockedParameterValues)) {
    const matches = input.parameterDefinitions.filter(p => p.parameter_id === id), p = matches[0], truth = object(p?.truth_metadata);
    if (matches.length !== 1 || p?.value_type !== 'enum' || truth?.visibility_role !== 'INTERNAL_ONLY'
      || canonicalEstimateStableJson(object(p.constraints_json)?.values) !== canonicalEstimateStableJson([value])) return fail();
  }
  const rowIds = new Set<string>();
  for (const row of input.resourceDefinitions) {
    if (!text(row.row_id) || rowIds.has(row.row_id)) return fail();
    rowIds.add(row.row_id);
  }
  for (const declared of scope.inactiveRows) {
    const row = input.resourceDefinitions.find(row => row.row_id === declared.rowId), ast = object(row?.inclusion_ast);
    if (!row || !ast || hash(ast) !== declared.inclusionSha256
      || resolveInclusionGraph({...ast}, scope.lockedParameterValues).value !== false) return fail();
  }
  const projection = project(input.independentComposition, scope), ops = new Set(scope.inactiveOperationIds);
  for (const row of input.resourceDefinitions) if (!projection.inactiveRowIds.has(String(row.row_id))) {
    if (canonicalEstimateOperationReferences(object(row.resource_graph)?.operationCompositionV1).some(op => ops.has(op.operationId))) return fail();
  }
  return projection;
}

/** Only the immutable server-owned saved passport carries this proof forward.
 * An unexpected inactive row or a conflicting saved method fails closed. */
export function canonicalSavedDefinitionCompositionScopeV1(input: {
  independentComposition: unknown; savedResources: readonly Json[]; savedParameters: Json;
}): Projection {
  const scope = scopeOf(input.independentComposition);
  if (!scope) return {independentComposition: input.independentComposition, inactiveRowIds: new Set()};
  const projection = project(input.independentComposition, scope);
  if (input.savedResources.some(row => projection.inactiveRowIds.has(String(row.row_id)))) return fail();
  for (const [id, value] of Object.entries(scope.lockedParameterValues))
    if (Object.hasOwn(input.savedParameters, id) && input.savedParameters[id] !== value) return fail();
  return projection;
}
