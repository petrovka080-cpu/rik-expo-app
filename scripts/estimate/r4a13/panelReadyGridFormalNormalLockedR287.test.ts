import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {Client} from 'pg';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {preparePanelReadyGridCurrentMasterR287} from './preparePanelReadyGridCurrentMasterR287';
import {panelReadyGridWholePackR287 as pack} from './ownedDomain/panelReadyGridWholePostR287';
import {buildMasterSingleDefinitionGeneratedRegistryRowsR1,resolveMasterSingleDefinitionLocatorExcerptSha256R1} from './prepareMasterSingleDefinitionSuccessorR1';
import {captureMasterScopedNormativeRegistryPreimageR1,resolveMasterScopedNormativeRegistryOptInR1,
  readMasterScopedNormativeRegistryPreconditionsR1,assertMasterScopedNormativeRegistryUnchangedR1,
  type MasterCapturedScopedNormativeRegistryR1,type MasterScopedNormativeRegistryInputR1} from './masterScopedNormativeRegistryPreimageR1';
import {masterRetainParentBindingsOptInR1,readMasterRetainedBindingPreconditionsR1,lockMasterRetainedBindingPreconditionsR1,
  assertMasterRetainedBindingPreflightUnchangedR1,masterRetainedParentCaptureSha256R1} from './masterSingleDefinitionRetainParentBindingsR1';
type Pin=Readonly<{path:string;sha256:string}>;
const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const strings=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(item=>typeof item==='string');
const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex'),sourceRoot=path.resolve(__dirname,'../../..');
function pin(value:unknown):Pin{assert(object(value));assert(typeof value.path==='string'&&path.isAbsolute(value.path));
  assert(typeof value.sha256==='string'&&/^[a-f0-9]{64}$/u.test(value.sha256));return{path:value.path,sha256:value.sha256};}
function pinned(value:Pin){assert(fs.statSync(value.path).size<=4*1024*1024,'PINNED_INPUT_CAP');const bytes=fs.readFileSync(value.path);assert.equal(sha(bytes),value.sha256,'PINNED_INPUT_SHA:'+value.path);return bytes;}
function manifest(){const input=process.env.PANEL_R287_FORMAL_INPUT_MANIFEST;assert(typeof input==='string'&&path.isAbsolute(input));
  const value:unknown=JSON.parse(fs.readFileSync(input,'utf8'));assert(object(value));assert.equal(value.sourceRoot,sourceRoot);return value;}
function output(){const dir=process.env.PANEL_R287_FORMAL_RAW_DIR;assert(typeof dir==='string'&&path.isAbsolute(dir)&&!fs.existsSync(dir),'FRESH_OWNED_RAW_OUTPUT_REQUIRED');fs.mkdirSync(dir,{recursive:true});
  const bytes=(name:string,value:Buffer)=>{assert(value.length<=4*1024*1024,'LOCAL_ARTIFACT_CAP:'+name);const outputPath=path.join(dir,name);fs.writeFileSync(outputPath,value,{flag:'wx'});return{path:outputPath,sha256:sha(value),bytes:value.length};};
  return{bytes,save:(name:string,value:unknown)=>bytes(name,Buffer.from(JSON.stringify(value,null,2)+'\n'))};}
type Output=ReturnType<typeof output>;
function journal(client:Client,out:Output,allowLocks:boolean){const evidence:ReturnType<Output['save']>[]=[];
  const tracked=new Proxy(client,{get(target,key,receiver){if(key!=='query')return Reflect.get(target,key,receiver);
    return async(text:unknown,values:unknown=[])=>{assert(typeof text==='string'&&Array.isArray(values),'EXISTING_TEXT_QUERY_ONLY');
      const allowed=allowLocks?/^\s*(?:select|with|begin|set local|show|lock table|rollback)\b/iu:/^\s*(?:select|with|begin|set local|show|rollback)\b/iu;
      assert(allowed.test(text),'NO_DML_OR_PUBLISHER_QUERY_ALLOWED');const result=await target.query(text,values),index=evidence.length+1;
      const rows=result.rows.map((row:unknown,rowIndex:number)=>{assert(object(row));return Object.fromEntries(Object.entries(row).map(([key,value])=>[key,
        typeof value==='string'?{kind:'PG_TEXT',...out.bytes(`query-${index}-row-${rowIndex}-${key}.txt`,Buffer.from(value))}:value]));});
      evidence.push(out.save(`query-${index}.json`,{text,values,command:result.command,rowCount:result.rowCount,rows}));return result;};}});
  return{client:tracked,evidence};}
