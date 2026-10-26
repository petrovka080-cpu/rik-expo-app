import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {statSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import source from '../../../data/estimate-benchmarks/source-packs/masonry-brick-column-existing-owner-r161.json';
import map from '../../../data/estimate-benchmarks/source-packs/masonry-brick-column-existing-owner-map-r161.json';
import originalMap from '../../../data/estimate-benchmarks/source-packs/masonry-brick-column-six-profile-independent-full-map-r117.json';
import fixture from '../../../data/estimate-benchmarks/fixtures/masonry-brick-column-existing-owner-finite-r161.json';
import priced from '../../../data/estimate-benchmarks/fixtures/masonry-brick-column-known-native-priced-r166.json';
import costMap from '../../../data/estimate-benchmarks/source-packs/masonry-brick-column-known-native-cost-map-r166.json';
import {masonryBrickColumnExistingDefinitionR161 as build,masonryBrickColumnPrimarySelectionR161 as primary,
 COLUMN_CATALOG_R161 as catalogId,COLUMN_LEGACY_R161 as legacy,
 masonryBrickColumnQuantityPreimageR166 as quantityPreimage,COLUMN_NATIVE_PAYMENT_SCOPE_R166 as paymentScope} from '../../../src/lib/estimate/v4/masonryBrickColumnExistingOwnerR161';
import {buildMasonryBrickColumnWholeNormalR117 as whole,masonryBrickColumnWholePackR117 as pack,
 masonryBrickColumnTestConfirmationsR117 as testOnlyConfirmations} from '../../../src/lib/estimate/v4/masonryBrickColumnSixProfileWholeNormalR117';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimatePriceItem} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {assertCanonicalMachineHourDefinitionV1,parseCanonicalMachineHourPriceCoverageV1,resolveCanonicalMachineHourPriceCoverageV1}
 from '../../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {canonicalApprovedBaselineRuntimeParameters} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {resolvePrimaryMeasureSelectionV1} from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {validateCanonicalEstimateParameters,assertCanonicalSubmittedSourceParameterAuthorityV1} from '../../../src/lib/estimate/backendPlatform/parameterConstraints';
