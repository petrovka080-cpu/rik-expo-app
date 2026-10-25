import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {Client} from 'pg';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {prepareFireAlarmPsuFormalCaptureInputR24,prepareFireAlarmPsuCurrentMasterR24,
  type FireAlarmPsuCapturePreparationInputR24} from './prepareFireAlarmPsuCurrentMasterR24';
import {buildMasterSingleDefinitionGeneratedRegistryRowsR1,resolveMasterSingleDefinitionLocatorExcerptSha256R1} from './prepareMasterSingleDefinitionSuccessorR1';
import {captureMasterScopedNormativeRegistryPreimageR1,resolveMasterScopedNormativeRegistryOptInR1,
  readMasterScopedNormativeRegistryPreconditionsR1,assertMasterScopedNormativeRegistryUnchangedR1,
  type MasterCapturedScopedNormativeRegistryR1} from './masterScopedNormativeRegistryPreimageR1';
import {masterRetainParentBindingsOptInR1,readMasterRetainedBindingPreconditionsR1,
  lockMasterRetainedBindingPreconditionsR1,assertMasterRetainedBindingPreflightUnchangedR1} from './masterSingleDefinitionRetainParentBindingsR1';

type Pin=Readonly<{path:string;sha256:string}>;
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const sourceRoot=path.resolve(__dirname,'../../..');
function pin(v:unknown):Pin{assert(object(v)&&typeof v.path==='string'&&path.isAbsolute(v.path)&&typeof v.sha256==='string'&&/^[a-f0-9]{64}$/u.test(v.sha256));
  return{path:v.path,sha256:v.sha256};}
function pinned(p:Pin):Buffer{assert(fs.statSync(p.path).size<=4*1024*1024,'LOCAL_PINNED_INPUT_CAP');
  const b=fs.readFileSync(p.path);assert.equal(sha(b),p.sha256,'ACTUAL_INPUT_SHA:'+p.path);return b;}
function manifest(){const input=process.env.FIRE_PSU_FORMAL_INPUT_MANIFEST;assert(input&&path.isAbsolute(input));
  const v:unknown=JSON.parse(fs.readFileSync(input,'utf8'));assert(object(v));return v;}
function base(m:Record<string,unknown>):FireAlarmPsuCapturePreparationInputR24{
  assert.equal(m.sourceRoot,sourceRoot,'EXACT_RUNTIME_SOURCE_ROOT');
  return{sourceRoot,currentFullParent:pin(m.currentFullParent),currentReadReceipt:pin(m.currentReadReceipt),primaryManual:pin(m.primaryManual),
    primaryProductPage:pin(m.primaryProductPage),
    verifyCore:async()=>{throw Error('READONLY_FIRE_PSU_STAGE_FORBIDS_CORE_CALLBACK');},
    verifyTargetPrecondition:async()=>{throw Error('READONLY_FIRE_PSU_STAGE_IS_NOT_FINAL_PUBLISHER_PERMISSION');}};
}
/** Only the structural file boundary is narrowed here. The ORIGINAL object is
 * returned; no raw R249 conversion, make-capture or normative validator exists.
 * All scope/hash/closure/caps checks remain in the ordinary shared resolver. */
