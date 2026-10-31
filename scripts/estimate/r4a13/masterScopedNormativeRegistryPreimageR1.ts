// ROOT WORK proposal. Raw PG TEXT is authoritative; no JS numeric reserialization.
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import type {Client} from 'pg';
type Json=Record<string,any>;
type QueryClient=Pick<Client,'query'>;
export type MasterScopedNormativeRegistryScopeR1=Readonly<{
 artifactSha256:string;normId:string;sourceKey:string;generatedSourceId:string;
 generatedLocatorIds:readonly string[];generatedLocatorKeys:readonly string[];
}>;
/** raw is TEXT from this module's exact PG projection, never an object round trip. */
export type MasterScopedRegistrySourceRawR1=Readonly<{
 id:string;sourceKey:string;raw:string;managedMatches:boolean|null;
}>;
export type MasterScopedRegistryLocatorRawR1=Readonly<{
 id:string;sourceId:string;locatorKey:string;normIds:readonly (string|null)[];
 raw:string;managedMatches:boolean|null;
}>;
export type MasterScopedNormativeRegistrySnapshotR1=Readonly<{
 sourceRows:readonly MasterScopedRegistrySourceRawR1[];
 locatorRows:readonly MasterScopedRegistryLocatorRawR1[];
}>;
export type MasterCapturedScopedNormativeRegistryR1=MasterScopedNormativeRegistrySnapshotR1&Readonly<{
 contract:'master-scoped-normative-registry-preimage/r1';
 projection:'pg-jsonb-text-utc-microseconds/r1';
 scope:MasterScopedNormativeRegistryScopeR1;captureSha256:string;
}>;
export type MasterScopedNormativeRegistryInputR1=Readonly<{
 config:Readonly<{stopCode:string;normId:string;capturedScopedNormativeRegistry?:MasterCapturedScopedNormativeRegistryR1;
  catalogAppend?:Readonly<{capturedSourcePreimage?:unknown}>;
  binding?:Readonly<{reuseExistingNormativeRegistry?:unknown;retainParentBindings?:Readonly<{capturedSourcePreimage?:unknown}>;ordinaryCompositeSourceV1?:unknown}>}>;
 newSource:Json;newLocators:readonly Json[];
}>;
export type MasterResolvedScopedNormativeRegistryR1=Readonly<{
 input:MasterScopedNormativeRegistryInputR1;declaration:MasterCapturedScopedNormativeRegistryR1;
 /** These exact strings, not a later regenerated object, are checked by PG. */
 expectedSourceJson:string;expectedLocatorsJson:string;
}>;
const CONTRACT='master-scoped-normative-registry-preimage/r1';
const PROJECTION='pg-jsonb-text-utc-microseconds/r1';
const MAX_SOURCE=16,MAX_LOCATOR=64,MAX_ROW=512*1024,MAX_WIRE_ROW=1024*1024,MAX_TOTAL=3*1024**2;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const HASH=/^[0-9a-f]{64}$/u;
const SOURCE_KEYS=['id','source_key','title_ru','authority','official_url','artifact_sha256','effective_from','effective_to','metadata'];
const LOCATOR_KEYS=['id','source_id','locator_key','locator','excerpt_sha256'];
function object(v:unknown):v is Json{return v!=null&&typeof v==='object'&&!Array.isArray(v);}
function copy<T>(v:T):T{return JSON.parse(JSON.stringify(v));}
function keys(v:Json,expected:readonly string[]):boolean{
 return JSON.stringify(Object.keys(v).sort())===JSON.stringify([...expected].sort());
}
type RegistryReadErrorContextR1=Readonly<{config:Readonly<{stopCode:string}>}>;
function fail(i:RegistryReadErrorContextR1,s:string):never{throw Error('STOP_'+i.config.stopCode+'_SCOPED_REGISTRY_'+s);}
function requireThat(v:unknown,i:RegistryReadErrorContextR1,s:string):asserts v{if(!v)fail(i,s);}
function canonicalScope(s:MasterScopedNormativeRegistryScopeR1):MasterScopedNormativeRegistryScopeR1{
 return{artifactSha256:s.artifactSha256,normId:s.normId,sourceKey:s.sourceKey,generatedSourceId:s.generatedSourceId,
  generatedLocatorIds:[...s.generatedLocatorIds].sort(),generatedLocatorKeys:[...s.generatedLocatorKeys].sort()};
}
function sourceRows(a:readonly MasterScopedRegistrySourceRawR1[]):MasterScopedRegistrySourceRawR1[]{
 return a.map(r=>({id:r.id,sourceKey:r.sourceKey,raw:r.raw,managedMatches:r.managedMatches})).sort((a,b)=>a.id.localeCompare(b.id,'en'));
}
function locatorRows(a:readonly MasterScopedRegistryLocatorRawR1[]):MasterScopedRegistryLocatorRawR1[]{
 return a.map(r=>({id:r.id,sourceId:r.sourceId,locatorKey:r.locatorKey,normIds:[...r.normIds],raw:r.raw,managedMatches:r.managedMatches})).sort((a,b)=>a.id.localeCompare(b.id,'en'));
}
function snapshotText(v:MasterScopedNormativeRegistrySnapshotR1):string{
 return JSON.stringify({sourceRows:sourceRows(v.sourceRows),locatorRows:locatorRows(v.locatorRows)});
}
export function masterScopedNormativeRegistryCaptureSha256R1(c:Omit<MasterCapturedScopedNormativeRegistryR1,'captureSha256'>):string{
 return createHash('sha256').update(JSON.stringify({contract:c.contract,projection:c.projection,
  scope:canonicalScope(c.scope),sourceRows:sourceRows(c.sourceRows),locatorRows:locatorRows(c.locatorRows)})).digest('hex');
}
/** A caller must obtain the fresh raw projection using this reader's capture arm.
 * Historical row_to_json, object fixtures and a JS JSON.parse are not conversions. */
