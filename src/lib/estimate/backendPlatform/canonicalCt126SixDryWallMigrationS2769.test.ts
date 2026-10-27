import {buildCt126SixDryWallSuccessorS2769,ct126SixDryWallBindingS2769 as binding} from '../v4/ct126SixDryWallReuseS2769';
import {buildCt126SixDryWallMigrationProofS2769 as proof,admitCt126SixDryWallMigrationProofS2769 as admit} from './canonicalCt126SixDryWallMigrationS2769';
import {canonicalManualPriceMigrationBindings as prices,canonicalManualExclusionMigrationBindings as exclusions,canonicalStoredManualPricesCanMigrate} from './canonicalManualPriceReleaseMigration';
import {canonicalCompositionOperationMigrationBindingsV1 as operations,canonicalCompositionSelectionCanMigrateWithBindingsV1 as selected} from './canonicalEstimateCompositionSelectionV1';
import {createCanonicalDefinitionClonePlan} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {overlayS2769Ct126SixDryWall} from '../../../../scripts/estimate/r4a13/s2769Ct126SixDryWallOverlay';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
const parents=require('../../../../data/estimate-benchmarks/fixtures/ct126-six-wall-v3-parents-s27-69.json') as {reps:PurchaseGroupRepresentative[]};
function input(index=0) {
 const from=parents.reps[index] as unknown as PurchaseGroupRepresentative,to=buildCt126SixDryWallSuccessorS2769(from);
 return{from,to,fromDefinition:{id:String(from.definition.id),catalogId:String(from.definition.catalog_id),sha256:String(from.definition.definition_sha256)},
  toDefinition:{id:'55555555-5555-4555-8555-555555555555',catalogId:String(from.definition.catalog_id),sha256:'a'.repeat(64)}};
}
test.each([0,1,2,3,4,5])('admits the full six-type publisher model with generated SQL identities: %s',index=>{
 const i=input(index),r=overlayS2769Ct126SixDryWall(i.from,'11111111-1111-4111-8111-111111111111').representative;
 const plan=createCanonicalDefinitionClonePlan({contract:binding.contract,
  definition:{id:i.toDefinition.id,releaseId:'22222222-2222-4222-8222-222222222222',catalogId:i.toDefinition.catalogId,
   definitionVersion:4,passport:i.from.definition.passport,applicability:i.from.definition.applicability,
   definitionSha256:i.toDefinition.sha256,sourceMetadata:i.from.definition.source_metadata},representative:r,
  parameterTruthMetadata:p=>p.truth_metadata,resourceId:row=>'33333333-3333-4333-8333-'+hash(row.row_id).slice(0,12),
  resourceSemanticOwner:row=>String(row.semantic_owner),resourceSha256:row=>hash(row),
  baseline:{id:'44444444-4444-4444-8444-444444444444',key:'CONTROL_CT126_SIX',sourceDefinitionVersionId:i.fromDefinition.id,
   validationScenarioRefs:[],acceptanceEvidenceSha256:'b'.repeat(64),acceptedReleaseId:'22222222-2222-4222-8222-222222222222',supersedesBaselineId:String(i.from.baseline.id)},
  passport:{physicalResultRu:String(i.from.passport.physical_result_ru),excludedScopeRu:i.from.passport.excluded_scope_ru,
   decision:r.passport.decision,payloadSha256:'c'.repeat(64),sourceHead:'d'.repeat(40),sourceTree:'e'.repeat(40)},
  bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:r.bindings.length});
 expect(admit({...i,to:plan,proof:proof({...i,to:plan})})).not.toBeNull();
 expect(plan.parameters).toHaveLength(33);expect(plan.resources).toHaveLength(89);
 expect(plan.passport.decision.ct126UnresolvedResourceRowIds).toHaveLength(11);
 expect(plan.parameters.every(p=>p.truth_metadata.contract===binding.contract)).toBe(true);
});
test.each([0,1,2,3,4,5])('keeps historical prices, exclusions and operation bindings restorable: %s',index=>{
 const i=input(index),admitted=admit({...i,proof:proof(i)});expect(admitted).not.toBeNull();
 const normalized=admitted!.normalizedTo,id=Object.keys(prices(i.from))[0]!;
 expect(prices(normalized)).toEqual(prices(i.from));expect(exclusions(normalized)).toEqual(exclusions(i.from));
 expect(canonicalStoredManualPricesCanMigrate({rowOverrides:{[id]:{unitPrice:'75',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual'}}},
  customRows:[],fromBindings:prices(i.from),toBindings:prices(normalized),fromExclusionBindings:exclusions(i.from),toExclusionBindings:exclusions(normalized),currency:'KGS'})).toBe(true);
 expect(operations(normalized)).toEqual(operations(i.from));
 expect(selected({selection:{contractVersion:'canonical-estimate-composition-selection/v1',excludedRowIds:[id],excludedOperationKeys:[]},
  fromRows:exclusions(i.from),toRows:exclusions(normalized),fromOperations:operations(i.from),toOperations:operations(normalized)})).toBe(true);
});
test.each(['old-unit','new-owner','old-formula','new-formula','old-condition','source-metadata','parameter-default','parameter-lookup','parameter-authority','unlisted-parent'])('rejects even a rehashed unadmitted semantic change: %s',change=>{
 const i=input(),newRow=i.to.resources.find(r=>r.row_id.startsWith('putty:ct126-dry-wall:'))!,newParam=i.to.parameters.find(p=>p.parameter_id.startsWith('ct126_wall_'))!;
 if(change==='old-unit')i.to.resources[0]!.unit_id='FORGED_UNIT';
 if(change==='new-owner')newRow.cost_owner_id='foreign-owner';
 if(change==='old-formula')i.to.formulas[0]!.ast={kind:'literal',value:'1'};
 if(change==='new-formula')i.to.formulas.find(f=>f.formula_id.startsWith('putty:ct126-dry-wall:'))!.expression_source='q*9';
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
