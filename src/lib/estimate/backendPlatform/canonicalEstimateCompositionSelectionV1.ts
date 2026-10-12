import {canonicalEstimateOperationReferences,type CanonicalEstimateOperationReference} from './canonicalEstimateOperationComposition';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {evaluateFormulaGraph,type FormulaAst,type FormulaParameterValue} from './formulaGraph';
import type {CanonicalEstimateResourceDefinition,CanonicalEstimateFormulaDefinition} from './canonicalEstimateCompileCore';
import {canonicalManualExclusionMigrationBindings} from './canonicalManualPriceReleaseMigration';

export type CanonicalEstimateCompositionSelectionV1={
  contractVersion:'canonical-estimate-composition-selection/v1';
  excludedOperationKeys:string[];excludedRowIds:string[];
};
export type CanonicalOperationQuantityContributionsV1={
  contractVersion:'canonical-operation-quantity-contributions/v1';aggregation:'SUM'|'MAX';
  contributions:{operationKey:string;formulaId:string}[];
  sourceEvidence:{sha256:string;locator:string}[];
};
export type CanonicalCompositionSelectionDecisionV1={
  contractVersion:'canonical-composition-selection-decision/v1';rowId:string;
  excluded:boolean;excludedBy:'ROW'|'OPERATIONS'|null;
  activeOperationKeys:string[];excludedOperationKeys:string[];
  unallocatedReferenceExclusions:string[];
};
const record=(v:unknown):Record<string,unknown>|null=>v!=null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;
const invalid=(text:string):never=>{throw Object.assign(new Error(text),{code:'COMPOSITION_SELECTION_INVALID',httpStatus:409});};
export function canonicalOperationSelectionKeyV1(operation:Pick<CanonicalEstimateOperationReference,'groupId'|'operationId'>):string{
  return JSON.stringify([operation.groupId,operation.operationId]);
}
export function parseCanonicalCompositionSelectionV1(value:unknown):CanonicalEstimateCompositionSelectionV1|null{
  if(value==null)return null;
  const s=record(value);
  const ids=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=5000&&v.every(id=>typeof id==='string'&&id.length>0&&id.length<=2000)&&new Set(v).size===v.length;
  if(!s||s.contractVersion!=='canonical-estimate-composition-selection/v1'||Object.keys(s).length!==3
    ||!ids(s.excludedOperationKeys)||!ids(s.excludedRowIds))invalid('Не удалось сохранить исключения состава.');
  return {contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[...s!.excludedOperationKeys as string[]].sort(),excludedRowIds:[...s!.excludedRowIds as string[]].sort()};
}
export function canonicalCompositionSelectionDecisionV1(value:unknown):CanonicalCompositionSelectionDecisionV1|null{
  const v=record(value);
  return v?.contractVersion==='canonical-composition-selection-decision/v1'&&typeof v.rowId==='string'
    &&typeof v.excluded==='boolean'&&[null,'ROW','OPERATIONS'].includes(v.excludedBy as string|null)
    &&['activeOperationKeys','excludedOperationKeys','unallocatedReferenceExclusions'].every(k=>Array.isArray(v[k])&&(v[k] as unknown[]).every(x=>typeof x==='string'))
    ?v as CanonicalCompositionSelectionDecisionV1:null;
}
/** Activity is immutable request state, separate from price inclusion. Only a
 * declared SUM/MAX of existing, source-backed formula graphs can allocate a
 * shared physical quantity. References alone never apportion a fixed norm. */