import {validateCanonicalEstimateParameterInputs} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateParameterValidation';
import {masterRetainedParentCaptureSha256R1,prepareMasterRetainedBindingRepresentativeR1,
 assertMasterRetainedBindingSnapshotR1,type MasterRetainedBindingSnapshotR1,
 type MasterRetainedParentCaptureR1,type MasterRetainedBindingGuardInputR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {resolveMasterScopedNormativeRegistryOptInR1,type MasterCapturedScopedNormativeRegistryR1} from './masterScopedNormativeRegistryPreimageR1';
import {validateIndependentCompletenessMapReferences,buildMasterPublicationResourceRowsR1,
 resolveMasterSingleDefinitionBindingRowIds,resolveMasterSingleDefinitionBindingApplicabilityByRowId,
 resolveMasterSingleDefinitionLocatorExcerptSha256R1,hashMasterSingleDefinitionSuccessorReceiptR1 as digest,
 type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';

type Json=Record<string,unknown>;
type Capture=MasterRetainedParentCaptureR1&Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>;
type Resource=AutomaticOwnerDefinition['resources'][number];
type CoreResult=Awaited<ReturnType<typeof compileCanonicalEstimateCore>>;
type ColumnReleaseArtifactPinR161=Readonly<{path:string;sha256:string}>;
/** ROOT-only, after a real committed opening publication. These pins name exact
 * evidence staged in the same reviewed source root; they confer no project,
 * stock, source-norm or FULL authority. Publisher still rereads and locks DB. */
export type MasonryColumnSecondReleaseBindingR161=Readonly<{
 contract:'root-masonry-column-after-committed-opening/r1';
 openingReceipt:ColumnReleaseArtifactPinR161;currentPointerSha256:string;
 parentSnapshot:ColumnReleaseArtifactPinR161;scopedRegistry:ColumnReleaseArtifactPinR161;
}>;
export type MasonryBrickColumnExistingContextR161=Readonly<{releaseId:string;searchReleaseId:string;sourceRoot:string;outputRoot:string;
 masterPath:string;masterSha256:string;expectedBranch:string;rootSecondReleaseBindingR161?:MasonryColumnSecondReleaseBindingR161}>;
const volume=pack.measurement.primaryId,height=pack.measurement.heightId,kind=pack.measurement.physicalKindId;
const paths={model:'src/lib/estimate/v4/masonryBrickColumnExistingOwnerR161.ts',config:'scripts/estimate/r4a13/prepareMasonryBrickColumnExistingOwnerR161.ts',
 test:'scripts/estimate/r4a13/masonryBrickColumnExistingOwnerR161.test.ts',pack:'data/estimate-benchmarks/source-packs/masonry-brick-column-existing-owner-r161.json',
 map:'data/estimate-benchmarks/source-packs/masonry-brick-column-existing-owner-map-r161.json',fixture:'data/estimate-benchmarks/fixtures/masonry-brick-column-existing-owner-finite-r161.json',
 capture:'data/estimate-benchmarks/fixtures/masonry-column-current-full-parent-r161.json'};
const record=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const same=(a:unknown,b:unknown)=>assert.deepEqual(stable(a),stable(b));
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
function ownExactColumn(row:Resource):string{
 const metadata=row.source_metadata;assert(record(metadata),'OWN_COLUMN_SOURCE_METADATA_REQUIRED:'+row.row_id);
 const column=metadata.exact_column;assert(typeof column==='string'&&pack.profiles.some(profile=>profile.normId===column),'OWN_COLUMN_EXACT_SOURCE_COLUMN_REQUIRED:'+row.row_id);
 return column;
}
const original=(c:Capture):AutomaticOwnerDefinition=>({parameters:c.parameters,formulas:c.formulas,resources:c.resources,
 runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']});
const nativeOracle:Readonly<Record<string,readonly (readonly string[])[]>>=fixture.nativeOracle;
let entries=0;
export const masonryBrickColumnExistingActualEntriesR161=()=>entries;
function save(name:string,value:unknown){const out=process.env.MASONRY_R161_ACTUAL_OUTPUT;assert(out,'MASONRY_R161_ACTUAL_OUTPUT_REQUIRED');
 mkdirSync(out,{recursive:true});writeFileSync(resolve(out,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
export function masonryBrickColumnExistingCaptureR161(root:string):Capture{
 const path=resolve(root,paths.capture);assert.equal(sha(path),source.parent.fullFile.sha256);
 const packet:{capture:Capture;readOnly:boolean}=JSON.parse(readFileSync(path,'utf8'));assert.equal(packet.readOnly,true);const c=packet.capture;
 assert.equal(c.definition.catalog_id,catalogId);assert.equal(c.definition.id,source.parent.definitionId);
 assert.equal(c.definition.definition_sha256,source.parent.definitionSha256);assert.equal(c.definition.definition_version,3);
 assert.equal(c.baseline.id,source.parent.baselineId);assert.deepEqual(c.baseline.input_values,{q:100});
 assert.deepEqual(c.baseline.input_classification,{q:'ASSUMPTION'});assert.deepEqual(c.normativeSources,[]);assert.deepEqual(c.normativeLocators,[]);
 assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length,c.bindings.length],[1,59,59,0]);
 assert.equal(c.parameters[0]?.parameter_id,'q');assert.equal(c.parameters[0]?.unit_id,'m2');assert.equal(c.parameters[0]?.default_value,100);return c;
}

const currentReleasePathR161='data/estimate-benchmarks/r568-local-developer-canonical-release.json';
type ColumnRegistryConfigR161=Pick<Config,'contract'|'stopCode'|'binding'|'sourceMetadata'|'locator'>;
// Same managed identity construction previously local to the accepted pure
// check; both routes now use it. No source/locator IDs depend on release IDs.
function columnManagedRegistryR161(config:ColumnRegistryConfigR161){
 const uuid=(seed:string)=>{const bytes=Buffer.from(digest(seed).slice(0,32),'hex');bytes[6]=(bytes[6]!&15)|80;bytes[8]=(bytes[8]!&63)|128;const h=bytes.toString('hex');
  return`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
 const id=uuid(`${config.contract}:${pack.sourceId}:source`),lid=uuid(`${config.contract}:${pack.sourceId}:${config.locator.key}:locator`),m=config.sourceMetadata;
 return{newSource:{id,source_key:pack.sourceId,title_ru:m.source_title,authority:m.source_authority,
  official_url:m.official_url??null,artifact_sha256:m.artifact_sha256,effective_from:null,effective_to:null,
  metadata:{contract:config.contract,sourceKind:m.source_kind,useRestriction:m.use_restriction,universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}},
  newLocators:[{id:lid,source_id:id,locator_key:config.locator.key,locator:config.locator.payload,excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}]};
}
function columnReleaseProofR161(context:MasonryBrickColumnExistingContextR161,binding:Config['binding'],
 sourceMetadata:Config['sourceMetadata'],locator:Config['locator']){
 if(!Object.hasOwn(context,'rootSecondReleaseBindingR161'))return undefined;
 const proof=context.rootSecondReleaseBindingR161;
 function check(value:unknown,code:string):asserts value{assert(value,'MASONRY_COLUMN_ROOT_RELEASE_'+code);}
 check(record(proof)&&proof.contract==='root-masonry-column-after-committed-opening/r1','CONTEXT');
 const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
 check(hash(context.masterSha256)&&sha(context.masterPath)===context.masterSha256,'MASTER_BYTES');
 check(hash(proof.currentPointerSha256),'POINTER_SHA_REQUIRED');
 const read=(pin:ColumnReleaseArtifactPinR161):Json=>{
  check(record(pin)&&typeof pin.path==='string'&&/^data\/estimate-benchmarks\/source-artifacts\/masonry-column-second-release-r161\/[a-zA-Z0-9_./-]+\.json$/.test(pin.path)
   &&!pin.path.split('/').some(part=>part==='.'||part==='..')&&hash(pin.sha256),'ARTIFACT_PIN');
  const path=resolve(context.sourceRoot,pin.path);check(statSync(path).size<=4*1024*1024,'ARTIFACT_BYTE_CAP');
  const bytes=readFileSync(path);check(createHash('sha256').update(bytes).digest('hex')===pin.sha256,'ARTIFACT_SHA');
  const value:unknown=JSON.parse(bytes.toString('utf8'));check(record(value),'ARTIFACT_OBJECT');return value;
 };
 check(new Set([proof.openingReceipt?.path,proof.parentSnapshot?.path,proof.scopedRegistry?.path]).size===3,'DISTINCT_ARTIFACTS');
 const receipt=read(proof.openingReceipt),{receiptSha256,...body}=receipt;
 check(hash(receiptSha256)&&digest(body)===receiptSha256,'RECEIPT_SHA');
 check(receipt.schemaVersion==='masonry-glass-opening-existing-owner/r223.receipt.v1'
  &&receipt.status==='GREEN_MASONRY_GLASS_OPENING_EXISTING_R223_PREPARED_NOT_ACTIVE'
  &&receipt.mutationPerformed===true&&receipt.idempotent===false,'COMMITTED_OPENING_RECEIPT');
 check(['productionAccessed','deployPerformed','activationPerformed','releasePerformed','otaPerformed'].every(key=>receipt[key]===false),'LOCAL_INACTIVE_ONLY');
 const predecessor=receipt.predecessor,successor=receipt.successor,audit=receipt.audit,origin=receipt.source,master=receipt.master;
 check(record(predecessor)&&record(successor)&&record(audit)&&record(origin)&&record(master),'RECEIPT_SHAPE');
 const opening='canonical-work:base:masonry_interior_opening_lay_standard';
 check(predecessor.releaseId===fixture.releaseId&&predecessor.searchReleaseId===fixture.searchReleaseId&&predecessor.catalogId===opening,'FIRST_PREDECESSOR');
 check(successor.releaseId===context.releaseId&&successor.searchReleaseId===context.searchReleaseId
  &&context.releaseId!==fixture.releaseId&&context.searchReleaseId!==fixture.searchReleaseId,'ACTUAL_SUCCESSOR_PAIR');
 check(master.sha256===context.masterSha256&&origin.branch===context.expectedBranch&&hash(origin.fingerprint)
  &&Array.isArray(origin.sourceHashes)&&origin.sourceHashes.length>0,'SOURCE_COHORT');
 check(record(audit.release)&&record(audit.manifest)&&record(audit.search)&&record(audit.target)
  &&audit.unrelatedManifestChanges===0&&audit.release.id===context.releaseId&&audit.release.status==='prepared'
  &&audit.release.activated_at===null&&audit.search.release_status==='draft'&&audit.search.definition_release_id===context.releaseId
  &&audit.target.catalog_id===opening&&audit.target.definition_version_id===successor.definitionId
  &&audit.search.catalog_id===opening&&audit.search.definition_version_id===successor.definitionId
  &&hash(audit.manifest.snapshot)&&hash(audit.search.snapshot_sha256),'OPENING_AUDIT');
 // This is the live canonical pointer read from the publisher cwd, not a
 // captured pointer copied into sourceRoot. DB lifecycle is rechecked by it.
 const pointerBytes=readFileSync(resolve(currentReleasePathR161));
 check(createHash('sha256').update(pointerBytes).digest('hex')===proof.currentPointerSha256,'CURRENT_POINTER_SHA');
 const pointer:unknown=JSON.parse(pointerBytes.toString('utf8'));
 check(record(pointer)&&pointer.productionAccessed===false&&pointer.definitionReleaseId===context.releaseId
  &&pointer.searchReleaseId===context.searchReleaseId&&pointer.definitionReleaseStatus==='prepared'&&pointer.searchReleaseStatus==='draft'
  &&pointer.definitionSnapshotSha256===audit.manifest.snapshot&&pointer.manifestHashChainSha256===audit.manifest.snapshot
  &&pointer.searchHashChainSha256===audit.search.snapshot_sha256,'CURRENT_POINTER_RECEIPT');
 const snapshot=read(proof.parentSnapshot),scoped=read(proof.scopedRegistry) as unknown as MasterCapturedScopedNormativeRegistryR1;
 const guardConfig={contract:source.contract,stopCode:'MASONRY_COLUMN_EXISTING_R161',catalogId,parentReleaseId:context.releaseId,
  normId:pack.profiles.map(profile=>profile.normId).join('|'),sourceMetadata,locator,binding,capturedScopedNormativeRegistry:scoped};
 const input={config:guardConfig,...columnManagedRegistryR161(guardConfig)};
 // R70 checks actual current membership and every unchanged column in all
 // eight tables, including the historical definition.release_id. No mutation.
 assertMasterRetainedBindingSnapshotR1(input,snapshot as unknown as MasterRetainedBindingSnapshotR1);
 const scope=resolveMasterScopedNormativeRegistryOptInR1(input);check(scope,'SCOPED_REGISTRY');
 const openingSource=scope.declaration.sourceRows.find(row=>row.sourceKey==='source:masonry:glass-block:r103:opening-fill');
 check(openingSource&&scope.declaration.locatorRows.some(row=>row.sourceId===openingSource.id
  &&row.locatorKey==='kg-krer08-04-002-glass-opening-existing-r223'),'FRESH_SCOPE_MUST_RETAIN_OPENING');
 return{scoped:scope.declaration,sourcePaths:[proof.openingReceipt.path,proof.parentSnapshot.path,proof.scopedRegistry.path,
  'scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts'],marker:{contract:proof.contract,receiptSha256,
   currentPointerSha256:proof.currentPointerSha256,openingReceipt:proof.openingReceipt,parentSnapshot:proof.parentSnapshot,
   scopedRegistry:proof.scopedRegistry,parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId}};
}
/** Direct ordinary retained Config. No historical APPEND constructor/callback,
 * public identity creation, new producer, m2->m3 conversion or project default.
 * ROOT supplies the final current MASTER/branch after API integration; source-cut
 * and current consumer bytes remain pending until that governed materialization. */
export function masonryBrickColumnExistingConfigR161(context:MasonryBrickColumnExistingContextR161):Config{
 if(!Object.hasOwn(context,'rootSecondReleaseBindingR161')){
  assert.equal(context.releaseId,fixture.releaseId);assert.equal(context.searchReleaseId,fixture.searchReleaseId);
 }
 assert(/^[a-f0-9]{64}$/.test(context.masterSha256));assert.equal(sha(context.masterPath),context.masterSha256);assert(context.expectedBranch);
 for(const pin of [pack.immutableOriginal03Pack,pack.immutableAccepted03_04WholePack,pack.immutableAccepted03_04IndependentMap,
  pack.immutableR116OwnFourProfileRoster,pack.immutableR116OwnFourProfileStageMap,pack.source])assert.equal(sha(resolve(context.sourceRoot,pin.path)),pin.sha256,pin.path);
 const c=masonryBrickColumnExistingCaptureR161(context.sourceRoot),d=build(original(c)),child=whole();
 const known=[...child.nativeSourceRowIds,...child.includedSourceRowIds];
 const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c),
  capturedSourcePreimage:{sourceKey:pack.sourceId,expected:null},
  legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:String(c.definition.source_metadata.templateId),
   parameterSources:structuredClone(c.baseline.normative_source_ids)},
  newParameterSources:Object.fromEntries(d.parameters.filter(p=>p.parameter_id!=='q').map(p=>[p.parameter_id,
   p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[pack.sourceId]}]))};
 const sourceMetadata:Config['sourceMetadata']={source_title:'Кладка кирпичных столбов: собственные исходные колонки01–06',source_authority:'Госстрой Кыргызской Республики',
   official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,source_kind:'SAME_EXISTING_COLUMN_SIX_EXACT_WHOLE_PROFILES_KNOWN_NATIVE_COST_PARTIAL',
   exact_locator:pack.source.locatorRu,use_restriction:'Только исходные керамические250×120×65М100 и готовый цементно-известковыйМ50; собственный m3обмер. Источник не утверждает проект, доступ, stock, снабжение или FULL. Собственная стоимость native требует нового payment-scope; закупка удержана.'};
 const locator:Config['locator']={key:'kg08-column-six-existing-r161',payload:{contract:source.contract,wholeSource:pack,independentCompletenessMap:map,
   currentParentSha256:source.parent.fullFile.sha256,actualProjectProducer:'UNRUN',fullTechnicalAcceptance:false}};
 const binding:Config['binding']={rowId:known[0]!,additionalRowIds:known.slice(1),applicability:{exactColumns:pack.profiles.map(p=>p.normId),fullTechnicalAcceptance:false},
   applicabilityByRowId:Object.fromEntries(known.map(rowId=>{const row=d.resources.find(r=>r.row_id===rowId);assert(row);return[rowId,
    {exact_column:ownExactColumn(row),source_artifact_sha256:pack.source.sha256,noNeighborNormTransfer:true,fullTechnicalAcceptance:false}];})),retainParentBindings:retained};
 const releaseBinding=columnReleaseProofR161(context,binding,sourceMetadata,locator);
 const included=['Одна существующая карточка столба и три вида по форме/армированию; высота автоматически выбирает одну из шести исходных колонок.',
  'Цельный труд выбранной колонки один раз; армирование01/02/05/06 включено в свою норму, без второй оплаты08-02-007.',
  'Собственные native материалы/машины и включённые операции сохраняют IDs и единичных владельцев; UNKNOWN не становятся закупкой.'];
 const config:Config={contract:source.contract,stopCode:'MASONRY_COLUMN_EXISTING_R161',applicationName:'masonry-column-existing-r161',
  expectedBranch:context.expectedBranch,masterPath:context.masterPath,masterSha256:context.masterSha256,
  parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
  ...(releaseBinding?{capturedScopedNormativeRegistry:releaseBinding.scoped,
   verifyTargetPrecondition:async()=>{columnReleaseProofR161(context,binding,sourceMetadata,locator);}}:{}),
  outputRoot:context.outputRoot,catalogId,sourceId:pack.sourceId,normId:pack.profiles.map(p=>p.normId).join('|'),
  sourcePaths:[...new Set([...Object.values(paths),...(releaseBinding?.sourcePaths??[]),'src/lib/estimate/v4/masonryBrickColumnSixProfileWholeNormalR117.ts',
   'src/lib/estimate/v4/masonryBrickRectangularColumnWholeNormalR109.ts','data/estimate-benchmarks/source-packs/masonry-brick-column-six-profile-whole-r117.json',
   'data/estimate-benchmarks/source-packs/masonry-brick-column-six-profile-normal-route-r117.json','data/estimate-benchmarks/source-packs/masonry-brick-column-six-profile-independent-full-map-r117.json',
   'data/estimate-benchmarks/source-packs/masonry-brick-column-normal-route-r109.json',pack.immutableOriginal03Pack.path,pack.source.path,
   pack.immutableAccepted03_04WholePack.path,pack.immutableAccepted03_04IndependentMap.path,pack.immutableR116OwnFourProfileRoster.path,pack.immutableR116OwnFourProfileStageMap.path,
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts','src/lib/estimate/estimateDeterministicHash.ts',
   'src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
   'src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts','src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimateParameterValidation.ts','src/features/consumerRepair/consumerCanonicalBaselineCompile.ts',
   'src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts','src/lib/estimate/backendPlatform/parameterConstraints.ts',
   'data/estimate-benchmarks/fixtures/masonry-brick-column-known-native-priced-r166.json',
   'data/estimate-benchmarks/source-packs/masonry-brick-column-known-native-cost-map-r166.json',
   'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts'])],
  sourceMetadata,
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
  shortInput:{q:100,[kind]:legacy},acceptanceInput:{q:100,[kind]:legacy},runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  expectedParentShape:[1,59,59],benchmarkOrdinal:0,validationScenario:'EXISTING_COLUMN_KNOWN_NATIVE_COST_ONE_TEST_ONLY_PRICED_CASE_QUANTITY19_SOURCE_REUSE',
  passport:{canonicalRuName:'Кладка столба',workKey:'masonry_interior_column_lay_standard',
   physicalResultRu:'Сохранённый состав кладочного столба либо собственный кирпичный столб выбранной формы/армирования по независимому объёму.',
   includedScopeRu:included,excludedScopeRu:pack.remaining,independentCompletenessMap:map,unresolvedApplicableResourceRowIds:[...child.unknownNeedRowIds]},
  applicability:{...(releaseBinding?{rootCommittedOpeningReleaseBindingR161:releaseBinding.marker}:{}),legacyApplicability:structuredClone(c.definition.applicability),primaryMeasureSelectionV1:primary(),
   exactColumns:pack.profiles.map(p=>p.normId),oldAndOwnRowsMutuallyExclusive:true,newPublicCatalogIds:0,sourceProfileChoiceIsNotProjectApproval:true,
   knownNativeCostRouteV1:{status:'ROOT_EXACT_MACHINE_ADMISSION_REQUIRED',native:44,included:6,paidNative:38,operatorInformation:6,
    materialProcurement:'HOLD_SUPPLY_STOCK',machineProcurement:'HOLD_PROVISION_MODE',paymentScope,realProjectDocuments:0},
   ordinaryTechnicalReadbackProducer:'UNRUN_ROOT_R144',technicalFieldsUnion:33,technicalFieldsPerSelectedPhysicalKind:11,realProjectObjects:0,fullTechnicalAcceptance:false},
  binding,
  locator,
  search:{primaryUom:'m2',canonicalNameRu:'Кладка столба',aliases:['Кладка столба'],
   shortScopeRu:'Существующая карточка: прежний m2состав либо кирпичный столб с собственной m3primary без конверсии.',
   keyDistinguishingParameters:[kind],clarificationFields:[kind],includedBoundaries:included,excludedBoundaries:pack.remaining,
   extraSearchTermsRu:'кладка кирпичный столб прямоугольный круглый армирование',
   sourceProvenance:{existingCatalogId:catalogId,sourceId:pack.sourceId,actualProjectProducer:'UNRUN',normalLockedRequired:true,newPublicCatalogIds:0}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR_MASONRY',receiptFileStem:'masonry_column_existing_r161',
  verifyCore:()=>verifyMasonryBrickColumnExistingR161(config,context.sourceRoot)};
 assert.equal(config.catalogAppend,undefined);return config;
}


export function masonryBrickColumnExistingPureR161(config:Config,root:string){
 const c=masonryBrickColumnExistingCaptureR161(root),child=whole(),d=build(original(c)),quantityBefore=quantityPreimage(original(c));
 assert.equal(config.catalogAppend,undefined);assert.equal(config.catalogId,catalogId);assert.equal(config.sourceId,pack.sourceId);
 assert.equal(config.applicability.sourceProfileSelectionV1,undefined,'NO_SECOND_PRODUCER');
 assert.deepEqual(config.expectedParentShape,[1,59,59]);assert.deepEqual(config.runtimeProfileInput,{});
 assert.deepEqual(config.runtimeProfileClassification,{});assert.deepEqual(config.runtimeProfileSourceIds,{});
 same(config.parameterDefinitions,d.parameters);same(config.formulaDefinitions,d.formulas);same(config.resourceDefinitions,d.resources);
 assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length],[105,177,177]);assert(d.parameters.every(p=>p.default_value===null));
 const visible=d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id);
 assert.equal(new Set(visible).size,4);assert.deepEqual([...visible].sort(),['q',volume,height,kind].sort());
 for(const before of c.formulas)same(d.formulas.find(f=>f.formula_id===before.formula_id),before);
 const protectedBody=(row:Resource)=>{const {ordinal:_ordinal,inclusion_ast:_scope,row_sha256:_sha,...rest}=row;return rest;};
 for(const before of c.resources){const after=d.resources.find(r=>r.row_id===before.row_id);assert(after);same(protectedBody(after),protectedBody(before));
  same(after.inclusion_ast,{kind:'and',operands:[{kind:'equals',parameterId:kind,value:legacy},before.inclusion_ast]});}
 const ownScope={kind:'or',operands:pack.measurement.physicalKindChoicesRu.map(value=>({kind:'equals',parameterId:kind,value}))};
 for(const before of child.formulas)same(d.formulas.find(f=>f.formula_id===before.formula_id),before);
 for(const before of child.resources){const after=quantityBefore.resources.find(r=>r.row_id===before.row_id);assert(after);same(protectedBody(after),protectedBody(before));
  same(after.inclusion_ast,{kind:'and',operands:[ownScope,before.inclusion_ast]});}
 assert.deepEqual([child.nativeSourceRowIds.length,child.includedSourceRowIds.length,child.unknownNeedParameterIds.length,child.technicalReadbackParameterIds.length],[44,6,68,33]);
 same(map.entries,originalMap.entries);assert.equal(map.entries.length,118);
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
 const retained=config.binding.retainParentBindings;assert(retained);assert.equal(retained.capturedParentSha256,masterRetainedParentCaptureSha256R1(c));
 assert.deepEqual(retained.capturedSourcePreimage,{sourceKey:pack.sourceId,expected:null});
 assert(retained.newParameterSources);for(const parameter of child.parameters){const expected=child.unknownNeedParameterIds.includes(parameter.parameter_id)
  ?{kind:'UNRESOLVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[pack.sourceId]};same(retained.newParameterSources[parameter.parameter_id],expected);}
 for(const id of child.technicalReadbackParameterIds){const before=child.parameters.find(p=>p.parameter_id===id),after=d.parameters.find(p=>p.parameter_id===id);assert(before&&after);
  assert.equal(after.truth_metadata.value_source_role,'PROJECT_DOCUMENTATION');assert.equal(after.truth_metadata.visibility_role,'INTERNAL_ONLY');
  assert(record(after.truth_metadata.provenance));assert.equal(after.truth_metadata.provenance.consumer_input_role_v1,'APPLICATION_TECHNICAL');
  assert.equal(after.truth_metadata.provenance.source_readback_only_v1,true);if(id.endsWith('_payment'))same(after.constraints_json,{...before.constraints_json,values:[paymentScope]});
  else same(after.constraints_json,before.constraints_json);
  same(after.truth_metadata.provenance,before.truth_metadata.provenance);}
 for(const profile of pack.profiles){
  assert.equal(profile.technicalFactIds.length,11);assert.equal(profile.openNeeds.length,profile.sourceNeedsCount);
  assert.equal(new Set(profile.technicalFactIds).size,11);const marker=d.resources.find(r=>r.row_id===profile.prefix+':'+profile.includedOperation.id);assert(marker);
  assert.equal(marker.cost_owner_id,profile.paidWholeOwnerId);assert.equal(marker.resource_graph.parentCostOwnerId,profile.paidWholeOwnerId);
  assert(!d.resources.some(r=>r.row_id.startsWith(profile.prefix+':')&&ownExactColumn(r).startsWith('08-02-007')));
 }
 const branches=(id:string)=>{const p=d.parameters.find(p=>p.parameter_id===id);assert(p);const value=p.truth_metadata.resource_branch_consumers;
  assert(Array.isArray(value));return new Set(value);};
 for(const id of [volume,height,kind])for(const row of child.resources)assert(branches(id).has(row.row_id),'WHOLE_DOWNSTREAM_CONSUMER:'+id+':'+row.row_id);
 const schema=d.parameters.map(p=>({parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,
  visibilityRole:typeof p.truth_metadata.visibility_role==='string'?p.truth_metadata.visibility_role:undefined,
  constraints:p.constraints_json??{},formulaConsumers:Array.isArray(p.truth_metadata.formula_consumers)?p.truth_metadata.formula_consumers:[]}));
 for(const input of [{},{q:100}]){const resolved=resolvePrimaryMeasureSelectionV1({selectionMetadata:primary(),parameterSchema:schema,submittedParameters:input});
  assert.equal(resolved.kind,'CLARIFICATION_REQUIRED');if(resolved.kind==='CLARIFICATION_REQUIRED')assert.equal(resolved.reason,'SELECTION_REQUIRED');}
 const ownInput={[kind]:pack.measurement.physicalKindChoicesRu[0],[volume]:'1.25',[height]:'4'};
 const current=resolvePrimaryMeasureSelectionV1({selectionMetadata:primary(),parameterSchema:schema,submittedParameters:ownInput});
 assert.equal(current.kind,'RESOLVED');if(current.kind==='RESOLVED')assert.deepEqual(current.primaryMeasure,{parameterId:volume,unitId:'m3'});
 const moved=resolvePrimaryMeasureSelectionV1({selectionMetadata:primary(),parameterSchema:schema,submittedParameters:ownInput,parentPrimaryMeasure:{parameterId:'q',unitId:'m2'}});
 assert.equal(moved.kind,'NEW_ROOT_REQUIRED');if(moved.kind==='NEW_ROOT_REQUIRED')assert.deepEqual(moved.carryForward,{parameters:false,rowOverrides:false,prices:false});
 const confirmed=canonicalApprovedBaselineRuntimeParameters(c.baseline,{parameterDefinitions:d.parameters,inputParameters:ownInput});assert.deepEqual(confirmed,{});
 assert.deepEqual(canonicalApprovedBaselineRuntimeParameters(c.baseline,{parameterDefinitions:d.parameters,inputParameters:{[kind]:legacy}}),{q:100});
 assert.deepEqual(canonicalApprovedBaselineRuntimeParameters(c.baseline,{parameterDefinitions:d.parameters,inputParameters:{}}),{});
 assert.deepEqual(c.baseline.input_values,{q:100});assert.deepEqual(c.baseline.input_classification,{q:'ASSUMPTION'});
 const both={...ownInput,q:100};assert.throws(()=>validateCanonicalEstimateParameters(d.parameters,both,{confirmedParameters:confirmed}),
  {code:'PARAMETER_VALIDATION_FAILED',message:'parameter q is forbidden by cross-field rule'});
 const missingVolume={[kind]:pack.measurement.physicalKindChoicesRu[0],[height]:'4'};
 const partial=validateCanonicalEstimateParameters(d.parameters,missingVolume,{confirmedParameters:{}});
 assert.equal(partial[volume],undefined);assert.equal(partial.q,undefined);
 const editorSchema:Parameters<typeof validateCanonicalEstimateParameterInputs>[0]['schema']=d.parameters.filter(p=>d.ordinaryParameterIds.includes(p.parameter_id)).map(p=>{
  const valueType=p.value_type,role=p.truth_metadata.value_source_role;assert(valueType==='decimal'||valueType==='enum');assert(role==='USER_INPUT'||role==='VISIBLE_BASELINE_ASSUMPTION');
  return{parameterId:p.parameter_id,ordinal:p.ordinal,titleRu:p.title_ru,valueType,unitId:p.unit_id,required:p.required,defaultValue:p.default_value,
   constraints:p.constraints_json??{},valueSourceRole:role};});
 const editor=validateCanonicalEstimateParameterInputs({schema:editorSchema,rawInputs:missingVolume});
 const volumeIssue=editor.issues.find(x=>x.parameterId===volume&&(x.code==='REQUIRED'||x.code==='REQUIRED_WHEN'));assert(volumeIssue);
 const input:MasterRetainedBindingGuardInputR1={config,...columnManagedRegistryR161(config)},lid=String(input.newLocators[0]!.id);
 const resources=buildMasterPublicationResourceRowsR1(config.resourceDefinitions),oldFormulas=new Set(c.formulas.map(f=>f.formula_id));
 const formulas=config.formulaDefinitions.map(f=>({...f,ast_sha256:oldFormulas.has(f.formula_id)?f.ast_sha256:digest(f.ast)}));
 const applicable=resolveMasterSingleDefinitionBindingApplicabilityByRowId(config,resources,[lid]);
 const bindingIds=resolveMasterSingleDefinitionBindingRowIds(config,resources,[lid]);
 assert.deepEqual([...bindingIds].sort(),[...child.nativeSourceRowIds,...child.includedSourceRowIds].sort());
 const bindings=bindingIds.map(row_id=>({row_id,locator_id:lid,applicability:applicable[row_id]}));
 const fingerprint=digest({purpose:'PURE_RETAINED_EXISTING_COLUMN_NOT_DB_LOCKED_OR_PUBLICATION',capture:retained.capturedParentSha256,
  sources:config.sourcePaths.map(path=>({path,sha256:sha(resolve(root,path))})),source:input.newSource,locators:input.newLocators});
 const prepared=prepareMasterRetainedBindingRepresentativeR1(input,{parameters:config.parameterDefinitions,formulas,resources,newBindings:bindings,
  successorProvenance:{contract:config.contract,sourceId:pack.sourceId,normId:config.normId,parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,
   capturedParentSha256:retained.capturedParentSha256,sourceFingerprint:fingerprint},
  lifecycleMetadata:{contract:config.contract,masterSha256:config.masterSha256,sourceFingerprint:fingerprint}});
 assert.equal(prepared.expectedNormativeBindingCount,50);same(prepared.normativeSourceIds.q,c.baseline.normative_source_ids.q);
 return{scope:'PURE_EXISTING_COLUMN_RETAINED_NORMAL_REPRESENTATIVE_NOT_DB_OR_LOCKED',bindings:50,legacyRows:59,ownRows:118,native:44,included:6,
  sourceUnknownUnion:68,technicalFieldsUnion:33,technicalFieldsActive:11,geometryPrimary:'m3',legacyPrimary:'m2',newRootNoCarryforward:true,
  primaryEditorIssue:{code:volumeIssue.code,parameterId:volumeIssue.parameterId},actualProjectObjects:0,closedNeeds:0,ui:'UNRUN',full:false};
}




function pricedTestConfirmations(normId:string):Json{
 const confirmed:Json={...testOnlyConfirmations(normId)};
 const profile=pack.profiles.find(p=>p.normId===normId);assert(profile);
 const ids=profile.technicalFactIds.filter(id=>id.endsWith('_payment'));assert.equal(ids.length,1);
 for(const id of ids)confirmed[id]=paymentScope;
 return confirmed;
}
function nativeCostPure(config:Config,root:string){
 const c=masonryBrickColumnExistingCaptureR161(root),before=quantityPreimage(original(c)),after=build(original(c));
 same(after.formulas,before.formulas);same(after.ordinaryParameterIds,before.ordinaryParameterIds);
 assert.equal(costMap.native.length,44);assert.equal(costMap.included.length,6);assert.equal(costMap.paymentScopes.length,3);
 const plans=new Map<string,typeof costMap.native[number]>();for(const row of costMap.native)plans.set(row.rowId,row);assert.equal(plans.size,44);
 let changed=0,machines=0,materials=0,operators=0;
 for(const old of before.resources){
  const next=after.resources.find(row=>row.row_id===old.row_id);assert(next);
  const plan=plans.get(old.row_id);
  if(!plan){same(next,old);continue;}
  const metadata=old.source_metadata;assert(record(metadata));
  assert.equal(metadata.exact_column,plan.column);assert.equal(metadata.source_artifact_sha256,plan.artifactSha256);
  assert.equal(old.resource_graph.costTreatment,plan.beforeCost);assert.equal(next.resource_graph.costTreatment,plan.afterCost);
  assert.equal(next.cost_owner_id,plan.costOwnerId);assert.equal(next.unit_id,plan.unitId);assert.equal(next.procurement_eligible,false);
  assert.equal(plan.artifactSha256,pack.source.sha256);assert.equal(plan.sourceId,pack.sourceId);
  const machine=plan.role==='MACHINE';
  const expected={...old,resource_graph:{...old.resource_graph,costTreatment:plan.afterCost},procurement_eligible:false,
   source_metadata:{...metadata,...(machine?{normativeResourceCode:plan.resourceCode,machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',machinePriceOperationScope:'FULL_SOURCE_OPERATION'}:{})}};
  const body=(row:Resource)=>{const{row_sha256:_hash,...rest}=row;return rest;};same(body(next),body(expected));
  if(plan.afterCost!==plan.beforeCost)changed++;else same(next,old);
  if(plan.role==='MATERIAL')materials++;
  if(plan.role==='OPERATOR_INFORMATION'){operators++;assert.equal(next.resource_graph.costTreatment,'INFORMATIONAL_SCOPE');}
  if(machine){
   machines++;const actual=assertCanonicalMachineHourDefinitionV1({catalogId,rowId:next.row_id,unitId:next.unit_id,sourceMetadata:next.source_metadata});
   assert(actual,'ROOT_EXACT_COLUMN_MACHINE_ADMISSION_REQUIRED:'+next.row_id);
   same(actual,{resourceCode:plan.resourceCode,operator:plan.resourceCode==='40-0001'?'DRIVER':'OPERATOR',operationScope:'FULL_SOURCE_OPERATION'});
   assert.equal(assertCanonicalMachineHourDefinitionV1({catalogId:'not-the-existing-column',rowId:next.row_id,unitId:next.unit_id,sourceMetadata:next.source_metadata}),null);
   assert.equal(assertCanonicalMachineHourDefinitionV1({catalogId,rowId:next.row_id,unitId:'man_hour',sourceMetadata:next.source_metadata}),null);
   for(const mutation of [{normativeResourceCode:'99-9999'},{exact_column:'08-02-001-07'},{source_artifact_sha256:'0'.repeat(64)},{machinePriceOperationScope:'MACHINE_ONLY_WORKER_AND_COMPRESSED_AIR_SEPARATE'}])
    assert.throws(()=>assertCanonicalMachineHourDefinitionV1({catalogId,rowId:next.row_id,unitId:next.unit_id,sourceMetadata:{...next.source_metadata,...mutation}}),{code:'DEFINITION_INTEGRITY_FAILED'});
  }
 }
 assert.deepEqual([changed,machines,materials,operators],[32,10,22,6]);
 for(const marker of costMap.included){const next=after.resources.find(row=>row.row_id===marker.rowId);assert(next);
  assert.equal(next.resource_graph.costTreatment,'INCLUDED_IN_RESOURCE_ROWS');assert.equal(next.cost_owner_id,marker.costOwnerId);assert.equal(next.procurement_eligible,false);}
 for(const old of before.parameters){const next=after.parameters.find(parameter=>parameter.parameter_id===old.parameter_id);assert(next);
  const scope=costMap.paymentScopes.find(scope=>scope.parameterId===old.parameter_id);
  if(!scope){same(next,old);continue;}
  assert.equal(next.truth_metadata.value_source_role,'PROJECT_DOCUMENTATION');assert.equal(next.truth_metadata.visibility_role,'INTERNAL_ONLY');
  assert(record(next.truth_metadata.provenance));assert.equal(next.truth_metadata.provenance.consumer_input_role_v1,'APPLICATION_TECHNICAL');
  assert.equal(next.default_value,null);assert.equal(next.truth_metadata.source_confirmation_required,true);
  assert(record(old.constraints_json),'EXACT_OLD_PAYMENT_CONSTRAINTS_RECORD');
  same(old.constraints_json.values,scope.beforeValues);
  same(next,{...old,constraints_json:{...old.constraints_json,values:[paymentScope]}});same(scope.afterValues,[paymentScope]);
  assert.throws(()=>assertCanonicalSubmittedSourceParameterAuthorityV1(after.parameters,{[scope.parameterId]:paymentScope}),
   {code:'PARAMETER_VALIDATION_FAILED',message:'source-managed parameter cannot be submitted '+scope.parameterId});
 }
 assert.equal(after.parameters.filter(parameter=>parameter.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM').length,68);
 assert.deepEqual(config.runtimeProfileInput,{});assert.deepEqual(config.runtimeProfileClassification,{});assert.deepEqual(config.runtimeProfileSourceIds,{});
 assert(costMap.native.every(plan=>after.resources.some(row=>row.row_id===plan.rowId&&!row.procurement_eligible)),
  'NO_OWN_NATIVE_SUPPLY_STOCK_OR_MACHINE_PROVISION_ADMISSION');
 return{native:44,included:6,changedKnownCost:32,paidNative:38,informationalOperators:6,materialOwners:22,machineOwners:10,
  paymentScopeChanges:3,technicalFields:33,unknownUnion:68,quantityFormulaUnitAndScopePreimageEqual:true,procurement:'HOLD',actualDocuments:0,full:false};
}

/** One new priced case only. The former19-call quantitative proof is linked
 * evidence, not replayed or relabelled as a fresh priced/production acceptance. */
export async function verifyMasonryBrickColumnExistingR161(config:Config,root:string):Promise<Json>{
 assert.equal(entries,0,'ONE_DEPENDENT_PRICED_CALLBACK_ONLY');
 const normal=masonryBrickColumnExistingPureR161(config,root),cost=nativeCostPure(config,root);
 save('PURE_BEFORE_ONE_PRICED_CORE_R166',{normal,cost,scope:'PURE_NOT_DB_OR_LOCKED',originalQuantity19:'SOURCE_LEVEL_REUSE_ONLY'});
 const c=masonryBrickColumnExistingCaptureR161(root),d=build(original(c));
 const profile=pack.profiles.find(profile=>profile.normId===priced.normId);assert(profile);
 const input:Json={[kind]:profile.physicalChoiceRu,[volume]:priced.volume,[height]:priced.height};
 const confirmed=pricedTestConfirmations(profile.normId);
 const unitPrices:Readonly<Record<string,string>>=priced.unitPrices,amounts:Readonly<Record<string,string>>=priced.expectedAmounts;
 const prices:CanonicalEstimatePriceItem[]=profile.rows.filter(row=>Object.hasOwn(unitPrices,row.id)).map(row=>{
  const priceKey=profile.prefix+':'+row.id,unitPrice=unitPrices[row.id];assert(unitPrice);
  const item:CanonicalEstimatePriceItem={price_key:priceKey,unit_id:row.unitId,currency_code:'KGS',unit_price:unitPrice,snapshot_id:priced.snapshotId};
  if(row.category==='equipment'){
   const evidence=parseCanonicalMachineHourPriceCoverageV1({contractVersion:'canonical-machine-hour-price-coverage/v1',resourceCode:row.resourceCode,
    unitId:'machine_hour',currencyCode:'KGS',unitPrice,billingBasis:'MACHINE_HOUR',operationScope:'FULL_SOURCE_OPERATION',minimumBillableHours:'0',fixedFees:'0',
    separateNormedInputs:'EXCLUDED_FROM_RATE',source:{kind:'SNAPSHOT',snapshotId:priced.snapshotId,priceKey}});assert(evidence);
   item.machine_hour_price_coverage_v1=evidence;
   const decision=resolveCanonicalMachineHourPriceCoverageV1({catalogId,rowId:priceKey,unitId:row.unitId,currencyCode:'KGS',unitPrice,evidence,manual:false,snapshotId:priced.snapshotId,priceKey});
   assert.equal(decision?.status,'CONFIRMED_SOURCE');
  }
  return item;
 });
 assert.equal(prices.length,7);assert.equal(prices.filter(price=>price.unit_id==='machine_hour').length,2);
 entries++;process.stdout.write('MASONRY_R166_ACTUAL_PRICED_CORE_ENTRY='+entries+';case=TEST_ONLY_KNOWN_NATIVE_08_02_003_01\n');
 let result:CoreResult;
 try{
  result=await compileCanonicalEstimateCore({operation:'compile',compilerVersion:source.contract,catalogId,primaryMeasureParameterId:volume,
   parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:input,
   confirmedParameters:confirmed,currencyCode:'KGS',priceItems:prices,priceSnapshotIds:[priced.snapshotId],maximumResourceRows:d.resources.length,hashJson:digest});
  save('CORE_OUTCOME_01',{case:'TEST_ONLY_KNOWN_NATIVE_08_02_003_01',kind:'RESULT',actualProjectDocuments:0,prices,submittedParameters:input,confirmedParameters:confirmed,result});
 }catch(error:unknown){save('CORE_OUTCOME_01',{case:'TEST_ONLY_KNOWN_NATIVE_08_02_003_01',kind:'REJECT',code:record(error)?error.code:null,message:error instanceof Error?error.message:String(error)});throw error;}
 const oracle=nativeOracle[priced.normId];assert(oracle);assert.equal(result.rows.length,9);
 for(const [id,quantity,unit]of oracle){const row:CoreResult['rows'][number]|undefined=result.rows.find(row=>row.row_id===profile.prefix+':'+id);assert(row);
  assert.equal(row.quantity,quantity);assert.equal(row.unit_id,unit);
  if(Object.hasOwn(unitPrices,id)){assert.equal(row.included_in_estimate,true);assert.equal(row.unit_price,unitPrices[id]);assert.equal(row.amount,amounts[id]);}
  else{assert.equal(row.included_in_estimate,false);assert.equal(row.unit_price,null);assert.equal(row.amount,null);}
  assert.equal(row.included_in_procurement,false);
  if(unit==='machine_hour'){assert(record(row.calculation_trace));const decision=row.calculation_trace.machineHourPriceCoverageV1;assert(record(decision));
   assert.equal(decision.status,'CONFIRMED_SOURCE');assert.equal(decision.operationScope,'FULL_SOURCE_OPERATION');}
 }
 const marker=result.rows.find(row=>row.row_id===profile.prefix+':'+profile.includedOperation.id);assert(marker);
 assert.equal(marker.included_in_estimate,false);assert.equal(marker.included_in_procurement,false);assert.equal(marker.amount,null);
 assert(record(marker.calculation_trace)&&record(marker.calculation_trace.resourceGraph));assert.equal(marker.calculation_trace.resourceGraph.parentCostOwnerId,profile.paidWholeOwnerId);
 assert(result.rows.every(row=>!row.included_in_procurement));assert.equal(result.parameters.q,undefined);
 assert([...result.rows,...result.preliminaryNeeds].every(row=>row.row_id.startsWith(profile.prefix+':')),'NO_LEGACY_OR_SIBLING_ROWS');
 assert.equal(result.preliminaryNeeds.length,priced.expectedUnresolvedNeeds);
 assert(result.preliminaryNeeds.every(need=>profile.openNeeds.some(item=>item.parameterId===need.missing_parameter_ids[0])&&need.quantity===null&&!need.procurement_eligible));
 assert.equal(result.totals.pricedRowCount,priced.expectedPricedRows);assert.equal(result.totals.includedRowCount,7);assert.equal(result.totals.amount,priced.expectedTotal);
 assert.equal(result.totals.unconfirmedMachinePriceRowCount??0,0);assert.deepEqual(result.priceSnapshotIds,[priced.snapshotId]);
 const final={status:'FINITE_TEST_ONLY_PRICED_CASE_PASS',actualEntries:entries,results:1,rejects:0,pricedNativeRows:7,machinePrices:2,
  includedOperatorPaidOwners:0,includedOperationPaidOwners:0,materialProcurement:'HOLD_SUPPLY_STOCK',machineProcurement:'HOLD_PROVISION_MODE',
  quantitative19Replay:0,originalQuantityProof:'LINKED_SOURCE_LEVEL_REUSE',unknownUnion:68,closedUnknowns:0,actualProjectDocuments:0,
  normalDB:'UNRUN',locked:'UNRUN',save:'UNRUN',ui:'UNRUN',full:false};save('FINAL_KNOWN_NATIVE_PRICED_R166',final);return final;
}
