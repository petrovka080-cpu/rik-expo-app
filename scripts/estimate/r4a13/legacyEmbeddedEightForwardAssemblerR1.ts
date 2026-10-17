import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {createCanonicalDefinitionClonePlan,type CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import {buildLegacyEmbeddedEightR1 as build,legacyEmbeddedEightContractR1 as contract,LEGACY_EMBEDDED_EIGHT_PRESERVED12_R1} from './legacyEmbeddedEightR1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {buildMasterParameterCalculationConsumers as consumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalManualPriceMigrationBindings as priceBindings,canonicalStoredManualPricesCanMigrate as canMigrate} from '../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
const passportContract='real-professional-estimates-r3.content-passport.v1';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const uuid=(v:unknown)=>{const a=hash(v).slice(0,32).split('');a[12]='5';a[16]='8';const s=a.join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;};
export function assembleLegacyEmbeddedEightForwardR1(input:Readonly<{
 parents:readonly Json[];sources:readonly Json[];locators:readonly Json[];releaseId:string;sourceHead:string;sourceTree:string;
 sourceFingerprint:string;sourceFreezeSha256:string;masterSha256:string;acceptanceEvidenceSha256:string;
}>){
 assert.equal(input.parents.length,8);
 const source=input.sources.find(s=>s.source_key==='src_professional_norm_pack_concrete_aci_spec_301_20_project_embedment_schedule_v1');assert(source);
 const methodLocators=input.locators.filter(l=>l.source_id===source.id);assert.equal(methodLocators.length,1);const locator=methodLocators[0]!;
 const models=input.parents.map(parent=>{
  const model=build(parent),catalogId=model.catalogId;
  const parameters=model.parameters.map((p,ordinal)=>({...p,ordinal})),formulas=model.formulas.map((f:Json)=>({...f,ast_sha256:hash(f.ast)}));
  const resources:Json[]=model.resources.map(r=>({...r,row_type:r.category==='construction_work'?'labor':r.category==='delivery'?'service':r.category}));
  const {formulaConsumers,resourceConsumers}=consumers({parameters,formulas,resources});
  const primary=parameters.find(p=>p.parameter_id===model.primaryMeasureParameterId);assert(primary&&primary.unit_id==='piece');
  const bindingRows=resources.filter(r=>(r.source_metadata?.normativeTrace as Json[]|undefined)?.some(trace=>{
   if((trace.sourceId??trace.source_id)!==source.source_key)return false;
   assert.equal(trace.source_definition_hash,source.artifact_sha256);assert.equal(trace.exact_locator,locator.locator.exactLocator);return true;
  }));assert(bindingRows.length>0,'LEGACY_EMBEDDED_EIGHT_METHOD_TRACE_MISSING');
  const definitionSha256=hash({contract,catalogId,parameters,formulas,resources});
  const limitationRu='Количество, масса, состав закладных, часы, условия метода и поставки подтверждаются проектной ведомостью. Неизвестные цены заполняются отдельно.';
  const includedScopeRu=[model.scopeRu,...model.subworks.map((s:Json)=>s.titleRu),limitationRu];
  const excludedScopeRu=['Бетонирование, арматура и опалубка полной конструкции, ремонт основания и неподтверждённые монтажные работы.',
   'Механические и химические анкеры после бетонирования, неподтверждённые нормы и готовый заказ поставщику.'];
  const decision={contract:passportContract,waveContract:contract,status:'GREEN',allowed:true,quantityScope:'FULL',
   scopeMeaning:'NEW_CAST_IN_PROJECT_COMPOSITION_WITH_NO_LEGACY_VOLUME_OR_ROW_MIGRATION',projectScheduleRequired:true,
   engineeringAccepted:false,completeProjectEstimateAccepted:false,supplierOrderConfirmed:false,priceState:'PARTIAL_NEEDS_PRICE',activationAllowed:false,productionEligible:false};
  const baseline={contract_version:'APPROVED_TEMPLATE_BASELINE_R54_V1',parameter_schema_sha256:hash(parameters),
   input_values:{[model.primaryMeasureParameterId]:1},input_classification:Object.fromEntries(parameters.map(p=>[p.parameter_id,'VALIDATION_FIXTURE'])),
   uom_by_parameter:Object.fromEntries(parameters.map(p=>[p.parameter_id,p.unit_id])),formula_consumer_ids:formulaConsumers,resource_consumer_row_ids:resourceConsumers,
   normative_source_ids:Object.fromEntries(parameters.map(p=>[p.parameter_id,(p.truth_metadata?.guide as Json|undefined)?.source_document===source.source_key?[source.source_key]:[]])),
   guide_provenance_ru:Object.fromEntries(parameters.map(p=>[p.parameter_id,'Проектный факт либо внутренний расчётный выход. Тестовый пример не является нормой и не подставляется автоматически.'])),
   proposal_source_refs:[{sourceId:source.source_key,locatorId:locator.id,coverage:'METHOD_APPLICABILITY_ONLY',universalConsumptionClaimed:false,universalProductivityClaimed:false}]};
  const definitionId=uuid([input.sourceFingerprint,catalogId,'definition']),baselineId=uuid([input.sourceFingerprint,catalogId,'baseline']);
  const plan=createCanonicalDefinitionClonePlan({contract,
   definition:{id:definitionId,releaseId:input.releaseId,catalogId,definitionVersion:Number(parent.definition.definition_version)+1,definitionSha256,
    applicability:{country:'KG',family:model.target.family,operation:'anchor',contextKey:model.target.contextKey,
     primaryMeasureParameterId:model.primaryMeasureParameterId,pairedPlacementCatalogId:model.target.pairedPlacementCatalogId,
     projectScheduleRequired:true,conditionalScopeFailClosed:true,deferMissingProjectFactsToRows:true,universalConsumptionClaimed:false,universalProductivityClaimed:false,engineeringAccepted:false},
    passport:{catalogId,canonicalRuName:model.titleRu,workKey:catalogId.slice('canonical-work:base:'.length)+'_professional_expanded_v1',physicalResultRu:model.scopeRu,projectScheduleRequired:true},
    sourceMetadata:{contract,masterSha256:input.masterSha256,sourceFingerprint:input.sourceFingerprint,sourceFreezeSha256:input.sourceFreezeSha256,
     predecessorDefinitionId:parent.definition.id,predecessorBaselineLeafId:parent.baseline.id,
     historicalRowsPreservedWithoutAutomaticMigration:model.historicalRowsNotAutomaticallyMigrated,
     oldPrimaryQuantityAutomaticallyMapped:false,oldPrimaryParameterId:'q',oldPrimaryUnitId:'m3',newPrimaryUnitId:'piece',
     sourceProfileCatalogId:model.sourceProfileCatalogId,exampleProjectInputsAreNotNorms:true,runtimeProfileInput:{},
     automaticLegacyManualPriceQuantityTitleMigrationAllowed:false,engineeringAccepted:false,limitationRu,activationAllowed:false,productionEligible:false}},
   representative:{parameters,formulas,resources,bindings:bindingRows.map(r=>({row_id:r.row_id,locator_id:locator.id,applicability:{coverage:'METHOD_APPLICABILITY_ONLY',projectScheduleRequired:true,universalConsumptionClaimed:false,universalProductivityClaimed:false}})),
    baseline,passport:{contract_version:passportContract,included_scope_ru:includedScopeRu,capability_matrix:[{capability:'PARAMETERS',status:'GREEN'},
     {capability:'FORMULAS_AND_PHYSICAL_PARITY',status:'GREEN'},{capability:'FULL_APPLICABLE_SCOPE',status:'GREEN',projectScheduleRequired:true,engineeringAccepted:false},{capability:'PRICE',status:'GREEN_UNKNOWN_IS_NULL'}]}},
   parameterTruthMetadata:p=>({...p.truth_metadata,contract,semantic_parameter_key:`${catalogId}:${p.parameter_id}`,formula_consumers:formulaConsumers[p.parameter_id],resource_branch_consumers:resourceConsumers[p.parameter_id]}),
   resourceId:r=>uuid([input.sourceFingerprint,catalogId,'resource',r.row_id]),resourceSemanticOwner:r=>`${catalogId}:${r.row_id}`,resourceSha256:r=>hash({contract,catalogId,resource:r}),
   baseline:{id:baselineId,key:`${contract}:${input.sourceFingerprint}:${catalogId}`,sourceDefinitionVersionId:parent.definition.id,supersedesBaselineId:parent.baseline.id,
    acceptedReleaseId:input.releaseId,acceptanceEvidenceSha256:input.acceptanceEvidenceSha256,validationScenarioRefs:[{scenario:'EXPLICIT_PRIMARY_ONLY_VALIDATION_FIXTURE_NO_VOLUME_CONVERSION',fixture:{[model.primaryMeasureParameterId]:1},runtimeProfile:{},realProject:false}]},
   passport:{physicalResultRu:model.scopeRu,excludedScopeRu,decision,payloadSha256:hash({definitionSha256,decision,includedScopeRu,excludedScopeRu}),sourceHead:input.sourceHead,sourceTree:input.sourceTree},
   bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:bindingRows.length});
  const oldBindings=priceBindings(parent as any),newBindings=priceBindings(plan);
  for(const row of parent.resources){assert(!plan.resources.some(r=>r.row_id===row.row_id));
   for(const override of [{unitPrice:'100'},{quantity:'35'},{titleRu:'TEST legacy manual title'}])assert(!canMigrate({rowOverrides:{[row.row_id]:{...override,provenance:{kind:'manual'}}},customRows:[],fromBindings:oldBindings,toBindings:newBindings}),'LEGACY_EMBEDDED_EIGHT_UNREVIEWED_MANUAL_MIGRATION');}
  assert(Object.values(plan.baseline.input_classification).every(v=>v==='VALIDATION_FIXTURE'));
  const visible=plan.parameters.filter(p=>p.truth_metadata?.visibility_role!=='INTERNAL_ONLY');
  return {plan,primaryMeasureParameterId:model.primaryMeasureParameterId,
   searchPatch:{primary_uom:'шт.',short_scope_ru:model.scopeRu+' '+limitationRu,
    key_distinguishing_parameters:visible.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,titleRu:p.title_ru,required:p.required})),
    required_inputs_count:visible.filter(p=>p.required).length,clarification_fields:visible.filter(p=>p.required).map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,titleRu:p.title_ru})),
    included_boundaries:includedScopeRu,excluded_boundaries:excludedScopeRu},
   honestUnconsumedParameterIds:parameters.filter(p=>resourceConsumers[p.parameter_id]!.length===0).map(p=>p.parameter_id)};
 });
 return {contract,models,preservedCatalogIds:[...LEGACY_EMBEDDED_EIGHT_PRESERVED12_R1],engineeringAccepted:false,automaticHistoricalRowMigrationPerformed:false};
}
