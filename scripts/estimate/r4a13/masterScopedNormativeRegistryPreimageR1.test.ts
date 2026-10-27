// ROOT WORK prospective pure/mock cases. Test-only TEXT, no PG acceptance claim.
import {makeMasterScopedNormativeRegistryCaptureR1 as capture,
 masterScopedNormativeRegistryCaptureSha256R1 as hash,
 resolveMasterScopedNormativeRegistryOptInR1 as opt,
 assertMasterScopedNormativeRegistrySnapshotR1 as check,
 assertMasterScopedNormativeRegistryUnchangedR1 as unchanged,
 readMasterScopedNormativeRegistryPreconditionsR1 as read,
 captureMasterScopedNormativeRegistryPreimageR1 as readCapture} from './masterScopedNormativeRegistryPreimageR1';
type Json=Record<string,any>;
const copy=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
function setup(){
 const source={id:'10000000-0000-5000-8000-000000000001',source_key:'TEST_NEW_SCOPED_KEY',title_ru:'TEST ONLY',authority:'TEST ONLY',official_url:null,artifact_sha256:'a'.repeat(64),effective_from:null,effective_to:null,metadata:{testOnly:true}};
 const locator={id:'10000000-0000-5000-8000-000000000002',source_id:source.id,locator_key:'TEST_NEW_LOCATOR',locator:{exactColumn:'TEST_NEW_NORM'},excerpt_sha256:'b'.repeat(64)};
 const scope={artifactSha256:source.artifact_sha256,normId:locator.locator.exactColumn,sourceKey:source.source_key,generatedSourceId:source.id,generatedLocatorIds:[locator.id],generatedLocatorKeys:[locator.locator_key]};
 const old={id:'20000000-0000-5000-8000-000000000001',sourceKey:'TEST_OLD_THICKNESS_ONLY',managedMatches:null,
  raw:'{"id": "20000000-0000-5000-8000-000000000001", "metadata": {"wide": 9007199254740992, "deep": {"ratio": 0.123456789012345678901}}, "created_at": "2026-10-19T00:00:00.123456Z"}'};
 const oldLoc={id:'20000000-0000-5000-8000-000000000002',sourceId:old.id,locatorKey:'TEST_OLD_LOCATOR',normIds:['TEST_OLD_NORM',null,null],managedMatches:null,
  raw:'{"id": "20000000-0000-5000-8000-000000000002", "locator": {"wide": 9007199254740992}, "excerpt_sha256": "TEST_ONLY"}'};
 const before={sourceRows:[old],locatorRows:[oldLoc]},declaration=capture(scope,before);
 const input:any={config:{stopCode:'RAW_SCOPE_TEST',normId:scope.normId,catalogAppend:{capturedSourcePreimage:{sourceKey:source.source_key,expected:null}},capturedScopedNormativeRegistry:declaration},newSource:source,newLocators:[locator]};
 const registered={sourceRows:[copy(old),{id:source.id,sourceKey:source.source_key,raw:JSON.stringify({...source,created_at:'2026-10-19T00:00:00.654321Z'}),managedMatches:true}],
  locatorRows:[copy(oldLoc),{id:locator.id,sourceId:source.id,locatorKey:locator.locator_key,normIds:[scope.normId,null,null],raw:JSON.stringify(locator),managedMatches:true}]};
 return{input,source,locator,scope,before,declaration,registered};
}
function recapture(s:ReturnType<typeof setup>){s.input.config.capturedScopedNormativeRegistry=capture(s.scope,s.before);}
/** The mock supplies the result of a single atomic server snapshot per set.
 * It cannot establish that a real PG query executes; SQL tests remain required. */
