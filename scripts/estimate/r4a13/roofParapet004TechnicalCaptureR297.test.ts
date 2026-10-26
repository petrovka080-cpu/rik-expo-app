import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {Client} from 'pg';
import subject from '../../../data/estimate-benchmarks/source-packs/roof-parapet004-root-selected-subject-r297.json';
import {prepareRoofParapet004TechnicalCaptureInputR294,type RoofParapet004TechnicalPreparationR294 as Preparation} from './prepareRoofParapet004TechnicalWholeR294';
import {captureMasterScopedNormativeRegistryPreimageR1,resolveMasterScopedNormativeRegistryOptInR1,type MasterCapturedScopedNormativeRegistryR1 as Formal} from './masterScopedNormativeRegistryPreimageR1';

type Json=Record<string,unknown>;type Pin=Readonly<{path:string;sha256:string}>;
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
function pin(v:unknown):v is Pin{return object(v)&&typeof v.path==='string'&&path.isAbsolute(v.path)&&typeof v.sha256==='string'&&/^[a-f0-9]{64}$/u.test(v.sha256);}
function pinned(p:Pin){assert(fs.statSync(p.path).size<=4*1024*1024,'LOCAL_PINNED_INPUT_CAP');const b=fs.readFileSync(p.path);assert.equal(sha(b),p.sha256,'SOURCE_INPUT_PIN_DRIFT:'+p.path);return b;}
function read(p:Pin):unknown{return JSON.parse(pinned(p).toString('utf8'));}
// The immutable source closure is fingerprint-only. It is never a parsed
// native/registry input; parsed inputs and raw artifacts keep their 4MiB caps.
type SourceFingerprint=Pin&Readonly<{bytes:number}>;
function sourceFingerprint(v:unknown):v is SourceFingerprint{if(!object(v))return false;const bytes=v.bytes;return pin(v)&&typeof bytes==='number'&&Number.isSafeInteger(bytes)&&bytes>=0;}
function verifySourceFingerprint(p:Pin,expectedBytes:number){
 assert(Number.isSafeInteger(expectedBytes)&&expectedBytes>=0,'SOURCE_FINGERPRINT_RECORDED_LENGTH');
 const chunk=Buffer.allocUnsafe(Math.max(1,Math.min(expectedBytes,1024*1024))),h=createHash('sha256'),fd=fs.openSync(p.path,'r');
 try{const before=fs.fstatSync(fd);assert(before.isFile(),'SOURCE_FINGERPRINT_FILE');assert.equal(before.size,expectedBytes,'SOURCE_FINGERPRINT_LENGTH:'+p.path);
  let total=0;while(total<expectedBytes){const n=fs.readSync(fd,chunk,0,Math.min(chunk.length,expectedBytes-total),null);assert(n>0,'SOURCE_FINGERPRINT_TRUNCATED:'+p.path);h.update(chunk.subarray(0,n));total+=n;}
  assert.equal(fs.readSync(fd,chunk,0,1,null),0,'SOURCE_FINGERPRINT_GREW:'+p.path);assert.equal(fs.fstatSync(fd).size,expectedBytes,'SOURCE_FINGERPRINT_FINAL_LENGTH:'+p.path);
  assert.equal(total,expectedBytes);assert.equal(h.digest('hex'),p.sha256,'SOURCE_INPUT_PIN_DRIFT:'+p.path);
 }finally{fs.closeSync(fd);}
}
const sourceRoot=path.resolve(__dirname,'../../..');
type Request=Readonly<{currentFullParent:Pin;currentPointer:Pin;master:Pin;primaryPdf:Pin;hostContext:Pin;sourceOrigins:Pin}>;
function request(v:unknown):v is Request{return object(v)&&Object.keys(v).length===6&&['currentFullParent','currentPointer','master','primaryPdf','hostContext','sourceOrigins'].every(k=>pin(v[k]));}
function base(r:Request,rawDir:string):Preparation{
 assert.equal(r.currentFullParent.sha256,'a2926d0b7985bcb13cc2fe9a8e1e57fcbe58a0440b08abc62e9f7589e3f39628');pinned(r.currentFullParent);
 assert.equal(r.currentPointer.sha256,'404bdb3657d36efb731f8131f63dc126e452f635579926d0f3855dbf749053f6');const pointer=read(r.currentPointer);assert(object(pointer));assert(typeof pointer.definitionReleaseId==='string'&&typeof pointer.searchReleaseId==='string');
 assert.equal(pointer.productionAccessed,false);assert.equal(pointer.definitionReleaseId,'2df79e8d-4012-5557-87c0-f36285f59f17');assert.equal(pointer.searchReleaseId,'9b042edf-ca06-50f6-969a-556e6d14547a');
 assert.equal(r.master.sha256,'541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40');pinned(r.master);
 assert.equal(r.primaryPdf.sha256,'114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8');pinned(r.primaryPdf);
 const ownPointer=path.join(sourceRoot,'data/estimate-benchmarks/r568-local-developer-canonical-release.json');pinned({path:ownPointer,sha256:r.currentPointer.sha256});
 const host=read(r.hostContext);assert(object(host)&&typeof host.expectedBranch==='string');assert.equal(host.expectedBranch,'codex/r4-a5-clean-08b18902');assert(typeof host.benchmarkOrdinal==='number'&&Number.isInteger(host.benchmarkOrdinal)&&host.benchmarkOrdinal>=0);
 const origins=read(r.sourceOrigins);assert(object(origins)&&object(origins.literalRelativeClosure));const paths:string[]=[];
 for(const [logical,v]of Object.entries(origins.literalRelativeClosure)){assert(sourceFingerprint(v),'EXACT_SELECTED_SOURCE_ORIGIN_WITH_RECORDED_LENGTH');assert(!path.isAbsolute(logical)&&!logical.split('/').includes('..'),'OWN_LOGICAL_INPUT_ONLY');
  const p=path.resolve(sourceRoot,logical);verifySourceFingerprint({path:p,sha256:v.sha256},v.bytes);paths.push(p);}
 assert(paths.includes(path.join(sourceRoot,'scripts/estimate/r4a13/roofParapet004TechnicalCaptureR297.test.ts')),'OWN_ENTRY_IN_FROZEN_CLOSURE');
 return{sourceRoot,currentFullParent:r.currentFullParent,source:{sourceKey:subject.sourceKey,sourceMetadata:subject.sourceMetadata,locator:subject.locator},
  host:{expectedBranch:host.expectedBranch,benchmarkOrdinal:host.benchmarkOrdinal,masterPath:r.master.path,masterSha256:r.master.sha256,parentReleaseId:pointer.definitionReleaseId,
   parentSearchReleaseId:pointer.searchReleaseId,currentReleasePath:ownPointer,outputRoot:path.dirname(rawDir)},
  sourcePaths:[...paths,...Object.values(r).map(p=>p.path)],verifyCore:async()=>{throw Error('READONLY_PARAPET004_CAPTURE_FORBIDS_CORE_CALLBACK');},
  verifyTargetPrecondition:async()=>{throw Error('READONLY_PARAPET004_CAPTURE_IS_NOT_FINAL_PUBLISHER_PERMISSION');}};
}
function output(){const dir=process.env.PARAPET004_CAPTURE_RAW_R297;assert(dir&&path.isAbsolute(dir)&&!fs.existsSync(dir),'FRESH_OWNED_RAW_OUTPUT');fs.mkdirSync(dir,{recursive:true});
 const byteFile=(name:string,b:Buffer)=>{assert(b.length<=4*1024*1024,'LOCAL_RAW_ARTIFACT_CAP:'+name);const p=path.join(dir,name);fs.writeFileSync(p,b,{flag:'wx'});return{path:p,sha256:sha(b),bytes:b.length};};
 return{dir,byteFile,save:(name:string,v:unknown)=>byteFile(name,Buffer.from(JSON.stringify(v,null,2)+'\n'))};}
