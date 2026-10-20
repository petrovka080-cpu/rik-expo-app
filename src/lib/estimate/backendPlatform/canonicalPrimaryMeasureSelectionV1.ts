/** Optional generic catalog contract, selected explicitly by definition metadata.
 * No SKU, conversion, quantity inference, network, writer or runtime dependency.
 * Shared by the ordinary client and canonical server; no quantity conversion.
 */
export const PRIMARY_MEASURE_SELECTION_V1 = 'canonical-primary-measure-selection/v1' as const;

export type PrimaryMeasureSelectionV1 = Readonly<{
  contract: typeof PRIMARY_MEASURE_SELECTION_V1;
  selectorParameterId: string;
  selections: readonly Readonly<{
    selectorValue: string;
    primaryMeasureParameterId: string;
    unitId: string;
  }>[];
}>;

/** Matches the existing normalized catalog parameter fields. The server adapter
 * supplies the same fields from DB definitions and real formula dependencies.
 * No caller-supplied primary or unit is trusted without this catalog check.
 */
export type PrimaryMeasureSelectionParameterV1 = Readonly<{
  parameterId: string;
  valueType: string;
  unitId?: string | null;
  visibilityRole?: string | null;
  constraints?: Readonly<Record<string, unknown>>;
  formulaConsumers?: readonly string[];
}>;

export type PrimaryMeasureIdentityV1 = Readonly<{parameterId: string; unitId: string}>;
export type PrimaryMeasureSelectionIssueV1 =
  | 'INVALID_METADATA'
  | 'AMBIGUOUS_METADATA'
  | 'INVALID_PARAMETER_SCHEMA'
  | 'INVALID_SELECTOR_DEFINITION'
  | 'INCOMPLETE_SELECTOR_COVERAGE'
  | 'INVALID_PRIMARY_DEFINITION'
  | 'SELECTION_REQUIRED'
  | 'UNKNOWN_SELECTION'
  | 'EXPLICIT_PRIMARY_MISMATCH'
  | 'INVALID_PARENT_PRIMARY';

export type PrimaryMeasureSelectionResultV1 =
  | Readonly<{kind: 'LEGACY_PATH_UNCHANGED'}>
  | Readonly<{
      kind: 'CLARIFICATION_REQUIRED';
      reason: PrimaryMeasureSelectionIssueV1;
      selectorParameterId?: string;
      allowedSelectorValues?: readonly string[];
      questionRu: string;
    }>
  | Readonly<{
      kind: 'RESOLVED';
      primaryMeasure: PrimaryMeasureIdentityV1;
      selectorParameterId: string;
      selectorValue: string;
    }>
  | Readonly<{
      kind: 'NEW_ROOT_REQUIRED';
      primaryMeasure: PrimaryMeasureIdentityV1;
      parentPrimaryMeasure: PrimaryMeasureIdentityV1;
      selectorParameterId: string;
      selectorValue: string;
      carryForward: Readonly<{parameters: false; rowOverrides: false; prices: false}>;
      questionRu: string;
    }>;

const record = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const id = (x: unknown): x is string =>
  typeof x === 'string' && /^[A-Za-z][A-Za-z0-9_.:-]{0,199}$/u.test(x);
const value = (x: unknown): x is string =>
  typeof x === 'string' && x.trim().length > 0 && x.length <= 1000;

/** Absence is deliberately different from malformed/null metadata. The former
 * returns control to the unchanged legacy chooser; the latter never silently
 * selects ordinal-zero q. Only an explicit finite enum branch is supported by
 * v1. Existing quantity/default/requiredWhen validation remains authoritative.
 */
