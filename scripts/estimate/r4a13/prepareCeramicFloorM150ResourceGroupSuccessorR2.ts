// Source descriptor only. Import/configuration performs no SQL or publication.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {verifyCeramicM150TargetPreconditionR2} from './ceramicM150TargetPreconditionR2';
import {type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences,validateMasterFormulaGraphConsistency,buildMasterParameterCalculationConsumers} from './prepareMasterSingleDefinitionSuccessorR1';
import {ceramicFloor02703PackR1 as prior} from '../../../src/lib/estimate/v4/ceramicFloorCementMortarKrer11Column03R1';
import {ceramicFloorM150ResourceGroupPackR2 as pack,ceramicFloorM150ResourceGroupDefinitionR2,ceramicFloorM150ResourceGroupCompletenessR2,compileCeramicFloorM150ResourceGroupR2} from '../../../src/lib/estimate/v4/ceramicFloorCementMortarResourceGroupR2';
type Json=Record<string,any>;
type Pin=Readonly<{path:string;sha256:string}>;
const packPath='data/estimate-benchmarks/source-packs/ceramic-floor-cement-mortar-resource-group-r2.json';
const descriptorPath='scripts/estimate/r4a13/prepareCeramicFloorM150ResourceGroupSuccessorR2.ts';
const historicalPin:Pin={path:'.release-runtime/r568/next-wave/ceramic02703/r2-sources/parent4b2d-readonly.json',sha256:'50fa448d1eb370121992f5be698b65258c517cd75639ab446e78280aea1577a4'};
const target={definitionVersionId:'b6e328f2-f34a-57b0-848a-7d31ed2bb94a',baselineId:'49bb256b-3e0e-5f09-88cf-380171d82b3d',definitionSha256:'36cb91099fcd99c064d03ec1ca1683e8e9eed67dbfec9e68138d65bb3df0b55b',shape:[177,90,90]} as const;
// Immutable target rows are independent of the selected parent release/search.
const stableSetHashes:Readonly<Record<string,string>>={
 definition:'a78a49500c9e0cc861c2c2f8629f1a605c7d41ed2e1b00f97756ae4665554e54',baseline:'fa4c2fd6e931dcb19830d069dee3946cc600d986c773d78e9171ea93a9a2a7f9',
 parameters:'a0eaccadcef99e77f1bbfe150eca737c616206f02820318ef7c83ac8a57654da',formulas:'d01ae38a0bd91dee6641b01958dd2daa82aee4dfa2890d26aacc81bf6e3ac8cb',
 resources:'9b73bcfdc1148a3bc1de556270770c0b9c0571da2bfd0ccebab2ff051e733536',bindings:'4e62709079814059d30207cfe5ee93923bef6e8ecda8ca7a3924a4ef08d6c8e6',
 normativeLocators:'486db1478b612f15ab4a1d4021194ee962c5fd7fd893170f85f28dceb53e7ad4',normativeSources:'852aee90dc3c5ea52cbd7859d22265ebd97820b92e27d68b9fc2f674a9b6b6cc',
 newSourcePreimage:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',workIdentity:'47a9eeb7d51c1be15a30ef6b53dee350a03d86e17a0fc93cfbdd96b480fada7f'};
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
function readPin(pin:Pin):Json{
 assert(pin.path.startsWith('.release-runtime/r568/')&&!pin.path.replaceAll('\\','/').split('/').includes('..'),'REPO_RELATIVE_REVIEWED_CAPTURE_REQUIRED');
 const bytes=readFileSync(resolve(pin.path));assert.equal(sha(bytes),pin.sha256,'EXACT_CAPTURE_BYTES');return JSON.parse(bytes.toString('utf8'));
}
/** A uses the same assertion on a fresh read immediately before publication and
 * under its existing locks. This pure assertion does not acquire those locks. */
export function assertCeramicFloorM150TargetPreimageR2(capture:Json):void{
 assert.equal(capture.contract,'master27-ceramic-m150-r2-readonly-parent/v1');assert.equal(capture.catalogId,pack.catalogId);assert.equal(capture.newSourceKey,pack.publicationSourceId);
 assert.equal(capture.databaseWrites,false);assert.equal(capture.transactionReadOnly,true);assert.equal(capture.transactionRolledBack,true);assert.equal(capture.connectionClosed,true);
 for(const [name,set]of Object.entries(capture.sets) as [string,Json][]){assert.equal(set.rowCount,set.rawRows.length,name);assert.equal(sha(set.rawRows.join('\n')+(set.rawRows.length?'\n':'')),set.sha256,name);}
 for(const[name,hash]of Object.entries(stableSetHashes))assert.equal(capture.sets[name]?.sha256,hash,'TARGET_PREIMAGE:'+name);
 const header=JSON.parse(capture.sets.target.rawRows[0]);assert.equal(capture.sets.target.rowCount,1);
 assert.equal(header.catalog_id,pack.catalogId);assert.equal(header.definition_version_id,target.definitionVersionId);assert.equal(header.approved_template_baseline_id,target.baselineId);assert.equal(header.definition_sha256,target.definitionSha256);
 assert.deepEqual([header.parameters,header.formulas,header.resources],target.shape);assert.equal(header.release_id,capture.parentReleaseId);assert.equal(capture.sets.newSourcePreimage.rowCount,0);
}
export type CeramicFloorM150SuccessorParentR2=Readonly<{releaseId:string;searchReleaseId:string;outputRoot:string;currentTargetPreimage:Pin}>;
/** The existing catalog is replaced by the sole common publisher. No append,
 * new catalog identity, historical revision rewrite or publisher fork. */
export function prepareCeramicFloorM150ResourceGroupSuccessorR2(parent:CeramicFloorM150SuccessorParentR2):MasterSingleDefinitionSuccessorConfig{
 const historic=readPin(historicalPin),current=readPin(parent.currentTargetPreimage);assertCeramicFloorM150TargetPreimageR2(historic);assertCeramicFloorM150TargetPreimageR2(current);
 assert.equal(current.parentReleaseId,parent.releaseId,'CURRENT_RELEASE_CAPTURE');assert.equal(current.parentSearchReleaseId,parent.searchReleaseId,'CURRENT_SEARCH_CAPTURE');
 const d=ceramicFloorM150ResourceGroupDefinitionR2(),map=ceramicFloorM150ResourceGroupCompletenessR2(),packSha=sha(readFileSync(packPath));
 const sources=[prior.source,pack.source,pack.overheadSource,pack.skinProtectionSource];for(const s of sources)assert.equal(sha(readFileSync(s.path)),s.sha256,'PRIMARY_ARTIFACT:'+s.path);
 const input={[pack.primaryParameterId]:100,[pack.skirtingLengthParameterId]:50},open=pack.actualRemaining.map(g=>prior.prefix+':'+g.rowSuffix),
  bound=d.resources.filter(r=>!open.includes(r.row_id)).map(r=>r.row_id),preimage={target,stableSetHashes,historicalCapture:historicalPin,currentCapture:parent.currentTargetPreimage,
   parentPairMayAdvanceOnlyWithIdenticalTarget:true,repeatTargetGuardUnderExistingWriterLocksRequired:true,newSourcePreimage:{sourceKey:pack.publicationSourceId,expected:null}};
 return{contract:pack.contract,stopCode:'CERAMIC_M150_RESOURCE_GROUP_R2',applicationName:'ceramic-m150-resource-group-r2',expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:'C:/Users/User/.codex/codex-remote-attachments/01a15c27-0cfb-74f1-b019-71f882b2cafe/4B91BF8B-8EF4-40FD-95FB-6170A0F7DB39/1-GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19.txt',
  masterSha256:'28089a66fa72e574dc730ed67beaec81e320380ee3dc8206561437c5cdcb9239',parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,
  currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),outputRoot:resolve(parent.outputRoot),
  sourcePaths:[packPath,'src/lib/estimate/v4/ceramicFloorCementMortarResourceGroupR2.ts','src/lib/estimate/v4/ceramicFloorCementMortarResourceGroupR2.test.ts',descriptorPath,descriptorPath.replace('.ts','.test.ts'),
   'data/estimate-benchmarks/source-packs/ceramic-floor-cement-mortar-krer11-027-03-r1.json','src/lib/estimate/v4/ceramicFloorCementMortarKrer11Column03R1.ts',
   'data/estimate-benchmarks/source-packs/ceramic-skirting-m150-krer11-039-04-completion-r1.json','src/lib/estimate/v4/ceramicSkirting03904CompletionR1.ts',
   'scripts/estimate/r4a13/prepareCeramicFloorCementMortarKrer11Column03AppendR1.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
   'scripts/estimate/r4a13/ceramicM150TargetPreconditionR2.ts',
   ...sources.map(s=>s.path),historicalPin.path,...(parent.currentTargetPreimage.path===historicalPin.path?[]:[parent.currentTargetPreimage.path])],
  catalogId:pack.catalogId,sourceId:pack.publicationSourceId,normId:'KRER11_02703_03904_PKTI36_RESOURCE_GROUP_R2',
  sourceMetadata:{source_title:pack.titleRu,source_authority:'КРЕР11; ПКТИпромстрой36-03ТК; методика накладных расходов КР; SCJohnson. Составная карта, не новая официальная норма.',
   source_kind:'COMPOSITE_PRIMARY_SOURCE_GEOMETRY',official_url:null,artifact_sha256:packSha,
   exact_locator:[prior.source.locatorRu,pack.skirting.locatorRu,pack.source.locatorRu,pack.overheadSource.locatorRu,pack.skinProtectionSource.locatorRu].join('; '),use_restriction:pack.profileScopeRu},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,shortInput:input,acceptanceInput:{...input,...d.runtimeInput},
  runtimeProfileInput:d.runtimeInput,runtimeProfileClassification:d.runtimeClassification,runtimeProfileSourceIds:d.runtimeSourceIds,expectedParentShape:[177,90,90],benchmarkOrdinal:0,
  validationScenario:'CERAMIC_M150_FLOOR_AND_MEASURED_SKIRTING_ONE_SHARED_MORTAR_TRUCK_OWNER_44_PROVISION_6_CONTROLS_3_REAL_NEEDS',
  passport:{canonicalRuName:pack.titleRu,workKey:prior.proposedIdentity.workKey,physicalResultRu:pack.profileScopeRu,
   includedScopeRu:['Пол: исходная подготовка, сортировка, настилка, цементные швы, уход, очистка и промывка.','Прямой керамический плинтус по отдельно измеренной длине; общий М150 и транспорт.','Расчётное обеспечение одной бригады инструментом/СИЗ и стандартным контролем.'],
   excludedScopeRu:prior.excludedRu.filter(x=>!x.toLocaleLowerCase('ru-RU').includes('плинтус')),independentCompletenessMap:map,unresolvedApplicableResourceRowIds:open},
  applicability:{primaryMeasureParameterId:pack.primaryParameterId,additionalMeasuredGeometry:[pack.skirtingLengthParameterId],ordinaryObjectFactBudget:2,requiredNonGeometryTechnicalQuestions:0,
   physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false,engineeringAcceptance:false,acceptedNewCompleteTypes:0,priceUnknownIsNotQuantityUnknown:true,
   technologyConditions:pack.technologyConditions,exactTargetPreimage:preimage,historicalR1AndCurrentSavedRevisionsPreserved:true},
  binding:{rowId:bound[0]!,additionalRowIds:bound.slice(1),applicability:{sourceKind:'COMPOSITE_PRIMARY_WITH_EXPLICIT_DERIVED_PROVISION_AND_BALANCES',primaryEvidencePackSha256:packSha,
   noNewOfficialConsumptionNorm:true,fullTechnicalAcceptance:false},applicabilityByRowId:Object.fromEntries(d.resources.filter(r=>bound.includes(r.row_id)).map(r=>[r.row_id,{sourceRole:r.source_metadata?.sourceRole??'HISTORICAL_EXACT_02703',normativeTrace:r.source_metadata?.normativeTrace??[],physicalProvisionAccepted:r.source_metadata?.physicalProvisionAccepted??false}]))},
  locator:{key:'ceramic-m150-floor-skirting-resource-group-r2',payload:{sourcePack:pack,sourcePackSha256:packSha,exactTargetPreimage:preimage,primaryArtifacts:sources,
   independentlyDeclaredMap:map,unresolvedApplicableResourceRowIds:open,noPrimaryRegistryUuidClaimed:true,fullTechnicalAcceptance:false}},
  search:{primaryUom:'m2',canonicalNameRu:pack.titleRu,aliases:['Неглазурованная керамическая плитка на М150 с прямым плинтусом','Керамические полы с цементными швами КРЕР11-01-027-03'],
   shortScopeRu:'Ручная укладка керамического пола и прямого плинтуса на готовом М150.',keyDistinguishingParameters:Object.keys(input),clarificationFields:Object.keys(input),
   includedBoundaries:['Пол по чистой площади, прямой плинтус по отдельной длине; цельные исходные работы.'],excludedBoundaries:prior.excludedRu.filter(x=>!x.toLocaleLowerCase('ru-RU').includes('плинтус')),
   extraSearchTermsRu:'керамический пол неглазурованная плитка М150 цементные швы прямой керамический плинтус',sourceProvenance:{sourcePackPath:packPath,sourcePackSha256:packSha,primaryArtifacts:sources,
    fullTechnicalAcceptance:false,physicalResourceCoverageComplete:false,unresolvedApplicableNeeds:3,exactTargetPreimage:preimage}},
  forbiddenAdjacentMatchers:[/roof:|road-upper-base:|floor-underlayer:|legrand|elecor|granite-kerb|masonry:brick-partition:|cm11|ce40|ct17|cs25/iu],
  owner:'ROOT_SINGLE_WRITER_MASTER27_GROUP_WAVE',receiptFileStem:'ceramic_m150_resource_group_r2',
  verifyTargetPrecondition:async(client,phase)=>{
   if(phase==='LOCKED_BEFORE')await client.query(`lock table public.estimate_cumulative_manifest_entry,
    public.estimate_definition_version,public.estimate_approved_template_baseline,public.estimate_parameter_definition,
    public.estimate_formula_graph,public.estimate_resource_spec,public.estimate_work_normative_binding,
    public.estimate_normative_locator,public.estimate_normative_source,public.estimate_work_identity in share row exclusive mode`);
   const zone=(await client.query("select current_setting('TimeZone') zone")).rows[0].zone;
   await client.query("select set_config('TimeZone','Asia/Yekaterinburg',$1)",[phase==='LOCKED_BEFORE']);
   try{await verifyCeramicM150TargetPreconditionR2({client,releaseId:parent.releaseId,expectedCapture:current,phase});}
   finally{await client.query("select set_config('TimeZone',$1,$2)",[zone,phase==='LOCKED_BEFORE']);}
  },verifyCore:async()=>{
   assert.deepEqual(validateMasterFormulaGraphConsistency(d.formulas),[]);assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
   const consumers=buildMasterParameterCalculationConsumers(d);for(const p of d.parameters)assert(consumers.resourceConsumers[p.parameter_id]!.length>0,'PARAMETER_WITHOUT_RESOURCE:'+p.parameter_id);
   const result=await compileCeramicFloorM150ResourceGroupR2(input),q=(key:string)=>result.rows.find(r=>r.row_id===prior.prefix+':'+key)?.quantity;
   for(const[key,value]of [['whole-labor','119.78'],['ready-mortar-m150-order','1.38'],['truck5t-consumed','0.31'],['r2:skirting-labor','11.8'],['r2:skirting-tile-order','50.5'],['r2:provision-owner','100']])assert.equal(q(key!),value,key);
   assert.deepEqual(result.preliminaryNeeds.map(n=>n.row_id).sort(),open.slice().sort());assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length],[26,80,80]);
   return{status:'PASS_GROUP_PLAN_WITH_THREE_EXPLICIT_PHYSICAL_NEEDS',operations:8,toolAndPpePositions:44,controls:6,shape:[26,80,80],requiredNonGeometryTechnicalQuestions:0,openPhysicalNeeds:open,fullTechnicalAcceptance:false};
  }};
}
