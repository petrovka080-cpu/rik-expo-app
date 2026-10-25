import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {Client} from 'pg';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {loadRoofSingle539RealR224InputsR24} from './roofSingle539RealR224InputsR24';
import {prepareRoofSingle539WholeLayersR24} from './prepareRoofSingle539WholeLayersR24';
import {buildMasterSingleDefinitionGeneratedRegistryRowsR1,resolveMasterSingleDefinitionLocatorExcerptSha256R1} from './prepareMasterSingleDefinitionSuccessorR1';
import {resolveMasterScopedNormativeRegistryOptInR1,readMasterScopedNormativeRegistryPreconditionsR1,
  assertMasterScopedNormativeRegistryUnchangedR1} from './masterScopedNormativeRegistryPreimageR1';
import {masterRetainParentBindingsOptInR1,readMasterRetainedBindingPreconditionsR1,lockMasterRetainedBindingPreconditionsR1,
  assertMasterRetainedBindingPreflightUnchangedR1,masterRetainedParentCaptureSha256R1} from './masterSingleDefinitionRetainParentBindingsR1';
import links from '../../../data/estimate-benchmarks/source-packs/roof-single539-real-r224-source-inputs-r24.json';

type Json=Record<string,unknown>;
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const sourceRoot=path.resolve(__dirname,'../../..');
function output(){const dir=process.env.ROOF_SINGLE539_NORMAL_LOCKED_RAW_R293;
 assert(dir&&path.isAbsolute(dir)&&!fs.existsSync(dir),'FRESH_OWNED_RAW_OUTPUT_REQUIRED');fs.mkdirSync(dir,{recursive:true});
 const bytes=(name:string,b:Buffer)=>{assert(b.length<=4*1024*1024,'LOCAL_RAW_ARTIFACT_CAP:'+name);const p=path.join(dir,name);
  fs.writeFileSync(p,b,{flag:'wx'});return{path:p,sha256:sha(b),bytes:b.length};};
 return{dir,bytes,save:(name:string,v:unknown)=>bytes(name,Buffer.from(JSON.stringify(v,null,2)+'\n'))};}
type Out=ReturnType<typeof output>;
// Same full PG_TEXT/raw-before-assert instrumentation as actual FirePSU4ade.
// All normative/parent SQL, caps and validation stay in the existing owners.
function journal(client:Client,out:Out){const evidence:ReturnType<Out['save']>[]=[];
 const c=new Proxy(client,{get(target,key,receiver){if(key!=='query')return Reflect.get(target,key,receiver);
  return async(text:unknown,values:unknown=[])=>{
   assert(typeof text==='string'&&Array.isArray(values),'EXISTING_TEXT_QUERY_SHAPE_ONLY');
   assert(/^\s*(?:select|with|begin|set local|show|lock table|rollback)\b/iu.test(text),'NO_DML_OR_PUBLISHER_QUERY_ALLOWED');
   const result=await target.query(text,values),index=evidence.length+1;
   const rows=result.rows.map((row:unknown,ri:number)=>{assert(object(row));return Object.fromEntries(Object.entries(row).map(([k,v])=>[k,
    typeof v==='string'?{kind:'PG_TEXT',...out.bytes(`query-${index}-row-${ri}-${k}.txt`,Buffer.from(v))}:v]));});
   evidence.push(out.save(`query-${index}.json`,{text,values,command:result.command,rowCount:result.rowCount,rows}));return result;
  };}});return{client:c,evidence};}
function retainedIndex(snapshot:Awaited<ReturnType<typeof readMasterRetainedBindingPreconditionsR1>>){const c=snapshot.capture;
 // Complete per-query TEXT exists separately above. This explicitly labelled
 // bounded index is not a truncated replacement for the captured native rows.
 return{kind:'BOUNDED_INDEX_FULL_NATIVE_SQL_TEXT_IN_QUERY_JOURNAL',captureSha256:masterRetainedParentCaptureSha256R1(c),
  definitionId:c.definition.id,definitionSha256:c.definition.definition_sha256,baselineId:c.baseline.id,
  counts:{parameters:c.parameters.length,formulas:c.formulas.length,resources:c.resources.length,bindings:c.bindings.length,
   sources:c.normativeSources.length,locators:c.normativeLocators.length},oldParameterSourceArrays:c.baseline.normative_source_ids,
  fullSnapshotStableSha256:sha(Buffer.from(stable(snapshot))),newSources:snapshot.newSources,newLocators:snapshot.newLocators};}

