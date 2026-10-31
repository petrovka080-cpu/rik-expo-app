import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import expected from '../../../data/estimate-benchmarks/fixtures/facade-nvf-steel-porcelain-independent-r221.json';
import {facadeNvfSteelPorcelainMasterConfigR221,facadeNvfSteelPorcelainSourceRequirementR221} from './prepareFacadeNvfSteelPorcelainOneOwnerR221';
import {verifyFacadeNvfSteelPorcelainFiniteR221} from './verifyFacadeNvfSteelPorcelainOneOwnerR221';
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);

test('one existing NVF steel and porcelain composition preserves both whole methods and holds unsupported source authority',async()=>{
 const raw=process.env.FACADE_NVF_STEEL_PORCELAIN_RAW_OUTPUT;
 const save=(name:string,value:unknown)=>{if(!raw)return;mkdirSync(raw,{recursive:true});const text=JSON.stringify(value,null,2)+'\n';
  assert(Buffer.byteLength(text,'utf8')<=4*1024*1024,'FINITE_RAW_CAP_NO_TRUNCATION');writeFileSync(resolve(raw,name+'.json'),text);};
 let entries=0,actualCore=0,savedResults=0,strictRejects=0,preCoreRejects=0,unexpectedFailures=0;
 const counter=()=>save('counter',{entries,actualCore,savedResults,strictRejects,preCoreRejects,unexpectedFailures,
  canonicalWrites:0,databaseDml:0,publisherCalls:0,ordinaryConfig:'HOLD_SHARED_SOURCE_AUTHORITY_CONTRACT',READY:false,FULL:false});counter();
 const requirement=facadeNvfSteelPorcelainSourceRequirementR221();
 assert.equal(requirement.catalogId,'canonical-work:expanded:ventilated_facade');
 assert.deepEqual([requirement.steel.knownParameterIds.length,requirement.steel.boundRowIds.length],[expected.steel.knownNewParameters,expected.steel.boundRows]);
 assert.deepEqual([...requirement.steel.knownParameterIds].sort(),[...expected.steel.knownNewParameterIds].sort());
 assert.equal(requirement.steel.derivedParameterIds.length,expected.steel.derivedNewParameters);
 assert.equal(requirement.steel.unresolvedParameterIds.length,expected.steel.protectedNeeds);
 assert.equal(new Set([...requirement.steel.knownParameterIds,...requirement.steel.derivedParameterIds,...requirement.steel.unresolvedParameterIds]).size,expected.steel.nativeParameters);
 assert.deepEqual([requirement.porcelain.knownParameterIds.length,requirement.porcelain.boundRowIds.length],[36,115]);
 assert.throws(()=>facadeNvfSteelPorcelainMasterConfigR221({releaseId:'UNRUN_SOURCE_ONLY_NO_FAKE_CURRENT_MEMBERSHIP',searchReleaseId:'UNRUN'}),
  {code:'EXISTING_NVF_TWO_SOURCE_AUTHORITY_CONTRACT_HOLD'});
 save('00-ORDINARY_CONFIG_SOURCE_AUTHORITY_HOLD',{requirement,status:'EXPECTED_HONEST_HOLD_NO_ALIAS_NO_FAKE_REGISTRY',core:0,publisherCalls:0,databaseDml:0});
 const result=await verifyFacadeNvfSteelPorcelainFiniteR221({
  onEntry:(count,phase)=>{entries=count;save('entry-'+String(count).padStart(2,'0')+'-'+phase+'-begin',{
   phase,entry:count,actualCoreBeforeEntry:actualCore,atUtc:new Date().toISOString(),actualObjectApproved:false});counter();},
  onCoreCall:(count,phase)=>{actualCore=count;save('core-'+String(count).padStart(2,'0')+'-'+phase+'-begin',{
   phase,actualCoreEntry:count,atUtc:new Date().toISOString(),actualObjectApproved:false});counter();},
  onOutcome:(phase,value)=>{
   // Original raw result/error precedes every downstream subject assertion.
   if(record(value)&&Array.isArray(value.rows)&&Array.isArray(value.preliminaryNeeds)){
    savedResults++;save('result-'+String(savedResults).padStart(2,'0')+'-'+phase,value);
   }else if(record(value)&&value.expectedReject===true){strictRejects++;if(value.stage==='PRE_CORE')preCoreRejects++;
    save('reject-'+String(entries).padStart(2,'0')+'-'+phase,value);
   }else{unexpectedFailures++;save('failure-'+String(entries).padStart(2,'0')+'-'+phase,value);}counter();
  }},'PRELIMINARY_REVIEW');
 assert.equal(result.pdfIssuancePurpose,'PRELIMINARY_REVIEW');assert.equal(result.pdfReviewNegativeCases,6);
 save('FINAL_FINITE_TEST_ONLY_NOT_CONFIG_ACCEPTANCE',result);counter();
 assert.equal(entries,expected.plannedCountsNotActual.entries);assert.equal(actualCore,expected.plannedCountsNotActual.actualCoreAttempts);
 assert.equal(savedResults,expected.plannedCountsNotActual.savedResults);assert.equal(strictRejects,expected.plannedCountsNotActual.strictRejects);
 assert.equal(preCoreRejects,expected.plannedCountsNotActual.preCoreRejects);assert.equal(unexpectedFailures,0);
});

test('SOURCE normal STANDARD refuses unresolved porcelain units and independent evidence',async()=>{
 let standardCoreCalls=0,standardCoreResults=0;

 const observer={onCoreCall:(count:number)=>{standardCoreCalls=count;},onOutcome:(_phase:string,value:unknown)=>{if(record(value)&&Array.isArray(value.rows))standardCoreResults++;}};
 await assert.rejects(()=>verifyFacadeNvfSteelPorcelainFiniteR221(observer),(error:unknown)=>{
  assert(record(error));assert.equal(error.code,'ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED');
  const acceptance=error.operationResourceAcceptanceV1;assert(record(acceptance));assert(Array.isArray(acceptance.issues));
  assert.equal(acceptance.pdfAllowed,false);assert.equal(acceptance.definitionAdmissionAllowed,false);assert.equal(acceptance.completeClaimAllowed,false);
  const expected=['preparation-labor','working-parts','access-power-protection','quality-services','delivery-feed-waste']
   .map(key=>'facade:current-porcelain:r3:need:'+key).sort();
  assert.deepEqual(acceptance.issues.filter(issue=>issue.code==='RESOURCE_UNIT_UNRESOLVED').map(issue=>issue.rowId).sort(),expected);
  assert.equal(acceptance.issues.filter(issue=>issue.code==='INDEPENDENT_OPERATION_COMPOSITION_UNVERIFIED').length,1);
  assert.equal(acceptance.issues.filter(issue=>issue.code==='OPERATION_METADATA_CONFLICT').length,0);
  const nameIssues=acceptance.issues.filter(issue=>issue.code==='PUBLIC_RESOURCE_NAME_UNVERIFIED');
  assert.equal(nameIssues.length,5);
  assert.deepEqual(nameIssues.map(issue=>issue.rowId).sort(),expected);
  return true;
 });
 assert.equal(standardCoreCalls,6);assert.equal(standardCoreResults,6);
},90000);
