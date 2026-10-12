import { resolveInclusionGraph } from './inclusionGraph';
import { canonicalCompositionSelectionDecisionV1 } from './canonicalEstimateCompositionSelectionV1';

type Json = Record<string, unknown>;
export type CanonicalScopeRequirementKindV1 = 'INCLUDED' | 'NOT_APPLICABLE' | 'PARTLY_INCLUDED'
  | 'PROCESS' | 'PROJECT_SCOPE' | 'FINANCIAL_POLICY' | 'OBJECT_SCOPE';
export type CanonicalScopeRequirementStatusV1 = 'INCLUDED' | 'NOT_APPLICABLE' | 'COMPLETED' | 'USER_EXCLUDED' | 'REQUIRED_RESOURCE_EXCLUDED'
  | 'PARTLY_INCLUDED' | 'PROCESS_REQUIRED' | 'PROJECT_SCOPE_OPEN' | 'FINANCIAL_POLICY'
  | 'OBJECT_FACT_REQUIRED' | 'LEGACY_SOURCE_REQUIRED' | 'SCOPE_UNVERIFIED';
export type CanonicalScopeRequirementDecisionV1 = {
  contractVersion: 'canonical-scope-requirement-decision/v1';
  rowId: string;
  groupId: string;
  groupTitleRu: string;
  titleRu: string;
  reasonRu: string;
  kind: CanonicalScopeRequirementKindV1;
  status: CanonicalScopeRequirementStatusV1;
  coveringRowIds: string[];
  originalRowIds: string[];
  missingObjectFactParameterIds: string[];
  numericNormAccepted: false;
  separatePaymentAccepted: false;
  /** Read-only recovery metadata for historical invalid exclusions. */
  restoreExcludedSourceCheck?: { operationKeys: string[] };
};
export type CanonicalScopeRequirementV1 = {
  contractVersion: 'canonical-scope-requirement/v1';
  kind: CanonicalScopeRequirementKindV1;
  groupId: string;
  groupTitleRu: string;
  titleRu: string;
  reasonRu: string;
  exactScopeWhen: Json;
  sourceEvidence: { sha256: string; locator: string }[];
  coveringRowIds: string[];
  originalRowIds: string[];
  satisfiedWhen?: Json;
  objectFactParameterId?: string;
  unknownObjectValues?: string[];
  legacyObjectValue?: string;
};
const kinds = new Set(['INCLUDED','NOT_APPLICABLE','PARTLY_INCLUDED','PROCESS','PROJECT_SCOPE','FINANCIAL_POLICY','OBJECT_SCOPE']);
const statuses = new Set(['INCLUDED','NOT_APPLICABLE','COMPLETED','USER_EXCLUDED','REQUIRED_RESOURCE_EXCLUDED','PARTLY_INCLUDED','PROCESS_REQUIRED','PROJECT_SCOPE_OPEN',
  'FINANCIAL_POLICY','OBJECT_FACT_REQUIRED','LEGACY_SOURCE_REQUIRED','SCOPE_UNVERIFIED']);
const record = (value: unknown): Json | null => value != null && typeof value === 'object' && !Array.isArray(value) ? value as Json : null;
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 4000;
const ids = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 128 && value.every(text)
  && new Set(value).size === value.length;

/** Saved semantic evidence is shared by compact transport, Web and PDF. A
 * quantity gap without this exact contract retains its existing authority. */
