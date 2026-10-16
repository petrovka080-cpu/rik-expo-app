import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {createCanonicalDefinitionClonePlan, type CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {buildConcreteFoundationAtomicConstructionR1 as build,
  CONCRETE_FOUNDATION_ATOMIC_CONSTRUCTION_PROFILES_R1 as profiles} from '../../../src/lib/estimate/v4/concreteFoundationAtomicConstructionR1';
import {CONCRETE_FOUNDATION_PRESERVED_CURRENT_TARGETS as preserved} from '../../../src/lib/estimate/v4/concreteFoundationSubworkReuseR1';

export const concreteFoundationAtomic34ForwardContractR1 = 'rik-expo-app.foundation-atomic34-project-composition-forward.r1';
const passportContract = 'real-professional-estimates-r3.content-passport.v1';
const sourceKeys = {
  anchor: 'src_professional_norm_pack_concrete_aci_spec_301_20_project_embedment_schedule_v1',
  level: 'src_professional_norm_pack_concrete_aci_302_1_15_project_leveling_schedule_v1',
  repair: 'src_professional_norm_pack_concrete_aci_562_25_project_repair_schedule_v1',
  vibrate: 'src_professional_norm_pack_concrete_aci_309_project_consolidation_schedule_v1',
} as const;
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const uuid = (value: unknown) => {
  const s=hash(value).slice(0,32).split('');s[12]='5';s[16]='8';const h=s.join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
};
function rowType(category: string): string {
  if (category === 'construction_work' || category === 'labor' || category === 'work') return 'labor';
  if (category === 'delivery') return 'service';
  assert(['material','equipment','service','waste','other'].includes(category),`UNSUPPORTED_RESOURCE_CATEGORY:${category}`);
  return category;
}

/** Pure serializer for the existing transaction writer. Project schedules are
 * mandatory inputs; a validation example never becomes a runtime default.
 * Old rows and the old q are deliberately not aliased to the new composition. */
export function assembleConcreteFoundationAtomic34ForwardR1(input: Readonly<{
  parents: readonly Json[]; sources: readonly Json[]; locators: readonly Json[];
  releaseId: string; sourceHead: string; sourceTree: string;
  sourceFingerprint: string; sourceFreezeSha256: string; masterSha256: string;
  acceptanceEvidenceSha256: string;
}>) {
  assert.equal(profiles.length,34);
  assert.equal(new Set(profiles.map(p=>p.catalogId)).size,34);
  const preservedIds = new Set<string>(preserved.map(p=>p.catalogId));
  assert(profiles.every(p=>!preservedIds.has(p.catalogId)));
  const plans=profiles.map(profile=>{
    const model=build(profile.catalogId);
    const parent=input.parents.find(p=>p.definition.catalog_id===profile.catalogId);
    assert(parent,`CURRENT_PARENT_MISSING:${profile.catalogId}`);
    assert.equal(parent.definition.id,profile.observedParent.definitionId);
    assert.equal(parent.definition.definition_version,profile.observedParent.version);
    assert.equal(parent.definition.definition_sha256,profile.observedParent.definitionSha256);
    assert.equal(parent.resources.length,59);
    assert.equal(parent.entry.approved_template_baseline_id,parent.baseline.id);
    const source=input.sources.find(s=>s.source_key===sourceKeys[profile.operation]);assert(source);
    const locators=input.locators.filter(l=>l.source_id===source.id);assert.equal(locators.length,1);
    const locator=locators[0]!;
    const parameters=model.parameters.map((p,ordinal)=>({...structuredClone(p),ordinal}));
    assert(parameters.every(p=>p.default_value==null));
    assert(!parameters.some(p=>p.parameter_id==='q'));
    const formulas=model.formulas.map(f=>({...structuredClone(f),ast_sha256:hash(f.ast)}));
    const resources:Json[]=model.resources.map(r=>({...structuredClone(r),row_type:rowType(r.category),
      source_metadata:{...structuredClone(r.source_metadata),automaticGenericPriceInheritanceAllowed:false}}));
    const {formulaConsumers,resourceConsumers}=buildMasterParameterCalculationConsumers({parameters,formulas,resources});
    const primary=parameters.find(p=>p.parameter_id===model.primaryMeasureParameterId);assert(primary);
    assert(resourceConsumers[primary.parameter_id]!.length>0);
    const bindingRows=resources.filter(r=>(r.source_metadata?.normativeTrace as Json[] | undefined)?.some(trace=>{
      if((trace.sourceId ?? trace.source_id)!==source.source_key)return false;
      assert.equal(trace.source_definition_hash,source.artifact_sha256,'METHOD_SOURCE_HASH_DRIFT');
      assert.equal(trace.exact_locator,locator.locator.exactLocator,'METHOD_LOCATOR_DRIFT');
      return true;
    }));
    assert(bindingRows.length>0);
    const definitionSha256=hash({contract:concreteFoundationAtomic34ForwardContractR1,catalogId:profile.catalogId,
      primaryMeasureParameterId:model.primaryMeasureParameterId,parameters,formulas,resources});
    const definitionId=uuid([input.sourceFingerprint,profile.catalogId,'definition']);
    const baselineId=uuid([input.sourceFingerprint,profile.catalogId,'baseline']);
    const applicability={country:'KG',family:profile.family,contextKey:profile.contextKey,operation:profile.operation,
      primaryMeasureParameterId:model.primaryMeasureParameterId,projectScheduleRequired:true,
      conditionalScopeFailClosed:true,deferMissingProjectFactsToRows:true,
      universalConsumptionClaimed:false,universalProductivityClaimed:false,
      pairedPlacementCatalogId:profile.pairedPlacementCatalogId,engineeringAccepted:false};
    const limitationRu='Количество, состав материалов, фактические часы, границы оплаты и условия поставки требуют подтверждённых проектных данных. Расценки неизвестны до отдельного ввода.';
    const repairLimitationRu='Соответствие ремонтного продукта и способа выполнения его паспорту проверяется отдельно; эта смета не подтверждает такую проверку автоматически.';
    const includedScopeRu=[profile.scopeRu,...model.subworks.map(s=>s.titleRu),limitationRu,
      ...(profile.operation==='repair'?[repairLimitationRu]:[])];
    const excludedScopeRu=['Укладка бетона и соседние операции, отсутствующие в выбранном составе.',
      'Неподтверждённые нормы расхода, производительность, цены и готовый заказ поставщику.'];
    const baseline={parameter_schema_sha256:hash(parameters),
      input_values:{[primary.parameter_id]:1},
      input_classification:Object.fromEntries(parameters.map(p=>[p.parameter_id,'VALIDATION_FIXTURE'])),
      uom_by_parameter:Object.fromEntries(parameters.map(p=>[p.parameter_id,p.unit_id])),
      formula_consumer_ids:formulaConsumers,resource_consumer_row_ids:resourceConsumers,
      normative_source_ids:Object.fromEntries(parameters.map(p=>[p.parameter_id,
        (p.truth_metadata?.guide as Json | undefined)?.source_document===source.source_key?[source.source_key]:[]])),
      guide_provenance_ru:Object.fromEntries(parameters.map(p=>[p.parameter_id,
        String((p.truth_metadata?.guide as Json | undefined)?.guide_short_ru ?? 'Внутренний расчётный выход количества строки; значение не является первичным вводом или нормой.') ])),
      proposal_source_refs:[{sourceId:source.source_key,locatorId:locator.id,coverage:'METHOD_APPLICABILITY_ONLY',
        universalConsumptionClaimed:false,universalProductivityClaimed:false}],
      contract_version:'APPROVED_TEMPLATE_BASELINE_R54_V1'};
    const decision={contract:passportContract,waveContract:concreteFoundationAtomic34ForwardContractR1,status:'GREEN',allowed:true,quantityScope:'FULL',
      scopeMeaning:'DECLARED_ATOMIC_PROJECT_COMPOSITION_WITH_EXPLICIT_REQUIRED_FACTS',
      engineeringAccepted:false,projectScheduleRequired:true,priceState:'PARTIAL_NEEDS_PRICE',
      completeProjectEstimateAccepted:false,supplierOrderConfirmed:false,
      ...(profile.operation==='repair'?{productPassportValidationAutomaticallyEnforced:false,limitationRu:repairLimitationRu}:{}),
      activationAllowed:false,productionEligible:false};
    const plan=createCanonicalDefinitionClonePlan({contract:concreteFoundationAtomic34ForwardContractR1,
      definition:{id:definitionId,releaseId:input.releaseId,catalogId:profile.catalogId,
        definitionVersion:Number(parent.definition.definition_version)+1,definitionSha256,applicability,
        passport:{catalogId:profile.catalogId,canonicalRuName:profile.titleRu,workKey:profile.templateId,
          physicalResultRu:profile.scopeRu,projectScheduleRequired:true},
        sourceMetadata:{contract:concreteFoundationAtomic34ForwardContractR1,masterSha256:input.masterSha256,
          sourceFingerprint:input.sourceFingerprint,sourceFreezeSha256:input.sourceFreezeSha256,
          authoringContract:model.contract,authoringSourceStatus:model.status,
          predecessorDefinitionId:parent.definition.id,predecessorBaselineLeafId:parent.baseline.id,
          historicalRowsPreservedWithoutAutomaticMigration:parent.resources.map((r:Json)=>r.row_id),
          oldPrimaryQuantityAutomaticallyMapped:false,runtimeProfileInput:{},engineeringAccepted:false,
          limitationRu,activationAllowed:false,productionEligible:false}},
      representative:{parameters,formulas,resources,
        bindings:bindingRows.map(r=>({row_id:r.row_id,locator_id:locator.id,applicability:{
          coverage:'METHOD_APPLICABILITY_ONLY',projectScheduleRequired:true,
          universalConsumptionClaimed:false,universalProductivityClaimed:false}})),
        baseline,passport:{contract_version:passportContract,included_scope_ru:includedScopeRu,
          capability_matrix:[{capability:'PARAMETERS',status:'GREEN'},
            {capability:'FORMULAS_AND_PHYSICAL_PARITY',status:'GREEN'},
            {capability:'FULL_APPLICABLE_SCOPE',status:'GREEN',projectScheduleRequired:true,engineeringAccepted:false},
            {capability:'PRICE',status:'GREEN_UNKNOWN_IS_NULL'}]}},
      parameterTruthMetadata:p=>({...p.truth_metadata,contract:concreteFoundationAtomic34ForwardContractR1,
        semantic_parameter_key:`${profile.catalogId}:${p.parameter_id}`,
        formula_consumers:formulaConsumers[p.parameter_id],resource_branch_consumers:resourceConsumers[p.parameter_id]}),
      resourceId:r=>uuid([input.sourceFingerprint,profile.catalogId,'resource',r.row_id]),
      resourceSemanticOwner:r=>`${profile.catalogId}:${r.row_id}`,
      resourceSha256:r=>hash({contract:concreteFoundationAtomic34ForwardContractR1,catalogId:profile.catalogId,resource:r}),
      baseline:{id:baselineId,key:`${concreteFoundationAtomic34ForwardContractR1}:${input.sourceFingerprint}:${profile.catalogId}`,
        sourceDefinitionVersionId:parent.definition.id,supersedesBaselineId:parent.baseline.id,
        acceptedReleaseId:input.releaseId,acceptanceEvidenceSha256:input.acceptanceEvidenceSha256,
        validationScenarioRefs:[{scenario:'PRIMARY_ONLY_VALIDATION_FIXTURE_NOT_RUNTIME_DEFAULT',
          fixture:{[primary.parameter_id]:1},runtimeProfile:{},projectFactsNotInvented:true,
          previouslyAcceptedAuthoringEvidenceSha256:input.acceptanceEvidenceSha256}]},
      passport:{physicalResultRu:profile.scopeRu,excludedScopeRu,decision,payloadSha256:hash({definitionSha256,decision,includedScopeRu,excludedScopeRu}),
        sourceHead:input.sourceHead,sourceTree:input.sourceTree},
      bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:bindingRows.length});
    const visibleParameters=plan.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT');
    return {plan,primaryMeasureParameterId:primary.parameter_id,
      searchPatch:{primary_uom:primary.unit_id==='piece'?'шт.':'м³',short_scope_ru:profile.scopeRu+' '+limitationRu,
        key_distinguishing_parameters:visibleParameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,titleRu:p.title_ru,required:p.required})),
        required_inputs_count:visibleParameters.filter(p=>p.required).length,
        clarification_fields:visibleParameters.filter(p=>p.required).map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,titleRu:p.title_ru})),
        included_boundaries:includedScopeRu,excluded_boundaries:excludedScopeRu},
      honestUnconsumedParameterIds:parameters.filter(p=>resourceConsumers[p.parameter_id]!.length===0).map(p=>p.parameter_id)};
  });
  return {contract:concreteFoundationAtomic34ForwardContractR1,models:plans,
    preservedCatalogIds:[...preservedIds],engineeringAccepted:false,automaticHistoricalRowMigrationPerformed:false};
}