function connection(){const secret=process.env.ESTIMATE_MIGRATION_DATABASE_URL;assert(typeof secret==='string'&&secret.length>0,'ROOT_DATABASE_URL_IN_MEMORY_REQUIRED');
  let url:URL;try{url=new URL(secret);}catch{throw Error('ROOT_DATABASE_URL_INVALID');}
  assert(url.hostname==='127.0.0.1'&&url.port==='55432'&&url.pathname==='/rik_r4_runtime_b5_v2','EXACT_ROOT_LOCAL_DATABASE_REQUIRED');
  return{client:new Client({connectionString:secret,connectionTimeoutMillis:5000,options:'-c TimeZone=UTC'}),url};}
const actorSql=`select current_user::text actor,session_user::text session_actor,current_database() database_name,
 pg_backend_pid() backend_pid,current_setting('transaction_isolation') isolation,current_setting('transaction_read_only') read_only,
 current_setting('TimeZone') timezone,pg_current_snapshot()::text rr_snapshot`;
function actor(value:unknown,url:URL,phase:'RR'|'RC'){assert(object(value));assert.equal(value.actor,decodeURIComponent(url.username));assert.equal(value.session_actor,value.actor);
  assert.equal(value.database_name,'rik_r4_runtime_b5_v2');assert.equal(value.timezone,'UTC');assert.equal(value.isolation,phase==='RR'?'repeatable read':'read committed');
  assert.equal(value.read_only,phase==='RR'?'on':'off');return value;}
function proposed(m:Record<string,unknown>){const currentFullParent=pin(m.currentFullParent);pinned(currentFullParent);assert.equal(currentFullParent.sha256,pack.actualParent.fullCaptureSha256);
  const counts={coreCallbacks:0,actualCompileCallbacks:0};const base=preparePanelReadyGridCurrentMasterR287({sourceRoot,currentFullParent,
    onCoreCall:()=>{counts.actualCompileCallbacks++;throw Error('READONLY_PANEL_FORMAL_FORBIDS_ACTUAL_COMPILE');}});
  const retained=base.binding.retainParentBindings;assert(retained,'EXACT_EXISTING_RETAINED_ROUTE_REQUIRED');assert.equal(base.catalogId,pack.catalogId);assert.equal(base.sourceId,pack.sourceId);
  assert(!Object.hasOwn(base,'catalogAppend')&&!Object.hasOwn(base,'capturedScopedNormativeRegistry')&&!Object.hasOwn(retained,'capturedSourcePreimage'),'EXACT_UNBOUND_BASE_CONFIG_REQUIRED');
  // This is a strict registration EXPECTATION, never an observed absence. The
  // native capture arm/resolver must reject an occupied key and preserve raw.
  const strict={...base,binding:{...base.binding,retainParentBindings:{...retained,capturedSourcePreimage:{sourceKey:pack.sourceId,expected:null}}}};
  const {capturedSourcePreimage:_onlyAdded,...originalRetained}=strict.binding.retainParentBindings;
  assert.deepEqual({...strict,binding:{...strict.binding,retainParentBindings:originalRetained}},base,'INVERSE_REMOVE_EXACTLY_ONE_CAPTURED_SOURCE_PREIMAGE_EQUALS_WHOLE_BASE');
  const config={...strict,verifyCore:async()=>{counts.coreCallbacks++;throw Error('READONLY_PANEL_FORMAL_FORBIDS_CORE_CALLBACK');}};
  assert.equal(config.verifyTargetPrecondition,base.verifyTargetPrecondition,'ORIGINAL_SOURCE_PPR_QUOTE_TARGET_HOLD_RETAINED');
  const generated=buildMasterSingleDefinitionGeneratedRegistryRowsR1({config,resolvedSourceMetadata:config.sourceMetadata,
    resolvedLocators:[{key:config.locator.key,payload:config.locator.payload,excerptSha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}],projectSourcePackage:null,projectSourcePackageSet:null});
  const captureInput:MasterScopedNormativeRegistryInputR1={config:{stopCode:config.stopCode,normId:config.normId,
      binding:{retainParentBindings:{capturedSourcePreimage:strict.binding.retainParentBindings.capturedSourcePreimage}}},...generated};
  const sourcePathPins=[...config.sourcePaths,'scripts/estimate/r4a13/panelReadyGridFormalNormalLockedR287.test.ts'].map(logicalPath=>{
    const absolute=path.resolve(sourceRoot,logicalPath),relative=path.relative(sourceRoot,absolute);assert(!relative.startsWith('..')&&!path.isAbsolute(relative));return{logicalPath,path:absolute,sha256:sha(fs.readFileSync(absolute))};});
  const proposal={status:'PROPOSED_ROWS_NOT_ACTUAL_DB',pendingActualAbsence:true,unknownBeforeSql:true,generatedIdsAreActualDbIds:false,
    captureInput,parent:{catalogId:pack.catalogId,definitionId:pack.actualParent.definitionId,definitionSha256:pack.actualParent.definitionSha256,
      baselineId:pack.actualParent.baselineId,captureFileSha256:currentFullParent.sha256,capturedParentSha256:masterRetainedParentCaptureSha256R1(retained.capturedParent)},sourcePathPins};
  return{config,generated,captureInput,proposal,counts};}
