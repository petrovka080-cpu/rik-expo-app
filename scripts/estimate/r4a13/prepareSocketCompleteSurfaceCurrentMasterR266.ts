import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {isAbsolute,relative,resolve,win32} from 'node:path';
import fixture from '../../../data/estimate-benchmarks/fixtures/socket-complete-surface-whole-independent-r266.json';
import r2Completeness from '../../../data/estimate-benchmarks/fixtures/socket-existing-owner-r2-independent-consumers.json';
import {socketCompleteSurfacePackR266 as pack,socketCompleteSurfaceRowR266 as rid,socketCompleteSurfaceWholeR266}
  from './ownedDomain/socketCompleteSurfaceWholeR266';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {compileFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {hashMasterSingleDefinitionSuccessorReceiptR1 as valueSha,buildMasterPublicationResourceRowsR1,
  resolveMasterSingleDefinitionLocatorExcerptSha256R1,validateIndependentCompletenessMapReferences,
  type MasterSingleDefinitionSuccessorConfig as Config}
  from './prepareMasterSingleDefinitionSuccessorR1';
import {masterRetainedParentCaptureSha256R1,prepareMasterRetainedBindingRepresentativeR1,
  type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {verifySocketCompleteSurfacePureR266,verifySocketCompleteSurfaceWholeR266,type SocketVerificationContextR266}
  from './verifySocketCompleteSurfaceWholeR266';
import {appendSocketComposableTwoGangR1,socketComposableTwoGangPackR1 as composable}
  from '../../../src/lib/estimate/v4/socketComposableSurfaceTwoGangR1';
import {appendElectricalVerificationOwnedPostR1,electricalVerificationOwnedPostPackR1 as instruments}
  from '../../../src/lib/estimate/v4/electricalVerificationOwnedPostR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput}
  from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {appendSocketCompleteTwoGangExistingOwnerR1,socketCompleteTwoGangSourcePackR1 as completeTwo}
  from '../../../src/lib/estimate/backendPlatform/socketCompleteTwoGangExistingOwnerR1';
import completeTwoMap from '../../../data/estimate-benchmarks/fixtures/socket-complete-two-gang-existing-owner-independent-r1.json';
import {parseOwnedFiletimeControlR1,parseOwnedCompletedReceiptR1} from '../../verification/ownedControlFiletimeTransportR1';

const contract='gox.electrical.socket-complete-surface.current-master/r266';
const locatorKey='exact-complete-surface-2pe-project-resources-r266';
const parentSha='2b7f4cf590ff0070e4e364bfddf0a5588fd92f224fd735b6ec3f39d047a89f56';
const pointerPath='data/estimate-benchmarks/r568-local-developer-canonical-release.json';
const pointerSha='9b6322feb70e38191e7fe171d82dadebfe47816890d4c339f890477ebc83a258';
const a9ScopePath='data/estimate-benchmarks/fixtures/socket-current-registry-scope-a9-r1153.json',a9ScopeSha='441559c639d0baabefcb77b6b42222b45f2b6cd8552cf7df6dc21e4638c68b32';
const a9ReadProofPath='data/estimate-benchmarks/source-packs/socket-current-read-witness-a17-r1153.json',a9ReadProofSha='f20d0f7fd65332be01b18bb735359b741c92bfafa1f5eb4ac3ce9f8c6364b540';
export type SocketCurrentMasterContextR266=Readonly<{sourceRoot:string;
  currentFullParent:Readonly<{path:string;sha256:string}>;
  actualScopedSourceRead:Readonly<{path:string;sha256:string}>;
  /** Source-candidate calculation only. This is neither source admission nor
   * server-authenticated project context; the ordinary writer stays held. */
  sourceCandidateR2?:Readonly<{enabled:true;submittedParameters:Readonly<Record<string,unknown>>}>;
  completeTwoGangSourceCandidateR1?:Readonly<{enabled:true;submittedParameters:Readonly<Record<string,unknown>>}>;
  outputRoot?:string;onCoreCall?:SocketVerificationContextR266['onCoreCall'];onOutcome?:SocketVerificationContextR266['onOutcome']}>;
type Capture=MasterRetainedParentCaptureR1&Readonly<{parameters:AutomaticOwnerDefinition['parameters'];
  formulas:AutomaticOwnerDefinition['formulas'];resources:AutomaticOwnerDefinition['resources']}>;
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function requiredRecord(value:unknown,label:string){assert(record(value),label);return value;}
function strings(value:unknown):value is string[]{return Array.isArray(value)&&value.every(v=>typeof v==='string');}
type Parameter=AutomaticOwnerDefinition['parameters'][number];type Formula=AutomaticOwnerDefinition['formulas'][number];type Resource=AutomaticOwnerDefinition['resources'][number];
function parameter(value:unknown):value is Parameter{
  return record(value)&&typeof value.parameter_id==='string'&&typeof value.value_type==='string'
    &&typeof value.ordinal==='number'&&Number.isInteger(value.ordinal)&&typeof value.title_ru==='string'
    &&(value.unit_id===null||typeof value.unit_id==='string')&&typeof value.required==='boolean'
    &&Object.hasOwn(value,'default_value')&&(value.constraints_json===null||record(value.constraints_json))&&record(value.truth_metadata);
}
function formula(value:unknown):value is Formula{
  if(!record(value)||typeof value.formula_id!=='string'||typeof value.expression_source!=='string'
    ||typeof value.output_unit_id!=='string'||!strings(value.input_parameter_ids)||typeof value.ast_sha256!=='string')return false;
  try{assert.deepEqual(value.ast,compileFormulaGraph(value.expression_source).ast);return true;}catch{return false;}
}
function resource(value:unknown):value is Resource{
  return record(value)&&['id','row_id','section','category','title_ru','unit_id','formula_id','row_sha256'].every(k=>typeof value[k]==='string')
    &&typeof value.ordinal==='number'&&Number.isInteger(value.ordinal)&&record(value.inclusion_ast)&&record(value.resource_graph)
    &&typeof value.procurement_eligible==='boolean'&&(value.cost_owner_id===null||typeof value.cost_owner_id==='string')
    &&(value.source_metadata===null||record(value.source_metadata));
}
function rows<T>(value:unknown,check:(v:unknown)=>v is T,label:string):T[]{assert(Array.isArray(value),label);
  const output:T[]=[];for(const row of value){assert(check(row),label);output.push(row);}return output;}
function captureOf(value:unknown):Capture{const c=requiredRecord(value,'FULL_CAPTURE_REQUIRED');return{...c,
  definition:requiredRecord(c.definition,'FULL_DEFINITION_REQUIRED'),baseline:requiredRecord(c.baseline,'FULL_BASELINE_REQUIRED'),
  parameters:rows(c.parameters,parameter,'ACTUAL_PARAMETER_STRUCTURAL_TYPE'),formulas:rows(c.formulas,formula,'ACTUAL_FORMULA_STRUCTURAL_TYPE'),
  resources:rows(c.resources,resource,'ACTUAL_RESOURCE_STRUCTURAL_TYPE'),bindings:rows(c.bindings,record,'ACTUAL_BINDINGS'),
  normativeSources:rows(c.normativeSources,record,'ACTUAL_NORMATIVE_SOURCES'),normativeLocators:rows(c.normativeLocators,record,'ACTUAL_LOCATORS')};}

/** Existing owner/standard retained route only. Requires a real exact-key,
 * artifact and locator witness; the R266 source-empty capture is not absence. */

/** Exact recorded ROOT A9 input, not a live PID, registry admission or global absence. */
// Completed A9 receipt adds one measured parent identity to the ordinary two-field
// control record. Validate that exact named object with the unchanged native-control
// reader, then reattach it. Raw artifact SHA is checked before this adapter; no
// process is inspected, adopted or authorized, and domain JSON is never rewritten.
export function parseSocketA9ClosedReceiptR1153(raw: string, rawOwner: string): Record<string, any> {
  return parseOwnedCompletedReceiptR1(raw,rawOwner);
}

/** Exact recorded window result only; native ownership and closure are checked separately. */
export function assertSocketRecordedWindowOutcomeR1153(receipt:Record<string,unknown>):void {
  const failed=receipt.status==='NOT_ACCEPTED'&&receipt.testsPassed===false
    &&receipt.launcherExit===1&&receipt.error==='DB_JEST_FAILED';
  const passed=receipt.status==='EXPECTED_OUTCOME_AND_CLEAN_CLOSURE'&&receipt.testsPassed===true
    &&receipt.launcherExit===0&&receipt.error===null;
  assert(failed||passed,'A9_EXACT_RECORDED_WINDOW_OUTCOME_REQUIRED');
}
function socketA9ScopedReadWitnessR1153(context:SocketCurrentMasterContextR266,
  read:(path:string,sha256:string)=>Buffer,rawParent:Record<string,unknown>,pointer:Record<string,unknown>){
  assert.equal(context.actualScopedSourceRead.path,a9ReadProofPath,'A9_PORTABLE_PROOF_PATH_REQUIRED');
  assert.equal(context.actualScopedSourceRead.sha256,a9ReadProofSha,'A9_PORTABLE_PROOF_PIN_REQUIRED');
  const proofBytes=read(a9ReadProofPath,a9ReadProofSha);assert(proofBytes.length<=65536,'A9_PROOF_BYTE_CAP');
  const proof=requiredRecord(JSON.parse(proofBytes.toString('utf8')),'A9_PROOF_OBJECT');
  assert.equal(proof.contract,'socket-current-read-witness/a17-r1153');
  assert.equal(proof.scope,'FIXED_SOCKET_RECORDED_RR_INPUT_ONLY_NOT_PUBLICATION');
  for(const flag of ['sourceAdmission','projectAuthenticated','publisherAdmitted','normalLockedAdmitted','globalAbsence','full'])assert.equal(proof[flag],false);
  const parentProof=requiredRecord(proof.parent,'A9_PARENT_PROOF'),registryProof=requiredRecord(proof.registry,'A9_REGISTRY_PROOF');
  assert.equal(parentProof.path,context.currentFullParent.path);assert.equal(parentProof.sha256,parentSha);
  assert.equal(registryProof.path,a9ScopePath);assert.equal(registryProof.sha256,a9ScopeSha);
  const rawArtifacts=requiredRecord(proof.rawArtifacts,'A9_RAW_CONTROL_PROOF');
  assert.deepEqual(Object.keys(rawArtifacts),['DB_OWNER_CONTEXT.json','DB_PG_OWNED.json','DB_PG_CLOSED.json','receipt.json','CAPTURE_MANIFEST.json']);
  const rawArtifact=(name:string,cap:number)=>{
    const value=requiredRecord(rawArtifacts[name],'A9_RAW_ARTIFACT:'+name);
    assert(typeof value.utf8==='string'&&Buffer.byteLength(value.utf8,'utf8')<=cap,'A9_RAW_ARTIFACT_BYTES:'+name);
    assert.equal(createHash('sha256').update(value.utf8).digest('hex'),value.sha256,'A9_RAW_ARTIFACT_SHA:'+name);return value.utf8;
  };
  // Native numeric FILETIME lexemes are preserved by the existing control reader.
  // These completed identities are compared only; no process is inspected or adopted.
  const owner=parseOwnedFiletimeControlR1(rawArtifact('DB_OWNER_CONTEXT.json',16384)),
    pg=parseOwnedFiletimeControlR1(rawArtifact('DB_PG_OWNED.json',16384)),
    closed=parseOwnedFiletimeControlR1(rawArtifact('DB_PG_CLOSED.json',16384)),
    receipt=parseSocketA9ClosedReceiptR1153(rawArtifact('receipt.json',131072),rawArtifact('DB_OWNER_CONTEXT.json',16384)),
    manifest=requiredRecord(JSON.parse(rawArtifact('CAPTURE_MANIFEST.json',131072)),'A9_R2_MANIFEST');
  assert.equal(manifest.contract,'bound-electrical-current-read-witness/r2');
  assert.equal(manifest.filetimeEncoding,'DECIMAL_UINT64_STRING');
  assert.equal(manifest.scope,'FIXED_PANEL_SOCKET_CURRENT_INPUT_READ_ONLY_NOT_ADMISSION');
  assert.equal(owner.commandSha256,proof.commandSha256);assert.equal(manifest.commandSha256,proof.commandSha256);
  assert.equal(owner.rootThreadId,'01a18bb8-bd73-7e13-812b-637d3a45a60b');
  for(const value of [pg.context,closed.context,receipt.context,manifest.context])assert.deepEqual(value,owner,'A9_COMPLETE_OWNER_TUPLE');
  for(const value of [closed.postgres,receipt.postgres,manifest.postgres])assert.deepEqual(value,pg.postgres,'A9_COMPLETE_POSTGRES_TUPLE');
  assert.equal(pg.port,55432);assert.equal(receipt.commandRole,'FINITE_DB_VERIFICATION');assert.equal(receipt.fixedGroup,'NORMAL_LOCKED_THREE');
  assert.equal(receipt.normalPgClosure,true);assert.equal(receipt.pgStopExit,0);assert.equal(closed.pgStopExit,0);
  assert.equal(closed.finalListenerAbsent,true);assert.deepEqual(receipt.remainingOwnedProcesses,[]);assert.equal(receipt.closureError,null);
  // Preserve the actual completed window outcome; this input proof grants no consumer PASS.
  assertSocketRecordedWindowOutcomeR1153(receipt);
  const transaction=requiredRecord(manifest.transaction,'A9_RR_TRANSACTION');
  assert.deepEqual(transaction,{isolation:'repeatable read',readOnly:true,timezone:'UTC',rolledBack:true});
  for(const flag of ['sourceAdmission','projectAuthenticated','full'])assert.equal(manifest[flag],false);
  assert.deepEqual(manifest.pointer,{sha256:pointerSha,definitionReleaseId:pointer.definitionReleaseId,searchReleaseId:pointer.searchReleaseId});
  const sourceFreeze=requiredRecord(proof.sourceFreeze,'A9_RECORDED_SOURCE_FREEZE');assert.equal(manifest.sourceFreeze,sourceFreeze.originalPath);
  const outputs=requiredRecord(manifest.outputs,'A9_OUTPUTS');
  assert.equal(requiredRecord(outputs.socket,'A9_SOCKET_OUTPUT').sha256,parentSha);
  assert.equal(requiredRecord(outputs.socketScope,'A9_SOCKET_SCOPE_OUTPUT').sha256,a9ScopeSha);
  const expectedPaths=['scripts/verification/capturePanelSocketCurrentInputsR1.ts','scripts/verification/ownedControlFiletimeTransportR1.ts',
    'scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',pointerPath];
  assert(Array.isArray(manifest.sourceWitnessPins)&&manifest.sourceWitnessPins.length===expectedPaths.length,'A9_COMPLETE_SOURCE_PIN_SET');
  const observedPins=manifest.sourceWitnessPins.map((value:unknown,index:number)=>{
    const pin=requiredRecord(value,'A9_SOURCE_PIN');assert(typeof pin.path==='string'&&typeof pin.sha256==='string');
    const sourcePath=expectedPaths[index]!;
    const recordedRoot='C:\\dev\\rik-expo-app-r4a5-dc4f0ce7';
    assert.equal(pin.path,win32.join(recordedRoot,...sourcePath.split('/')),'A9_NAMED_SOURCE_PIN');
    read(sourcePath,pin.sha256);return{path:sourcePath,sha256:pin.sha256};
  });
  assert.deepEqual(observedPins,proof.sourceWitnessPins);
  const rawRows=requiredRecord(rawParent.rawRows,'A9_COMPLETE_PARENT_RAW_ROWS'),
    collections=['membership','definition','baseline','parameters','formulas','resources','bindings','normativeLocators','normativeSources','contentPassport','publicIdentity'],
    counts=[1,1,1,1,63,63,0,0,0,1,1];
  assert.deepEqual(Object.keys(rawRows),collections,'A9_NAMED_COMPLETE_RAW_COLLECTIONS');
  for(const [index,name]of collections.entries()){const rows=rawRows[name];assert(Array.isArray(rows)&&rows.length===counts[index]&&rows.every(row=>typeof row==='string'),'A9_RAW_COLLECTION:'+name);}
  const rawRowsSha=createHash('sha256').update(JSON.stringify(rawRows)).digest('hex');
  assert.equal(rawRowsSha,rawParent.rawRowsSha256);assert.equal(rawRowsSha,parentProof.rawRowsSha256);
  const scope=requiredRecord(JSON.parse(read(a9ScopePath,a9ScopeSha).toString('utf8')),'A9_FIXED_SCOPE_OBJECT');
  assert.deepEqual(Object.keys(scope),['contract','projection','scope','sourceRows','locatorRows','exactKeyAbsent','artifactAliasOrLocatorReviewRequired','globalAbsence','physicalOwnerAdmission','sourceAdmission','full']);
  assert.equal(scope.contract,'fixed-socket-current-registry-read/r1');assert.equal(scope.projection,'pg-jsonb-text-utc-microseconds/r1');
  assert.deepEqual(scope.scope,{sourceKey:pack.sourceId,artifactSha256:pack.source.sha256,locatorKeys:[locatorKey]});
  assert.deepEqual(scope.scope,registryProof.scope);assert.equal(scope.contract,registryProof.contract);assert.equal(scope.projection,registryProof.projection);
  assert.deepEqual(scope.sourceRows,[],'A9_SOURCE_UNION_NONEMPTY_REQUIRES_REVIEW');
  assert.deepEqual(scope.locatorRows,[],'A9_LOCATOR_UNION_NONEMPTY_REQUIRES_REVIEW');
  assert.equal(registryProof.sourceRows,0);assert.equal(registryProof.locatorRows,0);
  assert.equal(scope.exactKeyAbsent,true);assert.equal(scope.artifactAliasOrLocatorReviewRequired,false);
  for(const flag of ['globalAbsence','physicalOwnerAdmission','sourceAdmission','full'])assert.equal(scope[flag],false);
  // Only this exact, complete and genuinely empty named union permits the
  // four legacy empty subset views. No readOnly or global-absence fact is invented.
  return{sourceKey:pack.sourceId,artifactSha256:pack.source.sha256,exactLocatorKeys:[locatorKey],
    sourceRows:[],sameArtifactSourceRows:[],allLocatorsForActualSourceIds:[],exactLocatorRows:[],
    readOnly:transaction.readOnly,exactKeyAbsent:scope.exactKeyAbsent,
    artifactAliasOrLocatorReviewRequired:scope.artifactAliasOrLocatorReviewRequired,globalAbsence:scope.globalAbsence};
}

export function prepareSocketCompleteSurfaceCurrentMasterR266(context:SocketCurrentMasterContextR266):Config{
  assert(isAbsolute(context.sourceRoot));assert.equal(resolve(context.sourceRoot),resolve(__dirname,'../../..'),'ONE_ACTUAL_SOURCE_ROOT_REQUIRED');
  const own=(path:string)=>{const full=resolve(context.sourceRoot,path),rel=relative(context.sourceRoot,full);
    assert(!isAbsolute(path)&&rel!==''&&!isAbsolute(rel)&&!rel.startsWith('..'),'OWN_ROOT_RELATIVE_PATH_REQUIRED');return full;};
  const read=(path:string,sha256:string)=>{assert.match(sha256,/^[0-9a-f]{64}$/u);const bytes=readFileSync(own(path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),sha256,'EXACT_SOURCE_BYTE_PIN:'+path);return bytes;};
  assert.equal(context.currentFullParent.sha256,parentSha,'CHANGED_CURRENT_PARENT_REQUIRES_REVIEW');
  const raw=requiredRecord(JSON.parse(read(context.currentFullParent.path,parentSha).toString('utf8')),'ACTUAL_FULL_PARENT_OBJECT');
  assert.equal(raw.readOnly,true);assert.equal(raw.sourceMetadataLosslessRoundtrip,true);const c=captureOf(raw.capture);
  assert.deepEqual(stable(c),stable(raw.capture),'ALL_ACTUAL_FIELDS_RETAINED');
  const identity=requiredRecord(raw.publicIdentity,'PUBLIC_IDENTITY_REQUIRED'),membership=requiredRecord(raw.membership,'ACTUAL_MEMBERSHIP_REQUIRED');
  assert.equal(identity.catalog_id,pack.catalogId);assert.equal(identity.work_key,pack.workKey);
  assert.equal(c.definition.catalog_id,pack.catalogId);assert.equal(c.definition.id,'9ba0918b-153e-543a-b335-b41d44e16fc8');assert.equal(c.definition.definition_version,3);
  assert.equal(c.definition.definition_sha256,'6fe173b6d170f74cb918127fa75b0a9fb970d4afa8e6d744d0b80c75ab2ee4fc');
  assert.equal(c.baseline.id,'47b6fc5a-608b-5aa9-a25d-d920c099ce81');assert.equal(c.baseline.catalog_id,pack.catalogId);assert.equal(c.baseline.definition_version_id,c.definition.id);
  assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length,c.bindings.length,c.normativeSources.length,c.normativeLocators.length],[1,63,63,0,0,0]);
  const pointer=requiredRecord(JSON.parse(read(pointerPath,pointerSha).toString('utf8')),'CURRENT_POINTER_REQUIRED');
  assert(typeof pointer.definitionReleaseId==='string');assert(typeof pointer.searchReleaseId==='string');
  assert.equal(membership.release_id,pointer.definitionReleaseId);assert.equal(membership.definition_version_id,c.definition.id);
  const witness=socketA9ScopedReadWitnessR1153(context,read,raw,pointer);
  assert.equal(witness.readOnly,true);assert.equal(witness.sourceKey,pack.sourceId);assert.equal(witness.artifactSha256,pack.source.sha256);
  assert.deepEqual(witness.exactLocatorKeys,[locatorKey]);for(const key of['sourceRows','sameArtifactSourceRows','allLocatorsForActualSourceIds','exactLocatorRows'] as const)
    assert.deepEqual(witness[key],[],'REGISTRY_COLLISION_OR_INCOMPLETE_SCOPED_READ_REQUIRES_OWNER_REVIEW:'+key);
  assert.equal(witness.exactKeyAbsent,true);assert.equal(witness.artifactAliasOrLocatorReviewRequired,false);assert.equal(witness.globalAbsence,false);
  const parent:AutomaticOwnerDefinition={parameters:c.parameters,formulas:c.formulas,resources:c.resources,
    runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']};
  const model=socketCompleteSurfaceWholeR266(parent);verifySocketCompleteSurfacePureR266(parent,model);
  const metadata=requiredRecord(c.definition.source_metadata,'ACTUAL_LEGACY_SOURCE_METADATA');assert(typeof metadata.templateId==='string');
  assert.equal(metadata.templateId,'electrical_interior_socket_install_standard_professional_expanded_v1');
  assert(!Object.hasOwn(metadata,'retainedParentBindingSuccessorV1')&&!Object.hasOwn(metadata,'retainedParentBindingLineageV1'),'CHANGED_RETAINED_HISTORY_REQUIRES_REVIEW');
  const baselineSources=requiredRecord(c.baseline.normative_source_ids,'BASELINE_SOURCE_ARRAYS');
  const qSources=baselineSources.q;assert(strings(qSources));assert.deepEqual(qSources,['r555-source:'+metadata.templateId]);
  const capturedParentSha256=masterRetainedParentCaptureSha256R1(c);
  const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256,capturedSourcePreimage:{sourceKey:pack.sourceId,expected:null},
    legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:metadata.templateId,parameterSources:{q:qSources}},
    newParameterSources:Object.fromEntries(model.parameters.slice(1).map(p=>[p.parameter_id,p.truth_metadata.visibility_role==='INTERNAL_ONLY'
      ?{kind:'DERIVED' as const,sourceIds:[]}:{kind:'KNOWN' as const,sourceIds:[pack.sourceId]}]))};
  const sourcePaths=['scripts/estimate/r4a13/prepareSocketCompleteSurfaceCurrentMasterR266.ts','scripts/estimate/r4a13/verifySocketCompleteSurfaceWholeR266.ts',
    'scripts/estimate/r4a13/ownedDomain/socketCompleteSurfaceWholeR266.ts','data/estimate-benchmarks/source-packs/socket-complete-surface-2pe-project-r266.json',
    'data/estimate-benchmarks/fixtures/socket-complete-surface-whole-independent-r266.json',pack.source.logicalPath,context.currentFullParent.path,context.actualScopedSourceRead.path,pointerPath,
    a9ScopePath,'scripts/verification/capturePanelSocketCurrentInputsR1.ts','scripts/verification/ownedControlFiletimeTransportR1.ts',
    'scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts',
    'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
    'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts','src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts','src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts'];
  read(pack.source.logicalPath,pack.source.sha256);for(const path of sourcePaths)readFileSync(own(path));
  const bound=[rid('assembly:consumed'),rid('assembly:order')],rowApplicability=Object.fromEntries(bound.map(rowId=>[rowId,{
    contract,manufacturerReference:pack.privateManufacturerReference,unitId:'pcs',completeFactoryUnit:true,
    quantityIsActualProjectSchedule:true,manufacturerLabourNormAccepted:false,actualProjectAuthentication:false}]));
  const cfg:Config={contract,stopCode:'SOCKET_COMPLETE_SURFACE_CURRENT_R266',applicationName:'socket-existing-complete-surface-r266',
    expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_16_2026-10-24.txt',
    masterSha256:'541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40',
    parentReleaseId:pointer.definitionReleaseId,parentSearchReleaseId:pointer.searchReleaseId,currentReleasePath:pointerPath,
    outputRoot:context.outputRoot??'.release-runtime/socket-existing-complete-surface-r266',sourcePaths:[...new Set(sourcePaths)],
    catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,sourceMetadata:{source_title:'Комплектная накладная розетка 2P+E и фактические ресурсы принятого проекта',
      source_authority:'Legrand: только состав заводского изделия и его совместимость; труд и крепёж требуют фактического ППР',
      exact_locator:pack.source.locator,use_restriction:pack.scope,source_kind:'EXACT_COMPLETE_FACTORY_UNIT_WITH_PROJECT_RESOURCES_NOT_LABOUR_RATE',
      official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256},
    parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
    shortInput:fixture.testOnlyInput,acceptanceInput:fixture.testOnlyInput,expectedParentShape:[1,63,63],benchmarkOrdinal:266,
    validationScenario:'TEST_ONLY exact complete surface socket; separate actual node count, project resource facts, same existing owner, legacy unverified scope retained',
    passport:{canonicalRuName:'Монтаж розеток в стандартной зоне',workKey:pack.workKey,
      physicalResultRu:'Розеточный узел в подтверждённом комплектном накладном корпусе на подготовленном основании',
      includedScopeRu:[pack.scope],excludedScopeRu:['Норма труда монтажа не подтверждена удержанным КРЕРм08; здесь нет универсальной ставки.',
        'Текущие 18 непроверенных источников прежних 63 строк не становятся физическими нормами.',
        'Данные проекта, фактического допуска, цены и поставки не подтверждены TEST_ONLY входом.'],independentCompletenessMap:fixture.completenessMap},
    applicability:{...structuredClone(c.definition.applicability),currentParentDefinitionId:c.definition.id,sourceQualifiedProjectProfileV1:{contract,
      selectorParameterId:pack.methodParameterId,selectorValue:pack.method,legacyRows:63,manufacturerFactoryUnitAccepted:true,
      actualProjectAuthentication:false,labourNormAccepted:false,priceCoverage:'ROOT_OWNER_REVIEW_HOLD',full:false},
      primaryMeasureSelectionV1:{contract:'canonical-primary-measure-selection/v1',selectorParameterId:pack.methodParameterId,selections:[
        {selectorValue:pack.legacyMethod,primaryMeasureParameterId:'q',unitId:'point'},
        {selectorValue:pack.method,primaryMeasureParameterId:pack.countParameterId,unitId:'pcs'}]}},
    binding:{rowId:bound[0],additionalRowIds:bound.slice(1),applicability:rowApplicability[bound[0]],applicabilityByRowId:rowApplicability,retainParentBindings:retained},
    locator:{key:locatorKey,payload:{contract,source:pack.source,readback:pack.readback,privateManufacturerReference:pack.privateManufacturerReference,
      explicitBindingApplicabilityByRowId:rowApplicability,labourNormAccepted:false,projectAuthenticated:false,sourceAuthorityExtendedToLegacy:false}},
    search:{primaryUom:'point',canonicalNameRu:'Монтаж розеток в стандартной зоне',aliases:[],shortScopeRu:'Существующая карточка; внутренний профиль комплектной накладной розетки.',
      keyDistinguishingParameters:[pack.methodParameterId,pack.countParameterId],clarificationFields:[],includedBoundaries:[pack.scope],
      excludedBoundaries:['Иные изделия и основания, штробление, прокладка новой линии, скрытый монтаж, взрывоопасная зона и расчёт зарядного контура не допускаются этим профилем.'],
      extraSearchTermsRu:'розетка комплектная накладная корпус механизм рамка подготовленное основание',sourceProvenance:{contract,capturedParentSha256,
        actualCurrentFileSha256:parentSha,sourceWitnessSha256:context.actualScopedSourceRead.sha256,newPublicCatalogs:0,full:false}},
    forbiddenAdjacentMatchers:[/low_current|cat6|ventilated_facade|natural_stone/iu],owner:'ROOT_SINGLE_INTEGRATOR_ELECTRICAL_EXISTING_OWNER',receiptFileStem:'socket_complete_surface_r266',
    verifyTargetPrecondition:async()=>{
      // Standard publisher precondition: TEST_ONLY input and a real source-key
      // absence witness do not authenticate the installation scope, price or PPR.
      throw Error('STOP_SOCKET_COMPLETE_SURFACE_R266_SOURCE_AND_QUALIFICATION_REVIEW_HOLD');
    },
    verifyCore:async()=>{
      // Exact standard pure retained projection. These UUIDs are TEST_ONLY; no DB IDs are forecast.
      const sourceId='11111111-1111-5111-8111-111111111111',locatorId='22222222-2222-5222-8222-222222222222';
      const fingerprint=valueSha({purpose:'PURE_SOCKET_CURRENT_CONFIG_STANDARD_RETAINED_REPRESENTATIVE_NOT_PUBLICATION',capturedParentSha256,
        currentFullReadSha256:parentSha,sourceHashes:cfg.sourcePaths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(own(path))).digest('hex')}))});
      const m=cfg.sourceMetadata,projection=prepareMasterRetainedBindingRepresentativeR1({config:cfg,newSource:{id:sourceId,source_key:cfg.sourceId,
        title_ru:m.source_title,authority:m.source_authority,official_url:m.official_url??null,artifact_sha256:m.artifact_sha256??null,effective_from:null,effective_to:null,
        metadata:{contract,sourceKind:m.source_kind,useRestriction:m.use_restriction,universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}},
        newLocators:[{id:locatorId,source_id:sourceId,locator_key:cfg.locator.key,locator:cfg.locator.payload,excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(cfg)}]},
        {parameters:model.parameters,formulas:model.formulas.map(f=>c.formulas.some(old=>old.formula_id===f.formula_id)?f:{...f,ast_sha256:valueSha(f.ast)}),
          resources:buildMasterPublicationResourceRowsR1(model.resources),newBindings:bound.map(row_id=>({row_id,locator_id:locatorId,applicability:rowApplicability[row_id]})),
          successorProvenance:{contract,sourceId:cfg.sourceId,normId:cfg.normId,parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,
            capturedParentSha256,sourceFingerprint:fingerprint,currentFullReadSha256:parentSha},lifecycleMetadata:{contract,masterSha256:cfg.masterSha256,sourceFingerprint:fingerprint}});
      assert.equal(projection.expectedNormativeBindingCount,2);for(const[id,sources]of Object.entries(c.baseline.normative_source_ids))assert.deepEqual(projection.normativeSourceIds[id],sources);
      context.onOutcome?.('ordinary-retained-source-and-composition-guard',{status:'PASS_TEST_ONLY_PROJECTION_NOT_DB_PREFLIGHT',bindings:2});
      return verifySocketCompleteSurfaceWholeR266({parent,model,onCoreCall:context.onCoreCall,onOutcome:context.onOutcome});
    }};
  if(context.completeTwoGangSourceCandidateR1?.enabled===true)
    return socketCompleteTwoGangOrdinaryCalculationConfigR1(cfg,context.completeTwoGangSourceCandidateR1.submittedParameters);
  return context.sourceCandidateR2?.enabled===true
    ? socketExistingOwnerSourceCandidateConfigR2(cfg,context.sourceCandidateR2.submittedParameters):cfg;
}

