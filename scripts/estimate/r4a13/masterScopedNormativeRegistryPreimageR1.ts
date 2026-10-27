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
function fail(i:MasterScopedNormativeRegistryInputR1,s:string):never{throw Error('STOP_'+i.config.stopCode+'_SCOPED_REGISTRY_'+s);}
function requireThat(v:unknown,i:MasterScopedNormativeRegistryInputR1,s:string):asserts v{if(!v)fail(i,s);}
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
function closure(i:MasterScopedNormativeRegistryInputR1,s:MasterScopedNormativeRegistrySnapshotR1):void{
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
async function readScopedRegistryRawInternal(c:QueryClient,r:MasterResolvedScopedNormativeRegistryR1,
 phase:'BEFORE'|'LOCKED_BEFORE'|'REGISTERED'|'CAPTURE_ONLY'):Promise<MasterScopedNormativeRegistrySnapshotR1>{
 const i=r.input,s=r.declaration.scope,start=performance.now();let wireBytes=0;
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
 const read=async(sql:string,wrapper:string,args:unknown[],cap:number):Promise<any[]>=>{
  const n=args.length,remaining=MAX_TOTAL-wireBytes;
  time();const d=(await c.query(`with scoped as materialized (${sql}),
   wire as materialized(select ${wrapper}::text wrapped,octet_length(raw)::bigint raw_bytes from scoped),
   diagnosis as materialized(select count(*)::int row_count,coalesce(max(raw_bytes),0)::bigint max_raw_bytes,
    coalesce(max(octet_length(wrapped)),0)::bigint max_wire_row_bytes,
    coalesce(sum(octet_length(wrapped)),0)::bigint wire_bytes from wire)
   select row_count,max_raw_bytes::text,max_wire_row_bytes::text,wire_bytes::text,
    case when row_count<=$${n+1} and max_raw_bytes<=$${n+2} and max_wire_row_bytes<=$${n+3}
      and wire_bytes+greatest(row_count-1,0)+2<=$${n+4}
    then (select '['||coalesce(string_agg(wrapped,','),'')||']' from wire) else null end rows_json
   from diagnosis`,[...args,cap,MAX_ROW,MAX_WIRE_ROW,remaining])).rows[0];time();
  requireThat(Number.isInteger(d?.row_count)&&d.row_count>=0&&d.row_count<=cap
   &&/^\d+$/u.test(d.max_raw_bytes)&&Number(d.max_raw_bytes)<=MAX_ROW
   &&/^\d+$/u.test(d.max_wire_row_bytes)&&Number(d.max_wire_row_bytes)<=MAX_WIRE_ROW
   &&/^\d+$/u.test(d.wire_bytes)&&Number(d.wire_bytes)+Math.max(d.row_count-1,0)+2<=remaining
   &&typeof d.rows_json==='string'&&Buffer.byteLength(d.rows_json)<=remaining,i,'ATOMIC_ROW_OR_BYTE_CAP');
  const parsed=JSON.parse(d.rows_json);requireThat(Array.isArray(parsed)&&parsed.length===d.row_count,i,'ATOMIC_WRAPPER_COUNT');
  wireBytes+=Buffer.byteLength(d.rows_json);return parsed;
 };
 const registered=phase==='REGISTERED',sourceCap=MAX_SOURCE+(registered?1:0),locatorCap=MAX_LOCATOR+(registered?i.newLocators.length:0);
 const foundSources=await read(SOURCE_SQL,SOURCE_WRAPPER,[s.artifactSha256,s.generatedSourceId,s.sourceKey,
  s.generatedLocatorIds,s.generatedLocatorKeys,s.normId,r.expectedSourceJson,sourceCap+1],sourceCap);
 const foundLocators=await read(LOCATOR_SQL,LOCATOR_WRAPPER,[foundSources.map(x=>x.id),r.expectedLocatorsJson,locatorCap+1],locatorCap);
 const snapshot={sourceRows:foundSources,locatorRows:foundLocators};
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
