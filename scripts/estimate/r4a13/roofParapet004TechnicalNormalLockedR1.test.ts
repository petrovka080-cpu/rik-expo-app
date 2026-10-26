import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {Client} from 'pg';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {prepareRoofParapet004TechnicalCaptureInputR294,prepareRoofParapet004TechnicalWholeR294,
  type RoofParapet004TechnicalPreparationR294 as Preparation} from './prepareRoofParapet004TechnicalWholeR294';
import {resolveMasterScopedNormativeRegistryOptInR1,readMasterScopedNormativeRegistryPreconditionsR1,
  assertMasterScopedNormativeRegistryUnchangedR1,type MasterCapturedScopedNormativeRegistryR1 as Formal} from './masterScopedNormativeRegistryPreimageR1';
import {masterRetainParentBindingsOptInR1,readMasterRetainedBindingPreconditionsR1,lockMasterRetainedBindingPreconditionsR1,
  assertMasterRetainedBindingPreflightUnchangedR1,masterRetainedParentCaptureSha256R1} from './masterSingleDefinitionRetainParentBindingsR1';

type Json=Record<string,unknown>;type Pin=Readonly<{path:string;sha256:string}>;
type Five=Readonly<{first:Pin;second:Pin;semanticReceipt:Pin;closedGovernorReceipt:Pin;proposedInput:Pin}>;
type Bound=Readonly<{contract:'roof-parapet004-real-bound-finite-inputs/r296';currentFullParent:Pin;
  host:Preparation['host'];source:Preparation['source'];sourcePaths:readonly string[];actual:Five}>;
type Gate=Readonly<{contract:'roof-parapet004-normal-locked-inputs/r1';finiteBoundInput:Pin;actual:Five;sourceOrigins:Pin;
  finiteRootResult:Pin;finiteGovernorReceipt:Pin;finiteJest:Pin;finiteFinalRaw:Pin;independentFiniteAudit:Pin;actualFullTypes:Pin;architectureGovernorReceipt:Pin;architectureJest:Pin}>;
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
function pin(v:unknown):v is Pin{return object(v)&&typeof v.path==='string'&&path.isAbsolute(v.path)&&typeof v.sha256==='string'&&/^[a-f0-9]{64}$/u.test(v.sha256);}
function bytes(p:Pin){assert(fs.statSync(p.path).size<=4*1024*1024,'BOUNDED_PARSED_INPUT');const b=fs.readFileSync(p.path);assert.equal(sha(b),p.sha256,'PIN_DRIFT:'+p.path);return b;}
function read(p:Pin):unknown{return JSON.parse(bytes(p).toString('utf8'));}
function five(v:unknown):v is Five{return object(v)&&Object.keys(v).length===5&&['first','second','semanticReceipt','closedGovernorReceipt','proposedInput'].every(k=>pin(v[k]));}
function gate(v:unknown):v is Gate{return object(v)&&v.contract==='roof-parapet004-normal-locked-inputs/r1'&&five(v.actual)
  &&['finiteBoundInput','sourceOrigins','finiteRootResult','finiteGovernorReceipt','finiteJest','finiteFinalRaw','independentFiniteAudit','actualFullTypes','architectureGovernorReceipt','architectureJest'].every(k=>pin(v[k]));}
