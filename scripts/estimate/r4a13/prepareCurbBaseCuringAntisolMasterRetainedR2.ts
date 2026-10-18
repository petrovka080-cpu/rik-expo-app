// WORK-only configuration proposal. ROOT alone adopts, checks and publishes.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {appendCurbBaseCuringMaterialR1,curbBaseCuringControlFactsR1,
 curbBaseCuringMaterialPackR1 as pack} from '../../../src/lib/estimate/v4/curbBaseCuringAntisol250wCompletionR1';
import {type AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {graniteKerbCementAcceptanceInputR1} from './prepareGraniteKerbCementColumn03AppendR1';
import {masterRetainedParentCaptureSha256R1,prepareMasterRetainedBindingRepresentativeR1,
 type MasterRetainParentBindingsR1,type MasterRetainedParentCaptureR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {resolveMasterExistingNormativeRegistryReuseR1,assertMasterExistingNormativeRegistrySnapshotR1,
 resolveMasterSingleDefinitionLocatorExcerptSha256R1,
 validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';

type Json=Record<string,any>;
export type CurbCuringRootPinR2=Readonly<{path:string;sha256:string}>;
export const curbCuringCapturePathR2='data/estimate-benchmarks/fixtures/curb03-curing-full-current-capture-r1.json';
export const curbCuringGuardPathR2='data/estimate-benchmarks/fixtures/curb03-curing-full-current-capture-guard-r1.json';
export const curbCuringBindingsPathR2='data/estimate-benchmarks/fixtures/curb03-curing-existing-registry-bindings-r2.json';
export const curbCuringCaptureShaR2='eb1ba27f07ee32cff3e698adfc80f2d49e6ae5ba9962824928b29f21cc88f113';
export const curbCuringParentShaR2='a8cf5bb29df0dd4ead89fae0f86f2ac8ec67c2db879b191aead13464e138a808';
export const curbCuringBindingOriginShaR2='1140247d4135674a0315ba4fc765b841195bbcd56ca7b3ec929dbf319e3e3832';
export const curbCuringRoadContextR2={sourceHead:'87a0a3d8472217c6d22c220c9abfda09402dab95',
 recordedReleaseSourceCommit:'4476eb99d878323e411d6a8351dab1cb7623f7e0',
 definitionReleaseId:'a6a6b3be-16c2-5328-96fc-78199642064a',searchReleaseId:'1a4e87b5-db76-562b-9480-571ea353b542'} as const;
const contract='gox-build.curb03-exposed-b15-antisol-material-retained/r2';
const masterSha='dfbb757a1562962636259c1c4cffd9127d15882b00cdd49baa8fcd4831bcacf2';
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const isObject=(x:unknown):x is Json=>x!=null&&typeof x==='object'&&!Array.isArray(x);
const pin=(p:CurbCuringRootPinR2):Json=>{assert(/^[a-f0-9]{64}$/.test(p.sha256),'CURB_ROOT_PIN_SHA');
 assert((p.path.startsWith('data/estimate-benchmarks/')||p.path.startsWith('.release-runtime/r568/'))&&!p.path.replaceAll('\\','/').split('/').includes('..'),'CURB_ROOT_PIN_RELATIVE_INTEGRATED_PATH');
 const b=readFileSync(resolve(p.path));assert.equal(sha(b),p.sha256,'CURB_ROOT_PIN_BYTES:'+p.path);return JSON.parse(b.toString('utf8'));};
const fixture=(path:string,sha256:string)=>pin({path,sha256});

export function assertCurbCuringAcceptedCurrentCaptureR2(read:Json,guard:Json,witness:Json):void{
 assert.equal(read.status,'PASS_CURB03_CURRENT_FULL_RETENTION_PUBLISHER8_AND_ANTISOL_NORMAL_PREIMAGE_R1');
 for(const k of ['completeReadSet','transactionReadOnly','transactionRolledBack','connectionClosed','allTransactionsRolledBack','allConnectionsClosed'])assert.equal(read[k],true,'CURB_CAPTURE_CLOSED:'+k);
 assert.equal(read.error,null);assert.equal(read.databaseWritesPerformed,false);assert.equal(read.appJobs,false);
 assert.deepEqual(read.executionContext,curbCuringRoadContextR2);assert.equal(read.actualQueryHead,curbCuringRoadContextR2.sourceHead);
 assert.equal(guard.status,'PASS_BOUNDED_CURB03_CURRENT_FULL_RETENTION_AND_ANTISOL_READ_R1');
 assert.equal(guard.error,null);assert.deepEqual(guard.cleanupErrors,[]);assert.deepEqual(guard.remainingOwnedProcesses,[]);assert.equal(guard.noOwnedProcessStillRunning,true);
 const c=read.capturedParent as MasterRetainedParentCaptureR1;
 assert.equal(read.capturedParentSha256,curbCuringParentShaR2);assert.equal(masterRetainedParentCaptureSha256R1(c),curbCuringParentShaR2);
 assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length,c.bindings.length,c.normativeSources.length,c.normativeLocators.length],[50,27,27,21,1,1]);
 assert.equal(c.definition.id,pack.parentDefinitionId);assert.equal(c.baseline.id,pack.parentBaselineId);assert.equal(c.definition.catalog_id,pack.catalogId);
 assert.equal(c.definition.definition_sha256,'227427bd1b3cf32a104d4575c05c7b652e7f35021933e68596d74e29784b1475');
 assert.equal(read.publisherEightComparison.payloadSha256,'711eb51058c5160e6a2a017b9c5c52974d9ecbc69f31dea8c5cebf4455aab0ca');
 assert.equal(read.publisherEightComparison.allEightSemanticSectionsExactToAcceptedOrigin,true);
 assert.deepEqual(read.publisherEightComparison.shape,[50,27,27]);assert.equal(read.publisherEightComparison.bindings,21);assert.equal(read.publisherEightComparison.priceBindings,0);
 assert.equal(read.publisherEightComparison.openNeeds.length,6);assert(read.publisherEightComparison.openNeeds.includes(pack.completionNeedRowId));
 assert.equal(read.fullBindingOriginSeal.count,21);assert.equal(read.fullBindingOriginSeal.sha256,curbCuringBindingOriginShaR2);
 const a=read.antisolNormalPreimage;assert.equal(a.disposition,'EXACT_BOTH_PRESENT');assert.deepEqual(a.sourceRows,[witness.sourceFullRow]);assert.deepEqual(a.locatorRows,[witness.locatorFullRow]);
 assert.equal(a.sourceRows.length,1);assert.equal(a.locatorRows.length,1);assert(!c.normativeSources.some(s=>s.id===a.sourceRows[0].id||s.source_key===a.sourceRows[0].source_key));
 assert.deepEqual(read.retainedSnapshot.capture,c);assert.deepEqual(read.retainedSnapshot.newSources,a.sourceRows);assert.deepEqual(read.retainedSnapshot.newLocators,a.locatorRows);
 assert.equal(c.formulas.find(f=>f.formula_id==='granite-kerb:1gp-cement-pavement:formula:whole-labor')!.expression_source,'kerb_length_m*109/100');
}

/** Exact map, NOT a role-based fallback. Object measurements are not PDS rates. */
export function curbCuringNewParameterSourcesR2():MasterRetainParentBindingsR1['newParameterSources']{
 const known=['exposed_curing_surface_area_m2','approved_external_curing_method','antisol_material_choice',
  'antisol_surface_ready','antisol_minimum_temperature_12h_c','antisol_subsequent_surface_use',
  'antisol_usable_stock_l','antisol_retained_reserve_l','curb_base_curing_material_option',
  'curb_curing_surface_scope','curb_curing_surface_finish','curb_curing_future_interface',
  'curb_curing_measured_surface_reference','curb_curing_method_reference','curb_curing_adjacent_protection_reference',
  'curb_curing_material_payment_scope','curb_curing_material_payment_reference','curb_curing_stock_compatibility_reference'];
 return {...Object.fromEntries(known.map(id=>[id,{kind:'KNOWN' as const,sourceIds:[pack.materialSourceId]}])),
  effective_resource_quantity_material_concrete_membrane_curing_compound_antisol250w_us:{kind:'DERIVED',sourceIds:[]}};
}

/** No future parent, identity allocation, SQL or mutation. Builds on full ACTUAL rows. */
export function prepareCurbBaseCuringAntisolMasterDraftR2(){
 const read=fixture(curbCuringCapturePathR2,curbCuringCaptureShaR2);
 const guard=fixture(curbCuringGuardPathR2,'a5090201e3b50a910a05fce37451fb8a74eb1cfa0001eb425e1fb3f78e0a41f8');
 const witness=fixture(curbCuringBindingsPathR2,'eedfa7e786105b510c56c382cc8aa28f73bcc82404c02aa7d864bc6e2c131109');
 assertCurbCuringAcceptedCurrentCaptureR2(read,guard,witness);
 const c=clone(read.capturedParent) as MasterRetainedParentCaptureR1;
 const parent={parameters:c.parameters,formulas:c.formulas,resources:c.resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},
  ordinaryParameterIds:['kerb_length_m']} as unknown as AutomaticOwnerDefinition;
 const next=appendCurbBaseCuringMaterialR1(parent);
 assert.deepEqual([next.parameters.length,next.formulas.length,next.resources.length],[69,34,34]);
 assert.deepEqual(next.parameters.slice(0,50),c.parameters);assert.deepEqual(next.formulas.slice(0,27),c.formulas);assert.deepEqual(next.resources.slice(0,27),c.resources);
 assert(next.parameters.every(p=>p.default_value==null));assert.deepEqual(next.runtimeInput,{});
 const newParameterSources=curbCuringNewParameterSourcesR2();
 assert.deepEqual(Object.keys(newParameterSources).sort(),next.parameters.slice(50).map(p=>p.parameter_id).sort());
 const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:curbCuringParentShaR2,newParameterSources};
 const source=clone(read.antisolNormalPreimage.sourceRows[0]),locator=clone(read.antisolNormalPreimage.locatorRows[0]);
 // This is the historical S2763 rule. Never relabel/recompute the registry row.
 assert.equal(sha(stringifyCanonicalEstimateJson(locator.locator)),locator.excerpt_sha256,'CURB_HISTORICAL_LOCATOR_PAYLOAD_HASH');
 const {created_at:_timestamp,...managed}=source;
 const reuse={contract:'master-existing-normative-registry-reuse/r1' as const,
  locatorExcerptHashKind:'CANONICAL_ESTIMATE_LOCATOR_JSON_SHA256_R1' as const,source,locators:[locator]};
 const binding={rowId:witness.newBindingRows[0] as string,additionalRowIds:[witness.newBindingRows[1] as string],
  applicability:{materialQuantityOnly:true,fullTechnicalAcceptance:false},applicabilityByRowId:witness.applicabilityByRowId,
  retainParentBindings:retained,reuseExistingNormativeRegistry:reuse};
 const config={stopCode:'CURB03_ANTISOL_MATERIAL_RETAINED_R2',catalogId:pack.catalogId,parentReleaseId:read.executionContext.definitionReleaseId,binding};
 const guardInput={config,newSource:managed,newLocators:[locator]};
 const newBindings=witness.newBindingRows.map((row_id:string)=>({row_id,locator_id:locator.id,applicability:witness.applicabilityByRowId[row_id]}));
 const assembled=prepareMasterRetainedBindingRepresentativeR1(guardInput,{parameters:next.parameters,formulas:next.formulas,resources:next.resources,newBindings,
  successorProvenance:{contract,sourceReadSha256:curbCuringCaptureShaR2,retainedCaptureSha256:curbCuringParentShaR2,fullBindingOriginSha256:curbCuringBindingOriginShaR2,
   materialOnly:true,umbrellaNeedRemainsOpen:true,legacyUnknownPriceOrQuantityTransferred:false},lifecycleMetadata:{contract,masterSha256:masterSha}});
 assert.equal(assembled.expectedNormativeBindingCount,23);
 for(const[id,ids]of Object.entries(c.baseline.normative_source_ids))assert.deepEqual(assembled.normativeSourceIds[id],ids,'CURB_OLD50_SOURCE_ARRAYS_EXACT:'+id);
 assert.deepEqual(assembled.bindings.slice(21),newBindings);
 const oldPassport=JSON.parse(read.sets['publisher-passport'].rawRows[0]);
 const map=clone(oldPassport.decision.independentCompletenessMap);
 map.retainedMapOrigin={contract:map.contract,sourceKind:map.sourceKind,evidenceSha256:map.evidenceSha256,evidenceReferences:clone(map.evidenceReferences)};
 map.sourceKind='TECHNOLOGY_MAP';map.evidenceSha256=curbCuringCaptureShaR2;
 map.evidenceReferences=[...map.evidenceReferences,curbCuringCapturePathR2,pack.source.officialUrl,pack.source.path];
 // Independently declared seven roles: two PDS/material rows + five balance
 // controls. Enumerate the source/balance contract, never all emitted rows.
 const materialMap=[
  [pack.materialRows.consumed,'consumed','APPROXIMATE_PDS_AREA_DIVIDED_BY4_9'],
  [pack.materialRows.owner,'order','SINGLE_ORDER_COMPATIBLE_STOCK_RESERVE_19L_QUANTUM'],
  [pack.materialRows.packages,'packages','BALANCE_ORDER_DIVIDED_BY19_NOT_A_SECOND_PAYMENT'],
  [pack.materialRows.remaining,'remaining','BALANCE_REMAINING_NOT_A_SOURCE_NORM'],
  [pack.materialRows.free,'free','BALANCE_FREE_NOT_A_SOURCE_NORM'],
  [pack.materialRows.shortage,'shortage','BALANCE_SHORTAGE_NOT_A_SOURCE_NORM'],
  [pack.materialRows.reserveDeficit,'reserve-deficit','BALANCE_RESERVE_DEFICIT_NOT_A_SOURCE_NORM'],
 ] as const;
 for(const[rowId,formulaSuffix,quantityRule]of materialMap){const row=next.resources.find(r=>r.row_id===rowId)!;assert(row);
  map.entries.push({expectedResourceId:contract+':'+rowId,operationId:'concrete-curing-material',sourceId:source.source_key,
   condition:pack.compatibility.selectedFaceOnly,category:'material',specification:row.title_ru,unitId:row.unit_id,
   quantityRule,quantityQuality:formulaSuffix==='consumed'?'APPROXIMATE_MANUFACTURER_NOMINAL':'DERIVED_BALANCE_CONTROL',
   applicationLabourNormClaimed:false,fullTechnicalAcceptance:false,
   formulaId:'concrete-curing-antisol250w-us:formula:'+formulaSuffix,resolution:{kind:'ROW',rowId}});}
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:next.formulas,resourceDefinitions:next.resources}),[]);
 const verifyCore=async()=>{
  const excerpt=resolveMasterSingleDefinitionLocatorExcerptSha256R1({...config,locator:{key:locator.locator_key,payload:locator.locator},
   sourceMetadata:{source_title:source.title_ru,source_authority:source.authority,exact_locator:locator.locator.facts.locatorRu,use_restriction:source.metadata.useRestriction}});
  assert.equal(excerpt,locator.excerpt_sha256,'CURB_EXISTING_MASTER_RESOLVED_HISTORICAL_EXCERPT');
  const resolved=resolveMasterExistingNormativeRegistryReuseR1({config,newSource:{...managed,metadata:{...managed.metadata,contract}},newLocators:[{...locator,excerpt_sha256:excerpt}]});
  assert(resolved);assertMasterExistingNormativeRegistrySnapshotR1(resolved,{newSources:[source],newLocators:[locator]});
  assert.equal(assembled.expectedNormativeBindingCount,23);assert.equal(oldPassport.decision.unresolvedResourceRowIds.length,6);
  return {status:'PASS_CURB03_FULL_CAPTURE_RETAIN21_ADD2_MATERIAL_CONFIG_PURE_ONLY',parameters:69,formulas:34,resources:34,
   oldBindings:21,newBindings:2,normativeBindings:23,oldSourceArrays:50,newSourceArrays:19,priceBindings:0,staticNeeds:6,
   oldFullRowsExact:true,registryRowsToWrite:0,wholeLaborPer100M:'109',fullTechnicalAcceptance:false,publicationPerformed:false};
 };
 return {read,capture:c,next,source,locator,binding,guardInput,newBindings,assembled,oldPassport,completenessMap:map,verifyCore};
}