function formalFile(p:Pin):MasterCapturedScopedNormativeRegistryR1{
  const v:unknown=JSON.parse(pinned(p).toString('utf8'));
  const source=(r:unknown)=>object(r)&&typeof r.id==='string'&&typeof r.sourceKey==='string'&&typeof r.raw==='string'&&(r.managedMatches===null||typeof r.managedMatches==='boolean');
  const locator=(r:unknown)=>object(r)&&typeof r.id==='string'&&typeof r.sourceId==='string'&&typeof r.locatorKey==='string'&&typeof r.raw==='string'
    &&Array.isArray(r.normIds)&&r.normIds.every(n=>n===null||typeof n==='string')&&(r.managedMatches===null||typeof r.managedMatches==='boolean');
  function shape(x:unknown):x is MasterCapturedScopedNormativeRegistryR1{
    return object(x)&&x.contract==='master-scoped-normative-registry-preimage/r1'&&x.projection==='pg-jsonb-text-utc-microseconds/r1'
      &&typeof x.captureSha256==='string'&&object(x.scope)&&typeof x.scope.artifactSha256==='string'&&typeof x.scope.normId==='string'
      &&typeof x.scope.sourceKey==='string'&&typeof x.scope.generatedSourceId==='string'&&strings(x.scope.generatedLocatorIds)&&strings(x.scope.generatedLocatorKeys)
      &&Array.isArray(x.sourceRows)&&x.sourceRows.every(source)&&Array.isArray(x.locatorRows)&&x.locatorRows.every(locator);
  }
  assert(shape(v),'GENUINE_FORMAL_FILE_STRUCTURAL_CONTRACT');return v;
}
function output(){const dir=process.env.FIRE_PSU_FORMAL_RAW_DIR;assert(dir&&path.isAbsolute(dir)&&!fs.existsSync(dir),'FRESH_OWNED_OUTPUT_REQUIRED');
  fs.mkdirSync(dir,{recursive:true});const byteFile=(name:string,b:Buffer)=>{assert(b.length<=4*1024*1024,'R221_LOCAL_ARTIFACT_CAP:'+name);
    const p=path.join(dir,name);fs.writeFileSync(p,b,{flag:'wx'});return{path:p,sha256:sha(b),bytes:b.length};};
  return{byteFile,save:(name:string,v:unknown)=>byteFile(name,Buffer.from(JSON.stringify(v,null,2)+'\n'))};}
function connection(){const secret=process.env.ESTIMATE_MIGRATION_DATABASE_URL;assert(secret,'ROOT_DATABASE_URL_IN_MEMORY_REQUIRED');
  let u:URL;try{u=new URL(secret);}catch{throw Error('ROOT_DATABASE_URL_INVALID');}
  assert(u.hostname==='127.0.0.1'&&u.port==='55432'&&u.pathname==='/rik_r4_runtime_b5_v2','ROOT_EXACT_LOCAL_DATABASE_REQUIRED');
  return{client:new Client({connectionString:secret,connectionTimeoutMillis:5000,options:'-c TimeZone=UTC'}),u};}
type Journal=ReturnType<typeof output>;
/** R221 raw-before-assert instrumentation of the real PG Client. This proxy
 * does not implement a source reader: all table/scope SQL remains in the
 * existing retained/scoped owners. Only their actual TEXT calls are allowed. */
function journal(client:Client,out:Journal,allowLocks:boolean){
  const evidence:ReturnType<Journal['save']>[]=[];
  const c=new Proxy(client,{get(target,key,receiver){if(key!=='query')return Reflect.get(target,key,receiver);
    return async(text:unknown,values:unknown=[])=>{
      assert(typeof text==='string'&&Array.isArray(values),'EXISTING_TEXT_QUERY_SHAPE_ONLY');
      const allowed=allowLocks?/^\s*(?:select|with|begin|set local|show|lock table|rollback)\b/iu:/^\s*(?:select|with|begin|set local|rollback)\b/iu;
      assert(allowed.test(text),'NO_DML_OR_PUBLISHER_QUERY_ALLOWED');
      const result=await target.query(text,values),index=evidence.length+1;
      const rows=result.rows.map((row:unknown,ri:number)=>{assert(object(row));return Object.fromEntries(Object.entries(row).map(([k,v])=>[k,
        typeof v==='string'?{kind:'PG_TEXT',...out.byteFile(`query-${index}-row-${ri}-${k}.txt`,Buffer.from(v))}:v]));});
      evidence.push(out.save(`query-${index}.json`,{text,values,command:result.command,rowCount:result.rowCount,rows}));return result;
    };}});
  return{client:c,evidence};
}
const actorSql=`select current_user actor,current_user::text actor_text,session_user::text session_actor,
 current_database() database_name,pg_backend_pid() backend_pid,current_setting('transaction_isolation') isolation,
 current_setting('transaction_read_only') read_only,current_setting('TimeZone') timezone,
 pg_current_snapshot()::text rr_snapshot`;
