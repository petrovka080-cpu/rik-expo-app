import historicalBinding from '../../../../data/estimate-benchmarks/fixtures/aggressive-floor-actual-thickness-binding-historical-four-s27-69.json';
import {aggressiveFloorActualThicknessHistoricalBindingSha256S2769} from '../v4/aggressiveFloorActualThicknessScopeS2769';
import {buildAggressiveFloorActualThicknessSuccessorS2769,aggressiveFloorActualThicknessBindingS2769 as binding} from '../v4/aggressiveFloorActualThicknessScopeS2769';
import {buildAggressiveFloorActualThicknessMigrationProofS2769 as proof,admitAggressiveFloorActualThicknessMigrationProofS2769 as admit} from './canonicalAggressiveFloorActualThicknessMigrationS2769';
import {canonicalManualPriceMigrationBindings as prices,canonicalManualExclusionMigrationBindings as exclusions,canonicalStoredManualPricesCanMigrate} from './canonicalManualPriceReleaseMigration';
import {canonicalCompositionOperationMigrationBindingsV1 as operations,canonicalCompositionSelectionCanMigrateWithBindingsV1 as selected} from './canonicalEstimateCompositionSelectionV1';
import {createCanonicalDefinitionClonePlan,canonicalPublisherQuantityScopeIsConsistent} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {overlayS2769AggressiveFloorActualThicknessFour} from '../../../../scripts/estimate/r4a13/s2769AggressiveFloorActualThicknessFourOverlay';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
const parents=require('../../../../data/estimate-benchmarks/fixtures/aggressive-floor-four-v3-parents-s27-69.json') as {models:PurchaseGroupRepresentative[]};
const activeParents=parents.models.filter(parent=>binding.targets.some(target=>target.catalogId===parent.definition.catalog_id));
const historicalContext={binding:historicalBinding,sourcePackSha256:aggressiveFloorActualThicknessHistoricalBindingSha256S2769};
function input(index=0,legacy=false) {
 const from=(legacy?parents.models:activeParents)[index] as unknown as PurchaseGroupRepresentative,to=buildAggressiveFloorActualThicknessSuccessorS2769(from,legacy?historicalContext:undefined);
 return{from,to,fromDefinition:{id:String(from.definition.id),catalogId:String(from.definition.catalog_id),sha256:String(from.definition.definition_sha256)},
  toDefinition:{id:'55555555-5555-4555-8555-555555555555',catalogId:String(from.definition.catalog_id),sha256:'a'.repeat(64)}};
}
test.each(activeParents.map((_,i)=>i))('admits the active two-type publisher model with generated SQL identities: %s',index=>{
 const i=input(index),r=overlayS2769AggressiveFloorActualThicknessFour(i.from).representative;
 const plan=createCanonicalDefinitionClonePlan({contract:binding.contract,
  definition:{id:i.toDefinition.id,releaseId:'22222222-2222-4222-8222-222222222222',catalogId:i.toDefinition.catalogId,
   definitionVersion:4,passport:i.from.definition.passport,applicability:i.from.definition.applicability,
   definitionSha256:i.toDefinition.sha256,sourceMetadata:i.from.definition.source_metadata},representative:r,
  parameterTruthMetadata:p=>p.truth_metadata,resourceId:row=>'33333333-3333-4333-8333-'+hash(row.row_id).slice(0,12),
  resourceSemanticOwner:row=>String(row.semantic_owner),resourceSha256:row=>hash(row),
  baseline:{id:'44444444-4444-4444-8444-444444444444',key:'CONTROL_AGGRESSIVE_FOUR',sourceDefinitionVersionId:i.fromDefinition.id,
   validationScenarioRefs:[],acceptanceEvidenceSha256:'b'.repeat(64),acceptedReleaseId:'22222222-2222-4222-8222-222222222222',supersedesBaselineId:String(i.from.baseline.id)},
  passport:{physicalResultRu:String(i.from.passport.physical_result_ru),excludedScopeRu:i.from.passport.excluded_scope_ru,
   decision:r.passport.decision,payloadSha256:'c'.repeat(64),sourceHead:'d'.repeat(40),sourceTree:'e'.repeat(40)},
  bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:r.bindings.length});
 expect(admit({...i,to:plan,proof:proof({...i,to:plan})})).not.toBeNull();
 expect(plan.parameters).toHaveLength(19);expect(plan.resources).toHaveLength(10);
 expect(plan.passport.decision.unresolvedResourceRowIds).toHaveLength(2);
 expect(plan.parameters.every(p=>p.truth_metadata.contract===binding.contract)).toBe(true);
 expect(canonicalPublisherQuantityScopeIsConsistent(plan)).toBe(true);
 expect(plan.formulas.every(f=>/^[a-f0-9]{64}$/u.test(f.ast_sha256))).toBe(true);
});
test.each([0,1,2,3])('keeps historical prices, exclusions and operation bindings restorable: %s',index=>{
 const i=input(index,true),admitted=admit({...i,proof:{...proof(i),sourcePackSha256:historicalContext.sourcePackSha256}});expect(admitted).not.toBeNull();
 const normalized=admitted!.normalizedTo,id=Object.keys(prices(i.from))[0]!;
 expect(prices(normalized)).toEqual(prices(i.from));expect(exclusions(normalized)).toEqual(exclusions(i.from));
 expect(canonicalStoredManualPricesCanMigrate({rowOverrides:{[id]:{unitPrice:'75',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual'}}},
  customRows:[],fromBindings:prices(i.from),toBindings:prices(normalized),fromExclusionBindings:exclusions(i.from),toExclusionBindings:exclusions(normalized),currency:'KGS'})).toBe(true);
 expect(operations(normalized)).toEqual(operations(i.from));
 expect(selected({selection:{contractVersion:'canonical-estimate-composition-selection/v1',excludedRowIds:[id],excludedOperationKeys:[]},
  fromRows:exclusions(i.from),toRows:exclusions(normalized),fromOperations:operations(i.from),toOperations:operations(normalized)})).toBe(true);
});
test.each(['old-unit','new-owner','old-formula','new-formula','old-condition','source-metadata','parameter-default','parameter-lookup','parameter-authority','unlisted-parent'])('rejects even a rehashed unadmitted semantic change: %s',change=>{
 const i=input(),newRow=i.to.resources.find(r=>r.category==='service')!,newParam=i.to.parameters.find(p=>p.parameter_id===binding.actualThicknessParameterId)!;
 if(change==='old-unit')i.to.resources[0]!.unit_id='FORGED_UNIT';
 if(change==='new-owner')newRow.cost_owner_id='foreign-owner';
 if(change==='old-formula')i.to.formulas[0]!.ast={kind:'literal',value:'1'};
 if(change==='new-formula')i.to.formulas.find(f=>f.formula_id.endsWith(':waste-service'))!.expression_source='q*9';
 if(change==='old-condition')i.to.resources[0]!.inclusion_ast={kind:'literal',value:true};
 if(change==='source-metadata')newRow.source_metadata={...newRow.source_metadata,sourceRole:'FORGED_READY'};
 if(change==='parameter-default')newParam.default_value=9;
 if(change==='parameter-lookup')newParam.truth_metadata={...newParam.truth_metadata,automatic_lookup_v1:{value:999}};
 if(change==='parameter-authority'){
  const gap=i.to.parameters.find(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')!;
  gap.truth_metadata={...gap.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT'};
 }
 if(change==='unlisted-parent')i.fromDefinition.id='66666666-6666-4666-8666-666666666666';
 expect(admit({...i,proof:proof(i)})).toBeNull();
});

// Retired identities remain readable solely through the pinned old proof.
test.each(parents.models.map((_,i)=>i))('active publication rejects retired ids; exact old proof remains valid: %s',index=>{
 const parent=parents.models[index]!,retired=!binding.targets.some(t=>t.catalogId===parent.definition.catalog_id);
 if(retired)expect(()=>buildAggressiveFloorActualThicknessSuccessorS2769(parent)).toThrow();
 const i=input(index,true),oldProof={...proof(i),sourcePackSha256:historicalContext.sourcePackSha256};
 expect(admit({...i,proof:oldProof})).not.toBeNull();
 expect(admit({...i,proof:{...oldProof,sourcePackSha256:'0'.repeat(64)}})).toBeNull();
 const forged=structuredClone(historicalBinding);forged.contract+=':FORGED';
 expect(()=>buildAggressiveFloorActualThicknessSuccessorS2769(parent,{binding:forged,sourcePackSha256:historicalContext.sourcePackSha256})).toThrow('PINNED_HISTORICAL_BINDING_REQUIRED');
});
