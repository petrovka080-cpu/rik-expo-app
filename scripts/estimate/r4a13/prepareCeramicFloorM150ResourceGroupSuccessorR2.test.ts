import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assertCeramicFloorM150TargetPreimageR2 as guard,prepareCeramicFloorM150ResourceGroupSuccessorR2 as prepare} from './prepareCeramicFloorM150ResourceGroupSuccessorR2';
const path='.release-runtime/r568/next-wave/ceramic02703/r2-sources/parent4b2d-readonly.json',sha256='50fa448d1eb370121992f5be698b65258c517cd75639ab446e78280aea1577a4';
const capture=()=>JSON.parse(readFileSync(path,'utf8'));
const rehash=(s:{rawRows:string[];sha256:string})=>{s.sha256=createHash('sha256').update(s.rawRows.join('\n')+(s.rawRows.length?'\n':'')).digest('hex');};
it('accepts the exact stable target and rejects source row, registry and target changes',()=>{
 const c=capture();expect(()=>guard(c)).not.toThrow();
 for(const name of ['parameters','formulas','resources','bindings','normativeLocators','normativeSources','newSourcePreimage','workIdentity']){
  const changed=capture();changed.sets[name].rawRows.push('{}');changed.sets[name].rowCount++;rehash(changed.sets[name]);expect(()=>guard(changed)).toThrow();
 }
 const wrong=capture(),header=JSON.parse(wrong.sets.target.rawRows[0]);header.definition_version_id='00000000-0000-4000-8000-000000000001';wrong.sets.target.rawRows[0]=JSON.stringify(header);rehash(wrong.sets.target);expect(()=>guard(wrong)).toThrow();
});
it('allows a new parent pair only while the same target preimage stays exact',()=>{
 const c=capture();c.parentReleaseId='00000000-0000-4000-8000-000000000001';c.parentSearchReleaseId='00000000-0000-4000-8000-000000000002';
 const header=JSON.parse(c.sets.target.rawRows[0]);header.release_id=c.parentReleaseId;c.sets.target.rawRows[0]=JSON.stringify(header);rehash(c.sets.target);expect(()=>guard(c)).not.toThrow();
});
it('returns a successor descriptor for the existing publisher with explicit gaps and no catalog append',async()=>{
 const c=capture(),config=prepare({releaseId:c.parentReleaseId,searchReleaseId:c.parentSearchReleaseId,outputRoot:'.release-runtime/r568/next-wave/ceramic02703/r2-preflight-only',currentTargetPreimage:{path,sha256}});
 expect(config.catalogAppend).toBeUndefined();expect(config.expectedParentShape).toEqual([177,90,90]);expect(config.passport.unresolvedApplicableResourceRowIds).toHaveLength(3);
 expect(config.sourceId).toBe('ceramic_m150_group_krer02703_03904_pkti36_r2');expect(config.masterSha256).toBe('28089a66fa72e574dc730ed67beaec81e320380ee3dc8206561437c5cdcb9239');
 for(const[k,v]of Object.entries(config.runtimeProfileInput!))expect(config.acceptanceInput[k]).toEqual(v);
 expect((await config.verifyCore()).status).toBe('PASS_GROUP_PLAN_WITH_THREE_EXPLICIT_PHYSICAL_NEEDS');
});