// Existing R221 exact current-header query, unchanged caps/projection.
const parentSql=`with header as materialized(select m.definition_version_id::text definition_version_id,
 m.approved_template_baseline_id::text approved_template_baseline_id,d.definition_version,d.definition_sha256
 from public.estimate_cumulative_manifest_entry m join public.estimate_definition_version d on d.id=m.definition_version_id
 where m.release_id=$1 and m.catalog_id=$2 limit 2),
 wire as materialized(select row_to_json(header)::text raw from header),
 bounds as(select count(*)::int row_count,coalesce(max(octet_length(raw)),0)::int max_raw_bytes from wire)
 select row_count,max_raw_bytes,case when row_count=1 and max_raw_bytes<=524288
 then(select raw from wire)else null end raw from bounds`;
function actor(value:unknown,u:URL,mode:'RR_READONLY'|'RC_LOCKS'){assert(object(value));
  assert.equal(value.database_name,'rik_r4_runtime_b5_v2');assert.equal(value.actor_text,decodeURIComponent(u.username));assert.equal(value.session_actor,value.actor_text);
  assert.equal(value.isolation,mode==='RR_READONLY'?'repeatable read':'read committed');assert.equal(value.read_only,mode==='RR_READONLY'?'on':'off');
  assert.equal(value.timezone,'UTC');return value;}
async function currentHeader(c:Client,prepared:ReturnType<typeof prepareFireAlarmPsuFormalCaptureInputR24>){
  const rows=(await c.query(parentSql,['2df79e8d-4012-5557-87c0-f36285f59f17',prepared.parent.catalogId])).rows;
  assert.equal(rows.length,1);const row:unknown=rows[0];assert(object(row)&&row.row_count===1&&typeof row.max_raw_bytes==='number'&&row.max_raw_bytes<=524288&&typeof row.raw==='string','CURRENT_HEADER_PRETRANSFER_CAP');
  const h:unknown=JSON.parse(row.raw);assert(object(h));assert.equal(h.definition_version_id,prepared.parent.definitionId);assert.equal(h.approved_template_baseline_id,prepared.parent.baselineId);
  assert.equal(h.definition_sha256,prepared.parent.definitionSha256);assert.equal(h.definition_version,4);return row.raw;
}