function bound(v:unknown):v is Bound{
  if(!object(v)||v.contract!=='roof-parapet004-real-bound-finite-inputs/r296'||!pin(v.currentFullParent)||!object(v.host)||!object(v.source)||!strings(v.sourcePaths)||!five(v.actual))return false;
  const h=v.host,s=v.source,m=s.sourceMetadata,l=s.locator;
  return ['expectedBranch','masterPath','masterSha256','parentReleaseId','parentSearchReleaseId','currentReleasePath','outputRoot'].every(k=>typeof h[k]==='string')&&typeof h.benchmarkOrdinal==='number'
    &&typeof s.sourceKey==='string'&&!!s.sourceKey.trim()&&object(m)&&['source_title','source_authority','exact_locator','use_restriction'].every(k=>typeof m[k]==='string'&&!!String(m[k]).trim())
    &&(m.source_kind===undefined||typeof m.source_kind==='string')&&['official_url','artifact_sha256','effective_from'].every(k=>m[k]===undefined||m[k]===null||typeof m[k]==='string')
    &&object(l)&&typeof l.key==='string'&&!!l.key.trim()&&object(l.payload)&&(l.excerptSha256===undefined||typeof l.excerptSha256==='string');
}
function formal(v:unknown):v is Formal{
  if(!object(v)||v.contract!=='master-scoped-normative-registry-preimage/r1'||v.projection!=='pg-jsonb-text-utc-microseconds/r1'||!object(v.scope)||typeof v.captureSha256!=='string')return false;
  const s=v.scope;return ['artifactSha256','normId','sourceKey','generatedSourceId'].every(k=>typeof s[k]==='string')&&strings(s.generatedLocatorIds)&&strings(s.generatedLocatorKeys)
    &&Array.isArray(v.sourceRows)&&v.sourceRows.every(r=>object(r)&&typeof r.id==='string'&&typeof r.sourceKey==='string'&&typeof r.raw==='string'&&(r.managedMatches===null||typeof r.managedMatches==='boolean'))
    &&Array.isArray(v.locatorRows)&&v.locatorRows.every(r=>object(r)&&typeof r.id==='string'&&typeof r.sourceId==='string'&&typeof r.locatorKey==='string'&&typeof r.raw==='string'
      &&Array.isArray(r.normIds)&&r.normIds.every(n=>n===null||typeof n==='string')&&(r.managedMatches===null||typeof r.managedMatches==='boolean'));
}
function closed(v:unknown){assert(object(v)&&v.status==='EXPECTED_OUTCOME_AND_CLEAN_CLOSURE'&&v.exitCode===0&&v.error===null);
  assert.deepEqual(v.remainingOwnedProcesses,[]);assert.deepEqual(v.sourceDrift,[]);
  assert.deepEqual(v.policy,{admissionMiB:4096,rssMiB:1024,privateMiB:1024,osStopMiB:3072,timeoutSeconds:120});}
function fingerprint(p:string,expectedBytes:number,expectedSha:string){
  assert(Number.isSafeInteger(expectedBytes)&&expectedBytes>=0);const chunk=Buffer.allocUnsafe(Math.max(1,Math.min(expectedBytes,1024*1024))),h=createHash('sha256'),fd=fs.openSync(p,'r');
  try{assert.equal(fs.fstatSync(fd).size,expectedBytes);let total=0;while(total<expectedBytes){const n=fs.readSync(fd,chunk,0,Math.min(chunk.length,expectedBytes-total),null);assert(n>0);h.update(chunk.subarray(0,n));total+=n;}
    assert.equal(fs.readSync(fd,chunk,0,1,null),0);assert.equal(fs.fstatSync(fd).size,expectedBytes);assert.equal(h.digest('hex'),expectedSha,'EXACT_FAMILY_SOURCE:'+p);
  }finally{fs.closeSync(fd);}
}
function output(){const dir=process.env.PARAPET004_NORMAL_LOCKED_RAW_R1;assert(dir&&path.isAbsolute(dir)&&!fs.existsSync(dir),'FRESH_OWNED_RAW_OUTPUT');fs.mkdirSync(dir,{recursive:true});
  const saveBytes=(name:string,b:Buffer)=>{assert(b.length<=4*1024*1024,'LOCAL_RAW_CAP:'+name);const p=path.join(dir,name);fs.writeFileSync(p,b,{flag:'wx'});return{path:p,sha256:sha(b),bytes:b.length};};
  return{dir,bytes:saveBytes,save:(name:string,v:unknown)=>saveBytes(name,Buffer.from(JSON.stringify(v,null,2)+'\n'))};}
type Out=ReturnType<typeof output>;
// Instrumentation only; all parent/source/locator SQL and locks belong to the
// existing shared readers. No second query reader or calculation is defined.
function journal(client:Client,out:Out){const evidence:ReturnType<Out['save']>[]=[];
  const c=new Proxy(client,{get(target,key,receiver){if(key!=='query')return Reflect.get(target,key,receiver);
    return async(text:unknown,values:unknown=[])=>{assert(typeof text==='string'&&Array.isArray(values));assert(/^\s*(?:select|with|begin|set local|show|lock table|rollback)\b/iu.test(text),'NO_DML_OR_PUBLISHER_SQL');
      const result=await target.query(text,values),index=evidence.length+1;
      const rows=result.rows.map((row:unknown,ri:number)=>{assert(object(row));return Object.fromEntries(Object.entries(row).map(([k,v])=>[k,typeof v==='string'?{kind:'PG_TEXT',...out.bytes(`query-${index}-row-${ri}-${k}.txt`,Buffer.from(v))}:v]));});
      evidence.push(out.save(`query-${index}.json`,{text,values,command:result.command,rowCount:result.rowCount,rows}));return result;};}});return{client:c,evidence};}
