import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {Client} from 'pg';
import floor from '../../../data/estimate-benchmarks/source-packs/concrete-curing-floor-only-route-r299.json';
import {concreteCuringRollerCurrentCaptureR108,concreteCuringRollerWholeMasterConfigR108,
  concreteCuringRollerFloorOnlyContextR299,concreteCuringRollerRegistryInputR145,
  verifyConcreteCuringRollerRetainedConfigR108} from './prepareConcreteCuringRollerWholePostR108';
import {captureMasterScopedNormativeRegistryPreimageR1,resolveMasterScopedNormativeRegistryOptInR1,
  readMasterScopedNormativeRegistryPreconditionsR1,assertMasterScopedNormativeRegistryUnchangedR1}
  from './masterScopedNormativeRegistryPreimageR1';
import {readMasterRetainedBindingPreconditionsR1,lockMasterRetainedBindingPreconditionsR1,
  assertMasterRetainedBindingPreflightUnchangedR1,masterRetainedParentCaptureSha256R1}
  from './masterSingleDefinitionRetainParentBindingsR1';

const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
function output(){const dir=process.env.CONCRETE_CURING_FLOOR_R299_NORMAL_OUTPUT;assert(dir);mkdirSync(dir,{recursive:true});
  const bytes=(name:string,b:Buffer)=>{assert(b.length<=4*1024*1024,'EXISTING_LOCAL_RAW_ARTIFACT_4MIB_CAP');const path=join(dir,name);
    assert(!existsSync(path));writeFileSync(path,b,{flag:'wx'});return{path,sha256:sha(b),bytes:b.length};};
  return{bytes,save:(name:string,v:unknown)=>bytes(name,Buffer.from(JSON.stringify(v,null,2)+'\n'))};}
// Existing R293/FirePSU PG_TEXT journal. It does not rewrite owner SQL or rows.
function journal(client:Client,out:ReturnType<typeof output>){const evidence:ReturnType<typeof out.save>[]=[];
  const traced=new Proxy(client,{get(target,key,receiver){if(key!=='query')return Reflect.get(target,key,receiver);
    return async(text:unknown,values:unknown=[])=>{assert(typeof text==='string'&&Array.isArray(values),'EXISTING_TEXT_QUERY_SHAPE_ONLY');
      assert(/^\s*(?:select|with|begin|set local|show|lock table|rollback)\b/iu.test(text),'NO_DML_OR_PUBLISHER_ALLOWED');
      const result=await target.query(text,values),index=evidence.length+1;
      const rows=result.rows.map((row:unknown,ri:number)=>{assert(object(row));return Object.fromEntries(Object.entries(row).map(([k,v])=>[k,
        typeof v==='string'?{kind:'PG_TEXT',...out.bytes(`query-${index}-row-${ri}-${k}.txt`,Buffer.from(v))}:v]));});
      evidence.push(out.save(`query-${index}.json`,{text,values,command:result.command,rowCount:result.rowCount,rows}));return result;
    };}});return{client:traced,evidence};}
function index(snapshot:Awaited<ReturnType<typeof readMasterRetainedBindingPreconditionsR1>>){const c=snapshot.capture;
  return{kind:'BOUNDED_INDEX_COMPLETE_ORIGINAL_PG_TEXT_IN_QUERY_JOURNAL',captureSha256:masterRetainedParentCaptureSha256R1(c),
    definitionId:c.definition.id,baselineId:c.baseline.id,counts:{parameters:c.parameters.length,formulas:c.formulas.length,
      resources:c.resources.length,bindings:c.bindings.length,sources:c.normativeSources.length,locators:c.normativeLocators.length},
    newSources:snapshot.newSources,newLocators:snapshot.newLocators};}

