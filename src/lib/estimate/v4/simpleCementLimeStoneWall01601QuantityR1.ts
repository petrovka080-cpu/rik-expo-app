// WORK-only exact-source partial quantity consumer; no catalogue, identity, price or BOM admission.
import pack from '../../../../data/estimate-benchmarks/source-packs/simple-cement-lime-stone-wall-krer15-016-01-quantity-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
type Json=Record<string,unknown>;
export const simpleCementLime01601PackR1=pack;
export const simpleCementLime01601PrimaryR1=pack.measurement.parameterId;
export const simpleCementLime01601FactIdsR1=[...pack.scopeFacts,...pack.numericFacts,...pack.projectReferences].map(f=>f.id);
export const simpleCementLime01601NeedParameterIdsR1=pack.openNeeds.map(n=>'plaster01601_application_need_'+n.id.replaceAll('-','_'));
const p=pack.prefix,primary=pack.measurement.parameterId,positive={kind:'greater_than' as const,parameterId:primary,value:0};
export const simpleCementLime01601WholeRowIdR1=p+':whole-plaster-labour';
function rehash<T extends {row_sha256:string}>(r:T):T{const{row_sha256:_old,...body}=r;return{...body,row_sha256:estimateDeterministicHash(body)} as T;}
/** Uses only the shared automatic owner and FormulaGraph/compiler; no thickness/pump method or brand is inferred. */
export function simpleCementLime01601QuantityDefinitionR1():AutomaticOwnerDefinition&{catalogId:null;workKey:null;groupId:null;identityAdmitted:false;publicationAllowed:false;fullTechnicalAcceptance:false}{
 if(pack.catalogId!==null||pack.workKey!==null||pack.groupId!==null||pack.normId!=='15-02-016-01'||pack.source.sha256!=='58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc'
  ||pack.measurement.denominator!=='100'||pack.physicalRows.length!==8||pack.openNeeds.length!==10||pack.physicalRows.filter(r=>r.costTreatment==='OWN_COST').map(r=>r.id).join()!=='whole-plaster-labour')throw Error('SIMPLE_CEMENT_LIME01601_EXACT_SOURCE_ONLY_REQUIRED');
 const facts:AutomaticParameterSpec[]=[
  ...pack.scopeFacts.map(f=>({id:f.id,title:f.titleRu,valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[...f.values],requiredWhen:positive})),
  ...pack.numericFacts.map(f=>({id:f.id,title:f.titleRu,valueType:'decimal' as const,unitId:f.unitId,kind:'conditional' as const,min:Number(f.min),max:Number(f.max),requiredWhen:positive})),
  ...pack.projectReferences.map(f=>({id:f.id,title:f.titleRu,valueType:'text' as const,unitId:null,kind:'conditional' as const,requiredWhen:positive})),
 ];
 const rows:AutomaticRowSpec[]=[...pack.physicalRows.map(r=>({rowId:p+':'+r.id,formulaId:p+':formula:'+r.id,section:pack.titleRu,category:r.category,title:r.titleRu,unitId:r.unitId,
  expression:primary+'*'+r.ratePer100M2+'/100',inputParameterIds:[...simpleCementLime01601FactIdsR1],procurement:false,inclusion:positive,
  costTreatment:r.costTreatment==='OWN_COST'?'OWN_COST' as const:'INFORMATIONAL_SCOPE' as const})),
  {rowId:p+':'+pack.includedOperation.id,formulaId:p+':formula:'+pack.includedOperation.id,section:pack.titleRu,category:'work',title:pack.includedOperation.titleRu,unitId:'m2',expression:primary,
   inputParameterIds:[...simpleCementLime01601FactIdsR1],procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inclusion:positive},
  ...pack.openNeeds.map((n,i)=>({rowId:p+':open:'+n.id,formulaId:p+':formula:open:'+n.id,section:'Открытые потребности простой цементно-известковой штукатурки',category:'service',title:n.titleRu,unitId:'',
   expression:simpleCementLime01601NeedParameterIdsR1[i]!,procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const,inclusion:positive})),
 ];
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:p,sourceId:pack.sourceKeyProposal,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
  ordinary:[{id:primary,title:'Самостоятельная чистая площадь оштукатуренной внутренней каменной стены по §2.11',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0}],profile:[],
  conditional:[...facts,...pack.openNeeds.map((n,i)=>({id:simpleCementLime01601NeedParameterIdsR1[i]!,title:n.titleRu,valueType:'decimal' as const,unitId:null,kind:'conditional' as const,min:0}))],
  rows,deferMissingProjectFactsToRows:true,applicabilityRu:pack.scopeRu,excludedUnownedAssumptions:pack.excludedRu});
 const parameters=built.parameters.map(q=>{
  if(simpleCementLime01601NeedParameterIdsR1.includes(q.parameter_id))return{...q,truth_metadata:unresolvedApplicationNormTruthR1(q.truth_metadata,
   'Исходник не устанавливает для этой потребности применимость, единицу, количество или самостоятельную оплату. Пользовательские 0/1 и цена 77 не заменяют источник.')};
  if(!simpleCementLime01601FactIdsR1.includes(q.parameter_id))return q;
  return{...q,constraints_json:{...q.constraints_json,...(q.parameter_id==='plaster01601_room_height_m'?{exclusiveMin:0}:{})},truth_metadata:{...q.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
   provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...q.truth_metadata.guide as Json,source_role:'PROJECT_DOCUMENTATION',guide_short_ru:q.title_ru+'; подтвердите отдельным проектным документом. Это не акт готовности, не нормативный коэффициент и не значение по умолчанию.'}}};
 });
 const resources=built.resources.map(r=>{
  const key=r.row_id.slice(p.length+1),source=pack.physicalRows.find(x=>x.id===key),need=pack.openNeeds.find(x=>key==='open:'+x.id),included=key===pack.includedOperation.id,whole=key==='whole-plaster-labour';
  const formula=built.formulas.find(f=>f.formula_id===r.formula_id)!;
  return rehash({...r,...(included?{cost_owner_id:simpleCementLime01601WholeRowIdR1}:{}),resource_graph:{...r.resource_graph,
   ...(!need?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[...formula.input_parameter_ids],reasonRu:'Количество исходной колонки меняется только отдельно измеренной чистой площадью и проектными фактами. Нет ручного расхода, вывода толщины из раствора или переноса из другой смеси.'}}:{}),
   ...(included?{parentCostOwnerId:simpleCementLime01601WholeRowIdR1,includedInResourceOwnerRowId:simpleCementLime01601WholeRowIdR1}:{}),
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:source?.printedNameRu??null,
    detailsRu:need?[need.missingFactRu,need.nextTaskRu,'Владелец: '+need.ownerRu]:[pack.source.locatorRu,whole?'75,40 чел.-ч на 100 м² — цельный труд. Разряд 3,5 не множитель часов; оператор отдельно не оплачивается.':included?pack.includedOperation.unitMeaningRu:'Только буквальный исходный расход, не закупка, ставка, складской остаток или фактическая приёмка.',
     ...(included?pack.includedOperation.printedCompositionRu:[]),'Чистую площадь внутренней стены нельзя подменять полной площадью фасада без вычета проёмов. Толщина и способ нанесения из объёма раствора или кода насоса не выводятся.']}},
   source_metadata:{...r.source_metadata,...(!whole?{automaticGenericPriceInheritanceAllowed:false}:{}),
    sourceRole:need?'UNRESOLVED_APPLICATION_NORM':whole?'OFFICIAL_WHOLE_SIMPLE_PLASTER_LABOUR_NORM':included?'INCLUDED_SOURCE_OPERATION_COMPOSITION':'SOURCE_QUANTITY_REFERENCE_COMMERCIAL_SCOPE_PENDING',
    normativeTrace:need?[]:[{sourceId:pack.sourceKeyProposal,normId:pack.normId,exact_locator:pack.source.locatorRu,source_artifact_sha256:pack.source.sha256}],
    ...(need?{normative_source_ids:[],quantityUnitUnconfirmed:true,missingFact:need.missingFactRu,nextTask:need.nextTaskRu,resolutionOwner:need.ownerRu}:{}),
    resourceCode:source?.resourceCode??null,printedResourceNameRu:source?.printedNameRu??null,source_artifact_sha256:pack.source.sha256,sourceQuantityDenominatorM2:100,
    ...(whole?{workersGrade:'3.5',wholeOperationNoAdditionalOperator:true}:{}),
    ...(included?{includedOperations:[...pack.includedOperation.printedCompositionRu],includedMarkerIsNotSeparateElementArea:true}:{}),
    ...(source?.category==='equipment'?{machinePriceScopePending:true,operatorRoleNotAdmitted:true,noAdditionalOperatorInferred:false}:{}),
    machinePriceOwnerAdmitted:false,materialPaymentAdmitted:false,purchase_order_admission:false,catalogue_identity_pending:true,normative_binding_pending:true,full_technical_acceptance:false,publicationAllowed:false}});
 });
 return{...built,catalogId:null,workKey:null,groupId:null,identityAdmitted:false,publicationAllowed:false,fullTechnicalAcceptance:false,parameters,resources};
}
/** TEST_ONLY facts; caller independently supplies the measured net wall area. No default project data. */
export function simpleCementLime01601ScenarioFactsR1(area:string):Record<string,unknown>{
 return{[primary]:area,...Object.fromEntries(pack.scopeFacts.map(f=>[f.id,f.values[0]])),plaster01601_room_height_m:'3',
  ...Object.fromEntries(pack.projectReferences.map(f=>[f.id,'TEST_ONLY отдельный проектный документ; не фактический акт или допуск: '+f.titleRu]))};
}
export async function compileSimpleCementLime01601ScenarioR1(parameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimateCompileCoreInput['priceItems']=[]){
 const d=simpleCementLime01601QuantityDefinitionR1();
 const compiled=await compileCanonicalEstimateCore({operation:'recalculate',catalogId:'TEST_ONLY_SIMPLE_CEMENT_LIME01601_NO_CATALOG_BINDING',compilerVersion:pack.contract,primaryMeasureParameterId:primary,
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:parameters,confirmedParameters:{},rowOverrides,priceItems,currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:async value=>estimateDeterministicHash(value)});
 return{catalogId:null,workKey:null,groupId:null,publicationAllowed:false,fullTechnicalAcceptance:false,compiled} as const;
}
export function simpleCementLime01601CompletenessMapR1(){
 const common={operationId:'simple-cement-lime-internal-stone-wall01601',sourceId:pack.sourceKeyProposal,condition:pack.scopeRu};
 const item=(id:string,category:string,unitId:string|null,quantityRule:string,specification:string)=>({...common,expectedResourceId:pack.normId+':'+id,category,unitId,quantityRule,specification,formulaId:p+':formula:'+id,resolution:{kind:'ROW',rowId:p+':'+id}});
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],entries:[
  ...pack.physicalRows.map(r=>item(r.id,r.category,r.unitId,'PRINTED_SCALAR_PER100_NET_WALL_M2_NO_PRODUCT_ORDER',r.printedNameRu+':'+r.ratePer100M2)),
  {...item(pack.includedOperation.id,'work','m2','INCLUDED_WHOLE_OPERATION_MARKER_NOT_SEPARATE_ELEMENT_MEASUREMENT',pack.includedOperation.unitMeaningRu),resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:p+':'+pack.includedOperation.id,parentRowId:simpleCementLime01601WholeRowIdR1}},
  ...pack.openNeeds.map(n=>item('open:'+n.id,'service',null,'UNRESOLVED_SOURCE_NOT_QUANTIFIED',n.nextTaskRu))]};
}