export function resolvePrimaryMeasureSelectionV1(input: Readonly<{
  selectionMetadata?: unknown;
  parameterSchema: readonly PrimaryMeasureSelectionParameterV1[];
  submittedParameters: Readonly<Record<string, unknown>>;
  explicitPrimaryMeasureParameterId?: unknown;
  parentPrimaryMeasure?: unknown;
}>): PrimaryMeasureSelectionResultV1 {
  if (input.selectionMetadata === undefined) return {kind: 'LEGACY_PATH_UNCHANGED'};
  const clarify = (reason: PrimaryMeasureSelectionIssueV1, selectorParameterId?: string,
    allowedSelectorValues?: readonly string[]): PrimaryMeasureSelectionResultV1 => ({
    kind: 'CLARIFICATION_REQUIRED', reason,
    ...(selectorParameterId === undefined ? {} : {selectorParameterId}),
    ...(allowedSelectorValues === undefined ? {} : {allowedSelectorValues: [...allowedSelectorValues]}),
    questionRu: reason === 'SELECTION_REQUIRED' || reason === 'UNKNOWN_SELECTION'
      ? 'Выберите состав работ. После выбора укажите объём в его единице измерения.'
      : 'Выбор основной меры не подтверждён. Уточните состав и единицу; расчёт не продолжен.',
  });
  const m = input.selectionMetadata;
  if (!record(m) || m.contract !== PRIMARY_MEASURE_SELECTION_V1 || !id(m.selectorParameterId)
      || !Array.isArray(m.selections) || m.selections.length < 1 || m.selections.length > 64) {
    return clarify('INVALID_METADATA');
  }
  const selectorId = m.selectorParameterId;
  const selections: {selectorValue: string; primaryMeasureParameterId: string; unitId: string}[] = [];
  for (const s of m.selections) {
    if (!record(s) || !value(s.selectorValue) || !id(s.primaryMeasureParameterId) || !id(s.unitId)) {
      return clarify('INVALID_METADATA', selectorId);
    }
    if (selections.some(previous => previous.selectorValue === s.selectorValue)) {
      return clarify('AMBIGUOUS_METADATA', selectorId);
    }
    selections.push({selectorValue: s.selectorValue, primaryMeasureParameterId: s.primaryMeasureParameterId, unitId: s.unitId});
  }
  const byId = new Map<string, PrimaryMeasureSelectionParameterV1>();
  for (const p of input.parameterSchema) {
    if (!record(p) || !id(p.parameterId) || byId.has(p.parameterId)) {
      return clarify('INVALID_PARAMETER_SCHEMA', selectorId);
    }
    byId.set(p.parameterId, p);
  }
  const selector = byId.get(selectorId), domain = selector?.constraints?.values;
  if (!selector || selector.valueType !== 'enum' || selector.visibilityRole !== 'USER_INPUT'
      || !Array.isArray(domain) || domain.length < 1 || domain.length > 64
      || !domain.every(value) || new Set(domain).size !== domain.length) {
    return clarify('INVALID_SELECTOR_DEFINITION', selectorId);
  }
  if (domain.length !== selections.length || domain.some(v => !selections.some(s => s.selectorValue === v))) {
    return clarify('INCOMPLETE_SELECTOR_COVERAGE', selectorId);
  }
  for (const s of selections) {
    const p = byId.get(s.primaryMeasureParameterId);
    if (!p || (p.valueType !== 'integer' && p.valueType !== 'decimal')
        || p.visibilityRole !== 'USER_INPUT' || p.unitId !== s.unitId
        || !Array.isArray(p.formulaConsumers) || p.formulaConsumers.length < 1
        || !p.formulaConsumers.every(id)) {
      return clarify('INVALID_PRIMARY_DEFINITION', selectorId);
    }
  }
  const hasSelection = Object.prototype.hasOwnProperty.call(input.submittedParameters, selectorId);
  const selectedValue = hasSelection ? input.submittedParameters[selectorId] : undefined;
  if (selectedValue === undefined || selectedValue === null || selectedValue === '') {
    return clarify('SELECTION_REQUIRED', selectorId, domain);
  }
  const selected = selections.find(s => s.selectorValue === selectedValue);
  if (!selected) return clarify('UNKNOWN_SELECTION', selectorId, domain);
  const primaryMeasure = {parameterId: selected.primaryMeasureParameterId, unitId: selected.unitId};
  if (input.explicitPrimaryMeasureParameterId !== undefined
      && input.explicitPrimaryMeasureParameterId !== primaryMeasure.parameterId) {
    return clarify('EXPLICIT_PRIMARY_MISMATCH', selectorId, domain);
  }
  if (input.parentPrimaryMeasure !== undefined) {
    const parent = input.parentPrimaryMeasure;
    if (!record(parent) || !id(parent.parameterId) || !id(parent.unitId)) {
      return clarify('INVALID_PARENT_PRIMARY', selectorId, domain);
    }
    if (parent.parameterId !== primaryMeasure.parameterId || parent.unitId !== primaryMeasure.unitId) {
      return {
        kind: 'NEW_ROOT_REQUIRED', primaryMeasure,
        parentPrimaryMeasure: {parameterId: parent.parameterId, unitId: parent.unitId},
        selectorParameterId: selectorId, selectorValue: selected.selectorValue,
        carryForward: {parameters: false, rowOverrides: false, prices: false},
        questionRu: 'У сохранённой сметы другая основная мера. Создайте новую смету и отдельно укажите её объём и цены.',
      };
    }
  }
  return {kind: 'RESOLVED', primaryMeasure, selectorParameterId: selectorId, selectorValue: selected.selectorValue};
}

/** The worker validates the definition's schema, never a caller-supplied unit.
 * A different saved primary identity requires a new estimate with fresh inputs. */
export function assertCanonicalPrimaryMeasureSelectionV1(input: Parameters<typeof resolvePrimaryMeasureSelectionV1>[0]) {
  const result = resolvePrimaryMeasureSelectionV1(input);
  if (result.kind === 'CLARIFICATION_REQUIRED' || result.kind === 'NEW_ROOT_REQUIRED') {
    throw Object.assign(new Error(result.questionRu), {
      code: result.kind === 'NEW_ROOT_REQUIRED' ? 'PRIMARY_MEASURE_NEW_ROOT_REQUIRED' : 'PRIMARY_MEASURE_SELECTION_INVALID',
      httpStatus: 422,
    });
  }
  return result;
}
