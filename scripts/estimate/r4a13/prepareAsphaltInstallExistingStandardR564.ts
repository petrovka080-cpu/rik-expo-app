// Pure staged descriptor. The existing Master publisher is the only writer;
// importing this module does not open PostgreSQL, publish, or start a process.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {appendAsphaltInstallExistingStandardR564,asphaltInstallExistingStandardPackR564 as pack,
 type AsphaltInstallCaptureR564} from '../../../src/lib/estimate/v4/asphaltInstallExistingStandardR564';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {prepareMasterRetainedBindingRepresentativeR1,masterRetainedParentCaptureSha256R1,
 type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {resolveMasterExistingNormativeRegistryReuseR1,resolveMasterSingleDefinitionLocatorExcerptSha256R1,
 validateIndependentCompletenessMapReferences,resolveMasterSingleDefinitionBindingRowIds,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import originalPack from '../../../data/estimate-benchmarks/source-packs/asphalt-install-large-area-krer27-profile-r1.json';
import {CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT} from './catalogFirstEstimateMinimumInputAudit.shared';

type Json=Record<string,any>;
const sha=(bytes:string|Buffer)=>createHash('sha256').update(bytes).digest('hex');
const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const masterPath='C:/Users/User/Downloads/GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19 (6).txt';
const masterSha256='afe7504e30a9383feadb6f6031e9d71891cc275a6492c2933aee356221d5e39b';
const subjectPath='src/lib/estimate/v4/asphaltInstallExistingStandardR564.ts';

export function prepareAsphaltInstallExistingStandardDraftR564(){
 const bytes=readFileSync(pack.fixture.path);assert.equal(sha(bytes),pack.fixture.sha256,'R564_TWO_PARENT_FIXTURE_SHA');
 const f=JSON.parse(bytes.toString('utf8')) as Json,c=f.standard.capturedParent as AsphaltInstallCaptureR564,r=f.recipe.capturedParent as AsphaltInstallCaptureR564;
 assert.equal(masterRetainedParentCaptureSha256R1(c),pack.parent.sha256);assert.equal(masterRetainedParentCaptureSha256R1(r),pack.historicalRecipe.sha256);
 assert.equal(sha(readFileSync(pack.source.localArtifactPath)),pack.source.sha256,'R564_OFFICIAL_ARTIFACT_SHA');
 assert.equal(sha(readFileSync(pack.profile.sourcePackPath)),pack.profile.sourcePackSha256,'R564_ORIGINAL_PROFILE_PACK_SHA');
 const model=appendAsphaltInstallExistingStandardR564({capturedParent:c,recipeParent:r});
 const source=copy(r.normativeSources.find(s=>s.id===pack.source.id)!);assert(source);
 const locator=copy(r.normativeLocators.find(l=>l.id===pack.source.locatorId)!);assert(locator);
 const {created_at:_created,...managed}=source;
 const registryReuse={contract:'master-existing-normative-registry-reuse/r1' as const,locatorExcerptHashKind:'SOURCE_LOCATOR_TEXT_SHA256' as const,source,locators:[locator]};
 const sourceKeys=new Set(c.normativeSources.map(s=>s.source_key));
 const missing=Object.fromEntries(Object.entries(c.baseline.normative_source_ids as Record<string,string[]>).flatMap(([id,ids])=>{
  const unknown=ids.filter(key=>!sourceKeys.has(key));return unknown.length?[[id,unknown]]:[];}));
 const newParameterSources:MasterRetainParentBindingsR1['newParameterSources']=Object.fromEntries(model.parameters.filter(p=>model.newParameterIds.includes(p.parameter_id)).map(p=>{
  const role=p.truth_metadata.value_source_role as string;return [p.parameter_id,role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED',sourceIds:[]}
   :role==='COMPILER_DERIVED_RESOURCE_QUANTITY'?{kind:'DERIVED',sourceIds:[]}:{kind:role.includes('DERIVED')?'DERIVED':'KNOWN',sourceIds:[source.source_key]}];}));
 const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:pack.parent.sha256,newParameterSources,
  legacyCapturedFixtureSources:{contract:'master-retained-captured-fixture-provenance/r1',parameterSources:missing}};
 const application={...copy(r.bindings[0].applicability),scope_class:'SELECTED_PHYSICAL_METHOD',selectedLayerThicknessMm:50,
  sourceRecipeCaptureSha256:pack.historicalRecipe.sha256,retainedParentCaptureSha256:pack.parent.sha256,
  selectedNewAreaParameterId:pack.areaId,historicalQaAreaNeverTransferred:true,preliminaryProfileId:pack.profile.id,
  preliminaryProfileVersion:pack.profile.version,fullTechnicalAcceptance:false};
 const binding={rowId:model.newlySourceBoundRowIds[0],...(model.newlySourceBoundRowIds.length>1?{additionalRowIds:model.newlySourceBoundRowIds.slice(1)}:{}),applicability:application,
  retainParentBindings:retained,reuseExistingNormativeRegistry:registryReuse};
 resolveMasterSingleDefinitionBindingRowIds({binding},model.resources,[locator.id]);
 const sourceMetadata={source_title:source.title_ru,source_authority:source.authority,official_url:source.official_url,
  artifact_sha256:source.artifact_sha256,effective_from:source.effective_from,source_kind:source.metadata.sourceKind,
  exact_locator:locator.locator.exactLocator,use_restriction:source.metadata.useRestriction};
 assert(resolveMasterExistingNormativeRegistryReuseR1({config:{stopCode:'ASPHALT_INSTALL_EXISTING_STANDARD_R564',binding},newSource:managed,newLocators:[locator]}));
 assert.equal(resolveMasterSingleDefinitionLocatorExcerptSha256R1({stopCode:'ASPHALT_INSTALL_EXISTING_STANDARD_R564',binding,sourceMetadata,
  locator:{key:locator.locator_key,payload:locator.locator}}),locator.excerpt_sha256);
 const representative=prepareMasterRetainedBindingRepresentativeR1({config:{stopCode:'ASPHALT_INSTALL_EXISTING_STANDARD_R564',catalogId:pack.catalogId,
  parentReleaseId:f.definitionReleaseId,binding},newSource:managed,newLocators:[locator]},
  {parameters:model.parameters,formulas:model.formulas,resources:model.resources,
   newBindings:model.newlySourceBoundRowIds.map(rowId=>({row_id:rowId,locator_id:locator.id,applicability:application})),
   successorProvenance:{contract:pack.contract,parentDefinitionId:pack.parent.definitionId,parentBaselineId:pack.parent.baselineId,
    capturedParentSha256:pack.parent.sha256,sourceRecipeCaptureSha256:pack.historicalRecipe.sha256,oldRowsRetained:26,
    existingRegistryReused:true,ordinaryObjectFactBudget:3,fullTechnicalAcceptance:false}});
 const map={contract:CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,sourceKind:'NORMATIVE_OPERATION_MAP',
  evidenceSha256:pack.profile.sourcePackSha256,evidenceReferences:[pack.profile.sourcePackPath,pack.fixture.path],generatedFromCurrentRows:false,
  retainedParentRowsAreNotNewNorms:c.resources.map(row=>row.row_id),derivedSecondaryRowsHaveNoIndependentNorm:true,
  entries:originalPack.independentRequiredComponents.map(component=>({...component,expectedResourceId:component.semanticKey,
   condition:'SELECTED_PHYSICAL_50_MM_METHOD',quantityRule:'EXACT_PINNED_RECIPE_EXPRESSION_WITH_NEW_MEASURED_AREA',
   formulaId:pack.prefix+component.formulaId,resolution:{kind:'ROW',rowId:pack.prefix+component.resolution.rowId}}))};
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
 const controlFacts={[pack.areaId]:75,[pack.siteId]:pack.siteReadyRu,[pack.haulId]:12};
 const compile=(parameters:Json)=>compileCanonicalEstimateCore({operation:'compile',catalogId:pack.catalogId,primaryMeasureParameterId:pack.areaId,compilerVersion:pack.contract,
  parameterDefinitions:model.parameters as unknown as CanonicalEstimateCompileCoreInput['parameterDefinitions'],formulaDefinitions:model.formulas as unknown as CanonicalEstimateCompileCoreInput['formulaDefinitions'],
  resourceDefinitions:model.resources as unknown as CanonicalEstimateCompileCoreInput['resourceDefinitions'],submittedParameters:parameters,confirmedParameters:model.runtimeProfileInput,currencyCode:'KGS',
  priceItems:[],maximumResourceRows:200,hashJson:async value=>estimateDeterministicHash(value)});
 const verifyCore=async()=>{const calculated=await compile(controlFacts);assert.equal(calculated.rows.find(row=>row.row_id===pack.prefix+'asphalt:material:hot-dense-fine-mix')?.quantity,'9.06');
  assert(!calculated.rows.some(row=>c.resources.some(old=>old.row_id===row.row_id)));assert(pack.gaps.every(gap=>calculated.preliminaryNeeds.some(need=>need.row_id===pack.prefix+'open:'+gap.id)));
  return {status:'PASS_SELECTED_KRER_50_MM_EXISTING_STANDARD_CORE',controlFacts,selectedRows:calculated.rows.length,needs:calculated.preliminaryNeeds.length,
   capturedParentSha256:pack.parent.sha256,sourceRecipeCaptureSha256:pack.historicalRecipe.sha256,fullTechnicalAcceptance:false,fixtureIsSource:false};};
 return {fixture:f,capture:c,recipe:r,model,binding,sourceMetadata,locator,map,representative,verifyCore,controlFacts};
}

/** Descriptor only: the integrator invokes the existing sole Master publisher. */
export function prepareAsphaltInstallExistingStandardR564(input:Readonly<{outputRoot?:string}>={}):MasterSingleDefinitionSuccessorConfig{
 assert.equal(sha(readFileSync(masterPath)),masterSha256,'R564_MASTER_2_2_SHA');
 const d=prepareAsphaltInstallExistingStandardDraftR564(),c=d.capture;
 // Preserve every old control value/class; it remains confined to the old method.
 const oldRuntime=Object.fromEntries(Object.entries(c.baseline.input_values).filter(([id])=>c.baseline.input_classification[id]!=='VALIDATION_FIXTURE'));
 return {contract:pack.contract,stopCode:'ASPHALT_INSTALL_EXISTING_STANDARD_R564',applicationName:'asphalt-install-existing-standard-r564',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath,masterSha256,parentReleaseId:d.fixture.definitionReleaseId,parentSearchReleaseId:d.fixture.searchReleaseId,
  currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',outputRoot:input.outputRoot??'.release-runtime/r568/standard-asphalt-install-r564/publication',
  sourcePaths:[subjectPath,'src/lib/estimate/v4/asphaltInstallExistingStandardR564.test.ts','data/estimate-benchmarks/source-packs/asphalt-install-existing-standard-r564.json',pack.fixture.path,
   pack.profile.sourcePackPath,'scripts/estimate/r4a13/prepareAsphaltInstallExistingStandardR564.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
   'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
   'src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimateSha256.ts','src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1.ts',
   'src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts','src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1.ts',
   'src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1.ts','src/lib/estimate/backendPlatform/formulaGraph.ts','src/lib/estimate/estimateDeterministicHash.ts'],
  catalogId:pack.catalogId,sourceId:pack.source.key,normId:d.recipe.definition.source_metadata.normId,sourceMetadata:d.sourceMetadata,
  parameterDefinitions:d.model.parameters,formulaDefinitions:d.model.formulas,resourceDefinitions:d.model.resources,expectedParentShape:[20,26,26],benchmarkOrdinal:0,
  shortInput:d.controlFacts,acceptanceInput:{...c.baseline.input_values,...d.controlFacts,...d.model.runtimeProfileInput},runtimeProfileInput:{...oldRuntime,...d.model.runtimeProfileInput},
  runtimeProfileClassification:{...Object.fromEntries(Object.keys(oldRuntime).map(id=>[id,c.baseline.input_classification[id]])),...d.model.runtimeProfileClassification},
  runtimeProfileSourceIds:{...Object.fromEntries(Object.keys(oldRuntime).map(id=>[id,c.baseline.normative_source_ids[id]])),...d.model.runtimeProfileSourceIds},verifyCore:d.verifyCore,
  validationScenario:'EXISTING_STANDARD_LEGACY_AND_SELECTED_KRER_50_MM_WITH_EXPLICIT_PROJECT_GAPS',
  passport:{canonicalRuName:pack.titleRu,workKey:'paving_roads_landscape_interior_asphalt_install_standard',
   physicalResultRu:'Однослойное покрытие горячим плотным мелкозернистым асфальтобетоном 50 мм на подготовленном основании.',
   includedScopeRu:['Толщина 50 мм закреплена выбранной работой; приложение автоматически применяет нормативный состав.','Состав включает нормативные материалы, труд, машины, укладку и уплотнение. Предварительная организация и контроль раскрыты отдельно.'],
   excludedScopeRu:pack.exclusionsRu,independentCompletenessMap:d.map,unresolvedApplicableResourceRowIds:pack.gaps.map(gap=>pack.prefix+'open:'+gap.id)},
  applicability:{...c.definition.applicability,primaryMeasureParameterId:pack.areaId,retainedParentCaptureSha256:pack.parent.sha256,
   selectedMethodContract:pack.contract,recipeSourceCaptureSha256:pack.historicalRecipe.sha256,ordinaryObjectFactBudget:3,freshFlow:pack.freshFlow,fullTechnicalAcceptance:false},
  binding:d.binding,locator:{key:d.locator.locator_key,payload:d.locator.locator},
  search:{primaryUom:'m2',canonicalNameRu:pack.titleRu,aliases:['устройство асфальтобетонного покрытия','асфальт50мм'],
   shortScopeRu:'Покрытие горячим плотным мелкозернистым асфальтобетоном 50 мм. Расходы рассчитываются по площади; предварительная организация, проект и фактическое обеспечение раскрыты отдельно.',
   keyDistinguishingParameters:[pack.areaId,pack.siteId,pack.haulId],clarificationFields:[pack.siteId,pack.haulId],
   includedBoundaries:['Однослойное покрытие 50 мм на подготовленном основании','Материалы, труд, механизмы и связанные подработы выбранной технологии'],
   excludedBoundaries:pack.exclusionsRu,extraSearchTermsRu:'асфальтобетон горячая плотная мелкозернистая смесь покрытие 50 мм',
   sourceProvenance:{contract:pack.contract,existingRegistryReused:true,fullTechnicalAcceptance:false}},
  forbiddenAdjacentMatchers:[/canonical-work:[^:]+:.*_(?:small|medium|large)_area$/u],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'asphalt_install_existing_standard_r564'};
}