export function makeMasterScopedNormativeRegistryCaptureR1(scope:MasterScopedNormativeRegistryScopeR1,
 snapshot:MasterScopedNormativeRegistrySnapshotR1):MasterCapturedScopedNormativeRegistryR1{
 const c={contract:CONTRACT,projection:PROJECTION,scope:canonicalScope(scope),
  sourceRows:sourceRows(snapshot.sourceRows),locatorRows:locatorRows(snapshot.locatorRows)}as const;
 return{...c,captureSha256:masterScopedNormativeRegistryCaptureSha256R1(c)};
}
function closure(i:RegistryReadErrorContextR1,s:MasterScopedNormativeRegistrySnapshotR1):void{
 requireThat(Array.isArray(s.sourceRows)&&Array.isArray(s.locatorRows)
  &&s.sourceRows.every(object)&&s.locatorRows.every(object),i,'RAW_WRAPPERS_REQUIRED');
 const ids=s.sourceRows.map(r=>r.id),sourceKeys=s.sourceRows.map(r=>r.sourceKey);
 requireThat(s.sourceRows.every(r=>keys(r,['id','sourceKey','raw','managedMatches'])&&UUID.test(r.id)
  &&typeof r.sourceKey==='string'&&r.sourceKey.length>0&&typeof r.raw==='string'
  &&(r.managedMatches===null||typeof r.managedMatches==='boolean'))
  &&new Set(ids).size===ids.length&&new Set(sourceKeys).size===sourceKeys.length,i,'SOURCE_RAW_HEADER_OR_UNIQUENESS');
 const locIds=s.locatorRows.map(r=>r.id),pairs=s.locatorRows.map(r=>r.sourceId+'/'+r.locatorKey);
 requireThat(s.locatorRows.every(r=>keys(r,['id','sourceId','locatorKey','normIds','raw','managedMatches'])
  &&UUID.test(r.id)&&ids.includes(r.sourceId)&&typeof r.locatorKey==='string'&&r.locatorKey.length>0
  &&Array.isArray(r.normIds)&&r.normIds.length===3&&r.normIds.every(n=>n===null||typeof n==='string')
  &&typeof r.raw==='string'&&(r.managedMatches===null||typeof r.managedMatches==='boolean'))
  &&new Set(locIds).size===locIds.length&&new Set(pairs).size===pairs.length,i,'LOCATOR_RAW_HEADER_OR_CLOSURE');
 const all=[...s.sourceRows,...s.locatorRows];
 requireThat(all.every(r=>Buffer.byteLength(r.raw)>0&&Buffer.byteLength(r.raw)<=MAX_ROW
  &&Buffer.byteLength(JSON.stringify(r))<=MAX_WIRE_ROW)
  &&Buffer.byteLength(snapshotText(s))<=MAX_TOTAL,i,'CAPTURE_BYTE_CAP');
}
/** Omission is the only no-query legacy path. Present undefined/null is STOP. */
export function resolveMasterScopedNormativeRegistryOptInR1(i:MasterScopedNormativeRegistryInputR1):MasterResolvedScopedNormativeRegistryR1|null{
 if(!Object.hasOwn(i.config,'capturedScopedNormativeRegistry')){
  requireThat(!Object.hasOwn(i.config.binding??{},'ordinaryCompositeSourceV1'),i,'ORDINARY_SOURCE_CAPTURE_REQUIRED');
  return null;
 }
 const v=i.config.capturedScopedNormativeRegistry;
 requireThat(object(v)&&keys(v,['contract','projection','scope','sourceRows','locatorRows','captureSha256'])
  &&v.contract===CONTRACT&&v.projection===PROJECTION,i,'OPT_IN_RAW_PROJECTION_OBJECT');
 requireThat(!Object.hasOwn(i.config.binding??{},'reuseExistingNormativeRegistry'),i,'REUSE_CONFLICT');
 const ordinary=i.config.binding?.ordinaryCompositeSourceV1;
 const ordinaryOpted=Object.hasOwn(i.config.binding??{},'ordinaryCompositeSourceV1');
 if(ordinaryOpted)requireThat(object(ordinary)&&keys(ordinary,['contract','capturedSourcePreimage'])
  &&ordinary.contract==='master-ordinary-composite-source/v1'&&i.newSource.metadata?.sourceKind==='PROJECT_SYSTEM'
  &&i.newLocators.length===1,i,'ORDINARY_TYPED_COMPOSITE_DECLARATION');
 requireThat([i.config.catalogAppend!=null,i.config.binding?.retainParentBindings!=null,ordinaryOpted].filter(Boolean).length===1,
  i,'ONE_SUPPORTED_ABSENCE_ROUTE_REQUIRED');
 const absent=i.config.catalogAppend?.capturedSourcePreimage??i.config.binding?.retainParentBindings?.capturedSourcePreimage
  ??(object(ordinary)?ordinary.capturedSourcePreimage:undefined);
 requireThat(object(absent)&&keys(absent,['sourceKey','expected'])&&absent.sourceKey===i.newSource.source_key&&absent.expected===null,i,'EXPLICIT_STRICT_ABSENCE_REQUIRED');
 requireThat(object(i.newSource)&&keys(i.newSource,SOURCE_KEYS)&&UUID.test(i.newSource.id)&&HASH.test(i.newSource.artifact_sha256)
  &&typeof i.newSource.source_key==='string'&&i.newSource.source_key.length>0
  &&typeof i.newSource.title_ru==='string'&&typeof i.newSource.authority==='string'&&object(i.newSource.metadata)
  &&Array.isArray(i.newLocators)&&i.newLocators.length>0&&i.newLocators.length<=32
  &&i.newLocators.every(l=>object(l)&&keys(l,LOCATOR_KEYS)&&UUID.test(l.id)&&l.source_id===i.newSource.id
   &&typeof l.locator_key==='string'&&l.locator_key.length>0&&object(l.locator)&&HASH.test(l.excerpt_sha256)),i,'GENERATED_COMPLETE_ROWS');
 const s=v.scope;
 requireThat(object(s)&&keys(s,['artifactSha256','normId','sourceKey','generatedSourceId','generatedLocatorIds','generatedLocatorKeys'])
  &&s.artifactSha256===i.newSource.artifact_sha256&&s.normId===i.config.normId&&typeof s.normId==='string'&&s.normId.length>0
  &&s.sourceKey===i.newSource.source_key&&s.generatedSourceId===i.newSource.id
  &&Array.isArray(s.generatedLocatorIds)&&Array.isArray(s.generatedLocatorKeys)
  &&new Set(s.generatedLocatorIds).size===i.newLocators.length&&new Set(s.generatedLocatorKeys).size===i.newLocators.length
  &&JSON.stringify([...s.generatedLocatorIds].sort())===JSON.stringify(i.newLocators.map(l=>l.id).sort())
  &&JSON.stringify([...s.generatedLocatorKeys].sort())===JSON.stringify(i.newLocators.map(l=>l.locator_key).sort()),i,'EXACT_GENERATED_SCOPE');
 closure(i,v);requireThat(v.sourceRows.length<=MAX_SOURCE&&v.locatorRows.length<=MAX_LOCATOR,i,'CAPTURE_ROW_CAP');
 requireThat(HASH.test(v.captureSha256)&&masterScopedNormativeRegistryCaptureSha256R1(v)===v.captureSha256,i,'CAPTURE_HASH');
 requireThat(v.sourceRows.every(r=>r.managedMatches===null&&r.id!==s.generatedSourceId&&r.sourceKey!==s.sourceKey)
  &&v.locatorRows.every(l=>l.managedMatches===null&&!s.generatedLocatorIds.includes(l.id)
   &&!s.generatedLocatorKeys.includes(l.locatorKey)&&!l.normIds.includes(s.normId)),i,'ALREADY_REGISTERED_EXACT_SCOPE_REQUIRES_OTHER_ROUTE');
 const expectedSourceJson=JSON.stringify(i.newSource),expectedLocatorsJson=JSON.stringify(i.newLocators);
 requireThat(Buffer.byteLength(expectedSourceJson)<=MAX_ROW&&i.newLocators.every(l=>Buffer.byteLength(JSON.stringify(l))<=MAX_ROW)
  &&Buffer.byteLength(expectedSourceJson)+Buffer.byteLength(expectedLocatorsJson)<=MAX_TOTAL,i,'EXPECTED_WRITER_INPUT_BYTE_CAP');
 return{input:{...i,newSource:copy(i.newSource),newLocators:copy(i.newLocators)},declaration:copy(v),expectedSourceJson,expectedLocatorsJson};
}
export function assertMasterScopedNormativeRegistrySnapshotR1(r:MasterResolvedScopedNormativeRegistryR1,
 actual:MasterScopedNormativeRegistrySnapshotR1,phase:'BEFORE'|'REGISTERED'='BEFORE'):void{
 const i=r.input,v=r.declaration;
 requireThat(masterScopedNormativeRegistryCaptureSha256R1(v)===v.captureSha256,i,'RESOLVED_CAPTURE_DRIFT');closure(i,actual);
 requireThat(actual.sourceRows.length<=MAX_SOURCE+(phase==='REGISTERED'?1:0)
  &&actual.locatorRows.length<=MAX_LOCATOR+(phase==='REGISTERED'?i.newLocators.length:0),i,'ACTUAL_ROW_CAP');
 if(phase==='BEFORE'){
  requireThat(snapshotText(actual)===snapshotText(v),i,'BEFORE_FULL_RAW_SCOPE_CHANGED');return;
 }
 const added=actual.sourceRows.filter(s=>s.id===i.newSource.id);
 requireThat(added.length===1&&added[0]!.sourceKey===i.newSource.source_key&&added[0]!.managedMatches===true,i,'REGISTERED_NEW_SOURCE_MANAGED_TEXT_CHANGED');
 const addedLocators=actual.locatorRows.filter(l=>i.newLocators.some(e=>e.id===l.id));
 requireThat(addedLocators.length===i.newLocators.length&&addedLocators.every(l=>l.managedMatches===true
  &&i.newLocators.some(e=>e.id===l.id&&e.source_id===l.sourceId&&e.locator_key===l.locatorKey)),i,'REGISTERED_NEW_LOCATOR_MANAGED_TEXT_CHANGED');
 requireThat(snapshotText({sourceRows:actual.sourceRows.filter(s=>s.id!==i.newSource.id),
  locatorRows:actual.locatorRows.filter(l=>!i.newLocators.some(e=>e.id===l.id))})===snapshotText(v),i,'REGISTERED_OLD_FULL_RAW_SCOPE_CHANGED');
}
export function assertMasterScopedNormativeRegistryUnchangedR1(r:MasterResolvedScopedNormativeRegistryR1,
 before:MasterScopedNormativeRegistrySnapshotR1,locked:MasterScopedNormativeRegistrySnapshotR1):void{
 assertMasterScopedNormativeRegistrySnapshotR1(r,before);assertMasterScopedNormativeRegistrySnapshotR1(r,locked);
 requireThat(snapshotText(before)===snapshotText(locked),r.input,'CHANGED_BEFORE_DML');
}
const SOURCE_SQL=`select s.id::text id,s.source_key,
 jsonb_set(to_jsonb(s),'{created_at}',to_jsonb(to_char(s.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')))::text raw,
 case when s.id=$2::uuid then (to_jsonb(s)-'created_at')::text=($7::jsonb)::text else null end managed_matches
 from public.estimate_normative_source s
 where s.artifact_sha256=$1 or s.id=$2::uuid or s.source_key=$3
 or exists(select 1 from public.estimate_normative_locator l where l.source_id=s.id and
  (l.id=any($4::uuid[]) or l.locator_key=any($5::text[]) or l.locator->>'exactColumn'=$6 or l.locator->>'normId'=$6 or l.locator->>'norm_id'=$6))
 order by s.source_key,s.id limit $8`;
