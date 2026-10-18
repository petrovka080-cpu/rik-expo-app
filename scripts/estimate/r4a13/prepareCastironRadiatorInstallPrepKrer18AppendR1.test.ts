import {prepareCastironRadiatorInstallPrepKrer18AppendR1} from './prepareCastironRadiatorInstallPrepKrer18AppendR1';

it('compiles both exact source columns through the shared publisher contract and preserves manual rights',async()=>{
 const cfg=prepareCastironRadiatorInstallPrepKrer18AppendR1();
 const proof=await cfg.verifyCore();
 expect(proof).toMatchObject({status:'PASS_PARTIAL_CASTIRON_RADIATOR_SOURCE_AWARE_CORE_ONLY',
  resources:78,sourceAwareBindings:30,sourceColumns:{installation01:16,preparation04:14},
  sourcePriceBindings:0,applicationNeeds:8,machinePaidOwners:0,fullTechnicalAcceptance:false});
 expect(cfg.runtimeProfileInput).toEqual({});
});
