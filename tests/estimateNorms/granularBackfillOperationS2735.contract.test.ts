import {compileGranularBackfillOperationS2735 as compile,GRANULAR_BACKFILL_CATALOG_IDS_S2735 as catalogs,GRANULAR_BACKFILL_DEFINITION_S2735 as definition} from '../../src/lib/estimate/v4/granularBackfillOperationS2735';
import {SINGLE_PIPE_TRENCH_DEFINITION_S2735 as accepted} from '../../src/lib/estimate/v4/singlePipeTrenchConstructorS2735';
const project={volume_m3:20,backfill_loose_per_installed_m3:1.2,pbb_backfill_material:'EXPLICIT_TEST_GRANULAR_PRODUCT',pbb_assembly_designation:'EXPLICIT_TEST_PROJECT_METHOD',pbb_compaction_coefficient:0.95};
const trace=(r:Record<string,unknown>)=>r.calculation_trace as Record<string,any>;
describe('batch of volume-scoped granular backfill operations reuses the accepted calculation',()=>{
  test.each(catalogs)('%s exposes known installed volume without manufacturing trench geometry',async catalog=>{
    const r=await compile({volume_m3:20},catalog);expect(r.rows).toHaveLength(1);expect(r.rows[0].quantity).toBe('20');expect(r.preliminaryNeeds.length).toBe(25);
    expect(definition.parameters.some(p=>/diameter|trench_width|trench_depth|bedding_thickness|cover_above/.test(p.parameter_id))).toBe(false);
    expect(Object.keys(definition.runtimeInput).some(id=>/labor_h|machine_h|loose_per|coefficient|trip_count/.test(id))).toBe(false);
  });
  test('loose supply has one accepted owner AST, rounds with stock/reserve once, and keeps installed volume nonpayable',async()=>{
    const r=await compile({...project,backfill_stock:5,backfill_reserve:2,backfill_quantum:10});
    const row=r.rows.find(x=>x.row_id==='material:trench:upper-backfill')!;expect(row.quantity).toBe('30');
    expect(trace(row).purchaseBalance).toMatchObject({consumed:'24',stock:'5',reserve:'2',effectiveOrder:'30',remaining:'11',freeBeyondReserve:'9'});
    expect(trace(r.rows.find(x=>x.row_id==='scope:backfill:installed')!).resourceGraph.costTreatment).toBe('INFORMATIONAL_SCOPE');
    const formulaId=accepted.resources.find(x=>x.row_id===row.row_id)!.formula_id;
    const source=accepted.formulas.find(f=>f.formula_id===formulaId)!;expect(source).toBeDefined();expect(definition.formulas.find(f=>f.formula_id===formulaId)?.ast).toEqual(source.ast);
  });
  test('doubling actual installed volume changes demand without a separate calculator',async()=>{
    const r=await compile({...project,volume_m3:40});const row=r.rows.find(x=>x.row_id==='material:trench:upper-backfill')!;
    expect(trace(row).purchaseBalance.consumed).toBe('48');expect(row.quantity).toBe('48');
  });
  test('missing method/compaction does not become an approved high-load or wet-zone norm',async()=>{
    for(const catalog of catalogs){const r=await compile({volume_m3:20,backfill_loose_per_installed_m3:1.2,pbb_backfill_material:'TEST_PRODUCT',pbb_compaction_labor_h:5},catalog);
      expect(r.rows.some(x=>x.row_id==='material:trench:upper-backfill'||x.row_id==='rc09:labor:pbb-compaction')).toBe(false);
      expect(r.preliminaryNeeds.find(x=>x.row_id==='material:trench:upper-backfill')?.missing_parameter_ids).toEqual(expect.arrayContaining(['pbb_assembly_designation','pbb_compaction_coefficient']));}
  });
  test('explicit zero separate trips excludes logistics without inventing a scope reference',async()=>{
    const r=await compile({...project,pbb_delivery_trip_count:0,pbb_removal_trip_count:0});
    expect(r.rows.some(x=>x.row_id.startsWith('rc09:logistics:'))).toBe(false);
    expect(r.preliminaryNeeds.some(x=>x.row_id.startsWith('rc09:logistics:'))).toBe(false);
  });
  test('positive separate trips still require actual nonduplicated logistics references',async()=>{
    const r=await compile({...project,pbb_delivery_trip_count:2,pbb_removal_trip_count:1});
    expect(r.preliminaryNeeds.find(x=>x.row_id==='rc09:logistics:pbb-delivery')?.missing_parameter_ids).toContain('material_delivery_scope_reference');
    expect(r.preliminaryNeeds.find(x=>x.row_id==='rc09:logistics:pbb-removal')?.missing_parameter_ids).toContain('backfill_waste_scope_reference');
  });
});