export function planCanonicalCompositionSelectionV1(input:{
  selection:unknown;resources:readonly CanonicalEstimateResourceDefinition[];formulas:readonly CanonicalEstimateFormulaDefinition[];
  customRowIds?: readonly string[];
}){
  const selection=parseCanonicalCompositionSelectionV1(input.selection),excludedOps=new Set(selection?.excludedOperationKeys??[]),excludedRows=new Set(selection?.excludedRowIds??[]);
  const formulas=new Map(input.formulas.map(f=>[f.formula_id,f])),rows=new Set([...input.resources.map(r=>r.row_id),...(input.customRowIds??[])]),knownOps=new Set<string>();
  const referencesByRow=new Map<string,CanonicalEstimateOperationReference[]>();
  for(const r of input.resources){const refs=canonicalEstimateOperationReferences(r.resource_graph.operationCompositionV1);referencesByRow.set(r.row_id,refs);refs.forEach(ref=>knownOps.add(canonicalOperationSelectionKeyV1(ref)));}
  if([...excludedOps].some(key=>!knownOps.has(key))||[...excludedRows].some(id=>!rows.has(id)))invalid('Исключённая подработа или ресурс отсутствует в этой версии сметы.');
  const allocations=new Map<string,{aggregation:'SUM'|'MAX';parts:{operationKey:string;formula:CanonicalEstimateFormulaDefinition}[]}>();
  for(const r of input.resources){
    const raw=r.resource_graph.operationQuantityContributionsV1;if(raw==null)continue;
    const a=record(raw),refs=referencesByRow.get(r.row_id)!,keys=new Set(refs.map(canonicalOperationSelectionKeyV1));
    if(!a||a.contractVersion!=='canonical-operation-quantity-contributions/v1'||!['SUM','MAX'].includes(String(a.aggregation))
      ||!Array.isArray(a.contributions)||a.contributions.length<1||a.contributions.length>128
      ||!Array.isArray(a.sourceEvidence)||a.sourceEvidence.length<1||a.sourceEvidence.length>8
      ||a.sourceEvidence.some(e=>!record(e)||!/^[0-9a-f]{64}$/u.test(String(record(e)?.sha256))||typeof record(e)?.locator!=='string'||!String(record(e)?.locator).trim()))invalid('Вклады общего ресурса не подтверждены источником.');
    const parts=(a!.contributions as unknown[]).map(value=>{
      const p=record(value),formula=formulas.get(String(p?.formulaId));
      if(!p||!keys.has(String(p.operationKey))||!formula||formula.output_unit_id!==r.unit_id)invalid('Вклад общего ресурса не соответствует подработе и единице.');
      return {operationKey:String(p!.operationKey),formula:formula!};
    });
    if(new Set(parts.map(p=>p.operationKey)).size!==parts.length||keys.size!==parts.length)invalid('Вклады общего ресурса заданы неоднозначно или не полностью.');
    const aggregateAst=(asts:FormulaAst[]):FormulaAst=>a!.aggregation==='MAX'?{kind:'call',function:'max',arguments:asts}:asts.reduce((left,right)=>({kind:'binary',operator:'+',left,right}));
    const owner=formulas.get(r.formula_id);
    if(!owner||canonicalEstimateStableJson(owner.ast)!==canonicalEstimateStableJson(aggregateAst(parts.map(p=>p.formula.ast))))invalid('Вклады не воспроизводят исходную формулу общего ресурса.');
    allocations.set(r.row_id,{aggregation:a!.aggregation as 'SUM'|'MAX',parts});
  }
  const decision=(rowId:string):CanonicalCompositionSelectionDecisionV1=>{
    const refs=referencesByRow.get(rowId)??[],keys=refs.map(canonicalOperationSelectionKeyV1),allocation=allocations.get(rowId);
    const excludedOperationKeys=keys.filter(key=>excludedOps.has(key)),activeOperationKeys=keys.filter(key=>!excludedOps.has(key));
    const rowExcluded=excludedRows.has(rowId),operationsExcluded=allocation?activeOperationKeys.length===0:keys.length>0&&excludedOps.has(keys[0]);
    return {contractVersion:'canonical-composition-selection-decision/v1',rowId,excluded:rowExcluded||operationsExcluded,
      excludedBy:rowExcluded?'ROW':operationsExcluded?'OPERATIONS':null,activeOperationKeys,excludedOperationKeys,
      unallocatedReferenceExclusions:allocation?[]:excludedOperationKeys.filter(key=>key!==keys[0])};
  };
  const activeInputIds=(rowId:string,fallback:readonly string[]):string[]=>{
    if(decision(rowId).excluded)return [];
    const a=allocations.get(rowId);return a?[...new Set(a.parts.filter(p=>!excludedOps.has(p.operationKey)).flatMap(p=>p.formula.input_parameter_ids))]:[...fallback];
  };
  for(const resource of input.resources) {
    const decisionForRow=decision(resource.row_id),references=referencesByRow.get(resource.row_id)??[];
    if(!excludedRows.has(resource.row_id) && !allocations.has(resource.row_id)
      && references.filter(reference=>reference.processRole!=='REFERENCE_ONLY'&&reference.processRole!=='COST_SUMMARY').length>1
      && decisionForRow.excludedOperationKeys.length>0) {
      invalid('Для исключения подработы нужно подтверждённое распределение количества общего ресурса.');
    }
  }
  const quantity=(rowId:string,parameters:Record<string,FormulaParameterValue>,fallback:()=>string):string=>{
    const d=decision(rowId);if(d.excluded)return '0';const a=allocations.get(rowId);if(!a)return fallback();
    const values=a.parts.filter(p=>!excludedOps.has(p.operationKey)).map(p=>evaluateFormulaGraph(p.formula.ast,parameters));
    return a.aggregation==='MAX'?evaluateFormulaGraph({kind:'call',function:'max',arguments:values.map(value=>({kind:'literal',value}))},{}):values.reduce((left,right)=>evaluateFormulaGraph({kind:'binary',operator:'+',left:{kind:'literal',value:left},right:{kind:'literal',value:right}},{}),'0');
  };
  const partiallyAllocated=(rowId:string):boolean=>allocations.has(rowId)
    && !decision(rowId).excluded && decision(rowId).excludedOperationKeys.length>0;
  const graph=(rowId:string,original:Record<string,unknown>):Record<string,unknown>=>{
    if(!selection)return original;
    const d=decision(rowId),refs=referencesByRow.get(rowId)??[],a=allocations.get(rowId);
    const owner=a&&!d.excluded?refs.find(ref=>d.activeOperationKeys.includes(canonicalOperationSelectionKeyV1(ref))):refs[0];
    return {...original,compositionSelectionDecisionV1:d,originalOperationCompositionV1:original.operationCompositionV1,...(owner?{operationCompositionV1:{...owner,
      additionalOperations:refs.filter(ref=>ref.operationId!==owner.operationId&&d.activeOperationKeys.includes(canonicalOperationSelectionKeyV1(ref))).map(ref=>({operationId:ref.operationId,operationTitleRu:ref.operationTitleRu,completionCriterionRu:ref.completionCriterionRu,processOrdinal:ref.processOrdinal,processRole:ref.processRole}))}}:{})};
  };
  return {selection,decision,activeInputIds,quantity,graph,partiallyAllocated};
}