/** These two ROOT documents are created AFTER checked shared adoption and the
 * actual trench publication. The templates deliberately contain null IDs. */
export function assertCurbCuringRootDecisionAndParentSealR2(decision:Json,seal:Json):void{
 assert.equal(decision.status,'ROOT_REVIEWED_CURB03_ANTISOL_MATERIAL_REPLACE_RETAIN21_ADD2_R2');
 assert.equal(decision.catalogId,pack.catalogId);assert.equal(decision.captureSha256,curbCuringParentShaR2);assert.equal(decision.captureResultSha256,curbCuringCaptureShaR2);
 assert.equal(decision.fullBindingOriginSha256,curbCuringBindingOriginShaR2);assert.equal(decision.sharedExistingRegistryHistoricalExcerptChecked,true);
 assert.deepEqual(decision.retainedAndNewBindings,[21,2]);assert.equal(decision.oldWholeLaborUnchanged,true);assert.equal(decision.originalSixNeedsRemainOpen,true);
 assert.equal(decision.fullTechnicalAcceptance,false);assert.equal(decision.published,false);assert.equal(decision.newCatalogIds,0);
 assert.equal(seal.status,'ROOT_VERIFIED_POST_MANUAL_TRENCH_CURB03_PARENT_SEAL_R1');assert.deepEqual(seal.predecessorRoadContext,curbCuringRoadContextR2);
 assert.equal(seal.captureResultSha256,curbCuringCaptureShaR2);assert.equal(seal.curbCapturedParentSha256,curbCuringParentShaR2);
 assert.equal(seal.fullBindingOriginSha256,curbCuringBindingOriginShaR2);assert.equal(seal.publisherPayloadSha256,'711eb51058c5160e6a2a017b9c5c52974d9ecbc69f31dea8c5cebf4455aab0ca');
 const x=seal.executionContext;assert(isObject(x));assert.deepEqual(Object.keys(x).sort(),['sourceHead','recordedReleaseSourceCommit','definitionReleaseId','searchReleaseId'].sort());
 assert(/^[a-f0-9]{40}$/.test(x.sourceHead)&&/^[a-f0-9]{40}$/.test(x.recordedReleaseSourceCommit));
 for(const k of ['definitionReleaseId','searchReleaseId'])assert(/^[a-f0-9-]{36}$/.test(x[k])&&x[k]!==curbCuringRoadContextR2[k as 'definitionReleaseId'|'searchReleaseId'],'CURB_REAL_POST_TRENCH_PAIR_REQUIRED');
 assert.equal(seal.manualTrenchApplyCommittedOnce,true);assert.equal(seal.readOnlyComparisonClosed,true);assert.equal(seal.unchangedCurbParentCompared,true);
 assert.equal(seal.pointerCompared,true);assert.equal(seal.allOwnedProcessesClosed,true);assert.equal(seal.automaticRebaseAllowed,false);
 assert.equal(seal.curbAnchor.definitionId,pack.parentDefinitionId);assert.equal(seal.curbAnchor.baselineId,pack.parentBaselineId);
 assert.equal(seal.curbAnchor.definitionSha256,'227427bd1b3cf32a104d4575c05c7b652e7f35021933e68596d74e29784b1475');
 assert.deepEqual(seal.currentManifestAnchor,{release_id:x.definitionReleaseId,catalog_id:pack.catalogId,
  definition_version_id:pack.parentDefinitionId,approved_template_baseline_id:pack.parentBaselineId,definition_hash:seal.curbAnchor.definitionSha256});
 assert(isObject(seal.applyResultPin)&&isObject(seal.closedGuardPin)&&isObject(seal.readbackPin)&&isObject(seal.pointerPin));
}

