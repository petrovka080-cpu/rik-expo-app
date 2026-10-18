// WORK conditional consumer wrapper. Original catalogue-null four-row/23-case fragment is immutable.
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
 type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {pavingCutStationary70QuantityDefinitionR1,pavingCutStationary70QuantityPackR1 as pack,
 pavingCutStationary70PrefixR1 as prefix,pavingCutStationary70PrimaryR1 as primary,
 pavingCutStationary70MethodR1 as method} from './pavingCutStationary70QuantityR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
type Json=Record<string,unknown>;
/** ROOT proposed identity; not assigned/published by this proposal. */
export const pavingCut70CatalogIdProposalR1='canonical-work:master:paving_tile_stationary_cut_70mm_actual_linear_m_krer27_07_005_04';
export const pavingCut70WorkKeyProposalR1='paving_tile_stationary_cut_70mm_actual_linear_m_krer27_07_005_04';
export const pavingCut70SourceIdentityProposalR1='kg:krer27:27-07-005-04:stationary:70mm:actual-cut-m';
export const pavingCut70OpenNeedIdsR1=pack.openNeeds.map(n=>prefix+':need:'+n.id);
const needParameter=(id:string)=>'paving_cut70_application_need_'+id.replaceAll('-','_');
const names:Record<string,string>={
 'stationary-equipment-source-mapping':'Уточнить соответствие станка, способа резки и границу машинной цены',
 'blade-specification-purchase-contract':'Уточнить совместимый диск, поставку и отдельную границу оплаты',
 'site-preparation-protection-scope':'Уточнить подготовку рабочего места, защиту и переноску',
 'utilities-cooling-dust-ppe':'Уточнить электроснабжение, охлаждение, пылезащиту и СИЗ',
 'edge-quality-acceptance':'Уточнить геометрию кромки и условия приёмки',
 'waste-logistics-adjacent-reconciliation':'Уточнить отходы, логистику и границу соседней укладки',
};
const categories:Record<string,string>={'stationary-equipment-source-mapping':'equipment','blade-specification-purchase-contract':'material',
 'site-preparation-protection-scope':'work','utilities-cooling-dust-ppe':'service','edge-quality-acceptance':'work','waste-logistics-adjacent-reconciliation':'service'};
