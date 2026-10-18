// WORK authoring only. Extend exact actual delivery-v2; never rebuild it from historical R1.
import {createHash} from 'node:crypto';
import data from '../../../data/estimate-benchmarks/source-packs/euroflex-factory-half-current-r3.json';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {compileFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
type Json=Record<string,any>;
export const euroflexFactoryHalfCurrentDataR3=data;
export type EuroflexCurrentContextR3=Readonly<{definitionReleaseId:string;searchReleaseId:string;
 primaryMeasureParameterId:string;primaryUnitId:string;priceRouteBindings:readonly Json[]}>;
const hash=(v:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(v)).digest('hex');
function need(v:unknown,code:string):asserts v{if(!v)throw Error('EUROFLEX_CURRENT_R3:'+code);}
const prefix='euroflex:recycling-50mm:',length='surface_length_along_rows_mm',width='surface_width_across_rows_mm';
const oldFraction=`(${length}/500-floor(${length}/500))+(${width}/500-floor(${width}/500))`;
const fraction=`(${length}/250-floor(${length}/250))+(${width}/500-floor(${width}/500))`;
const odd=`(${length}/250-2*floor(${length}/500))`;
const expressions=new Map([
 [prefix+'formula:full-consumed',`${data.primaryMeasureParameterId}/0.25-(${odd}*(${width}/500)+(1-${odd})*2*floor((${width}/500)/2))/2`],
 [prefix+'formula:half-consumed',`${odd}*(${width}/500)+(1-${odd})*2*floor((${width}/500)/2)`],
]);
function predicate(value:any):any {
 if(Array.isArray(value))return value.map(predicate);
 if(!value||typeof value!=='object')return value;
 const result=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,predicate(v)]));
 if(value.kind==='formula_greater_than'){
  if(value.expression===`1-ceil(${oldFraction})`)result.expression=`1-ceil(${fraction})`;
  if(value.expression===`ceil(${oldFraction})`)result.expression=`ceil(${fraction})`;
 }
 return result;
}
function sameSet(actual:string[],expected:readonly string[]){return hash([...actual].sort())===hash([...expected].sort());}
export function prepareEuroflexFactoryHalfLayoutCurrentR3(parent:PurchaseGroupRepresentative,context:EuroflexCurrentContextR3){
 const expected=data.expectedCurrent;
 need(context.definitionReleaseId===data.expectedParentReleasePair.definitionReleaseId
  &&context.searchReleaseId===data.expectedParentReleasePair.searchReleaseId,'EXACT_PARENT_PAIR_REQUIRED');
 need(parent.definition.catalog_id===data.catalogId&&parent.definition.id===expected.definitionId
  &&parent.definition.definition_version===expected.definitionVersion&&parent.baseline.id===expected.baselineId,
  'EXACT_CURRENT_DELIVERY_V2_REQUIRED');
 need(context.primaryUnitId==='m2'&&context.primaryMeasureParameterId===data.primaryMeasureParameterId
  &&parent.definition.applicability.primaryMeasureParameterId===data.primaryMeasureParameterId,'PRIMARY_UNIT_REQUIRED');
 need(parent.parameters.length===44&&parent.formulas.length===25&&parent.resources.length===25&&parent.bindings.length===16,
  'CURRENT_DELIVERY_SHAPE_REQUIRED');
 need(sameSet(parent.parameters.map(p=>p.parameter_id),expected.parameterIds)
  &&sameSet(parent.formulas.map(f=>f.formula_id),expected.formulaIds)
  &&sameSet(parent.resources.map(r=>r.row_id),expected.rowIds),'EXACT_AUTHORED_ID_SETS_REQUIRED');
 const materialOwners=parent.resources.filter(r=>r.category==='material'&&r.resource_graph.costTreatment==='OWN_COST');
 need(sameSet(materialOwners.map(r=>r.row_id),[...data.calculatedOrderOwners,...data.preservedUnresolvedMaterialOwners].map(r=>r.rowId)),
  'EXACT_MATERIAL_OWNER_SET_REQUIRED');
 for(const scope of data.calculatedOrderOwners){
  const row=materialOwners.find(r=>r.row_id===scope.rowId);
  need(row&&row.unit_id===scope.unitId&&row.cost_owner_id===scope.rowId&&row.formula_id===scope.formulaId
   &&row.procurement_eligible===true&&row.source_metadata.sourceNormQuantityAccepted===true,'CALCULATED_PCS_ORDER_OWNER_REQUIRED');
 }
 for(const scope of data.preservedUnresolvedMaterialOwners){
  const row=materialOwners.find(r=>r.row_id===scope.rowId);
  need(row&&row.unit_id===scope.unitId&&row.cost_owner_id===scope.rowId&&row.formula_id===scope.formulaId
   &&row.procurement_eligible===false&&row.source_metadata.sourceNormQuantityAccepted===false,
   'EXACT_UNRESOLVED_GLUE_OWNER_REQUIRED');
 }
 need(hash(parent)===expected.parentStableSha256,'EXACT_COMPLETE_PREIMAGE_REQUIRED');
 need(hash(context.priceRouteBindings)===data.expectedPriceRouteBindingsStableSha256,'PRICE_BINDING_PREIMAGE_DRIFT');
 const originalHash=hash(parent),result:PurchaseGroupRepresentative=structuredClone(parent),planId=data.layout.confirmationParameterId;
 need(!result.parameters.some(p=>p.parameter_id===planId),'ALREADY_PRESENT_NO_REPLAY');
 for(const parameter of result.parameters){
  if(data.preservedDeliveryParameterIds.includes(parameter.parameter_id))continue;
  parameter.constraints_json=predicate(parameter.constraints_json);
  if(parameter.truth_metadata?.visible_when)parameter.truth_metadata.visible_when=predicate(parameter.truth_metadata.visible_when);
 }
 const template=result.parameters.find(p=>p.parameter_id==='prepared_base_condition')!;
 const condition={kind:'formula_greater_than',expression:`(1-ceil(${fraction}))*${odd}`,unitId:'pcs',value:0};
 result.parameters.push({...structuredClone(template),parameter_id:planId,ordinal:result.parameters.length,
  title_ru:data.layout.confirmationTitleRu,default_value:null,
  constraints_json:{values:[data.layout.confirmationValueRu],requiredWhen:condition,visibleWhen:condition},
  truth_metadata:{...structuredClone(template.truth_metadata),contract:data.contract,
   semantic_parameter_key:data.catalogId+':'+planId,source_confirmation_required:false,
   provenance:{consumer_input_role_v1:'OBJECT_FACT'},formula_consumers:[],resource_branch_consumers:[],
   guide:{...template.truth_metadata.guide,guide_version:data.contract,
    guide_short_ru:'Подтвердите фактический план и подгонку заводских полных и половинных плит. Размеры, допуски и примыкания проверяются на объекте; норму или процент отходов вводить не нужно.',
    applicability:data.layout.applicabilityRu}}});
 for(const formula of result.formulas){
  const expression=expressions.get(formula.formula_id);if(expression===undefined)continue;
  const compiled=compileFormulaGraph(expression);Object.assign(formula,{expression_source:expression,ast:compiled.ast,
   input_parameter_ids:compiled.inputParameterIds,ast_sha256:hash(compiled.ast)});
 }
 for(const row of result.resources){
  if(row.row_id===data.preservedDeliveryRowId)continue;
  const before=hash(row);row.inclusion_ast=predicate(row.inclusion_ast);
  const calculated=data.calculatedOrderOwners.some(r=>r.rowId===row.row_id);
  if(calculated)row.resource_graph.inputParameterIds=[...new Set([...(row.resource_graph.inputParameterIds??[]),planId])];
  if(expressions.has(row.formula_id))row.resource_graph.derivedQuantityEditPolicyV1={...row.resource_graph.derivedQuantityEditPolicyV1,
   parameterIds:[...result.formulas.find(f=>f.formula_id===row.formula_id)!.input_parameter_ids]};
  if(calculated||expressions.has(row.formula_id)){
   const presentation=row.resource_graph.publicResourcePresentationV1;
   if(presentation)presentation.detailsRu=[...presentation.detailsRu,
    'Номинальная раскладка: по рядам шаг 250 мм, поперёк 500 мм; заводская половинная плита закрывает конец ряда при нечётном числе половинных модулей.',
    'Для новой геометрии требуется подтверждённый фактический план концов рядов. Допуски, резка и полная приёмка площадки не выводятся из номинального модуля.'];
   row.source_metadata={...row.source_metadata,factoryHalfCurrentR3:{contract:data.contract,
    sourcePreimageSha256:data.sourcePreimage.sha256,sourceId:data.sourceId,normId:data.normId,
    actualInstallationAccepted:false,newManufacturerConsumptionNorm:false}};
  }
  if(hash(row)!==before){const {row_sha256:_old,...body}=row;row.row_sha256=hash(body);}
 }
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){
  if(data.preservedDeliveryParameterIds.includes(p.parameter_id))continue;
  p.truth_metadata={...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],
   resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]};
  result.baseline.formula_consumer_ids[p.parameter_id]=consumers.formulaConsumers[p.parameter_id];
  result.baseline.resource_consumer_row_ids[p.parameter_id]=consumers.resourceConsumers[p.parameter_id];
 }
 result.baseline.input_classification[planId]='VALIDATION_FIXTURE';result.baseline.uom_by_parameter[planId]=null;
 result.baseline.normative_source_ids[planId]=[];result.baseline.guide_provenance_ru[planId]=result.parameters.at(-1)!.truth_metadata.guide.guide_short_ru;
 result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,
  constraints:p.constraints_json,truth:p.truth_metadata})));
 result.definition.definition_sha256=null;
 result.definition.applicability={...result.definition.applicability,factoryHalfCurrentR3:{nominalAlongRowsModuleMm:250,
  nominalAcrossRowsModuleMm:500,actualFactoryHalfEndPlanParameterId:planId,installationAcceptance:false}};
 result.passport={...result.passport,parameter_count:45,formula_count:25,resource_count:25,payload_sha256:null,
  decision:{...result.passport.decision,status:'WORK_CURRENT_PARENT_R3_UNBOUND_NOT_PUBLISHABLE',allowed:false,
   quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',completeTechnicalEstimateAccepted:false,
   factoryHalfCurrentR3:{proposedDefinitionVersion:3,parentDefinitionId:expected.definitionId,
    sourcePreimageSha256:data.sourcePreimage.sha256,preservedDelivery:true,newCompleteTypes:0}}};
 need(hash(parent)===originalHash,'INPUT_PREIMAGE_MUTATED');
 need(hash(result.bindings)===hash(parent.bindings),'SIXTEEN_NORMATIVE_BINDINGS_CHANGED');
 need(hash(result.resources.find(r=>r.row_id===data.preservedDeliveryRowId))===hash(parent.resources.find(r=>r.row_id===data.preservedDeliveryRowId))
  &&hash(result.formulas.find(f=>f.formula_id===data.preservedDeliveryFormulaId))===hash(parent.formulas.find(f=>f.formula_id===data.preservedDeliveryFormulaId)),
  'DELIVERY_ROW_OR_FORMULA_CHANGED');
 need(hash(result.parameters.filter(p=>data.preservedDeliveryParameterIds.includes(p.parameter_id)))
  ===hash(parent.parameters.filter(p=>data.preservedDeliveryParameterIds.includes(p.parameter_id))),'SEVENTEEN_DELIVERY_PARAMETERS_CHANGED');
 for(const scope of data.preservedUnresolvedMaterialOwners)need(hash(result.resources.find(r=>r.row_id===scope.rowId))
  ===hash(parent.resources.find(r=>r.row_id===scope.rowId)),'GLUE_OBLIGATION_CHANGED');
 const sameRowManualFieldBindings=parent.resources.map(r=>({parentRowId:r.row_id,successorRowId:r.row_id,
  unitId:r.unit_id,costOwnerId:r.cost_owner_id,quantityEditPolicyRetained:true}));
 return {status:'WORK_CURRENT_PARENT_R3_UNBOUND_NOT_PUBLISHABLE' as const,previewRepresentative:result,
  originalDefinitionId:expected.definitionId,originalDefinitionVersion:2,proposedDefinitionVersion:3,
  sourcePreimageSha256:data.sourcePreimage.sha256,sameRowManualFieldBindings,
  manualPriceMigrationBindings:data.compatiblePriceRoutes.manualPriceBindings,
  automaticGenericPriceInheritanceAllowed:false,preservedNormativeBindingCount:16,
  newDefinitionId:null,newBaselineId:null,publicationReady:false,runtimeAccepted:false,
  unresolvedInstallationNeedsRetained:data.unresolvedInstallationNeeds};
}