const LOCATOR_SQL=`select l.id::text id,l.source_id::text source_id,l.locator_key,to_jsonb(l)::text raw,
 json_build_array(l.locator->>'exactColumn',l.locator->>'normId',l.locator->>'norm_id') norm_ids,
 case when exists(select 1 from jsonb_array_elements($2::jsonb) e where e->>'id'=l.id::text)
 then to_jsonb(l)::text=(select e::text from jsonb_array_elements($2::jsonb) e where e->>'id'=l.id::text) else null end managed_matches
 from public.estimate_normative_locator l where l.source_id=any($1::uuid[])
 order by l.source_id,l.locator_key,l.id limit $3`;
const SOURCE_WRAPPER="json_build_object('id',id,'sourceKey',source_key,'raw',raw,'managedMatches',managed_matches)";
const LOCATOR_WRAPPER="json_build_object('id',id,'sourceId',source_id,'locatorKey',locator_key,'normIds',norm_ids,'raw',raw,'managedMatches',managed_matches)";
/** Single-statement diagnostics and payload share one MVCC snapshot. CASE prevents
 * raw TEXT leaving PG on a failing cap, including a concurrent oversize change.
 * Only wrapper JSON is parsed; normative raw strings never become JS objects.
 * Existing outer owned/client SQL deadlines are mandatory; no timeout is reset. */
/** Existing atomic raw wrapper, shared by candidate guards and fixed current discovery.
 * SQL/predicates are module-owned; caller never supplies SQL from command input. */