export function canonicalScopeRequirementDecisionV1(value: unknown, compositionDecision?: unknown): CanonicalScopeRequirementDecisionV1 | null {
  const d = record(value);
  const valid=d?.contractVersion === 'canonical-scope-requirement-decision/v1'
    && [d.rowId,d.groupId,d.groupTitleRu,d.titleRu,d.reasonRu].every(text)
    && kinds.has(String(d.kind)) && statuses.has(String(d.status))
    && ids(d.coveringRowIds) && ids(d.originalRowIds) && ids(d.missingObjectFactParameterIds)
    && d.numericNormAccepted === false && d.separatePaymentAccepted === false
    ;
  if(!valid)return null;
  // Older saved revisions could exclude the source/applicability check as an
  // informational row. Read them without treating that as verified scope.
  if(d!.kind==='OBJECT_SCOPE' && d!.status==='USER_EXCLUDED') {
    const selection=canonicalCompositionSelectionDecisionV1(compositionDecision);
    const operationKeys=selection && selection.rowId===d!.rowId && selection.excluded
      ? selection.excludedOperationKeys.filter(key=>!selection.unallocatedReferenceExclusions.includes(key)) : [];
    return {...d,status:'SCOPE_UNVERIFIED',
      reasonRu:'Проверка системы и применимости норм была исключена в прежней версии. Восстановите проверку; приложение затем определит готовность выбранного состава.',
      restoreExcludedSourceCheck:{operationKeys}} as CanonicalScopeRequirementDecisionV1;
  }
  const restoration=record(d!.restoreExcludedSourceCheck);
  if(d!.restoreExcludedSourceCheck!=null && (d!.kind!=='OBJECT_SCOPE' || d!.status!=='SCOPE_UNVERIFIED'
    || !restoration || !ids(restoration.operationKeys)))return null;
  return d as CanonicalScopeRequirementDecisionV1;
}

/** Classifies an existing informational obligation; it never supplies a
 * numeric norm, material, price, purchase or additional paid operation. */
export function resolveCanonicalScopeRequirementV1(input: {
  graph: Json; rowId: string; parameters: Readonly<Json>; resourceIds: ReadonlySet<string>;
  parameterIds: ReadonlySet<string>; knownQuantityRowIds: ReadonlySet<string>;
  excludedQuantityRowIds?: ReadonlySet<string>; excludedOperationResourceRowIds?: ReadonlySet<string>;
}): CanonicalScopeRequirementDecisionV1 | null {
  const raw = input.graph.scopeRequirementV1;
  if (raw == null) return null;
  const s = record(raw);
  const fail = (): never => { throw Object.assign(new Error(`scope requirement identity invalid ${input.rowId}`), {code:'DEFINITION_INTEGRITY_FAILED'}); };
  if (!s || s.contractVersion !== 'canonical-scope-requirement/v1' || !kinds.has(String(s.kind))
    || ![s.groupId,s.groupTitleRu,s.titleRu,s.reasonRu].every(text)
    || !ids(s.coveringRowIds) || !ids(s.originalRowIds)
    || !Array.isArray(s.sourceEvidence) || s.sourceEvidence.length === 0 || s.sourceEvidence.length > 8
    || s.sourceEvidence.some(e => !record(e) || !/^[0-9a-f]{64}$/u.test(String(e.sha256)) || !text(e.locator))
    || input.graph.costTreatment !== 'INFORMATIONAL_SCOPE'
    || s.coveringRowIds.some(id => !input.resourceIds.has(id) || id === input.rowId)
    || s.originalRowIds.some(id => !input.resourceIds.has(id) || id === input.rowId)
    || !record(s.exactScopeWhen) || (s.satisfiedWhen != null && !record(s.satisfiedWhen))) return fail();
  const scope = s as unknown as CanonicalScopeRequirementV1;
  const condition = (ast: Json) => {
    const probe = resolveInclusionGraph(ast, {});
    if (probe.missingParameterIds.some(id => !input.parameterIds.has(id))) return fail();
    return resolveInclusionGraph(ast, input.parameters);
  };
  const exact = condition(scope.exactScopeWhen);
  let missing: string[] = exact.missingParameterIds;
  let status: CanonicalScopeRequirementStatusV1 = 'SCOPE_UNVERIFIED';
  if (scope.kind === 'OBJECT_SCOPE') {
    const id = scope.objectFactParameterId;
    if (!id || !input.parameterIds.has(id) || !ids(scope.unknownObjectValues) || !text(scope.legacyObjectValue)) return fail();
    const value = input.parameters[id];
    if (value == null || value === '' || scope.unknownObjectValues!.includes(String(value))) {
      status = 'OBJECT_FACT_REQUIRED'; missing = [id];
    } else if (value === scope.legacyObjectValue) { status = 'LEGACY_SOURCE_REQUIRED'; missing = []; }
    else if (exact.value === true) { status = 'COMPLETED'; missing = []; }
  } else if (exact.value === true) {
    missing = [];
    const covered = scope.coveringRowIds.length > 0 && scope.coveringRowIds.every(id => input.knownQuantityRowIds.has(id));
    status = scope.kind === 'INCLUDED' ? covered ? 'INCLUDED' : 'SCOPE_UNVERIFIED'
      : scope.kind === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE'
      : scope.kind === 'PARTLY_INCLUDED' ? covered ? 'PARTLY_INCLUDED' : 'SCOPE_UNVERIFIED'
      : scope.kind === 'PROCESS' ? 'PROCESS_REQUIRED'
      : scope.kind === 'FINANCIAL_POLICY' ? 'FINANCIAL_POLICY' : 'PROJECT_SCOPE_OPEN';
    if (scope.satisfiedWhen && condition(scope.satisfiedWhen).value === true) status = 'COMPLETED';
    if(['INCLUDED','PARTLY_INCLUDED'].includes(scope.kind) && scope.coveringRowIds.length>0) {
      if(scope.coveringRowIds.every(id=>input.excludedOperationResourceRowIds?.has(id))) status='USER_EXCLUDED';
      else if(scope.coveringRowIds.some(id=>input.excludedQuantityRowIds?.has(id))) status='REQUIRED_RESOURCE_EXCLUDED';
    }
  }
  return { contractVersion:'canonical-scope-requirement-decision/v1',rowId:input.rowId,
    groupId:scope.groupId,groupTitleRu:scope.groupTitleRu,titleRu:scope.titleRu,reasonRu:scope.reasonRu,
    kind:scope.kind,status,coveringRowIds:scope.coveringRowIds,originalRowIds:scope.originalRowIds,
    missingObjectFactParameterIds:missing,numericNormAccepted:false,separatePaymentAccepted:false };
}

