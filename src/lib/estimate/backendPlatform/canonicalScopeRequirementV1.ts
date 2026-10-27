import { resolveInclusionGraph } from './inclusionGraph';
import { canonicalCompositionSelectionDecisionV1 } from './canonicalEstimateCompositionSelectionV1';

type Json = Record<string, unknown>;
export type CanonicalScopeRequirementKindV1 = 'INCLUDED' | 'NOT_APPLICABLE' | 'PARTLY_INCLUDED'
  | 'PROCESS' | 'PROJECT_SCOPE' | 'FINANCIAL_POLICY' | 'OBJECT_SCOPE';
export type CanonicalScopeRequirementStatusV1 = 'INCLUDED' | 'NOT_APPLICABLE' | 'COMPLETED' | 'USER_EXCLUDED' | 'REQUIRED_RESOURCE_EXCLUDED'
  | 'PARTLY_INCLUDED' | 'PROCESS_REQUIRED' | 'PROJECT_SCOPE_OPEN' | 'FINANCIAL_POLICY'
  | 'OBJECT_FACT_REQUIRED' | 'LEGACY_SOURCE_REQUIRED' | 'SCOPE_UNVERIFIED';
/** Flat read evidence only; no quantity, source authority or paid resource. */
export type CanonicalFactorySupplyObligationV1 = {
  contractVersion: 'canonical-scope-requirement-decision/v1';
  obligationKey: string;
  rowId: string; groupId: string; groupTitleRu: string; titleRu: string; reasonRu: string;
  kind: 'FACTORY_SUPPLY'; status: 'COMPLETED' | 'SCOPE_UNVERIFIED';
  coveringRowIds: string[]; originalRowIds: string[]; missingObjectFactParameterIds: string[];
  numericNormAccepted: false; separatePaymentAccepted: false;
};
export type CanonicalScopeObligationsReadIssueV1 = {
  contractVersion: 'canonical-scope-obligations-read-issue/v1';
  status: 'INVALID_EXPLICIT'; reason: 'INVALID_FLAT_OBLIGATIONS';
};
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
  additionalObligationsV1?: readonly CanonicalFactorySupplyObligationV1[];
  additionalObligationsReadIssueV1?: CanonicalScopeObligationsReadIssueV1;
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
  /** Alternative object states are meaningful only inside this source context. */
  contextWhen?: Json;
  notApplicableWhen?: Json;
  requiredFactParameterIds?: string[];
  objectFactParameterId?: string;
  unknownObjectValues?: string[];
  legacyObjectValue?: string;
  /** Project applicability can have no historical legacy state. Opt-in only;
   * existing source-system checks still require their legacy value. */
  objectFactMode?: 'PROJECT_APPLICABILITY_ONLY';
  /** Only this opt-in project check can depend on selected planned operations.
   * The main historical system/source check remains unconditional. */
  projectOperationContextsV1?: {when:Json;resourceRowIds:string[];applicabilityWhen?:Json;requiredFactParameterIds?:string[];unknownFactValues?:Record<string,string[]>}[];
  /** A conditional companion can be removed before choosing its project
   * variant. This never relaxes the main system/applicability check. */
  operationExclusionSatisfiesScopeV1?: true;
  /** Opt-in completeness of cost coverage. A saved financial-only refusal
   * remains financial-only; it never becomes a physical composition command. */
  costExclusionBreaksScopeV1?: true;
};
const kinds = new Set(['INCLUDED','NOT_APPLICABLE','PARTLY_INCLUDED','PROCESS','PROJECT_SCOPE','FINANCIAL_POLICY','OBJECT_SCOPE']);
const statuses = new Set(['INCLUDED','NOT_APPLICABLE','COMPLETED','USER_EXCLUDED','REQUIRED_RESOURCE_EXCLUDED','PARTLY_INCLUDED','PROCESS_REQUIRED','PROJECT_SCOPE_OPEN',
  'FINANCIAL_POLICY','OBJECT_FACT_REQUIRED','LEGACY_SOURCE_REQUIRED','SCOPE_UNVERIFIED']);
