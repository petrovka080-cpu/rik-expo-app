// Read-only retained descriptor for the existing Master publisher. ROOT supplies the
// fresh execution/parent admission and the narrow legacy-source opt-in; reads only the pinned source artifact.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {makeMasterPreliminaryQuantityProfileBasisR1} from './masterTypedPartialQuantityBasisR1';
import capture from '../../../data/estimate-benchmarks/fixtures/standard-asphalt-compaction-retained-capture-r567.json';
import {buildStandardAsphaltCompactionR567,compileStandardAsphaltCompactionR567,
  standardAsphaltCompactionR567AcceptanceInput,STANDARD_ASPHALT_COMPACTION_R567_AREA,
  STANDARD_ASPHALT_COMPACTION_R567_METHOD,STANDARD_ASPHALT_COMPACTION_R567_PROFILE,
  STANDARD_ASPHALT_COMPACTION_R567_PACK as pack} from '../../../src/lib/estimate/v4/standardAsphaltCompactionR567';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {masterRetainedParentCaptureSha256R1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';

type Json=Record<string,any>;
const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
export function prepareStandardAsphaltCompactionMasterDraftR567(){
  const parent=capture.standard.capturedParent,d=buildStandardAsphaltCompactionR567(),source=pack.sourceRegistry,locator=pack.sourceLocators[0]!;
  if(masterRetainedParentCaptureSha256R1(parent)!==capture.standard.capturedParentSha256)throw Error('R567_STANDARD_PARENT_CAPTURE_SHA_DRIFT');
  if(masterRetainedParentCaptureSha256R1(capture.historicalRecipe.capturedParent)!==capture.historicalRecipe.capturedParentSha256)
    throw Error('R567_PHYSICAL_RECIPE_CAPTURE_SHA_DRIFT');
  const oldIds=new Set(parent.parameters.map(p=>p.parameter_id));
  const newParameterSources:MasterRetainParentBindingsR1['newParameterSources']=Object.fromEntries(d.parameters.filter(p=>!oldIds.has(p.parameter_id)).map(p=>[
    p.parameter_id,{kind:p.truth_metadata.value_source_role.includes('DERIVED')?'DERIVED' as const:'KNOWN' as const,sourceIds:[pack.sourceKey]},
  ]));
  const registeredKeys=new Set(parent.normativeSources.map(s=>s.source_key));
  const legacyParameterSources=Object.fromEntries(Object.entries(parent.baseline.normative_source_ids).map(([parameter,sources])=>[
    parameter,(sources as string[]).filter(key=>!registeredKeys.has(key)),
  ]).filter(([,sources])=>(sources as string[]).length>0));
  const retained:MasterRetainParentBindingsR1={capturedParent:clone(parent),capturedParentSha256:capture.standard.capturedParentSha256,newParameterSources,
    legacyCapturedFixtureSources:{contract:'master-retained-captured-fixture-provenance/r1',parameterSources:legacyParameterSources}};
  const boundRow=pack.resources.find(r=>r.id===pack.historicalPhysicalBinding.resource_spec_id)!.row_id;
  const binding={rowId:boundRow,applicability:{...clone(pack.historicalPhysicalBinding.applicability),
    scope_class:'THREE_PHASE_ROLLER_TRAIN',profile_version:pack.profileVersion,full_technical_acceptance:false,
    measured_area_parameter:STANDARD_ASPHALT_COMPACTION_R567_AREA,automatic_saved_revision_switch:false},
    retainParentBindings:retained,reuseExistingNormativeRegistry:{contract:'master-existing-normative-registry-reuse/r1' as const,
      locatorExcerptHashKind:'SOURCE_LOCATOR_TEXT_SHA256' as const,source:clone(source),locators:clone(pack.sourceLocators)}};
  const sourceMetadata={source_title:source.title_ru,source_authority:source.authority,source_kind:source.metadata.sourceKind,
    official_url:source.official_url,artifact_sha256:source.artifact_sha256,effective_from:source.effective_from,
    exact_locator:pack.historicalPhysicalBinding.applicability.exact_locator,use_restriction:source.metadata.useRestriction};
  const shortInput={[STANDARD_ASPHALT_COMPACTION_R567_AREA]:5000};
  const verifyCore=async()=>{
    const full=await compileStandardAsphaltCompactionR567(standardAsphaltCompactionR567AcceptanceInput());
    if(full.rows.length!==49||full.preliminaryNeeds.length!==0||full.rows.some(r=>d.oldResourceRowIds.includes(r.row_id)))throw Error('R567_EXCLUSIVE_PROFILE_49_ROWS');
    const quantities=new Map(full.rows.map(r=>[r.row_id,r.quantity]));
    for(const [row,value] of [['rc09:asphalt_compaction_breakdown_roller','3.472222222'],['rc09:asphalt_compaction_intermediate_roller','1.479640152'],
      ['rc09:asphalt_compaction_finish_roller','1.736111111'],['rc09:asphalt_compaction_crew','13.888888888']])if(quantities.get(row)!==value)throw Error('R567_SOURCE_ARITHMETIC:'+row);
    return {status:'PASS_R567_PURE_PHYSICAL_TRANSFER',shape:[24,21,59],retainedRows:10,selectedProfileRows:49,
      ordinaryFacts:3,sourceBindings:1,sourceRegistryReused:true,measuredAreaDefault:null,
      actualTrafficAndMobilizationDefaults:null,fullTechnicalAcceptance:false,publicationPerformed:false};
  };
  const oldBaseline=parent.baseline as Json;
  const oldRuntimeIds=Object.entries(oldBaseline.input_classification).filter(([,kind])=>kind==='DERIVED').map(([id])=>id);
  const oldRuntime=Object.fromEntries(oldRuntimeIds.map(id=>[id,oldBaseline.input_values[id]]));
  const completenessMap=clone(capture.historicalRecipe.passport.decision.independentCompletenessMap);
  if(validateIndependentCompletenessMapReferences({completenessMap,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}).length)
    throw Error('R567_INDEPENDENT_CAPTURED_COMPLETENESS_REFERENCE_DRIFT');
  const sourceArtifactUtf8=readFileSync(resolve(pack.sourceArtifactPath),'utf8');
  const assumptionPaths={roller_speed_km_h:'speedKmH',breakdown_coverages:'breakdownCoverages',intermediate_coverages:'intermediateCoverages',
    finish_coverages:'finishCoverages',utilization_factor:'utilizationFactor',crew_person_count:'crewPersonCount',acceptance_lot_m2:'acceptanceLotM2'};
  const partialQuantityBasis=makeMasterPreliminaryQuantityProfileBasisR1({...d,
    source:{sourceId:source.id,sourceKey:source.source_key,artifactSha256:source.artifact_sha256,
      locatorId:locator.id,locatorExcerptSha256:locator.excerpt_sha256,locatorPayload:clone(locator.locator)},
    method:{parameterId:STANDARD_ASPHALT_COMPACTION_R567_METHOD,value:STANDARD_ASPHALT_COMPACTION_R567_PROFILE,version:pack.contract},
    profileId:pack.profileVersion,sourceArtifactUtf8,primaryMeasureParameterId:STANDARD_ASPHALT_COMPACTION_R567_AREA,
    projectParameterIds:d.ordinaryParameterIds.filter(id=>id!==STANDARD_ASPHALT_COMPACTION_R567_AREA),
    assumptions:Object.entries(assumptionPaths).map(([parameter,path])=>({parameterId:'r567_compaction_'+parameter,sourceParameterId:parameter,
      valuePath:['selectedPreliminaryProfile',path],value:(pack.profileValues as Json)[parameter]}))});
  const knownConfigFields:Omit<MasterSingleDefinitionSuccessorConfig,'parentReleaseId'|'parentSearchReleaseId'>={
    contract:pack.contract,stopCode:'STANDARD_ASPHALT_COMPACTION_R567',applicationName:'standard-asphalt-compaction-r567',
    expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19 (6).txt',
    masterSha256:'afe7504e30a9383feadb6f6031e9d71891cc275a6492c2933aee356221d5e39b',
    currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
    outputRoot:'.release-runtime/r568/standard-asphalt-compaction-r567',
    sourcePaths:['src/lib/estimate/v4/standardAsphaltCompactionR567.ts','src/lib/estimate/v4/standardAsphaltCompactionR567.test.ts',
      'data/estimate-benchmarks/source-packs/standard-asphalt-compaction-retained-parent-r567.json',
      'data/estimate-benchmarks/source-packs/asphalt-compaction-three-roller-transfer-r567.json',
      'data/estimate-benchmarks/fixtures/standard-asphalt-compaction-retained-capture-r567.json',pack.sourceArtifactPath,completenessMap.sourcePackPath,
      'scripts/estimate/r4a13/prepareStandardAsphaltCompactionMasterDraftR567.ts',
      'scripts/estimate/r4a13/prepareStandardAsphaltCompactionMasterDraftR567.test.ts',
      'scripts/estimate/r4a13/runStandardAsphaltCompactionRetainedR567.ts',
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
      'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','scripts/estimate/r4a13/masterTypedPartialQuantityBasisR1.ts',
      'scripts/estimate/r4a13/masterTypedPartialQuantityBasisR1.test.ts'],
    catalogId:pack.standardCatalogId,sourceId:pack.sourceKey,normId:pack.historicalPhysicalBinding.applicability.norm_id,sourceMetadata,
    parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
    shortInput,acceptanceInput:{...oldBaseline.input_values,...standardAsphaltCompactionR567AcceptanceInput(),...d.runtimeInput},
    runtimeProfileInput:{...oldRuntime,...d.runtimeInput},
    runtimeProfileClassification:{...Object.fromEntries(oldRuntimeIds.map(id=>[id,'DERIVED' as const])),...d.runtimeClassification},
    runtimeProfileSourceIds:{...Object.fromEntries(oldRuntimeIds.map(id=>[id,oldBaseline.normative_source_ids[id]])),...d.runtimeSourceIds},
    verifyCore,expectedParentShape:[8,10,10],benchmarkOrdinal:0,validationScenario:'R567_EXPLICIT_PRELIMINARY_THREE_ROLLER_5000_M2',
    passport:{canonicalRuName:pack.publicMethodLabelRu,workKey:'paving_roads_landscape_interior_asphalt_compact_standard',
      physicalResultRu:pack.publicMethodLabelRu,includedScopeRu:[pack.publicMethodLabelRu],independentCompletenessMap:completenessMap,
      excludedScopeRu:['\u041f\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u0438 \u0443\u043a\u043b\u0430\u0434\u043a\u0430 \u0430\u0441\u0444\u0430\u043b\u044c\u0442\u043e\u0431\u0435\u0442\u043e\u043d\u043d\u043e\u0439 \u0441\u043c\u0435\u0441\u0438',
        '\u041f\u0440\u043e\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0438 \u043f\u0440\u0438\u0451\u043c\u043a\u0430 \u0431\u0435\u0437 \u0444\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u0434\u0430\u043d\u043d\u044b\u0445 \u043f\u0440\u043e\u0435\u043a\u0442\u0430 \u0438 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044f'],
      partialQuantityBasis},
    applicability:{primaryMeasureParameterId:STANDARD_ASPHALT_COMPACTION_R567_AREA,newEstimatesOnly:true,
      sourceMethodParameterId:STANDARD_ASPHALT_COMPACTION_R567_METHOD,profileVersion:pack.profileVersion,
      profileStatus:pack.profileStatus,ordinaryParameterIds:d.ordinaryParameterIds,fullTechnicalAcceptance:false,
      actualTrafficAndMobilizationMustBeProvided:true,automaticSavedRevisionSwitch:false,
      defaultProfileAppliesOnlyToNewDefinitions:true,legacyRecipeOfferedInPublicSelector:false},
    binding,locator:{key:locator.locator_key,payload:clone(locator.locator)},
    search:{primaryUom:'m2',canonicalNameRu:pack.publicMethodLabelRu,aliases:[pack.publicMethodLabelRu],
      shortScopeRu:sourceMetadata.use_restriction,keyDistinguishingParameters:d.ordinaryParameterIds,
      clarificationFields:pack.remainingEngineeringNeeds,includedBoundaries:[pack.publicMethodLabelRu],
      excludedBoundaries:['\u041f\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u0438 \u0443\u043a\u043b\u0430\u0434\u043a\u0430 \u0441\u043c\u0435\u0441\u0438, \u0432\u043e\u0434\u043e\u043e\u0442\u0432\u043e\u0434, \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e \u043e\u0441\u043d\u043e\u0432\u0430\u043d\u0438\u044f \u0438 \u043f\u043e\u0434\u0441\u0442\u0438\u043b\u0430\u044e\u0449\u0438\u0445 \u0441\u043b\u043e\u0451\u0432'],extraSearchTermsRu:pack.publicMethodLabelRu,
      sourceProvenance:{sourceKey:pack.sourceKey,sourcePackSha256:pack.sourceArtifactSha256,profileVersion:pack.profileVersion,
        fullTechnicalAcceptance:false,originalRegistryReused:true,oldHistoryAndPricesUnchanged:true}},
    forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR_R567',receiptFileStem:'standard_asphalt_compaction_r567',
  };
  return {status:'R567_RETAINED_DRAFT_PENDING_ROOT_GUARD_TESTS_AND_FRESH_PUBLICATION_ADMISSION' as const,publicationAllowed:false as const,
    knownConfigFields,parentReleaseId:null,parentSearchReleaseId:null,
    remainingPrerequisites:['ROOT completes r572 guard tests and full normal/locked historical-provenance absence checks; no invented source registry rows',
      'ROOT fresh parent/pointer/source freeze and closed normal/locked readback',
      'Fresh user measurements; actual traffic and mobilization counts remain null until supplied'],
    sourceCaptureSha256:capture.captureByteSha256,standardParentCaptureSha256:capture.standard.capturedParentSha256,
    physicalRecipeCaptureSha256:capture.historicalRecipe.capturedParentSha256};
}
