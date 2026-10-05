import {compileSinglePipeTrenchConstructorS2735 as compile,SINGLE_PIPE_TRENCH_DEFINITION_S2735 as definition} from '../../src/lib/estimate/v4/singlePipeTrenchConstructorS2735';
import {PIPE_BEDDING_BACKFILL_FORMULAS} from '../../src/lib/estimate/v4/pipeBeddingBackfillR1';
import {selectCanonicalArtifactRows,buildCanonicalProcurementProjection} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
const project={length_m:100,diameter_mm:315,trench_width_m:0.8,trench_depth_m:1.6,lower_base_thickness_m:0.1,
  pbb_bedding_thickness_mm:150,pbb_surround_cover_above_pipe_mm:300,bedding_loose_per_installed_m3:1.2,backfill_loose_per_installed_m3:1.15,base_loose_per_installed_m3:1.3,
  pbb_bedding_material:'TEST_PROJECT_SAND',pbb_backfill_material:'TEST_PROJECT_PGS',pbb_foundation_aggregate_designation:'TEST_PROJECT_BASE',pbb_assembly_designation:'EXPLICIT_TEST_GEOMETRY_NOT_RUNTIME',pbb_compaction_coefficient:0.95};
const get=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(x=>x.row_id===id)!;
const n=(r:Awaited<ReturnType<typeof compile>>,id:string)=>Number(get(r,id).quantity);
const trace=(r:Record<string,unknown>)=>r.calculation_trace as Record<string,any>;
describe('single-pipe trench constructor reuses applicable operations and canonical purchase balances',()=>{
  test('length alone gives a visible composition with local facts, never a transferred geometry or labor fixture',async()=>{
    const r=await compile({length_m:100});expect(r.rows).toHaveLength(1);expect(r.preliminaryNeeds.length).toBeGreaterThan(25);
    expect(r.preliminaryNeeds.some(x=>x.missing_parameter_ids.includes('trench_width_m'))).toBe(true);
    expect(Object.keys(definition.runtimeInput).some(id=>/diameter|depth|width|thickness|worker_h|machine_h|labor_h|coefficient|loose_per/.test(id))).toBe(false);
    expect(definition.runtimeInput.pbb_shoring_mode).toBe('SURVEY_PENDING');expect(definition.runtimeInput.pbb_dewatering_mode).toBe('SURVEY_PENDING');
  });
  test('one circular pipe conserves the excavated bank volume across base, pipe, surround and upper backfill',async()=>{
    const r=await compile(project);
    expect(n(r,'scope:trench:excavation')).toBe(128);
    expect(n(r,'scope:trench:base')+n(r,'scope:trench:pipe-displacement')+n(r,'scope:trench:bedding')+n(r,'scope:trench:upper-backfill')).toBeCloseTo(128,7);
    expect(n(r,'scope:trench:bottom-area')).toBe(80);
    expect(Number(trace(get(r,'material:trench:bedding')).purchaseBalance.consumed)).toBeCloseTo(n(r,'scope:trench:bedding')*1.2,7);
    expect(Number(trace(get(r,'material:trench:upper-backfill')).purchaseBalance.consumed)).toBeCloseTo(n(r,'scope:trench:upper-backfill')*1.15,7);
    expect(n(r,'material:trench:base')).toBe(11);
  });
  test('dimensions that cannot contain the pipe or upper support layer are rejected',async()=>{
    await expect(compile({...project,trench_width_m:0.3})).rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
    await expect(compile({...project,trench_depth_m:0.7})).rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
  });
  test('unknown loose-material conversion remains a local material need; geometry stays available',async()=>{
    const {bedding_loose_per_installed_m3,...without}=project;void bedding_loose_per_installed_m3;
    const r=await compile(without);expect(n(r,'scope:trench:excavation')).toBe(128);
    expect(r.rows.some(x=>x.row_id==='material:trench:bedding')).toBe(false);
    expect(r.preliminaryNeeds.some(x=>x.row_id==='material:trench:bedding'&&x.missing_parameter_ids.includes('bedding_loose_per_installed_m3'))).toBe(true);
  });
  test('shared declared compatible product sums needs before one rounding and stock/reserve once',async()=>{
    const r=await compile({...project,bedding_backfill_supply_mode:'SHARED',shared_aggregate_designation:'TEST_SAME_SUPPLIER_PRODUCT',compatible_aggregate_batch_reference:'EXPLICIT_TEST_COMPATIBILITY',shared_aggregate_stock:10,shared_aggregate_reserve:2,shared_aggregate_quantum:10});
    expect(r.rows.filter(x=>['material:trench:bedding','material:trench:upper-backfill'].includes(x.row_id))).toHaveLength(0);
    const owner=get(r,'material:trench:shared-aggregate');expect(owner).toBeDefined();
    const b=trace(owner).purchaseBalance;const demand=n(r,'scope:trench:bedding-supply')+n(r,'scope:trench:backfill-supply');
    expect(Number(b.consumed)).toBeCloseTo(demand,7);expect(b.stock).toBe('10');expect(b.reserve).toBe('2');
    expect(Number(b.effectiveOrder)).toBe(130);expect(Number(b.remaining)).toBeCloseTo(10+130-demand,7);
    const projection=buildCanonicalProcurementProjection({revision:{id:'test',release_id:'test',catalog_id:'test',checksum_sha256:'a'.repeat(64),row_count:r.rows.length},sourceRows:r.rows,procurementRows:selectCanonicalArtifactRows(r.rows).procurementRows});
    const saved=projection.rows.find(x=>x.rowId===owner.row_id)!;expect(saved.consumptionAllocations).toHaveLength(2);
    expect(saved.consumptionAllocations!.every(x=>x.separatelyPayable===false)).toBe(true);
    expect(projection.rows.filter(x=>x.rowId.startsWith('allocation:'))).toHaveLength(0);
  });
  test('a shared product without its compatibility facts stays unready',async()=>{
    const r=await compile({...project,bedding_backfill_supply_mode:'SHARED'});
    expect(r.rows.some(x=>x.row_id==='material:trench:shared-aggregate')).toBe(false);
    expect(r.preliminaryNeeds.find(x=>x.row_id==='material:trench:shared-aggregate')?.missing_parameter_ids).toEqual(expect.arrayContaining(['shared_aggregate_designation','compatible_aggregate_batch_reference']));
  });
  test('project method and compaction target gate dependent supply and paid child resources',async()=>{
    const {pbb_assembly_designation,pbb_compaction_coefficient,...without}=project;void pbb_assembly_designation;void pbb_compaction_coefficient;
    const r=await compile({...without,pbb_compaction_labor_h:5,pbb_compactor_machine_h:2,machine_rate_scope_reference:'TEST_RATE'});
    for(const id of ['material:trench:bedding','rc09:labor:pbb-compaction','rc09:equipment:pbb-compactor']){
      expect(r.rows.some(x=>x.row_id===id)).toBe(false);
      expect(r.preliminaryNeeds.find(x=>x.row_id===id)?.missing_parameter_ids).toEqual(expect.arrayContaining(['pbb_assembly_designation','pbb_compaction_coefficient']));
    }
    expect(n(r,'scope:trench:excavation')).toBe(128);
  });
  test('an explicitly absent lower base does not request its supplier conversion or material',async()=>{
    const {base_loose_per_installed_m3,...without}=project;void base_loose_per_installed_m3;
    const r=await compile({...without,lower_base_thickness_m:0});
    expect(n(r,'scope:trench:base')).toBe(0);
    expect(r.preliminaryNeeds.some(x=>x.row_id==='scope:trench:base-supply'||x.row_id==='material:trench:base')).toBe(false);
    expect(r.rows.some(x=>x.row_id==='material:trench:base')).toBe(false);
  });
  test('paid removal/delivery trips require the declared nonduplicated logistics scope',async()=>{
    const r=await compile({length_m:100,pbb_removal_trip_count:2,pbb_delivery_trip_count:3});
    expect(r.preliminaryNeeds.find(x=>x.row_id==='rc09:logistics:pbb-removal')?.missing_parameter_ids).toContain('soil_reuse_export_reference');
    expect(r.preliminaryNeeds.find(x=>x.row_id==='rc09:logistics:pbb-delivery')?.missing_parameter_ids).toContain('material_delivery_scope_reference');
    expect(r.rows.some(x=>x.row_id.startsWith('rc09:logistics:'))).toBe(false);
  });
  test('existing child ASTs for actual labour are reused; scope and soil quantities do not double-charge hours or trips',async()=>{
    const actual=PIPE_BEDDING_BACKFILL_FORMULAS.find(x=>x.formula_id==='pbb_compaction_labor_v1');
    const current=definition.formulas.find(x=>x.formula_id===actual?.formula_id);expect(current?.ast).toEqual(actual?.ast);
    const r=await compile({...project,excavation_worker_h:20,excavation_method_reference:'TEST_PPR',soil_export_loose_m3:40,soil_reuse_export_reference:'TEST_SOIL_BALANCE',pbb_removal_trip_count:4});
    expect(trace(get(r,'rc09:pbb_excess_soil_removal')).resourceGraph.costTreatment).toBe('INFORMATIONAL_SCOPE');
    expect(trace(get(r,'rc09:pbb_trench_bottom_preparation')).resourceGraph.costTreatment).toBe('INFORMATIONAL_SCOPE');
    expect(n(r,'rc09:logistics:pbb-removal')).toBe(4);expect(n(r,'labor:trench:excavation')).toBe(20);
  });
});