export const MASTER_ATOMIC_COLLECTIONS_R1=['membership','definition','baseline','parameters','formulas','resources','bindings','normativeLocators','normativeSources','contentPassport','publicIdentity'] as const;
export type MasterAtomicCollectionR1=typeof MASTER_ATOMIC_COLLECTIONS_R1[number];
/** Numeric wrapper diagnosis only. No raw row, SQL, value or accessor is inspected. */
export function masterAtomicBudgetDiagnosticR1(d:unknown,used:number,left:number,rowCap:number,collection:MasterAtomicCollectionR1|undefined,wallBaseline=false,completeRaw=false):Record<string,number|string>|null{
 try{
  if(!d||typeof d!=='object'||!MASTER_ATOMIC_COLLECTIONS_R1.includes(collection as MasterAtomicCollectionR1))return null;
  const data=(key:string):unknown=>{const v=Object.getOwnPropertyDescriptor(d,key);return v&&Object.hasOwn(v,'value')?v.value:undefined;};
  const number=(v:unknown):number|null=>{
   const n=typeof v==='number'?v:typeof v==='string'&&/^(?:0|[1-9][0-9]{0,12})$/u.test(v)?Number(v):NaN;
   return Number.isSafeInteger(n)&&n>=0&&n<=1099511627775?n:null;
  };
  const result={rows:number(data('row_count')),rawMax:number(data('max_raw_bytes')),wireMax:number(data('max_wire_row_bytes')),wire:number(data('wire_bytes')),used:number(used),left:number(left),rowCap:number(rowCap),rawCap:wallBaseline?2*1024*1024:completeRaw&&(collection==='normativeLocators'||collection==='contentPassport')?1024*1024:MAX_ROW,wireCap:wallBaseline?2*1024*1024:MAX_WIRE_ROW,totalCap:completeRaw?10*1024*1024:MAX_TOTAL};
  if(Object.values(result).some(v=>v===null))return null;
  return{collection:collection!,...result} as Record<string,number|string>;
 }catch{return null;}
}
/** ROOT-reviewed measured exception: exactly the current wall baseline row, never registry defaults. */
export const MASTER_FIXED_WALL_BASELINE_MEMBERSHIP_R1=Object.freeze({release_id:'01417cef-3091-5012-844d-1bbd9e75cee1',catalog_id:'canonical-work:master:monolithic_reinforced_concrete_wall_standard',definition_version_id:'17c7db90-0c2d-523b-a673-ae1b47ebfebc',approved_template_baseline_id:'4fbfec74-7195-50fc-9c72-5ace39c73f76',definition_hash:'64ca2993df836e098c5b316eb051637aee272ecff52c7ab306f9ffad122c4d67'});
export type MasterFixedWallBaselineProfileR1=Readonly<{kind:'FIXED_MONOLITHIC_WALL_BASELINE_2M_R1';membership:unknown}>;
export function assertMasterFixedWallBaselineProfileR1(sql:string,wrapper:string,args:unknown[],cap:number,collection:MasterAtomicCollectionR1|undefined,profile:unknown,i:RegistryReadErrorContextR1):boolean{
 if(profile===undefined)return false;
 const expected=MASTER_FIXED_WALL_BASELINE_MEMBERSHIP_R1;
 const own=(value:object,key:string):unknown=>{const d=Object.getOwnPropertyDescriptor(value,key);return d&&Object.hasOwn(d,'value')?d.value:undefined;};
 requireThat(profile!==null&&typeof profile==='object'&&!Array.isArray(profile),i,'FIXED_WALL_BASELINE_PROFILE');
 const p=profile as object,member=own(p,'membership');
 requireThat(Object.keys(p).sort().join(',')==='kind,membership'&&own(p,'kind')==='FIXED_MONOLITHIC_WALL_BASELINE_2M_R1'&&member!==null&&typeof member==='object'&&!Array.isArray(member),i,'FIXED_WALL_BASELINE_PROFILE');
 requireThat(Object.entries(expected).every(([key,value])=>own(member as object,key)===value),i,'FIXED_WALL_BASELINE_PROFILE');
 requireThat(i.config.stopCode==='ELECTRICAL_CURRENT'&&collection==='baseline'&&cap===1&&wrapper==="json_build_object('raw',raw)"&&args.length===3&&args[0]===expected.approved_template_baseline_id&&args[1]===expected.definition_version_id&&args[2]===expected.catalog_id&&sql===`select row_to_json(t)::text raw from (select * from public.estimate_approved_template_baseline
      where id=$1 and definition_version_id=$2 and catalog_id=$3 limit 2)t`,i,'FIXED_WALL_BASELINE_PROFILE');
 return true;
}
export const MASTER_WALL_NUMERIC_INVENTORY_R1=[{"collection":"membership","table":"estimate_cumulative_manifest_entry","predicate":"release_id=$1 and catalog_id=$2","args":["01417cef-3091-5012-844d-1bbd9e75cee1","canonical-work:master:monolithic_reinforced_concrete_wall_standard"],"cap":1},{"collection":"definition","table":"estimate_definition_version","predicate":"id=$1 and catalog_id=$2","args":["17c7db90-0c2d-523b-a673-ae1b47ebfebc","canonical-work:master:monolithic_reinforced_concrete_wall_standard"],"cap":1},{"collection":"baseline","table":"estimate_approved_template_baseline","predicate":"id=$1 and definition_version_id=$2 and catalog_id=$3","args":["4fbfec74-7195-50fc-9c72-5ace39c73f76","17c7db90-0c2d-523b-a673-ae1b47ebfebc","canonical-work:master:monolithic_reinforced_concrete_wall_standard"],"cap":1},{"collection":"parameters","table":"estimate_parameter_definition","predicate":"definition_version_id=$1","args":["17c7db90-0c2d-523b-a673-ae1b47ebfebc"],"cap":4096},{"collection":"formulas","table":"estimate_formula_graph","predicate":"definition_version_id=$1","args":["17c7db90-0c2d-523b-a673-ae1b47ebfebc"],"cap":4096},{"collection":"resources","table":"estimate_resource_spec","predicate":"definition_version_id=$1","args":["17c7db90-0c2d-523b-a673-ae1b47ebfebc"],"cap":4096},{"collection":"bindings","table":"estimate_work_normative_binding","predicate":"definition_version_id=$1","args":["17c7db90-0c2d-523b-a673-ae1b47ebfebc"],"cap":4096},{"collection":"normativeLocators","table":"estimate_normative_locator","predicate":"id in (select locator_id from public.estimate_work_normative_binding where definition_version_id=$1)","args":["17c7db90-0c2d-523b-a673-ae1b47ebfebc"],"cap":4096},{"collection":"normativeSources","table":"estimate_normative_source","predicate":"id in (select source_id from public.estimate_normative_locator where id in (select locator_id from public.estimate_work_normative_binding where definition_version_id=$1))","args":["17c7db90-0c2d-523b-a673-ae1b47ebfebc"],"cap":4096},{"collection":"contentPassport","table":"estimate_content_passport_r3","predicate":"definition_version_id=$1","args":["17c7db90-0c2d-523b-a673-ae1b47ebfebc"],"cap":1},{"collection":"publicIdentity","table":"estimate_work_identity","predicate":"catalog_id=$1","args":["canonical-work:master:monolithic_reinforced_concrete_wall_standard"],"cap":1}] as const;
export type MasterWallNumericInventoryModeR1=Readonly<{kind:'FIXED_WALL_NUMERIC_INVENTORY_R1';membership:unknown}>;
export function masterWallNumericBudgetRecordR1(d:unknown,used:number,cap:number,collection:MasterAtomicCollectionR1,wallBaseline:boolean):Record<string,number|string|boolean>{
 const invalid=():never=>{throw Error('STOP_ELECTRICAL_CURRENT_SCOPED_REGISTRY_NUMERIC_INVENTORY_DIAGNOSIS');};
 if(!d||typeof d!=='object'||Array.isArray(d)||!MASTER_ATOMIC_COLLECTIONS_R1.includes(collection)||!Number.isInteger(cap)||![1,4096].includes(cap)||typeof wallBaseline!=='boolean'||(wallBaseline&&collection!=='baseline'))return invalid();
 const own=(key:string):unknown=>{const v=Object.getOwnPropertyDescriptor(d,key);if(!v||!Object.hasOwn(v,'value'))return invalid();return v.value;};
 if(Object.keys(d).sort().join(',')!==['row_count','max_raw_bytes','max_wire_row_bytes','wire_bytes','rows_json'].sort().join(','))return invalid();
 // Own data property check happens before reading or parsing any potential payload.
 if(own('rows_json')!==null)return invalid();
 const integer=(value:unknown):number=>{if(typeof value==='string'&&!/^(?:0|[1-9][0-9]{0,15})$/u.test(value))return invalid();const n=typeof value==='number'?value:typeof value==='string'?Number(value):NaN;if(!Number.isSafeInteger(n)||n<0)return invalid();return n;};
 const rows=integer(own('row_count')),rawMax=integer(own('max_raw_bytes')),wireMax=integer(own('max_wire_row_bytes')),wire=integer(own('wire_bytes'));
 if(rows>cap+1||!Number.isSafeInteger(used)||used<0)return invalid();
 const overhead=Math.max(rows-1,0)+2,wireArrayBytes=wire+overhead,after=used+wireArrayBytes;
 if(!Number.isSafeInteger(wireArrayBytes)||!Number.isSafeInteger(after))return invalid();
 const rawCap=wallBaseline?2*1024*1024:MAX_ROW,wireCap=wallBaseline?2*1024*1024:MAX_WIRE_ROW;
 return{collection,rows,rowCap:cap,rawMax,rawCap,wireMax,wireCap,wire,arrayOverhead:overhead,wireArrayBytes,cumulativeBefore:used,cumulativeAfter:after,budget:MAX_TOTAL,remainingBefore:Math.max(0,MAX_TOTAL-used),overageAfter:Math.max(0,after-MAX_TOTAL),countOverflow:rows>cap,completeCollection:rows<=cap,wouldFitRaw:rawMax<=rawCap,wouldFitWire:wireMax<=wireCap,wouldFitCumulative:after<=MAX_TOTAL};
}
export function createMasterAtomicRawReadR1(c:QueryClient,i:RegistryReadErrorContextR1,time:()=>void,inventory?:MasterWallNumericInventoryModeR1,completeRawProfile?:'FIXED_WALL_COMPLETE_RAW_READ_R2'){
 const completeRaw=completeRawProfile!==undefined;
 requireThat(!completeRaw||(completeRawProfile==='FIXED_WALL_COMPLETE_RAW_READ_R2'&&inventory===undefined&&i.config.stopCode==='ELECTRICAL_CURRENT'),i,'FIXED_WALL_COMPLETE_RAW_SCOPE');
 let completeIndex=0,completeMembershipVerified=false;
 let inventoryIndex=0;
 if(inventory!==undefined){
  requireThat(inventory!==null&&typeof inventory==='object'&&Object.keys(inventory).sort().join(',')==='kind,membership'&&inventory.kind==='FIXED_WALL_NUMERIC_INVENTORY_R1'&&i.config.stopCode==='ELECTRICAL_CURRENT',i,'NUMERIC_INVENTORY_SCOPE');
  const baseline=MASTER_WALL_NUMERIC_INVENTORY_R1[2];
  assertMasterFixedWallBaselineProfileR1(`select row_to_json(t)::text raw from (select * from public.${baseline.table}
      where ${baseline.predicate} limit ${baseline.cap+1})t`,"json_build_object('raw',raw)",[...baseline.args],1,'baseline',{kind:'FIXED_MONOLITHIC_WALL_BASELINE_2M_R1',membership:inventory.membership},i);
 }
 let wireBytes=0;
 const read=async(sql:string,wrapper:string,args:unknown[],cap:number,collection?:MasterAtomicCollectionR1,profile?:MasterFixedWallBaselineProfileR1):Promise<any[]>=>{
  if(completeRaw){
   const expected=MASTER_WALL_NUMERIC_INVENTORY_R1[completeIndex];
   requireThat(expected!==undefined&&(completeIndex===0||completeMembershipVerified)&&profile===undefined&&collection===expected.collection&&cap===expected.cap&&wrapper==="json_build_object('raw',raw)"&&JSON.stringify(args)===JSON.stringify(expected.args)&&sql===`select row_to_json(t)::text raw from (select * from public.${expected.table}
      where ${expected.predicate} limit ${expected.cap+1})t`,i,'FIXED_WALL_COMPLETE_RAW_SCOPE');
  }
  const wallBaseline=completeRaw?collection==='baseline':assertMasterFixedWallBaselineProfileR1(sql,wrapper,args,cap,collection,profile,i);
  if(inventory!==undefined){
   const expected=MASTER_WALL_NUMERIC_INVENTORY_R1[inventoryIndex];
   requireThat(expected!==undefined&&collection===expected.collection&&cap===expected.cap&&wrapper==="json_build_object('raw',raw)"&&JSON.stringify(args)===JSON.stringify(expected.args)&&wallBaseline===(collection==='baseline')&&sql===`select row_to_json(t)::text raw from (select * from public.${expected.table}
      where ${expected.predicate} limit ${expected.cap+1})t`,i,'NUMERIC_INVENTORY_SCOPE');
  }
  const rawCap=wallBaseline?2*1024*1024:completeRaw&&(collection==='normativeLocators'||collection==='contentPassport')?1024*1024:MAX_ROW,wireCap=wallBaseline?2*1024*1024:MAX_WIRE_ROW;
  const n=args.length,remaining=(completeRaw?10*1024*1024:MAX_TOTAL)-wireBytes;
  time();const d=(await c.query(masterAtomicSqlTextR1(sql,wrapper,n,inventory!==undefined),[...args,cap,rawCap,wireCap,remaining])).rows[0];time();
  if(inventory!==undefined){
   const budget=masterWallNumericBudgetRecordR1(d,wireBytes,cap,collection!,wallBaseline);
   wireBytes=budget.cumulativeAfter as number;inventoryIndex++;return[budget];
  }
  try{
  requireThat(Number.isInteger(d?.row_count)&&d.row_count>=0&&d.row_count<=cap
   &&/^\d+$/u.test(d.max_raw_bytes)&&Number(d.max_raw_bytes)<=rawCap
   &&/^\d+$/u.test(d.max_wire_row_bytes)&&Number(d.max_wire_row_bytes)<=wireCap
   &&/^\d+$/u.test(d.wire_bytes)&&Number(d.wire_bytes)+Math.max(d.row_count-1,0)+2<=remaining
   &&typeof d.rows_json==='string'&&Buffer.byteLength(d.rows_json)<=remaining,i,'ATOMIC_ROW_OR_BYTE_CAP');
  }catch(error){
   const diagnostic=masterAtomicBudgetDiagnosticR1(d,wireBytes,remaining,cap,collection,wallBaseline,completeRaw);
   if(diagnostic&&error instanceof Error)Object.defineProperty(error,'atomicBudget',{value:diagnostic});
   throw error;
  }
  const parsed=JSON.parse(d.rows_json);requireThat(Array.isArray(parsed)&&parsed.length===d.row_count,i,'ATOMIC_WRAPPER_COUNT');
  if(completeRaw){
   if(completeIndex===0){
    requireThat(parsed.length===1&&parsed[0]!==null&&typeof parsed[0]==='object'&&typeof parsed[0].raw==='string',i,'FIXED_WALL_COMPLETE_RAW_MEMBERSHIP');
    const member:unknown=JSON.parse(parsed[0].raw);
    requireThat(member!==null&&typeof member==='object'&&!Array.isArray(member)&&Object.entries(MASTER_FIXED_WALL_BASELINE_MEMBERSHIP_R1).every(([key,value])=>{const d=Object.getOwnPropertyDescriptor(member,key);return d&&Object.hasOwn(d,'value')&&d.value===value;}),i,'FIXED_WALL_COMPLETE_RAW_MEMBERSHIP');
    completeMembershipVerified=true;
   }
   completeIndex++;
  }
  wireBytes+=Buffer.byteLength(d.rows_json);return parsed;
 };
 return read;
}

