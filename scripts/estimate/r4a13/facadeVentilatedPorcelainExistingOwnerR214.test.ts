import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import expected from '../../../data/estimate-benchmarks/fixtures/facade-porcelain-existing-owner-independent-r214.json';
import {facadePorcelainPrimaryR59 as area,facadePorcelainGeometryR59 as geometry,
 facadePorcelainNeedsR59 as needs,facadePorcelainDefinitionR59 as childDefinition} from '../../../src/lib/estimate/v4/facadePorcelainWholeR59';
import {facadeVentilatedPorcelainCatalogR214 as catalogId,facadeVentilatedPorcelainSelectorR214 as selector,
 facadeVentilatedPorcelainChoiceR214 as choice,facadeVentilatedPorcelainDefinitionR214 as definition,
 facadeVentilatedPorcelainCapturedParentR214 as captured,facadeVentilatedPorcelainCompletenessR214 as completeness} from '../../../src/lib/estimate/v4/facadeVentilatedPorcelainExistingOwnerR214';
import {facadeVentilatedPorcelainMasterConfigR214,verifyFacadeVentilatedPorcelainWholeR214,verifyFacadeVentilatedPorcelainRetainedR214} from './prepareFacadeVentilatedPorcelainExistingOwnerR214';
import {validateCanonicalEstimateParameters} from '../../../src/lib/estimate/backendPlatform/parameterConstraints';
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);

