import {createHash} from 'node:crypto';
import {canonicalCatalogParameterStorageViewV1} from '../../src/lib/estimate/backendPlatform/canonicalCatalogParameterStorageMapperV1';

/** PRIVATE prototype. New CURRENT parameter-DTO resource unit, not historical FULL51.
 * The caller keeps the existing RR client/governor, verifies the whole cohort's
 * before/after source vectors and charges their real rows to one declared unit.
 * No connection, transaction, planner, fixture discovery or admission is created. */
export const CURRENT_INGRESS_TUPLE_PROFILE_V1 = 'current-ingress-storage9-truth19-per-catalog-two-evidence/v2';
const ROW = 512 * 1024, WIRE = 1024 * 1024, CATALOG = 3 * 1024 * 1024;
const TABLE = 4096, GROUP = 51;
export const CURRENT_TRUTH_KEYS_V1 = Object.freeze([
  'preliminary_compilation_allowed','semantic_parameter_key','visibility_role','description_ru',
  'required_when','visible_when','allowed_range_or_options','default_policy','value_source_role',
  'guide','composite_item_schema','shared_input_binding_policy','derived_from','normative_links',
  'formula_consumers','resource_branch_consumers','validation_rules','conflicts_with','provenance',
] as const);
const hash = (value: string): string => createHash('sha256').update(value).digest('hex');
const fail = (code: string): never => {throw new Error('CURRENT_INGRESS_' + code);};
const need = (value: unknown, code: string): void => {if (!value) fail(code);};
const isHash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const isUuid = (value: unknown): value is string => typeof value === 'string'
  && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(value);
const parameterId = (value: unknown): value is string => typeof value === 'string'
  && /^[A-Za-z_][A-Za-z0-9_.:-]*$/u.test(value) && Buffer.byteLength(value, 'utf8') <= 512;

type CurrentIngressIdentityV1 = Readonly<{
  catalogId: string; definitionVersionId: string; parameterCount: number;
}>;
export type CurrentIngressArchiveExpectedV1 = CurrentIngressIdentityV1 & Readonly<{
  evidenceMode: 'ARCHIVED_COMPLETE_DTO';
  definitionVersion: number; definitionSha256: string;
  orderedParameterIds: readonly string[]; orderedParameterIdsSha256: string;
  /** Derived BEFORE this run from the independently pinned archived rows by the
   * actual production mapper. Never fill with the current read's returned hash. */
  expectedDtoSha256: string;
}>;
type IndependentReceiptRefV1 = Readonly<{path: string; sha256: string}>;
type ExactSchemaPolicyPredicateV1 = Readonly<{
  parameterId: string; preliminaryCompilationAllowed?: boolean; guideValidationPolicy?: string;
}>;
type SourcePreliminarySelectorPolicyV1 = Readonly<{
  parameterId: string; required: boolean; preliminaryCompilationAllowed: true;
  valueSourceRole: string; guideValidationPolicy: string; allowedValues: readonly string[];
  requiredWhen?: Readonly<{kind:'greater_than';parameterId:string;value:0}>;
}>;export type CurrentIngressPhysicalExpectationV1 = Readonly<{
  prompt: string; source: IndependentReceiptRefV1;
}> & (Readonly<{
  kind: 'EXPLICIT_PRIMARY_POSITIVE'; primaryParameterId: string; unitId: string | null;
  value: string | number | boolean;
}> | Readonly<{
  kind: 'MEASURE_UNIT_VALUE'; unitId: string; value: string | number;
}> | Readonly<{
  kind:'SOURCE_PRELIMINARY_MEASURE_OR_TYPED_CLARIFICATION'; primaryParameterId:string;unitId:string;value:string|number;
  missingParameterIds:readonly string[];deferredSelectors:readonly SourcePreliminarySelectorPolicyV1[];
}> | Readonly<{
  kind: 'EXACT_TYPED_CLARIFICATION' | 'TARGETED_TYPED_CLARIFICATION'; missingParameterIds: readonly string[];
}> | Readonly<{
  kind: 'SOURCE_NULL_PRIMARY_TYPED_CLARIFICATION'; missingParameterIds: readonly string[];
  forbiddenPayPrimaryIds: readonly string[];
}> | Readonly<{
  kind: 'SOURCE_NULL_PRIMARY_DEFERRED_OR_TYPED_CLARIFICATION';
  missingParameterIds: readonly string[]; forbiddenPayPrimaryIds: readonly string[];
  contextualParameters: Readonly<Record<string, string | number | boolean>>;
  schemaPolicyPredicates?: readonly ExactSchemaPolicyPredicateV1[];
}>);
export type CurrentIngressPublishedExpectedV1 = CurrentIngressIdentityV1 & Readonly<{
  evidenceMode: 'PUBLISHED_IDENTITY_SCOPED_INGRESS';
  independentReceipt: IndependentReceiptRefV1;
  versionEvidence: Readonly<{kind: 'INDEPENDENT'; value: number}> | Readonly<{kind: 'OBSERVED_WITNESS_ONLY'}>;
  definitionHashEvidence: Readonly<{kind: 'INDEPENDENT'; value: string}> | Readonly<{kind: 'OBSERVED_WITNESS_ONLY'}>;
  physicalExpectation: CurrentIngressPhysicalExpectationV1;
}>;
export type CurrentIngressExpectedV1 = CurrentIngressArchiveExpectedV1 | CurrentIngressPublishedExpectedV1;
export type CurrentIngressFixedSelectV1 =
  (sql: string, values: readonly unknown[], maximumRows: number) => Promise<unknown>;

/** Detached JSON data only. Reject accessors, sparse arrays, custom prototypes,
 * symbols and inherited data; nothing calls caller toJSON/getter functions. */
