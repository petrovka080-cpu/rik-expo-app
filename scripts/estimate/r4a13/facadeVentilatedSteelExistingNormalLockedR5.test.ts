import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Client} from 'pg';
import {facadeVentilatedSteelMasterConfigR5,verifyFacadeVentilatedSteelRetainedR5} from './prepareFacadeVentilatedSteelExistingOwnerR5';
import {readMasterRetainedBindingPreconditionsR1,lockMasterRetainedBindingPreconditionsR1,
  assertMasterRetainedBindingPreflightUnchangedR1,masterRetainedParentCaptureSha256R1,
  type MasterRetainedBindingGuardInputR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {hashMasterSingleDefinitionSuccessorReceiptR1,resolveMasterSingleDefinitionLocatorExcerptSha256R1,
  type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';

// The existing ordinary Config's exact private representative input, using the
// same publisher identity/excerpt functions. No second publication path.
function inputOf(config:MasterSingleDefinitionSuccessorConfig):MasterRetainedBindingGuardInputR1{
  const uuid=(seed:string)=>{const b=Buffer.from(hashMasterSingleDefinitionSuccessorReceiptR1(seed).slice(0,32),'hex');
    b[6]=(b[6]!&15)|80;b[8]=(b[8]!&63)|128;const h=b.toString('hex');
    return`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
  const contract=config.contract,sourceId=config.sourceId,m=config.sourceMetadata,
    id=uuid(`${contract}:${sourceId}:source`),locator=uuid(`${contract}:${sourceId}:${config.locator.key}:locator`);
  return{config,newSource:{id,source_key:sourceId,title_ru:m.source_title,authority:m.source_authority,
    official_url:m.official_url??null,artifact_sha256:m.artifact_sha256??null,effective_from:m.effective_from??null,effective_to:null,
    metadata:{contract,sourceKind:m.source_kind,useRestriction:m.use_restriction,universalProductivityClaimed:false,
      universalConsumptionClaimed:false,activationAllowed:false}},
    newLocators:[{id:locator,source_id:id,locator_key:config.locator.key,locator:config.locator.payload,
      excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}]};
}
const digest=(v:unknown)=>createHash('sha256').update(stable(v)).digest('hex');

test('same existing NVF Config real normal and LOCKED full-parent/source preconditions without core or publication',async()=>{
  const sourceRoot=resolve(__dirname,'../../..'),output=process.env.FACADE_NVF_STEEL_NORMAL_LOCKED_OUTPUT;
  assert(output);mkdirSync(output,{recursive:true});
  const save=(name:string,value:unknown)=>{const text=JSON.stringify(value,null,2)+'\n';
    assert(Buffer.byteLength(text)<=4*1024*1024,'ARTIFACT_BYTE_CAP_HOLD_WITHOUT_TRUNCATION');
    writeFileSync(resolve(output,name+'.json'),text,{flag:'wx'});};
  const pointer=JSON.parse(readFileSync(resolve(sourceRoot,'data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  assert.equal(pointer.productionAccessed,false);
  let coreEntries=0;
  const config=facadeVentilatedSteelMasterConfigR5({sourceRoot,outputRoot:output,
    releaseId:String(pointer.definitionReleaseId),searchReleaseId:String(pointer.searchReleaseId),
    onCoreCall:()=>{coreEntries++;throw Error('NORMAL_LOCKED_MUST_NOT_RERUN_CORE');}});
  assert.equal(config.catalogId,'canonical-work:expanded:ventilated_facade');assert.equal(config.catalogAppend,undefined);
  verifyFacadeVentilatedSteelRetainedR5(config,path=>resolve(sourceRoot,path));
  const input=inputOf(config),retained=config.binding.retainParentBindings;assert(retained);
  assert.deepEqual(retained.capturedSourcePreimage,{sourceKey:config.sourceId,expected:null});
  assert.equal(config.binding.reuseExistingNormativeRegistry,undefined);
  assert.equal(config.parameterDefinitions.length,117);assert.equal(config.formulaDefinitions.length,140);
  assert.equal(config.resourceDefinitions.length,140);assert.equal(coreEntries,0);
  save('00_EXPECTED_INPUTS_BEFORE_SQL',{catalogId:config.catalogId,parentReleaseId:config.parentReleaseId,
    parentDefinitionId:retained.capturedParent.definition.id,parentBaselineId:retained.capturedParent.baseline.id,
    captureSha256:retained.capturedParentSha256,newSource:input.newSource,newLocators:input.newLocators,
    existingConfigGuardPassed:true,coreEntries:0,publicationAttempted:false});
  const rawUrl=process.env.ESTIMATE_MIGRATION_DATABASE_URL;assert(rawUrl);
  const url=new URL(rawUrl);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');
  assert.equal(url.pathname,'/rik_r4_runtime_b5_v2');
  const applicationName='gox-facade-nvf-steel-normal-locked-r5',client=new Client({connectionString:rawUrl,
    connectionTimeoutMillis:5000,application_name:applicationName});
  let phase='CONNECT',rolledBack=false,index=0;
  const journal:{phase:string;index:number;sqlSha256:string;valuesSha256:string;rowsSha256:string;rows:number}[]=[];
  // Preserve Client.query's complete overload type; the tracked read window
  // deliberately admits only the string-SQL Promise form used by this owner.
  const q={query:new Proxy(client.query,{apply(target,_receiver:unknown,args:readonly unknown[]){
    assert(args.length>=1&&args.length<=2,'TRACKED_QUERY_STRING_PROMISE_OVERLOAD_ONLY');
    const sql=args[0],suppliedValues=args[1];
    assert(typeof sql==='string','TRACKED_QUERY_STRING_SQL_ONLY');
    assert(suppliedValues===undefined||Array.isArray(suppliedValues),'TRACKED_QUERY_VALUES_ARRAY_ONLY');
    const values:readonly unknown[]=suppliedValues??[];
    assert(/^(?:select|show|lock\s+table|set\s+local)\b/iu.test(sql.trim()),'SELECT_SETTINGS_LOCKS_ONLY_NO_DML_OR_PUBLICATION');
    const queryIndex=++index;
    save('query-'+String(queryIndex).padStart(3,'0')+'-begin',{phase,index:queryIndex,sql,values,
      sqlSha256:digest(sql),valuesSha256:digest(values),atUtc:new Date().toISOString()});
    const pending:unknown=Reflect.apply(target,client,args);
    assert(pending!==null&&typeof pending==='object'&&'then'in pending&&typeof pending.then==='function',
      'TRACKED_QUERY_PROMISE_RESULT_REQUIRED');
    return Promise.resolve(pending).then((result:unknown)=>{
      assert(result!==null&&typeof result==='object'&&!Array.isArray(result));
      assert('rows'in result&&Array.isArray(result.rows),'TRACKED_QUERY_RESULT_ROWS_REQUIRED');
      const rows:readonly unknown[]=result.rows;
      const record={phase,index:queryIndex,sqlSha256:digest(sql),valuesSha256:digest(values),rowsSha256:digest(rows),rows:rows.length};
      // Raw result precedes the existing full-parent/source guard, including firstFAIL.
      save('query-'+String(queryIndex).padStart(3,'0'),{...record,sql,values,rawRows:rows});journal.push(record);
      return result;
    });
  }})};
  try{
    await client.connect();await client.query('begin isolation level read committed');
    await q.query("set local timezone='UTC'");await q.query("set local statement_timeout='10000ms'");await q.query("set local lock_timeout='5s'");
    const backend=await q.query("select pg_backend_pid() backend_pid,current_setting('application_name') application_name");
    save('01_OWNED_SERVER_SESSION',{...backend.rows[0],atUtc:new Date().toISOString()});assert.equal(backend.rows[0]?.application_name,applicationName);
    phase='NORMAL';save('02_BEFORE_NORMAL',{phase,atUtc:new Date().toISOString()});
    const before=await readMasterRetainedBindingPreconditionsR1(q,input);save('03_NORMAL_FULL_SNAPSHOT',before);
    const beforeSha=masterRetainedParentCaptureSha256R1(before.capture);assert.equal(beforeSha,retained.capturedParentSha256);
    assert.equal(before.newSources.length,0);assert.equal(before.newLocators.length,0);
    phase='LOCK';await lockMasterRetainedBindingPreconditionsR1(q,input);save('04_LOCKED_BEFORE_REREAD',{phase,atUtc:new Date().toISOString()});
    phase='LOCKED_REREAD';const locked=await readMasterRetainedBindingPreconditionsR1(q,input);save('05_LOCKED_FULL_SNAPSHOT',locked);
    assertMasterRetainedBindingPreflightUnchangedR1(input,before,locked);
    assert.equal(masterRetainedParentCaptureSha256R1(locked.capture),beforeSha);
    assert.equal(locked.newSources.length,0);assert.equal(locked.newLocators.length,0);assert.equal(coreEntries,0);
    await client.query('rollback');rolledBack=true;phase='ROLLED_BACK';
    save('FINAL_NORMAL_LOCKED_ACCEPTANCE',{status:'PASS_ONE_EXISTING_NVF_NORMAL_LOCKED_PRECONDITIONS_NOT_PUBLICATION',
      catalogId:config.catalogId,parentReleaseId:config.parentReleaseId,captureSha256:beforeSha,
      normalSnapshotSha256:digest(before),lockedSnapshotSha256:digest(locked),wholeRowsMetadataSourcesUnchanged:true,
      oldParameters:before.capture.parameters.length,oldFormulas:before.capture.formulas.length,oldRows:before.capture.resources.length,
      oldBindings:before.capture.bindings.length,oldSourceArrays:Object.keys(before.capture.baseline.normative_source_ids).length,
      newRegistryAbsent:true,allQueriesJournaledIncludingExistingReader:true,journal,coreEntries:0,databaseDml:0,
      publicationAttempted:false,readOnlyTransactionClaim:false,lockOnlyReadCommittedTransaction:true,allTransactionsRolledBack:rolledBack,
      realExistingRegistryReuse:'NOT_APPLICABLE_ABSENCE_PREIMAGE_REQUIRED_NO_FAKE_REUSE',wholeFamilyAccepted:false,newFULL:0});
  }catch(error){
    try{await client.query('rollback');rolledBack=true;}catch{}
    save('FIRST_FAILURE_NORMAL_LOCKED',{status:'NOT_ACCEPTED',phase,error:String((error as Error).message),journal,rolledBack,coreEntries,databaseDml:0,publicationAttempted:false});throw error;
  }finally{
    try{if(!rolledBack){await client.query('rollback');rolledBack=true;}}
    finally{await client.end();}
  }
},110000);
