import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prepareCt29IndoorDeliveryCleanupSuccessorR2} from './prepareCt29IndoorDeliveryCleanupSuccessorR2';
import {ct29ExistingMineralPackS2754,ct29ExistingMineralPrefixS2754,ct29ExistingMineralDefinitionS2754} from '../../../src/lib/estimate/v4/ct29ExistingMineralSeriesS2754';
import {ct29IndoorResourceProvisionPackR3 as pack,ct29IndoorResourceProvisionCompletenessMapR3} from '../../../src/lib/estimate/v4/ct29IndoorResourceProvisionR3';
import {compileAutomaticConstructionOwnerR1} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {parseCanonicalPublicResourcePresentationV1} from '../../../src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';

/** Data-only successor configuration for the existing sole local publisher. */
export function prepareCt29IndoorResourceProvisionSuccessorR3(parent:Parameters<typeof prepareCt29IndoorDeliveryCleanupSuccessorR2>[0]):MasterSingleDefinitionSuccessorConfig {
 const prior=prepareCt29IndoorDeliveryCleanupSuccessorR2(parent),source=ct29ExistingMineralPackS2754(1),prefix=ct29ExistingMineralPrefixS2754(1),
  definition=ct29ExistingMineralDefinitionS2754(1),map=ct29IndoorResourceProvisionCompletenessMapR3(source,prefix),
  row=(key:string)=>prefix+':'+key,path='data/estimate-benchmarks/source-packs/ct29-indoor-resource-provision-r3.json',
  sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex'),packSha=sha(path),
  provided=['mixer-drive','mixer-paddle',...pack.handToolProfiles.map(p=>p.resourceKey)],
  open=['curing-water',...pack.needs.filter(n=>!provided.includes(n.id)).map(n=>n.id)],
  evidence=[...pack.mixingDriveProfile.sources,...pack.handToolProfiles.flatMap(p=>p.sources)],
  input={plaster_area_m2:160,layer_thickness_mm:10.5,ct29_delivery_distance_km:20};
 for(const s of evidence)assert.equal(sha(s.canonicalPath),s.sha256,s.file);
 return {...prior,contract:pack.contract,stopCode:'CT29_INDOOR_RESOURCE_PROVISION_R3',applicationName:'ct29-indoor-resource-provision-r3',
  masterPath:'C:/Users/User/Downloads/GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19 (10).txt',
  masterSha256:'88115295f7be07539a1103b9d0ec7d70d431037fd8096c5c01e513cb19ac5b4d',
  sourceId:'ct29_existing_cement_lime_indoor_resource_provision_r3',normId:'CT29_GEOMETRY_RESOURCE_PROVISION_R3',
  sourcePaths:[...prior.sourcePaths,path,'src/lib/estimate/v4/ct29IndoorResourceProvisionR3.ts',
   'scripts/estimate/r4a13/prepareCt29IndoorResourceProvisionSuccessorR3.ts','tests/estimateNorms/ct29IndoorResourceProvisionR3.contract.test.ts',
   'src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1.ts',...evidence.map(s=>s.canonicalPath)],
  sourceMetadata:{source_title:pack.titleRu,source_authority:'Henkel/Ceresit; Collomix; STAYER; Bürkle; primary КРЕР/методики КР',
   source_kind:'COMPOSITE_PRIMARY_SOURCE_GEOMETRY',official_url:null,artifact_sha256:packSha,
   exact_locator:prior.sourceMetadata.exact_locator+'; '+pack.mixingDriveProfile.locatorsRu.join('; ')+'; '+pack.handToolProfiles.flatMap(p=>p.locatorsRu).join('; '),
   use_restriction:pack.resultRu+' '+pack.incomingBoundaryRu+' '+pack.readiness.ruleRu},
  parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:input,acceptanceInput:input,expectedParentShape:[prior.parameterDefinitions.length,prior.formulaDefinitions.length,prior.resourceDefinitions.length],
  validationScenario:'CT29_INDEPENDENT_OPERATION_RESOURCE_PROVISION_RETAINED_NUMERICAL_BASIS',
  passport:{...prior.passport,physicalResultRu:pack.resultRu,
   includedScopeRu:[...prior.passport.includedScopeRu,pack.readiness.ruleRu],independentCompletenessMap:map,
   unresolvedApplicableResourceRowIds:open.map(row)},
  applicability:{...prior.applicability,physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false,
   sourceAuthorObligations:map.openAuthorObligations,independentExpectedOperationResourceMap:true,knownPlannedPhysicalComponents:provided.length},
  binding:{...prior.binding,additionalRowIds:[...(prior.binding.additionalRowIds??[]),...provided.map(row)],
   applicability:{exactProfile:pack.contract,primaryEvidencePackSha256:packSha,fullTechnicalAcceptance:false}},
  locator:{key:'ct29-cement-lime-indoor-resource-provision-r3',payload:{sourcePack:pack,sourcePackSha256:packSha,
   noPrimaryRegistryUuidClaimed:true,physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false}},
  search:{...prior.search,shortScopeRu:pack.resultRu,
   sourceProvenance:{sourcePackPath:path,sourcePackSha256:packSha,requiredNonGeometryTechnicalQuestions:0,
    physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false}},
  receiptFileStem:'ct29_indoor_resource_provision_r3',verifyCore:async()=>{
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
   for(const r of definition.resources)assert(parseCanonicalPublicResourcePresentationV1(r.resource_graph.publicResourcePresentationV1),r.row_id);
   const compile=(values:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,
    primaryMeasureParameterId:'plaster_area_m2',definition,submittedParameters:values}),a=await compile(input),b=await compile({...input,ct29_delivery_distance_km:22.5});
   const q=(result:typeof a,key:string)=>result.rows.find(r=>r.row_id===row(key))?.quantity;
   for(const [key,value]of [['net-mixture','3024'],['25kg-order','3025'],['25kg-mix-water-consumed','750.2'],['labor','87.1752'],['mixer','2.8056']])
    assert.equal(q(a,key!),value,key);
   assert.equal(q(a,'delivery'),'60.5');assert.equal(q(b,'delivery'),'68.0625');
   for(const key of provided)assert.equal(q(a,key),'1');
   assert.deepEqual(a.preliminaryNeeds.filter(n=>n.need_state==='QUANTITY_REQUIRED').map(n=>n.row_id).sort(),open.map(row).sort());
   assert.deepEqual(definition.parameters.filter(p=>p.required&&p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),['plaster_area_m2','layer_thickness_mm']);
   return {status:'PASS_KNOWN_CONCRETE_PROVISION_WITH_EXPLICIT_SOURCE_GAPS',shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],
    operations:pack.operations.length,knownPlannedPhysicalComponents:provided.length,unknownApplicationQuantities:open.length,
    fullTechnicalAcceptance:false,physicalResourceCoverageComplete:false,requiredNonGeometryTechnicalQuestions:0};
  }};
}
