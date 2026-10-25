import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {resolveInclusionGraph} from './inclusionGraph';
import {compileFormulaGraph,isFormulaGraphExactDecimal} from './formulaGraph';
import type {PrimaryMeasureSelectionParameterV1} from './canonicalPrimaryMeasureSelectionV1';

export const CANONICAL_SOURCE_PROFILE_PRODUCER_V1 = 'canonical-source-profile-producer/v1' as const;
export type CanonicalSourceProfileProducerV1 = Readonly<{
  contract: typeof CANONICAL_SOURCE_PROFILE_PRODUCER_V1;
  metadata: CanonicalSourceProfileSelectionV1;
  selectorValue: string;
  geometry: Readonly<Record<string,string|number>>;
  outputs: Readonly<Record<string,string|number>>;
}>;

export type CanonicalSourceProfileResolutionV1 = Readonly<{
  applied: boolean;
  profileId: string | null;
  confirmedParameters: Readonly<Record<string, unknown>>;
  ownedOutputs?: Readonly<Record<string,string|number>>;
  sourceProfileProducerV1?: CanonicalSourceProfileProducerV1;
  sourceProfileSelectionV1?: Readonly<{
    contract: 'canonical-source-profile-selection/v1';
    status: 'RESOLVED' | 'UNRESOLVED';
    selectorParameterId: string;
    missingGeometryParameterIds: readonly string[];
  }>;
}>;

export const CANONICAL_SOURCE_PROFILE_SELECTION_V1 = 'canonical-source-profile-selection/v1' as const;
export const CANONICAL_SOURCE_GEOMETRY_COPY_V1 = 'canonical-source-geometry-copy/v1' as const;