function dataOnly(value: unknown): unknown {
  let nodes = 0;
  const visit = (input: unknown, depth: number): unknown => {
    need(++nodes <= 250000 && depth <= 64, 'JSON_SHAPE_BOUND');
    if (input === null || typeof input === 'boolean' || typeof input === 'string') return input;
    if (typeof input === 'number') {need(Number.isFinite(input), 'NONFINITE_JSON'); return input;}
    need(input !== null && typeof input === 'object', 'JSON_DATA_ONLY');
    const object = input as object;
    const array = Array.isArray(object), prototype = Object.getPrototypeOf(object);
    need(array ? prototype === Array.prototype : prototype === Object.prototype || prototype === null, 'JSON_PROTOTYPE');
    need(Object.getOwnPropertySymbols(object).length === 0, 'JSON_SYMBOL');
    const names = Object.getOwnPropertyNames(object), keys = Object.keys(object);
    if (array) {
      const length = Object.getOwnPropertyDescriptor(object, 'length');
      need(length && Object.hasOwn(length, 'value') && Number.isSafeInteger(length.value)
        && length.value >= 0 && length.value <= 65536, 'JSON_ARRAY_BOUND');
      need(names.length === length!.value + 1 && keys.length === length!.value, 'JSON_ARRAY_KEYS');
      const result: unknown[] = [];
      for (let index = 0; index < length!.value; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(object, String(index));
        need(descriptor && descriptor.enumerable && Object.hasOwn(descriptor, 'value'), 'JSON_ACCESSOR');
        result.push(visit(descriptor!.value, depth + 1));
      }
      return result;
    }
    need(names.length === keys.length && keys.length <= 65536, 'JSON_OBJECT_KEYS');
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      need(!['__proto__','constructor','prototype'].includes(key), 'JSON_UNSAFE_KEY');
      const descriptor = Object.getOwnPropertyDescriptor(object, key);
      need(descriptor && descriptor.enumerable && Object.hasOwn(descriptor, 'value'), 'JSON_ACCESSOR');
      Object.defineProperty(result, key, {value: visit(descriptor!.value, depth + 1), enumerable: true});
    }
    return result;
  };
  return visit(value, 0);
}
function record(value: unknown, keys: readonly string[], code: string): Record<string, unknown> {
  need(value !== null && typeof value === 'object' && !Array.isArray(value), code);
  const result = value as Record<string, unknown>;
  need(Object.keys(result).sort().join(',') === [...keys].sort().join(','), code);
  return result;
}
function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}
function receiptRef(value: IndependentReceiptRefV1): void {
  record(value, ['path','sha256'], 'INDEPENDENT_RECEIPT_REF');
  need(typeof value.path === 'string' && value.path.length > 0 && value.path.length <= 4096
    && isHash(value.sha256), 'INDEPENDENT_RECEIPT_REF');
}
function validateSourcePreliminaryExpectation(value: Extract<CurrentIngressPhysicalExpectationV1,{kind:'SOURCE_PRELIMINARY_MEASURE_OR_TYPED_CLARIFICATION'}>): void {
  dataOnly(value);
  record(value,['kind','prompt','source','primaryParameterId','unitId','value','missingParameterIds','deferredSelectors'],'SOURCE_PRELIMINARY_EXPECTATION_KEYS');
  receiptRef(value.source);
  need(typeof value.prompt==='string' && value.prompt.trim().length>0 && value.prompt.length<=4000,'PHYSICAL_PROMPT');
  need(parameterId(value.primaryParameterId) && typeof value.unitId==='string' && value.unitId.length>0 && value.unitId.length<=128,'SOURCE_PRELIMINARY_MEASURE_ID_UNIT');
  const measure=measureScalarKey(value.value);need(measure!=='0' && !measure.startsWith('-'),'SOURCE_PRELIMINARY_POSITIVE_MEASURE');
  need(Array.isArray(value.missingParameterIds) && value.missingParameterIds.length>0 && value.missingParameterIds.length<=GROUP
    && value.missingParameterIds.every(parameterId) && new Set(value.missingParameterIds).size===value.missingParameterIds.length
    && !value.missingParameterIds.includes(value.primaryParameterId),'SOURCE_PRELIMINARY_MISSING_IDS');
  need(Array.isArray(value.deferredSelectors) && value.deferredSelectors.length===value.missingParameterIds.length,'SOURCE_PRELIMINARY_POLICIES');
  const seen=new Set<string>();
  for(const policy of value.deferredSelectors){
    need(policy!==null && typeof policy==='object' && !Array.isArray(policy),'SOURCE_PRELIMINARY_POLICY_SHAPE');
    const conditional=Object.hasOwn(policy,'requiredWhen');
    record(policy,['parameterId','required','preliminaryCompilationAllowed','valueSourceRole','guideValidationPolicy','allowedValues',...(conditional?['requiredWhen']:[])],'SOURCE_PRELIMINARY_POLICY_KEYS');
    need(parameterId(policy.parameterId) && value.missingParameterIds.includes(policy.parameterId) && !seen.has(policy.parameterId),'SOURCE_PRELIMINARY_POLICY_ID');seen.add(policy.parameterId);
    need(typeof policy.required==='boolean' && policy.preliminaryCompilationAllowed===true
      && typeof policy.valueSourceRole==='string' && /^[A-Z_]{1,128}$/u.test(policy.valueSourceRole)
      && typeof policy.guideValidationPolicy==='string' && /^[A-Z_]{1,128}$/u.test(policy.guideValidationPolicy),'SOURCE_PRELIMINARY_POLICY');
    need(Array.isArray(policy.allowedValues) && policy.allowedValues.length>0 && policy.allowedValues.length<=GROUP
      && policy.allowedValues.every(v=>typeof v==='string' && v.length>0 && v.length<=512)
      && new Set(policy.allowedValues).size===policy.allowedValues.length,'SOURCE_PRELIMINARY_ENUM_VALUES');
    if(conditional){const condition=policy.requiredWhen;record(condition,['kind','parameterId','value'],'SOURCE_PRELIMINARY_CONDITION_KEYS');
      need(condition?.kind==='greater_than' && condition.parameterId===value.primaryParameterId && condition.value===0,'SOURCE_PRELIMINARY_CONDITION');}
    else need(policy.required===true,'SOURCE_PRELIMINARY_RELEVANT_CHOICE_REQUIRED');
  }
}
function validatePhysical(value: CurrentIngressPhysicalExpectationV1): void {
  if(value?.kind==='SOURCE_PRELIMINARY_MEASURE_OR_TYPED_CLARIFICATION'){validateSourcePreliminaryExpectation(value);return;}
  need(value !== null && typeof value === 'object' && !Array.isArray(value), 'PHYSICAL_EXPECTATION_SHAPE');
  const fields = value.kind === 'EXPLICIT_PRIMARY_POSITIVE'
    ? ['kind','prompt','source','primaryParameterId','unitId','value']
    : value.kind === 'MEASURE_UNIT_VALUE' ? ['kind','prompt','source','unitId','value']
      : value.kind === 'SOURCE_NULL_PRIMARY_TYPED_CLARIFICATION'
        ? ['kind','prompt','source','missingParameterIds','forbiddenPayPrimaryIds']
        : value.kind === 'SOURCE_NULL_PRIMARY_DEFERRED_OR_TYPED_CLARIFICATION'
          ? ['kind','prompt','source','missingParameterIds','forbiddenPayPrimaryIds','contextualParameters',
            ...(Object.hasOwn(value, 'schemaPolicyPredicates') ? ['schemaPolicyPredicates'] : [])]
        : ['kind','prompt','source','missingParameterIds'];
  record(value, fields, 'PHYSICAL_EXPECTATION_KEYS'); receiptRef(value.source);
  need(typeof value.prompt === 'string' && value.prompt.trim().length > 0 && value.prompt.length <= 4000, 'PHYSICAL_PROMPT');
  if (value.kind === 'EXPLICIT_PRIMARY_POSITIVE') {
    need(parameterId(value.primaryParameterId) && (value.unitId === null || typeof value.unitId === 'string' && value.unitId.length <= 128)
      && (typeof value.value === 'string' && value.value.length <= 4096 || typeof value.value === 'boolean'
        || typeof value.value === 'number' && Number.isFinite(value.value)), 'PHYSICAL_PRIMARY_EXPECTATION');
  } else if (value.kind === 'MEASURE_UNIT_VALUE') {
    need(typeof value.unitId === 'string' && value.unitId.length > 0 && value.unitId.length <= 128, 'INDEPENDENT_MEASURE_UNIT');
    measureScalarKey(value.value); // Representation-only equality; no unit conversion or quantity formula.
  } else {
    need((value.kind === 'EXACT_TYPED_CLARIFICATION' || value.kind === 'TARGETED_TYPED_CLARIFICATION'
      || value.kind === 'SOURCE_NULL_PRIMARY_TYPED_CLARIFICATION'
      || value.kind === 'SOURCE_NULL_PRIMARY_DEFERRED_OR_TYPED_CLARIFICATION') && Array.isArray(value.missingParameterIds)
      && value.missingParameterIds.length > 0 && value.missingParameterIds.length <= GROUP
      && value.missingParameterIds.every(parameterId)
      && new Set(value.missingParameterIds).size === value.missingParameterIds.length, 'PHYSICAL_CLARIFICATION_EXPECTATION');
    if (value.kind === 'SOURCE_NULL_PRIMARY_TYPED_CLARIFICATION' || value.kind === 'SOURCE_NULL_PRIMARY_DEFERRED_OR_TYPED_CLARIFICATION') {
      need(Array.isArray(value.forbiddenPayPrimaryIds) && value.forbiddenPayPrimaryIds.length > 0
        && value.forbiddenPayPrimaryIds.length <= GROUP && value.forbiddenPayPrimaryIds.every(parameterId)
        && new Set(value.forbiddenPayPrimaryIds).size === value.forbiddenPayPrimaryIds.length, 'FORBIDDEN_CONTEXT_PAY_PRIMARY_IDS');
    }
    if (value.kind === 'SOURCE_NULL_PRIMARY_DEFERRED_OR_TYPED_CLARIFICATION') {
      need(value.contextualParameters !== null && typeof value.contextualParameters === 'object'
        && !Array.isArray(value.contextualParameters), 'CONTEXTUAL_FACTS_SHAPE');
      const context = Object.entries(value.contextualParameters);
      need(context.length > 0 && context.length <= GROUP && context.every(([id, scalar]) => parameterId(id)
        && value.forbiddenPayPrimaryIds.includes(id) && !value.missingParameterIds.includes(id)
        && (typeof scalar === 'string' && scalar.length <= 4096 || typeof scalar === 'boolean'
          || typeof scalar === 'number' && Number.isFinite(scalar))), 'INDEPENDENT_CONTEXT_FACTS');
      if (value.schemaPolicyPredicates !== undefined) {
        need(Array.isArray(value.schemaPolicyPredicates) && value.schemaPolicyPredicates.length <= GROUP, 'SCHEMA_POLICY_PREDICATES');
        for (const predicate of value.schemaPolicyPredicates) {
          need(predicate !== null && typeof predicate === 'object' && !Array.isArray(predicate), 'SCHEMA_POLICY_PREDICATE_SHAPE');
          const hasPreliminary = Object.hasOwn(predicate, 'preliminaryCompilationAllowed');
          const hasGuide = Object.hasOwn(predicate, 'guideValidationPolicy');
          record(predicate, ['parameterId', ...(hasPreliminary ? ['preliminaryCompilationAllowed'] : []),
            ...(hasGuide ? ['guideValidationPolicy'] : [])], 'SCHEMA_POLICY_PREDICATE_KEYS');
          need(parameterId(predicate.parameterId) && (hasPreliminary || hasGuide)
            && (!hasPreliminary || typeof predicate.preliminaryCompilationAllowed === 'boolean')
            && (!hasGuide || typeof predicate.guideValidationPolicy === 'string'
              && predicate.guideValidationPolicy.length > 0 && predicate.guideValidationPolicy.length <= 512), 'SCHEMA_POLICY_PREDICATE');
        }
      }
    }
  }
}
/** Decimal representation equality only: no rounding, Number(string), units,
 * engineering factors or default values. Reject ambiguous/non-decimal facts. */