export function prepareCurbBaseCuringAntisolMasterRetainedR2(input:Readonly<{
 sourceHead:string;sourceTree:string;evidenceSha256:string;rootDecisionPin:CurbCuringRootPinR2;
 parentSealPin:CurbCuringRootPinR2;sharedPublisherPin:CurbCuringRootPinR2;outputRoot?:string;
}>):MasterSingleDefinitionSuccessorConfig{
 assert(/^[a-f0-9]{40}$/.test(input.sourceHead)&&/^[a-f0-9]{40}$/.test(input.sourceTree));assert(/^[a-f0-9]{64}$/.test(input.evidenceSha256));
 const decision=pin(input.rootDecisionPin),seal=pin(input.parentSealPin);assertCurbCuringRootDecisionAndParentSealR2(decision,seal);
 assert.deepEqual(decision.parentSealPin,input.parentSealPin);assert.deepEqual(decision.sharedPublisherPin,input.sharedPublisherPin);
 assert.equal(input.sharedPublisherPin.path,'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts');
 assert.equal(sha(readFileSync(input.sharedPublisherPin.path)),input.sharedPublisherPin.sha256,'CURB_FINAL_CHECKED_SHARED_SOURCE_PIN');
 const applied=pin(seal.applyResultPin);assert.equal(applied.mutationPerformed,true);assert.equal(applied.successor.releaseId,seal.executionContext.definitionReleaseId);assert.equal(applied.successor.searchReleaseId,seal.executionContext.searchReleaseId);
 const closed=pin(seal.closedGuardPin);assert.equal(closed.error,null);assert.deepEqual(closed.cleanupErrors,[]);assert.deepEqual(closed.remainingOwnedProcesses,[]);
 assert.equal(typeof closed.status,'string');assert(closed.status.startsWith('PASS_'));pin(seal.readbackPin);
 const pointer=JSON.parse(readFileSync(seal.pointerPin.path,'utf8'));assert.equal(sha(readFileSync(seal.pointerPin.path)),seal.pointerPin.sha256);assert.equal(pointer.definitionReleaseId,seal.executionContext.definitionReleaseId);assert.equal(pointer.searchReleaseId,seal.executionContext.searchReleaseId);
 const d=prepareCurbBaseCuringAntisolMasterDraftR2(),c=d.capture,s=d.source,l=d.locator,p=d.oldPassport;
 const cfg:MasterSingleDefinitionSuccessorConfig={contract,stopCode:'CURB03_ANTISOL_MATERIAL_RETAINED_R2',applicationName:'curb03-antisol-material-retained-r2',
 expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/MASTER_TZ_GOX_BUILD_PRODUCTION (11).md',masterSha256:masterSha,
 parentReleaseId:seal.executionContext.definitionReleaseId,parentSearchReleaseId:seal.executionContext.searchReleaseId,
 currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',outputRoot:input.outputRoot??'.release-runtime/r568/curb03-antisol-material-retained-r2',
 sourcePaths:['scripts/estimate/r4a13/prepareCurbBaseCuringAntisolMasterRetainedR2.ts',
 'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
 'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','scripts/estimate/r4a13/prepareGraniteKerbCementColumn03AppendR1.ts',
 'scripts/estimate/r4a13/prepareS2763ConcreteCuringAntisolSeries.ts','src/lib/estimate/v4/curbBaseCuringAntisol250wCompletionR1.ts',
 'src/lib/estimate/v4/concreteCuringAntisolMaterialS2763.ts','src/lib/estimate/v4/graniteKerbCementKrer27Column03R1.ts',
 'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
 'src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1.ts','src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1.ts',
 'src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1.ts','src/lib/estimate/estimateDeterministicHash.ts',
 curbCuringCapturePathR2,curbCuringGuardPathR2,curbCuringBindingsPathR2,
 'data/estimate-benchmarks/source-packs/curb-base-curing-antisol250w-completion-r1.json',pack.reusedSourcePack,pack.source.path,
 input.rootDecisionPin.path,input.parentSealPin.path,seal.applyResultPin.path,seal.closedGuardPin.path,seal.readbackPin.path],
 catalogId:pack.catalogId,sourceId:s.source_key,normId:pack.materialNormId,
 sourceMetadata:{source_title:s.title_ru,source_authority:s.authority,source_kind:s.metadata.sourceKind,official_url:s.official_url,
 artifact_sha256:s.artifact_sha256,effective_from:s.effective_from,exact_locator:l.locator.facts.locatorRu,use_restriction:s.metadata.useRestriction},
 parameterDefinitions:d.next.parameters,formulaDefinitions:d.next.formulas,resourceDefinitions:d.next.resources,
 shortInput:{kerb_length_m:100},acceptanceInput:{...graniteKerbCementAcceptanceInputR1(),...curbBaseCuringControlFactsR1('49')},
 runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[50,27,27],benchmarkOrdinal:0,
 validationScenario:'CURB03_100M_UNCHANGED109H_SEPARATE_MEASURED49M2_APPROX10L_ORDER19L_MATERIAL_ONLY',
 passport:{canonicalRuName:c.definition.passport.canonicalRuName,workKey:c.definition.passport.workKey,
 physicalResultRu:p.physical_result_ru,includedScopeRu:[...p.included_scope_ru,'Только отдельная измеренная открытая горизонтальная грань бетона В15: приблизительное количество Antisol-250 W США; один материальный заказ.'],
 excludedScopeRu:[...p.excluded_scope_ru,'Площадь ухода из 100 м борта или 3,9 м³ бетона не выводится. Закрытые, гладкие и будущие адгезионные поверхности не допускаются. Труд нанесения не нормирован.'],
 independentCompletenessMap:d.completenessMap,unresolvedApplicableResourceRowIds:p.decision.unresolvedResourceRowIds},
 applicability:{...c.definition.applicability,curingMaterialCompletionContract:pack.contract,curingMaterialQuantityOnly:true,
 sourceHeadAtPreparation:input.sourceHead,sourceTreeAtPreparation:input.sourceTree,evidenceSha256:input.evidenceSha256,
 currentCaptureSha256:curbCuringCaptureShaR2,parentSealSha256:input.parentSealPin.sha256,oldWholeLaborUnchanged:true,
 independentMeasuredExposedFaceRequired:true,umbrellaCuringNeedRemainsOpen:true,fullTechnicalAcceptance:false},
 binding:d.binding,locator:{key:l.locator_key,payload:l.locator},
 search:{primaryUom:'m',canonicalNameRu:c.definition.passport.canonicalRuName,
 aliases:['гранитный борт1ГП при цементобетонном покрытии','КРЕР27-02-010-03','гранит1ГП бетонное основание3,9м3 на100м',
 'гранитный борт 1ГП при цементобетонном покрытии','Antisol только для отдельно измеренной открытой грани бетона В15'],
 shortScopeRu:'Исходная установка борта и 109 чел.-ч на 100 м сохраняются. Antisol — только условная материальная ветвь для подтверждённой открытой поверхности; шесть потребностей остаются открыты.',
 keyDistinguishingParameters:['kerb_length_m',pack.selectionParameter,'exposed_curing_surface_area_m2',...pack.physicalFacts.map(f=>f.id)],
 clarificationFields:d.next.parameters.filter(q=>q.truth_metadata.visibility_role==='USER_INPUT').map(q=>q.parameter_id),
 includedBoundaries:p.included_scope_ru,excludedBoundaries:p.excluded_scope_ru,extraSearchTermsRu:'гранитный борт 1ГП бетон В15 уход открытая грань Antisol 250W США материальная потребность',
 sourceProvenance:{contract,currentCaptureSha256:curbCuringCaptureShaR2,retainedCaptureSha256:curbCuringParentShaR2,
 registrySourceId:s.id,registryLocatorId:l.id,originalRegistryContract:s.metadata.contract,materialOnly:true,staticNeeds:6,fullTechnicalAcceptance:false}},
 forbiddenAdjacentMatchers:[/professional_.*_set|materials_0[1-6]/iu],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'curb03_antisol_material_retained_r2',
 verifyCore:async()=>({...await d.verifyCore(),actualPostTrenchParentSealed:true,parentSealSha256:input.parentSealPin.sha256,
 sharedPublisherSha256:input.sharedPublisherPin.sha256,sourceHeadAtPreparation:input.sourceHead,publicationPerformed:false})};
 assert.equal(cfg.catalogAppend,undefined);return cfg;
}
