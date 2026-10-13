import parents from '../../../../data/estimate-benchmarks/fixtures/cn87-four-subfloor-v4-parents-s27-69.json';
import {buildCn87SubfloorSuccessorS2769} from '../v4/cn87SubfloorSeriesS2769';
import {buildCn87SubfloorMigrationProofS2769 as proof,admitCn87SubfloorMigrationProofS2769 as admit} from './canonicalCn87SubfloorMigrationS2769';
import {canonicalManualPriceMigrationBindings as prices,canonicalManualExclusionMigrationBindings as exclusions,canonicalStoredManualPricesCanMigrate} from './canonicalManualPriceReleaseMigration';
import {canonicalCompositionOperationMigrationBindingsV1 as operations,canonicalCompositionSelectionCanMigrateWithBindingsV1 as selected} from './canonicalEstimateCompositionSelectionV1';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {createCanonicalDefinitionClonePlan} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {overlayS2769Cn87SubfloorFour} from '../../../../scripts/estimate/r4a13/s2769Cn87SubfloorFourOverlay';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
function input(index=0){const from=parents.reps[index] as unknown as PurchaseGroupRepresentative,to=buildCn87SubfloorSuccessorS2769(from);return{from,to,
 fromDefinition:{id:String(from.definition.id),catalogId:String(from.definition.catalog_id),sha256:String(from.definition.definition_sha256)},
 toDefinition:{id:'55555555-5555-4555-8555-555555555555',catalogId:String(from.definition.catalog_id),sha256:'a'.repeat(64)}};}
test.each([0,1,2,3])('admits the publisher projection after generated SQL identities: %s',index=>{
 const i=input(index),r=overlayS2769Cn87SubfloorFour(i.from,'11111111-1111-4111-8111-111111111111').representative;
 const plan=createCanonicalDefinitionClonePlan({contract:'CONTROL_CN87',definition:{id:i.toDefinition.id,releaseId:'22222222-2222-4222-8222-222222222222',catalogId:i.toDefinition.catalogId,
  definitionVersion:5,passport:i.from.definition.passport,applicability:i.from.definition.applicability,definitionSha256:i.toDefinition.sha256,sourceMetadata:i.from.definition.source_metadata},
  representative:r,parameterTruthMetadata:p=>p.truth_metadata,resourceId:row=>'33333333-3333-4333-8333-'+hash(row.row_id).slice(0,12),resourceSemanticOwner:row=>String(row.semantic_owner),resourceSha256:row=>hash(row),
  baseline:{id:'44444444-4444-4444-8444-444444444444',key:'CONTROL_CN87',sourceDefinitionVersionId:i.fromDefinition.id,validationScenarioRefs:[],acceptanceEvidenceSha256:'b'.repeat(64),acceptedReleaseId:'22222222-2222-4222-8222-222222222222',supersedesBaselineId:String(i.from.baseline.id)},
  passport:{physicalResultRu:String(i.from.passport.physical_result_ru),excludedScopeRu:i.from.passport.excluded_scope_ru,decision:r.passport.decision,payloadSha256:'c'.repeat(64),sourceHead:'d'.repeat(40),sourceTree:'e'.repeat(40)},
  bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:r.bindings.length});
 expect(admit({...i,to:plan,proof:proof({...i,to:plan})})).not.toBeNull();
});
test.each([0,1,2,3])('preserves exact old prices and complete operation exclusions after additive parameters: %s',index=>{
 const i=input(index),admitted=admit({...i,proof:proof(i)});expect(admitted).not.toBeNull();
 const id='floor:cn69-global-25kg:cn69-order',oldPrice=prices(i.from),oldExclusions=exclusions(i.from),normalized=admitted!.normalizedTo;
 expect(prices(i.to)[id]).toBe(oldPrice[id]);expect(exclusions(i.to)[id]).not.toBe(oldExclusions[id]);
 expect(canonicalStoredManualPricesCanMigrate({rowOverrides:{[id]:{unitPrice:'75',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual'}}},customRows:[],
  fromBindings:oldPrice,toBindings:prices(normalized),fromExclusionBindings:oldExclusions,toExclusionBindings:exclusions(normalized),currency:'KGS'})).toBe(true);
 const fromOperations=operations(i.from),toOperations=operations(normalized),key=Object.keys(fromOperations).find(k=>k.includes('cn69-global'))!;
 expect(selected({selection:{contractVersion:'canonical-estimate-composition-selection/v1',excludedRowIds:[],excludedOperationKeys:[key]},fromRows:oldExclusions,toRows:exclusions(normalized),fromOperations,toOperations})).toBe(true);
 expect(canonicalStoredManualPricesCanMigrate({rowOverrides:{[id]:{unitPrice:'75',quantity:'1',provenance:{kind:'manual'}}},customRows:[],fromBindings:oldPrice,toBindings:prices(normalized),currency:'KGS'})).toBe(false);
});
test.each(['row-unit','old-formula','new-formula','old-operation-member','parameter-authority','parent-identity'])('rejects a rehashed but unadmitted change: %s',change=>{
 const i=input();
 if(change==='row-unit')i.to.resources[0]!.unit_id='kg';
 if(change==='old-formula')i.to.formulas[0]!.ast={kind:'literal',value:'7'};
 if(change==='new-formula')i.to.formulas.find(f=>f.formula_id==='cn87:separation-50mm:formula:cn87-consumed')!.ast={kind:'literal',value:'1'};
 if(change==='old-operation-member')i.to.resources.at(-1)!.resource_graph.operationCompositionV1=structuredClone(i.from.resources.find(r=>r.resource_graph.operationCompositionV1)!.resource_graph.operationCompositionV1);
 if(change==='parameter-authority')i.to.parameters[0]!.truth_metadata.value_source_role='RUNTIME_STRUCTURAL_DEFAULT';
 if(change==='parent-identity')i.fromDefinition.id='66666666-6666-4666-8666-666666666666';
 expect(admit({...i,proof:proof(i)})).toBeNull();
});
test.each([false,true])('rejects an injected dosage lookup with an original or forged proof: %s',rehash=>{
 const i=input(),original=proof(i),parameter=i.to.parameters.find(p=>p.parameter_id==='cn87_subfloor_mix_water_l_per_25kg')!;
 parameter.truth_metadata={...parameter.truth_metadata,derived_exact_lookup_v1:{contractVersion:'canonical-derived-exact-lookup/v1',parameterId:'q',values:{'35.51':'1.9'}}};
 expect(admit({...i,proof:rehash?proof(i):original})).toBeNull();
});