export type SocketExistingOwnerCompileOptionsR2=Readonly<{
  enableSourceCandidateR2?:true;
  rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];
  priceItems?:CanonicalEstimateCompileCoreInput['priceItems'];
}>;
function socketModelFromOrdinaryConfigR2(config:Config):AutomaticOwnerDefinition{
  return{parameters:rows(config.parameterDefinitions,parameter,'SOCKET_CALLER_PARAMETER_STRUCTURE'),
    formulas:rows(config.formulaDefinitions,formula,'SOCKET_CALLER_FORMULA_STRUCTURE'),
    resources:rows(config.resourceDefinitions,resource,'SOCKET_CALLER_RESOURCE_STRUCTURE'),
    runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']};
}
function primaryMeasureForSocketInputR2(input:Readonly<Record<string,unknown>>):string{
  if(input[pack.methodParameterId]===completeTwo.method)return completeTwo.parameterPrefix+'node_count';
  return input[pack.methodParameterId]===composable.method?composable.parameterPrefix+'node_count'
    :input[pack.methodParameterId]===pack.method?pack.countParameterId:'q';
}
function compileSocketOrdinaryConfigR2(config:Config,input:Record<string,unknown>,options:SocketExistingOwnerCompileOptionsR2){
  const model=socketModelFromOrdinaryConfigR2(config);
  return compileCanonicalEstimateCore({operation:options.rowOverrides?'recalculate':'compile',catalogId:config.catalogId,
    compilerVersion:input[pack.methodParameterId]===completeTwo.method?completeTwo.contract
      :input[pack.methodParameterId]===composable.method?'gox.electrical.existing-owner-source-candidates/r2':pack.contract,
    primaryMeasureParameterId:primaryMeasureForSocketInputR2(input),parameterDefinitions:[...model.parameters],
    formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],submittedParameters:input,
    // Object/HTTP fields, selections and prices are not trusted source facts.
    confirmedParameters:{},currencyCode:'KGS',priceItems:options.priceItems??[],rowOverrides:options.rowOverrides,
    maximumResourceRows:model.resources.length,hashJson:async value=>estimateDeterministicHash(value)});
}
function socketExistingOwnerSourceCandidateConfigR2(base:Config,input:Readonly<Record<string,unknown>>):Config{
  if(input[pack.methodParameterId]!==composable.method)return base;
  const single=socketModelFromOrdinaryConfigR2(base);
  // Both selected source leaves are installed as definitions, so the ordinary input
  // schema exposes the inventory choice. Its exact selector controls actual
  // inclusion and suppression; an absent choice creates no instrument rows.
  const model=appendElectricalVerificationOwnedPostR1(appendSocketComposableTwoGangR1(single));
  const unresolved=model.resources.filter(r=>r.row_id.startsWith(composable.prefix+':')
    ||r.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM').map(r=>r.row_id);
  const candidatePaths=['src/lib/estimate/v4/socketComposableSurfaceTwoGangR1.ts',
    'src/lib/estimate/v4/electricalVerificationOwnedPostR1.ts',
    'data/estimate-benchmarks/source-packs/socket-composable-surface-two-gang-r1.json',
    'data/estimate-benchmarks/source-packs/electrical-verification-owned-post-r1.json',
    'data/estimate-benchmarks/fixtures/socket-existing-owner-r2-independent-consumers.json',
    ...composable.sources.map(source=>source.logicalPath),...instruments.sources.map(source=>source.path)];
  const config:Config={...base,parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,
    resourceDefinitions:model.resources,shortInput:{...input},acceptanceInput:{...input},
    sourcePaths:[...new Set([...base.sourcePaths,...candidatePaths])],
    passport:{...base.passport,unresolvedApplicableResourceRowIds:unresolved,
      independentCompletenessMap:{...fixture.completenessMap,evidenceSha256:r2Completeness.evidenceSha256,
        entries:[...fixture.completenessMap.entries,...r2Completeness.entries]}},
    applicability:{...base.applicability,primaryMeasureSelectionV1:{contract:'canonical-primary-measure-selection/v1',
      selectorParameterId:pack.methodParameterId,selections:[
        {selectorValue:pack.legacyMethod,primaryMeasureParameterId:'q',unitId:'point'},
        {selectorValue:pack.method,primaryMeasureParameterId:pack.countParameterId,unitId:'pcs'},
        {selectorValue:composable.method,primaryMeasureParameterId:composable.parameterPrefix+'node_count',unitId:'pcs'}]},
      sourceOnlyElectricalR2V1:{contract:'gox.electrical.existing-owner-source-candidates/r2',
        selectedByActualSubmittedParameterId:pack.methodParameterId,selectedValue:composable.method,
        instrumentSelectorParameterId:instruments.methodId,instrumentSelectorValue:instruments.method,
        sourceAuthorityPromoted:false,projectAuthenticated:false,fullTechnicalAcceptance:false,
        ordinaryWriterAdmission:'HOLD_EXACT_R2_SOURCE_BINDING_AND_SOURCE_ADMISSION_REQUIRED',
        oldSingleNormativeBindingsExtendedToR2:false}},
    // Preserve the original source/witness/bindings and target precondition.
    // This opt-in is an actual ordinary Config calculation surface, not a
    // publishable source extension. No new normative IDs/maps are invented.
    binding:base.binding,verifyTargetPrecondition:base.verifyTargetPrecondition,
    verifyCore:async()=>{
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:r2Completeness,
        formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[],'SOCKET_R2_EXACT_INDEPENDENT_OPERATIONS_AND_OWNER_MAP');
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:config.passport.independentCompletenessMap,
        formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[],'SOCKET_R2_LEGACY_AND_CANDIDATE_MAP_CLOSURE');
      const result=await compileSocketOrdinaryConfigR2(config,{...input},{});
      return{status:'ACTUAL_R2_SOURCE_CANDIDATE_CORE_RESULT_NOT_ADMISSION',result,
        sourceAuthorityPromoted:false,projectAuthenticated:false,full:false,ready:false};
    }};
  return config;
}

