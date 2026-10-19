// WORK-only source completion of an existing floor profile; no catalogue, registry or publication admission.
import pack from '../../../../data/estimate-benchmarks/source-packs/ceramic-skirting-m150-krer11-039-04-completion-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {ceramicFloor02703DefinitionR1,ceramicFloor02703CompletenessMapR1,ceramicFloor02703PackR1 as parentPack} from './ceramicFloorCementMortarKrer11Column03R1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
type Json=Record<string,unknown>;
export const ceramicSkirting03904PackR1=pack;
export const ceramicSkirting03904PrimaryR1=pack.measurement.parameterId;
export const ceramicSkirting03904FactIdsR1=[...pack.scopeFacts,...pack.projectFacts].map(f=>f.id);
export const ceramicSkirting03904NeedParameterIdsR1=pack.openNeeds.map(n=>'skirting03904_application_need_'+n.id.replaceAll('-','_'));
const p=pack.prefix,length=pack.measurement.parameterId,oldArea=parentPack.primaryMeasureParameterId;
const selection={kind:'selected',parameterId:pack.selector.id,value:pack.selector.selected};
const requiredWhen={kind:'equals' as const,parameterId:pack.selector.id,value:pack.selector.selected};
const positiveLength={kind:'greater_than',parameterId:length,value:0};
export function ceramicSkirting03904CoverageConditionR1():Json{
 return {kind:'and',operands:[selection,positiveLength,{kind:'greater_than',parameterId:oldArea,value:0},
  ...ceramicSkirting03904FactIdsR1.map(parameterId=>({kind:'present',parameterId}))]};
}
function rehash<T extends {row_sha256:string}>(r:T):T{const{row_sha256:_old,...body}=r;return {...body,row_sha256:estimateDeterministicHash(body)} as T;}
export function ceramicSkirting03904CompletionDefinitionR1():AutomaticOwnerDefinition{
 const parent=ceramicFloor02703DefinitionR1(),target=parent.resources.find(r=>r.row_id===pack.targetNeedRowId),primary=parent.parameters.find(q=>q.parameter_id===oldArea);
 if(pack.normId!=='11-01-039-04'||pack.parentNormId!==parentPack.normId||pack.parentCatalogId!==parentPack.catalogId||pack.catalogId!==null
  ||pack.source.sha256!=='e56ef148df993609c325b7d505c54b1806e8185a4fd7a1550b15266144538223'||pack.measurement.sourceDenominator!=='100'
  ||JSON.stringify([parent.parameters.length,parent.formulas.length,parent.resources.length])!==JSON.stringify(pack.parentExpectedShape)
  ||!target||target.unit_id!==''||target.source_metadata?.sourceRole!=='UNRESOLVED_APPLICATION_NORM'
  ||JSON.stringify(target.source_metadata.normativeTrace)!=='[]'||!primary||primary.unit_id!=='m2')throw Error('CERAMIC_SKIRTING03904_EXACT_PARENT_SOURCE_NEED_REQUIRED');
 const conditional:AutomaticParameterSpec[]=[
  {id:pack.selector.id,title:'Самостоятельный метод плинтуса по проекту; не выводится из покрытия пола',kind:'conditional',valueType:'enum',unitId:null,values:[pack.selector.selected,pack.selector.unconfirmed]},
  {id:length,title:'Фактическая длина прямого керамического плинтуса по самостоятельной ведомости, м',kind:'conditional',valueType:'decimal',unitId:'m',min:0,requiredWhen},
  ...pack.scopeFacts.map(f=>({id:f.id,title:f.titleRu,kind:'conditional' as const,valueType:'enum' as const,unitId:null,values:[...f.values],requiredWhen})),
  ...pack.projectFacts.map(f=>({id:f.id,title:f.titleRu,kind:'conditional' as const,valueType:'text' as const,unitId:null,requiredWhen})),
  ...pack.openNeeds.map((n,i)=>({id:ceramicSkirting03904NeedParameterIdsR1[i]!,title:n.titleRu,kind:'conditional' as const,valueType:'decimal' as const,unitId:null,min:0})),
 ];
 const rows:AutomaticRowSpec[]=[
  ...pack.physicalRows.map(r=>({rowId:p+':'+r.id,formulaId:p+':formula:'+r.id,title:r.titleRu,section:pack.titleRu,category:r.category,unitId:r.unitId,
   expression:length+'*'+r.ratePer100M+'/100',inputParameterIds:[oldArea,...ceramicSkirting03904FactIdsR1],procurement:false,costTreatment:r.costTreatment==='OWN_COST'?'OWN_COST' as const:'INFORMATIONAL_SCOPE' as const})),
  {rowId:p+':'+pack.includedOperation.id,formulaId:p+':formula:'+pack.includedOperation.id,title:pack.includedOperation.titleRu,section:pack.titleRu,category:'work',unitId:'m',expression:length,
   inputParameterIds:[oldArea,...ceramicSkirting03904FactIdsR1],procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS'},
  ...pack.openNeeds.map((n,i)=>({rowId:p+':open:'+n.id,formulaId:p+':formula:open:'+n.id,title:n.titleRu,section:'Открытые потребности керамического плинтуса',category:'service',unitId:'',
   expression:ceramicSkirting03904NeedParameterIdsR1[i]!,procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const})),
 ];
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:p,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
  ordinary:[{id:oldArea,title:primary.title_ru,kind:'ordinary',valueType:'decimal',unitId:'m2',min:0}],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,
  applicabilityRu:'Только самостоятельная прямая керамическая плинтусная плитка на готовом М150 по 039-04 в помещении данного пола. Длина измеряется отдельно; площадь пола, ПВХ/дерево/клей и новые нормы раскроя не используются. Проектная готовность линии и оплата подтверждаются отдельно; материал/машина пока справочные.',excludedUnownedAssumptions:pack.boundariesRu});
 const oldIds=new Set(parent.parameters.map(q=>q.parameter_id));
 const additions=built.parameters.filter(q=>!oldIds.has(q.parameter_id)).map((q,i)=>{
  if(ceramicSkirting03904NeedParameterIdsR1.includes(q.parameter_id))return {...q,ordinal:parent.parameters.length+i,required:false,truth_metadata:unresolvedApplicationNormTruthR1(q.truth_metadata,
   'Не доказаны источник, единица, величина и самостоятельная граница оплаты. Пользовательские 0/1, цена 77 или площадь пола не заменяют источник.')};
  return {...q,ordinal:parent.parameters.length+i,required:false,constraints_json:{...q.constraints_json,...(q.parameter_id===length?{exclusiveMin:0}:{})},
   truth_metadata:{...q.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...q.truth_metadata.guide as Json,
    guide_short_ru:q.parameter_id===length?'Укажите отдельную положительную длину по ведомости. Нет пересчёта из площади, высоты плинтуса, размера плитки или расхода М150.':'Подтвердите факт проекта и границу работ. Расчёт не выдаёт акт готовности или приёмки.'}}};
 });
 const added=built.resources.map((r,i)=>{
  const key=r.row_id.slice(p.length+1),source=pack.physicalRows.find(x=>x.id===key),need=pack.openNeeds.find(n=>key==='open:'+n.id),included=key===pack.includedOperation.id,whole=key==='whole-skirting-labour';
  const formula=built.formulas.find(f=>f.formula_id===r.formula_id)!;
  return rehash({...r,ordinal:parent.resources.length+i,inclusion_ast:selection,...(included?{cost_owner_id:p+':whole-skirting-labour'}:{}),
   resource_graph:{...r.resource_graph,...(!need?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[...formula.input_parameter_ids],reasonRu:'Количество меняется только отдельно измеренной длиной плинтуса и проектными фактами; не ручной строкой или площадью пола.'}}:{}),
    ...(included?{parentCostOwnerId:p+':whole-skirting-labour',includedInResourceOwnerRowId:p+':whole-skirting-labour'}:{}),
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:source?.titleRu??null,
     detailsRu:need?[need.missingFactRu,need.nextTaskRu,'Владелец: '+need.ownerRu]:[pack.source.locatorRu,
      whole?'Цельный труд 23,60 ч на 100 м отдельного плинтуса; без повторной оплаты монтажа пола или приклеивания другого плинтуса.':included?'Операция включена в тот же труд; самостоятельной оплаты нет.':'Буквальное исходное количество справочно; не цена, закупка, заказ или складской остаток.',
      key==='ready-mortar-m150'?'В заказ М150 существующего пола автоматически не добавляется; объединение требует точной совместимости и единого владельца оплаты.':'Длина линии измеряется отдельно. Расчёт не подтверждает выполненную работу или акт готовности.']}},
   source_metadata:{...r.source_metadata,...(!whole?{automaticGenericPriceInheritanceAllowed:false}:{}),
    sourceRole:need?'UNRESOLVED_APPLICATION_NORM':whole?'OFFICIAL_WHOLE_SKIRTING_LABOUR_NORM':included?'INCLUDED_WHOLE_SKIRTING_STEP':'SOURCE_QUANTITY_COMMERCIAL_SCOPE_PENDING',
    normativeTrace:need?[]:[{sourceId:pack.sourceId,normId:pack.normId,exact_locator:pack.source.locatorRu,source_artifact_sha256:pack.source.sha256}],
    ...(need?{normative_source_ids:[],quantityUnitUnconfirmed:true,missingFact:need.missingFactRu,nextTask:need.nextTaskRu,resolutionOwner:need.ownerRu}:{}),
    sourceCode:source?.code??null,exact_column:pack.normId,source_artifact_sha256:pack.source.sha256,sourceQuantityDenominatorM:100,
    commercialProcurementAdmitted:false,machinePriceOwnerAdmitted:false,...(source?.category==='equipment'?{machinePriceScopePending:true,operatorRoleNotAdmitted:true,noAdditionalOperatorInferred:false}:{}),
    full_technical_acceptance:false,publicationAllowed:false}});
 });
 const originalRows=parent.resources.map(r=>r.row_id===pack.targetNeedRowId?rehash({...r,
  inclusion_ast:{kind:'and',operands:[r.inclusion_ast,{kind:'not',operand:ceramicSkirting03904CoverageConditionR1()}]},
  source_metadata:{...r.source_metadata,completionNeedTransitionV1:{featureContract:pack.contract,selectedMethodParameterId:pack.selector.id,resolvedOnlyForMethod:pack.selector.selected,
   resolvedThroughPaidOwnerRowId:p+':whole-skirting-labour',automaticLegacyPriceOrQuantityTransferAllowed:false}}}):r);
 return {...parent,parameters:[...parent.parameters,...additions],formulas:[...parent.formulas,...built.formulas],resources:[...originalRows,...added]};
}
/** TEST_ONLY; caller supplies existing floor facts and independent measured length. No production defaults. */
export function ceramicSkirting03904SyntheticFactsR1(floorFacts:Record<string,unknown>,measuredLength:string):Record<string,unknown>{
 return {...floorFacts,[pack.selector.id]:pack.selector.selected,[length]:measuredLength,
  ...Object.fromEntries(pack.scopeFacts.map(f=>[f.id,f.values[0]])),...Object.fromEntries(pack.projectFacts.map(f=>[f.id,'TEST_ONLY separate project/measured/payment reference: '+f.titleRu]))};
}
export function ceramicSkirting03904CompletenessMapR1(){
 const prior=ceramicFloor02703CompletenessMapR1(),common={operationId:'ceramic-skirting03904',sourceId:pack.sourceId,condition:'EXACT_STRAIGHT_CERAMIC_SKIRTING_READY_M150_INDEPENDENT_MEASURED_M'};
 return {...prior,evidenceReferences:[...prior.evidenceReferences,pack.source.officialUrl,pack.source.locatorRu],entries:[...prior.entries,
  ...pack.physicalRows.map(r=>({...common,expectedResourceId:pack.normId+':'+r.code,category:r.category,unitId:r.unitId,quantityRule:'PRINTED_RATE_PER100_INSTALLED_SKIRTING_M_NO_ORDER_OR_PERIMETER',specification:r.titleRu,formulaId:p+':formula:'+r.id,resolution:{kind:'ROW',rowId:p+':'+r.id}})),
  {...common,expectedResourceId:pack.normId+':'+pack.includedOperation.id,category:'work',unitId:'m',quantityRule:'INCLUDED_SINGLE_WHOLE_LABOUR',specification:pack.includedOperation.printedRu,formulaId:p+':formula:'+pack.includedOperation.id,resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:p+':'+pack.includedOperation.id,parentRowId:p+':whole-skirting-labour'}},
  ...pack.openNeeds.map(n=>({...common,expectedResourceId:pack.normId+':open:'+n.id,category:'service',unitId:null,quantityRule:'UNRESOLVED_SOURCE_NOT0_1',specification:n.nextTaskRu,formulaId:p+':formula:open:'+n.id,resolution:{kind:'ROW',rowId:p+':open:'+n.id}})),
 ]};
}
