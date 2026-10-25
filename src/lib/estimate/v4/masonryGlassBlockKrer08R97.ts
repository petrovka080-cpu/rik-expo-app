import pack from '../../../../data/estimate-benchmarks/source-packs/masonry-glass-block-krer08-04-002-r97.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
 type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

type Profile=typeof pack.profiles[number];
type Resource=AutomaticOwnerDefinition['resources'][number];
export const masonryGlassBlockPackR97=pack;
export type MasonryGlassBlockPhysicalResultR97='partition'|'opening-fill';
function check(ok:unknown,code:string):asserts ok{if(!ok)throw Error('MASONRY_GLASS_R97_'+code);}
const rates:Readonly<Record<string,string>>={
 '08-04-002-01':'135.70|1.96|1.96|0.99|2600|112|0.74',
 '08-04-002-02':'133.40|1.96|1.96|0.99|2600|112|0.74',
 '08-04-002-03':'156.40|1.96|1.96|0.99|2600|112|0.74',
 '08-04-002-04':'152.95|1.96|1.96|0.99|2600|112|0.74'};
const codes='operators|02-0005|40-0001|01-7801-0003|03-0102-0001|03-0405-0002';
function rehash(r:Resource):Resource{const{row_sha256:_old,...body}=r;return{...body,row_sha256:estimateDeterministicHash(body)};}
export function assertMasonryGlassBlockSourceR97():void{
 check(pack.source.sha256==='cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436'
  &&pack.measurementDenominator==='100'&&pack.source.jurisdiction==='KG','OWN_PRIMARY_SOURCE');
 check(pack.profiles.length===4&&pack.physicalResults===2&&!pack.identityAdmitted&&!pack.full,'TWO_RESULTS_FOUR_COLUMNS_NOT_FULL');
 for(const p of pack.profiles){
  check(p.rows.length===7&&p.rows.map(r=>r.ratePer100M2).join('|')===rates[p.normId],'EXACT_WHOLE_SOURCE_COLUMN');
  check(p.rows.slice(1).map(r=>r.resourceCode??'operators').join('|')===codes,'OWN_MACHINES_AND_MATERIALS');
  check(p.rows.map(r=>r.unitId).join('|')==='man_hour|man_hour|machine_hour|machine_hour|piece|kg|m3','NORMALIZED_UNITS_ONCE');
  check(p.rows[4]?.printedUnitRu==='1000 шт.'&&p.rows[4]?.printedRatePer100M2==='2.6'
   &&p.rows[4]?.normalizationFactor==='1000','BLOCK_COUNT_NOT_PACKAGING');
  check(p.rows[5]?.printedUnitRu==='т'&&p.rows[5]?.printedRatePer100M2==='0.112'
   &&p.rows[5]?.normalizationFactor==='1000','REINFORCEMENT_T_TO_KG_ONCE');
  check(p.operations.length===(p.physicalResult==='partition'?3:2),'INCLUDED_POINTING_SCOPE');
 }
}
/** Classifies the selected physical result and geometry; does not calculate quantities. */
export function selectMasonryGlassBlockProfileR97(result:MasonryGlassBlockPhysicalResultR97,storeyHeight:string|number):Profile{
 check(result==='partition'||result==='opening-fill','PHYSICAL_RESULT');
 const h=typeof storeyHeight==='number'?storeyHeight:Number(storeyHeight);check(Number.isFinite(h)&&h>0,'POSITIVE_FINITE_HEIGHT');
 const p=pack.profiles.find(p=>p.physicalResult===result&&p.storeyHeightBand===(h<=4?'LTE4':'GT4'));
 check(p,'EXACT_PROFILE');return p;
}
export function masonryGlassBlockDefinitionR97(profileKey:string){
 assertMasonryGlassBlockSourceR97();const p=pack.profiles.find(p=>p.key===profileKey);check(p,'EXACT_PROFILE');
 const rid=(key:string)=>p.prefix+':'+key,area=p.primaryId,height=pack.heightId;
 const positive={kind:'greater_than' as const,parameterId:area,value:0};
 const needIds=pack.needs.map(n=>'glass97_'+p.normId.replaceAll('-','_')+'_need_'+n.key.replaceAll('-','_'));
 const row=(key:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={}):AutomaticRowSpec=>({
  rowId:rid(key),formulaId:rid('formula:'+key),section:p.titleRu,title,category,unitId,expression,inclusion:positive,procurement:false,...extra});
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:p.prefix,operationCompositionGroupId:p.prefix,
  sourceId:pack.sourceId,normId:p.normId,
  sourceMetadata:{source_title:p.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,
   artifact_sha256:pack.source.sha256,exact_locator:'КРЕР '+p.normId+'; PDF '+p.sourcePages.join(', ')+'; 100 м²'},
  applicabilityRu:p.titleRu+'; только пустотелый бесцветный стеклоблок194×194×98мм, готовый цементно-известковый М25 и армирование исходной системы. Не универсальная стеклянная перегородка.',
  ordinary:[{id:area,title:p.physicalResult==='partition'?'Чистая площадь стеклоблочной перегородки':'Площадь участка проёма, заполняемого стеклоблоками',
   valueType:'decimal',unitId:'m2',kind:'ordinary',min:0},
   {id:height,title:'Высота этажа',valueType:'decimal',unitId:'m',kind:'ordinary',min:0.000000001,...(p.storeyHeightBand==='LTE4'?{max:4}:{})}],profile:[],
  conditional:pack.needs.map((n,i)=>({id:needIds[i]!,title:n.titleRu,valueType:'decimal' as const,kind:'conditional' as const,unitId:null,min:0})),
  rows:[...p.rows.map(r=>row(r.key,r.titleRu,r.category,r.unitId,area+'*'+r.ratePer100M2+'/100',
   {costTreatment:r.key==='whole-labour'?'OWN_COST':'INFORMATIONAL_SCOPE'})),
   ...p.operations.map(o=>row('operation:'+o.key,o.titleRu,'work','m2',area,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'})),
   ...pack.needs.map((n,i)=>row('need:'+n.key,n.titleRu,'service','',needIds[i]!,{costTreatment:'INFORMATIONAL_SCOPE'}))],
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[...pack.measurementRulesRu,
   'Нормативный армированный состав не является конструктивным расчётом, схемой анкеров или допуском фактического объекта.',
   'Нет новых публичных catalog/definition IDs, источниковых цен2015, универсального комплекта или переноса норм AAC/кирпича/фасада.']});
 const parameters=built.parameters.map(q=>{
  if(needIds.includes(q.parameter_id))return{...q,truth_metadata:unresolvedApplicationNormTruthR1(q.truth_metadata,
   pack.needs.find((_,i)=>needIds[i]===q.parameter_id)!.missingRu)};
  return{...q,...(q.parameter_id===height&&p.storeyHeightBand==='GT4'?{constraints_json:{...q.constraints_json,exclusiveMin:4}}:{}),
   truth_metadata:{...q.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_GEOMETRY'}}};
 });
 const resources=built.resources.map(r=>{
  const key=r.row_id.slice(p.prefix.length+1),source=p.rows.find(x=>x.key===key),need=pack.needs.find(n=>key==='need:'+n.key),
   included=p.operations.find(o=>key==='operation:'+o.key),whole=key==='whole-labour',opKey=included?.key??'assemble';
  const op=p.operations.find(o=>o.key===opKey);check(op,'SOURCE_OPERATION');
  const f=built.formulas.find(f=>f.formula_id===r.formula_id);check(f,'SOURCE_FORMULA');
  return rehash({...r,...(included?{cost_owner_id:rid('whole-labour')}:{}),resource_graph:{...r.resource_graph,
   ...(included?{parentCostOwnerId:rid('whole-labour'),includedInResourceOwnerRowId:rid('whole-labour')}:{}),
   ...(!need?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',
    unitId:r.unit_id,parameterIds:[...f.input_parameter_ids],reasonRu:'Изменяйте самостоятельную геометрию своего результата; единицы исходной нормы и её расход сохраняются.'}}:{}),
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:p.prefix,groupTitleRu:p.titleRu,
    operationId:need?rid('operation:need:'+need.key):rid('operation:'+opKey),operationTitleRu:need?.titleRu??op.titleRu,processOrdinal:need?100:20,
    completionCriterionRu:'Исходный количественный состав; фактическая готовность и полный комплект этим не приняты.',
    ...(whole?{additionalOperations:p.operations.filter(o=>o.key!==opKey).map(o=>({operationId:rid('operation:'+o.key),operationTitleRu:o.titleRu,processOrdinal:20}))}:{})},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,
    brandAndModelRu:null,specificationRu:null,detailsRu:[]}},
   source_metadata:{...r.source_metadata,automaticGenericPriceInheritanceAllowed:false,
    sourceRole:need?'UNRESOLVED_APPLICATION_NORM':whole?'OWN_COMPLETE_KG_GLASS_BLOCK_LABOUR_NORM':included?'INCLUDED_SOURCE_OPERATION':'OWN_SOURCE_QUANTITY_COMMERCIAL_ADMISSION_PENDING',
    normativeTrace:need?[]:[{sourceId:pack.sourceId,normId:p.normId,source_artifact_sha256:pack.source.sha256,
     exact_locator:'КРЕР '+p.normId+'; PDF '+p.sourcePages.join(', ')+'; 100 м²'}],
    ...(need?{normative_source_ids:[],missingFact:need.missingRu,resolutionOwner:need.owner,quantityUnitUnconfirmed:true}:{}),
    resourceCode:source?.resourceCode??null,sourceRatePer100M2:source?.ratePer100M2??null,
    sourcePrintedUnitRu:source?.printedUnitRu??null,sourcePrintedRatePer100M2:source?.printedRatePer100M2??null,
    exactNormalizationFactor:source?.normalizationFactor??null,sourcePrices2015NotImported:true,
    workerGrade:whole?p.workerGrade:null,gradeIsNotMultiplier:true,extraOperatorPaidOwnerAdmitted:false,
    physicalResult:p.physicalResult,materialPaymentAdmitted:false,machinePaymentAdmitted:false,purchase_order_admission:false,
    identityAdmitted:false,publicationAllowed:false,full_technical_acceptance:false}});
 });
 return{...built,parameters,formulas:built.formulas.map(f=>({...f,ast_sha256:estimateDeterministicHash(f.ast)})),resources,
  profile:p,sourceNeedParameterIds:needIds,catalogId:null,workKey:null,identityAdmitted:false,publicationAllowed:false,fullTechnicalAcceptance:false};
}

