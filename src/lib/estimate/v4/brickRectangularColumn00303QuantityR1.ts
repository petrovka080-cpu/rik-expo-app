// Source-only partial consumer. Catalogue, source-registry, price and procurement admission remain pending ROOT.
import pack from '../../../../data/estimate-benchmarks/source-packs/brick-rectangular-unreinforced-column-krer08-003-03-quantity-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
type Json=Record<string,unknown>;
export const brickColumn00303PackR1=pack;
export const brickColumn00303PrimaryR1=pack.measurement.parameterId;
export const brickColumn00303FactIdsR1=[...pack.scopeFacts,...pack.numericFacts,...pack.projectReferences].map(f=>f.id);
export const brickColumn00303NeedParameterIdsR1=pack.openNeeds.map(n=>'column00303_application_need_'+n.id.replaceAll('-','_'));
const p=pack.prefix,primary=pack.measurement.parameterId,positive={kind:'greater_than' as const,parameterId:primary,value:0};
export const brickColumn00303WholeRowIdR1=p+':whole-masonry-labour';
function rehash<T extends {row_sha256:string}>(r:T):T{const{row_sha256:_old,...body}=r;return{...body,row_sha256:estimateDeterministicHash(body)} as T;}
/** Only the shared automatic owner/FormulaGraph/compiler performs quantity and money arithmetic. */
export function brickColumn00303QuantityDefinitionR1():AutomaticOwnerDefinition&{catalogId:null;workKey:null;groupId:null;identityAdmitted:false;publicationAllowed:false;fullTechnicalAcceptance:false}{
 const signature=pack.physicalRows.map(r=>[r.id,r.resourceCode,r.unitId,r.ratePerM3]);
 if(pack.catalogId!==null||pack.workKey!==null||pack.groupId!==null||pack.normId!=='08-02-003-03'||pack.source.sha256!=='cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436'
  ||pack.measurement.denominator!=='1'||pack.openNeeds.length!==10||JSON.stringify(signature)!==JSON.stringify([
   ['whole-masonry-labour','000-1003-8','man_hour','7.93'],['operator-information',null,'man_hour','0.42'],['tower-crane8t-reference','02-0005','machine_hour','0.42'],
   ['water-reference','01-0601-0001','m3','0.1'],['ceramic-brick-reference','01-3306-0005','item','404'],['ready-m50-mortar-reference','03-0405-0003','m3','0.22']])
  ||pack.physicalRows.filter(r=>r.costTreatment==='OWN_COST').map(r=>r.id).join()!=='whole-masonry-labour')throw Error('BRICK_COLUMN00303_EXACT_SOURCE_ONLY_REQUIRED');
 const facts:AutomaticParameterSpec[]=[
  ...pack.scopeFacts.map(f=>({id:f.id,title:f.titleRu,valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[...f.values],requiredWhen:positive})),
  ...pack.numericFacts.map(f=>({id:f.id,title:f.titleRu,valueType:'decimal' as const,unitId:f.unitId,kind:'conditional' as const,min:Number(f.min),max:Number(f.max),requiredWhen:positive})),
  ...pack.projectReferences.map(f=>({id:f.id,title:f.titleRu,valueType:'text' as const,unitId:null,kind:'conditional' as const,requiredWhen:positive})),
 ];
 const rows:AutomaticRowSpec[]=[...pack.physicalRows.map(r=>({rowId:p+':'+r.id,formulaId:p+':formula:'+r.id,section:pack.titleRu,category:r.category,title:r.titleRu,unitId:r.unitId,
  expression:primary+'*'+r.ratePerM3+'/1',inputParameterIds:[...brickColumn00303FactIdsR1],procurement:false,inclusion:positive,costTreatment:r.costTreatment==='OWN_COST'?'OWN_COST' as const:'INFORMATIONAL_SCOPE' as const})),
  {rowId:p+':'+pack.includedOperation.id,formulaId:p+':formula:'+pack.includedOperation.id,section:pack.titleRu,category:'work',title:pack.includedOperation.titleRu,unitId:'m3',expression:primary,
   inputParameterIds:[...brickColumn00303FactIdsR1],procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inclusion:positive},
  ...pack.openNeeds.map((n,i)=>({rowId:p+':open:'+n.id,formulaId:p+':formula:open:'+n.id,section:'Открытые потребности кладки кирпичных столбов',category:'service',title:n.titleRu,unitId:'',expression:brickColumn00303NeedParameterIdsR1[i]!,procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const,inclusion:positive})),
 ];
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:p,operationCompositionGroupId:p,sourceId:pack.sourceKeyProposal,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
  ordinary:[{id:primary,title:'Самостоятельный проектный объём кирпичной кладки прямоугольных неармированных столбов, м³',valueType:'decimal',unitId:'m3',kind:'ordinary',min:0}],profile:[],
  conditional:[...facts,...pack.openNeeds.map((n,i)=>({id:brickColumn00303NeedParameterIdsR1[i]!,title:n.titleRu,valueType:'decimal' as const,unitId:null,kind:'conditional' as const,min:0}))],
  rows,deferMissingProjectFactsToRows:true,applicabilityRu:pack.scopeRu,excludedUnownedAssumptions:pack.excludedRu});
 const parameters=built.parameters.map(q=>{
  if(brickColumn00303NeedParameterIdsR1.includes(q.parameter_id))return{...q,truth_metadata:unresolvedApplicationNormTruthR1(q.truth_metadata,'Для этой потребности не установлены применимость, единица, количество или отдельная оплата. Пользовательские 0/1 и цена 77 не заменяют источник.')};
  if(!brickColumn00303FactIdsR1.includes(q.parameter_id))return q;
  return{...q,constraints_json:{...q.constraints_json,...(q.parameter_id==='column00303_storey_height_m'?{exclusiveMin:0}:{})},truth_metadata:{...q.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
   provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...q.truth_metadata.guide as Json,source_role:'PROJECT_DOCUMENTATION',guide_short_ru:q.title_ru+'; подтвердите отдельным проектным документом. Нет значения по умолчанию, расчёта несущей способности или акта фактической готовности.'}}};
 });
 const resources=built.resources.map(r=>{
  const key=r.row_id.slice(p.length+1),source=pack.physicalRows.find(x=>x.id===key),need=pack.openNeeds.find(x=>key==='open:'+x.id),included=key===pack.includedOperation.id,whole=key==='whole-masonry-labour';
  const formula=built.formulas.find(f=>f.formula_id===r.formula_id)!;
  return rehash({...r,...(included?{cost_owner_id:brickColumn00303WholeRowIdR1}:{}),resource_graph:{...r.resource_graph,
   ...(!need?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[...formula.input_parameter_ids],reasonRu:'Исходный расход меняется только самостоятельным объёмом кладки столбов и подтверждёнными проектными фактами. Нет пересчёта из площади/столбов, торговой фасовки или рецепта раствора.'}}:{}),
   ...(included?{parentCostOwnerId:brickColumn00303WholeRowIdR1,includedInResourceOwnerRowId:brickColumn00303WholeRowIdR1}:{}),
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:source?.printedNameRu??null,
    detailsRu:need?[need.missingFactRu,need.nextTaskRu,'Владелец: '+need.ownerRu]:[pack.source.locatorRu,whole?pack.payment.wholeOnceRu:included?pack.includedOperation.unitMeaningRu:'Только исходное справочное количество; не заказ, фасовка, принятая цена или фактическая приёмка.',...(included?pack.includedOperation.printedCompositionRu:[]),pack.measurement.ruleRu]}},
   source_metadata:{...r.source_metadata,...(!whole?{automaticGenericPriceInheritanceAllowed:false}:{}),sourceRole:need?'UNRESOLVED_APPLICATION_NORM':whole?'OFFICIAL_WHOLE_UNREINFORCED_COLUMN_MASONRY_LABOUR_NORM':included?'INCLUDED_SOURCE_OPERATION_COMPOSITION':'SOURCE_QUANTITY_REFERENCE_COMMERCIAL_SCOPE_PENDING',
    normativeTrace:need?[]:[{sourceId:pack.sourceKeyProposal,normId:pack.normId,exact_locator:pack.source.locatorRu,source_artifact_sha256:pack.source.sha256}],
    ...(need?{normative_source_ids:[],quantityUnitUnconfirmed:true,missingFact:need.missingFactRu,nextTask:need.nextTaskRu,resolutionOwner:need.ownerRu}:{}),
    resourceCode:source?.resourceCode??null,printedResourceNameRu:source?.printedNameRu??null,source_artifact_sha256:pack.source.sha256,sourceQuantityDenominatorM3:1,
    ...(whole?{workersGrade:'3.8',operatorAdditionalPaidOwnerAdmitted:false,operatorIsNotProvenPartOfWorkerHours:true}:{}),
    ...(included?{includedOperations:[...pack.includedOperation.printedCompositionRu],includedMarkerIsNotSeparateAccessOrMaterialQuantity:true}:{}),
    ...(source?.category==='equipment'?{machinePriceScopePending:true,operatorRoleNotAdmitted:true,noAdditionalOperatorInferred:false}:{}),
    machinePriceOwnerAdmitted:false,materialPaymentAdmitted:false,purchase_order_admission:false,catalogue_identity_pending:true,normative_binding_pending:true,full_technical_acceptance:false,publicationAllowed:false}});
 });
 return{...built,catalogId:null,workKey:null,groupId:null,identityAdmitted:false,publicationAllowed:false,fullTechnicalAcceptance:false,parameters,resources};
}
/** TEST_ONLY complete project facts, not defaults or actual construction acceptance. */
export function brickColumn00303ScenarioFactsR1(volume:string):Record<string,unknown>{
 return{[primary]:volume,...Object.fromEntries(pack.scopeFacts.map(f=>[f.id,f.values[0]])),column00303_storey_height_m:'4',...Object.fromEntries(pack.projectReferences.map(f=>[f.id,'TEST_ONLY отдельный проектный документ; не фактический акт или допуск: '+f.titleRu]))};
}
export async function compileBrickColumn00303ScenarioR1(parameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimateCompileCoreInput['priceItems']=[]){
 const d=brickColumn00303QuantityDefinitionR1();
 const compiled=await compileCanonicalEstimateCore({operation:'recalculate',catalogId:'TEST_ONLY_BRICK_COLUMN00303_NO_CATALOG_BINDING',compilerVersion:pack.contract,primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:parameters,confirmedParameters:{},rowOverrides,priceItems,currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:async value=>estimateDeterministicHash(value)});
 return{catalogId:null,workKey:null,groupId:null,publicationAllowed:false,fullTechnicalAcceptance:false,compiled} as const;
}
export function brickColumn00303CompletenessMapR1(){
 const common={operationId:'brick-rectangular-unreinforced-column00303',sourceId:pack.sourceKeyProposal,condition:pack.scopeRu};
 const item=(id:string,category:string,unitId:string|null,quantityRule:string,specification:string)=>({...common,expectedResourceId:pack.normId+':'+id,category,unitId,quantityRule,specification,formulaId:p+':formula:'+id,resolution:{kind:'ROW',rowId:p+':'+id}});
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],entries:[
  ...pack.physicalRows.map(r=>item(r.id,r.category,r.unitId,'PRINTED_SCALAR_PER1_PROJECT_COLUMN_MASONRY_M3_NO_PRODUCT_ORDER',r.printedNameRu+':'+r.printedRatePerM3+' '+r.printedUnitRu)),
  {...item(pack.includedOperation.id,'work','m3','INCLUDED_WHOLE_OPERATION_MARKER_NOT_SEPARATE_SCAFFOLD_OR_SUPPLY_QUANTITY',pack.includedOperation.unitMeaningRu),resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:p+':'+pack.includedOperation.id,parentRowId:brickColumn00303WholeRowIdR1}},
  ...pack.openNeeds.map(n=>item('open:'+n.id,'service',null,'UNRESOLVED_SOURCE_NOT_QUANTIFIED',n.nextTaskRu))]};
}