const record = (value: unknown): Json | null => value != null && typeof value === 'object' && !Array.isArray(value) ? value as Json : null;
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 4000;
const ids = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 128 && value.every(text)
  && new Set(value).size === value.length;

/** Detect the explicit new contract without interpreting raw child evidence. */
export function canonicalScopeRequirementHasAdditionalObligationsV1(value: unknown): boolean {
  const d = record(value);
  return d != null && (Object.hasOwn(d,'additionalObligationsV1') || Object.hasOwn(d,'additionalObligationsReadIssueV1'));
}

/** Sticky read-only diagnostic: never a source, quantity or acceptance. */
export function canonicalScopeRequirementWithIntegrityHoldV1(
  decision: CanonicalScopeRequirementDecisionV1,
): CanonicalScopeRequirementDecisionV1 {
  return {...decision,additionalObligationsReadIssueV1:{contractVersion:'canonical-scope-obligations-read-issue/v1',
    status:'INVALID_EXPLICIT',reason:'INVALID_FLAT_OBLIGATIONS'}};
}

function readFlatObligations(d: Json): CanonicalFactorySupplyObligationV1[] | null {
  const raw = d.additionalObligationsV1;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 8) return null;
  const keys = ['contractVersion','obligationKey','rowId','groupId','groupTitleRu','titleRu','reasonRu','kind','status',
    'coveringRowIds','originalRowIds','missingObjectFactParameterIds','numericNormAccepted','separatePaymentAccepted'];
  const seen = new Set<string>();
  const leaves: CanonicalFactorySupplyObligationV1[] = [];
  for (const value of raw) {
    const c = record(value);
    if (!c || Object.keys(c).some(key=>!keys.includes(key))
      || c.contractVersion !== 'canonical-scope-requirement-decision/v1'
      || ![c.obligationKey,c.rowId,c.groupId,c.groupTitleRu,c.titleRu,c.reasonRu].every(text)
      || c.rowId !== d.rowId || c.groupId !== d.groupId || c.groupTitleRu !== d.groupTitleRu
      || c.kind !== 'FACTORY_SUPPLY' || !['COMPLETED','SCOPE_UNVERIFIED'].includes(String(c.status))
      || !ids(c.coveringRowIds) || c.coveringRowIds.length !== 0
      || !ids(c.originalRowIds) || c.originalRowIds.length !== 2 || !c.originalRowIds.includes(String(c.obligationKey))
      || c.originalRowIds.includes(String(d.rowId))
      || !ids(c.missingObjectFactParameterIds) || c.missingObjectFactParameterIds.length !== 0
      || c.numericNormAccepted !== false || c.separatePaymentAccepted !== false || seen.has(String(c.obligationKey))) return null;
    seen.add(String(c.obligationKey));
    // Copy only bounded typed fields. Raw objects are never retained as authority.
    leaves.push({contractVersion:'canonical-scope-requirement-decision/v1',obligationKey:String(c.obligationKey),
      rowId:String(c.rowId),groupId:String(c.groupId),groupTitleRu:String(c.groupTitleRu),titleRu:String(c.titleRu),reasonRu:String(c.reasonRu),
      kind:'FACTORY_SUPPLY',status:c.status as CanonicalFactorySupplyObligationV1['status'],
      coveringRowIds:[],originalRowIds:[...c.originalRowIds],missingObjectFactParameterIds:[],numericNormAccepted:false,separatePaymentAccepted:false});
  }
  return leaves;
}

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
  let primary = d as CanonicalScopeRequirementDecisionV1;
  if(d!.kind==='OBJECT_SCOPE' && d!.status==='USER_EXCLUDED') {
    const selection=canonicalCompositionSelectionDecisionV1(compositionDecision);
    const operationKeys=selection && selection.rowId===d!.rowId && selection.excluded
      ? selection.excludedOperationKeys.filter(key=>!selection.unallocatedReferenceExclusions.includes(key)) : [];
    primary = {...d,status:'SCOPE_UNVERIFIED',
      reasonRu:'Проверка системы и применимости норм была исключена в прежней версии. Восстановите проверку; приложение затем определит готовность выбранного состава.',
      restoreExcludedSourceCheck:{operationKeys}} as CanonicalScopeRequirementDecisionV1;
  }
  const restoration=record(primary.restoreExcludedSourceCheck);
  if(primary.restoreExcludedSourceCheck!=null && (primary.kind!=='OBJECT_SCOPE' || primary.status!=='SCOPE_UNVERIFIED'
    || !restoration || !ids(restoration.operationKeys)))return null;
  // Exact legacy return (including historical exclusion recovery) is unchanged.
  if (!canonicalScopeRequirementHasAdditionalObligationsV1(d)) return primary;
  const {additionalObligationsV1:_rawChildren,additionalObligationsReadIssueV1:_rawIssue,...base} = primary;
  const children = Object.hasOwn(d!,'additionalObligationsV1') ? readFlatObligations(d!) : null;
  const bounded = {...base,...(children ? {additionalObligationsV1:children} : {})};
  // Presence of an explicit issue is sticky, even after sanitize/compact/reparse.
  // A forged clear flag cannot close the read gate. Invalid primary still uses
  // the historical null behavior above; this recovery is only for a valid primary.
  return Object.hasOwn(d!,'additionalObligationsReadIssueV1') || !children
    ? canonicalScopeRequirementWithIntegrityHoldV1(bounded) : bounded;

}