function mock(snapshot:Json,options:Json={}){
 const calls:{sql:string;args:unknown[]|undefined}[]=[];
 return{calls,client:{query:async(sql:string,args?:unknown[])=>{
  calls.push({sql,args});
  if(sql.includes("current_setting('transaction_read_only')"))return{rows:[{isolation:options.isolation??'repeatable read',read_only:options.readOnly??'on'}]};
  if(sql==='show transaction_isolation')return{rows:[{transaction_isolation:options.isolation??'read committed'}]};
  if(sql.includes('from pg_locks'))return{rows:options.noLocks?[]:[{relation:'estimate_normative_source'},{relation:'public.estimate_normative_locator'}]};
  const rows=sql.includes('from public.estimate_normative_source s')?snapshot.sourceRows:snapshot.locatorRows;
  const parts=rows.map((r:Json)=>JSON.stringify(r)),text='['+parts.join(',')+']';
  return{rows:[{row_count:options.count??rows.length,max_raw_bytes:options.maxRaw??String(Math.max(0,...rows.map((r:Json)=>Buffer.byteLength(r.raw)))),
   max_wire_row_bytes:options.maxWire??String(Math.max(0,...parts.map((p:string)=>Buffer.byteLength(p)))),
   wire_bytes:options.total??String(parts.reduce((n:number,p:string)=>n+Buffer.byteLength(p),0)),
   rows_json:options.noPayload?null:options.payload??text}]};
 }}as any};
}
describe('raw TEXT normative scope, lossless old rows and bounded atomic read',()=>{
 test('preserves all raw TEXT while an honest distinct key shares the same PDF',()=>{const s=setup(),r=opt(s.input)!;expect(()=>check(r,s.before)).not.toThrow();expect(()=>check(r,s.registered,'REGISTERED')).not.toThrow();expect(r.declaration.sourceRows[0]!.raw).toContain('9007199254740992');});
 test('omitted declaration keeps the no-query legacy path',()=>{const s=setup();delete s.input.config.capturedScopedNormativeRegistry;expect(opt(s.input)).toBeNull();});
 test.each([null,undefined,[],false,{}])('refuses malformed present opt-in %p',v=>{const s=setup();s.input.config.capturedScopedNormativeRegistry=v;expect(()=>opt(s.input)).toThrow('OPT_IN_RAW_PROJECTION_OBJECT');});
 test('refuses an older parsed-row projection instead of converting it',()=>{const s=setup();s.input.config.capturedScopedNormativeRegistry.projection='PARSED_OLD_ROW_TO_JSON';expect(()=>opt(s.input)).toThrow('OPT_IN_RAW_PROJECTION_OBJECT');});
 test('requires an explicit strict absent source-key route',()=>{const s=setup();delete s.input.config.catalogAppend.capturedSourcePreimage;expect(()=>opt(s.input)).toThrow('EXPLICIT_STRICT_ABSENCE_REQUIRED');});
 test('keeps registry reuse unsupported for this CREATE route',()=>{const s=setup();s.input.config.binding={reuseExistingNormativeRegistry:null};expect(()=>opt(s.input)).toThrow('REUSE_CONFLICT');});
 test('accepts the existing retained distinct-source strict-absence route',()=>{const s=setup();s.input.config.binding={retainParentBindings:{capturedSourcePreimage:s.input.config.catalogAppend.capturedSourcePreimage}};delete s.input.config.catalogAppend;expect(()=>opt(s.input)).not.toThrow();});
 test('rejects conflicting append and retained routes',()=>{const s=setup();s.input.config.binding={retainParentBindings:{capturedSourcePreimage:s.input.config.catalogAppend.capturedSourcePreimage}};expect(()=>opt(s.input)).toThrow('ONE_SUPPORTED_ABSENCE_ROUTE_REQUIRED');});
 test.each(['artifactSha256','normId','sourceKey','generatedSourceId','generatedLocatorIds','generatedLocatorKeys'])('binds generated scope field %s',key=>{const s=setup();s.input.config.capturedScopedNormativeRegistry.scope[key]=key.startsWith('generatedLocator')?['FALSE']:'FALSE';expect(()=>opt(s.input)).toThrow('EXACT_GENERATED_SCOPE');});
 test('hash covers the raw integer lexeme without IEEE-754 coercion',()=>{const s=setup(),a=s.declaration.captureSha256;s.before.sourceRows[0]!.raw=s.before.sourceRows[0]!.raw.replace('9007199254740992','9007199254740993');expect(capture(s.scope,s.before).captureSha256).not.toBe(a);});
 test('rejects a changed large integer that JSON.parse rounds to the same Number',()=>{const s=setup(),r=opt(s.input)!,old=s.before.sourceRows[0]!.raw;s.before.sourceRows[0]!.raw=old.replace('9007199254740992','9007199254740993');expect(JSON.parse(old)).toEqual(JSON.parse(s.before.sourceRows[0]!.raw));expect(()=>check(r,s.before)).toThrow('BEFORE_FULL_RAW_SCOPE_CHANGED');});
 test('rejects a deep decimal change beyond JS Number precision',()=>{const s=setup(),r=opt(s.input)!,old=s.before.sourceRows[0]!.raw;s.before.sourceRows[0]!.raw=old.replace('0.123456789012345678901','0.123456789012345678902');expect(JSON.parse(old)).toEqual(JSON.parse(s.before.sourceRows[0]!.raw));expect(()=>check(r,s.before)).toThrow('BEFORE_FULL_RAW_SCOPE_CHANGED');});
 test('rejects full raw locator drift beyond JS Number precision',()=>{const s=setup(),r=opt(s.input)!;s.before.locatorRows[0]!.raw=s.before.locatorRows[0]!.raw.replace('9007199254740992','9007199254740993');expect(()=>check(r,s.before)).toThrow('BEFORE_FULL_RAW_SCOPE_CHANGED');});
 test('preserves timestamp microseconds as raw TEXT',()=>{const s=setup(),r=opt(s.input)!;s.before.sourceRows[0]!.raw=s.before.sourceRows[0]!.raw.replace('.123456Z','.123457Z');expect(()=>check(r,s.before)).toThrow('BEFORE_FULL_RAW_SCOPE_CHANGED');});
 test.each(['sourceKey','id'])('binds source sidecar %s to the capture',key=>{const s=setup(),r=opt(s.input)!;(s.before.sourceRows[0]as Json)[key]=key==='id'?'30000000-0000-5000-8000-000000000001':'OTHER_KEY';if(key==='id')s.before.locatorRows[0]!.sourceId=s.before.sourceRows[0]!.id;expect(()=>check(r,s.before)).toThrow('BEFORE_FULL_RAW_SCOPE_CHANGED');});
 test.each(['locatorKey','normIds'])('binds locator sidecar %s to the capture',key=>{const s=setup(),r=opt(s.input)!;(s.before.locatorRows[0]as Json)[key]=key==='normIds'?['OTHER',null,null]:'OTHER_KEY';expect(()=>check(r,s.before)).toThrow('BEFORE_FULL_RAW_SCOPE_CHANGED');});
 test('requires full locator closure',()=>{const s=setup(),r=opt(s.input)!;s.before.locatorRows=[];expect(()=>check(r,s.before)).toThrow('BEFORE_FULL_RAW_SCOPE_CHANGED');});
 test.each([0,1,2])('refuses exact norm alias already registered at index %s',index=>{const s=setup();s.before.locatorRows[0]!.normIds[index]=s.scope.normId;recapture(s);expect(()=>opt(s.input)).toThrow('ALREADY_REGISTERED_EXACT_SCOPE_REQUIRES_OTHER_ROUTE');});
 test('refuses exact proposed locator key already present under a different source',()=>{const s=setup();s.before.locatorRows[0]!.locatorKey=s.scope.generatedLocatorKeys[0]!;recapture(s);expect(()=>opt(s.input)).toThrow('ALREADY_REGISTERED_EXACT_SCOPE_REQUIRES_OTHER_ROUTE');});
 test('rejects a forged capture hash',()=>{const s=setup();s.input.config.capturedScopedNormativeRegistry.captureSha256='0'.repeat(64);expect(()=>opt(s.input)).toThrow('CAPTURE_HASH');});
 test('defensive copy seals caller raw arrays',()=>{const s=setup(),r=opt(s.input)!;s.input.config.capturedScopedNormativeRegistry.sourceRows[0].raw='CHANGED';expect(()=>check(r,s.before)).not.toThrow();});
 test('rejects mutation of resolved raw evidence',()=>{const s=setup(),r=opt(s.input)!;(r.declaration.sourceRows[0]as Json).raw='CHANGED';expect(()=>check(r,s.before)).toThrow('RESOLVED_CAPTURE_DRIFT');});
 test('requires unchanged locked full raw scope',()=>{const s=setup(),r=opt(s.input)!,locked=copy(s.before);locked.sourceRows[0]!.raw+=' ';expect(()=>unchanged(r,s.before,locked)).toThrow('BEFORE_FULL_RAW_SCOPE_CHANGED');});
 test.each([false,null])('requires true boolean for new registered source %p',v=>{const s=setup();(s.registered.sourceRows[1]as Json).managedMatches=v;expect(()=>check(opt(s.input)!,s.registered,'REGISTERED')).toThrow('REGISTERED_NEW_SOURCE_MANAGED_TEXT_CHANGED');});
 test.each([false,null])('requires true boolean for new registered locator %p',v=>{const s=setup();(s.registered.locatorRows[1]as Json).managedMatches=v;expect(()=>check(opt(s.input)!,s.registered,'REGISTERED')).toThrow('REGISTERED_NEW_LOCATOR_MANAGED_TEXT_CHANGED');});
 test.each(['true',1])('rejects malformed registered source verdict type %p before managed row comparison',v=>{const s=setup();(s.registered.sourceRows[1]as Json).managedMatches=v;expect(()=>check(opt(s.input)!,s.registered,'REGISTERED')).toThrow('SOURCE_RAW_HEADER_OR_UNIQUENESS');});
 test.each(['true',1])('rejects malformed registered locator verdict type %p before managed row comparison',v=>{const s=setup();(s.registered.locatorRows[1]as Json).managedMatches=v;expect(()=>check(opt(s.input)!,s.registered,'REGISTERED')).toThrow('LOCATOR_RAW_HEADER_OR_CLOSURE');});
 test('requires exactly the one new source and all expected locators',()=>{const s=setup();s.registered.locatorRows.pop();expect(()=>check(opt(s.input)!,s.registered,'REGISTERED')).toThrow('REGISTERED_NEW_LOCATOR_MANAGED_TEXT_CHANGED');});
 test('keeps all old raw rows immutable after registration',()=>{const s=setup();s.registered.sourceRows[0]!.raw+=' ';expect(()=>check(opt(s.input)!,s.registered,'REGISTERED')).toThrow('REGISTERED_OLD_FULL_RAW_SCOPE_CHANGED');});
 test('ordinary read uses exactly one atomic SELECT per source/locator set',async()=>{const s=setup(),m=mock(s.before);expect(await read(m.client,opt(s.input)!)).toEqual(s.before);expect(m.calls).toHaveLength(2);expect(m.calls.every(c=>c.sql.startsWith('with scoped as materialized'))).toBe(true);});
 test.each([{count:17,noPayload:true},{maxRaw:String(512*1024+1),noPayload:true},{maxWire:String(1024**2+1),noPayload:true},{total:String(3*1024**2+1),noPayload:true}])('receives diagnosis only when concurrent snapshot exceeds cap %p',async options=>{const s=setup(),m=mock(s.before,options);await expect(read(m.client,opt(s.input)!)).rejects.toThrow('ATOMIC_ROW_OR_BYTE_CAP');expect(m.calls).toHaveLength(1);});
 test('requires wrapper count consistent with its one statement diagnosis',async()=>{const s=setup(),m=mock(s.before,{payload:'[]'});await expect(read(m.client,opt(s.input)!)).rejects.toThrow('ATOMIC_WRAPPER_COUNT');expect(m.calls).toHaveLength(1);});
 test('fails before query if resolved expected writer input drifted',async()=>{const s=setup(),r=opt(s.input)!,m=mock(s.before);r.input.newSource.metadata={changed:true};await expect(read(m.client,r)).rejects.toThrow('EXPECTED_WRITER_INPUT_DRIFT');expect(m.calls).toHaveLength(0);});
 test('locked read requires READ COMMITTED',async()=>{const s=setup(),m=mock(s.before,{isolation:'repeatable read'});await expect(read(m.client,opt(s.input)!,'LOCKED_BEFORE')).rejects.toThrow('LOCKED_REREAD_REQUIRES_READ_COMMITTED');expect(m.calls).toHaveLength(1);});
 test('locked read requires both existing table locks',async()=>{const s=setup(),m=mock(s.before,{noLocks:true});await expect(read(m.client,opt(s.input)!,'LOCKED_BEFORE')).rejects.toThrow('EXISTING_TABLE_LOCKS_REQUIRED');expect(m.calls).toHaveLength(2);});
 test('registered reader enforces exact old/new scope under the existing locks',async()=>{const s=setup(),m=mock(s.registered);expect(await read(m.client,opt(s.input)!,'REGISTERED')).toEqual(s.registered);expect(m.calls).toHaveLength(4);});
 test('fresh capture takes raw TEXT only from the caller read-only snapshot',async()=>{const s=setup(),m=mock(s.before);delete s.input.config.capturedScopedNormativeRegistry;const c=await readCapture(m.client,s.input);expect(c.captureSha256).toBe(s.declaration.captureSha256);expect(hash(c)).toBe(c.captureSha256);expect(m.calls).toHaveLength(3);});
 test.each([{isolation:'read committed'},{readOnly:'off'}])('capture refuses an ungoverned transaction %p',async options=>{const s=setup(),m=mock(s.before,options);delete s.input.config.capturedScopedNormativeRegistry;await expect(readCapture(m.client,s.input)).rejects.toThrow('CAPTURE_REQUIRES_CALLER_REPEATABLE_READ_READ_ONLY');expect(m.calls).toHaveLength(1);});
 test('capture never replaces an existing declaration silently',async()=>{const s=setup(),m=mock(s.before);await expect(readCapture(m.client,s.input)).rejects.toThrow('CAPTURE_MUST_NOT_REPLACE_DECLARATION');expect(m.calls).toHaveLength(0);});
});