function retainedIndex(snapshot:Awaited<ReturnType<typeof readMasterRetainedBindingPreconditionsR1>>){const c=snapshot.capture;
  return{kind:'BOUNDED_INDEX_FULL_NATIVE_SQL_TEXT_IN_QUERY_JOURNAL',captureSha256:masterRetainedParentCaptureSha256R1(c),
    definitionId:c.definition.id,definitionSha256:c.definition.definition_sha256,baselineId:c.baseline.id,
    counts:{parameters:c.parameters.length,formulas:c.formulas.length,resources:c.resources.length,bindings:c.bindings.length,sources:c.normativeSources.length,locators:c.normativeLocators.length},
    oldParameterSourceArrays:c.baseline.normative_source_ids,fullSnapshotStableSha256:sha(Buffer.from(stable(snapshot))),newSources:snapshot.newSources,newLocators:snapshot.newLocators};}

jest.setTimeout(110000);
it('requires actual capture five pins and finite10 PASS, then checks existing technical004 NORMAL and LOCKED guards with rollback core0',async()=>{
  const sourceRoot=path.resolve(__dirname,'../../..');assert.equal(process.env.PARAPET004_NORMAL_LOCKED_SOURCE_ROOT_R1,sourceRoot,'ONE_ROOT_SOURCE_ONLY');
  const manifest=process.env.PARAPET004_NORMAL_LOCKED_INPUT_R1,manifestSha=process.env.PARAPET004_NORMAL_LOCKED_INPUT_SHA_R1;
  assert(manifest&&manifestSha,'ACTUAL_ROOT_BINDING_REQUIRED_UNRUN_WITHOUT_CAPTURE_AND_FINITE_PASS');
  const input:unknown=read({path:manifest,sha256:manifestSha});assert(gate(input),'ROOT_GATE_INPUT_SHAPE');
  const boundInput:unknown=read(input.finiteBoundInput);assert(bound(boundInput),'ORIGINAL_FINITE_BOUND_INPUT');assert.deepEqual(input.actual,boundInput.actual,'SAME_ACTUAL_FIVE_PINS');
  for(const p of Object.values(input.actual))bytes(p);closed(read(input.actual.closedGovernorReceipt));
  const first=bytes(input.actual.first),second=bytes(input.actual.second);assert(first.equals(second));const actual:unknown=JSON.parse(first.toString('utf8'));assert(formal(actual));
  const semantic=read(input.actual.semanticReceipt);assert(object(semantic)&&semantic.status==='READONLY_CAPTURED_PREIMAGE_NOT_ADMISSION'&&semantic.failure===null&&semantic.rollback===true&&semantic.databaseWrites===0&&semantic.actualCoreCallbacks===0&&semantic.capturedRawTwice===true);
  assert(object(semantic.actor)&&semantic.actor.isolation==='repeatable read'&&semantic.actor.read_only==='on'&&semantic.actor.timezone==='UTC');
  assert.equal(semantic.firstCaptureSha256,actual.captureSha256);assert.equal(semantic.generatedIdentityStatus,'GENERATED_CANDIDATE_NOT_DB_ID');
  assert.equal(semantic.sourceKey,boundInput.source.sourceKey);assert.equal(semantic.scopeArtifact,'114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8');
  assert.deepEqual(semantic.officialColumns,['12-01-004-02','12-01-004-03']);assert(Array.isArray(semantic.queryEvidence)&&semantic.queryEvidence.length===14&&semantic.queryEvidence.every(pin));
  const captureStage=path.dirname(input.actual.closedGovernorReceipt.path);
  for(const p of [input.actual.first,input.actual.second,input.actual.semanticReceipt,input.actual.proposedInput,...semantic.queryEvidence]){assert(pin(p));bytes(p);const rel=path.relative(captureStage,p.path);assert(rel&&!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep));}
  const root=read(input.finiteRootResult),finite=read(input.finiteFinalRaw),j=read(input.finiteJest),audit=read(input.independentFiniteAudit),types=read(input.actualFullTypes);
  closed(read(input.finiteGovernorReceipt));assert(object(root)&&root.status==='PASS_ACTUAL_PARAPET_GENUINE_CAPTURE_ORDINARY_CONFIG_FINITE10_PENDING_INDEPENDENT_RAW'&&pin(root.actualFinite));assert.deepEqual(root.actualFinite,{...input.finiteFinalRaw,bytes:bytes(input.finiteFinalRaw).length});
  assert(object(j)&&j.success===true&&j.numTotalTests===1&&j.numPassedTests===1&&j.numFailedTests===0&&j.numPendingTests===0);
  assert(Array.isArray(j.testResults)&&j.testResults.length===1&&object(j.testResults[0])&&j.testResults[0].status==='passed');
  assert(object(finite)&&finite.status==='FINITE_TEST_ONLY_CORE_NOT_SOURCE_STOCK_PRICE_OR_PROJECT_ADMISSION'&&finite.actualEntries===10&&finite.actualResults===5&&finite.actualRejects===5&&finite.callbackCalls===1);
  assert(finite.legacyStrictEquality===true&&finite.old59===true&&finite.old57qPlus2===true&&finite.nativeMethods===2&&finite.nativeRowsPerMethod===15&&finite.unknownPhysical===22&&finite.DML===0&&finite.publication===0&&finite.FULL===false);
  assert(object(audit)&&audit.status==='PASS_INDEPENDENT_ACTUAL_PARAPET_CAPTURE_AND_FINITE10_RAW_AUDIT_NOT_ADMISSION'&&audit.actualEntries===10&&audit.actualResults===5&&audit.actualRejects===5&&audit.FULL===false&&pin(audit.finalCallbackRaw));
  assert.deepEqual(audit.finalCallbackRaw,{...input.finiteFinalRaw,bytes:bytes(input.finiteFinalRaw).length});
  assert(object(types)&&typeof types.status==='string'&&types.status.startsWith('PASS_ACTUAL_FULL_TYPES')&&types.actualDiagnostics===0);assert.deepEqual(types.sourceDrift,[]);assert.deepEqual(types.dependencyDrift,[]);assert.deepEqual(types.ownedRemaining,[]);
  assert.equal(input.sourceOrigins.sha256,'b069739bae7c9fa897d083fa4549da8dd2a231c771fa45bab1238786f93f1c09','EXACT_REVIEWED_SINGLE_ASSEMBLY_ID_LEAF_TRANSITION');
  assert.equal(input.architectureGovernorReceipt.sha256,'98f54238e91cd1044203fc123e8a9585588e6505b211b9a921bbc67e68173558');assert.equal(input.architectureJest.sha256,'f2ade91f33e7332f98a5f8d48f570996aac1861f69a7aab1728cb3be90b5ded6');
  closed(read(input.architectureGovernorReceipt));const architecture=read(input.architectureJest);
  assert(object(architecture)&&architecture.success===true&&architecture.numTotalTests===31&&architecture.numPassedTests===31&&architecture.numFailedTests===0&&architecture.numPendingTests===0
    &&architecture.numTotalTestSuites===4&&architecture.numPassedTestSuites===4&&architecture.numFailedTestSuites===0&&architecture.numPendingTestSuites===0);
  assert(Array.isArray(architecture.testResults)&&architecture.testResults.length===4&&architecture.testResults.every(r=>object(r)&&r.status==='passed'));

  const origins=read(input.sourceOrigins);assert(object(origins)&&object(origins.literalRelativeClosure));assert.equal(origins.contract,'roof-parapet004-exact-family-source-continuation/master219-r1');assert.equal(origins.allowAnyOtherSourceChange,false);assert.equal(Object.keys(origins.literalRelativeClosure).length,239);
  const sourcePaths:string[]=[];for(const [logical,v]of Object.entries(origins.literalRelativeClosure)){assert(object(v)&&typeof v.bytes==='number'&&typeof v.sha256==='string');assert(!path.isAbsolute(logical)&&!logical.split('/').includes('..'));
    const p=path.resolve(sourceRoot,logical);fingerprint(p,v.bytes,v.sha256);sourcePaths.push(p);}
  const pointer=path.join(sourceRoot,'data/estimate-benchmarks/r568-local-developer-canonical-release.json');bytes({path:pointer,sha256:'404bdb3657d36efb731f8131f63dc126e452f635579926d0f3855dbf749053f6'});
  const out=output(),preparation:Preparation={...boundInput,sourceRoot,
    host:{...boundInput.host,currentReleasePath:pointer,outputRoot:path.dirname(out.dir)},
    sourcePaths:[...sourcePaths,pointer,__filename,manifest,...Object.values(input.actual).map(p=>p.path),input.finiteBoundInput.path,input.finiteRootResult.path,input.finiteGovernorReceipt.path,input.finiteJest.path,input.finiteFinalRaw.path,input.independentFiniteAudit.path,input.actualFullTypes.path,input.sourceOrigins.path,input.architectureGovernorReceipt.path,input.architectureJest.path],
    verifyCore:async()=>{throw Error('NORMAL_LOCKED_PARAPET_FORBIDS_CORE_CALLBACK');},verifyTargetPrecondition:async()=>{throw Error('NORMAL_LOCKED_PARAPET_IS_NOT_FINAL_PUBLISHER_PERMISSION');}};
  const prepared=prepareRoofParapet004TechnicalCaptureInputR294(preparation),proposed=read(input.actual.proposedInput);assert.deepEqual(prepared.captureInput,proposed,'SAME_PUBLISHER_GENERATED_CANDIDATE_NOT_FUTURE_DB_IDS');
  const cfg=prepareRoofParapet004TechnicalWholeR294(preparation,actual),retained={config:cfg,newSource:prepared.captureInput.newSource,newLocators:prepared.captureInput.newLocators};
  const scoped=resolveMasterScopedNormativeRegistryOptInR1(retained);assert(scoped);const parent=masterRetainParentBindingsOptInR1(retained);assert(parent);
  assert.equal(cfg.catalogId,'canonical-work:base:roofing_interior_parapet_seal_technical_room');assert.equal(parent.capturedParent.definition.id,'f1b74df3-b99f-5ebb-a9e7-68fcfb51ab36');
  assert.equal(parent.capturedParent.definition.definition_version,3);assert.equal(parent.capturedParent.definition.definition_sha256,'c88a114dc3d8825441fad6a16a1e6e7e6d0cf8f8a6bca99e939d011e90720b78');
  assert.deepEqual([parent.capturedParent.parameters.length,parent.capturedParent.formulas.length,parent.capturedParent.resources.length],[1,59,59]);assert.equal(cfg.resourceDefinitions.length,111);
  assert.deepEqual(cfg.normId.split('/'),['12-01-004-02','12-01-004-03']);const boundRows=[cfg.binding.rowId,...(cfg.binding.additionalRowIds??[])];assert.equal(boundRows.length,30);assert.equal(new Set(boundRows).size,30);
  out.save('ORDINARY_CONFIG_CONSTRUCTED_BEFORE_DATABASE_GUARDS_R1.json',{status:'CONSTRUCTED_NOT_PUBLISHED',catalogId:cfg.catalogId,
    capturedParentSha256:parent.capturedParentSha256,parentDefinitionId:parent.capturedParent.definition.id,parentBaselineId:parent.capturedParent.baseline.id,
    parentShape:[1,59,59],composedShape:[cfg.parameterDefinitions.length,cfg.formulaDefinitions.length,cfg.resourceDefinitions.length],
    oldBindings:parent.capturedParent.bindings,oldParameterSourceArrays:parent.capturedParent.baseline.normative_source_ids,boundRows,
    formalScope:scoped.declaration.scope,formalCaptureSha256:scoped.declaration.captureSha256,proposedSource:retained.newSource,proposedLocators:retained.newLocators,
    candidateIdentityStatus:'GENERATED_CANDIDATE_NOT_DB_ID',requiredFinite10:input.finiteFinalRaw,coreCallbacks:0,sourceAdmission:false,publication:0,FULL:false});
  const secret=process.env.ESTIMATE_MIGRATION_DATABASE_URL;assert(secret,'ROOT_DATABASE_URL_IN_MEMORY_REQUIRED');const u=new URL(secret);assert(u.hostname==='127.0.0.1'&&u.port==='55432'&&u.pathname==='/rik_r4_runtime_b5_v2');
  const client=new Client({connectionString:secret,connectionTimeoutMillis:5000,options:'-c TimeZone=UTC'}),journaled=journal(client,out),c=journaled.client;
  let connected=false,rollback=false,normal=false,locked=false,failure:Readonly<{name:string;message:string}>|null=null;
  try{await client.connect();connected=true;await c.query('begin isolation level read committed');await c.query("set local timezone='UTC'");await c.query("set local statement_timeout='10000ms'");await c.query("set local lock_timeout='5000ms'");
    const actor=(await c.query(`select current_user::text actor,session_user::text session_actor,current_database() database_name,
      current_setting('transaction_isolation') isolation,current_setting('transaction_read_only') read_only,current_setting('TimeZone') timezone`)).rows[0];
    assert(object(actor));assert.equal(actor.actor,decodeURIComponent(u.username));assert.equal(actor.session_actor,actor.actor);assert.equal(actor.database_name,'rik_r4_runtime_b5_v2');
    assert.equal(actor.isolation,'read committed');assert.equal(actor.read_only,'off');assert.equal(actor.timezone,'UTC');out.save('ACTUAL_RC_LOCKS_ACTOR_R1.json',actor);
    const before=await readMasterRetainedBindingPreconditionsR1(c,retained);out.save('NORMAL_RETAINED_INDEX_R1.json',retainedIndex(before));
    const sourceBefore=await readMasterScopedNormativeRegistryPreconditionsR1(c,scoped,'BEFORE');out.save('NORMAL_SCOPED_FULL_SNAPSHOT_R1.json',sourceBefore);normal=true;
    await lockMasterRetainedBindingPreconditionsR1(c,retained);
    const after=await readMasterRetainedBindingPreconditionsR1(c,retained);out.save('LOCKED_RETAINED_INDEX_R1.json',retainedIndex(after));
    const sourceAfter=await readMasterScopedNormativeRegistryPreconditionsR1(c,scoped,'LOCKED_BEFORE');out.save('LOCKED_SCOPED_FULL_SNAPSHOT_R1.json',sourceAfter);
    assertMasterRetainedBindingPreflightUnchangedR1(retained,before,after);assertMasterScopedNormativeRegistryUnchangedR1(scoped,sourceBefore,sourceAfter);locked=true;
  }catch(e:unknown){failure={name:e instanceof Error?e.name:'Error',message:e instanceof Error?e.message:String(e)};out.save('FIRST_FAILURE_R1.json',failure);}
  finally{if(connected){try{await c.query('rollback');rollback=true;}catch(e:unknown){failure??={name:'RollbackError',message:e instanceof Error?e.message:String(e)};}}await client.end();}
  out.save('NORMAL_LOCKED_ROLLBACK_CORE0_OUTCOME_R1.json',{status:failure?'HOLD_FIRST_FAILURE':'PASS_ORDINARY_PARAPET004_NORMAL_LOCKED_GUARDS_NOT_PUBLISHER',failure,
    normalRetainedAndScopedCompleted:normal,lockedRetainedAndScopedCompleted:locked,rollback,databaseWrites:0,queryEvidence:journaled.evidence,
    transaction:'READ_COMMITTED_READ_WRITE_FOR_EXISTING_LOCKS_NO_DML',readOnlyTransactionClaim:false,coreCallbacks:0,verifyCore:'THROWS_IF_CALLED',
    priorFinite10:input.finiteFinalRaw,finite10Replay:0,sourceContinuation:input.sourceOrigins,actualArchitectureGovernor:input.architectureGovernorReceipt,actualArchitectureJest:input.architectureJest,legacy59AndFalse37:'PRESERVED_BY_PINNED_FACTORY_AND_EXISTING_RETAINED_GUARDS',
    unknownPhysical:22,sourceProjectStockInstallation:'HOLD',publication:0,FULL:false});
  assert(rollback,'ROLLBACK_REQUIRED');if(failure)throw Error(failure.message);
});