type Out=ReturnType<typeof output>;
function journal(client:Client,out:Out){const evidence:ReturnType<Out['save']>[]=[];
 const c=new Proxy(client,{get(target,key,receiver){if(key!=='query')return Reflect.get(target,key,receiver);
  return async(text:unknown,values:unknown=[])=>{assert(typeof text==='string'&&Array.isArray(values),'EXISTING_TEXT_QUERY_SHAPE_ONLY');assert(/^\s*(?:select|with|begin|set local|rollback)\b/iu.test(text),'NO_DML_LOCKS_PUBLISHER_SQL');
   const result=await target.query(text,values),index=evidence.length+1;
   const rows=result.rows.map((row:unknown,ri:number)=>{assert(object(row));return Object.fromEntries(Object.entries(row).map(([k,v])=>[k,typeof v==='string'?{kind:'PG_TEXT',...out.byteFile(`query-${index}-row-${ri}-${k}.txt`,Buffer.from(v))}:v]));});
   evidence.push(out.save(`query-${index}.json`,{text,values,command:result.command,rowCount:result.rowCount,rows}));return result;};}});return{client:c,evidence};}
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

function actor(v:unknown,u:URL){assert(object(v));assert.equal(v.database_name,'rik_r4_runtime_b5_v2');assert.equal(v.actor_text,decodeURIComponent(u.username));assert.equal(v.session_actor,v.actor_text);
 assert.equal(v.isolation,'repeatable read');assert.equal(v.read_only,'on');assert.equal(v.timezone,'UTC');assert(typeof v.rr_snapshot==='string'&&v.rr_snapshot.length>0);return v;}
