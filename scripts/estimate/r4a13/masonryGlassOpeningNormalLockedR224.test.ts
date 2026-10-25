import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Client} from 'pg';
import {masonryGlassOpeningExistingConfigR223,masonryGlassOpeningRetainedPureR223,masonryGlassOpeningActualEntriesR223,
 masonryGlassOpeningRetainedGuardInputR223}
 from './prepareMasonryGlassOpeningExistingOwnerR223';
import {readMasterRetainedBindingPreconditionsR1,lockMasterRetainedBindingPreconditionsR1,assertMasterRetainedBindingSnapshotR1,
 assertMasterRetainedBindingPreflightUnchangedR1,masterRetainedParentCaptureSha256R1}
 from './masterSingleDefinitionRetainParentBindingsR1';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';

const digest=(value:unknown)=>createHash('sha256').update(stable(value)).digest('hex');
test('one existing opening: ordinary NORMAL then LOCKED full parent59/source assertions, rollback, no publisher or core',{timeout:110000},async()=>{
 const sourceRoot=process.env.MASONRY_R223_SOURCE_ROOT,output=process.env.MASONRY_GLASS_OPENING_NORMAL_LOCKED_OUTPUT;
 assert(sourceRoot&&output,'ROOT_CURRENT_PINNED_CONFIG_AND_SESSION_REQUIRED');
 mkdirSync(output,{recursive:true});const save=(name:string,value:unknown)=>writeFileSync(resolve(output,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 const config=masonryGlassOpeningExistingConfigR223({sourceRoot,outputRoot:output,
  releaseId:'2df79e8d-4012-5557-87c0-f36285f59f17',searchReleaseId:'9b042edf-ca06-50f6-969a-556e6d14547a'});
 assert.equal(config.catalogId,'canonical-work:base:masonry_interior_opening_lay_standard');assert.equal(config.catalogAppend,undefined);
 const pure=masonryGlassOpeningRetainedPureR223(config,sourceRoot),input=masonryGlassOpeningRetainedGuardInputR223(config),retained=config.binding.retainParentBindings;assert(retained);
 assert.equal(masonryGlassOpeningActualEntriesR223(),0);assert.deepEqual(config.expectedParentShape,[1,59,59]);
 assert.equal(retained.capturedParent.definition.id,'0907686f-95b4-55a7-838d-afc0743b151d');assert.equal(retained.capturedParent.definition.definition_version,3);
 assert.deepEqual(retained.capturedSourcePreimage,{sourceKey:config.sourceId,expected:null});
 assert.equal(config.binding.reuseExistingNormativeRegistry,undefined);
 assert.equal(config.parentReleaseId,'2df79e8d-4012-5557-87c0-f36285f59f17');
 assert.equal(config.parentSearchReleaseId,'9b042edf-ca06-50f6-969a-556e6d14547a');
 assert.equal(config.sourceId,'source:masonry:glass-block:r103:opening-fill');
 assert.equal(config.normId,'08-04-002-03|08-04-002-04');
 assert.equal(config.locator.key,'kg-krer08-04-002-glass-opening-existing-r223');
 assert.equal(retained.capturedParent.definition.definition_sha256,'c5c03174f6befa275abff23195c1e33d7909af471b4d9ceae3a903ac942a4f08');
 assert.deepEqual(retained.capturedParent.normativeSources,[]);assert.deepEqual(retained.capturedParent.normativeLocators,[]);
 assert.equal(config.masterSha256,'541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40');
 save('00_EXPECTED_NOT_CURRENT_DB_PROOF',{catalogId:config.catalogId,parentReleaseId:config.parentReleaseId,parentSearchReleaseId:config.parentSearchReleaseId,
  parentDefinitionId:retained.capturedParent.definition.id,parentBaselineId:retained.capturedParent.baseline.id,captureSha256:retained.capturedParentSha256,
  expectedNewSource:input.newSource,expectedNewLocators:input.newLocators,sourcePreimageNullIsUnprovenUntilActualRead:true,pure,coreEntries:0,publisherCalled:false});
 const rawUrl=process.env.ESTIMATE_MIGRATION_DATABASE_URL;assert(rawUrl,'ROOT_EXISTING_BACKEND_CONNECTION_ENV_REQUIRED');
 const url=(()=>{try{return new URL(rawUrl);}catch{throw Error('CANONICAL_DATABASE_URL_INVALID');}})();
 assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');assert.equal(url.pathname,'/rik_r4_runtime_b5_v2');
 const client=new Client({connectionString:rawUrl,connectionTimeoutMillis:5000,application_name:'gox-masonry-glass-opening-normal-locked-r224'});
 let phase='CONNECT',index=0,connected=false,inTransaction=false,rolledBack=false;
 const journal:{phase:string;index:number;sqlSha256:string;valuesSha256:string;rowsSha256:string;rows:number}[]=[];
 let acceptance:Record<string,unknown>|undefined;
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
   await client.connect();connected=true;await client.query('begin isolation level read committed');inTransaction=true;
   await q.query("set local timezone='UTC'");await q.query("set local statement_timeout='10000ms'");await q.query("set local lock_timeout='5s'");
   const backend=await q.query("select pg_backend_pid() backend_pid,current_database() database,current_setting('TimeZone') timezone,current_setting('transaction_isolation') isolation,current_setting('transaction_read_only') transaction_read_only");
   save('01_ACTUAL_SESSION',backend.rows);assert.equal(backend.rows[0]?.database,'rik_r4_runtime_b5_v2');assert.equal(backend.rows[0]?.timezone,'UTC');
   assert.equal(backend.rows[0]?.isolation,'read committed');assert.equal(backend.rows[0]?.transaction_read_only,'off');
   phase='NORMAL';const before=await readMasterRetainedBindingPreconditionsR1(q,input);save('02_NORMAL_FULL_SNAPSHOT',before);
   assertMasterRetainedBindingSnapshotR1(input,before);const beforeSha=masterRetainedParentCaptureSha256R1(before.capture);
   assert.equal(beforeSha,retained.capturedParentSha256);assert.deepEqual([before.capture.parameters.length,before.capture.formulas.length,before.capture.resources.length,before.capture.bindings.length],[1,59,59,0]);
   assert.equal(before.newSources.length,0);assert.equal(before.newLocators.length,0);
   phase='LOCK';await lockMasterRetainedBindingPreconditionsR1(q,input);save('03_LOCKS_ACQUIRED',{atUtc:new Date().toISOString(),coreEntries:masonryGlassOpeningActualEntriesR223()});
   phase='LOCKED_REREAD';const locked=await readMasterRetainedBindingPreconditionsR1(q,input);save('04_LOCKED_FULL_SNAPSHOT',locked);
   assertMasterRetainedBindingPreflightUnchangedR1(input,before,locked);assert.equal(masterRetainedParentCaptureSha256R1(locked.capture),beforeSha);
   assert.equal(locked.newSources.length,0);assert.equal(locked.newLocators.length,0);assert.equal(masonryGlassOpeningActualEntriesR223(),0);
   acceptance={status:'PASS_SCOPED_EXISTING_OPENING_NORMAL_LOCKED_NOT_PHYSICAL_OR_PAYMENT_ADMISSION',catalogId:config.catalogId,parentReleaseId:config.parentReleaseId,
    parentDefinitionId:retained.capturedParent.definition.id,captureSha256:beforeSha,normalSnapshotSha256:digest(before),lockedSnapshotSha256:digest(locked),
    fullParentShape:[1,59,59],bindings:0,allParameterFormulaResourceSourceArraysPreserved:true,
    exactSourceKey:config.sourceId,exactLocatorKey:config.locator.key,exactColumns:['08-04-002-03','08-04-002-04'],
    physicalOwnerAdmission:'UNRUN',costAdmission:'HOLD',exactNewSourceKeyAbsentInThisLockedRead:true,exactNewLocatorAbsentInThisLockedRead:true,notGlobalRegistryAbsence:true,
    coreEntries:0,publisherCalls:0,databaseDml:0,readOnlyTransactionClaim:false,lockOnlyReadCommittedTransaction:true,
    wholeAppAuthenticatedRuntime:'UNRUN',projectDocuments:0,procurementReady:false,saveUI:'UNRUN',FULL:false,journal};
  }catch(error:unknown){
   const message=(error instanceof Error?error.message:String(error)).split(rawUrl).join('[DATABASE_URL_REDACTED]');
   save('FIRST_FAILURE_NORMAL_LOCKED',{status:'HOLD_NOT_ACCEPTED',phase,message,journal,coreEntries:masonryGlassOpeningActualEntriesR223(),databaseDml:0,publisherCalls:0});throw error;
  }finally{
   try{if(connected&&inTransaction){await client.query('rollback');rolledBack=true;inTransaction=false;
    save('05_ACTUAL_ROLLBACK',{rolledBack,atUtc:new Date().toISOString(),coreEntries:masonryGlassOpeningActualEntriesR223()});}}
   finally{await client.end();}
  }
 assert(acceptance&&rolledBack);assert.equal(masonryGlassOpeningActualEntriesR223(),0);
 save('FINAL_EXISTING_OPENING_NORMAL_LOCKED_R224',{...acceptance,allTransactionsRolledBack:rolledBack});
});
