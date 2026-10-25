import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadRoofSingle539RealR224InputsR24} from './roofSingle539RealR224InputsR24';
import {prepareRoofSingle539WholeLayersR24} from './prepareRoofSingle539WholeLayersR24';
// One process, one normal constructor, then its existing25-case callback.
// No direct compile/core call, publication, source activation or history rewrite.
it('constructs ordinary same539 source31 Config and executes exactly25 existing finite entries after real provenance and source-map guards',async()=>{
 const sourceRoot=process.env.ROOF_SINGLE539_SOURCE_ROOT_R24,outputRoot=process.env.ROOF_SINGLE539_ACTUAL_OUTPUT_R24;
 assert(sourceRoot&&outputRoot,'ROOT_OWNED_SNAPSHOT_AND_FRESH_OUTPUT_REQUIRED');
 assert(!existsSync(outputRoot),'FRESH_ACTUAL_OUTPUT_REQUIRED');mkdirSync(outputRoot,{recursive:true});
 let recorded=0;const record=(name:string,value:unknown)=>{recorded++;
  writeFileSync(resolve(outputRoot,String(recorded).padStart(4,'0')+'.json'),JSON.stringify({name,value},null,2)+'\n',{flag:'wx'});};
 const inputs=loadRoofSingle539RealR224InputsR24();record('actual-r224-provenance-before-constructor',{
  readEvidence:inputs.source.readEvidence,captureSha256:inputs.source.capturedScopedNormativeRegistry.captureSha256,
  candidateStatus:'CANDIDATE_NOT_DB_ID',sourceAdmission:false,normalLockedRegistered:'UNRUN'});
 const config=prepareRoofSingle539WholeLayersR24({releaseId:'2df79e8d-4012-5557-87c0-f36285f59f17',
  searchReleaseId:'9b042edf-ca06-50f6-969a-556e6d14547a',sourceRoot,outputRoot},{...inputs,record});
 const retained=config.binding.retainParentBindings;assert(retained,'ORDINARY_RETAINED_BINDING_REQUIRED');
 const bound=[config.binding.rowId,...(config.binding.additionalRowIds??[])];
 record('ordinary-config-source-map-before-assert',{normId:config.normId,bound,
  parameterCount:config.parameterDefinitions.length,resourceCount:config.resourceDefinitions.length,
  capturedScope:config.capturedScopedNormativeRegistry?.captureSha256,oldParameterCount:retained.capturedParent.parameters.length,
  oldBindingCount:retained.capturedParent.bindings.length,fullTechnicalAcceptance:false});
 assert.equal(config.catalogId,'canonical-work:base:roofing_interior_flat_roof_install_technical_room');assert.equal(config.catalogAppend,undefined);
 assert.equal(config.normId.split('/').length,31);assert.equal(bound.length,282);assert.equal(new Set(bound).size,282);
 assert.equal(retained.capturedParent.parameters.length,152);assert.equal(retained.capturedParent.bindings.length,186);
 assert.equal(config.resourceDefinitions.length,570);assert.equal(config.capturedScopedNormativeRegistry,inputs.source.capturedScopedNormativeRegistry);
 const result=await config.verifyCore();record('ordinary-config-callback-outcome-before-assert',result);
 assert.equal(result.actualCoreEntries,25);assert.equal(result.completedResults,19);assert.equal(result.rejectedInputs,6);
});
