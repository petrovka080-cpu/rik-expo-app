import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import * as core from '../backendPlatform/canonicalEstimateCompileCore';
import {facadeVentilatedHplMasterConfigR5} from '../../../../scripts/estimate/r4a13/prepareFacadeVentilatedHplExistingOwnerR5';
import currentRelease from '../../../../data/estimate-benchmarks/r568-local-developer-canonical-release.json';

// NEW DRAFT ONLY. Not part of the passed own11 types or48/49 gates. The two
// legacy calls compare the NEW three-choice definition against the independent
// original, rather than repeating the unchanged old48 suite.
describe('existing facade native compact-panel consumer R5',()=>{
  test('one new ordinary Config retains old45 and applies native HPL method with eight needs',async()=>{
    const rawRoot=process.env.FACADE_HPL_RAW_ACTUAL_DIR;
    if(!rawRoot)throw Error('HPL_TEST_RAW_ACTUAL_OUTPUT_REQUIRED');
    mkdirSync(rawRoot,{recursive:true});
    const original=core.compileCanonicalEstimateCore;let call=0;
    const spy=jest.spyOn(core,'compileCanonicalEstimateCore').mockImplementation(async input=>{
      const index=++call,path=resolve(rawRoot,'core-'+String(index).padStart(2,'0')+'.json');
      try{const actual=await original(input);
        writeFileSync(path,JSON.stringify({call:index,primaryMeasureParameterId:input.primaryMeasureParameterId,
          submittedParameters:input.submittedParameters,confirmedParameters:input.confirmedParameters,actual},null,2)+'\n');
        return actual;
      }catch(error){writeFileSync(path,JSON.stringify({call:index,error:error instanceof Error?{
        name:error.name,message:error.message,stack:error.stack,code:Reflect.get(error,'code')}:String(error)},null,2)+'\n');throw error;}
    });
    try{
      // Pin the current caller identity through the same accepted release file;
      // this pure representative check does not claim a DB membership read.
      const config=facadeVentilatedHplMasterConfigR5({releaseId:currentRelease.definitionReleaseId,
        searchReleaseId:currentRelease.searchReleaseId,sourceRoot:resolve(__dirname,'../../../..')});
      const result=await config.verifyCore();
      expect(spy).toHaveBeenCalledTimes(5);
      expect(result).toMatchObject({coreCalls:5,newPublicGeometryInputs:1,unknownNeeds:8,oldRowsPreserved:45,newFULL:0,
        normalRetainedRepresentative:'ACTUAL_STANDARD_GUARD_NOT_PUBLISHER_OR_DB_ACCEPTANCE'});
    }finally{spy.mockRestore();}
  },60000);
});
