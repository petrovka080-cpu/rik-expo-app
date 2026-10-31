import assert from 'node:assert/strict';
import {facadeGlassOriginalParentR3 as parent,compileFacadeGlassOriginalParentR3 as compile,facadeGlassOriginalReplayCasesR3 as plan} from './facadeGlassCapturedParentReplaysR3';
import {compareFormulaGraphDecimals as cmp} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
const literalOracles=[{area:'5000',floors:'15',expected:{glazing_units_m2:'5100',glass_units_m2:'5000',anchors_pcs:'20000',firebreak_lm_or_m2:'1800',installation_labor_hours:'5750'}},{area:'2500',floors:'7',expected:{glazing_units_m2:'2550',glass_units_m2:'2500',anchors_pcs:'10000',firebreak_lm_or_m2:'840',installation_labor_hours:'2875'}}] as const;
// All expectations are literal historical engineering-formula oracles, not
// manufacturer consumption acceptance or regenerated successor outputs.
// Product/Jest execution UNRUN by source author.
describe('original3existingglazingowners before any new facade overlay R3',()=>{
 for(const c of plan()){
  const key=c.catalogId.slice('canonical-work:expanded:'.length) as Parameters<typeof parent>[0];
  for(const o of literalOracles)test(c.caseId+' originalarea'+o.area+'floors'+o.floors,async()=>{
   const original=parent(key),before=JSON.stringify(original),result=await compile(key,{actualInputPatch:{glazing_area_m2:o.area,floors:o.floors}});
   assert.equal(original.resources.length,45);assert.equal(original.formulas.length,45);
   const ids=new Set(original.resources.map((r:{row_id:string})=>r.row_id));assert.equal(ids.size,45);
   assert(result.rows.every(r=>ids.has(r.row_id)),'all materialized rows belong to exact original45specifications');
   assert.equal(new Set(result.rows.map(r=>r.row_id)).size,result.rows.length,'no duplicate materialized rows');
   for(const[id,q]of Object.entries(o.expected)){const row=result.rows.find(r=>r.row_id===id);assert(row,id);assert.equal(cmp(row.quantity,q),0,id);}
   assert.equal(JSON.stringify(parent(key)),before,'exact original parent is immutable');
   assert.equal(original.bindings.length,0);assert.equal(original.normativeSources.length,0);
  });
 }
 test('exact3catalogowners/baselines and original5000/15 inputs remain unpatched',()=>{
  const cases=plan();assert.equal(cases.length,3);assert.equal(new Set(cases.map(c=>c.catalogId)).size,3);
  for(const c of cases){assert.equal(c.originalInput.glazing_area_m2,5000);assert.equal(c.originalInput.floors,15);assert.equal(c.captureFileSha256,'38d9fccbf92673c03d9a388d93f6d637cf5191ddb654a4a4f31d3ead20977023');assert.equal(c.sourceNormCompatibilityNotAssumed,true);assert.equal(c.newFULL,0);}
 });
});