/** Same structural narrowing as accepted PSU4ade. Return the original pinned
 * formal object; no R249 conversion, source oracle or make-capture call. */
function formalFile(value:Pin):MasterCapturedScopedNormativeRegistryR1{const parsed:unknown=JSON.parse(pinned(value).toString('utf8'));
  const source=(row:unknown)=>object(row)&&typeof row.id==='string'&&typeof row.sourceKey==='string'&&typeof row.raw==='string'&&(row.managedMatches===null||typeof row.managedMatches==='boolean');
  const locator=(row:unknown)=>object(row)&&typeof row.id==='string'&&typeof row.sourceId==='string'&&typeof row.locatorKey==='string'&&typeof row.raw==='string'
    &&Array.isArray(row.normIds)&&row.normIds.every(id=>id===null||typeof id==='string')&&(row.managedMatches===null||typeof row.managedMatches==='boolean');
  function shape(row:unknown):row is MasterCapturedScopedNormativeRegistryR1{return object(row)&&row.contract==='master-scoped-normative-registry-preimage/r1'
    &&row.projection==='pg-jsonb-text-utc-microseconds/r1'&&typeof row.captureSha256==='string'&&object(row.scope)&&typeof row.scope.artifactSha256==='string'
    &&typeof row.scope.normId==='string'&&typeof row.scope.sourceKey==='string'&&typeof row.scope.generatedSourceId==='string'&&strings(row.scope.generatedLocatorIds)&&strings(row.scope.generatedLocatorKeys)
    &&Array.isArray(row.sourceRows)&&row.sourceRows.every(source)&&Array.isArray(row.locatorRows)&&row.locatorRows.every(locator);}
  assert(shape(parsed),'GENUINE_FORMAL_FILE_STRUCTURAL_CONTRACT');return parsed;}
function bindClosedStage(m:Record<string,unknown>,prepared:ReturnType<typeof proposed>){const first=formalFile(pin(m.actualFormalCapturePin)),second=formalFile(pin(m.actualFormalSecondCapturePin));
  assert.deepEqual(second,first,'TWO_GENUINE_FORMAL_FILES_BYTE_VALUE_EQUAL');
  const governor:unknown=JSON.parse(pinned(pin(m.actualFormalGovernorReceipt)).toString('utf8'));assert(object(governor));assert.equal(governor.status,'EXPECTED_OUTCOME_AND_CLEAN_CLOSURE');
  assert.equal(governor.error,null);assert.equal(governor.exitCode,0);assert.deepEqual(governor.remainingOwnedProcesses,[]);assert.deepEqual(governor.sourceDrift,[]);
  assert(Array.isArray(governor.ownedPids)&&governor.ownedPids.length>0);assert(typeof governor.elapsedSeconds==='number'&&Number.isFinite(governor.elapsedSeconds)&&governor.elapsedSeconds>0);
  const receipt:unknown=JSON.parse(pinned(pin(m.actualFormalReadReceipt)).toString('utf8'));assert(object(receipt));assert.equal(receipt.status,'READONLY_CAPTURED_PREIMAGE_NOT_ADMISSION');
  assert.equal(receipt.failure,null);assert.equal(receipt.rollback,true);assert.equal(receipt.databaseWrites,0);assert.equal(receipt.capturedRawTwice,true);assert.equal(receipt.globalAbsenceProved,false);
  assert.equal(receipt.coreCallbacks,0);assert.equal(receipt.actualCompileCallbacks,0);assert.equal(receipt.unknownBeforeSql,true);assert.equal(receipt.pendingActualAbsence,false);assert.equal(receipt.exactEmittedScopeExpectationMatched,true);
  assert.equal(receipt.activationAllowed,false);assert.equal(receipt.sourcePprApproval,false);assert.equal(receipt.FULL,false);assert.equal(receipt.generatedIdentityStatus,'GENERATED_CANDIDATE_NOT_DB_ID');
  assert.equal(receipt.sourceKey,first.scope.sourceKey);assert.equal(receipt.scopeArtifact,first.scope.artifactSha256);assert.equal(receipt.firstCaptureSha256,first.captureSha256);
  assert.equal(receipt.sourceRows,first.sourceRows.length);assert.equal(receipt.locatorRows,first.locatorRows.length);assert.equal(receipt.generatedSourceId,first.scope.generatedSourceId);
  assert.deepEqual(first.scope.generatedLocatorIds,prepared.generated.newLocators.map(row=>row.id));assert.equal(receipt.generatedLocatorId,first.scope.generatedLocatorIds[0]);
  assert.equal(receipt.parentCaptureFileSha256,pack.actualParent.fullCaptureSha256);assert(object(receipt.actor));assert.equal(receipt.actor.isolation,'repeatable read');assert.equal(receipt.actor.read_only,'on');assert.equal(receipt.actor.timezone,'UTC');
  for(const key of ['actor','session_actor','database_name','rr_snapshot']){const value=receipt.actor[key];assert(typeof value==='string'&&value.length>0);}
  assert(Array.isArray(receipt.queryEvidence)&&receipt.queryEvidence.length>=4);for(const evidence of receipt.queryEvidence)pinned(pin(evidence));
  const proposal:unknown=JSON.parse(pinned(pin(m.proposedCapturePin)).toString('utf8'));assert.equal(stable(proposal),stable(prepared.proposal),'EXACT_PROPOSED_BODY_SOURCE_PATH_PINS_AND_PARENT');
  const config={...prepared.config,capturedScopedNormativeRegistry:first};const scoped=resolveMasterScopedNormativeRegistryOptInR1({config,...prepared.generated});assert(scoped);
  return{config,scoped};}
