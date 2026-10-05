import {
  compileGravelBaseOperationS2735 as compile, GRAVEL_BASE_CATALOG_IDS_S2735 as catalogs,
  GRAVEL_BASE_DEFINITION_S2735 as definition, GRAVEL_BASE_BINDINGS_S2735 as bindings,
} from '../../src/lib/estimate/v4/gravelBaseOperationS2735';
import { GRANULAR_BACKFILL_DEFINITION_S2735 as ready } from '../../src/lib/estimate/v4/granularBackfillOperationS2735';
import { compileAutomaticConstructionOwnerR1 } from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { compileFormulaGraph } from '../../src/lib/estimate/backendPlatform/formulaGraph';

const project = {volume_m3:20, gb_backfill_loose_per_installed_m3:1.2, gb_pbb_backfill_material:'EXPLICIT_TEST_GRAVEL_SPECIFICATION',
  gb_pbb_assembly_designation:'EXPLICIT_TEST_LAYER_METHOD', gb_pbb_compaction_coefficient:0.95};
type Trace = {purchaseBalance?:Record<string,unknown>; resourceGraph:Record<string,unknown>};
const trace = (row:Record<string,unknown>) => row.calculation_trace as Trace;
const supplyId='gravel-base:material:trench:upper-backfill';
const geoId='gravel-base:material:trench:geotextile';
describe('gravel-base variants reuse accepted operations with distinct instance bindings',()=>{
  test.each(catalogs)('%s starts from measured layer volume without inventing project facts',async catalog=>{
    const result=await compile({volume_m3:20},catalog);
    expect(result.rows).toHaveLength(1);expect(result.rows[0].quantity).toBe('20');expect(result.preliminaryNeeds).toHaveLength(25);
    expect(definition.runtimeInput.gb_geotextile_mode).toBe('SURVEY_PENDING');
    expect(Object.keys(definition.runtimeInput).some(id=>/labor_h|machine_h|loose_per|coefficient|trip_count/.test(id))).toBe(false);
    expect(definition.parameters.some(p=>/diameter|trench_width|trench_depth|bedding_thickness|cover_above/.test(p.parameter_id))).toBe(false);
  });
  test('all ready ASTs survive identifier binding and expressions agree with the bound AST',()=>{
    const bind=(value:unknown):unknown=>typeof value==='string'?(bindings.parameters[value]??bindings.formulas[value]??bindings.rows[value]??value)
      :Array.isArray(value)?value.map(bind):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,child])=>[key,bind(child)])):value;
    for(const source of ready.formulas){const formula=definition.formulas.find(f=>f.formula_id===bindings.formulas[source.formula_id])!;
      expect(formula.ast).toEqual(bind(source.ast));expect(formula.expression_source).toBeDefined();
      expect(compileFormulaGraph(formula.expression_source!).ast).toEqual(formula.ast);}
    expect(definition.resources.every(row=>trace({calculation_trace:{resourceGraph:row.resource_graph}}).resourceGraph.operationCompositionV1)).toBe(true);
  });
  test('stock, reserve, internal consumption and rounding have the correct gravel-base owner',async()=>{
    const result=await compile({...project,gb_backfill_stock:5,gb_backfill_reserve:2,gb_backfill_quantum:10});
    const row=result.rows.find(r=>r.row_id===supplyId)!;
    expect(row.quantity).toBe('30');expect(trace(row).purchaseBalance).toMatchObject({ownerRowId:supplyId,consumed:'24',stock:'5',reserve:'2',effectiveOrder:'30',remaining:'11',freeBeyondReserve:'9'});
    expect(trace(result.rows[0]).resourceGraph.costTreatment).toBe('INFORMATIONAL_SCOPE');
    const doubled=await compile({...project,volume_m3:40});expect(trace(doubled.rows.find(r=>r.row_id===supplyId)!).purchaseBalance?.consumed).toBe('48');
  });
  test('two ready operations can coexist without duplicate row, formula or internal-quantity owners',async()=>{
    expect(ready.resources.some(row=>definition.resources.some(other=>other.row_id===row.row_id||other.cost_owner_id===row.cost_owner_id))).toBe(false);
    expect(ready.formulas.some(formula=>definition.formulas.some(other=>other.formula_id===formula.formula_id))).toBe(false);
    expect(ready.parameters.filter(p=>p.parameter_id!=='volume_m3').some(parameter=>definition.parameters.some(other=>other.parameter_id===parameter.parameter_id))).toBe(false);
    const joined={parameters:[...ready.parameters,...definition.parameters.filter(p=>p.parameter_id!=='volume_m3')],
      formulas:[...ready.formulas,...definition.formulas],resources:[...ready.resources,...definition.resources],
      runtimeInput:{...ready.runtimeInput,...definition.runtimeInput},runtimeClassification:{...ready.runtimeClassification,...definition.runtimeClassification},
      runtimeSourceIds:{...ready.runtimeSourceIds,...definition.runtimeSourceIds},ordinaryParameterIds:['volume_m3']};
    const result=await compileAutomaticConstructionOwnerR1({compilerVersion:'test-explicit-operation-instances',catalogId:catalogs[0],primaryMeasureParameterId:'volume_m3',definition:joined,
      submittedParameters:{...project,gb_backfill_loose_per_installed_m3:1.5,gb_backfill_stock:2,gb_backfill_reserve:3,gb_backfill_quantum:10,
        backfill_loose_per_installed_m3:1.2,pbb_backfill_material:'EXPLICIT_OTHER_BATCH',pbb_assembly_designation:'EXPLICIT_OTHER_METHOD',pbb_compaction_coefficient:0.95,backfill_stock:5,backfill_reserve:2,backfill_quantum:10}});
    expect(trace(result.rows.find(r=>r.row_id==='material:trench:upper-backfill')!).purchaseBalance).toMatchObject({consumed:'24',effectiveOrder:'30',remaining:'11'});
    expect(trace(result.rows.find(r=>r.row_id===supplyId)!).purchaseBalance).toMatchObject({consumed:'30',stock:'2',reserve:'3',effectiveOrder:'40',remaining:'12'});
  });
  test('geotextile consumes actual layout area including laps and owns its separate stock once',async()=>{
    const result=await compile({...project,gb_geotextile_mode:'REQUIRED',gb_pbb_geotextile_designation:'EXPLICIT_TEST_PROJECT_GEOTEXTILE',gb_pbb_geotextile_area_m2:42,gb_geotextile_stock:3,gb_geotextile_reserve:1,gb_geotextile_quantum:10});
    expect(trace(result.rows.find(r=>r.row_id===geoId)!).purchaseBalance).toMatchObject({ownerRowId:geoId,consumed:'42',stock:'3',reserve:'1',effectiveOrder:'40',remaining:'1'});
    const incomplete=await compile({...project,gb_geotextile_mode:'REQUIRED'});
    expect(incomplete.rows.some(row=>row.row_id===geoId)).toBe(false);
    expect(incomplete.preliminaryNeeds.find(row=>row.row_id===geoId)?.missing_parameter_ids).toEqual(expect.arrayContaining(['gb_pbb_geotextile_area_m2','gb_pbb_geotextile_designation']));
    const noGeo=await compile({...project,gb_geotextile_mode:'NOT_REQUIRED'});
    expect(noGeo.rows.some(row=>row.row_id===geoId)||noGeo.preliminaryNeeds.some(row=>row.row_id===geoId)).toBe(false);
  });
  test('project method/compaction and positive separate transport require actual scope facts',async()=>{
    const result=await compile({volume_m3:20,gb_backfill_loose_per_installed_m3:1.2,gb_pbb_backfill_material:'EXPLICIT_TEST_GRAVEL',gb_pbb_delivery_trip_count:2,gb_pbb_removal_trip_count:1});
    expect(result.preliminaryNeeds.find(r=>r.row_id===supplyId)?.missing_parameter_ids).toEqual(expect.arrayContaining(['gb_pbb_assembly_designation','gb_pbb_compaction_coefficient']));
    expect(result.preliminaryNeeds.find(r=>r.row_id==='gravel-base:rc09:logistics:pbb-delivery')?.missing_parameter_ids).toContain('gb_material_delivery_scope_reference');
    expect(result.preliminaryNeeds.find(r=>r.row_id==='gravel-base:rc09:logistics:pbb-removal')?.missing_parameter_ids).toContain('gb_backfill_waste_scope_reference');
    const includedTrips=await compile({...project,gb_pbb_delivery_trip_count:0,gb_pbb_removal_trip_count:0});
    expect([...includedTrips.rows,...includedTrips.preliminaryNeeds].some(r=>r.row_id.startsWith('gravel-base:rc09:logistics:'))).toBe(false);
  });
});
