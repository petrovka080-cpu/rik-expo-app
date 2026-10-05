import {compileSkirtingConstructorS2735 as compile, SKIRTING_TARGETS_S2735 as targets,
  SKIRTING_DEFINITIONS_S2735 as definitions, SKIRTING_READY_ADHESIVE_CONSUMPTION_AST_S2735 as readyAst,
  SKIRTING_READY_ADHESIVE_CONSUMPTION_EXPRESSION_S2735 as boundExpression} from '../../src/lib/estimate/v4/skirtingConstructorS2735';
import {compileFormulaGraph} from '../../src/lib/estimate/backendPlatform/formulaGraph';
import {buildCanonicalProcurementProjection,selectCanonicalArtifactRows} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
const trace=(row:Record<string,unknown>)=>row.calculation_trace as Record<string,any>;
const adhesive='material:skirting:adhesive';
const shared='material:skirting:shared-sealant';
const both={length_m:30,end_cap_count:2,junction_sealing_mode:'REQUIRED',end_cap_sealant_consumption_ml:100,junction_sealant_consumption_l:0.3};
const sharedFacts={...both,sealant_supply_grouping:'SHARED_COMPATIBLE_BATCH',shared_sealant_designation:'EXPLICIT_TEST_COMPATIBLE_BATCH',shared_sealant_cartridge_ml:310,shared_sealant_compatibility_confirmed:'YES'};

