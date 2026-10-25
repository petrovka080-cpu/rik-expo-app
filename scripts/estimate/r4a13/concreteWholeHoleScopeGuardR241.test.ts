import assert from 'node:assert/strict';
import {test} from 'node:test';
import scope from '../../../data/estimate-benchmarks/fixtures/current-whole-hole-scope-r61.json';
import {prepareConcreteWholeHoleFillingR61,
 concreteWholeHolePurePreflightR61,concreteHoleActualCoreCallsR61} from './prepareConcreteWholeHoleFillingR61';

test('current captured scope and ordinary Config pass without re-running fourteen accepted quantity cases',()=>{
 const sourceRoot=process.env.HOLE_R241_SOURCE_ROOT,outputRoot=process.env.HOLE_R241_SCOPE_GUARD_OUTPUT;
 assert(sourceRoot&&outputRoot,'ROOT_PROVIDES_EXACT_MATERIALIZED_INPUTS');
 const config=prepareConcreteWholeHoleFillingR61({sourceRoot,outputRoot,
  releaseId:scope.definitionReleaseId,searchReleaseId:scope.searchReleaseId});
 const pure=concreteWholeHolePurePreflightR61(config);
 assert.equal(pure.nativeRows,65);assert.equal(pure.unresolvedPhysicalRows,168);
 assert.equal(config.passport.unresolvedApplicableResourceRowIds?.length,168);
 assert.equal(concreteHoleActualCoreCallsR61(),0);
});

