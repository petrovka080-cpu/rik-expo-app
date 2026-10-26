import test from 'node:test';
import assert from 'node:assert/strict';
import {ct29ExistingMineralSeriesS2754,ct29ExistingMineralGeometryPackR1,ct29ExistingMineralPrefixS2754} from './ct29ExistingMineralSeriesS2754';
import {buildCt29IndoorResourceProvisionDefinitionR3} from './ct29IndoorResourceProvisionR3';
import {buildCt29IndoorResourceProvisionDefinitionR4,ct29IndoorResourceProvisionPackR4 as pack} from './ct29IndoorResourceProvisionR4';

test('future CT29 R4 functional items keep no invented stock/order policy and preserve the current R3 boundary',()=>{
 const index=ct29ExistingMineralSeriesS2754.types.findIndex(type=>type.catalogId===pack.catalogId);assert(index>=0);
 const source=ct29ExistingMineralGeometryPackR1(index),prefix=ct29ExistingMineralPrefixS2754(index);
 const current=buildCt29IndoorResourceProvisionDefinitionR3(source,prefix);
 const future=buildCt29IndoorResourceProvisionDefinitionR4(source,prefix);
 const originalFormulaIds=new Set(current.formulas.map(f=>f.formula_id));
 assert.deepEqual(future.formulas.filter(f=>originalFormulaIds.has(f.formula_id)),current.formulas);
 for(const previous of current.resources){const row=future.resources.find(r=>r.row_id===previous.row_id);assert(row);
  assert.equal(row.unit_id,previous.unit_id);assert.equal(row.formula_id,previous.formula_id);assert.equal(row.cost_owner_id,previous.cost_owner_id);
 }
 for(const profile of pack.profiles){
  const row=future.resources.find(r=>r.row_id===prefix+':'+profile.resourceKey);assert(row);
  assert.equal(row.procurement_eligible,false);assert.equal(row.resource_graph.costTreatment,'INCLUDED_IN_RESOURCE_ROWS');
  assert.equal(row.cost_owner_id,prefix+':labor');assert.equal(row.resource_graph.purchaseBalanceV1,undefined);
  const parameterId='ct29_provision_'+(['mixing-vessel','sprayer'].includes(profile.resourceKey)?'r3_':'r4_')+profile.resourceKey.replaceAll('-','_');
  const parameter=future.parameters.find(p=>p.parameter_id===parameterId);assert(parameter);
  assert.equal(parameter.default_value,null);assert.equal(parameter.truth_metadata.runtime_profile_classification,'PRELIMINARY_SOURCE_FORMULA');
  assert.deepEqual(parameter.truth_metadata.preliminary_value_formula_v1,{version:'canonical-preliminary-parameter-formula:v1',expression:'min(1,ct29_whole_batches)',
   explicitValuePolicy:'REQUIRE_MATCH',when:{kind:'literal',value:true}});
 }
 // The already-applied R3 four-item commercial graph is preserved, not silently
 // rewritten by a successor whose three future items have no actual stock.
 for(const key of ['mixer-drive','mixer-paddle','metal-float','water-measure']){
  const before=current.resources.find(r=>r.row_id===prefix+':'+key),after=future.resources.find(r=>r.row_id===prefix+':'+key);assert(before&&after);
  assert.deepEqual(after.resource_graph.purchaseBalanceV1,before.resource_graph.purchaseBalanceV1);
 }
 const lock=future.parameters.find(p=>p.parameter_id==='ct29_provision_r4_mixing_rotation_lock');assert(lock);
 assert.equal(lock.default_value,null);assert.equal(lock.truth_metadata.value_source_role,'UNRESOLVED_APPLICATION_NORM');
 assert.equal(pack.profiles.find(p=>p.resourceKey==='sprayer')?.specification.careWaterNormL,null);
 assert.equal(pack.profiles.find(p=>p.resourceKey==='paddle-cleaner')?.specification.washWaterL,null);
 // Builders only: no core, publisher, stock fixture, order, price or source admission.
});
