import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fusionBenchPackS2758 as pack,fusionBenchPrefixS2758 as prefix,fusionBenchDefinitionS2758,compileFusionBenchS2758,
  includedBenchFixingsS2758,separateBenchFixingsS2758,fusionBenchCompletenessMapS2758} from '../../../src/lib/estimate/v4/fusionBenchPreparedConcreteS2758';
import {validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';

export function fusionBenchControlS2758(n=3,separate=false):Record<string,unknown>{return {
  bench_count:n,prepared_foundation_acceptance_reference:'CONTROL_ONLY: проект и замеры сплошного готового бетона и расположения коммуникаций; не данные объекта',
  available_concrete_depth_mm:200,minimum_anchor_edge_distance_mm:110,
  actual_bench_supply_specification:'CONTROL_ONLY: Glasdon Fusion Bench, 1800×310×425мм, собранная, выбранное исполнение по поставщику; состав подтверждён документом; не данные объекта',
  anchor_supply_scope:separate?separateBenchFixingsS2758:includedBenchFixingsS2758,bench_stock:0,bench_reserve:0,bench_quantum:1,
  ...(separate?{fixing_supply_specification:'CONTROL_ONLY: совместимый штатный бетонный крепёж Fusion/C000-0096, цельный узел с гайкой M10 и шайбами; не данные объекта',
    fixing_stock:0,fixing_reserve:0,fixing_quantum:1}:{}),
};}

export async function verifyFusionBenchS2758(){
  for(const source of pack.sources)assert.equal(createHash('sha256').update(readFileSync(source.path)).digest('hex'),source.sha256);
  const d=fusionBenchDefinitionS2758();
  assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length],[25,13,13]);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:fusionBenchCompletenessMapS2758(),formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
  assert.equal(d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').length,15);
  for(const separate of [false,true])for(const n of [3,11]){
    const result=await compileFusionBenchS2758(fusionBenchControlS2758(n,separate));
    assert.equal(result.rows.length,separate?4:3); assert.equal(result.preliminaryNeeds.length,8);
    assert.equal(result.rows.filter(r=>r.included_in_procurement).length,separate?2:1);
    assert.equal(result.rows.find(r=>r.row_id===prefix+':bench-consumed')?.quantity,String(n));
    assert.equal(result.rows.find(r=>r.row_id===prefix+':bench-order')?.quantity,String(n));
    assert.equal(result.rows.find(r=>r.row_id===prefix+':'+(separate?'fixing-consumed-separate':'fixing-included'))?.quantity,String(4*n));
    assert.equal(result.rows.find(r=>r.row_id===prefix+':fixing-order')?.quantity,separate?String(4*n):undefined);
    assert(result.rows.every(r=>r.unit_price===null));
    assert(!result.rows.some(r=>/holes|washers|bolt|nut/.test(r.row_id)));
  }
  const base=fusionBenchControlS2758();
  const positive={...base,bench_stock:1,bench_reserve:1,bench_quantum:2};
  assert(!(await compileFusionBenchS2758(positive)).rows.some(r=>r.row_id===prefix+':bench-order'));
  const ready=await compileFusionBenchS2758({...positive,bench_stock_compatibility_reference:'CONTROL_ONLY: точные пригодные полные комплекты с четырьмя штатными креплениями'});
  assert.equal(ready.rows.find(r=>r.row_id===prefix+':bench-order')?.quantity,'4');
  assert.equal(ready.rows.find(r=>r.row_id===prefix+':fixing-included')?.quantity,'12');
  for(const bad of [{bench_count:1.5},{bench_count:0},{available_concrete_depth_mm:199},{minimum_anchor_edge_distance_mm:109},
    {anchor_supply_scope:'NOT_SELECTED'},{bench_quantum:0},{open_scope_qty_drill_and_bit:1}])await assert.rejects(()=>compileFusionBenchS2758({...base,...bad}));
  return {status:'GREEN_EXACT_FUSION_COMPOSITION_PARTIAL',shape:[25,13,13],included:[3,8,1],separate:[4,8,2],
    arbitraryComponentPurchases:0,holePriceOwners:0,fullTechnicalAcceptance:false,acceptedCompleteTypes:0};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/preflightS2758FusionBench.ts'))void verifyFusionBenchS2758()
  .then(result=>process.stdout.write(JSON.stringify(result)+'\n')).catch(e=>{process.stderr.write(String(e.stack??e)+'\n');process.exitCode=1;});