test('one exact floor derived expected preimage passes genuine scoped and complete normal locked rollback guards only',async()=>{
  const out=output(),sourceRoot=resolve(__dirname,'../../..');let coreEntries=0;
  const context={sourceRoot,outputRoot:process.env.CONCRETE_CURING_FLOOR_R299_NORMAL_OUTPUT!,
    releaseId:floor.expectedPacketReleaseId,searchReleaseId:floor.expectedSearchReleaseId,
    floorOnlyExtension:concreteCuringRollerFloorOnlyContextR299,
    onCoreEntry:()=>{coreEntries++;throw Error('FORMAL_NORMAL_MUST_NOT_CALL_ACCEPTED_OR_FUTURE_CORE');}};
  const pointer:unknown=JSON.parse(readFileSync('C:/dev/rik-expo-app-r4a5-dc4f0ce7/data/estimate-benchmarks/r568-local-developer-canonical-release.json','utf8'));
  assert(object(pointer));assert.equal(pointer.definitionReleaseId,context.releaseId);assert.equal(pointer.searchReleaseId,context.searchReleaseId);
  const base=concreteCuringRollerWholeMasterConfigR108(context,floor.entry.catalogId);
  verifyConcreteCuringRollerRetainedConfigR108(base,path=>resolve(sourceRoot,path));assert.equal(coreEntries,0);
  const expected=concreteCuringRollerCurrentCaptureR108(sourceRoot,floor.entry.catalogId,context.floorOnlyExtension).capture;
  assert.equal(masterRetainedParentCaptureSha256R1(expected),floor.entry.capturedParentSha256);
  const rawUrl=process.env.ESTIMATE_MIGRATION_DATABASE_URL;assert(rawUrl);const url=new URL(rawUrl);
  assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');assert.equal(url.pathname,'/rik_r4_runtime_b5_v2');
  const client=new Client({connectionString:rawUrl,connectionTimeoutMillis:5000,application_name:'gox-root-curing-floor-formal-normal-r299'});
  const j=journal(client,out),c=j.client;let connected=false,rollback=false,normal=false,locked=false;
  let failure:Readonly<{name:string;message:string}>|null=null;
  try{
    await client.connect();connected=true;await c.query('begin isolation level repeatable read read only');
    await c.query("set local timezone='UTC'");await c.query("set local statement_timeout='10000ms'");
    const formalGenerated=concreteCuringRollerRegistryInputR145(base);
    const formalInput={...formalGenerated,config:base};
    const first=await captureMasterScopedNormativeRegistryPreimageR1(c,formalInput);out.save('FORMAL_FIRST_CAPTURE_R299.json',first);
    const second=await captureMasterScopedNormativeRegistryPreimageR1(c,formalInput);out.save('FORMAL_SECOND_CAPTURE_R299.json',second);
    assert.deepEqual(first,second,'GENUINE_EXACT_SCOPED_RAW_CAPTURE_TWICE');
    // captureMasterScopedNormativeRegistryPreimageR1 and the explicit resolver below
    // reject exact emitted source/locator conflicts. Unrelated same-artifact rows
    // remain in the complete twice-read snapshot and NORMAL/LOCKED comparisons.
    await c.query('rollback');rollback=true;
    const config={...base,capturedScopedNormativeRegistry:first};
    const input={...concreteCuringRollerRegistryInputR145(config),config};
    const scoped=resolveMasterScopedNormativeRegistryOptInR1(input);assert(scoped);
    await c.query('begin isolation level read committed');rollback=false;
    await c.query("set local timezone='UTC'");await c.query("set local statement_timeout='10000ms'");await c.query("set local lock_timeout='5s'");
    const scopedBefore=await readMasterScopedNormativeRegistryPreconditionsR1(c,scoped,'BEFORE');out.save('FORMAL_NORMAL_R299.json',scopedBefore);
    const before=await readMasterRetainedBindingPreconditionsR1(c,input);out.save('WHOLE_NORMAL_INDEX_R299.json',index(before));
    assert.equal(masterRetainedParentCaptureSha256R1(before.capture),floor.entry.capturedParentSha256);normal=true;
    await lockMasterRetainedBindingPreconditionsR1(c,input);
    const scopedLocked=await readMasterScopedNormativeRegistryPreconditionsR1(c,scoped,'LOCKED_BEFORE');out.save('FORMAL_LOCKED_R299.json',scopedLocked);
    const after=await readMasterRetainedBindingPreconditionsR1(c,input);out.save('WHOLE_LOCKED_INDEX_R299.json',index(after));
    assertMasterScopedNormativeRegistryUnchangedR1(scoped,scopedBefore,scopedLocked);
    assertMasterRetainedBindingPreflightUnchangedR1(input,before,after);
    assert.equal(masterRetainedParentCaptureSha256R1(after.capture),floor.entry.capturedParentSha256);locked=true;
  }catch(e:unknown){failure={name:e instanceof Error?e.name:'Error',message:e instanceof Error?e.message:String(e)};out.save('FIRST_FAILURE_R299.json',failure);}
  finally{if(connected){try{await c.query('rollback');rollback=true;}catch(e:unknown){failure??={name:'RollbackError',message:e instanceof Error?e.message:String(e)};}}await client.end();}
  out.save('FINAL_FLOOR_FORMAL_NORMAL_LOCKED_R299.json',{status:failure?'HOLD_FIRST_FAILURE':'PASS_SCOPED_AND_WHOLE_NORMAL_LOCKED_ONLY',
    failure,normal,locked,rollback,coreEntries,queryEvidence:j.evidence,databaseWrites:0,publication:0,actualPPR:0,
    readOnlyTransactionClaim:false,transactions:'RR_READONLY_FORMAL_THEN_RC_LOCK_ONLY_FINALLY_ROLLBACK',
    expectedPacket:'DERIVED_HELD_NOT_FRESH',R249HOLD:'UNCHANGED',wholeCareNeedClosures:0,FULL:false});
  assert(rollback);assert.equal(coreEntries,0);if(failure)throw Error(failure.message);
},110000);