describe('skirting constructor reuses ready operations and rounds compatible purchases once',()=>{
  test.each(targets)('$catalogId starts from ordinary measured length with explicit preliminary profiles',async target=>{
    const result=await compile({length_m:30},target.catalogId);
    expect(result.rows).toHaveLength(target.operation==='install'?21:19);expect(result.preliminaryNeeds).toHaveLength(5);
    expect(result.rows.find(r=>r.row_id===adhesive)?.quantity).toBe('1240');
    expect(result.rows.some(r=>r.row_id==='skirting:application_equipment')).toBe(false);
    expect(Object.keys(definitions[target.operation].runtimeInput).some(id=>/productivity|_confirmed|trip_count/.test(id))).toBe(false);
    expect(result.rows.some(r=>r.unit_id==='set'||r.unit_id==='kg')).toBe(false);
  });
  test('ready adhesive AST numerator is rebound without carrying its packaging ceil',()=>{
    const bind=(value:unknown):unknown=>typeof value==='string'?({skirting_length_linear_m:'length_m',adhesive_consumption_ml_linear_m:'adhesive_rate_ml_m'} as Record<string,string>)[value]??value:
      Array.isArray(value)?value.map(bind):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,bind(v)])):value;
    expect(compileFormulaGraph(boundExpression).ast).toEqual(bind(readyAst));
    const formula=definitions.install.formulas.find(f=>f.formula_id==='skirting_ready_adhesive_consumption_v1')!;
    expect(formula.ast).toEqual(bind(readyAst));expect(formula.expression_source).not.toContain('ceil');
  });
  test('balances use net consumption, stock and reserve before a single order rounding',async()=>{
    const result=await compile({length_m:30,cut_extra_m:0.8,material_skirting_board_stock:5,material_skirting_board_reserve:2,
      material_skirting_adhesive_stock:100,material_skirting_adhesive_reserve:50});
    expect(trace(result.rows.find(r=>r.row_id==='material:skirting:board')!).purchaseBalance).toMatchObject({consumed:'30.8',stock:'5',reserve:'2',quantum:'12',effectiveOrder:'36',remaining:'10.2'});
    expect(trace(result.rows.find(r=>r.row_id===adhesive)!).purchaseBalance).toMatchObject({consumed:'1200',stock:'100',reserve:'50',quantum:'310',effectiveOrder:'1240',remaining:'140'});
    const discriminating=await compile({length_m:7,material_skirting_adhesive_stock:280});
    expect(discriminating.rows.find(r=>r.row_id===adhesive)?.quantity).toBe('0');
    const partialBox=await compile({length_m:30,board_order_pieces:1});expect(partialBox.rows.find(r=>r.row_id==='material:skirting:board')?.quantity).toBe('30');
  });
  test('glue scope has provided boards/inserts and one installation labour charge',async()=>{
    const result=await compile({length_m:30,installation_productivity_m_man_h:5},targets.find(t=>t.operation==='glue')!.catalogId);
    expect(result.rows.some(r=>r.row_id==='material:skirting:board'||r.row_id==='material:skirting:end-cap')).toBe(false);
    expect(result.rows.filter(r=>r.category==='labor')).toHaveLength(1);expect(result.rows.find(r=>r.row_id==='skirting:installation_labor')?.quantity).toBe('6');
    expect(trace(result.rows[0]).resourceGraph.costTreatment).toBe('INFORMATIONAL_SCOPE');
    await expect(compile({length_m:30,material_skirting_board_stock:1},targets.find(t=>t.operation==='glue')!.catalogId)).rejects.toThrow('unknown estimate parameters');
  });
  test('manual tool purchase and paid electric cutting are mutually exclusive',async()=>{
    const manual=await compile({length_m:30,material_skirting_tool_mitre_saw_stock:1});
    expect(manual.rows.find(r=>r.row_id==='material:skirting:tool:mitre-saw')?.quantity).toBe('0');
    expect(manual.rows.some(r=>r.row_id==='skirting:application_equipment'||r.row_id==='material:skirting:tool:electric-saw-blade')).toBe(false);
    const pending=await compile({length_m:30,cutting_mode:'ELECTRIC_SAW'});
    expect(pending.preliminaryNeeds.find(r=>r.row_id==='skirting:application_equipment')?.missing_parameter_ids).toEqual(expect.arrayContaining(['cutting_productivity_m_machine_h','equipment_payment_scope_reference']));
    const electric=await compile({length_m:30,cutting_mode:'ELECTRIC_SAW',cutting_productivity_m_machine_h:15,equipment_payment_scope_reference:'EXPLICIT_TEST_RENT_WITHOUT_OPERATOR'});
    expect(electric.rows.find(r=>r.row_id==='skirting:application_equipment')?.quantity).toBe('2');
    expect(electric.rows.some(r=>r.row_id==='material:skirting:tool:mitre-saw'||r.row_id==='material:skirting:tool:mitre-box')).toBe(false);
    expect(electric.rows.find(r=>r.row_id==='material:skirting:tool:electric-saw-blade')?.quantity).toBe('1');
  });
  test('does not treat Forbo232 as the insert sealant or invent a grouping for two actual uses',async()=>{
    const caps=await compile({length_m:30,end_cap_count:2});
    expect(trace(caps.rows.find(r=>r.row_id===adhesive)!).purchaseBalance.consumed).toBe('1200');
    expect(caps.preliminaryNeeds.find(r=>r.row_id==='material:skirting:end-cap-sealant')?.missing_parameter_ids).toContain('end_cap_sealant_designation');
    const unknownGrouping=await compile(both);
    expect(unknownGrouping.rows.some(r=>[shared,'material:skirting:end-cap-sealant','material:skirting:junction-sealant'].includes(r.row_id))).toBe(false);
    expect(unknownGrouping.preliminaryNeeds.some(r=>r.missing_parameter_ids.includes('sealant_supply_grouping'))).toBe(true);
  });
  test('shared sealant adds both consumption quantities before one stock/reserve/rounding and exports allocations',async()=>{
    const result=await compile({...sharedFacts,material_skirting_shared_sealant_stock:80,material_skirting_shared_sealant_reserve:20});
    const owner=result.rows.find(r=>r.row_id===shared)!;
    expect(trace(owner).purchaseBalance).toMatchObject({ownerRowId:shared,consumed:'400',stock:'80',reserve:'20',effectiveOrder:'620',remaining:'300',freeBeyondReserve:'280'});
    expect(result.rows.some(r=>r.row_id==='material:skirting:end-cap-sealant'||r.row_id==='material:skirting:junction-sealant')).toBe(false);
    const allocations=result.rows.filter(r=>r.row_id.startsWith('allocation:skirting:sealant:'));
    expect(allocations.map(r=>r.quantity)).toEqual(['100','300']);expect(allocations.every(r=>!r.included_in_estimate&&!r.included_in_procurement)).toBe(true);
    const projection=buildCanonicalProcurementProjection({revision:{id:'test',release_id:'test',catalog_id:'test',checksum_sha256:'a'.repeat(64),row_count:result.rows.length},procurementRows:selectCanonicalArtifactRows(result.rows).procurementRows,sourceRows:result.rows});
    expect(projection.rows.find(r=>r.rowId===shared)?.consumptionAllocations).toEqual(expect.arrayContaining([expect.objectContaining({consumed:'100',separatelyPayable:false}),expect.objectContaining({consumed:'300',separatelyPayable:false})]));
    const unconfirmed=await compile({...sharedFacts,shared_sealant_compatibility_confirmed:null});
    expect(unconfirmed.preliminaryNeeds.find(r=>r.row_id===shared)?.missing_parameter_ids).toContain('shared_sealant_compatibility_confirmed');
  });
  test('distinct selected products retain independent packaging without a shared order',async()=>{
    const result=await compile({...both,sealant_supply_grouping:'SEPARATE_DISTINCT_PRODUCTS',end_cap_sealant_designation:'EXPLICIT_CAP_PRODUCT',end_cap_sealant_cartridge_ml:290,
      junction_sealant_product:'EXPLICIT_OTHER_JUNCTION_PRODUCT',junction_sealant_package_l:0.31});
    expect(result.rows.find(r=>r.row_id==='material:skirting:end-cap-sealant')?.quantity).toBe('290');
    expect(result.rows.find(r=>r.row_id==='material:skirting:junction-sealant')?.quantity).toBe('0.31');
    expect(result.rows.some(r=>r.row_id===shared||r.row_id.startsWith('allocation:'))).toBe(false);
  });
  test('only actual confirmation activates system facts and false/incompatible facts cannot be accepted',async()=>{
    const result=await compile({length_m:30,applicability_mode:'CONFIRMED_PROJECT_FACTS'});
    expect(result.preliminaryNeeds.find(r=>r.row_id===adhesive)?.missing_parameter_ids).toContain('system_compatibility_confirmed');
    await expect(compile({length_m:30,system_compatibility_confirmed:'NO'})).rejects.toThrow();
    await expect(compile({length_m:30,adhesive_rate_ml_m:50})).rejects.toThrow();
    await expect(compile({...sharedFacts,shared_sealant_compatibility_confirmed:'NO'})).rejects.toThrow();
  });
  test('conditional repair and separately paid delivery require their actual resource/scope facts',async()=>{
    const pending=await compile({length_m:30,local_preparation_mode:'REQUIRED',separate_delivery_trip_count:2});
    expect(pending.preliminaryNeeds.find(r=>r.row_id==='material:skirting:local-repair')?.missing_parameter_ids).toContain('local_preparation_product');
    expect(pending.preliminaryNeeds.find(r=>r.row_id==='delivery:skirting:system')?.missing_parameter_ids).toContain('delivery_payment_scope_reference');
    const included=await compile({length_m:30,separate_delivery_trip_count:0});
    expect([...included.rows,...included.preliminaryNeeds].some(r=>r.row_id==='delivery:skirting:system')).toBe(false);
  });
  test('actual repair/primer/cleaner products require their supplier packaging instead of invented decimal orders',async()=>{
    const actual={length_m:30,local_preparation_mode:'REQUIRED',local_preparation_product:'EXPLICIT_25KG_BAG',local_preparation_mass_kg:8,
      local_primer_product:'EXPLICIT_5L_CANISTER',local_primer_consumption_l:2.5,cleaner_designation:'EXPLICIT_1L_BOTTLE',cleaner_consumption_l:0.2};
    const pending=await compile(actual);
    expect(pending.preliminaryNeeds.find(r=>r.row_id==='material:skirting:local-repair')?.missing_parameter_ids).toContain('local_preparation_package_kg');
    expect(pending.preliminaryNeeds.find(r=>r.row_id==='material:skirting:local-primer')?.missing_parameter_ids).toContain('local_primer_package_l');
    expect(pending.preliminaryNeeds.find(r=>r.row_id==='material:skirting:cleaner')?.missing_parameter_ids).toContain('cleaner_package_l');
    const result=await compile({...actual,local_preparation_package_kg:25,local_primer_package_l:5,cleaner_package_l:1});
    expect(result.rows.find(r=>r.row_id==='material:skirting:local-repair')?.quantity).toBe('25');
    expect(result.rows.find(r=>r.row_id==='material:skirting:local-primer')?.quantity).toBe('5');
    expect(result.rows.find(r=>r.row_id==='material:skirting:cleaner')?.quantity).toBe('1');
  });
});