function measureScalarKey(value: unknown): string {
  need(typeof value === 'string' || typeof value === 'number' && Number.isFinite(value), 'MEASURE_SCALAR_TYPE');
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  need(text.length > 0 && text.length <= 4096, 'MEASURE_SCALAR_BOUND');
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d{1,4}))?$/u.exec(text);
  if (!match) return fail('MEASURE_SCALAR_DECIMAL');
  const integral = match[2];
  if (typeof integral !== 'string') return fail('MEASURE_SCALAR_DECIMAL');
  const fraction = match[3] ?? '', exponent = match[4] ? parseInt(match[4], 10) : 0;
  need(Math.abs(exponent) <= 4096, 'MEASURE_SCALAR_EXPONENT');
  const digits = (integral + fraction).replace(/^0+/u, '');
  if (digits.length === 0) return '0';
  const coefficient = digits.replace(/0+$/u, '');
  const scale = exponent - fraction.length + digits.length - coefficient.length;
  return (match[1] === '-' ? '-' : '') + coefficient + 'e' + String(scale);
}
function ownField(value: unknown, key: string): unknown {
  need(value !== null && typeof value === 'object', 'PHYSICAL_OUTCOME_SHAPE');
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  need(descriptor && Object.hasOwn(descriptor, 'value'), 'PHYSICAL_OUTCOME_ACCESSOR');
  return descriptor!.value;
}
function optionalOwnField(value: unknown, key: string): unknown {
  need(value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null), 'DEFERRED_PARAMETERS_SHAPE');
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) return undefined;
  need(Object.hasOwn(descriptor, 'value'), 'DEFERRED_PARAMETERS_ACCESSOR');
  return descriptor!.value;
}
function contextScalarEqual(actual: unknown, expected: string | number | boolean): boolean {
  if (Object.is(actual, expected)) return true;
  // Same exact numeric representation comparison as MEASURE, not a conversion
  // of context volume into a mass/pay quantity. Other scalars remain exact.
  const decimal = /^[+-]?\d+(?:\.\d*)?(?:[eE][+-]?\d{1,4})?$/u;
  const numeric = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
    || typeof v === 'string' && decimal.test(v.trim());
  return numeric(actual) && numeric(expected) && measureScalarKey(actual) === measureScalarKey(expected);
}
function verifyDeferredFacts(
  expected: Extract<CurrentIngressPhysicalExpectationV1, {kind:'SOURCE_NULL_PRIMARY_DEFERRED_OR_TYPED_CLARIFICATION'}>,
  schema: readonly Readonly<Record<string, unknown>>[], parameters: unknown, successful: boolean,
): void {
  for (const id of expected.missingParameterIds) {
    const rows = schema.filter(row => row.parameterId === id);
    need(rows.length === 1 && rows[0]?.defaultValue == null, 'DEFERRED_MASS_SCHEMA_OR_DEFAULT_HOLD');
    if (successful) need(rows[0]?.preliminaryCompilationAllowed === true, 'DEFERRED_POLICY_NOT_ALLOWED');
    need(optionalOwnField(parameters, id) == null, 'DEFERRED_MASS_FABRICATED_OR_DEFAULT_HOLD');
  }
  for (const [id, scalar] of Object.entries(expected.contextualParameters)) {
    need(schema.filter(row => row.parameterId === id).length === 1
      && contextScalarEqual(optionalOwnField(parameters, id), scalar), 'CONTEXT_NOT_PRESERVED_SEPARATELY');
  }
  for (const predicate of expected.schemaPolicyPredicates ?? []) {
    const rows = schema.filter(row => row.parameterId === predicate.parameterId);
    need(rows.length === 1, 'EXACT_SCHEMA_POLICY_PARAMETER');
    const row = rows[0];
    if (Object.hasOwn(predicate, 'preliminaryCompilationAllowed')) {
      need(row?.preliminaryCompilationAllowed === predicate.preliminaryCompilationAllowed, 'EXACT_PRELIMINARY_POLICY_HOLD');
    }
    if (Object.hasOwn(predicate, 'guideValidationPolicy')) {
      need(ownField(row?.guide, 'guideValidationPolicy') === predicate.guideValidationPolicy, 'EXACT_GUIDE_POLICY_HOLD');
    }
  }
}
function verifySourcePreliminaryMeasure(
  expected:Extract<CurrentIngressPhysicalExpectationV1,{kind:'SOURCE_PRELIMINARY_MEASURE_OR_TYPED_CLARIFICATION'}>,
  schema:readonly Readonly<Record<string,unknown>>[],invokeExistingPlanner:(prompt:string)=>unknown,
):Readonly<{status:string;observedPrimaryParameterId:string|null;primaryIdAssurance:string}> {
  const owners=schema.filter(row=>row.parameterId===expected.primaryParameterId);
  need(owners.length===1 && owners[0]?.unitId===expected.unitId && owners[0]?.defaultValue===null
    && (owners[0]?.valueType==='decimal' || owners[0]?.valueType==='integer'),'SOURCE_PRELIMINARY_PRIMARY_SCHEMA');
  const consumers=dataOnly(ownField(owners[0],'formulaConsumers'));
  need(Array.isArray(consumers) && consumers.length>0 && consumers.every(parameterId),'SOURCE_PRELIMINARY_PRIMARY_FORMULA');
  for(const policy of expected.deferredSelectors){
    const rows=schema.filter(row=>row.parameterId===policy.parameterId);need(rows.length===1,'SOURCE_PRELIMINARY_SELECTOR_SCHEMA');const row=rows[0];
    need(row?.valueType==='enum' && row.defaultValue===null && row.required===policy.required
      && row.preliminaryCompilationAllowed===true && row.valueSourceRole===policy.valueSourceRole
      && ownField(row.guide,'guideValidationPolicy')===policy.guideValidationPolicy,'SOURCE_PRELIMINARY_EXACT_POLICY_HOLD');
    const constraints=ownField(row,'constraints');
    need(JSON.stringify(dataOnly(ownField(constraints,'values')))===JSON.stringify(policy.allowedValues),'SOURCE_PRELIMINARY_ENUM_SOURCE_DRIFT');
    if(policy.requiredWhen){const raw=row.requiredWhen ?? ownField(constraints,'requiredWhen');const condition=record(dataOnly(raw),['kind','parameterId','value'],'SOURCE_PRELIMINARY_ACTUAL_CONDITION');
      need(condition.kind===policy.requiredWhen.kind && condition.parameterId===policy.requiredWhen.parameterId && condition.value===0,'SOURCE_PRELIMINARY_CONDITION_DRIFT');}
    else need(optionalOwnField(row,'requiredWhen')==null && optionalOwnField(constraints,'requiredWhen')==null,'SOURCE_PRELIMINARY_UNDECLARED_CONDITION');
  }
  let returned:unknown,caught:unknown,didReturn=false;
  try{returned=invokeExistingPlanner(expected.prompt);didReturn=true;}catch(error){caught=error;}
  if(!didReturn){
    need(caught instanceof Error && ownField(caught,'name')==='CanonicalBaselineContractMissingError','SOURCE_PRELIMINARY_NATIVE_TYPED_REQUIRED');
    const missing=dataOnly(ownField(caught,'missingParameterIds'));
    need(Array.isArray(missing) && missing.every(parameterId) && new Set(missing).size===missing.length
      && JSON.stringify([...missing].sort())===JSON.stringify([...expected.missingParameterIds].sort()),'SOURCE_PRELIMINARY_EXACT_MISSING_IDS');
  }else need(ownField(returned,'primaryMeasureParameterId')===expected.primaryParameterId,'SOURCE_PRELIMINARY_PRIMARY_ID_HOLD');
  const parameters=dataOnly(ownField(didReturn?returned:caught,'parameters'));
  if(parameters===null || typeof parameters!=='object' || Array.isArray(parameters)) return fail('SOURCE_PRELIMINARY_PARAMETERS');
  need(measureScalarKey(ownField(parameters,expected.primaryParameterId))===measureScalarKey(expected.value),'SOURCE_PRELIMINARY_MEASURE_VALUE_HOLD');
  for(const id of expected.missingParameterIds)need(!Object.hasOwn(parameters,id),'SOURCE_PRELIMINARY_CHOICE_MUST_REMAIN_ABSENT');
  return {status:didReturn?'VERIFIED_SOURCE_PRELIMINARY_MEASURE_CHOICES_OPEN':'VERIFIED_SOURCE_PRELIMINARY_EXACT_TYPED_CHOICES_OPEN',
    observedPrimaryParameterId:didReturn?expected.primaryParameterId:null,
    primaryIdAssurance:didReturn?'INDEPENDENT_MEASURE_ONLY_UNRESOLVED_CHOICES_NOT_FULL':'NO_POSITIVE_PRIMARY_CLAIM'};
}
/** Fixed diagnostic whitelist only. Never changes verification or invokes a planner.
 * All output objects are new data-only records; unknown/accessor values are unavailable. */
