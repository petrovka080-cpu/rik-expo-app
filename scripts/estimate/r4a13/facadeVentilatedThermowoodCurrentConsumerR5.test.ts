import {facadeVentilatedThermowoodMasterConfigR5} from './prepareFacadeVentilatedThermowoodR5';
import * as core from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {resolve} from 'node:path';

describe('existing ventilated facade thermowood consumer R5',()=>{
  test('one current Config retains old45 and applies exact whole component through seven core calls',async()=>{
    const spy=jest.spyOn(core,'compileCanonicalEstimateCore');
    try {
      const config=facadeVentilatedThermowoodMasterConfigR5({releaseId:'3788cc88-701d-5cc9-9130-c61262cb9979',
        searchReleaseId:'TEST_ONLY_NOT_PUBLICATION',sourceRoot:resolve(__dirname,'../../..')});
      const result=await config.verifyCore();
      expect(spy).toHaveBeenCalledTimes(7);
      expect(result).toMatchObject({coreCalls:7,originalRowsRetained:45,sourceMatchedExamples:2,unresolvedNeedsWithReadback:17,newFULL:0,
        standardRetainedRepresentative:'CHECKED_NOT_PUBLICATION_OR_DB_ACCEPTANCE'});
    }finally{spy.mockRestore();}
  },60000);
});
