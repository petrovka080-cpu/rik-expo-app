import assert from 'node:assert/strict';
import pack from '../../../../data/estimate-benchmarks/source-packs/roof-mastic-preparation-native01901-r24.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {canonicalConditionParameterIds} from '../backendPlatform/canonicalEffectiveResourceQuantityV1';
import type {CanonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';
type Json=Record<string,unknown>;
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
export const roofMasticPreparation019SourceR24=pack;
const ids=pack.controls;
export const roofMasticPreparation019SourceChoiceR24='EXACT_01901_ASBESTOS_FILLER_RECIPE_AND_PRODUCT_SOURCE_APPLICABILITY';
export const roofMasticPreparation019ProjectChoiceR24='OWN_SEPARATE_PREPARED_MASS_AND_DISTINCT_PRODUCTION_PURCHASE_SCOPE';

/** Eight source rows only, mass in tonnes/basis1 through the existing owner.
 * Exact asbestos recipe/product source applicability intentionally remains an
 * unresolved APPLICATION norm, never an ordinary PPR/user confirmation. */
export function buildRoofMasticPreparationWhole019R24(sourceKey:string):AutomaticOwnerDefinition{
 assert.equal(sourceKey,pack.sources[0]!.id,'MASTIC019_SOURCE_IDENTITY_AND_EXACT_RECIPE_REVIEW_HOLD');
 assert.equal(pack.sourceMeasureQuantity,'1');assert.equal(pack.sourceMeasureUnitId,'t');assert(pack.SOURCE_PRODUCT_APPLICABILITY_HOLD);
 const selected={kind:'equals' as const,parameterId:ids.method,value:pack.methodChoice};
 const rows:AutomaticRowSpec[]=pack.rates.map(rate=>{assert(rate.costTreatment==='OWN_COST'||rate.costTreatment==='INFORMATIONAL_SCOPE');return{
  rowId:pack.prefix+':'+rate.role,formulaId:pack.prefix+':formula:'+rate.role,title:rate.titleRu,unitId:rate.unitId,category:rate.category,
  section:'Отдельное приготовление битумной кровельной мастики',expression:ids.mass+'/1*'+rate.ratePerPreparedTonne,procurement:false,
  costTreatment:rate.costTreatment==='INFORMATIONAL_SCOPE'?'INFORMATIONAL_SCOPE':'OWN_COST',inclusion:{kind:'and',operands:[selected,
   {kind:'equals',parameterId:ids.sourceApplicability,value:roofMasticPreparation019SourceChoiceR24},{kind:'equals',parameterId:ids.project,value:roofMasticPreparation019ProjectChoiceR24}]}};});
 const base=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:sourceKey,normId:pack.normId,
  sourceMetadata:{source_title:pack.sources[0]!.titleRu,source_document_version:pack.sources[0]!.printedEdition,definition_hash:pack.sources[0]!.sha256,
   artifact_sha256:pack.sources[0]!.sha256,exact_locator:pack.sources[0]!.locators},applicabilityRu:pack.sourceRecipeRestriction,
  ordinary:[{id:ids.mass,title:'Масса отдельно приготовленной мастики,т',valueType:'decimal',unitId:'t',min:0,kind:'ordinary'},
   {id:ids.method,title:'Граница самостоятельного приготовления мастики',valueType:'enum',unitId:null,kind:'ordinary',values:[pack.methodChoice,'Применимость изготовления ещёнеподтверждена']}],profile:[],
  conditional:[{id:ids.sourceApplicability,title:'Допуск точной исходной рецептуры и готового продукта019',valueType:'enum',unitId:null,kind:'internal',values:[roofMasticPreparation019SourceChoiceR24],requiredWhen:selected},
   {id:ids.project,title:'Проектная масса и самостоятельная граница изготовления/закупки',valueType:'enum',unitId:null,kind:'internal',values:[roofMasticPreparation019ProjectChoiceR24],requiredWhen:selected}],
  rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[pack.sourceRecipeRestriction,pack.paymentBoundary,'Физическийstock/ППР/приёмка неизготовлены;1тнормативнойбазы незначит1тфактическогообъёма']});
 const parameters:AutomaticOwnerDefinition['parameters']=base.parameters.map(p=>{
  const source=p.parameter_id===ids.sourceApplicability,project=p.parameter_id===ids.project;
  const truth={...p.truth_metadata,visibility_role:source||project?'INTERNAL_ONLY':'USER_INPUT',value_source_role:source?'UNRESOLVED_APPLICATION_NORM':project?'PROJECT_DOCUMENTATION':p.parameter_id===ids.mass?'USER_MEASURED':'PROJECT_SPECIFIC_INPUT',
   source_confirmation_required:source||project,provenance:{...(object(p.truth_metadata.provenance)?p.truth_metadata.provenance:{}),consumer_input_role_v1:source||project?'APPLICATION_TECHNICAL':'OBJECT_FACT'},
   guide:{...(object(p.truth_metadata.guide)?p.truth_metadata.guide:{}),source_role:source?'UNRESOLVED_APPLICATION_NORM':project?'PROJECT_DOCUMENTATION':p.parameter_id===ids.mass?'USER_MEASURED':'PROJECT_DOCUMENTATION',exact_locator:pack.sources[0]!.locators}};
  return{...p,required:false,default_value:null,truth_metadata:source?unresolvedApplicationNormTruthR1(truth,'Точный источник019содержитасбест-наполнитель;неподтвержденыдопускэтойрецептуры/готовогопродуктаисовместимостьсконкретнымипотребителями. НеPPRcheckbox,неуниверсальнаягорячаямастика.'):truth};
 });
 const resources:AutomaticOwnerDefinition['resources']=base.resources.map(row=>{
  const rate=pack.rates.find(r=>row.row_id===pack.prefix+':'+r.role);assert(rate);
  const refs=rate.requiredOperationKeys.map(key=>{const op=pack.printedOperationRoster.find(o=>o.key===key);assert(op);return{
   operationId:pack.prefix+':operation:'+key,operationTitleRu:op.titleRu,processOrdinal:op.printedOrdinal,
   completionCriterionRu:'Исходная операция приготовления выполнена;допускрецептуры/точныйпродукт/самостоятельнаяоплата/фактическаяприёмка отдельны.'};});assert(refs.length>0);
  const operation:CanonicalEstimateOperationReference={contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:'Отдельное приготовление битумной кровельной мастики',...refs[0]!,...(refs.length>1?{additionalOperations:refs.slice(1)}:{})};
  const {row_sha256:_old,...body}=row;const result={...body,
   source_metadata:{...row.source_metadata,sourceRole:'PINNED_CONDITIONAL_KRER_RECIPE_APPLICABILITY_HOLD',exactSourceNormId:pack.normId,normativeResourceCode:rate.resourceCode,
    sourceNormRatePerPreparedTonne:rate.sourceRatePerPreparedTonne,sourceNormUnit:rate.sourceUnit,sourceNormBasisQuantity:'1',sourceNormBasisUnitId:'t',
    preparedOutputNotPurchasedReadyMastic:true,sourceHistoricalPrintedPriceNotAdmitted:true,sourceRecipeProductApplicabilityHold:true,full_technical_acceptance:false},
   resource_graph:{...row.resource_graph,operationCompositionV1:operation,publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:row.title_ru,sourceTitleRu:rate.sourceInternalTitleRu,
    detailsRu:[pack.sourceRecipeRestriction,pack.paymentBoundary]},
    ...(rate.role==='boiler400l'?{roofSharedBoilerBoundaryR24:{physicalStockOwnerRowId:'roof:flat003006:r24:stock:boiler-400l',physicalQuantity:null,nativeBudgetUnit:'machine_hour',physicalStockUnit:'pcs',noConversionFromHours:true,noSecondOperatingPayment:true}}:{})}};
  return{...result,row_sha256:hash(result)};
 });
 assert.deepEqual([parameters.length,base.formulas.length,resources.length],[4,8,8]);
 assert.equal(resources.filter(r=>r.resource_graph.costTreatment==='INFORMATIONAL_SCOPE').length,1);
 const declared=new Set(parameters.map(p=>p.parameter_id));for(const r of resources){resolveInclusionGraph(r.inclusion_ast,{});for(const id of canonicalConditionParameterIds(r.inclusion_ast))assert(declared.has(id));}
 return{...base,parameters,resources};
}