export function compileMasonryGlassBlockSourceScenarioR97(profileKey:string,parameters:Record<string,unknown>){
 const d=masonryGlassBlockDefinitionR97(profileKey);
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,
  catalogId:'TEST_ONLY_GLASS_BLOCK_NO_CATALOG_ID',primaryMeasureParameterId:d.profile.primaryId,
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
  submittedParameters:parameters,confirmedParameters:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,
  hashJson:async v=>estimateDeterministicHash(v)});
}
export function masonryGlassBlockCompletenessMapR97(profileKey:string){
 const p=pack.profiles.find(p=>p.key===profileKey);check(p,'EXACT_PROFILE');const rid=(key:string)=>p.prefix+':'+key;
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',
  generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:pack.source.sha256,
  evidenceReferences:[pack.source.officialUrl,'КРЕР '+p.normId],fullTechnicalAcceptance:false,entries:[
   ...p.rows.map(r=>({expectedResourceId:p.normId+':'+r.key,operationId:rid('operation:assemble'),requiredOperationIds:[rid('operation:assemble')],
    category:r.category,unitId:r.unitId,sourceId:pack.sourceId,condition:p.key,specification:r.titleRu,
    quantityRule:'OWN_WHOLE_COLUMN_PER100_OWN_NET_M2_NORMALIZATION_ONCE',formulaId:rid('formula:'+r.key),resolution:{kind:'ROW',rowId:rid(r.key)}})),
   ...p.operations.map(o=>({expectedResourceId:p.normId+':operation:'+o.key,operationId:rid('operation:'+o.key),requiredOperationIds:[rid('operation:'+o.key)],
    category:'work',unitId:'m2',sourceId:pack.sourceId,condition:p.key,specification:o.titleRu,quantityRule:'INCLUDED_WHOLE_LABOUR_NO_SPLIT',
    formulaId:rid('formula:operation:'+o.key),resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:rid('operation:'+o.key),parentRowId:rid('whole-labour')}})),
   ...pack.needs.map(n=>({expectedResourceId:p.normId+':need:'+n.key,operationId:rid('operation:need:'+n.key),requiredOperationIds:[rid('operation:need:'+n.key)],
    category:'service',unitId:null,sourceId:pack.sourceId,condition:p.key,specification:n.missingRu,quantityRule:'UNRESOLVED_OWN_APPLICATION_NORM_OR_OBJECT_BOUNDARY',
    formulaId:rid('formula:need:'+n.key),resolution:{kind:'ROW',rowId:rid('need:'+n.key)}}))]};
}