/** Classifies an existing informational obligation; it never supplies a
 * numeric norm, material, price, purchase or additional paid operation. */
export function resolveCanonicalScopeRequirementV1(input: {
  graph: Json; rowId: string; parameters: Readonly<Json>; resourceIds: ReadonlySet<string>;
  parameterIds: ReadonlySet<string>; knownQuantityRowIds: ReadonlySet<string>;
  excludedQuantityRowIds?: ReadonlySet<string>; excludedOperationResourceRowIds?: ReadonlySet<string>;
  /** Opt-in companion checks also see exclusions of inactive definitions. */
  excludedOperationDefinitionRowIds?: ReadonlySet<string>;
  excludedOwnCostRowIds?: ReadonlySet<string>;
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
    || (s.costExclusionBreaksScopeV1!=null&&(s.costExclusionBreaksScopeV1!==true
      || !['INCLUDED','PARTLY_INCLUDED'].includes(String(s.kind)) || s.coveringRowIds.length===0))
    || !record(s.exactScopeWhen) || (s.satisfiedWhen != null && !record(s.satisfiedWhen))
    || (s.contextWhen!=null&&!record(s.contextWhen)) || (s.notApplicableWhen!=null&&!record(s.notApplicableWhen))
    || (s.notApplicableWhen!=null&&s.contextWhen==null)
    || (s.requiredFactParameterIds!=null&&(!ids(s.requiredFactParameterIds)||s.requiredFactParameterIds.some(id=>!input.parameterIds.has(id))))
    || (s.kind!=='OBJECT_SCOPE'&&s.objectFactParameterId!=null&&(!text(s.objectFactParameterId)||!input.parameterIds.has(s.objectFactParameterId)||!ids(s.unknownObjectValues)))) return fail();
  const scope = s as unknown as CanonicalScopeRequirementV1;
  const condition = (ast: Json) => {
    const probe = resolveInclusionGraph(ast, {});
    if (probe.missingParameterIds.some(id => !input.parameterIds.has(id))) return fail();
    return resolveInclusionGraph(ast, input.parameters);
  };
  const exact = condition(scope.exactScopeWhen);
  const context=scope.contextWhen?condition(scope.contextWhen):null;
  const notApplicable=scope.notApplicableWhen?condition(scope.notApplicableWhen):null;
  const completed=scope.satisfiedWhen?condition(scope.satisfiedWhen):null;
  if(context?.value===true&&[exact,notApplicable,completed].filter(condition=>condition?.value===true).length>1)return fail();
  let missing: string[] = exact.missingParameterIds;
  let status: CanonicalScopeRequirementStatusV1 = 'SCOPE_UNVERIFIED';
  if (scope.kind === 'OBJECT_SCOPE') {
    const id = scope.objectFactParameterId;
    const projectOnly=scope.objectFactMode==='PROJECT_APPLICABILITY_ONLY';
    if (!id || !input.parameterIds.has(id) || !ids(scope.unknownObjectValues)
      ||(scope.objectFactMode!=null&&!projectOnly)
      ||(projectOnly?scope.legacyObjectValue!=null:!text(scope.legacyObjectValue))) return fail();
    const contexts=scope.projectOperationContextsV1;
    if(contexts!=null&&(!projectOnly||!Array.isArray(contexts)||contexts.length===0||contexts.length>8
      ||contexts.some(c=>!record(c)||!record(c.when)||!ids(c.resourceRowIds)||c.resourceRowIds.length===0
        ||c.resourceRowIds.some(rowId=>rowId===input.rowId||!input.resourceIds.has(rowId))
        ||(c.applicabilityWhen!=null&&!record(c.applicabilityWhen))
        ||(c.requiredFactParameterIds!=null&&(!record(c.applicabilityWhen)||!ids(c.requiredFactParameterIds)
          ||c.requiredFactParameterIds.some(id=>!input.parameterIds.has(id))))
        ||(c.unknownFactValues!=null&&(!record(c.unknownFactValues)||Object.entries(c.unknownFactValues)
          .some(([id,values])=>!c.requiredFactParameterIds?.includes(id)||!ids(values)))))))return fail();
    const operationExclusions=input.excludedOperationDefinitionRowIds??input.excludedOperationResourceRowIds;
    const projectNeeded=contexts==null||contexts.some(c=>condition(c.when).value===true
      &&!c.resourceRowIds.every(rowId=>operationExclusions?.has(rowId)));
    const value = input.parameters[id];
    const activeContexts=contexts?.filter(c=>condition(c.when).value===true&&!c.resourceRowIds.every(rowId=>operationExclusions?.has(rowId)))??[];
    const applicability=activeContexts.flatMap(c=>c.applicabilityWhen?[{context:c,condition:condition(c.applicabilityWhen)}]:[]);
    const missingApplicability=[...new Set(applicability.flatMap(a=>[...a.condition.missingParameterIds,
      ...(a.context.requiredFactParameterIds??[]).filter(id=>input.parameters[id]==null||input.parameters[id]===''
        ||a.context.unknownFactValues?.[id]?.includes(String(input.parameters[id])))]))];
    if(!projectNeeded){status='NOT_APPLICABLE';missing=[];}
    else if(missingApplicability.length){status='OBJECT_FACT_REQUIRED';missing=missingApplicability;}
    else if(applicability.some(a=>a.condition.value!==true)){status='SCOPE_UNVERIFIED';missing=[];}
    else if (value == null || value === '' || scope.unknownObjectValues!.includes(String(value))) {
      status = 'OBJECT_FACT_REQUIRED'; missing = [id];
    } else if (!projectOnly&&value === scope.legacyObjectValue) { status = 'LEGACY_SOURCE_REQUIRED'; missing = []; }
    else if (exact.value === true) {
      missing = (scope.requiredFactParameterIds ?? []).filter(id => input.parameters[id] == null || input.parameters[id] === '');
      status = missing.length ? 'OBJECT_FACT_REQUIRED' : 'COMPLETED';
    }
  } else if(scope.operationExclusionSatisfiesScopeV1!=null
    &&(scope.operationExclusionSatisfiesScopeV1!==true||scope.kind!=='INCLUDED'||scope.coveringRowIds.length===0))return fail();
  else if(scope.contextWhen&&context?.value!==true) {
    missing=context?.missingParameterIds??[];
  } else if(scope.operationExclusionSatisfiesScopeV1===true
    &&scope.coveringRowIds.every(id=>(input.excludedOperationDefinitionRowIds??input.excludedOperationResourceRowIds)?.has(id))) {
    status='USER_EXCLUDED';missing=[];
  } else if(notApplicable?.value===true) {status='NOT_APPLICABLE';missing=[];
  } else if(scope.contextWhen&&completed?.value===true) {status='COMPLETED';missing=[];
  } else if(scope.objectFactParameterId&&(input.parameters[scope.objectFactParameterId]==null
    ||input.parameters[scope.objectFactParameterId]===''||scope.unknownObjectValues?.includes(String(input.parameters[scope.objectFactParameterId])))) {
    status='OBJECT_FACT_REQUIRED';missing=[scope.objectFactParameterId];
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
      else if(scope.coveringRowIds.some(id=>input.excludedQuantityRowIds?.has(id)
        ||(scope.costExclusionBreaksScopeV1===true&&input.excludedOwnCostRowIds?.has(id)))) status='REQUIRED_RESOURCE_EXCLUDED';
    }
    const missingFacts=(scope.requiredFactParameterIds??[]).filter(id=>input.parameters[id]==null||input.parameters[id]==='');
    if(missingFacts.length&&!['USER_EXCLUDED','COMPLETED','NOT_APPLICABLE'].includes(status)){status='OBJECT_FACT_REQUIRED';missing=missingFacts;}
  }
  return { contractVersion:'canonical-scope-requirement-decision/v1',rowId:input.rowId,
    groupId:scope.groupId,groupTitleRu:scope.groupTitleRu,titleRu:scope.titleRu,reasonRu:scope.reasonRu,
    kind:scope.kind,status,coveringRowIds:scope.coveringRowIds,originalRowIds:scope.originalRowIds,
    missingObjectFactParameterIds:missing,numericNormAccepted:false,separatePaymentAccepted:false };
}

