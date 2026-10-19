// WORK source-only consumer. No catalogue identity, source registry, writer, order or price admission.
import pack from '../../../../data/estimate-benchmarks/source-packs/manual-backfill-soil1-krer01-061-01-quantity-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
 type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
type Json=Record<string,unknown>;
export const manualBackfill06101PackR1=pack;
export const manualBackfill06101PrimaryR1=pack.primaryMeasure.parameterId;
export const manualBackfill06101PrefixR1=pack.prefix;
export const manualBackfill06101FactIdsR1=[...pack.scopeFacts,...pack.projectFactsRequired].map(f=>f.id);
const primary=manualBackfill06101PrimaryR1,prefix=manualBackfill06101PrefixR1;
const rowId=(id:string)=>prefix+':'+id;
const needParameter=(id:string)=>'manual_backfill06101_application_need_'+id.replaceAll('-','_');
export const manualBackfill06101NeedParameterIdsR1=pack.openNeeds.map(n=>needParameter(n.id));
export const manualBackfill06101NeedRowIdsR1=pack.openNeeds.map(n=>rowId('open:'+n.id));
const positive={kind:'greater_than' as const,parameterId:primary,value:0};
const watering={kind:'equals' as const,parameterId:'backfill_watering_state',value:'REQUIRED_INCLUDED_LABOUR_WATER_QUANTITY_UNRESOLVED'};
export function manualBackfill06101QuantityDefinitionR1():AutomaticOwnerDefinition & {
 catalogId:null;workKey:null;groupId:null;identityAdmitted:false;publicationAllowed:false;fullTechnicalAcceptance:false;
}{
 if(pack.normId!=='01-02-061-01'||pack.catalogId!==null||pack.workKey!==null||pack.groupId!==null||pack.publicationAllowed
  ||pack.source.sha256!=='91c4f4db762840481de41f57b6771b5ae0adf0dada240dc1f03655e9d71eab6b'
  ||pack.primaryMeasure.printedDenominator!=='100'||pack.physicalSourceRows.length!==1
  ||pack.physicalSourceRows[0]!.id!=='whole-worker'||pack.physicalSourceRows[0]!.ratePer100M3!=='88.50'
  ||pack.physicalSourceRows[0]!.resourceCode!=='000-1001-5'||pack.operationsIncludedInWholeLabour.length!==2||pack.openNeeds.length!==9)
  throw Error('MANUAL_BACKFILL06101_EXACT_SOURCE_ONLY_REQUIRED');
 const conditional:AutomaticParameterSpec[]=[
  ...pack.scopeFacts.map(f=>({id:f.id,title:f.titleRu,valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[...f.allowedValues],requiredWhen:positive})),
  ...pack.projectFactsRequired.map(f=>({id:f.id,title:f.titleRu,valueType:'text' as const,unitId:null,kind:'conditional' as const,requiredWhen:positive})),
  ...pack.openNeeds.map(n=>({id:needParameter(n.id),title:n.titleRu,valueType:'decimal' as const,unitId:null,kind:'conditional' as const,min:0})),
 ];
 const rows:AutomaticRowSpec[]=[
  ...pack.physicalSourceRows.map(r=>({rowId:rowId(r.id),formulaId:rowId('formula:'+r.id),section:pack.titleRu,category:r.category,title:r.titleRu,
   unitId:r.sourceUnit,expression:primary+'*'+r.ratePer100M3+'/100',inputParameterIds:[...manualBackfill06101FactIdsR1],procurement:false,
   costTreatment:'OWN_COST' as const,inclusion:positive})),
  ...pack.operationsIncludedInWholeLabour.map(o=>({rowId:rowId(o.id),formulaId:rowId('formula:'+o.id),section:'Операции внутри цельного труда',category:'work',title:o.titleRu,
   unitId:'m3',expression:primary,inputParameterIds:[...manualBackfill06101FactIdsR1],procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS' as const,
   inclusion:o.conditionalWatering?{kind:'and' as const,operands:[positive,watering]}:positive})),
  ...pack.openNeeds.map(n=>({rowId:rowId('open:'+n.id),formulaId:rowId('formula:open:'+n.id),section:'Открытые потребности полного цикла',category:'service',title:n.titleRu,
   unitId:'',expression:needParameter(n.id),procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const,
   inclusion:n.conditionalWatering?{kind:'and' as const,operands:[positive,watering]}:positive})),
 ];
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
  applicabilityRu:'Ручная засыпка траншей, пазух котлованов или ям ранее выброшенным грунтом группы 1; разбивка комьев, трамбование и поливка при необходимости включены в единый труд 88,50 ч/100 м³. Отдельно подтверждённый проектный объём, готовая выемка и проектные условия обязательны. Поставочного материала, машины и отдельного труда поливки здесь нет.',
  ordinary:[{id:primary,title:'Отдельно подтверждённый проектный объём грунта ручной засыпки по ведомости, м³; не длина трубы и не рыхлый заказ',valueType:'decimal',unitId:'m3',kind:'ordinary',min:0}],
  profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.boundariesRu});
 const parameters=built.parameters.map(q=>{
  const need=manualBackfill06101NeedParameterIdsR1.includes(q.parameter_id);
  if(need)return {...q,required:false,truth_metadata:{...unresolvedApplicationNormTruthR1(q.truth_metadata,
   'Не доказаны исходная величина, единица и отдельная граница оплаты. Пользовательские 0/1, цена, длина трубы или объём разработки не заменяют источник.'),
   guide:{...q.truth_metadata.guide as Json,source_document:'APPLICATION_SOURCE_AND_SEPARATE_PAYMENT_REQUIRED'}}};
  return {...q,...(q.parameter_id===primary?{constraints_json:{...q.constraints_json,exclusiveMin:0}}:{}),truth_metadata:{...q.truth_metadata,
   value_source_role:q.parameter_id===primary?'USER_INPUT':'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
   guide:{...q.truth_metadata.guide as Json,...(q.parameter_id===primary?{guide_short_ru:'Укажите положительный проектный объём грунта этой ручной засыпки по отдельной ведомости. Нет автоматического пересчёта из выемки, длины трубы, рыхлого объёма или плотности.'}:
    {source_role:'PROJECT_DOCUMENTATION',source_document:'ACTUAL_BACKFILL_SOIL_READY_EXCAVATION_AND_PAYMENT_BOUNDARY_REQUIRED',source_locator:'Подтверждённый факт конкретного объекта; исходная норма не сертифицирует проект и не задаёт скрытое значение.'})}}};
 });
 const resources=built.resources.map(r=>{
  const suffix=r.row_id.slice(prefix.length+1),need=pack.openNeeds.find(n=>suffix==='open:'+n.id),operation=pack.operationsIncludedInWholeLabour.find(o=>o.id===suffix);
  const worker=suffix==='whole-worker',{row_sha256:_old,...body}=r;
  const changed={...body,...(operation?{cost_owner_id:rowId('whole-worker')}:{}),resource_graph:{...r.resource_graph,
   ...(!need?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[primary],reasonRu:'Количество меняется только исходным проектным объёмом и фактами метода. Ручная строка, вода, длина трубы и соседняя норма не заменяют колонку 061-01.'}}:{}),
   ...(operation?{parentCostOwnerId:rowId('whole-worker'),includedInResourceOwnerRowId:rowId('whole-worker')}:{}),
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,
    detailsRu:need?[need.missingFactRu,need.nextTaskRu,'Владелец следующей задачи: '+need.ownerRu]:[
     worker?'Цельный труд 88,50 чел.-ч на 100 м³ грунта. Трамбование и необходимая поливка отдельно не оплачиваются.':'Включённая операция; самостоятельной оплаты и закупки нет.',
     operation?.conditionalWatering?'Объём этой строки — объём засыпки, к которому относится включённый труд. Это не количество воды.':'Ранее выброшенный пригодный грунт и готовность выемки подтверждаются отдельно.',
     'Отказ от ненужной поливки не уменьшает цельную норму труда. Машин, нормы воды, заказа грунта и коэффициентов плотности эта колонка не задаёт.']}},
   source_metadata:{...r.source_metadata,...(!worker?{automaticGenericPriceInheritanceAllowed:false}:{}),
    sourceRole:need?'UNRESOLVED_APPLICATION_NORM':operation?'INCLUDED_OFFICIAL_OPERATION_SCOPE':'OFFICIAL_EXACT_COLUMN_QUANTITY_CANDIDATE_NOT_PUBLISHED',
    normativeTrace:need?[]:[{sourceId:pack.sourceId,normId:pack.normId,exact_locator:pack.source.locatorRu,source_artifact_sha256:pack.source.sha256}],
    ...(need?{normative_source_ids:[],quantityUnitUnconfirmed:true,missingFact:need.missingFactRu,nextTask:need.nextTaskRu,resolutionOwner:need.ownerRu}:{}),
    normativeResourceCode:worker?pack.physicalSourceRows[0]!.resourceCode:null,exact_column:pack.normId,source_artifact_sha256:pack.source.sha256,
    sourceQuantityDenominatorM3:100,sourceQuantityAccepted:worker,sourceBindingCandidateOnly:worker,
    conditionalNeedQuantityIsUnappliedReferenceOnly:true,bankOrLooseConversionApplied:false,purchase_order_admission:false,machinePriceOwnerAdmitted:false,
    catalogue_identity_pending:true,normative_binding_pending:true,full_technical_acceptance:false,
    ...(operation?{includedOperationId:operation.id,includedInWholeLabourOwnerRowId:rowId('whole-worker'),referenceQuantityIsBackfillVolumeNotWater:true}:{} )}};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 return {...built,parameters,resources,catalogId:null,workKey:null,groupId:null,identityAdmitted:false,publicationAllowed:false,fullTechnicalAcceptance:false};
}
/** TEST_ONLY facts; no runtime defaults, engineering approval or supplier price. */
export function manualBackfill06101ScenarioFactsR1(volume='100'):Record<string,unknown>{
 return {[primary]:volume,...Object.fromEntries(pack.scopeFacts.map(f=>[f.id,f.allowedValues[0]])),
  ...Object.fromEntries(pack.projectFactsRequired.map(f=>[f.id,'TEST_ONLY: '+f.titleRu]))};
}
export async function compileManualBackfill06101ScenarioR1(submittedParameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimateCompileCoreInput['priceItems']=[]){
 const d=manualBackfill06101QuantityDefinitionR1();
 const compiled=await compileCanonicalEstimateCore({operation:'recalculate',catalogId:'TEST_ONLY_MANUAL_BACKFILL06101_NO_CATALOG_BINDING',compilerVersion:pack.contract,
  primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters,confirmedParameters:{},rowOverrides,
  priceItems,currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:async v=>estimateDeterministicHash(v)});
 return {catalogId:null,workKey:null,groupId:null,identityAdmitted:false,publicationAllowed:false,fullTechnicalAcceptance:false,compiled} as const;
}
export function manualBackfill06101IndependentCompletenessMapR1(){
 const common={operationId:'manual-backfill-soil1',sourceId:pack.sourceId,condition:'EXACT_061_01_PREVIOUSLY_THROWN_SUITABLE_GROUP1_SOIL_PROJECT_VOLUME_AND_READY_EXCAVATION'};
 return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,evidenceSha256:pack.source.sha256,
  evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],entries:[
   { ...common,expectedResourceId:pack.normId+':000-1001-5',category:'labor',unitId:'man_hour',quantityRule:'88.50_MAN_HOUR_PER100_PROJECT_SOIL_M3_WHOLE_ONCE',specification:pack.physicalSourceRows[0]!.printedTitleRu,formulaId:rowId('formula:whole-worker'),resolution:{kind:'ROW',rowId:rowId('whole-worker')}},
   ...pack.operationsIncludedInWholeLabour.map(o=>({...common,expectedResourceId:pack.normId+':'+o.id,category:'work',unitId:'m3',quantityRule:o.conditionalWatering?'INCLUDED_ONLY_IF_WATERING_NECESSARY_NOT_WATER_M3':'INCLUDED_WHOLE_LABOUR_NO_SECOND_CHARGE',specification:o.printedRu,formulaId:rowId('formula:'+o.id),resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:rowId(o.id),parentRowId:rowId('whole-worker')}})),
   ...pack.openNeeds.map(n=>({...common,expectedResourceId:pack.normId+':open:'+n.id,category:'service',unitId:null,quantityRule:'UNRESOLVED_APPLICATION_SOURCE_NOT0_1',specification:n.nextTaskRu,formulaId:rowId('formula:open:'+n.id),resolution:{kind:'ROW',rowId:rowId('open:'+n.id)}})),
  ]};
}
