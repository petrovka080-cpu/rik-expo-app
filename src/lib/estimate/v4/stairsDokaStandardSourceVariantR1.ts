import parentJson from '../../../../data/estimate-benchmarks/fixtures/stairs-doka-standard-current-parent-r1.json';
import mapJson from '../../../../data/estimate-benchmarks/source-packs/stairs-doka-standard-source-variant-dispositions-r1.json';
import {monolithicStair111DefinitionR1,monolithicStair111PackR1 as source,monolithicStair111PrefixR1 as prefix} from './monolithicStairDokaKrer06Column11101R1';
import {unresolvedApplicationNormTruthR1} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput,type CanonicalEstimateParameterDefinition,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
type Json=Record<string,any>;
export const stairsDokaStandardVariantParentR1=parentJson;
export const stairsDokaStandardVariantMapR1=mapJson;
export const stairsDokaStandardVariantSelectorR1='stairs_quantity_source_variant';
export const stairsDokaStandardVariantValueR1='KRER06_111_01_DOKA';
const selected={kind:'selected',parameterId:stairsDokaStandardVariantSelectorR1,value:stairsDokaStandardVariantValueR1};
const legacy={kind:'not',operand:selected};
const and=(...operands:Json[]):Json=>({kind:'and',operands});
const or=(...operands:Json[]):Json=>({kind:'or',operands});
const hashRaw=(s:string)=>canonicalEstimateSha256HexText(s);
const fail=(part:string):never=>{throw Object.assign(Error('STAIR111_STANDARD_PREIMAGE_CHANGED:'+part),{code:'STAIR111_STANDARD_PREIMAGE_CHANGED'});};

export function stairsDokaStandardCapturedDefinitionR1(){return {
 parameters:parentJson.parameterRawRows.map(s=>JSON.parse(s)) as (CanonicalEstimateParameterDefinition&Json)[],
 formulas:parentJson.formulaRawRows.map(s=>JSON.parse(s)) as (CanonicalEstimateFormulaDefinition&Json)[],
 resources:parentJson.resourceRawRows.map(s=>JSON.parse(s)) as (CanonicalEstimateResourceDefinition&Json)[]};}

/** Existing standard only. All old IDs, expressions, source metadata and owners
 * remain. Exactly mapped inclusion changes plus explicit unresolved scope gates
 * separate the two methods; no blanket disable, norm split or price remapping. */