export function canonicalScopeRequirementStatusRuV1(status: CanonicalScopeRequirementStatusV1): string {
  return ({INCLUDED:'Учтено рассчитанными ресурсами в этой смете',NOT_APPLICABLE:'Не требуется для выбранного состава работ',
    COMPLETED:'Подтверждено исходными данными',USER_EXCLUDED:'Исключено пользователем из этой сметы',PARTLY_INCLUDED:'Часть учтена; отдельный остаток зависит от проекта',
    REQUIRED_RESOURCE_EXCLUDED:'Для выполнения этапа нужен исключённый ресурс: восстановите его или измените состав',
    PROCESS_REQUIRED:'Требование к выполнению работ',PROJECT_SCOPE_OPEN:'Отдельный состав зависит от проекта',
    FINANCIAL_POLICY:'Учитывается по сметным и налоговым правилам',OBJECT_FACT_REQUIRED:'Нужны исходные данные участка',
    LEGACY_SOURCE_REQUIRED:'Нормы прежнего состава ещё не подтверждены',SCOPE_UNVERIFIED:'Применимость ещё не подтверждена'})[status];
}

/** Future execution duties stay in the saved ledger without impersonating a
 * missing calculation input. Actual scope, object and source gaps still block. */
export function canonicalScopeRequirementStatusIsOpenV1(status: CanonicalScopeRequirementStatusV1): boolean {
  return ['PROJECT_SCOPE_OPEN','PARTLY_INCLUDED','OBJECT_FACT_REQUIRED','LEGACY_SOURCE_REQUIRED',
    'SCOPE_UNVERIFIED','REQUIRED_RESOURCE_EXCLUDED'].includes(status);
}