async function readScopedRegistryRawInternal(c:QueryClient,r:MasterResolvedScopedNormativeRegistryR1,
 phase:'BEFORE'|'LOCKED_BEFORE'|'REGISTERED'|'CAPTURE_ONLY'):Promise<MasterScopedNormativeRegistrySnapshotR1>{
 const i=r.input,s=r.declaration.scope,start=performance.now();
 const time=()=>requireThat(performance.now()-start<=12000,i,'SCOPE_READ_DEADLINE');
 requireThat(JSON.stringify(i.newSource)===r.expectedSourceJson&&JSON.stringify(i.newLocators)===r.expectedLocatorsJson,i,'EXPECTED_WRITER_INPUT_DRIFT');
 if(phase!=='BEFORE'&&phase!=='CAPTURE_ONLY'){
  time();const isolation=(await c.query('show transaction_isolation')).rows[0];time();
  requireThat(isolation?.transaction_isolation==='read committed',i,'LOCKED_REREAD_REQUIRES_READ_COMMITTED');
  const locks=(await c.query(`select relation::regclass::text relation from pg_locks where pid=pg_backend_pid() and granted
   and relation=any(array['public.estimate_normative_source'::regclass,'public.estimate_normative_locator'::regclass])
   and mode in ('ShareRowExclusiveLock','ExclusiveLock','AccessExclusiveLock')`)).rows;time();
  const names=new Set(locks.map(l=>String(l.relation).replace(/^public\./u,'')));
  requireThat(names.has('estimate_normative_source')&&names.has('estimate_normative_locator'),i,'EXISTING_TABLE_LOCKS_REQUIRED');
 }
 const read=createMasterAtomicRawReadR1(c,i,time);
 const registered=phase==='REGISTERED',sourceCap=MAX_SOURCE+(registered?1:0),locatorCap=MAX_LOCATOR+(registered?i.newLocators.length:0);
 const snapshot=await readScopedRegistryKernelR1(read,s,r.expectedSourceJson,r.expectedLocatorsJson,sourceCap,locatorCap);
 if(phase==='CAPTURE_ONLY')closure(i,snapshot);
 else assertMasterScopedNormativeRegistrySnapshotR1(r,snapshot,registered?'REGISTERED':'BEFORE');return snapshot;
}
export async function readMasterScopedNormativeRegistryPreconditionsR1(c:QueryClient,r:MasterResolvedScopedNormativeRegistryR1,
 phase:'BEFORE'|'LOCKED_BEFORE'|'REGISTERED'='BEFORE'):Promise<MasterScopedNormativeRegistrySnapshotR1>{
 return readScopedRegistryRawInternal(c,r,phase);
}
/** Capture only on the caller's existing, dedicated repeatable-read READ ONLY
 * transaction. No BEGIN, SET, connection, DML, catalog admission or publication.
 * Its output still needs ROOT context binding and later normal/locked equality. */
