import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {facadeVentilatedSteelMasterConfigR5,verifyFacadeVentilatedSteelConsumersR5,verifyFacadeVentilatedSteelRetainedR5,assertFacadeVentilatedSteelMachineAdmissionsR5} from './prepareFacadeVentilatedSteelExistingOwnerR5';
import {assertCanonicalMachineHourDefinitionV1} from '../../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';
import steel from '../../../data/estimate-benchmarks/source-packs/facade-steel-siding-historical-06501-r2.json';

test('existing NVF owner current whole steel: exact retained source, sole public owners and13 bounded entries',async()=>{
  const sourceRoot=resolve(__dirname,'../../..');
  let phase='CONFIG_NOT_CREATED',attemptedCoreCalls=0,completedCoreEntries=0;
  const dump=(name:string,value:unknown)=>{
    const dir=process.env.FACADE_STEEL_EXISTING_RAW_ACTUAL_DIR;if(!dir)return;
    mkdirSync(dir,{recursive:true});writeFileSync(resolve(dir,name+'.json'),JSON.stringify(value,null,2)+'\n');
  };
  try{
    const observer={
      onCoreCall:(count:number)=>{attemptedCoreCalls=count;dump('actual-core-counter',{phase,attemptedCoreCalls,completedCoreEntries});},
      onCoreResult:(name:string,result:unknown)=>{dump(name,result);if(name.startsWith('actual-core-'))completedCoreEntries++;
        dump('actual-core-counter',{phase,attemptedCoreCalls,completedCoreEntries});}};
    const config=facadeVentilatedSteelMasterConfigR5({sourceRoot,
      releaseId:'e0fa744d-0d47-5068-9ebb-8bda0b8b1bbd',searchReleaseId:'4ecd669d-b02e-5f0e-b05d-fff3272035bc',...observer});
    // Context UUIDs exercise only the pure Config. Current membership and full
    // normal/locked DB identity must be supplied and checked by ROOT separately.
    phase='CONFIG_CREATED_EXACT_RETAINED_AND_ADMISSION_GATES_PENDING';
    assert.equal(config.catalogId,'canonical-work:expanded:ventilated_facade');assert.equal(config.catalogAppend,undefined);
    assert.equal(config.sourceId,steel.sourceId);assert.equal(config.normId,steel.normId);
    assert.deepEqual(config.expectedParentShape,[52,76,76]);assert.deepEqual(config.runtimeProfileInput,{});
    for(const machine of steel.rows.filter(r=>r.category==='equipment'))for(const mode of ['own','hired']){
      const id=steel.prefix+':'+machine.key+'-'+mode,row=config.resourceDefinitions.find(row=>row.row_id===id);assert(row);
      const request:Parameters<typeof assertCanonicalMachineHourDefinitionV1>[0]={catalogId:config.catalogId,rowId:id,unitId:row.unit_id,sourceMetadata:row.source_metadata};
      const accepted=assertCanonicalMachineHourDefinitionV1(request);assert(accepted);assert.equal(accepted.resourceCode,machine.resourceCode);
      assert.equal(assertCanonicalMachineHourDefinitionV1({...request,catalogId:'TEST_ONLY_UNRELATED_CATALOG'}),null);
      assert.equal(assertCanonicalMachineHourDefinitionV1({...request,rowId:steel.prefix+':'+machine.key+'-consumed'}),null);
      assert.equal(assertCanonicalMachineHourDefinitionV1({...request,unitId:'piece'}),null);
      for(const mutation of[{source_artifact_sha256:'0'.repeat(64)},{exact_column:'15-01-080-03'},{normativeResourceCode:'OTHER'},
        {machinePriceCoverageRequired:'OTHER'},{machinePriceOperationScope:'MACHINE_ONLY_WORKER_AND_COMPRESSED_AIR_SEPARATE'}])
        assert.throws(()=>assertCanonicalMachineHourDefinitionV1({...request,sourceMetadata:{...row.source_metadata,...mutation}}),{code:'DEFINITION_INTEGRITY_FAILED'});
    }
    phase='EXACT_MACHINE_BOUNDARY_PASSED_VERIFY_CORE_PENDING_RETAINED_GUARD';
    verifyFacadeVentilatedSteelRetainedR5(config,relative=>resolve(sourceRoot,relative));
    assertFacadeVentilatedSteelMachineAdmissionsR5(config);
    const result=await verifyFacadeVentilatedSteelConsumersR5(config,observer,'PRELIMINARY_REVIEW');
    assert.equal(result.pdfIssuancePurpose,'PRELIMINARY_REVIEW');assert.equal(result.pdfReviewNegativeCases,4);
    assert.equal(result.logicalEntries,13);assert.equal(result.canonicalResults,8);assert.equal(result.expectedRejects,5);
    assert.equal(result.coreCalls,9);assert.equal(attemptedCoreCalls,9);assert.equal(completedCoreEntries,9);
    assert.equal(result.preCoreRejects,4);assert.equal(result.definitionWideNeeds,46);assert.equal(result.selectedPhysicalNeeds,21);
    assert.equal(result.actualNeedClosures,0);assert.equal(result.newCatalogIds,0);assert.equal(result.newSourceIds,0);assert.equal(result.newFULL,0);
    phase='FINITE_SOURCE_FRAGMENT_PRELIMINARY_CASE_NOT_PUBLICATION';dump('finite-result',result);
  }finally{
    dump('final-stage',{phase,attemptedCoreCalls,completedCoreEntries,normalLockedPublisher:'UNRUN',SQL:0,canonicalWrites:0});
  }
},90000);