/** The same exact parent/source-witness guards run before either model is
 * compiled. Source-candidate opt-in changes no authenticated server facts. */
export async function compileSocketExistingOwnerCurrentMasterR2(input:Record<string,unknown>,
  context:SocketCurrentMasterContextR266,options:SocketExistingOwnerCompileOptionsR2={}){
  const isComposable=input[pack.methodParameterId]===composable.method;
  if(isComposable&&options.enableSourceCandidateR2!==true)throw Error('SOCKET_R2_EXPLICIT_SOURCE_CANDIDATE_OPT_IN_REQUIRED');
  if(input[instruments.methodId]===instruments.method&&!isComposable)
    throw Error('SOCKET_R2_INSTRUMENT_REQUIRES_EXACT_COMPOSABLE_PROFILE');
  const config=prepareSocketCompleteSurfaceCurrentMasterR266({...context,
    completeTwoGangSourceCandidateR1:undefined,
    sourceCandidateR2:options.enableSourceCandidateR2===true?{enabled:true,submittedParameters:input}:undefined});
  return compileSocketOrdinaryConfigR2(config,input,options);
}

function socketCompleteTwoGangOrdinaryCalculationConfigR1(base:Config,input:Readonly<Record<string,unknown>>):Config{
  if(input[pack.methodParameterId]!==completeTwo.method)return base;
  const model=appendSocketCompleteTwoGangExistingOwnerR1(socketModelFromOrdinaryConfigR2(base));
  const config:Config={...base,parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
    shortInput:{...input},acceptanceInput:{...input},
    sourcePaths:[...new Set([...base.sourcePaths,'src/lib/estimate/backendPlatform/socketCompleteTwoGangExistingOwnerR1.ts',
      'data/estimate-benchmarks/source-packs/socket-complete-two-gang-existing-owner-source-r1.json',
      'data/estimate-benchmarks/fixtures/socket-complete-two-gang-existing-owner-independent-r1.json',
      completeTwo.primary.logicalPath,...completeTwo.secondaryPrimaryArtifacts.map(source=>source.logicalPath)])],
    passport:{...base.passport,unresolvedApplicableResourceRowIds:model.resources.filter(r=>r.row_id.startsWith(completeTwo.prefix+':')).map(r=>r.row_id),
      independentCompletenessMap:{...fixture.completenessMap,evidenceSha256:completeTwoMap.evidenceSha256,
        entries:[...fixture.completenessMap.entries,...completeTwoMap.entries]}},
    applicability:{...base.applicability,primaryMeasureSelectionV1:{contract:'canonical-primary-measure-selection/v1',selectorParameterId:pack.methodParameterId,
      selections:[{selectorValue:pack.legacyMethod,primaryMeasureParameterId:'q',unitId:'point'},
        {selectorValue:pack.method,primaryMeasureParameterId:pack.countParameterId,unitId:'pcs'},
        {selectorValue:completeTwo.method,primaryMeasureParameterId:completeTwo.parameterPrefix+'node_count',unitId:'pcs'}]},
      sourceOnlyCompleteTwoGangWaveV1:{contract:completeTwo.contract,sourceAuthorityPromoted:false,projectAuthenticated:false,
        fullTechnicalAcceptance:false,registrySourceId:null,registryNormId:null,primaryDocumentIdentifier:completeTwo.primaryDocumentId,
        instrumentConsumerBinding:'NOT_AUTOMATICALLY_REUSED_FROM_COMPOSABLE_REV02',
        ordinaryWriterAdmission:'HOLD_EXACT_COMPLETE_PRODUCT_SOURCE_ROLE_AND_OBJECT_QUALIFICATION',oldSingleBindingsExtended:false}},
    binding:base.binding,verifyTargetPrecondition:base.verifyTargetPrecondition,
    verifyCore:async()=>{
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:completeTwoMap,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[],
        'COMPLETE_TWO_GANG_INDEPENDENT_WHOLE_OPERATION_AND_SINGLE_OWNER_MAP');
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:config.passport.independentCompletenessMap,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[],
        'COMPLETE_TWO_GANG_PRESERVED87_AND_NEW41_MAP');
      const result=await compileSocketOrdinaryConfigR2(config,{...input},{});
      return{status:'ACTUAL_COMPLETE_TWO_GANG_SOURCE_CANDIDATE_NOT_ADMISSION',result,sourceAuthorityPromoted:false,projectAuthenticated:false,full:false,ready:false};
    }};
  return config;
}