export async function captureMasterScopedNormativeRegistryPreimageR1(c:QueryClient,
 i:MasterScopedNormativeRegistryInputR1):Promise<MasterCapturedScopedNormativeRegistryR1>{
 requireThat(!Object.hasOwn(i.config,'capturedScopedNormativeRegistry'),i,'CAPTURE_MUST_NOT_REPLACE_DECLARATION');
 const scope={artifactSha256:i.newSource.artifact_sha256,normId:i.config.normId,
  sourceKey:i.newSource.source_key,generatedSourceId:i.newSource.id,
  generatedLocatorIds:i.newLocators.map(l=>l.id),generatedLocatorKeys:i.newLocators.map(l=>l.locator_key)};
 const seed=makeMasterScopedNormativeRegistryCaptureR1(scope,{sourceRows:[],locatorRows:[]});
 const input={...i,config:{...i.config,capturedScopedNormativeRegistry:seed}};
 const resolved=resolveMasterScopedNormativeRegistryOptInR1(input)!;
 const session=(await c.query("select current_setting('transaction_isolation') isolation,current_setting('transaction_read_only') read_only")).rows;
 requireThat(session.length===1&&session[0]!.isolation==='repeatable read'&&session[0]!.read_only==='on',i,'CAPTURE_REQUIRES_CALLER_REPEATABLE_READ_READ_ONLY');
 const actual=await readScopedRegistryRawInternal(c,resolved,'CAPTURE_ONLY');
 const capture=makeMasterScopedNormativeRegistryCaptureR1(scope,actual);
 resolveMasterScopedNormativeRegistryOptInR1({...input,config:{...input.config,capturedScopedNormativeRegistry:capture}});
 return capture;
}

/** Fixed socket discovery only. No proposed source/locator/candidate rows exist. */
export async function captureMasterSocketCurrentRegistryReadOnlyR1(c:QueryClient,absoluteDeadlineUtc:string){
 const i={config:{stopCode:'SOCKET_CURRENT_INPUTS'}} as const,start=performance.now();
 const end=Date.parse(absoluteDeadlineUtc);
 const time=()=>requireThat(Number.isFinite(end)&&Date.now()<end&&performance.now()-start<=12000,i,'READ_DEADLINE');
 time();const session=(await c.query("select current_setting('transaction_isolation') isolation,current_setting('transaction_read_only') read_only,current_setting('TimeZone') timezone")).rows;time();
 requireThat(session.length===1&&session[0]!.isolation==='repeatable read'&&session[0]!.read_only==='on'&&session[0]!.timezone==='UTC',i,'READ_ONLY_RR_UTC_REQUIRED');
 const scope={sourceKey:'legrand_plexo_069730l_complete_surface_socket_project_scope_r266',
  artifactSha256:'2393d3d995a30c345481b546237f1383ec43e5e7ff9367f1729c867a5e5a7b43',
  locatorKeys:['exact-complete-surface-2pe-project-resources-r266']};
 const read=createMasterAtomicRawReadR1(c,i,time);
 // NULL/[] are absent selector dimensions, never candidate UUIDs or forged rows.
 const sourceRows=await read(SOURCE_SQL,SOURCE_WRAPPER,[scope.artifactSha256,null,scope.sourceKey,[],scope.locatorKeys,null,null,MAX_SOURCE+1],MAX_SOURCE);
 const locatorRows=await read(LOCATOR_SQL,LOCATOR_WRAPPER,[sourceRows.map(row=>row.id),'[]',MAX_LOCATOR+1],MAX_LOCATOR);
 const actual={sourceRows,locatorRows};closure(i,actual);time();
 const exactKeyAbsent=!sourceRows.some(row=>row.sourceKey===scope.sourceKey);
 return {contract:'fixed-socket-current-registry-read/r1',projection:PROJECTION,scope,...actual,
  exactKeyAbsent,artifactAliasOrLocatorReviewRequired:sourceRows.length>0||locatorRows.length>0,
  globalAbsence:false,physicalOwnerAdmission:false,sourceAdmission:false,full:false};
}

function masterAtomicSqlTextR1(sql:string,wrapper:string,n:number,inventory:boolean):string{
 return `with scoped as materialized (${sql}),
   wire as materialized(select ${wrapper}::text wrapped,octet_length(raw)::bigint raw_bytes from scoped),
   diagnosis as materialized(select count(*)::int row_count,coalesce(max(raw_bytes),0)::bigint max_raw_bytes,
    coalesce(max(octet_length(wrapped)),0)::bigint max_wire_row_bytes,
    coalesce(sum(octet_length(wrapped)),0)::bigint wire_bytes from wire)
   select row_count,max_raw_bytes::text,max_wire_row_bytes::text,wire_bytes::text,
    case when ${!inventory?'':'false and '}row_count<=$${n+1} and max_raw_bytes<=$${n+2} and max_wire_row_bytes<=$${n+3}
      and wire_bytes+greatest(row_count-1,0)+2<=$${n+4}
    then (select '['||coalesce(string_agg(wrapped,','),'')||']' from wire) else null end rows_json
   from diagnosis`;
}

