import pack from '../../../../data/estimate-benchmarks/source-packs/facade-flashings-with-downpipes-krer12-008-01-quantity-r1.json';
import {buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
type Json = Record<string, unknown>;
export const facadeDownpipes00801PackR1 = pack;
export const facadeDownpipes00801PrimaryR1 = 'actual_gross_facade_area_m2_for_composite_flashings_downpipes';
export const facadeDownpipes00801PrefixR1 = 'roof:krer12-01-008-01:source-only';
const primary=facadeDownpipes00801PrimaryR1, prefix=facadeDownpipes00801PrefixR1;
const positive={kind:'greater_than',parameterId:primary,value:0} as const;
const rowId=(id:string)=>prefix+':'+id;
const needParameter=(id:string)=>'facade00801_application_need_'+id.replaceAll('-','_');
export const facadeDownpipes00801FactIdsR1=[...pack.scopeFacts,...pack.projectFactsRequired,...pack.projectNumericFacts].map(f=>f.id);
export const facadeDownpipes00801NeedRowIdsR1=pack.openNeeds.map(n=>rowId('open:'+n.id));
export const facadeDownpipes00801NeedParameterIdsR1=pack.openNeeds.map(n=>needParameter(n.id));

/** One official-column quantity candidate; not a catalog owner, order or price admission. */
export function facadeDownpipes00801QuantityDefinitionR1():AutomaticOwnerDefinition & {
  catalogId:null;workKey:null;groupId:null;identityAdmitted:false;publicationAllowed:false;fullTechnicalAcceptance:false;
}{
 if(pack.normId!=='12-01-008-01'||pack.catalogId!==null||pack.workKey!==null||pack.groupId!==null||pack.publicationAllowed
  ||pack.source.sha256!=='114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8'
  ||pack.source.sourceDenominatorM2!=='100'||pack.physicalSourceRows.length!==6||pack.operationsIncludedInWholeLabour.length!==3
  ||pack.openNeeds.length!==8||pack.physicalSourceRows.filter(r=>r.costTreatment==='OWN_COST').map(r=>r.id).join()!=='whole-worker'
  ||pack.physicalSourceRows.some(r=>r.procurementEligible||r.includedInProcurement))throw Error('FACADE00801_EXACT_SOURCE_ONLY_REQUIRED');
 const facts:AutomaticParameterSpec[]=[
  ...pack.scopeFacts.map(f=>({id:f.id,title:f.titleRu,valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[...f.allowedValues],requiredWhen:positive})),
  ...pack.projectFactsRequired.map(f=>({id:f.id,title:f.titleRu,valueType:'text' as const,unitId:null,kind:'conditional' as const,requiredWhen:positive})),
  ...pack.projectNumericFacts.map(f=>({id:f.id,title:f.titleRu,valueType:'decimal' as const,unitId:f.unit,kind:'conditional' as const,min:Number(f.min),max:Number(f.max),requiredWhen:positive})),
 ];
 const ordinary:AutomaticParameterSpec[]=[{id:primary,title:'Полная проектная площадь фасада для единого состава обделок с водосточными трубами, без вычета проёмов',
  valueType:'decimal',unitId:'m2',kind:'ordinary',min:0}];
 const common={contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,
   artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},ordinary,profile:[],deferMissingProjectFactsToRows:true,
  excludedUnownedAssumptions:pack.scopeExclusionsRu} as const;
 const sourceRows:AutomaticRowSpec[]=pack.physicalSourceRows.map(r=>({rowId:rowId(r.id),formulaId:rowId('formula:'+r.id),
  section:pack.titleRu,category:r.category,title:r.titleRu,unitId:r.sourceUnit,expression:primary+'*'+r.ratePer100M2+'/100',
  inputParameterIds:[...facadeDownpipes00801FactIdsR1],procurement:false,costTreatment:r.costTreatment as AutomaticRowSpec['costTreatment']}));
 const includedRows:AutomaticRowSpec[]=pack.operationsIncludedInWholeLabour.map(o=>({rowId:rowId(o.id),formulaId:rowId('formula:'+o.id),
  section:'Операции, включённые в единый труд',category:'work',title:o.titleRu,unitId:'m2',expression:primary,
  inputParameterIds:[...facadeDownpipes00801FactIdsR1],procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS'}));
 const base=buildAutomaticConstructionOwnerR1({...common,conditional:facts,rows:[...sourceRows,...includedRows],
  applicabilityRu:'Только полный состав 12-01-008-01: фасадные обделки с изготовлением, сборкой и навеской водосточных труб из оцинкованной стали 0,7 мм. Первичная величина — полная площадь фасада без вычета проёмов, до 15 м. Не отдельная длина трубы; 008-02 не вычитается; существующие желоба и покрытия не заменяются.'});
 const needs=buildAutomaticConstructionOwnerR1({...common,semanticOwner:prefix+':unresolved-fullcycle',
  conditional:pack.openNeeds.map(n=>({id:needParameter(n.id),title:n.titleRu,valueType:'decimal',unitId:null,kind:'conditional',min:0})),
  rows:pack.openNeeds.map(n=>({rowId:rowId('open:'+n.id),formulaId:rowId('formula:open:'+n.id),section:'Открытые потребности полного цикла',category:'service',title:n.titleRu,
   unitId:'',expression:needParameter(n.id),procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:positive})),
  applicabilityRu:'Проектная геометрия труб, BOM, цены, поставка, основание, сопряжения, приёмка, полная машина с водителем и услуги остаются открытыми. Площадь фасада не определяет погонную длину, число труб, шаг крепления или заказную фасовку. Ручные 0/1 и 77 не закрывают источник.'});
 const parameters=[...base.parameters.map(p=>({...p,constraints_json:{...p.constraints_json},
  truth_metadata:facadeDownpipes00801FactIdsR1.includes(p.parameter_id)?{...p.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',
   guide:{...p.truth_metadata.guide as Json,source_role:'PROJECT_DOCUMENTATION',source_document:'EXACT_COMPOSITE_FACADE_DOWNPIPE_FABRICATION_SCOPE_GROSS_AREA_AND_PAYMENT_BOUNDARY_REQUIRED',
    source_locator:'Проектные факты объекта обязательны; исходная норма не подтверждает фактический проект, материал замены, цену или заказ.'}}:p.truth_metadata})),
  ...needs.parameters.filter(p=>p.parameter_id!==primary).map(p=>({...p,truth_metadata:{...unresolvedApplicationNormTruthR1(p.truth_metadata,
   'Не установлены применимая величина, единица и независимая граница оплаты. Пользовательские 0/1, длина трубы или цена 77 не заменяют источник.'),
   guide:{...p.truth_metadata.guide as Json,source_document:'APPLICATION_SOURCE_AND_SEPARATE_PAYMENT_REQUIRED'}}}))].map((p,ordinal)=>({...p,ordinal}));
 const physical=base.resources.map((r,index)=>{
  const source=pack.physicalSourceRows[index],operation=pack.operationsIncludedInWholeLabour[index-pack.physicalSourceRows.length];
  const isIncluded=operation!==undefined,{row_sha256:_old,...body}=r;
  const changed={...body,...(isIncluded?{cost_owner_id:rowId('whole-worker')}:{}),resource_graph:{...r.resource_graph,
   ...(isIncluded?{parentCostOwnerId:rowId('whole-worker'),includedInResourceOwnerRowId:rowId('whole-worker')}:{}),
   derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[primary],
    reasonRu:'Расход определяется полной площадью фасада и обязательными фактами единого состава; длина трубы или ручная строка не заменяют колонку источника.'},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,
    detailsRu:[isIncluded?'Операция уже оплачена единым трудом; второй платёж не допускается.':source!.id==='whole-worker'?'Единый труд 13,40 чел.-ч на 100 м² фасада; все три операции включены и повторно не оплачиваются.':'Буквальный справочный расход источника. Цена может быть сохранена только как справочное значение; оплаты и закупки нет.',
     'Проектная применимость, коммерческая комплектация, допустимость материалов, поставщик и фасовка не подтверждены исходной нормой.',
     'При отсутствии обязательного факта применённые строки не создаются; условное количество может оставаться только справкой в предварительной потребности.']}},
   source_metadata:{...r.source_metadata,...(source?.id!=='whole-worker'?{automaticGenericPriceInheritanceAllowed:false}:{}),sourceRole:isIncluded?'INCLUDED_OFFICIAL_OPERATION_SCOPE':'OFFICIAL_EXACT_COLUMN_QUANTITY_CANDIDATE_NOT_PUBLISHED',
    normativeTrace:[{sourceId:pack.sourceId,normId:pack.normId,exact_locator:pack.source.locatorRu,source_artifact_sha256:pack.source.sha256,
     sourceRole:isIncluded?'INCLUDED_OFFICIAL_OPERATION_SCOPE':'OFFICIAL_EXACT_COLUMN_QUANTITY_CANDIDATE_NOT_PUBLISHED'}],
    normativeResourceCode:source?.resourceCode??null,exact_column:pack.normId,source_artifact_sha256:pack.source.sha256,sourceQuantityDenominatorM2:100,
    sourceQuantityAccepted:!isIncluded,sourceBindingCandidateOnly:!isIncluded,sourceQuantityAcceptanceScope:'VERIFIED_AGGREGATE_FACADE_RATE_NOT_STANDALONE_PIPE_METRES',sourceQuantityBasis:'GROSS_FACADE_WITHOUT_OPENING_DEDUCTIONS',standalonePipeQuantityNotDerived:true,
    conditionalNeedQuantityIsUnappliedReferenceOnly:true,catalogue_identity_pending:true,normative_binding_pending:true,full_technical_acceptance:false,
    machinePriceOwnerAdmitted:false,materialPaymentAdmitted:false,purchase_order_admission:false,codeSpecificOperatorRole:null,codeSpecificOperationScope:null,
    ...(isIncluded?{includedOperationId:operation.id,includedInWholeLabourOwnerRowId:rowId('whole-worker')}:{} )}};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 const unresolved=needs.resources.map((r,index)=>{const n=pack.openNeeds[index]!,{row_sha256:_old,...body}=r;
  const changed={...body,ordinal:physical.length+index,source_metadata:{...r.source_metadata,sourceRole:'UNRESOLVED_APPLICATION_NORM',automaticGenericPriceInheritanceAllowed:false,normativeTrace:[],normative_source_ids:[],
   missingFact:n.sourceOrFact,nextTask:n.task,resolutionOwner:n.evidenceOwner,acceptanceEvidence:n.acceptance,quantityUnitUnconfirmed:true,
   standalonePipeQuantity:null,materialOrderQuantity:null,extraPaymentNotAssumed:true,full_technical_acceptance:false},resource_graph:{...r.resource_graph,
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:n.titleRu,nameRu:n.titleRu,brandAndModelRu:null,specificationRu:null,
    detailsRu:[n.sourceOrFact,n.task,'Владелец: '+n.evidenceOwner,n.acceptance]}}};return {...changed,row_sha256:estimateDeterministicHash(changed)};});
 return {...base,catalogId:null,workKey:null,groupId:null,identityAdmitted:false,publicationAllowed:false,fullTechnicalAcceptance:false,
  parameters,formulas:[...base.formulas,...needs.formulas],resources:[...physical,...unresolved]};
}
/** TEST_ONLY facts; never approved project values or runtime defaults. */
export function facadeDownpipes00801ScenarioFactsR1(area='100'):Record<string,unknown>{
 return {[primary]:area,...Object.fromEntries(pack.scopeFacts.map(f=>[f.id,f.allowedValues[0]])),
  ...Object.fromEntries(pack.projectFactsRequired.map(f=>[f.id,'TEST_ONLY: '+f.titleRu])),steel_thickness_mm:'0.7',working_height_m:'15'};
}
export async function compileFacadeDownpipes00801ScenarioR1(submittedParameters:Record<string,unknown>,
 rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimateCompileCoreInput['priceItems']=[]){
 const d=facadeDownpipes00801QuantityDefinitionR1();
 const compiled=await compileCanonicalEstimateCore({operation:'recalculate',catalogId:'TEST_ONLY_FACADE_DOWNPIPES00801_NO_CATALOG_BINDING',compilerVersion:pack.contract,
  primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
  submittedParameters,confirmedParameters:{},rowOverrides,priceItems,currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:async x=>estimateDeterministicHash(x)});
 return {catalogId:null,workKey:null,groupId:null,identityAdmitted:false,publicationAllowed:false,fullTechnicalAcceptance:false,compiled} as const;
}
/** Finite source/full-cycle expectations, independently declared from the frozen source map. */
export function facadeDownpipes00801IndependentCompletenessMapR1(){
 const entry=(id:string,category:string,unitId:string|null,quantityRule:string,specification:string,open=false)=>({
  expectedResourceId:pack.normId+':'+id,operationId:'facade-flashings-with-fabricated-downpipes-00801',category,unitId,quantityRule,specification,
  condition:'Единый состав фасадных обделок с изготовлением, сборкой и навеской труб из оцинкованной стали 0,7 мм; полная площадь фасада без вычета проёмов; до 15 м.',sourceId:pack.sourceId,
  formulaId:rowId('formula:'+(open?'open:':'')+id),resolution:{kind:'ROW',rowId:rowId((open?'open:':'')+id)}});
 return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,
  evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],entries:[
   ...pack.physicalSourceRows.map(r=>entry(r.id,r.category,r.sourceUnit,'EXACT_RATE_PER_100_GROSS_FACADE_M2_COMPOSITE_SCOPE',(r.resourceCode??'AGGREGATE_NO_RESOURCE_CODE')+':'+r.ratePer100M2)),
   ...pack.operationsIncludedInWholeLabour.map(o=>entry(o.id,'work','m2','INCLUDED_IN_ONE_WHOLE_LABOUR_OWNER',o.titleRu)),
   ...pack.openNeeds.map(n=>entry(n.id,'service',null,'SOURCE_REQUIRED_NOT_QUANTIFIED',n.sourceOrFact+'; '+n.task,true)),
  ]};
}