async function header(c:Client,p:ReturnType<typeof prepareRoofParapet004TechnicalCaptureInputR294>){const capture=p.model.capture;
 const rows=(await c.query(parentSql,[p.config.parentReleaseId,p.config.catalogId])).rows;assert.equal(rows.length,1);const row:unknown=rows[0];
 assert(object(row)&&row.row_count===1&&typeof row.max_raw_bytes==='number'&&row.max_raw_bytes<=524288&&typeof row.raw==='string','CURRENT_HEADER_PRETRANSFER_CAP');const h:unknown=JSON.parse(row.raw);assert(object(h));
 assert.equal(h.definition_version_id,capture.definition.id);assert.equal(h.approved_template_baseline_id,capture.baseline.id);assert.equal(h.definition_version,3);assert.equal(h.definition_sha256,capture.definition.definition_sha256);return row.raw;}
function exactColumnOccupancy(c:Formal){return c.locatorRows.flatMap(row=>{const raw:unknown=JSON.parse(row.raw);assert(object(raw)&&object(raw.locator),'FULL_CAPTURED_LOCATOR_SHAPE');
 const direct=row.normIds.filter((n):n is string=>typeof n==='string'),many=raw.locator.exactColumns;
 assert(many===undefined||strings(many),'CAPTURED_EXACT_COLUMNS_SHAPE');
 const columns=[...direct,...(many??[])].filter(x=>subject.locator.payload.exactColumns.includes(x));return columns.length?[{id:row.id,sourceId:row.sourceId,locatorKey:row.locatorKey,columns,fullOriginalRaw:row.raw}]:[];});}