jest.setTimeout(110000);
it('phase1 prepares proposed rows and captures twice in existing RR READONLY UTC with rollback core0',async()=>{
  const m=manifest(),out=output(),prepared=prepareFireAlarmPsuFormalCaptureInputR24(base(m));
  out.save('PROPOSED_CAPTURE_INPUT_R24.json',prepared); // Full generated rows BEFORE SQL, never actual DB identities.
  const {client,u}=connection(),j=journal(client,out,false),c=j.client;
  let connected=false,rollback=false,failure:Readonly<{name:string;message:string}>|null=null;
  let first:MasterCapturedScopedNormativeRegistryR1|null=null,second:MasterCapturedScopedNormativeRegistryR1|null=null,identity:Record<string,unknown>|null=null;
  try{
    await client.connect();connected=true;await c.query('begin isolation level repeatable read read only');
    await c.query("set local timezone='UTC'");await c.query("set local statement_timeout='10000ms'");
    identity=actor((await c.query(actorSql)).rows[0],u,'RR_READONLY');const before=await currentHeader(c,prepared);
    first=await captureMasterScopedNormativeRegistryPreimageR1(c,prepared.captureInput);out.save('SCOPED_REGISTRY_CAPTURE_FIRST_R24.json',first);
    const again=actor((await c.query(actorSql)).rows[0],u,'RR_READONLY');assert.deepEqual(again,identity);assert.equal(await currentHeader(c,prepared),before);
    second=await captureMasterScopedNormativeRegistryPreimageR1(c,prepared.captureInput);out.save('SCOPED_REGISTRY_CAPTURE_SECOND_R24.json',second);
    assert.deepEqual(second,first,'TWO_ACTUAL_FULL_RAW_CAPTURES_EQUAL');
    assert(resolveMasterScopedNormativeRegistryOptInR1({...prepared.captureInput,config:{...prepared.captureInput.config,capturedScopedNormativeRegistry:first}}));
  }catch(e:unknown){failure={name:e instanceof Error?e.name:'Error',message:e instanceof Error?e.message:String(e)};out.save('FIRST_FAILURE_R24.json',failure);}
  finally{if(connected){try{await c.query('rollback');rollback=true;}catch(e:unknown){failure??={name:'RollbackError',message:e instanceof Error?e.message:String(e)};}}await client.end();}
  const s=prepared.captureInput.newSource,l=prepared.captureInput.newLocators[0];assert(l);
  out.save('READONLY_PREIMAGE_OUTCOME_R24.json',{status:failure?'HOLD_CAPTURE_NOT_ADMITTED':'READONLY_CAPTURED_PREIMAGE_NOT_ADMISSION',failure,actor:identity,
    rollback,databaseWrites:0,sourceKey:s.source_key,generatedIdentityStatus:'GENERATED_CANDIDATE_NOT_DB_ID',generatedSourceId:s.id,generatedLocatorId:l.id,
    queryEvidence:j.evidence,firstCaptureSha256:first?.captureSha256??null,sourceRows:first?.sourceRows.length??null,locatorRows:first?.locatorRows.length??null,
    exactSubjectAbsenceObserved:failure===null&&rollback,globalAbsenceProved:false,capturedRawTwice:first!==null&&second!==null,scopeArtifact:s.artifact_sha256,
    parentScope:'EXACT_CURRENT_RELEASE_HEADER_TUPLE_ONLY_NOT_NEW_FULL_CAPTURE',normalLockedRegisteredRereads:'UNRUN',activationAllowed:false,sourcePprApproval:false,
    actualCoreCallbacks:0,finalPublisherFiniteVerification:'UNRUN_REQUIRED_SEPARATELY',priceGate:'UNRUN',FULL:false});
  assert(rollback,'ROLLBACK_REQUIRED');if(failure)throw Error(failure.message);
  console.log('FIRE_PSU_PHASE1_ACTUAL_CAPTURE_COMPLETE_CORE0');
});