export function currentIngressBoundedDiagnosticV1(input: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const result = Object.create(null) as Record<string, unknown>;
  result.contract = 'current29-four-case-bounded-diagnostic/v1'; result.unavailable = true;
  try {
    const own = (value: unknown, name: string): unknown => {
      if (value === null || typeof value !== 'object') return undefined;
      try {const d=Object.getOwnPropertyDescriptor(value,name);return d && Object.hasOwn(d,'value') ? d.value : undefined;} catch {return undefined;}
    };
    const token = (value: unknown): string | undefined => typeof value === 'string' && value.length <= 128
      && /^[A-Za-z_][A-Za-z0-9_.:-]*$/u.test(value) ? value : undefined;
    const quantity = (value: unknown): string | number | undefined => typeof value === 'number' && Number.isFinite(value) ? value
      : typeof value === 'string' && value.length <= 64 && /^[+-]?\d+(?:\.\d*)?(?:[eE][+-]?\d{1,4})?$/u.test(value) ? value : undefined;
    const unit = (value: unknown) => value === null ? null : token(value);
    const rows = own(input,'schema');
    const rowFor = (id: unknown): unknown => {
      const n=own(rows,'length');if (!token(id) || !Array.isArray(rows) || typeof n !== 'number' || !Number.isSafeInteger(n) || n>4096) return undefined;
      let found: unknown;for(let i=0;i<n;i++){const row=own(rows,String(i));if(own(row,'parameterId')===id){if(found!==undefined)return undefined;found=row;}}return found;
    };
    const record = own(input,'record'), copyRecorded = Object.hasOwn(input,'record');
    if (copyRecorded) {
      for(const key of ['expectedKind','expectedUnit','actualPrimaryId','actualUnit','originalOutcome','selectorId','selectorPolicy','selectorRole','declaredPrimaryId','declaredUnit','historicalPrimaryId','historicalUnit']) {
        const raw=own(record,key),value=raw===null && key.endsWith('Unit') ? null : token(raw);if(value!==undefined)result[key]=value;
      }
      for(const key of ['expectedValue','actualValue']){const value=quantity(own(record,key));if(value!==undefined)result[key]=value;}
      for(const key of ['selectorPresent','selectorPreliminaryAllowed','selectorRequired','unavailable','missingIdsTruncated']){const value=own(record,key);if(typeof value==='boolean')result[key]=value;}
      const name=own(record,'caughtName');if(typeof name==='string' && ['CanonicalBaselineContractMissingError','Error','TypeError','RangeError'].includes(name))result.caughtName=name;
    } else {
      const expected=own(input,'expected'),plan=own(input,'plan'),parameters=own(plan,'parameters');
      const primaryId=token(own(plan,'primaryMeasureParameterId')),primary=rowFor(primaryId);
      result.expectedKind=token(own(expected,'kind'));result.expectedValue=quantity(own(expected,'value'));result.expectedUnit=unit(own(expected,'unitId'));
      if(primary!==undefined){result.actualPrimaryId=primaryId;result.actualValue=quantity(own(parameters,primaryId!));result.actualUnit=unit(own(primary,'unitId'));}
      const returned=own(input,'returnedNormally');if(typeof returned==='boolean')result.originalOutcome=returned?'RETURNED':'THREW';
      const selectorId=token(own(input,'selectorId')),selector=rowFor(selectorId);
      if(selector!==undefined){result.selectorId=selectorId;result.selectorPresent=own(parameters,selectorId!)!=null;
        for(const [from,to] of [['required','selectorRequired'],['preliminaryCompilationAllowed','selectorPreliminaryAllowed']]){const value=own(selector,from);if(typeof value==='boolean')result[to]=value;}
        result.selectorRole=token(own(selector,'valueSourceRole'));result.selectorPolicy=token(own(own(selector,'guide'),'guideValidationPolicy'));}
      const declaredId=token(own(own(input,'declared'),'primaryMeasureParameterId'));result.declaredPrimaryId=declaredId;
      result.declaredUnit=unit(own(rowFor(declaredId),'unitId'));
      result.historicalPrimaryId=token(own(own(input,'historical'),'historicalPrimaryId'));result.historicalUnit=unit(own(own(input,'historical'),'unitId'));
      const name=own(own(input,'caught'),'name');if(typeof name==='string' && ['CanonicalBaselineContractMissingError','Error','TypeError','RangeError'].includes(name))result.caughtName=name;
      result.unavailable=false;
    }
    // Re-copy at most 16 own identifier scalars; no slice/map/getter over caller arrays.
    const ids=copyRecorded ? own(record,'missingFieldIds') : own(own(input,'caught'),'missingParameterIds'),n=own(ids,'length');
    if(Array.isArray(ids) && typeof n==='number' && Number.isSafeInteger(n) && n>=0){const safe:string[]=[];
      for(let i=0;i<Math.min(n,16);i++){const id=token(own(ids,String(i)));if(id!==undefined)safe.push(id);}
      result.missingFieldIds=safe;result.missingIdsTruncated=n>16 || own(record,'missingIdsTruncated')===true;}
    for(const key of ['actualPrimaryId','actualValue','actualUnit','originalOutcome','caughtName','selectorPreliminaryAllowed','selectorPolicy','declaredPrimaryId','declaredUnit','historicalPrimaryId','historicalUnit'])result[key+'Unavailable']=result[key]===undefined;
    for(const key of Object.keys(result))if(result[key]===undefined)delete result[key];
  } catch {result.unavailable=true;}
  return result;
}
/** Assertions around the ORIGINAL caller-supplied synchronous shared planner,
 * not another planner/parser. Exact expectations are independent input data. */