/** Only module-owned full-wall and existing scoped registry atomic SELECTs. */
export function isMasterIntegratedCuringAtomicSqlR1(sql:string):boolean{
 const full=MASTER_WALL_NUMERIC_INVENTORY_R1.map(d=>masterAtomicSqlTextR1(
  `select row_to_json(t)::text raw from (select * from public.${d.table}
      where ${d.predicate} limit ${d.cap+1})t`,"json_build_object('raw',raw)",d.args.length,false));
 return [...full,masterAtomicSqlTextR1(SOURCE_SQL,SOURCE_WRAPPER,8,false),masterAtomicSqlTextR1(LOCATOR_SQL,LOCATOR_WRAPPER,3,false)].includes(sql);
}
export type MasterIntegratedCuringRawOracleR145=Readonly<Record<MasterAtomicCollectionR1,readonly string[]>>;
/** One reviewed raw oracle, never a first live read and never an admission input. */
export function assertMasterIntegratedCuringRawOracleR145(raw:MasterIntegratedCuringRawOracleR145):void{
 if(!raw||JSON.stringify(Object.keys(raw))!==JSON.stringify(MASTER_ATOMIC_COLLECTIONS_R1)
  ||!MASTER_ATOMIC_COLLECTIONS_R1.every(k=>Array.isArray(raw[k])&&raw[k].every(v=>typeof v==='string'))
  ||createHash('sha256').update(JSON.stringify(raw)).digest('hex')!=='686debb3d3db54db2dc9aab54767b398be89a0fcd2942272e58b518943cf2d9e')throw Error('INTEGRATED_CURING_PINNED_RAW_ORACLE_REQUIRED');
 const member=JSON.parse(raw.membership[0]!);
 if(!Object.entries(MASTER_FIXED_WALL_BASELINE_MEMBERSHIP_R1).every(([k,v])=>member[k]===v))throw Error('INTEGRATED_CURING_FIVE_FIELD_ORACLE_DRIFT');
}

async function readScopedRegistryKernelR1(read:ReturnType<typeof createMasterAtomicRawReadR1>,s:MasterScopedNormativeRegistryScopeR1,
 expectedSourceJson:string,expectedLocatorsJson:string,sourceCap:number,locatorCap:number):Promise<MasterScopedNormativeRegistrySnapshotR1>{
 const foundSources=await read(SOURCE_SQL,SOURCE_WRAPPER,[s.artifactSha256,s.generatedSourceId,s.sourceKey,
  s.generatedLocatorIds,s.generatedLocatorKeys,s.normId,expectedSourceJson,sourceCap+1],sourceCap);
 const foundLocators=await read(LOCATOR_SQL,LOCATOR_WRAPPER,[foundSources.map(x=>x.id),expectedLocatorsJson,locatorCap+1],locatorCap);
 return{sourceRows:foundSources,locatorRows:foundLocators};
}
/** Existing-source verification, not the absent-source declaration or REGISTERED path. */
export async function readMasterIntegratedCuringRegistryR145(c:QueryClient,oracle:MasterIntegratedCuringRawOracleR145,
 phase:'REPEATABLE_READ'|'NORMAL'|'LOCKED',absoluteDeadlineUtc:string,scopeOracle:MasterScopedNormativeRegistrySnapshotR1):Promise<MasterScopedNormativeRegistrySnapshotR1>{
 assertMasterIntegratedCuringRawOracleR145(oracle);
 assertMasterIntegratedCuringScopeOracleR275(scopeOracle); // Before session or any live query.
 const i={config:{stopCode:'INTEGRATED_CURING'}},start=performance.now(),end=Date.parse(absoluteDeadlineUtc);
 const time=()=>requireThat(Number.isFinite(end)&&Date.now()<end&&performance.now()-start<=12000,i,'SCOPE_READ_DEADLINE');
 requireThat(['REPEATABLE_READ','NORMAL','LOCKED'].includes(phase),i,'PHASE_REQUIRED');
 const sources=oracle.normativeSources.map(v=>JSON.parse(v) as Json).filter(v=>v.id==='7a6855d3-e8b7-5672-8f22-5afe750b501c');
 const locators=oracle.normativeLocators.map(v=>JSON.parse(v) as Json).filter(v=>v.source_id==='7a6855d3-e8b7-5672-8f22-5afe750b501c');
 requireThat(sources.length===1&&locators.length===1&&locators[0]!.id==='d3b89eb0-5081-5dc8-9fda-f7ec9b37bc3b',i,'EXACT_EXISTING_SOURCE_LOCATOR');
 const source={...sources[0]!};delete source.created_at;
 const expectedCreatedAt='2026-10-26T19:54:20.510516Z'; // Exact SOURCE_SQL UTC projection; full-parent text remains +00:00.
 const scope={artifactSha256:source.artifact_sha256,normId:'BOUNDED_PDS_MATERIAL_AND_LITERAL_CASE_STOCK_WITH_ACTUAL_PERIOD_NO_LIFETIME_RATE',
  sourceKey:source.source_key,generatedSourceId:source.id,generatedLocatorIds:locators.map(v=>v.id),generatedLocatorKeys:locators.map(v=>v.locator_key)};
 time();const session=(await c.query("select current_setting('transaction_isolation') isolation,current_setting('transaction_read_only') read_only,current_setting('TimeZone') timezone")).rows;time();
 requireThat(session.length===1&&session[0]!.timezone==='UTC'&&(phase==='REPEATABLE_READ'
  ?session[0]!.isolation==='repeatable read'&&session[0]!.read_only==='on'
  :session[0]!.isolation==='read committed'&&session[0]!.read_only==='off'),i,'EXACT_TRANSACTION_REQUIRED');
 if(phase==='LOCKED'){
  const locks=(await c.query(`select relation::regclass::text relation from pg_locks where pid=pg_backend_pid() and granted
   and relation=any(array['public.estimate_normative_source'::regclass,'public.estimate_normative_locator'::regclass])
   and mode in ('ShareRowExclusiveLock','ExclusiveLock','AccessExclusiveLock')`)).rows;time();
  const names=new Set(locks.map(v=>String(v.relation).replace(/^public\./u,'')));
  requireThat(names.has('estimate_normative_source')&&names.has('estimate_normative_locator'),i,'EXISTING_TABLE_LOCKS_REQUIRED');
 }
 const snapshot=await readScopedRegistryKernelR1(createMasterAtomicRawReadR1(c,i,time),scope,JSON.stringify(source),JSON.stringify(locators),MAX_SOURCE,MAX_LOCATOR);
 closure(i,snapshot);
 assertMasterIntegratedCuringManagedFactsR145(snapshot,source,locators,scope,scopeOracle);
 const actualSource=JSON.parse(snapshot.sourceRows.find(row=>row.id===source.id)!.raw);
 requireThat(actualSource.created_at===expectedCreatedAt,i,'EXACT_ORIGINAL_CREATED_AT_REQUIRED');
 return snapshot;
}

/** Diagnostic serialization only: copies own data fields, never invokes accessors
 * or parses/normalizes PG raw TEXT. No exception grants admission or drops rows. */