export function assertCanonicalCompositionSelectionReleaseMigrationV1(input:{selection:unknown;
  from:{resources:readonly Record<string,unknown>[];formulas:readonly Record<string,unknown>[];parameters:readonly Record<string,unknown>[]};
  to:{resources:readonly Record<string,unknown>[];formulas:readonly Record<string,unknown>[];parameters:readonly Record<string,unknown>[]}}):void {
  const selected=parseCanonicalCompositionSelectionV1(input.selection);if(!selected)return;
  const from=canonicalManualExclusionMigrationBindings(input.from),to=canonicalManualExclusionMigrationBindings(input.to);
  const matching=(id:string)=>typeof from[id]==='string'&&from[id]===to[id];
  const members=(resources:readonly Record<string,unknown>[],key:string)=>resources.flatMap(resource=>{
    const refs=canonicalEstimateOperationReferences(record(resource.resource_graph)?.operationCompositionV1);
    const member=refs.find(reference=>canonicalOperationSelectionKeyV1(reference)===key);
    return member?[{rowId:String(resource.row_id),member}]:[];
  }).sort((a,b)=>a.rowId.localeCompare(b.rowId,'en'));
  if(selected.excludedRowIds.some(id=>!matching(id))||selected.excludedOperationKeys.some(key=>{
    const oldMembers=members(input.from.resources,key),newMembers=members(input.to.resources,key);
    return oldMembers.length===0||canonicalEstimateStableJson(oldMembers)!==canonicalEstimateStableJson(newMembers)
      ||oldMembers.some(member=>!matching(member.rowId));
  })) throw Object.assign(new Error('Переход остановлен: применимость сохранённых исключений к новому составу ещё не подтверждена. Исходная смета и ручные данные сохранены.'),
    {code:'COMPOSITION_SELECTION_MIGRATION_REVIEW_REQUIRED',httpStatus:409});
}