export type CanonicalScopeRequirementGroupV1 = {
  groupId: string; titleRu: string; rowIds: string[]; statuses: CanonicalScopeRequirementStatusV1[]; detailsRu: string[];
  kinds?: (CanonicalScopeRequirementKindV1 | 'FACTORY_SUPPLY')[];
  missingObjectFactParameterIds?: string[];
  sourceCheckRestoration?: { rowIds: string[]; operationKeys: string[] };
};
export function groupCanonicalScopeRequirementsV1(decisions: readonly CanonicalScopeRequirementDecisionV1[]): CanonicalScopeRequirementGroupV1[] {
  const groups = new Map<string,CanonicalScopeRequirementGroupV1>();
  for (const d of decisions) {
    const group = groups.get(d.groupId) ?? {groupId:d.groupId,titleRu:d.groupTitleRu,rowIds:[],statuses:[],detailsRu:[],kinds:[]};
    if(!group.kinds!.includes(d.kind))group.kinds!.push(d.kind);
    if(d.status==='OBJECT_FACT_REQUIRED'&&d.missingObjectFactParameterIds.length){
      group.missingObjectFactParameterIds=[...new Set([...(group.missingObjectFactParameterIds??[]),...d.missingObjectFactParameterIds])];
    }
    if(d.restoreExcludedSourceCheck) {
      const restoration=group.sourceCheckRestoration??={rowIds:[],operationKeys:[]};
      if(!restoration.rowIds.includes(d.rowId))restoration.rowIds.push(d.rowId);
      for(const key of d.restoreExcludedSourceCheck.operationKeys)if(!restoration.operationKeys.includes(key))restoration.operationKeys.push(key);
    }
    group.rowIds.push(d.rowId);
    if (!group.statuses.includes(d.status)) group.statuses.push(d.status);
    if (!group.detailsRu.includes(d.reasonRu)) group.detailsRu.push(d.reasonRu);
    if (d.additionalObligationsV1 || d.additionalObligationsReadIssueV1) {
      group.rowIds = [...new Set(group.rowIds)];
      for (const child of d.additionalObligationsV1 ?? []) {
        if (!group.kinds!.includes(child.kind)) group.kinds!.push(child.kind);
        if (!group.statuses.includes(child.status)) group.statuses.push(child.status);
        if (!group.detailsRu.includes(child.reasonRu)) group.detailsRu.push(child.reasonRu);
      }
      if (d.additionalObligationsReadIssueV1) {
        if (!group.statuses.includes('SCOPE_UNVERIFIED')) group.statuses.push('SCOPE_UNVERIFIED');
        const reason = 'Сохранённое дополнительное обязательство требует проверки целостности.';
        if (!group.detailsRu.includes(reason)) group.detailsRu.push(reason);
      }
    }
    groups.set(d.groupId,group);
  }
  return [...groups.values()];
}

