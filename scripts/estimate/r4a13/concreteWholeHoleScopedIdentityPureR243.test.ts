import assert from 'node:assert/strict';
import {test} from 'node:test';
import scope from '../../../data/estimate-benchmarks/fixtures/current-whole-hole-scope-r61.json';
import route from '../../../data/estimate-benchmarks/source-packs/concrete-whole-hole-normal-route-r61.json';
import {assertConcreteWholeHoleScopedIdentityReviewR241 as check,concreteHoleActualCoreCallsR61}
 from './prepareConcreteWholeHoleFillingR61';

test('scope accepts exact captured current release without identity admission',()=>{
 check(scope,route.currentScope);
 assert.equal(concreteHoleActualCoreCallsR61(),0);
});

const negatives:readonly(readonly[string,unknown,RegExp])[]=[
 ['status','NOT_ACCEPTED',/R241_SCOPE_NOT_ACCEPTED/],
 ['definitionReleaseId','WRONG_RELEASE',/R241_SCOPE_DEFINITION_RELEASE_DRIFT/],
 ['searchReleaseId','WRONG_SEARCH_RELEASE',/R241_SCOPE_SEARCH_RELEASE_DRIFT/],
 ['headers',[{catalogId:'PLAUSIBLE_EXISTING_OWNER_REQUIRES_REVIEW'}],/R241_PLAUSIBLE_OWNER_REVIEW_REQUIRED/],
 ['locators',[{locator_key:'46-03-017'}],/R241_REGISTERED_017_REUSE_REVIEW_REQUIRED/],
 ['identities',[{work_key:route.workKey}],/R241_EXISTING_IDENTITY_REUSE_REVIEW_REQUIRED/],
 ['sources',[...scope.sources,{source_key:route.sourceId}],/R241_EXISTING_EXACT_SOURCE_REUSE_REVIEW_REQUIRED/],
 ['headers',null,/R241_SCOPE_ARRAY_REQUIRED:headers/],
 ['transactionRolledBack',false,/R241_SCOPE_ROLLBACK_NOT_PROVED/],
 ['databaseWrites',1,/R241_SCOPE_NOT_READ_ONLY/],
 ['globalAbsenceClaim',true,/R241_NO_GLOBAL_ABSENCE_CLAIM/],
];
for(const[key,value,error]of negatives)test('scope rejects '+key,()=>{
 const changed:Record<string,unknown>=structuredClone(scope);changed[key]=value;
 assert.throws(()=>check(changed,route.currentScope),error);
 assert.equal(concreteHoleActualCoreCallsR61(),0);
});