export function masterIntegratedCuringFailureDiagnosticJsonR145(snapshot:unknown,scope:unknown):string|null{
 try{
  const bad=():never=>{throw Error('INTEGRATED_SCOPE_DIAGNOSTIC_SCHEMA_OR_CAP');};
  const record=(v:unknown,expected:readonly string[]):object=>{
   if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==[...expected].sort().join(','))return bad();return v;
  };
  const own=(v:object,k:string):unknown=>{const d=Object.getOwnPropertyDescriptor(v,k);if(!d||!Object.hasOwn(d,'value'))return bad();return d.value;};
  const string=(v:unknown,max:number):string=>{if(typeof v!=='string'||Buffer.byteLength(v)>max)return bad();return v;};
  const array=(v:unknown,max:number):unknown[]=>{
   if(!Array.isArray(v))return bad();const count=own(v,'length');
   if(typeof count!=='number'||!Number.isInteger(count)||count<0||count>max||Object.keys(v).length!==count)return bad();
   return Array.from({length:count},(_,i)=>own(v,String(i)));
  };
  const flag=(v:unknown):boolean|null=>{if(v!==null&&typeof v!=='boolean')return bad();return v;};
  const source=(v:unknown):MasterScopedRegistrySourceRawR1=>{
   const r=record(v,['id','sourceKey','raw','managedMatches']);return{id:string(own(r,'id'),36),sourceKey:string(own(r,'sourceKey'),512),raw:string(own(r,'raw'),MAX_ROW),managedMatches:flag(own(r,'managedMatches'))};
  };
  const locator=(v:unknown):MasterScopedRegistryLocatorRawR1=>{
   const r=record(v,['id','sourceId','locatorKey','normIds','raw','managedMatches']);
   const normIds=array(own(r,'normIds'),3).map(v=>v===null?null:string(v,512));if(normIds.length!==3)return bad();
   return{id:string(own(r,'id'),36),sourceId:string(own(r,'sourceId'),36),locatorKey:string(own(r,'locatorKey'),512),normIds,raw:string(own(r,'raw'),MAX_ROW),managedMatches:flag(own(r,'managedMatches'))};
  };
  const input=record(snapshot,['sourceRows','locatorRows']);
  const captured={sourceRows:array(own(input,'sourceRows'),MAX_SOURCE).map(source),locatorRows:array(own(input,'locatorRows'),MAX_LOCATOR).map(locator)};
  // Existing source/locator closure + all3MiB/512KiB/1MiB limits still apply.
  closure({config:{stopCode:'INTEGRATED_CURING'}},captured);
  const s=record(scope,['artifactSha256','normId','sourceKey','generatedSourceId','generatedLocatorIds','generatedLocatorKeys']);
  const expectedScope={artifactSha256:string(own(s,'artifactSha256'),64),normId:string(own(s,'normId'),512),sourceKey:string(own(s,'sourceKey'),512),
   generatedSourceId:string(own(s,'generatedSourceId'),36),generatedLocatorIds:array(own(s,'generatedLocatorIds'),MAX_LOCATOR).map(v=>string(v,36)),generatedLocatorKeys:array(own(s,'generatedLocatorKeys'),MAX_LOCATOR).map(v=>string(v,512))};
  if(!HASH.test(expectedScope.artifactSha256)||!UUID.test(expectedScope.generatedSourceId)||!expectedScope.generatedLocatorIds.every(v=>UUID.test(v)))return bad();
  const diagnostic={contract:'integrated-curing-scoped-failure/r145',errorCode:'STOP_INTEGRATED_CURING_SCOPED_REGISTRY_EXISTING_MANAGED_FACTS_DRIFT',
   expectedScope,expectedSourceCount:2,expectedLocatorCount:2,sourceCount:captured.sourceRows.length,locatorCount:captured.locatorRows.length,
   snapshot:captured,snapshotSha256:createHash('sha256').update(JSON.stringify(captured)).digest('hex'),
   rawProjection:'pg-jsonb-text-utc-microseconds/r1',sourceAdmission:false,normalLockedGuardSatisfied:false,full:false};
  const json=JSON.stringify(diagnostic);return Buffer.byteLength(json)<=4*1024*1024?json:null;
 }catch{return null;}
}
/** The fixed whole A16 union and primary managed facts are authoritative. Failed
 * diagnostic creation cannot turn failure into success or replace the original Error. */
export function assertMasterIntegratedCuringManagedFactsR145(snapshot:MasterScopedNormativeRegistrySnapshotR1,
 source:Json,locators:readonly Json[],scope:MasterScopedNormativeRegistryScopeR1,scopeOracle:MasterScopedNormativeRegistrySnapshotR1):void{
 const i={config:{stopCode:'INTEGRATED_CURING'}};
 try{
 assertMasterIntegratedCuringScopeOracleR275(scopeOracle);
 const primarySource=snapshot.sourceRows.find(row=>row.id===source.id);
 const primaryLocator=snapshot.locatorRows.find(row=>row.id===locators[0]!.id);
 const aliasSource=snapshot.sourceRows.find(row=>row.id==='15ddf10c-ebe4-51d3-84c3-29ced3d9b3c8');
 const aliasLocator=snapshot.locatorRows.find(row=>row.id==='669859cb-0a68-58e3-8563-46d46eda8b66');
 requireThat(snapshot.sourceRows.length===2&&snapshot.locatorRows.length===2
  &&primarySource!==undefined&&primaryLocator!==undefined&&aliasSource!==undefined&&aliasLocator!==undefined
  &&primarySource.sourceKey===source.source_key&&primarySource.managedMatches===true
  &&primaryLocator.sourceId===source.id&&primaryLocator.managedMatches===true
  &&aliasSource.sourceKey==='manufacturer_sika_antisol250w_us_202006_v0103'&&aliasSource.managedMatches===null
  &&aliasLocator.sourceId===aliasSource.id&&aliasLocator.locatorKey==='sika-antisol250w-us-202006-v0103-nominal-broom-coverage-package'&&aliasLocator.managedMatches===null
  &&JSON.stringify(snapshot)===JSON.stringify(scopeOracle),i,'EXISTING_MANAGED_FACTS_DRIFT');
 }catch(error){
  const message=error instanceof Error?Object.getOwnPropertyDescriptor(error,'message'):undefined;
  if(message&&Object.hasOwn(message,'value')&&message.value==='STOP_INTEGRATED_CURING_SCOPED_REGISTRY_EXISTING_MANAGED_FACTS_DRIFT'){
   try{
    const diagnostic=masterIntegratedCuringFailureDiagnosticJsonR145(snapshot,scope);
    if(diagnostic!==null)Object.defineProperty(error,'integratedCuringFailureDiagnosticJsonR145',{value:diagnostic});
   }catch{/* Preserve the same original error even if diagnostic attachment fails. */}
  }
  throw error;
 }
}

/** One independently closed whole scope, never a first live observation. The
 * ordered raw TEXT/flags of primary and alias rows are all hash-bound. */
export function assertMasterIntegratedCuringScopeOracleR275(snapshot:MasterScopedNormativeRegistrySnapshotR1):void{
 const i={config:{stopCode:'INTEGRATED_CURING'}};
 closure(i,snapshot);
 requireThat(snapshot.sourceRows.length===2&&snapshot.locatorRows.length===2
  &&JSON.stringify(snapshot.sourceRows.map(row=>[row.id,row.sourceKey,row.managedMatches]))===JSON.stringify([
   ['7a6855d3-e8b7-5672-8f22-5afe750b501c','gox_concrete_curing_exact_roller_case_method_r108',true],
   ['15ddf10c-ebe4-51d3-84c3-29ced3d9b3c8','manufacturer_sika_antisol250w_us_202006_v0103',null]])
  &&JSON.stringify(snapshot.locatorRows.map(row=>[row.id,row.sourceId,row.locatorKey,row.managedMatches]))===JSON.stringify([
   ['669859cb-0a68-58e3-8563-46d46eda8b66','15ddf10c-ebe4-51d3-84c3-29ced3d9b3c8','sika-antisol250w-us-202006-v0103-nominal-broom-coverage-package',null],
   ['d3b89eb0-5081-5dc8-9fda-f7ec9b37bc3b','7a6855d3-e8b7-5672-8f22-5afe750b501c','concrete-curing-literal-roller-case-and-pds-r108',true]])
  &&createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')==='579c6a406379666280bb81f134114be7155aaa5086c56530687c2590f1fe6866',i,'PINNED_WHOLE_SCOPE_ORACLE_REQUIRED');
}