test('existing NVF whole porcelain retains current identity and source-owned composition without a standalone card',async()=>{
 const sourceRoot=resolve(__dirname,'../../..'),raw=process.env.FACADE_NVF_PORCELAIN_EXISTING_RAW_OUTPUT;
 const save=(name:string,value:unknown)=>{if(!raw)return;mkdirSync(raw,{recursive:true});
  const text=JSON.stringify(value,null,2)+'\n';assert(Buffer.byteLength(text,'utf8')<=4*1024*1024,'FINITE_RAW_CAP_NO_TRUNCATION');
  writeFileSync(resolve(raw,name+'.json'),text);};
 let entries=0,actualCore=0,savedResults=0,strictRejects=0,preCoreRejects=0,unexpectedFailures=0;
 const counter=()=>save('counter',{entries,actualCore,savedResults,strictRejects,preCoreRejects,unexpectedFailures,
  publisherCalls:0,databaseDml:0,actualObjectApproved:false,actualNeedClosures:0,FULL:false});counter();
 const pointer:unknown=JSON.parse(readFileSync(resolve(sourceRoot,'data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
 assert(record(pointer)&&typeof pointer.definitionReleaseId==='string'&&typeof pointer.searchReleaseId==='string');
 const observer={
  onEntry:(count:number,phase:string)=>{entries=count;save('entry-'+String(count).padStart(2,'0')+'-'+phase+'-begin',{
   entry:count,phase,actualCoreBeforeEntry:actualCore,atUtc:new Date().toISOString(),actualObjectApproved:false});counter();},
  onCoreCall:(count:number,phase:string)=>{actualCore=count;save('core-'+String(count).padStart(2,'0')+'-'+phase+'-begin',{
   actualCoreEntry:count,phase,atUtc:new Date().toISOString(),actualObjectApproved:false});counter();},
  onCoreResult:(phase:string,value:unknown)=>{
   // Persist original outcome before any subject assertion, including firstFAIL.
   if(record(value)&&Array.isArray(value.rows)&&Array.isArray(value.preliminaryNeeds)){
    savedResults++;save('result-'+String(savedResults).padStart(2,'0')+'-'+phase,value);
   }else if(record(value)&&value.expectedReject===true){strictRejects++;if(value.stage==='PRE_CORE')preCoreRejects++;
    save('reject-'+String(entries).padStart(2,'0')+'-'+phase,value);
   }else{unexpectedFailures++;save('failure-'+String(entries).padStart(2,'0')+'-'+phase,value);}counter();
  }};
 const config=facadeVentilatedPorcelainMasterConfigR214({sourceRoot,releaseId:pointer.definitionReleaseId,searchReleaseId:pointer.searchReleaseId,...observer});
 assert.equal(config.catalogId,catalogId);assert.equal(config.catalogAppend,undefined);
 assert.equal(config.sourceId,'gox_facade_ventilated_porcelain_whole_r3');
 assert.equal(config.normId,'ST_KG_V_T_PORCELAIN10_SOURCE_METHOD');
 const model=definition(),native=childDefinition(),c=captured().capture;
 assert.deepEqual([model.parameters.length,model.formulas.length,model.resources.length],[132,196,196]);
 assert.equal(c.definition.id,expected.currentOwner.definitionId);assert.equal(c.baseline.id,expected.currentOwner.baselineId);
 assert.deepEqual(model.formulas.slice(0,c.formulas.length),c.formulas);
 assert.deepEqual(model.resources.slice(0,c.resources.length),c.resources);
 assert.deepEqual(model.parameters.slice(c.parameters.length).map(p=>p.parameter_id),native.parameters.map(p=>p.parameter_id));
 assert.equal(new Set(model.parameters.map(p=>p.parameter_id)).size,model.parameters.length);
 const selection=model.parameters.find(p=>p.parameter_id===selector);assert(selection);
 assert.equal(selection.default_value,null);assert.equal(selection.truth_metadata.visibility_role,'USER_INPUT');
 const values=selection.constraints_json?.values;assert(Array.isArray(values)&&values.length===4&&values[3]===choice);
 const needIds=new Set(needs().map((n:{parameterId:string})=>n.parameterId));
 const readbackIds:string[]=[],unknownIds:string[]=[];
 for(const parameter of native.parameters){
  assert.equal(parameter.default_value,null);
  if(geometry.some(id=>id===parameter.parameter_id)){
   assert.equal(parameter.truth_metadata.visibility_role,'USER_INPUT');assert.equal(parameter.truth_metadata.value_source_role,'USER_MEASURED');continue;}
  if(parameter.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY')continue;
  assert.equal(parameter.truth_metadata.visibility_role,'INTERNAL_ONLY');
  const provenance=parameter.truth_metadata.provenance;assert(record(provenance));
  assert.equal(provenance.consumer_input_role_v1,'APPLICATION_TECHNICAL');
  if(needIds.has(parameter.parameter_id)){
   unknownIds.push(parameter.parameter_id);assert.equal(parameter.truth_metadata.value_source_role,'UNRESOLVED_APPLICATION_NORM');
   assert.equal(parameter.truth_metadata.hidden_default_forbidden,true);
   // The shared validator owns this boundary; a descriptive flag is not its authority.
   const rejectedUnresolved=(error:unknown)=>record(error)&&error.code==='PARAMETER_VALIDATION_FAILED'
    &&error.message==='unresolved application norm cannot be supplied '+parameter.parameter_id;
   assert.throws(()=>validateCanonicalEstimateParameters(native.parameters,{[parameter.parameter_id]:'0'}),rejectedUnresolved);
   assert.throws(()=>validateCanonicalEstimateParameters(native.parameters,{},
    {confirmedParameters:{[parameter.parameter_id]:'0'}}),rejectedUnresolved);
  }else{
   readbackIds.push(parameter.parameter_id);assert.equal(provenance.source_readback_only_v1,true);
   assert.equal(provenance.consumer_question_allowed,false);
  }
 }
 assert.equal(unknownIds.length,5);assert.equal(readbackIds.length,34);
 assert.equal(native.ordinaryParameterIds.length,2);assert.deepEqual(native.ordinaryParameterIds,[...geometry]);
 assert.equal(model.resources.filter(row=>row.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM').length,30);
 save('00-pure-source-boundary',{catalogId,selectedNewPrimary:area,currentParent:c.definition.id,
  childParameters:80,childRows:120,parentRows:76,wholeRows:196,selectedKnownSourceRows:115,
  unknownParameterIds:unknownIds,readbackIds,standaloneCatalogAppend:false,actualParentSourceKeyAbsenceNotAdmitted:true});
 verifyFacadeVentilatedPorcelainRetainedR214(config,path=>resolve(sourceRoot,path));
 const result=await verifyFacadeVentilatedPorcelainWholeR214(model,completeness(),observer,'PRELIMINARY_REVIEW');
 assert.equal(result.pdfIssuancePurpose,'PRELIMINARY_REVIEW');assert.equal(result.pdfReviewNegativeCases,6);save('FINAL_FINITE_RESULT',result);counter();
 assert.equal(entries,expected.plannedFiniteCounts.entries);assert.equal(actualCore,expected.plannedFiniteCounts.actualCoreAttempts);
 assert.equal(savedResults,expected.plannedFiniteCounts.results);assert.equal(strictRejects,expected.plannedFiniteCounts.strictRejects);
 assert.equal(preCoreRejects,expected.plannedFiniteCounts.preCoreRejects);assert.equal(unexpectedFailures,0);
});

test('SOURCE normal STANDARD refuses unresolved porcelain units and independent evidence',async()=>{
 let standardCoreCalls=0,standardCoreResults=0;
 const sourceRoot=resolve(__dirname,'../../..');
 const pointer:unknown=JSON.parse(readFileSync(resolve(sourceRoot,'data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
 assert(record(pointer)&&typeof pointer.definitionReleaseId==='string'&&typeof pointer.searchReleaseId==='string');
 const config=facadeVentilatedPorcelainMasterConfigR214({sourceRoot,releaseId:pointer.definitionReleaseId,searchReleaseId:pointer.searchReleaseId,
  onCoreCall:count=>{standardCoreCalls=count;},onCoreResult:(_phase,value)=>{if(record(value)&&Array.isArray(value.rows))standardCoreResults++;}});
 await assert.rejects(()=>config.verifyCore(),(error:unknown)=>{
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