jest.setTimeout(110000);
it('binds actual R224 formal scope31 to ordinary whole539 and checks existing NORMAL and LOCKED guards with rollback core0',async()=>{
 assert.equal(process.env.ROOF_SINGLE539_SOURCE_ROOT_R24,sourceRoot,'EXACT_SOURCE_ROOT');
 const out=output(),inputs=loadRoofSingle539RealR224InputsR24();
 const constructed=prepareRoofSingle539WholeLayersR24({releaseId:'2df79e8d-4012-5557-87c0-f36285f59f17',
  searchReleaseId:'9b042edf-ca06-50f6-969a-556e6d14547a',sourceRoot,outputRoot:path.dirname(out.dir)},
  {...inputs,record:(name,value)=>{out.save('constructor-'+name+'.json',value);}});
 const cfg={...constructed,verifyCore:async()=>{throw Error('READONLY_WHOLE539_GUARD_FORBIDS_CORE_CALLBACK');},
  verifyTargetPrecondition:async()=>{throw Error('READONLY_WHOLE539_GUARD_IS_NOT_FINAL_PUBLISHER_PERMISSION');}};
 const generated=buildMasterSingleDefinitionGeneratedRegistryRowsR1({config:cfg,resolvedSourceMetadata:cfg.sourceMetadata,
  resolvedLocators:[{key:cfg.locator.key,payload:cfg.locator.payload,excerptSha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(cfg)}],
  projectSourcePackage:null,projectSourcePackageSet:null});
 const candidateBytes=fs.readFileSync(links.actual.candidate.path);assert.equal(sha(candidateBytes),links.actual.candidate.sha256);
 const candidate:unknown=JSON.parse(candidateBytes.toString('utf8'));assert(object(candidate)&&candidate.status==='GENERATED_CANDIDATE_NOT_DB_ID'&&object(candidate.candidate));
 assert.deepEqual(generated.newSource,candidate.candidate.newSource,'EXACT_R224_PUBLISHER_GENERATED_SOURCE');
 assert.deepEqual(generated.newLocators,candidate.candidate.newLocators,'EXACT_R224_PUBLISHER_GENERATED_LOCATOR');
 const retained={config:cfg,...generated},scoped=resolveMasterScopedNormativeRegistryOptInR1(retained);assert(scoped);
 const parent=masterRetainParentBindingsOptInR1(retained);assert(parent);
 const bound=[cfg.binding.rowId,...(cfg.binding.additionalRowIds??[])];
 out.save('ORDINARY_CONFIG_CONSTRUCTED_BEFORE_DATABASE_GUARDS_R293.json',{status:'CONSTRUCTED_NOT_PUBLISHED',catalogId:cfg.catalogId,
  capturedParentSha256:parent.capturedParentSha256,parentDefinitionId:parent.capturedParent.definition.id,parentBaselineId:parent.capturedParent.baseline.id,
  parentShape:[parent.capturedParent.parameters.length,parent.capturedParent.formulas.length,parent.capturedParent.resources.length],
  composedShape:[cfg.parameterDefinitions.length,cfg.formulaDefinitions.length,cfg.resourceDefinitions.length],oldBindings:parent.capturedParent.bindings.length,
  oldParameterSourceArrays:parent.capturedParent.baseline.normative_source_ids,normColumns:cfg.normId.split('/'),boundRows:bound,
  formalScope:scoped.declaration.scope,formalCaptureSha256:scoped.declaration.captureSha256,
  proposedSource:generated.newSource,proposedLocators:generated.newLocators,candidateIdentityStatus:'GENERATED_CANDIDATE_NOT_DB_ID',
  coreCallbacks:0,sourceAdmission:false,publication:0,FULL:false});
 assert.equal(cfg.normId.split('/').length,31);assert.equal(bound.length,282);assert.equal(new Set(bound).size,282);
 assert.equal(cfg.resourceDefinitions.length,570);assert.equal(parent.capturedParent.parameters.length,152);assert.equal(parent.capturedParent.bindings.length,186);
 const secret=process.env.ESTIMATE_MIGRATION_DATABASE_URL;assert(secret,'ROOT_DATABASE_URL_IN_MEMORY_REQUIRED');const u=new URL(secret);
 assert(u.hostname==='127.0.0.1'&&u.port==='55432'&&u.pathname==='/rik_r4_runtime_b5_v2','ROOT_EXACT_LOCAL_DATABASE_REQUIRED');
 const client=new Client({connectionString:secret,connectionTimeoutMillis:5000,options:'-c TimeZone=UTC'}),j=journal(client,out),c=j.client;
 let connected=false,rollback=false,normal=false,locked=false,failure:Readonly<{name:string;message:string}>|null=null;
 try{await client.connect();connected=true;await c.query('begin isolation level read committed');await c.query("set local timezone='UTC'");
  await c.query("set local statement_timeout='10000ms'");await c.query("set local lock_timeout='5000ms'");
  const actor=(await c.query(`select current_user::text actor,session_user::text session_actor,current_database() database_name,
   current_setting('transaction_isolation') isolation,current_setting('transaction_read_only') read_only,current_setting('TimeZone') timezone`)).rows[0];
  assert(object(actor));assert.equal(actor.actor,decodeURIComponent(u.username));assert.equal(actor.session_actor,actor.actor);
  assert.equal(actor.database_name,'rik_r4_runtime_b5_v2');assert.equal(actor.isolation,'read committed');assert.equal(actor.read_only,'off');assert.equal(actor.timezone,'UTC');
  out.save('ACTUAL_RC_LOCKS_ACTOR_R293.json',actor);
  const before=await readMasterRetainedBindingPreconditionsR1(c,retained);out.save('NORMAL_RETAINED_INDEX_R293.json',retainedIndex(before));
  const sourceBefore=await readMasterScopedNormativeRegistryPreconditionsR1(c,scoped,'BEFORE');out.save('NORMAL_SCOPED_FULL_SNAPSHOT_R293.json',sourceBefore);normal=true;
  await lockMasterRetainedBindingPreconditionsR1(c,retained);
  const after=await readMasterRetainedBindingPreconditionsR1(c,retained);out.save('LOCKED_RETAINED_INDEX_R293.json',retainedIndex(after));
  const sourceAfter=await readMasterScopedNormativeRegistryPreconditionsR1(c,scoped,'LOCKED_BEFORE');out.save('LOCKED_SCOPED_FULL_SNAPSHOT_R293.json',sourceAfter);
  assertMasterRetainedBindingPreflightUnchangedR1(retained,before,after);assertMasterScopedNormativeRegistryUnchangedR1(scoped,sourceBefore,sourceAfter);locked=true;
 }catch(e:unknown){failure={name:e instanceof Error?e.name:'Error',message:e instanceof Error?e.message:String(e)};out.save('FIRST_FAILURE_R293.json',failure);}
 finally{if(connected){try{await c.query('rollback');rollback=true;}catch(e:unknown){failure??={name:'RollbackError',message:e instanceof Error?e.message:String(e)};}}await client.end();}
 out.save('NORMAL_LOCKED_ROLLBACK_CORE0_OUTCOME_R293.json',{status:failure?'HOLD_FIRST_FAILURE':'PASS_ORDINARY_WHOLE539_NORMAL_LOCKED_GUARDS_NOT_PUBLISHER',
  failure,normalRetainedAndScopedCompleted:normal,lockedRetainedAndScopedCompleted:locked,rollback,databaseWrites:0,queryEvidence:j.evidence,
  transaction:'READ_COMMITTED_READ_WRITE_FOR_EXISTING_LOCKS_NO_DML',readOnlyTransactionClaim:false,coreCallbacks:0,verifyCore:'THROWS_IF_CALLED',
  priorCore25:'ACTUAL_R288_NOT_REPLAYED',price113:'HISTORICAL_ACCEPTED_NOT_REPLAYED',sourceProjectStockInstallation:'HOLD',publication:0,FULL:false});
 assert(rollback,'ROLLBACK_REQUIRED');if(failure)throw Error(failure.message);
});
