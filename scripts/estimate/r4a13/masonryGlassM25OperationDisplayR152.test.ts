import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {prepareMasonryGlassM25OperationDisplayR152,masonryGlassM25DisplayPreflightR152,masonryGlassM25ActualEntriesR152}
 from './prepareMasonryGlassM25OperationDisplayR152';

test('R152 existing glass M25 resource appears once per own source operation before four affected cores',async()=>{
 const sourceRoot=process.env.MASONRY_R152_SOURCE_ROOT;assert(sourceRoot);
 const raw:unknown=JSON.parse(readFileSync(resolve(sourceRoot,'data/estimate-benchmarks/fixtures/masonry-glass-block-scoped-current-lookup-r58-r103.json'),'utf8').replace(/^\uFEFF/u,''));
 assert(raw&&typeof raw==='object'&&!Array.isArray(raw));const lookup=raw as Record<string,unknown>;
 assert.equal(typeof lookup.definitionReleaseId,'string');assert.equal(typeof lookup.searchReleaseId,'string');
 const configs=(['partition','opening-fill'] as const).map(key=>({key,config:prepareMasonryGlassM25OperationDisplayR152(key,
  {sourceRoot,releaseId:String(lookup.definitionReleaseId),searchReleaseId:String(lookup.searchReleaseId),outputRoot:resolve(sourceRoot,'validation-only-'+key)})}));
 for(const{key,config}of configs){
  masonryGlassM25DisplayPreflightR152(config,key);
  const foreign= configs.find(item=>item.key!==key);assert(foreign);
  assert.throws(()=>masonryGlassM25DisplayPreflightR152({...config,catalogId:foreign.config.catalogId},key),Error);
  assert.throws(()=>masonryGlassM25DisplayPreflightR152({...config,sourceId:foreign.config.sourceId},key),Error);
  const append=config.catalogAppend,foreignAppend=foreign.config.catalogAppend;assert(append&&foreignAppend);
  const foreignIdentity={...config,catalogAppend:{...append,identity:{...append.identity,sourceIdentity:foreignAppend.identity.sourceIdentity}}};
  assert.throws(()=>masonryGlassM25DisplayPreflightR152(foreignIdentity,key),Error);
  const missing={...config,resourceDefinitions:structuredClone(config.resourceDefinitions)};
  const mortar=missing.resourceDefinitions.find(r=>r.row_id.endsWith(':ready-cement-lime-m25'));assert(mortar);
  const composition=mortar.resource_graph.operationCompositionV1;assert(composition&&typeof composition==='object'&&!Array.isArray(composition));
  mortar.resource_graph={...mortar.resource_graph,operationCompositionV1:{...composition,additionalOperations:[]}};
  assert.throws(()=>masonryGlassM25DisplayPreflightR152(missing,key),Error);
  const foreignQuantity={...config,formulaDefinitions:structuredClone(config.formulaDefinitions)};
  const f=foreignQuantity.formulaDefinitions.find(f=>f.formula_id.endsWith(':formula:ready-cement-lime-m25'));assert(f);f.expression_source='0.17';
  assert.throws(()=>masonryGlassM25DisplayPreflightR152(foreignQuantity,key),Error);
  const missingCriterion={...config,resourceDefinitions:structuredClone(config.resourceDefinitions)};
  const labour=missingCriterion.resourceDefinitions.find(row=>row.row_id.endsWith(':whole-labour'));assert(labour);
  const labourComposition=labour.resource_graph.operationCompositionV1;
  assert(labourComposition&&typeof labourComposition==='object'&&!Array.isArray(labourComposition));
  const related=(labourComposition as Record<string,unknown>).additionalOperations;assert(Array.isArray(related));
  labour.resource_graph={...labour.resource_graph,operationCompositionV1:{...labourComposition,
   additionalOperations:related.map((value:unknown)=>{
    assert(value&&typeof value==='object'&&!Array.isArray(value));
    const{completionCriterionRu:_criterion,...entry}=value as Record<string,unknown>;return entry;
   })}};
  assert.throws(()=>masonryGlassM25DisplayPreflightR152(missingCriterion,key),Error);
 }
 // All pure guards for both cards finish before the first real core request.
 for(const{key,config}of configs){const result:unknown=await config.verifyCore();assert(result&&typeof result==='object'&&!Array.isArray(result));
  const value=result as Record<string,unknown>;assert.equal(value.card,key);assert.equal(value.entries,2);assert.equal(value.full,false);}
 assert.equal(masonryGlassM25ActualEntriesR152(),4);
});