export type CanonicalSourceProfileSelectionV1 = Readonly<{
  contract: typeof CANONICAL_SOURCE_PROFILE_SELECTION_V1;
  selectorParameterId: string;
  geometryParameterIds: readonly string[];
  /** Explicit public work-method fact only. Never a project approval or an
   * output supplied by the caller; omitted metadata keeps the numeric path. */
  publicMethodSelectionV1?: Readonly<{
    contract: 'canonical-source-profile-public-method/r1'; parameterId: string;
    absentParameterLegacyV1?: Readonly<{
      contract: 'canonical-source-profile-captured-absence/r1'; capturedParentDefinitionId: string;
      capturedParentDefinitionVersion: number; capturedParentDefinitionSha256: string;
      capturedSourceProfileSelectionMetadata: Readonly<Record<string, unknown>>;
      capturedSourceProfileSelectionMetadataSha256: string; witnessSha256: string;
    }>;
  }>;
  profiles: readonly Readonly<{
    selectorValue: string;
    sources: readonly Readonly<{sourceId: string; artifactSha256: string; locator: string}>[];
    when: Readonly<Record<string, unknown>>;
    geometryCopies: readonly Readonly<{fromParameterId: string; toParameterId: string}>[];
  }>[];
}>;
export type CanonicalSourceProfileParameterV1 = PrimaryMeasureSelectionParameterV1 & Readonly<{defaultValue?: unknown}>;
type RecordV1 = Record<string, unknown>;
const recordV1 = (v: unknown): v is RecordV1 => v !== null && typeof v === 'object' && !Array.isArray(v);
const validIdV1 = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z][A-Za-z0-9_.:-]{0,199}$/u.test(v);
const textV1 = (v: unknown, maximum = 2000): v is string => typeof v === 'string' && v.trim() === v && v.length > 0 && v.length <= maximum && !/[\u0000-\u001f\u007f]/u.test(v);
const exactKeysV1 = (v: RecordV1, keys: readonly string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
function sourceProfileErrorV1(subject: string, code = 'SOURCE_PROFILE_SELECTION_INVALID'): never {
  throw Object.assign(new Error(`Source profile selection invalid: ${subject}`), {code, httpStatus: 422});
}
function assertProfileV1(condition: unknown, subject: string): asserts condition {
  if (!condition) sourceProfileErrorV1(subject);
}
const numericV1 = (p: CanonicalSourceProfileParameterV1 | undefined) => p?.valueType === 'decimal' || p?.valueType === 'integer';
function numericValueV1(v: unknown, p: CanonicalSourceProfileParameterV1): v is string | number {
  return (typeof v === 'number' || typeof v === 'string') && /^[+-]?\d+(?:\.\d+)?$/u.test(String(v))
    && Number.isFinite(Number(v)) && isFormulaGraphExactDecimal(v) && (p.valueType !== 'integer' || /^[+-]?\d+$/u.test(String(v)) && Number.isInteger(Number(v)));
}

/** Validate a bounded existing InclusionGraph with identity-only condition
 * expressions; no arithmetic, source flags, PPR assertions or undeclared input. */
function sourceProfileWhenV1(ast: unknown, geometry: ReadonlySet<string>,
  byId: ReadonlyMap<string, CanonicalSourceProfileParameterV1>, count = {nodes: 0}, depth = 0): void {
  assertProfileV1(recordV1(ast) && ++count.nodes <= 128 && depth <= 12, 'WHEN_SHAPE_OR_LIMIT');
  const kind = ast.kind;
  if (kind === 'literal') {
    assertProfileV1(exactKeysV1(ast, ['kind', 'value']) && typeof ast.value === 'boolean', 'WHEN_LITERAL');
  } else if (kind === 'and' || kind === 'or') {
    const key = Object.hasOwn(ast, 'operands') ? 'operands' : 'conditions';
    assertProfileV1(exactKeysV1(ast, ['kind', key]) && Array.isArray(ast[key]) && ast[key].length > 0, 'WHEN_LOGICAL');
    for (const child of ast[key] as unknown[]) sourceProfileWhenV1(child, geometry, byId, count, depth + 1);
  } else if (kind === 'not') {
    assertProfileV1(exactKeysV1(ast, ['kind', 'operand']), 'WHEN_NOT');
    sourceProfileWhenV1(ast.operand, geometry, byId, count, depth + 1);
  } else if (kind === 'formula_greater_than') {
    assertProfileV1(exactKeysV1(ast, ['kind', 'expression', 'unitId', 'value'])
      && validIdV1(ast.expression) && geometry.has(ast.expression)
      && ast.unitId === byId.get(ast.expression)?.unitId
      && typeof ast.value === 'number' && Number.isFinite(ast.value) && isFormulaGraphExactDecimal(ast.value), 'WHEN_IDENTITY_FORMULA');
    let identity = false;
    try {
      const compiled = compileFormulaGraph(ast.expression);
      identity = compiled.ast.kind === 'parameter' && compiled.ast.id === ast.expression;
    } catch {
      // A declared ID containing an operator must not become arithmetic.
    }
    assertProfileV1(identity, 'WHEN_IDENTITY_FORMULA');
  } else {
    const numericKinds = ['greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal'];
    assertProfileV1(kind === 'present' || kind === 'equals' || kind === 'not_equals' || kind === 'in'
      || typeof kind === 'string' && numericKinds.includes(kind), 'WHEN_ARITHMETIC_OR_KIND');
    assertProfileV1(validIdV1(ast.parameterId) && geometry.has(ast.parameterId), 'WHEN_GEOMETRY_REFERENCE');
    if (kind === 'present') assertProfileV1(exactKeysV1(ast, ['kind', 'parameterId']), 'WHEN_PRESENT');
    else if (kind === 'in') assertProfileV1(exactKeysV1(ast, ['kind', 'parameterId', 'values']) && Array.isArray(ast.values)
      && ast.values.length > 0 && ast.values.length <= 64 && ast.values.every(v => typeof v === 'number' && Number.isFinite(v)), 'WHEN_IN');
    else if (Object.hasOwn(ast, 'valueParameterId')) assertProfileV1(typeof kind === 'string' && numericKinds.includes(kind)
      && exactKeysV1(ast, ['kind', 'parameterId', 'valueParameterId']) && validIdV1(ast.valueParameterId)
      && geometry.has(ast.valueParameterId), 'WHEN_PEER');
    else assertProfileV1(exactKeysV1(ast, ['kind', 'parameterId', 'value']) && typeof ast.value === 'number'
      && Number.isFinite(ast.value), 'WHEN_NUMERIC_LITERAL');
  }
  // The existing evaluator remains the only condition interpreter.
  resolveInclusionGraph(ast, {});
}

/** The optional method must be the first conjunct of EVERY profile. All
 * remaining conditions stay in the existing numeric geometry contract. This
 * forbids an area-only fallback, OR bypass or a second unowned discriminator. */
function publicMethodWhenV1(ast: unknown, id: string, domain: readonly string[],
  geometry: ReadonlySet<string>, byId: ReadonlyMap<string, CanonicalSourceProfileParameterV1>): string {
  assertProfileV1(recordV1(ast) && exactKeysV1(ast, ['kind', 'operands']) && ast.kind === 'and'
    && Array.isArray(ast.operands) && ast.operands.length >= 2 && ast.operands.length <= 16, 'METHOD_WHEN_CONJUNCTION');
  const first: unknown = ast.operands[0];
  assertProfileV1(recordV1(first) && exactKeysV1(first, ['kind', 'parameterId', 'value'])
    && first.kind === 'equals' && first.parameterId === id && typeof first.value === 'string'
    && domain.includes(first.value), 'METHOD_WHEN_EXACT_PUBLIC_CHOICE');
  for (const child of ast.operands.slice(1)) sourceProfileWhenV1(child, geometry, byId);
  resolveInclusionGraph(ast, {});
  return first.value;
}

export function resolveCanonicalSourceProfileSelectionV1(input: Readonly<{
  sourceProfileSelectionMetadata?: unknown;
  parameterSchema?: readonly CanonicalSourceProfileParameterV1[];
  confirmedParameters: Readonly<Record<string, unknown>>;
  effectiveUserParameters: Readonly<Record<string, unknown>>;
}>): CanonicalSourceProfileResolutionV1 {
  const metadata = input.sourceProfileSelectionMetadata;
  assertProfileV1(recordV1(metadata) && exactKeysV1(metadata, ['contract', 'selectorParameterId', 'geometryParameterIds', 'profiles',
    ...(Object.hasOwn(metadata, 'publicMethodSelectionV1') ? ['publicMethodSelectionV1'] : [])])
    && metadata.contract === CANONICAL_SOURCE_PROFILE_SELECTION_V1 && validIdV1(metadata.selectorParameterId)
    && Array.isArray(metadata.geometryParameterIds) && metadata.geometryParameterIds.length > 0 && metadata.geometryParameterIds.length <= 10
    && metadata.geometryParameterIds.every(validIdV1) && new Set(metadata.geometryParameterIds).size === metadata.geometryParameterIds.length
    && Array.isArray(metadata.profiles) && metadata.profiles.length > 0 && metadata.profiles.length <= 64, 'METADATA');
  assertProfileV1(Array.isArray(input.parameterSchema) && recordV1(input.confirmedParameters) && recordV1(input.effectiveUserParameters), 'INPUT_SHAPE');
  const parameterSchema: readonly CanonicalSourceProfileParameterV1[] = input.parameterSchema;
  const byId = new Map<string, CanonicalSourceProfileParameterV1>();
  for (const p of parameterSchema) {
    assertProfileV1(recordV1(p) && validIdV1(p.parameterId) && !byId.has(p.parameterId), 'PARAMETER_SCHEMA');
    byId.set(p.parameterId, p);
  }
  const selectorId = metadata.selectorParameterId, selector = byId.get(selectorId), domain = selector?.constraints?.values;
  assertProfileV1(selector?.valueType === 'enum' && selector.visibilityRole === 'INTERNAL_ONLY'
    && selector.valueSourceRole === 'SOURCE_BACKED_PRELIMINARY_PROFILE' && selector.defaultValue == null
    && selector.provenance?.consumer_input_role_v1 === 'APPLICATION_TECHNICAL'
    && Array.isArray(domain) && domain.length > 0 && domain.length <= 64 && domain.every(v => textV1(v, 1000))
    && new Set(domain).size === domain.length, 'SOURCE_OWNED_SELECTOR');
  const geometry = new Set(metadata.geometryParameterIds as string[]);
  for (const id of geometry) {
    const p = byId.get(id);
    assertProfileV1(numericV1(p) && p?.visibilityRole === 'USER_INPUT' && p.provenance?.consumer_input_role_v1 === 'OBJECT_FACT'
      && validIdV1(p.unitId) && id !== selectorId, 'PUBLIC_GEOMETRY');
  }
  const publicMethod = metadata.publicMethodSelectionV1;
  let publicMethodId: string | null = null;
  let publicMethodDomain: readonly string[] = [];
  if (publicMethod !== undefined) {
    assertProfileV1(recordV1(publicMethod) && exactKeysV1(publicMethod, ['contract', 'parameterId',
      ...(Object.hasOwn(publicMethod, 'absentParameterLegacyV1') ? ['absentParameterLegacyV1'] : [])])
      && publicMethod.contract === 'canonical-source-profile-public-method/r1'
      && validIdV1(publicMethod.parameterId) && !geometry.has(publicMethod.parameterId)
      && publicMethod.parameterId !== selectorId, 'PUBLIC_METHOD_DECLARATION');
    const method = byId.get(publicMethod.parameterId), methodDomain = method?.constraints?.values;
    assertProfileV1(method?.valueType === 'enum' && method.unitId == null && method.defaultValue == null
      && method.visibilityRole === 'USER_INPUT' && method.valueSourceRole === 'PROJECT_SPECIFIC_INPUT'
      && method.provenance?.consumer_input_role_v1 === 'OBJECT_FACT'
      && Array.isArray(methodDomain) && methodDomain.length > 0 && methodDomain.length <= 16
      && methodDomain.every(v => textV1(v, 1000)) && new Set(methodDomain).size === methodDomain.length,
      'PUBLIC_METHOD_OBJECT_FACT');
    publicMethodId = publicMethod.parameterId;
    publicMethodDomain = methodDomain;
  }
  const publicMethodValues = new Set<string>();
  const targets = new Map<string, string>(), values = new Set<string>();
  const profiles = metadata.profiles as RecordV1[];
  for (const profile of profiles) {
    assertProfileV1(recordV1(profile) && exactKeysV1(profile, ['selectorValue', 'sources', 'when', 'geometryCopies'])
      && textV1(profile.selectorValue, 1000) && domain.includes(profile.selectorValue) && !values.has(profile.selectorValue)
      && Array.isArray(profile.sources) && profile.sources.length > 0 && profile.sources.length <= 16
      && Array.isArray(profile.geometryCopies) && profile.geometryCopies.length <= 64, 'PROFILE');
    values.add(profile.selectorValue);
    const sourceIds = new Set<string>();
    for (const source of profile.sources) {
      assertProfileV1(recordV1(source) && exactKeysV1(source, ['sourceId', 'artifactSha256', 'locator']) && textV1(source.sourceId, 1000)
        && !sourceIds.has(source.sourceId) && typeof source.artifactSha256 === 'string' && /^[a-f0-9]{64}$/u.test(source.artifactSha256)
        && textV1(source.locator), 'EXACT_SOURCE_PROOF');
      sourceIds.add(source.sourceId);
    }
    if (publicMethodId === null) sourceProfileWhenV1(profile.when, geometry, byId);
    else {
      const value = publicMethodWhenV1(profile.when, publicMethodId, publicMethodDomain, geometry, byId);
      assertProfileV1(!publicMethodValues.has(value), 'PUBLIC_METHOD_DUPLICATE_PROFILE');
      publicMethodValues.add(value);
    }
    const branchTargets = new Set<string>();
    for (const copy of profile.geometryCopies) {
      assertProfileV1(recordV1(copy) && exactKeysV1(copy, ['fromParameterId', 'toParameterId']) && validIdV1(copy.fromParameterId)
        && geometry.has(copy.fromParameterId) && validIdV1(copy.toParameterId) && !branchTargets.has(copy.toParameterId)
        && copy.toParameterId !== selectorId && !geometry.has(copy.toParameterId), 'COPY_BINDING');
      const from = byId.get(copy.fromParameterId)!, to = byId.get(copy.toParameterId), wire = to?.provenance?.source_geometry_copy_v1;
      assertProfileV1(numericV1(to) && to?.valueType === from.valueType && to.unitId === from.unitId
        && to.visibilityRole === 'INTERNAL_ONLY' && to.valueSourceRole === 'BACKEND_DERIVED'
        && to.provenance?.consumer_input_role_v1 === 'APPLICATION_TECHNICAL' && to.defaultValue == null
        && recordV1(wire) && exactKeysV1(wire, ['contract', 'fromParameterId', 'unitId'])
        && wire.contract === CANONICAL_SOURCE_GEOMETRY_COPY_V1 && wire.fromParameterId === copy.fromParameterId && wire.unitId === from.unitId
        && (!targets.has(copy.toParameterId) || targets.get(copy.toParameterId) === copy.fromParameterId), 'COPY_TARGET_PRODUCER_CLOSURE');
      branchTargets.add(copy.toParameterId); targets.set(copy.toParameterId, copy.fromParameterId);
    }
  }
  if (publicMethodId !== null) assertProfileV1(publicMethodValues.size === publicMethodDomain.length
    && publicMethodDomain.every(v => publicMethodValues.has(v)), 'PUBLIC_METHOD_DOMAIN_PROFILE_CLOSURE');
  for (const p of parameterSchema) if (p.provenance?.source_geometry_copy_v1 !== undefined) {
    assertProfileV1(targets.has(p.parameterId), 'ORPHAN_SOURCE_GEOMETRY_COPY');
  }
  // Exact captured numeric route for callers that predate the new public key.
  // Only KEY ABSENCE uses it. An explicit null/empty answer stays unresolved.
  const legacy = recordV1(publicMethod) ? publicMethod.absentParameterLegacyV1 : undefined;
  let capturedLegacyMetadata: RecordV1 | undefined;
  if (legacy !== undefined) {
    assertProfileV1(recordV1(legacy) && exactKeysV1(legacy, ['contract', 'capturedParentDefinitionId',
      'capturedParentDefinitionVersion', 'capturedParentDefinitionSha256', 'capturedSourceProfileSelectionMetadata',
      'capturedSourceProfileSelectionMetadataSha256', 'witnessSha256'])
      && legacy.contract === 'canonical-source-profile-captured-absence/r1'
      && typeof legacy.capturedParentDefinitionId === 'string' && /^[0-9a-f-]{36}$/u.test(legacy.capturedParentDefinitionId)
      && Number.isInteger(legacy.capturedParentDefinitionVersion) && Number(legacy.capturedParentDefinitionVersion) > 0
      && typeof legacy.capturedParentDefinitionSha256 === 'string' && /^[0-9a-f]{64}$/u.test(legacy.capturedParentDefinitionSha256)
      && recordV1(legacy.capturedSourceProfileSelectionMetadata), 'LEGACY_ABSENCE_WITNESS_SHAPE');
    const {witnessSha256, ...body} = legacy;
    const digest = (v: unknown) => canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
    assertProfileV1(typeof witnessSha256 === 'string' && /^[0-9a-f]{64}$/u.test(witnessSha256)
      && digest(body) === witnessSha256
      && selector.provenance?.public_method_absence_witness_sha256 === witnessSha256
      && digest(legacy.capturedSourceProfileSelectionMetadata) === legacy.capturedSourceProfileSelectionMetadataSha256,
      'LEGACY_ABSENCE_WITNESS_HASH_OR_SELECTOR_EDGE');
    const old = legacy.capturedSourceProfileSelectionMetadata;
    assertProfileV1(exactKeysV1(old, ['contract', 'selectorParameterId', 'geometryParameterIds', 'profiles'])
      && old.contract === CANONICAL_SOURCE_PROFILE_SELECTION_V1 && old.selectorParameterId === selectorId
      && digest(old.geometryParameterIds) === digest(metadata.geometryParameterIds)
      && Array.isArray(old.profiles) && old.profiles.length === 1 && recordV1(old.profiles[0]),
      'LEGACY_ABSENCE_CAPTURED_NUMERIC_METADATA');
    const before = old.profiles[0], after = profiles.find(p => p.selectorValue === before.selectorValue);
    assertProfileV1(after && digest(after.sources) === digest(before.sources)
      && digest(after.geometryCopies) === digest(before.geometryCopies) && recordV1(after.when)
      && Array.isArray(after.when.operands) && after.when.operands.length === 2
      && digest(after.when.operands[1]) === digest(before.when), 'LEGACY_ABSENCE_EXACT_PROFILE_SOURCE_GEOMETRY');
    capturedLegacyMetadata = old;
  }
  const ownedIds = [selectorId, ...targets.keys()];
  for (const id of ownedIds) if (Object.hasOwn(input.effectiveUserParameters, id)) {
    sourceProfileErrorV1(id, 'SOURCE_PROFILE_TECHNICAL_INPUT_FORBIDDEN');
  }
  if (publicMethodId !== null && capturedLegacyMetadata !== undefined
    && !Object.hasOwn(input.effectiveUserParameters, publicMethodId)) {
    // Reuse THIS producer with its exact old numeric metadata. Exact-key
    // validation above forbids a nested opt-in, so this is bounded to one call.
    const old = resolveCanonicalSourceProfileSelectionV1({...input,sourceProfileSelectionMetadata:capturedLegacyMetadata});
    return {...old,...(old.sourceProfileProducerV1 ? {sourceProfileProducerV1:{...old.sourceProfileProducerV1,
      metadata:JSON.parse(JSON.stringify(metadata)) as CanonicalSourceProfileSelectionV1}} : {})};
  }
  // Never inherit a previous branch's selector or geometry. Only actual own
  // user geometry is considered below, even if fixtures remain in confirmed.
  const confirmed = { ...input.confirmedParameters };
  for (const id of ownedIds) delete confirmed[id];
  const actualGeometry: Record<string,string|number> = {};
  for (const id of geometry) if (Object.hasOwn(input.effectiveUserParameters, id)) {
    const value = input.effectiveUserParameters[id];
    if (value == null || value === '') continue;
    assertProfileV1(numericValueV1(value, byId.get(id)!), 'ACTUAL_GEOMETRY_VALUE');
    actualGeometry[id] = value;
  }
  if (publicMethodId !== null && Object.hasOwn(input.effectiveUserParameters, publicMethodId)) {
    const value = input.effectiveUserParameters[publicMethodId];
    if (value != null && value !== '') {
      assertProfileV1(typeof value === 'string' && publicMethodDomain.includes(value), 'ACTUAL_PUBLIC_METHOD_VALUE');
      actualGeometry[publicMethodId] = value;
    }
  }
  const decisions = profiles.map(profile => ({profile, condition: resolveInclusionGraph(profile.when as RecordV1, actualGeometry)}));
  const active = decisions.filter(x => x.condition.value === true);
  if (active.length > 1) sourceProfileErrorV1(selectorId, 'SOURCE_PROFILE_SELECTION_AMBIGUOUS');
  const selected = active[0]?.profile;
  const missing = new Set(decisions.filter(x => x.condition.value == null).flatMap(x => x.condition.missingParameterIds));
  if (selected) for (const raw of selected.geometryCopies as RecordV1[]) if (!Object.hasOwn(actualGeometry, raw.fromParameterId as string)) missing.add(raw.fromParameterId as string);
  const resolved = selected !== undefined && missing.size === 0 && decisions.every(x => x.condition.value !== null);
  const ownedOutputs: Record<string,string|number> = {};
  if (resolved) {
    ownedOutputs[selectorId] = String(selected.selectorValue);
    for (const copy of selected.geometryCopies as RecordV1[]) ownedOutputs[String(copy.toParameterId)] = actualGeometry[String(copy.fromParameterId)]!;
    Object.assign(confirmed,ownedOutputs);
  }
  // Every metadata member and producer edge was validated above. Detach the
  // receipt from the caller's mutable object; no new condition interpretation.
  const sourceProfileProducerV1: CanonicalSourceProfileProducerV1 | undefined = resolved ? {
    contract: CANONICAL_SOURCE_PROFILE_PRODUCER_V1,
    metadata: JSON.parse(JSON.stringify(metadata)) as CanonicalSourceProfileSelectionV1,
    selectorValue: String(selected.selectorValue), geometry: Object.freeze({...actualGeometry}),
    outputs: Object.freeze(ownedOutputs),
  } : undefined;
  return {applied: resolved, profileId: resolved ? String(selected.selectorValue) : null, confirmedParameters: Object.freeze(confirmed),
    ...(sourceProfileProducerV1 ? {ownedOutputs: sourceProfileProducerV1.outputs,sourceProfileProducerV1} : {}),
    sourceProfileSelectionV1: {contract: CANONICAL_SOURCE_PROFILE_SELECTION_V1, status: resolved ? 'RESOLVED' : 'UNRESOLVED',
      selectorParameterId: selectorId, missingGeometryParameterIds: [...missing].sort()}};
}