const failureOf=(error:unknown)=>({name:error instanceof Error?error.name:'Error',message:error instanceof Error?error.message:String(error)});
jest.setTimeout(110000);
it('phase1 same current v5 panel strict expectation actual full scoped RR capture twice rollback core0',async()=>{
  const m=manifest(),out=output(),prepared=proposed(m);out.save('PROPOSED_CAPTURE_INPUT_R287.json',prepared.proposal);
  const {client,url}=connection(),tracked=journal(client,out,false),c=tracked.client;let connected=false,rollback=false;
  let first:MasterCapturedScopedNormativeRegistryR1|null=null,second:MasterCapturedScopedNormativeRegistryR1|null=null,identity:Record<string,unknown>|null=null,failure:ReturnType<typeof failureOf>|null=null;
  try{await client.connect();connected=true;await c.query('begin isolation level repeatable read read only');await c.query("set local timezone='UTC'");await c.query("set local statement_timeout='10000ms'");await c.query("set local lock_timeout='5000ms'");
    identity=actor((await c.query(actorSql)).rows[0],url,'RR');
    first=await captureMasterScopedNormativeRegistryPreimageR1(c,prepared.captureInput);out.save('SCOPED_REGISTRY_CAPTURE_FIRST_R287.json',first);
    assert.deepEqual(actor((await c.query(actorSql)).rows[0],url,'RR'),identity);
    second=await captureMasterScopedNormativeRegistryPreimageR1(c,prepared.captureInput);out.save('SCOPED_REGISTRY_CAPTURE_SECOND_R287.json',second);assert.deepEqual(second,first);
    assert(resolveMasterScopedNormativeRegistryOptInR1({...prepared.captureInput,config:{...prepared.captureInput.config,capturedScopedNormativeRegistry:first}}));
  }catch(error:unknown){failure=failureOf(error);out.save('FIRST_FAILURE_R287.json',failure);}
  finally{if(connected){try{await c.query('rollback');rollback=true;}catch(error:unknown){failure??=failureOf(error);}}await client.end();}
  const locator=prepared.generated.newLocators[0];assert(locator);
  out.save('READONLY_PREIMAGE_OUTCOME_R287.json',{status:failure?'HOLD_CAPTURE_NOT_ADMITTED':'READONLY_CAPTURED_PREIMAGE_NOT_ADMISSION',failure,rollback,databaseWrites:0,actor:identity,
    sourceKey:prepared.generated.newSource.source_key,scopeArtifact:prepared.generated.newSource.artifact_sha256,generatedIdentityStatus:'GENERATED_CANDIDATE_NOT_DB_ID',
    generatedSourceId:prepared.generated.newSource.id,generatedLocatorId:locator.id,firstCaptureSha256:first?.captureSha256??null,sourceRows:first?.sourceRows.length??null,locatorRows:first?.locatorRows.length??null,
    capturedRawTwice:first!==null&&second!==null,globalAbsenceProved:false,pendingActualAbsence:failure!==null,unknownBeforeSql:true,exactEmittedScopeExpectationMatched:failure===null&&rollback,
    parentCaptureFileSha256:pack.actualParent.fullCaptureSha256,queryEvidence:tracked.evidence,...prepared.counts,activationAllowed:false,sourcePprApproval:false,FULL:false});
  assert(rollback);assert.deepEqual(prepared.counts,{coreCallbacks:0,actualCompileCallbacks:0});if(failure)throw Error(failure.message);
});
it('phase2 same current v5 panel closed formal capture NORMAL existing locks full LOCKED unchanged rollback core0',async()=>{
  const m=manifest(),out=output(),prepared=proposed(m),bound=bindClosedStage(m,prepared),fullInput={config:bound.config,...prepared.generated},retained=masterRetainParentBindingsOptInR1(fullInput);assert(retained);
  out.save('CONSTRUCTED_BEFORE_NORMAL_R287.json',{status:'CONSTRUCTED_NOT_PUBLISHED',catalogId:bound.config.catalogId,currentVersion:5,nativeShape:[30,112,112],
    proposedShape:[bound.config.parameterDefinitions.length,bound.config.formulaDefinitions.length,bound.config.resourceDefinitions.length],retainedBindings:25,retainedSources:2,
    formalScope:bound.scoped.declaration.scope,sourcePprApproval:false,priceScope:'HOLD',targetGuardRetained:true,FULL:false});
  const {client,url}=connection(),tracked=journal(client,out,true),c=tracked.client;let connected=false,rollback=false,normal=false,locked=false,failure:ReturnType<typeof failureOf>|null=null;
  try{await client.connect();connected=true;await c.query('begin isolation level read committed');await c.query("set local timezone='UTC'");await c.query("set local statement_timeout='10000ms'");await c.query("set local lock_timeout='5000ms'");
    actor((await c.query(actorSql)).rows[0],url,'RC');
    const before=await readMasterRetainedBindingPreconditionsR1(c,fullInput);out.save('NORMAL_RETAINED_FULL_SNAPSHOT_R287.json',before);
    const sourceBefore=await readMasterScopedNormativeRegistryPreconditionsR1(c,bound.scoped,'BEFORE');out.save('NORMAL_SCOPED_FULL_SNAPSHOT_R287.json',sourceBefore);normal=true;
    await lockMasterRetainedBindingPreconditionsR1(c,fullInput);
    const after=await readMasterRetainedBindingPreconditionsR1(c,fullInput);out.save('LOCKED_RETAINED_FULL_SNAPSHOT_R287.json',after);
    const sourceAfter=await readMasterScopedNormativeRegistryPreconditionsR1(c,bound.scoped,'LOCKED_BEFORE');out.save('LOCKED_SCOPED_FULL_SNAPSHOT_R287.json',sourceAfter);
    assertMasterRetainedBindingPreflightUnchangedR1(fullInput,before,after);assertMasterScopedNormativeRegistryUnchangedR1(bound.scoped,sourceBefore,sourceAfter);locked=true;
  }catch(error:unknown){failure=failureOf(error);out.save('FIRST_FAILURE_R287.json',failure);}
  finally{if(connected){try{await c.query('rollback');rollback=true;}catch(error:unknown){failure??=failureOf(error);}}await client.end();}
  out.save('NORMAL_LOCKED_ROLLBACK_CORE0_OUTCOME_R287.json',{status:failure?'HOLD_FIRST_FAILURE':'PASS_EXISTING_PANEL_NORMAL_LOCKED_GUARDS_NOT_PUBLISHER',failure,
    normalRetainedAndScopedCompleted:normal,lockedRetainedAndScopedCompleted:locked,rollback,databaseWrites:0,queryEvidence:tracked.evidence,...prepared.counts,
    transaction:'READ_COMMITTED_READ_WRITE_FOR_EXISTING_LOCKS_NO_DML',verifyCore:'THROWS_IF_CALLED',sourceOrProjectApproval:false,priceStockInstallation:'HOLD',publication:0,FULL:false});
  assert(rollback);assert.deepEqual(prepared.counts,{coreCallbacks:0,actualCompileCallbacks:0});if(failure)throw Error(failure.message);
});