/** Existing shared unresolved-norm rows retain obligations without assigning0/1, a unit, a norm or price. */
export function pavingCut70ConditionalConsumerDefinitionR1():AutomaticOwnerDefinition{
 const base=pavingCutStationary70QuantityDefinitionR1();
 const conditional:AutomaticParameterSpec[]=pack.openNeeds.map(n=>({id:needParameter(n.id),title:names[n.id]!,
  valueType:'decimal',unitId:null,kind:'conditional',min:0}));
 const rows:AutomaticRowSpec[]=pack.openNeeds.map(n=>({rowId:prefix+':need:'+n.id,
  formulaId:prefix+':formula:need:'+n.id,section:pack.titleRu,category:categories[n.id]!,title:names[n.id]!,
  unitId:'',expression:needParameter(n.id),procurement:false,costTreatment:'INFORMATIONAL_SCOPE',
  inclusion:{kind:'greater_than',parameterId:primary,value:0}}));
 const gaps=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix+':unresolved-application-scope',
  sourceId:pack.sourceKeyProposal,normId:pack.normId,
  sourceMetadata:{source_title:pack.source.titleRu,source_document_version:pack.source.edition,
   definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
  applicabilityRu:'Открытые дополнительные потребности для заявленной операции резки; применение, единица, количество и оплата пока не установлены.',
  ordinary:[{id:primary,title:'Фактическая длина реза',valueType:'decimal',unitId:'m',kind:'ordinary',min:0}],
  profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
 const parameters=[...base.parameters,...gaps.parameters.filter(p=>p.parameter_id!==primary).map((p,index)=>({...p,
  ordinal:base.parameters.length+index,
  truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,
   'Применимость, единица, исходная величина и отдельная оплата не подтверждены. Ручное0/1 и проектная ссылка не заменяют недостающую норму или договорную границу.')}))];
 const sourceRows=base.resources.map(r=>{
  const {row_sha256:_old,...body}=r;
  const formula=base.formulas.find(f=>f.formula_id===r.formula_id)!;
  const updated={...body,resource_graph:{...r.resource_graph,
   derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',
    unitId:r.unit_id,parameterIds:[...formula.input_parameter_ids],reasonRu:'Исходный расход меняется по отдельно измеренной длине реза; ручная строка не заменяет норму27-07-005-04.'}},
   source_metadata:{...r.source_metadata,sourceRole:'OFFICIAL_EXACT_COLUMN_PARTIAL_APPEND_PROPOSAL',
    catalogue_identity_pending:true,normative_binding_pending:true,machine_price_admission:false,full_technical_acceptance:false}};
  return {...updated,row_sha256:estimateDeterministicHash(updated)};
 });
 const needRows=gaps.resources.map(r=>{
  const n=pack.openNeeds.find(n=>r.row_id===prefix+':need:'+n.id)!;
  const {row_sha256:_old,...body}=r;
  const updated={...body,ordinal:sourceRows.length+r.ordinal!,source_metadata:{...r.source_metadata,
   sourceRole:'UNRESOLVED_APPLICATION_NORM',normativeTrace:[],quantityUnitUnconfirmed:true,
   missingFact:n.missingFact,nextTask:n.nextTask,resolutionOwner:n.owner,full_technical_acceptance:false},
   resource_graph:{...r.resource_graph,publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',
    sourceTitleRu:names[n.id]!,nameRu:names[n.id]!,brandAndModelRu:null,specificationRu:null,
    detailsRu:['Не определены применимость, единица, количество и отдельная оплата.',n.missingFact,n.nextTask]}}};
  return {...updated,row_sha256:estimateDeterministicHash(updated)};
 });
 return {...base,parameters,formulas:[...base.formulas,...gaps.formulas],resources:[...sourceRows,...needRows]};
}
export function pavingCut70AcceptanceInputR1(cutM='12.5'):Record<string,unknown>{return {
 [primary]:cutM,paver_thickness_mm:'70',cutting_method:method,
 actual_cut_layout_reference:'VALIDATION_ONLY: отдельно измеренная ведомость резов, не реальный проект',
 paver_70mm_product_reference:'VALIDATION_ONLY: спецификация плитки70мм',
 stationary_cut_method_statement_reference:'VALIDATION_ONLY: подтверждённый стационарный метод, не допуск цены33-0667',
};}
/** Explicit test-only compiler use; no product entrypoint, publication or saved-parent migration. */
export function compilePavingCut70ConditionalProposalR1(submittedParameters:Record<string,unknown>,
 rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimateCompileCoreInput['priceItems']=[]){
 const d=pavingCut70ConditionalConsumerDefinitionR1();
 return compileCanonicalEstimateCore({operation:'recalculate',catalogId:pavingCut70CatalogIdProposalR1,
  compilerVersion:pack.contract,primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],
  formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters,confirmedParameters:{},
  rowOverrides,priceItems,currencyCode:'KGS',maximumResourceRows:10,hashJson:async value=>estimateDeterministicHash(value)});
}
export function pavingCut70IndependentCompletenessMapR1(){
 // The source pack lists the four source resources and six independently documented gaps, not emitted rows.
 const source=[['whole-cutting-labor','labor','man_hour','000-1005-0:0.39'],
  ['operator-information','labor','man_hour','operator:0.16 informational'],
  ['stationary-machine-consumed','equipment','machine_hour','33-0667:0.16 informational'],
  ['diamond-disc-consumed','material','piece','01-6102-0002:0.014 informational']];
 const entry=(id:string,category:string,unitId:string|null,quantityRule:string,specification:string,need=false)=>({
  expectedResourceId:pack.normId+':'+id,operationId:'stationary-paving-cut70',category,unitId,quantityRule,specification,
  condition:'Только отдельно измеренная фактическая длина резов плитки70мм стационарным способом',sourceId:pack.sourceKeyProposal,
  formulaId:prefix+':formula:'+(need?'need:':'')+id,resolution:{kind:'ROW',rowId:prefix+':'+(need?'need:':'')+id}});
 return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',
  generatedFromCurrentRows:false,evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],
  entries:[...source.map(([id,cat,unit,spec])=>entry(id!,cat!,unit!,'EXACT_OFFICIAL_RATE_PER_ONE_ACTUAL_CUT_M',spec!)),
   ...pack.openNeeds.map(n=>entry(n.id,categories[n.id]!,null,'SOURCE_REQUIRED_NOT_QUANTIFIED',n.missingFact,true))]};
}