test('ordinary steel Config stays STANDARD and refuses the exact unresolved unit and evidence scope',async()=>{
 const sourceRoot=resolve(__dirname,'../../..');
 let standardCoreCalls=0,standardCoreResults=0,standardRefusalVerified=false;
 const config=facadeVentilatedSteelMasterConfigR5({sourceRoot,
  releaseId:'e0fa744d-0d47-5068-9ebb-8bda0b8b1bbd',searchReleaseId:'4ecd669d-b02e-5f0e-b05d-fff3272035bc',
  onCoreCall:(count:number)=>{standardCoreCalls=count;},
  onCoreResult:(name:string)=>{if(name.startsWith('actual-core-'))standardCoreResults++;}});
 const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 try{
  await assert.rejects(()=>config.verifyCore(),(error:unknown)=>{
   assert(record(error));assert.equal(error.code,'ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED');
   const acceptance=error.operationResourceAcceptanceV1;assert(record(acceptance));assert(Array.isArray(acceptance.issues));
   assert.equal(acceptance.pdfAllowed,false);assert.equal(acceptance.definitionAdmissionAllowed,false);
   assert.equal(acceptance.completeClaimAllowed,false);
   const held=acceptance.issues.filter(issue=>issue.code==='RESOURCE_UNIT_UNRESOLVED').map(issue=>issue.rowId).sort();
   const expected=['source-component-identity','fire-ventilation','anchor-tests','access-rigging-power',
    'workstation-wear','qc-services','cleanup-logistics'].map(key=>steel.prefix+':need:'+key).sort();
   assert.deepEqual(held,expected);
   assert.equal(acceptance.issues.filter(issue=>issue.code==='INDEPENDENT_OPERATION_COMPOSITION_UNVERIFIED').length,1);
   assert.equal(acceptance.issues.filter(issue=>issue.code==='OPERATION_METADATA_CONFLICT').length,0);
   assert.equal(acceptance.issues.filter(issue=>issue.code==='PUBLIC_RESOURCE_NAME_UNVERIFIED').length,0);
   standardRefusalVerified=true;return true;
  });
  assert.equal(standardCoreCalls,6);assert.equal(standardCoreResults,6);
 }finally{
  const dir=process.env.FACADE_STEEL_EXISTING_RAW_ACTUAL_DIR;
  if(dir){mkdirSync(dir,{recursive:true});writeFileSync(resolve(dir,'standard-refusal-counter.json'),
   JSON.stringify({standardCoreCalls,standardCoreResults,standardRefusalVerified,publicationAccepted:false},null,2)+'\n');}
 }
},90000);