it('phase2 binds genuine closed-stage captures and exercises existing normal locked guards with rollback core0',async()=>{
  const m=manifest(),out=output(),input=base(m);
  // ROOT creates and freezes these pins only AFTER phase1 governor has closed.
  const firstPin=pin(m.actualFormalCapturePin),secondPin=pin(m.actualFormalSecondCapturePin),receiptPin=pin(m.actualFormalReadReceipt),governorPin=pin(m.actualFormalGovernorReceipt);
  const proposedPin=pin(m.proposedCapturePin),proposed=prepareFireAlarmPsuFormalCaptureInputR24(input);
  const proposedFile:unknown=JSON.parse(pinned(proposedPin).toString('utf8'));assert.equal(stable(proposedFile),stable(proposed));
  const cfg=prepareFireAlarmPsuCurrentMasterR24({...input,proposedCapture:proposed,proposedCapturePin:proposedPin,
    actualFormalCapture:formalFile(firstPin),actualFormalCapturePin:firstPin,actualFormalSecondCapturePin:secondPin,
    actualFormalReadReceipt:receiptPin,actualFormalGovernorReceipt:governorPin});
  const generated=buildMasterSingleDefinitionGeneratedRegistryRowsR1({config:cfg,resolvedSourceMetadata:cfg.sourceMetadata,
    resolvedLocators:[{key:cfg.locator.key,payload:cfg.locator.payload,excerptSha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(cfg)}],projectSourcePackage:null,projectSourcePackageSet:null});
  const retained={config:cfg,...generated},scoped=resolveMasterScopedNormativeRegistryOptInR1(retained);assert(scoped);assert(masterRetainParentBindingsOptInR1(retained));
  out.save('ORDINARY_CONFIG_CONSTRUCTED_BEFORE_DATABASE_GUARDS_R24.json',{status:'CONSTRUCTED_NOT_PUBLISHED',catalogId:cfg.catalogId,
    nativeShape:[58,37,37],composedShape:[cfg.parameterDefinitions.length,cfg.formulaDefinitions.length,cfg.resourceDefinitions.length],coreCallbacks:0,
    capturedScope:scoped.declaration.scope,sourcePaths:cfg.sourcePaths,newPaidOwners:0,newProcurementOwners:0,sourceAdmission:false,FULL:false});
  const {client,u}=connection(),j=journal(client,out,true),c=j.client;
  let connected=false,rollback=false,normal=false,locked=false,failure:Readonly<{name:string;message:string}>|null=null;
  try{
    await client.connect();connected=true;
    // The existing lock guard REQUIRES READ COMMITTED and table locks. This
    // dedicated transaction is READ WRITE for locks, with NO DML path here.
    await c.query('begin isolation level read committed');await c.query("set local timezone='UTC'");await c.query("set local statement_timeout='10000ms'");
    actor((await c.query(actorSql)).rows[0],u,'RC_LOCKS');
    const before=await readMasterRetainedBindingPreconditionsR1(c,retained);out.save('NORMAL_RETAINED_SNAPSHOT_R24.json',before);
    const sourceBefore=await readMasterScopedNormativeRegistryPreconditionsR1(c,scoped,'BEFORE');out.save('NORMAL_SCOPED_SNAPSHOT_R24.json',sourceBefore);normal=true;
    await lockMasterRetainedBindingPreconditionsR1(c,retained);
    const after=await readMasterRetainedBindingPreconditionsR1(c,retained);out.save('LOCKED_RETAINED_SNAPSHOT_R24.json',after);
    const sourceAfter=await readMasterScopedNormativeRegistryPreconditionsR1(c,scoped,'LOCKED_BEFORE');out.save('LOCKED_SCOPED_SNAPSHOT_R24.json',sourceAfter);
    assertMasterRetainedBindingPreflightUnchangedR1(retained,before,after);assertMasterScopedNormativeRegistryUnchangedR1(scoped,sourceBefore,sourceAfter);locked=true;
  }catch(e:unknown){failure={name:e instanceof Error?e.name:'Error',message:e instanceof Error?e.message:String(e)};out.save('FIRST_FAILURE_R24.json',failure);}
  finally{if(connected){try{await c.query('rollback');rollback=true;}catch(e:unknown){failure??={name:'RollbackError',message:e instanceof Error?e.message:String(e)};}}await client.end();}
  out.save('NORMAL_LOCKED_ROLLBACK_CORE0_OUTCOME_R24.json',{status:failure?'HOLD_FIRST_FAILURE':'PASS_CONSTRUCTOR_AND_EXISTING_NORMAL_LOCKED_GUARDS_NOT_PUBLISHER',
    failure,normalRetainedAndScopedCompleted:normal,lockedRetainedAndScopedCompleted:locked,rollback,databaseWrites:0,queryEvidence:j.evidence,
    transaction:'READ_COMMITTED_READ_WRITE_FOR_EXISTING_LOCKS_NO_DML',coreCallbacks:0,verifyCore:'THROWS_IF_CALLED',
    finalPublisherFiniteVerification:'UNRUN_REQUIRED_SEPARATELY',sourceOrProjectApproval:false,priceStockInstallation:'HOLD',publication:0,FULL:false});
  assert(rollback,'ROLLBACK_REQUIRED');if(failure)throw Error(failure.message);
  console.log('FIRE_PSU_PHASE2_ACTUAL_NORMAL_LOCKED_ROLLBACK_CORE0_COMPLETE');
});