/** Shared read predicate; arithmetic/binding remains exclusively in ce148. */
export function canonicalScopeRequirementDecisionIsOpenV1(decision: CanonicalScopeRequirementDecisionV1): boolean {
  return canonicalScopeRequirementStatusIsOpenV1(decision.status) || decision.additionalObligationsReadIssueV1 != null
    || (decision.additionalObligationsV1 ?? []).some(child=>canonicalScopeRequirementStatusIsOpenV1(child.status));
}

/** Compare only parsed bounded semantics, independent of JSON property order. */
export function canonicalScopeRequirementDecisionsEqualV1(
  left: CanonicalScopeRequirementDecisionV1, right: CanonicalScopeRequirementDecisionV1,
): boolean {
  const body = (d: CanonicalScopeRequirementDecisionV1) => [d.contractVersion,d.rowId,d.groupId,d.groupTitleRu,d.titleRu,d.reasonRu,
    d.kind,d.status,d.coveringRowIds,d.originalRowIds,d.missingObjectFactParameterIds,d.numericNormAccepted,d.separatePaymentAccepted,
    d.restoreExcludedSourceCheck?.operationKeys ?? null,
    d.additionalObligationsV1?.map(c=>[c.contractVersion,c.obligationKey,c.rowId,c.groupId,c.groupTitleRu,c.titleRu,c.reasonRu,
      c.kind,c.status,c.coveringRowIds,c.originalRowIds,c.missingObjectFactParameterIds,c.numericNormAccepted,c.separatePaymentAccepted]) ?? null,
    d.additionalObligationsReadIssueV1 ?? null];
  return JSON.stringify(body(left)) === JSON.stringify(body(right));
}
