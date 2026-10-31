import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prepareCt29IndoorGeometrySuccessorR1} from './prepareCt29IndoorGeometrySuccessorR1';
import {ct29ExistingMineralDeliveryCleanupPackR2 as ct29ExistingMineralPackS2754,ct29ExistingMineralPrefixS2754} from '../../../src/lib/estimate/v4/ct29ExistingMineralSeriesS2754';
import {ct29IndoorDeliveryCleanupPackR2 as pack,ct29IndoorDeliveryCleanupPackSha256R2 as packSha,
 ct29IndoorDeliveryCleanupCompletenessMapR2,buildCt29IndoorDeliveryCleanupDefinitionR2} from '../../../src/lib/estimate/v4/ct29IndoorDeliveryCleanupR2';
import {compileAutomaticConstructionOwnerR1} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';

/** Configuration only for the existing publisher. R1 bytes, definitions and saved history stay retained. */
export function prepareCt29IndoorDeliveryCleanupSuccessorR2(parent:Parameters<typeof prepareCt29IndoorGeometrySuccessorR1>[0]):MasterSingleDefinitionSuccessorConfig {
 const prior=prepareCt29IndoorGeometrySuccessorR1(parent),prefix=ct29ExistingMineralPrefixS2754(1),source=ct29ExistingMineralPackS2754(1),
  definition=buildCt29IndoorDeliveryCleanupDefinitionR2(source,prefix),map={...ct29IndoorDeliveryCleanupCompletenessMapR2(source,prefix),sourceKind:'NORMATIVE_OPERATION_MAP'},
  row=(key:string)=>prefix+':'+key,path='data/estimate-benchmarks/source-packs/ct29-indoor-delivery-cleanup-r2.json',
  primary='.release-runtime/r568/ct29-indoor-delivery-cleanup-r2/sources/'+pack.transportSource.file,
  input={plaster_area_m2:160,layer_thickness_mm:10.5,ct29_delivery_distance_km:20};
 const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
 assert.equal(sha(path),packSha);assert.equal(sha(pack.baseSourcePack),pack.baseSourcePackSha256);assert.equal(sha(primary),pack.transportSource.sha256);
 const included=[source.scopeRu,pack.transportPolicyRu,pack.cleanupPolicyRu],bound=['net-mixture','25kg-order','25kg-mix-water-consumed','labor','mixer','loader','hoist','delivery'];
 return {...prior,contract:pack.contract,stopCode:'CT29_INDOOR_DELIVERY_CLEANUP_R2',applicationName:'ct29-indoor-delivery-cleanup-r2',
  sourceId:'ct29_existing_cement_lime_indoor_delivery_cleanup_r2',normId:'CT29_GEOMETRY_KR_OVERHEAD_III11_12_DRY_ORDER_T_KM_R2',
  sourcePaths:[...prior.sourcePaths,path,primary,'src/lib/estimate/v4/ct29IndoorDeliveryCleanupR2.ts',
   'scripts/estimate/r4a13/prepareCt29IndoorDeliveryCleanupSuccessorR2.ts','tests/estimateNorms/ct29IndoorDeliveryCleanupR2.contract.test.ts'],
  sourceMetadata:{source_title:pack.titleRu,source_authority:'Ceresit/Henkel; КРЕР/методики КР; Нацстатком КР — определение т·км',
   source_kind:'COMPOSITE_PRIMARY_SOURCE_GEOMETRY',official_url:null,artifact_sha256:packSha,
   exact_locator:prior.sourceMetadata.exact_locator+'; '+pack.transportSource.locator+'; '+pack.cleanupSource.locator,
   use_restriction:included.join(' ')+' '+pack.readiness.openAuthorObligationsRu.join(' ')},
  parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:input,acceptanceInput:input,
  expectedParentShape:[prior.parameterDefinitions.length,prior.formulaDefinitions.length,prior.resourceDefinitions.length],
  validationScenario:'CT29_GEOMETRY_AND_DISTANCE_DERIVED_FREIGHT_INCLUDED_CLEANUP',
  passport:{...prior.passport,physicalResultRu:source.scopeRu,includedScopeRu:included,independentCompletenessMap:map,
   unresolvedApplicableResourceRowIds:[row('curing-water')]},
  applicability:{...prior.applicability,sourceAuthorObligations:pack.readiness.openAuthorObligationsRu,
   transportBasis:'EFFECTIVE_ORDER_DRY_MASS_TIMES_ONE_WAY_DISTANCE',cleanupIncludedOverheadWithCostOwner:true},
  binding:{rowId:row(bound[0]!),additionalRowIds:bound.slice(1).map(row),
   applicability:{exactProfile:pack.contract,primaryEvidencePackSha256:packSha,fullTechnicalAcceptance:false}},
  locator:{key:'ct29-cement-lime-indoor-delivery-cleanup-r2',payload:{sourcePack:pack,sourcePackSha256:packSha,
   baseSourcePackSha256:pack.baseSourcePackSha256,noPrimaryRegistryUuidClaimed:true,fullTechnicalAcceptance:false}},
  search:{...prior.search,shortScopeRu:source.scopeRu,keyDistinguishingParameters:['plaster_area_m2','layer_thickness_mm','ct29_delivery_distance_km'],
   clarificationFields:['plaster_area_m2','layer_thickness_mm','ct29_delivery_distance_km'],includedBoundaries:included,
   sourceProvenance:{sourcePackPath:path,sourcePackSha256:packSha,requiredNonGeometryTechnicalQuestions:0,fullTechnicalAcceptance:false}},
  receiptFileStem:'ct29_indoor_delivery_cleanup_r2',verifyCore:async()=>{
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
   const compile=(values:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,
    primaryMeasureParameterId:'plaster_area_m2',definition,submittedParameters:values}),r=await compile(input),stock=await compile({...input,ct29_25kg_stock_bags:3});
   const q=(result:typeof r,key:string)=>result.rows.find(resource=>resource.row_id===row(key))?.quantity;
   assert.equal(q(r,'25kg-order'),'3025');assert.equal(q(r,'delivery'),'60.5');assert.equal(q(stock,'delivery'),'59');
   assert.equal(q(r,'25kg-mix-water-consumed'),'750.2');assert.equal(q(r,'labor'),'87.1752');
   assert.deepEqual(r.preliminaryNeeds.filter(n=>n.need_state==='QUANTITY_REQUIRED').map(n=>n.row_id),[row('curing-water')]);
   const cleanup=r.preliminaryNeeds.find(n=>n.row_id===row('scope-cleanup'))!;
   assert.equal((((cleanup.calculation_trace as Record<string,unknown>).resourceGraph as Record<string,unknown>).scopeRequirementDecisionV1 as Record<string,unknown>).status,'INCLUDED');
   assert.deepEqual(definition.parameters.filter(p=>p.required&&p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),['plaster_area_m2','layer_thickness_mm']);
   return {status:'PASS_CT29_DERIVED_DELIVERY_INCLUDED_CLEANUP',shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],
    permittedInput:input,requiredNonGeometryTechnicalQuestions:0,unknownApplicationQuantities:1,fullTechnicalAcceptance:false};
  }};
}