function verifyPhysical(
  expected: CurrentIngressPhysicalExpectationV1,
  schema: readonly Readonly<Record<string, unknown>>[],
  invokeExistingPlanner: (prompt: string) => unknown,
): Readonly<{status:string; observedPrimaryParameterId:string|null; primaryIdAssurance:string}> {
  if(expected.kind==='SOURCE_PRELIMINARY_MEASURE_OR_TYPED_CLARIFICATION')return verifySourcePreliminaryMeasure(expected,schema,invokeExistingPlanner);
  if (expected.kind === 'EXPLICIT_PRIMARY_POSITIVE' || expected.kind === 'MEASURE_UNIT_VALUE') {
    let observedPlan: unknown;
    try {
    const plan = invokeExistingPlanner(expected.prompt); observedPlan = plan;
    const primaryId = ownField(plan, 'primaryMeasureParameterId');
    need(parameterId(primaryId), 'ACTUAL_PRIMARY_MUST_EXIST');
    if (!parameterId(primaryId)) return fail('ACTUAL_PRIMARY_MUST_EXIST');
    if (expected.kind === 'EXPLICIT_PRIMARY_POSITIVE') need(primaryId === expected.primaryParameterId, 'PHYSICAL_PRIMARY_ID_HOLD');
    const parameters = ownField(plan, 'parameters');
    need(parameters !== null && typeof parameters === 'object' && !Array.isArray(parameters), 'PHYSICAL_PARAMETERS');
    const actualValue = ownField(parameters, primaryId);
    if (expected.kind === 'EXPLICIT_PRIMARY_POSITIVE') need(Object.is(actualValue, expected.value), 'PHYSICAL_EXPLICIT_VALUE_HOLD');
    else need(measureScalarKey(actualValue) === measureScalarKey(expected.value), 'PHYSICAL_MEASURE_VALUE_HOLD');
    const owners = schema.filter(row => row.parameterId === primaryId);
    need(owners.length === 1 && owners[0]?.unitId === expected.unitId, 'PHYSICAL_PRIMARY_UNIT_HOLD');
    const formulaConsumers = owners[0]?.formulaConsumers;
    need(Array.isArray(formulaConsumers) && formulaConsumers.length > 0, 'PHYSICAL_FORMULA_CONNECTED_HOLD');
    return {status:expected.kind === 'EXPLICIT_PRIMARY_POSITIVE' ? 'VERIFIED_EXPLICIT_PRIMARY' : 'VERIFIED_MEASURE_UNIT_VALUE',
      observedPrimaryParameterId:primaryId, primaryIdAssurance:expected.kind === 'EXPLICIT_PRIMARY_POSITIVE'
        ? 'INDEPENDENT_EXACT_ID' : 'OBSERVED_FROM_ORIGINAL_PLANNER_NOT_PREBOUND'};
    } catch (physicalError) {
      if(expected.kind==='MEASURE_UNIT_VALUE' && expected.prompt==='Установка и выверка анкерных групп по шаблону, количество 10 шт., по 4 болта М24 класса 8.8') {
        try {if(physicalError && typeof physicalError==='object')Object.defineProperty(physicalError,'currentIngressDiagnostic',
          {value:currentIngressBoundedDiagnosticV1({expected,plan:observedPlan,schema}),enumerable:true});} catch { /* unavailable, original error wins */ }
      }
      throw physicalError;
    }
  }
  let caught: unknown, returned: unknown; let returnedNormally=false;
  try {returned = invokeExistingPlanner(expected.prompt); returnedNormally=true;} catch (error) {caught = error;}
  if (caught === undefined && (expected.kind === 'SOURCE_NULL_PRIMARY_TYPED_CLARIFICATION'
    || expected.kind === 'SOURCE_NULL_PRIMARY_DEFERRED_OR_TYPED_CLARIFICATION')) {
    const primaryId = ownField(returned, 'primaryMeasureParameterId');
    need(typeof primaryId !== 'string' || !expected.forbiddenPayPrimaryIds.includes(primaryId), 'SOURCE_CONTEXT_AS_PAY_PRIMARY_FORBIDDEN');
    if (expected.kind === 'SOURCE_NULL_PRIMARY_DEFERRED_OR_TYPED_CLARIFICATION') {
      if (!parameterId(primaryId)) return fail('DEFERRED_ACTUAL_PRIMARY_MUST_EXIST');
      const owners = schema.filter(row => row.parameterId === primaryId), formula = owners[0]?.formulaConsumers;
      need(owners.length === 1 && Array.isArray(formula) && formula.length > 0, 'DEFERRED_FORMULA_CONNECTED_PRIMARY');
      const parameters = ownField(returned, 'parameters');
      verifyDeferredFacts(expected, schema, parameters, true);
      need(owners[0]?.defaultValue == null && optionalOwnField(parameters, primaryId) == null, 'DEFERRED_PRIMARY_PAY_QUANTITY_FORBIDDEN');
      return {status:'DEFERRED_NEEDS_NO_POSITIVE_PAY_QUANTITY_CLAIM', observedPrimaryParameterId:primaryId,
        primaryIdAssurance:'OBSERVED_DEFERRED_PRIMARY_NO_POSITIVE_QUANTITY_CLAIM'};
    }
    fail('SOURCE_NULL_PRIMARY_EXPECTED_MISSING_FACTS'); // No successful alternative primary is accepted either.
  }
  try {
    need(caught instanceof Error && ownField(caught, 'name') === 'CanonicalBaselineContractMissingError', 'EXPECTED_REAL_TYPED_CLARIFICATION');
  } catch (physicalError) {
    if(expected.kind==='TARGETED_TYPED_CLARIFICATION' && expected.missingParameterIds.length===1
      && ['pvc15_base','interior_plaster_material_system'].includes(expected.missingParameterIds[0])) {
      try {if(physicalError && typeof physicalError==='object')Object.defineProperty(physicalError,'currentIngressDiagnostic',
        {value:currentIngressBoundedDiagnosticV1({expected,plan:returned,caught,returnedNormally,schema,selectorId:expected.missingParameterIds[0]}),enumerable:true});} catch { /* unavailable, original error wins */ }
    }
    throw physicalError;
  }
  const missing = dataOnly(ownField(caught, 'missingParameterIds'));
  need(Array.isArray(missing) && missing.every(parameterId)
    && new Set(missing).size === missing.length
    && (expected.kind === 'EXACT_TYPED_CLARIFICATION'
      ? JSON.stringify([...missing].sort()) === JSON.stringify([...expected.missingParameterIds].sort())
      : expected.missingParameterIds.every(id => missing.includes(id)))
    && expected.missingParameterIds.every(id => schema.some(row => row.parameterId === id)), 'PHYSICAL_MISSING_IDS_HOLD');
  if (expected.kind === 'SOURCE_NULL_PRIMARY_DEFERRED_OR_TYPED_CLARIFICATION') {
    verifyDeferredFacts(expected, schema, ownField(caught, 'parameters'), false);
  }
  return {status:expected.kind === 'EXACT_TYPED_CLARIFICATION' ? 'VERIFIED_TYPED_CLARIFICATION'
    : expected.kind === 'SOURCE_NULL_PRIMARY_TYPED_CLARIFICATION' || expected.kind === 'SOURCE_NULL_PRIMARY_DEFERRED_OR_TYPED_CLARIFICATION'
      ? 'VERIFIED_SOURCE_NULL_PRIMARY_MISSING_FACTS_NO_PAY_PRIMARY'
      : 'VERIFIED_TARGETED_CLARIFICATION_OTHER_MISSING_OPEN', observedPrimaryParameterId:null,
    primaryIdAssurance:'NO_POSITIVE_PRIMARY_CLAIM'};
}