describe('ordinary whole PROJECT_SYSTEM typed quantity route uses the same raw registry owner',()=>{
 function ordinary(){const s=setup();delete s.input.config.catalogAppend;
  s.source.metadata={testOnly:true,sourceKind:'PROJECT_SYSTEM'} as typeof s.source.metadata;
  s.registered.sourceRows.find(row=>row.id===s.source.id)!.raw=JSON.stringify({...s.source,created_at:'2026-10-19T00:00:00.654321Z'});
  s.input.config.binding={ordinaryCompositeSourceV1:{contract:'master-ordinary-composite-source/v1',
   capturedSourcePreimage:{sourceKey:s.source.source_key,expected:null}}};return s;}
 test('accepts strict absent ordinary source and still validates registered managed rows plus unchanged old raw scope',()=>{
  const s=ordinary(),r=opt(s.input)!;expect(()=>check(r,s.before)).not.toThrow();expect(()=>check(r,s.registered,'REGISTERED')).not.toThrow();
  s.registered.sourceRows[0]!.raw=s.registered.sourceRows[0]!.raw.replace('9007199254740992','9007199254740993');
  expect(()=>check(r,s.registered,'REGISTERED')).toThrow('REGISTERED_OLD_FULL_RAW_SCOPE_CHANGED');
 });
 test('rejects mixing ordinary and append/retain, undefined mode, wrong source kind and forged absence',()=>{
  const missing=ordinary();delete missing.input.config.capturedScopedNormativeRegistry;
  expect(()=>opt(missing.input)).toThrow('ORDINARY_SOURCE_CAPTURE_REQUIRED');
  const s=ordinary();s.input.config.catalogAppend={capturedSourcePreimage:{sourceKey:s.source.source_key,expected:null}};
  expect(()=>opt(s.input)).toThrow('ONE_SUPPORTED_ABSENCE_ROUTE_REQUIRED');delete s.input.config.catalogAppend;
  s.input.config.binding.ordinaryCompositeSourceV1=undefined;expect(()=>opt(s.input)).toThrow('ORDINARY_TYPED_COMPOSITE_DECLARATION');
  const kind=ordinary();kind.source.metadata={testOnly:true};expect(()=>opt(kind.input)).toThrow('ORDINARY_TYPED_COMPOSITE_DECLARATION');
  const absent=ordinary();absent.input.config.binding.ordinaryCompositeSourceV1.capturedSourcePreimage.expected={};
  expect(()=>opt(absent.input)).toThrow('EXPLICIT_STRICT_ABSENCE_REQUIRED');
 });
});
