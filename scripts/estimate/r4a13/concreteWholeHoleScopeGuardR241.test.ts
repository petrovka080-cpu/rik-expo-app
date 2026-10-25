import assert from 'node:assert/strict';
import {test} from 'node:test';
import scope from '../../../data/estimate-benchmarks/fixtures/current-whole-hole-scope-r61.json';
import route from '../../../data/estimate-benchmarks/source-packs/concrete-whole-hole-normal-route-r61.json';
import {assertConcreteWholeHoleScopedIdentityReviewR241 as check,prepareConcreteWholeHoleFillingR61,
 concreteWholeHolePurePreflightR61,concreteHoleActualCoreCallsR61} from './prepareConcreteWholeHoleFillingR61';

test('current captured scope and ordinary Config pass without re-running fourteen accepted quantity cases',()=>{
 check(scope,route.currentScope);
 const sourceRoot=process.env.HOLE_R241_SOURCE_ROOT,outputRoot=process.env.HOLE_R241_SCOPE_GUARD_OUTPUT;
 assert(sourceRoot&&outputRoot,'ROOT_PROVIDES_EXACT_MATERIALIZED_INPUTS');
 const config=prepareConcreteWholeHoleFillingR61({sourceRoot,outputRoot,
  releaseId:scope.definitionReleaseId,searchReleaseId:scope.searchReleaseId});
 const pure=concreteWholeHolePurePreflightR61(config);
 assert.equal(pure.nativeRows,65);assert.equal(pure.unresolvedPhysicalRows,168);
 assert.equal(config.passport.unresolvedApplicableResourceRowIds?.length,168);
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