export function canonicalScopeRequirementStatusRuV1(status: CanonicalScopeRequirementStatusV1): string {
  return ({INCLUDED:'Уже учтено в норме покрытия',NOT_APPLICABLE:'Не относится к выбранному полю кровли',
    COMPLETED:'Подтверждено исходными данными',USER_EXCLUDED:'Исключено пользователем из этой сметы',PARTLY_INCLUDED:'Часть учтена; отдельный остаток зависит от проекта',
    REQUIRED_RESOURCE_EXCLUDED:'Для выполнения этапа нужен исключённый ресурс: восстановите его или измените состав',
    PROCESS_REQUIRED:'Требование к выполнению работ',PROJECT_SCOPE_OPEN:'Отдельный состав зависит от проекта',
    FINANCIAL_POLICY:'Учитывается по сметным и налоговым правилам',OBJECT_FACT_REQUIRED:'Нужно выбрать систему кровли',
    LEGACY_SOURCE_REQUIRED:'Нормы прежнего состава ещё не подтверждены',SCOPE_UNVERIFIED:'Применимость ещё не подтверждена'})[status];
}

export type CanonicalScopeRequirementGroupV1 = {
  groupId: string; titleRu: string; rowIds: string[]; statuses: CanonicalScopeRequirementStatusV1[]; detailsRu: string[];
  kinds?: CanonicalScopeRequirementKindV1[];
  sourceCheckRestoration?: { rowIds: string[]; operationKeys: string[] };
};
export function groupCanonicalScopeRequirementsV1(decisions: readonly CanonicalScopeRequirementDecisionV1[]): CanonicalScopeRequirementGroupV1[] {
  const groups = new Map<string,CanonicalScopeRequirementGroupV1>();
  for (const d of decisions) {
    const group = groups.get(d.groupId) ?? {groupId:d.groupId,titleRu:d.groupTitleRu,rowIds:[],statuses:[],detailsRu:[],kinds:[]};
    if(!group.kinds!.includes(d.kind))group.kinds!.push(d.kind);
    if(d.restoreExcludedSourceCheck) {
      const restoration=group.sourceCheckRestoration??={rowIds:[],operationKeys:[]};
      if(!restoration.rowIds.includes(d.rowId))restoration.rowIds.push(d.rowId);
      for(const key of d.restoreExcludedSourceCheck.operationKeys)if(!restoration.operationKeys.includes(key))restoration.operationKeys.push(key);
    }
    group.rowIds.push(d.rowId);
    if (!group.statuses.includes(d.status)) group.statuses.push(d.status);
    if (!group.detailsRu.includes(d.reasonRu)) group.detailsRu.push(d.reasonRu);
    groups.set(d.groupId,group);
  }
  return [...groups.values()];
}