/** Explicit new internal complete-product profile; the original real-parent
 * Config and shared compiler remain the only path. No HTTP source fact hook. */
export async function compileSocketCompleteTwoGangCurrentMasterR1(input:Record<string,unknown>,context:SocketCurrentMasterContextR266,
  options:Readonly<{enableCompleteTwoGangSourceCandidateR1:true;rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];priceItems?:CanonicalEstimateCompileCoreInput['priceItems']}>){
  if(options.enableCompleteTwoGangSourceCandidateR1!==true)throw Error('COMPLETE_TWO_GANG_EXPLICIT_SOURCE_CANDIDATE_OPT_IN_REQUIRED');
  if(input[pack.methodParameterId]!==completeTwo.method)throw Error('COMPLETE_TWO_GANG_EXACT_PROFILE_REQUIRED');
  if(input[instruments.methodId]===instruments.method)throw Error('COMPLETE_TWO_GANG_COMPOSABLE_INSTRUMENT_BINDING_NOT_ADMITTED');
  const config=prepareSocketCompleteSurfaceCurrentMasterR266({...context,sourceCandidateR2:undefined,
    completeTwoGangSourceCandidateR1:{enabled:true,submittedParameters:input}});
  return compileSocketOrdinaryConfigR2(config,input,options);
}