// Nine ORIGINAL storage columns. The full-source hash uses the untrimmed truth.
const tuple = (truth: string): string => `jsonb_build_array(p.parameter_id,p.ordinal,p.value_type,p.unit_id,
 p.title_ru,p.required,p.default_value,p.constraints_json,${truth})`;
const truthKeysSql = CURRENT_TRUTH_KEYS_V1.map(key => `'${key}'`).join(',');
const transportTruth = `case when jsonb_typeof(p.truth_metadata)='object' then
 (select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb)
 from jsonb_each(p.truth_metadata) e where e.key=any(array[${truthKeysSql}]::text[]))
 else p.truth_metadata end`;
const selectedSql = `select d.id,d.catalog_id,d.definition_version,d.definition_sha256
 from estimate_cumulative_manifest_entry m join estimate_definition_version d on d.id=m.definition_version_id
 where m.release_id=$1 and m.catalog_id=$2 and d.catalog_id=m.catalog_id and d.id=$3::uuid limit 2`;
export const CURRENT_INGRESS_SESSION_SQL_V1 = `select pg_backend_pid() as backend_pid,
 current_setting('transaction_read_only') as read_only,current_setting('transaction_isolation') as isolation,
 current_setting('TimeZone') as timezone`;
/** Hash domain is ALL9 parameter storage columns plus definition identity. It
 * is neither a raw rowtext hash nor a hash of every resource/formula/definition. */
export const CURRENT_INGRESS_HEADER_SQL_V1 = `select header from (with selected as materialized(${selectedSql}),
 parameters as materialized(select p.* from estimate_parameter_definition p
 join selected d on p.definition_version_id=d.id order by p.ordinal,p.parameter_id limit 4097)
 select jsonb_build_object('catalogId',d.catalog_id,'definitionVersionId',d.id,
 'definitionVersion',d.definition_version,'definitionSha256',d.definition_sha256,
 'parameterCount',(select count(*) from parameters),
 'orderedParameterIdsSha256',(select encode(sha256(convert_to(array_to_json(array_agg(p.parameter_id order by p.ordinal,p.parameter_id))::text,'UTF8')),'hex') from parameters p),
 'fullSourceSha256',case when (select count(*) from parameters) between 1 and 4096 then
 (select encode(sha256(convert_to(jsonb_build_object('contract','pg-unprojected-parameter-storage9/v1',
 'catalogId',d.catalog_id,'definitionVersionId',d.id,'definitionVersion',d.definition_version,
 'definitionSha256',d.definition_sha256,'parameters',jsonb_agg(${tuple('p.truth_metadata')} order by p.ordinal,p.parameter_id))::text,'UTF8')),'hex') from parameters p)
 else null end) as header from selected d where (select count(*) from selected)=1 limit 2) current_header`;
const currentGroupSql = (fixedPredicate: string): string => `select tuple from (with selected as materialized(${selectedSql}),
 emitted as materialized(select ${tuple(transportTruth)} as tuple
 from estimate_parameter_definition p join selected d on p.definition_version_id=d.id
 where ${fixedPredicate} and (select count(*) from selected)=1
 order by p.ordinal,p.parameter_id limit 52), measured as materialized(
 select tuple,octet_length(jsonb_build_object('tuple',tuple)::text) as bytes from emitted)
 select case when count(*) over ()<=51 and max(bytes) over ()<=524288
 and sum(bytes) over ()+count(*) over ()+1<=1048576 then tuple
 else jsonb_build_object('gate','CURRENT_INGRESS_DTO_RESOURCE_HOLD') end as tuple
 from measured limit 52) current_group`;
export const CURRENT_INGRESS_GROUP_SQL_V1 = currentGroupSql('p.parameter_id=any($4::text[])');
export const CURRENT_INGRESS_PUBLISHED_GROUP_SQL_V1 = currentGroupSql('p.ordinal >= $4::integer and p.ordinal < $5::integer');

/** A single declared catalog unit. Caller-supplied functions receive ONLY these
 * three fixed SELECTs. Prefix rows are real cohort-control rows assigned to this
 * unit (including any before/after vectors); no measured byte count is trusted. */
