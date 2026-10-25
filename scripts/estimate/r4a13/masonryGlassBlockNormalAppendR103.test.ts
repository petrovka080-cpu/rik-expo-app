import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {masonryGlassBlockNormalRouteR103 as route,masonryGlassBlockNormalSourceR103 as source,
 masonryGlassBlockNormalDefinitionR103 as build,masonryGlassBlockNormalCompletenessMapR103 as complete,
 type MasonryGlassBlockCardKeyR103} from '../../../src/lib/estimate/v4/masonryGlassBlockNormalCardsR103';
import {prepareMasonryGlassBlockNormalAppendR103 as prepare,masonryGlassBlockNormalPreflightR103 as preflight,
 masonryGlassBlockActualCoreCallsR103 as calls,masonryGlassBlockNativeOracleR103 as oracle} from './prepareMasonryGlassBlockNormalAppendR103';
import {validateIndependentCompletenessMapReferences as validate} from './prepareMasterSingleDefinitionSuccessorR1';

test('R103 all normal pure guards/full maps first, then two glass physical results 8+5 actual core requests fail fast',
 {timeout:110000},async()=>{
 const root=process.env.MASONRY_R103_SOURCE_ROOT;assert(root,'EXACT_R103_SOURCE_ROOT_REQUIRED');
 const lookup=JSON.parse(readFileSync(resolve(root,route.rootScopedLookup.path),'utf8').replace(/^\uFEFF/u,''))as{definitionReleaseId:string;searchReleaseId:string};
 const context={releaseId:lookup.definitionReleaseId,searchReleaseId:lookup.searchReleaseId,outputRoot:resolve(root,'UNRUN_PUBLICATION_OUTPUT'),sourceRoot:root};
 const keys:readonly MasonryGlassBlockCardKeyR103[]=['partition','opening-fill'],configs=keys.map(key=>prepare(key,context));
 assert.equal(calls(),0);assert.equal(source.physicalResults,2);assert.equal(source.profiles.length,4);assert.equal(route.newFullTechnologies,0);
 assert.equal(route.rootScopedLookup.exactFourSourceCodesSearched,false);assert.equal(route.rootScopedLookup.noMatchIsNotGlobalAbsence,true);
 assert.equal(Object.values(oracle).reduce((n,rows)=>n+rows.length,0),28);
 assert.notEqual(configs[0]!.applicability.primaryMeasureParameterId,configs[1]!.applicability.primaryMeasureParameterId);
 for(let i=0;i<keys.length;i++){
  const key=keys[i]!,config=configs[i]!,d=build(key),map=complete(key),report=preflight(config,key);
  assert.equal(report.visibleSimpleInputs,2);assert.equal(report.unknownNeeds,20);assert.equal(report.actualDbNormalAndLockedPreflight,'UNRUN');
  assert.equal(d.parameters.length,22);assert.deepEqual(d.runtimeInput,{});assert(d.parameters.every(p=>p.default_value===null));
  assert(d.resources.every(r=>!r.procurement_eligible));assert.deepEqual(d.resources.map(r=>r.ordinal),d.resources.map((_r,i)=>i));
  assert.equal(map.generatedFromCurrentRows,false);assert.equal(map.fullTechnicalAcceptance,false);assert.equal(map.entries.length,key==='partition'?40:38);
  assert(d.parameters.filter(p=>d.sourceNeedParameterIds.includes(p.parameter_id)).every(p=>
   p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'&&p.truth_metadata.visibility_role==='INTERNAL_ONLY'));
  const reinforcement=d.nativeSourceRowIds.find(id=>id.endsWith(':reinforcement'));assert(reinforcement);
  assert(validate({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources.filter(r=>r.row_id!==reinforcement)}).length>0);
  assert(validate({completenessMap:map,formulaDefinitions:d.formulas,
   resourceDefinitions:d.resources.map(r=>r.row_id===reinforcement?{...r,unit_id:'t'}:r)}).some(e=>e.endsWith('_RESOURCE_UNIT')));
  assert.throws(()=>preflight({...config,catalogId:'TEST_ONLY_GLASS_BLOCK_NO_CATALOG_ID'},key));
  assert.throws(()=>preflight({...config,catalogAppend:{...config.catalogAppend!,explicitParameterSources:{}}},key));
  assert.throws(()=>preflight({...config,catalogAppend:{...config.catalogAppend!,capturedSourcePreimage:{sourceKey:'wrong-source',expected:null}}},key));
  assert.equal(calls(),0,'NO_CORE_BEFORE_BOTH_NORMAL_CONFIG_GUARDS');
 }
 process.stdout.write('MASONRY_R103_GROUP1_NORMAL_CONFIG_AND_FULL_MAP=PASS;actualcore=0\n');
 const partition=await configs[0]!.verifyCore();assert.equal(partition.actualCoreCalls,8);assert.equal(calls(),8);
 process.stdout.write('MASONRY_R103_GROUP2_PARTITION=PASS;actualcore=8\n');
 const opening=await configs[1]!.verifyCore();assert.equal(opening.actualCoreCalls,5);assert.equal(calls(),13);
 process.stdout.write('MASONRY_R103_GROUP3_OPENING_FILL=PASS;actualcore=5\n');
 process.stdout.write('MASONRY_R103_FINAL_ACTUAL_CORE_REQUESTS=13\n');
});