export function buildStairsDokaStandardSourceVariantR1(parent=stairsDokaStandardCapturedDefinitionR1()){
 if(parent.parameters.length!==188||parent.formulas.length!==92||parent.resources.length!==95)fail('shape');
 const original=stairsDokaStandardCapturedDefinitionR1();
 for(const key of ['parameters','formulas','resources'] as const)if(estimateDeterministicHash(parent[key])!==estimateDeterministicHash(original[key]))fail(key);
 parentJson.resourceRawRows.forEach((raw,i)=>{if(hashRaw(raw)!==mapJson.rows[i]!.rawResourceSha256)fail('raw-resource');});
 const q=monolithicStair111DefinitionR1(),fulfillment=new Set(source.machines.map(m=>m.parameterId));
 const sourceParameters=q.parameters.filter(p=>!fulfillment.has(p.parameter_id)).map(p=>{
  const internal=p.truth_metadata.visibility_role==='INTERNAL_ONLY';
  const requiredWhen=and(selected,(p.constraints_json?.requiredWhen as Json|undefined)??{kind:'literal',value:true});
  return {...p,required:false,default_value:null,constraints_json:{...p.constraints_json,...(!internal?{requiredWhen}:{})},
   ...(p.parameter_id===source.primaryMeasureParameterId?{constraints_json:{...p.constraints_json,requiredWhen,equalToParameter:'stairs_concrete_volume_m3'}}:{}),
   truth_metadata:{...p.truth_metadata,...(!internal?{required_when:requiredWhen}:{}),
    guide:{...p.truth_metadata.guide as Json,...(p.parameter_id===source.primaryMeasureParameterId?{guide_short_ru:'Подтвердите чистый объём именно прямоугольного марша. В этом варианте весь выбранный объект — один марш без площадок: его объём должен совпадать с основным объёмом лестницы. Не выводите его из площади опалубки или числа ступеней.'}:{})}}};
 });
 const selector={parameter_id:stairsDokaStandardVariantSelectorR1,ordinal:188,value_type:'enum',unit_id:null,title_ru:'Способ расчёта количеств монолитной лестницы',required:false,default_value:null,
  constraints_json:{values:['EXISTING_PROJECT_SCHEDULE',stairsDokaStandardVariantValueR1]},truth_metadata:{contract:mapJson.contract,semantic_parameter_key:mapJson.catalogId+':'+stairsDokaStandardVariantSelectorR1,
   visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',input_origin_class:'EXPLICIT_SOURCE_METHOD_SELECTION',hidden_default_forbidden:true,source_confirmation_required:false,
   guide:{guide_kind:'PROJECT_DEFINED',guide_short_ru:'Без выбора сохраняется прежний расчёт по проектным ведомостям. Вариант КРЕР — только новый расчёт одного прямоугольного марша Doka при подтверждённых исходных условиях; переход внутри сохранённой сметы требует отдельной сверки и пока не допускается.',source_role:'EXPLICIT_METHOD_SELECTION_NOT_INFERRED_FROM_TITLE',source_document:source.sourceId,source_snapshot_hash:source.source.sha256,guide_version:mapJson.contract,applicability:source.scopeRu,verified_at:'2026-10-18'}}};
 const groups=[...new Set(mapJson.rows.flatMap(r=>r.scopeParameterId?[r.scopeParameterId]:[]))];
 const scopeParameters=groups.map(id=>({parameter_id:id,ordinal:0,value_type:'enum',unit_id:null,title_ru:(mapJson.scopeGroupTitlesRu as Record<string,string>)[id.replace('stair111_unresolved_','').replaceAll('_','-')]!,required:false,default_value:null,
  constraints_json:{values:['SEPARATE_SOURCE_SCOPE_ADMITTED'],requiredWhen:selected},
  truth_metadata:unresolvedApplicationNormTruthR1({contract:mapJson.contract,semantic_parameter_key:mapJson.catalogId+':'+id,hidden_default_forbidden:true,synthetic:false,
   required_when:selected,guide:{guide_kind:'PROJECT_DEFINED',guide_short_ru:'Для отдельной оплаты нужен источник, фактический состав и сверка включений; ручная отметка не заменяет эти данные.',source_role:'SOURCE_INTAKE_REQUIRED',source_document:source.sourceId,source_snapshot_hash:source.source.sha256,guide_version:mapJson.contract,applicability:source.scopeRu,verified_at:'2026-10-18'}},'Отдельный scope этой существующей строки вне целой111 пока не принят. Старые поля и обязательство сохранены; новые количество/оплата не выдуманы.')}));
 const oldResources=parent.resources.map((r,i)=>{
  const m=mapJson.rows[i]!;if(r.row_id!==m.rowId||r.ordinal!==m.ordinal)fail('row-identity');
  if(m.disposition==='RETAIN_NONPAYABLE_PROJECT_CONTROL')return r;
  const unresolved=m.disposition==='UNRESOLVED_SEPARATE_SCOPE_VISIBLE_NEED';
  const inclusion=unresolved?or(and(legacy,r.inclusion_ast),and(selected,{kind:'equals',parameterId:m.scopeParameterId,value:'SEPARATE_SOURCE_SCOPE_ADMITTED'})):and(legacy,r.inclusion_ast);
  const body={...r,inclusion_ast:inclusion,...(unresolved?{resource_graph:{...r.resource_graph,inputParameterIds:[...new Set([...((r.resource_graph.inputParameterIds as string[]|undefined)??[]),m.scopeParameterId!])]}}:{}),row_sha256:''};
  return {...body,row_sha256:estimateDeterministicHash(body)};
 });
 const sourceResources=q.resources.filter(r=>!source.machines.some(m=>r.row_id===prefix+':'+m.id+'-own'||r.row_id===prefix+':'+m.id+'-hired')).map(r=>{
  const sm={...r.source_metadata} as Json;delete sm.test_only_unclassified;delete sm.machinePriceAdmissionPending;
  const body={...r,inclusion_ast:and(selected,r.inclusion_ast),source_metadata:{...sm,test_only_unclassified:false,sourceAdmission:'EXPLICIT_EXISTING_STANDARD_SOURCE_VARIANT_PARTIAL',
   automaticGenericPriceInheritanceAllowed:false,machinePriceAdmission:false,sourceVariantAdmissionRequiresNewEstimateCommandGuard:true},row_sha256:''};
  return {...body,row_sha256:estimateDeterministicHash(body)};
 });
 const parameters:(CanonicalEstimateParameterDefinition&Json)[]=[...parent.parameters,selector,...sourceParameters,...scopeParameters].map((p,index)=>index<188?p:{...p,ordinal:index});
 const resources=[...oldResources,...sourceResources.map((r,index)=>{const body={...r,ordinal:95+index,row_sha256:''};return {...body,row_sha256:estimateDeterministicHash(body)};})];
 const formulas=[...parent.formulas,...q.formulas.filter(f=>sourceResources.some(r=>r.formula_id===f.formula_id))];
 for(const [kind,ids] of [['parameter',parameters.map(p=>p.parameter_id)],['formula',formulas.map(f=>f.formula_id)],['row',resources.map(r=>r.row_id)]] as const)if(new Set(ids).size!==ids.length)fail(kind+'-collision');
 if(sourceResources.length!==45||resources.length!==140)fail('source-composition');
 const unresolvedResourceRowIds=[...mapJson.rows.filter(m=>m.scopeParameterId).map(m=>m.rowId),...source.gaps.map(g=>prefix+':'+g.id)];
 return {catalogId:mapJson.catalogId,parameters,formulas,resources,unresolvedResourceRowIds,
  newCatalogIds:0,machinePriceAdmission:false,newEstimateCommandGuardRequired:true,sourceBindingPreservationRequired:8,
  historicalExecutionContext:parentJson.executionContextAtRead,automaticParentRebase:false,sourceNormId:source.normId};
}

export function compileStairsDokaStandardSourceVariantForTestR1(submittedParameters:Record<string,unknown>,rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']){
 const d=buildStairsDokaStandardSourceVariantR1();return compileCanonicalEstimateCore({operation:rowOverrides?'recalculate':'compile',catalogId:d.catalogId,
  compilerVersion:mapJson.contract,primaryMeasureParameterId:'stairs_concrete_volume_m3',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters,
  confirmedParameters:{},rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:async value=>estimateDeterministicHash(value)});
}