export async function readCurrentIngressCatalogTuplesV1(input: Readonly<{
  declaration: CurrentIngressExpectedV1; releaseId: string; expectedBackendPid: number;
  select: CurrentIngressFixedSelectV1; assignedControlRows: readonly unknown[];
}>) {
  const releaseId = input.releaseId, expectedBackendPid = input.expectedBackendPid, selectFixed = input.select;
  const controls = dataOnly(input.assignedControlRows);
  need(Array.isArray(controls), 'CONTROL_ROWS');
  const expected = freezeDeep(dataOnly(input.declaration)) as CurrentIngressExpectedV1;
  need(expected !== null && typeof expected === 'object' && !Array.isArray(expected), 'DECLARATION_SHAPE');
  need(typeof expected.catalogId === 'string' && /^canonical-work:(?:base|expanded|master):[a-z0-9_:-]+$/u.test(expected.catalogId)
    && isUuid(expected.definitionVersionId) && isUuid(releaseId), 'DECLARATION_IDENTITY');
  need(Number.isSafeInteger(expected.parameterCount) && expected.parameterCount > 0 && expected.parameterCount <= TABLE, 'DECLARATION_COUNT');
  if (expected.evidenceMode === 'ARCHIVED_COMPLETE_DTO') {
    record(expected, ['evidenceMode','catalogId','definitionVersionId','definitionVersion','definitionSha256','parameterCount',
      'orderedParameterIds','orderedParameterIdsSha256','expectedDtoSha256'], 'ARCHIVED_DECLARATION_KEYS');
    need(Number.isSafeInteger(expected.definitionVersion) && expected.definitionVersion > 0
      && isHash(expected.definitionSha256) && isHash(expected.expectedDtoSha256), 'ARCHIVED_INDEPENDENT_HASH');
    need(Array.isArray(expected.orderedParameterIds) && expected.orderedParameterIds.length === expected.parameterCount
      && expected.orderedParameterIds.every(parameterId) && new Set(expected.orderedParameterIds).size === expected.parameterCount
      && hash(JSON.stringify(expected.orderedParameterIds)) === expected.orderedParameterIdsSha256, 'DECLARATION_ORDER');
  } else {
    need(expected.evidenceMode === 'PUBLISHED_IDENTITY_SCOPED_INGRESS', 'EVIDENCE_MODE_REQUIRED');
    record(expected, ['evidenceMode','catalogId','definitionVersionId','parameterCount','independentReceipt',
      'versionEvidence','definitionHashEvidence','physicalExpectation'], 'PUBLISHED_DECLARATION_KEYS');
    receiptRef(expected.independentReceipt); validatePhysical(expected.physicalExpectation);
    const version = expected.versionEvidence, definitionHash = expected.definitionHashEvidence;
    need(version !== null && typeof version === 'object' && !Array.isArray(version)
      && definitionHash !== null && typeof definitionHash === 'object' && !Array.isArray(definitionHash), 'EVIDENCE_SHAPE');
    record(version, version.kind === 'INDEPENDENT' ? ['kind','value'] : ['kind'], 'VERSION_EVIDENCE_KEYS');
    need(version.kind === 'OBSERVED_WITNESS_ONLY' || version.kind === 'INDEPENDENT'
      && Number.isSafeInteger(version.value) && version.value > 0, 'VERSION_EVIDENCE');
    record(definitionHash, definitionHash.kind === 'INDEPENDENT' ? ['kind','value'] : ['kind'], 'HASH_EVIDENCE_KEYS');
    need(definitionHash.kind === 'OBSERVED_WITNESS_ONLY' || definitionHash.kind === 'INDEPENDENT'
      && isHash(definitionHash.value), 'HASH_EVIDENCE');
  }
  need(Number.isSafeInteger(expectedBackendPid) && expectedBackendPid > 0, 'BACKEND_PID');
  const expectedHash = hash(JSON.stringify(expected));
  let bytes = Buffer.byteLength(JSON.stringify(expected), 'utf8'), selects = 0;
  need(bytes <= CATALOG, 'DECLARATION_BYTES_HOLD');
  const charge = (rows: unknown): unknown[] => {
    const detached = dataOnly(rows);
    need(Array.isArray(detached) && detached.length <= TABLE, 'ROWS_SHAPE');
    const array = detached as unknown[];
    need(array.every(row => Buffer.byteLength(JSON.stringify(row), 'utf8') <= ROW), 'ROW_BYTES_HOLD');
    const size = Buffer.byteLength(JSON.stringify(array), 'utf8');
    need(size <= WIRE, 'WIRE_BYTES_HOLD');
    bytes += size; need(bytes <= CATALOG, 'CATALOG_BYTES_HOLD');
    return array;
  };
  // Every assigned control response remains one independently measured response.
  for (const rows of controls as unknown[]) charge(rows);
  const read = async (sql: string, values: readonly unknown[], maximumRows: number) => {
    need(hash(JSON.stringify(expected)) === expectedHash, 'DECLARATION_MUTATED');
    selects++;
    const rows = charge(await selectFixed(sql, values, maximumRows));
    need(rows.length <= maximumRows, 'ROW_COUNT_HOLD');
    return rows;
  };
  const sessionRows = await read(CURRENT_INGRESS_SESSION_SQL_V1, [], 1);
  need(sessionRows.length === 1, 'SESSION_CARDINALITY');
  const session = record(sessionRows[0], ['backend_pid','read_only','isolation','timezone'], 'SESSION_SHAPE');
  need(session.backend_pid === expectedBackendPid && session.read_only === 'on'
    && session.isolation === 'repeatable read' && session.timezone === 'UTC', 'SAME_READ_ONLY_RR_REQUIRED');
  const values = Object.freeze([releaseId, expected.catalogId, expected.definitionVersionId]);
  const header = async () => {
    const rows = await read(CURRENT_INGRESS_HEADER_SQL_V1, values, 1);
    need(rows.length === 1, 'SELECTED_HEADER_CARDINALITY');
    const value = record(rows[0], ['header'], 'HEADER_ROW').header;
    const h = record(value, ['catalogId','definitionVersionId','definitionVersion','definitionSha256',
      'parameterCount','orderedParameterIdsSha256','fullSourceSha256'], 'HEADER_KEYS');
    need(h.catalogId === expected.catalogId && h.definitionVersionId === expected.definitionVersionId
      && h.parameterCount === expected.parameterCount, 'INDEPENDENT_HEADER_OR_COUNT_HOLD');
    const observedVersion = h.definitionVersion, observedDefinitionHash = h.definitionSha256;
    need(typeof observedVersion === 'number' && Number.isSafeInteger(observedVersion) && observedVersion > 0, 'OBSERVED_VERSION_SHAPE');
    if (expected.evidenceMode === 'ARCHIVED_COMPLETE_DTO') {
      need(observedVersion === expected.definitionVersion && observedDefinitionHash === expected.definitionSha256
        && h.orderedParameterIdsSha256 === expected.orderedParameterIdsSha256, 'ARCHIVED_INDEPENDENT_HEADER_HOLD');
    } else {
      if (expected.versionEvidence.kind === 'INDEPENDENT') need(observedVersion === expected.versionEvidence.value, 'PUBLISHED_INDEPENDENT_VERSION_HOLD');
      if (expected.definitionHashEvidence.kind === 'INDEPENDENT') need(observedDefinitionHash === expected.definitionHashEvidence.value, 'PUBLISHED_INDEPENDENT_DEFINITION_HASH_HOLD');
      else need(observedDefinitionHash === null || isHash(observedDefinitionHash), 'OBSERVED_DEFINITION_HASH_SHAPE');
    }
    const sourceSha = h.fullSourceSha256;
    const orderedSha = h.orderedParameterIdsSha256;
    if (!isHash(sourceSha) || !isHash(orderedSha)) fail('FULL_SOURCE_OR_ORDER_HASH');
    return freezeDeep({...h, fullSourceSha256: sourceSha, orderedParameterIdsSha256: orderedSha,
      definitionVersion: observedVersion, definitionSha256: observedDefinitionHash});
  };
  const first = await header();
  const storageRows: Readonly<Record<string, unknown>>[] = [];
  for (let offset = 0; offset < expected.parameterCount; offset += GROUP) {
    // Archived independent ID subsets or published independent-count ordinal
    // subsets; never SQL OFFSET/cursor/first-read-expected pagination.
    const ids = expected.evidenceMode === 'ARCHIVED_COMPLETE_DTO'
      ? Object.freeze(expected.orderedParameterIds.slice(offset, offset + GROUP)) : undefined;
    const groupCount = ids ? ids.length : Math.min(GROUP, expected.parameterCount - offset);
    const sql = ids ? CURRENT_INGRESS_GROUP_SQL_V1 : CURRENT_INGRESS_PUBLISHED_GROUP_SQL_V1;
    const groupValues = ids ? [...values, ids] : [...values, offset, offset + groupCount];
    const rows = await read(sql, groupValues, groupCount);
    need(rows.length === groupCount, 'GROUP_INCOMPLETE_HOLD');
    for (let index = 0; index < rows.length; index++) {
      const tupleValue = record(rows[index], ['tuple'], 'TUPLE_ROW').tuple;
      need(Array.isArray(tupleValue) && tupleValue.length === 9, 'TUPLE9_SHAPE');
      const t = tupleValue as unknown[];
      need(parameterId(t[0]) && (!ids || t[0] === ids[index])
        && typeof t[1] === 'number' && Number.isSafeInteger(t[1]) && t[1] >= 0 && (ids || t[1] === offset + index)
        && typeof t[2] === 'string' && (t[3] === null || typeof t[3] === 'string')
        && typeof t[4] === 'string' && typeof t[5] === 'boolean', 'TUPLE_STORAGE_SHAPE');
      if (t[8] !== null && typeof t[8] === 'object' && !Array.isArray(t[8])) {
        need(Object.keys(t[8]).every(key => (CURRENT_TRUTH_KEYS_V1 as readonly string[]).includes(key)), 'TRUTH_EXTRA_KEY');
      }
      storageRows.push(freezeDeep({parameter_id:t[0],ordinal:t[1],value_type:t[2],unit_id:t[3],title_ru:t[4],
        required:t[5],default_value:t[6],constraints_json:t[7],truth_metadata:t[8]}));
    }
  }
  const observedIds = storageRows.map(row => row.parameter_id);
  need(storageRows.length === expected.parameterCount && new Set(observedIds).size === expected.parameterCount, 'COMPLETE_UNIQUE_UNION_HOLD');
  const observedIdsHash = hash(JSON.stringify(observedIds));
  if (expected.evidenceMode === 'ARCHIVED_COMPLETE_DTO') need(observedIdsHash === expected.orderedParameterIdsSha256, 'ORDERED_UNION_HOLD');
  else need(observedIdsHash === first.orderedParameterIdsSha256, 'PUBLISHED_ORDER_SELF_CONSISTENCY_HOLD');
  Object.freeze(storageRows);
  const storageHash = hash(JSON.stringify(storageRows));
  const second = await header();
  need(JSON.stringify(first) === JSON.stringify(second) && storageHash === hash(JSON.stringify(storageRows)), 'SOURCE_OR_CACHE_CHANGED');
  const parameterSchema = freezeDeep(storageRows.map(canonicalCatalogParameterStorageViewV1));
  const dtoSha256 = hash(JSON.stringify(parameterSchema));
  need(storageHash === hash(JSON.stringify(storageRows)), 'CACHE_HOLD');
  if (expected.evidenceMode === 'ARCHIVED_COMPLETE_DTO') need(dtoSha256 === expected.expectedDtoSha256, 'INDEPENDENT_DTO_OR_CACHE_HOLD');
  let physicalVerification = expected.evidenceMode === 'ARCHIVED_COMPLETE_DTO' ? 'EXISTING_ARCHIVED_CALLER_OBLIGATION' : 'REQUIRED_PENDING';
  let observedPrimaryParameterId: string | null = null, primaryIdAssurance = 'NOT_VERIFIED';
  const witness = () => ({contract:CURRENT_INGRESS_TUPLE_PROFILE_V1, catalogId:expected.catalogId,
    dtoSha256, fullSourceSha256:first.fullSourceSha256, fullSourceHashContract:'pg-unprojected-parameter-storage9/v1',
    parameterCount:expected.parameterCount, chargedCatalogBytes:bytes, selectCount:selects,
    evidenceMode:expected.evidenceMode, independentDtoHashVerified:expected.evidenceMode === 'ARCHIVED_COMPLETE_DTO',
    independentOrderedIdsVerified:expected.evidenceMode === 'ARCHIVED_COMPLETE_DTO',
    observedOrderedIdsSha256:observedIdsHash, physicalVerification,
    observedPrimaryParameterId, primaryIdAssurance,
    physicalExpectationKind:expected.evidenceMode === 'ARCHIVED_COMPLETE_DTO' ? 'EXISTING_ARCHIVED_CALLER_OBLIGATION' : expected.physicalExpectation.kind,
    versionAssurance:expected.evidenceMode === 'ARCHIVED_COMPLETE_DTO' ? 'INDEPENDENT' : expected.versionEvidence.kind,
    definitionHashAssurance:expected.evidenceMode === 'ARCHIVED_COMPLETE_DTO' ? 'INDEPENDENT' : expected.definitionHashEvidence.kind,
    observedDefinitionVersion:first.definitionVersion, observedDefinitionSha256:first.definitionSha256,
    sourceAdmission:false as const, runtimeAdmission:false as const, full:false as const});
  return {parameterSchema, witness,
    verifyPublishedPhysical: (invokeExistingPlanner: (prompt: string) => unknown) => {
      need(expected.evidenceMode === 'PUBLISHED_IDENTITY_SCOPED_INGRESS', 'PUBLISHED_PHYSICAL_MODE_ONLY');
      if (expected.evidenceMode !== 'PUBLISHED_IDENTITY_SCOPED_INGRESS') return fail('PUBLISHED_PHYSICAL_MODE_ONLY');
      physicalVerification = 'IN_PROGRESS';
      observedPrimaryParameterId = null; primaryIdAssurance = 'NOT_VERIFIED';
      try {
        need(hash(JSON.stringify(parameterSchema)) === dtoSha256 && hash(JSON.stringify(storageRows)) === storageHash, 'CACHE_MUTATED');
        const physical = verifyPhysical(expected.physicalExpectation, parameterSchema, invokeExistingPlanner);
        physicalVerification = physical.status; observedPrimaryParameterId = physical.observedPrimaryParameterId;
        primaryIdAssurance = physical.primaryIdAssurance;
        need(hash(JSON.stringify(parameterSchema)) === dtoSha256 && hash(JSON.stringify(storageRows)) === storageHash, 'CACHE_MUTATED');
        return witness();
      } catch (error) {physicalVerification = 'FAILED'; observedPrimaryParameterId = null; primaryIdAssurance = 'NOT_VERIFIED'; throw error;}
    },
    // Same live counter for cohort controls arriving AFTER this catalog. The
    // outer owner must take witness() only after allocating all control reads.
    chargeAdditionalControlRows: (rows: unknown) => {charge(rows); return witness();},
    assertUnchanged: () => need(hash(JSON.stringify(parameterSchema)) === dtoSha256
      && hash(JSON.stringify(storageRows)) === storageHash && hash(JSON.stringify(expected)) === expectedHash, 'CACHE_MUTATED'),
    cohortSourceVectorGuards:'REQUIRED_CALLER_NOT_PROVEN' as const,
    sourceAdmission:false as const, runtimeAdmission:false as const, full:false as const};
}

/** Test-boundary access to the same V6 assertion engine; no second parser or calculation. */
export function verifyCurrentIngressPhysicalExpectationV1(
  expected: CurrentIngressPhysicalExpectationV1,
  schema: readonly Readonly<Record<string, unknown>>[],
  invokeExistingPlanner: (prompt: string) => unknown,
) {
  validatePhysical(expected);
  return verifyPhysical(expected, schema, invokeExistingPlanner);
}