jest.setTimeout(110000);
it('captures proposed technical004 source with original existing scoped arm twice RR READONLY UTC; rollback core0 not source admission',async()=>{
 const encoded=process.env.PARAPET004_CAPTURE_REQUEST_PINS_R297;assert(encoded,'ROOT_REQUEST_PIN_DICTIONARY_IN_MEMORY_REQUIRED');const r:unknown=JSON.parse(encoded);assert(request(r),'ONLY_EXACT_ROOT_PIN_DICTIONARY');
 const out=output(),input=base(r,out.dir),prepared=prepareRoofParapet004TechnicalCaptureInputR294(input);assert.equal(prepared.config.sourceId,'kg_krer12_roof_parapet_technical_whole0040203_r294');
 out.save('PROPOSED_CAPTURE_INPUT_R297.json',prepared.captureInput);out.save('PROPOSED_SOURCE_IDENTITY_NOT_DB_R297.json',{status:'GENERATED_CANDIDATE_NOT_DB_ID',newSource:prepared.captureInput.newSource,newLocators:prepared.captureInput.newLocators});
 const secret=process.env.ESTIMATE_MIGRATION_DATABASE_URL;assert(secret,'ROOT_DATABASE_URL_IN_MEMORY_REQUIRED');let u:URL;try{u=new URL(secret);}catch{throw Error('ROOT_DATABASE_URL_INVALID');}
 assert(u.hostname==='127.0.0.1'&&u.port==='55432'&&u.pathname==='/rik_r4_runtime_b5_v2','ROOT_EXACT_LOCAL_DATABASE_REQUIRED');
 const client=new Client({connectionString:secret,connectionTimeoutMillis:5000,options:'-c TimeZone=UTC'}),j=journal(client,out),c=j.client;
 let connected=false,rollback=false,failure:Readonly<{name:string;message:string}>|null=null,identity:Json|null=null,first:Formal|null=null,second:Formal|null=null;
 try{await client.connect();connected=true;await c.query('begin isolation level repeatable read read only');await c.query("set local timezone='UTC'");await c.query("set local statement_timeout='10000ms'");
  identity=actor((await c.query(actorSql)).rows[0],u);const before=await header(c,prepared);
  first=await captureMasterScopedNormativeRegistryPreimageR1(c,prepared.captureInput);out.save('SCOPED_REGISTRY_CAPTURE_FIRST_R297.json',first);
  const occupied=exactColumnOccupancy(first);out.save('EXACT_TWO_COLUMNS_OCCUPANCY_REVIEW_R297.json',{occupied});assert.equal(occupied.length,0,'EXACT004_COLUMN_OCCUPIED_STOP_FOR_ROOT_REUSE_REVIEW');
  assert.deepEqual(actor((await c.query(actorSql)).rows[0],u),identity);assert.equal(await header(c,prepared),before);
  second=await captureMasterScopedNormativeRegistryPreimageR1(c,prepared.captureInput);out.save('SCOPED_REGISTRY_CAPTURE_SECOND_R297.json',second);assert.deepEqual(second,first,'TWO_ORIGINAL_FULL_RAW_CAPTURES_EQUAL');
  assert(resolveMasterScopedNormativeRegistryOptInR1({...prepared.captureInput,config:{...prepared.captureInput.config,capturedScopedNormativeRegistry:first}}));
 }catch(e:unknown){failure={name:e instanceof Error?e.name:'Error',message:e instanceof Error?e.message:String(e)};out.save('FIRST_FAILURE_R297.json',failure);}
 finally{if(connected){try{await c.query('rollback');rollback=true;}catch(e:unknown){failure??={name:'RollbackError',message:e instanceof Error?e.message:String(e)};}}await client.end();}
 const source=prepared.captureInput.newSource,locator=prepared.captureInput.newLocators[0];assert(locator);
 out.save('READONLY_PREIMAGE_OUTCOME_R297.json',{status:failure?'HOLD_CAPTURE_NOT_ADMITTED':'READONLY_CAPTURED_PREIMAGE_NOT_ADMISSION',failure,actor:identity,rollback,databaseWrites:0,
  sourceKey:source.source_key,generatedIdentityStatus:'GENERATED_CANDIDATE_NOT_DB_ID',generatedSourceId:source.id,generatedLocatorId:locator.id,firstCaptureSha256:first?.captureSha256??null,
  sourceRows:first?.sourceRows.length??null,locatorRows:first?.locatorRows.length??null,capturedRawTwice:first!==null&&second!==null,scopeArtifact:source.artifact_sha256,officialColumns:subject.locator.payload.exactColumns,
  exactSubjectAbsenceObserved:failure===null&&rollback,globalAbsenceProved:false,parentScope:'EXACT_CURRENT_RELEASE_HEADER_TUPLE_ONLY_NOT_NEW_FULL_CAPTURE',queryEvidence:j.evidence,
  actualCoreCallbacks:0,activationAllowed:false,sourcePprApproval:false,normalLockedRegisteredRereads:'UNRUN',finalPublisherFiniteVerification:'UNRUN_REQUIRED_SEPARATELY',priceGate:'HOLD',unknownPhysical:22,FULL:false});
 assert(rollback,'ROLLBACK_REQUIRED');if(failure)throw Error(failure.message);
 console.log('PARAPET004_PHASE1_ACTUAL_CAPTURE_COMPLETE_CORE0');
});
