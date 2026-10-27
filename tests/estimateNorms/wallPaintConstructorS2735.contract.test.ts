import {compileWallPaintConstructorS2735 as compile,WALL_PAINT_DEFINITION_S2735 as definition,
  WALL_PAINT_CATALOGS_S2735 as catalogs,WALL_PAINT_READY_ROWS_S2735 as ready} from '../../src/lib/estimate/v4/wallPaintConstructorS2735';
import {buildMasterParameterCalculationConsumers} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {buildCanonicalProcurementProjection,selectCanonicalArtifactRows} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {compileFormulaGraph} from '../../src/lib/estimate/backendPlatform/formulaGraph';
const trace=(row:Record<string,unknown>)=>row.calculation_trace as Record<string,any>;
const repair={mineral_repair_mode:'CT29_REQUIRED',repair_area_m2:2,repair_average_depth_mm:2,
  repair_preparation_mode:'CT17_UNDILUTED',repair_preparation_reference:'EXPLICIT_TEST_PRIMING_AND_DRYING',
  repair_drying_compatibility_reference:'EXPLICIT_TEST_COMPATIBLE_MINERAL_REPAIR',repair_additional_water_l:3};
const primer=<T extends {row_id:string}>(rows:T[])=>rows.filter(r=>r.row_id.startsWith('material:wall-paint:shared-ct17:'));
const water=<T extends {row_id:string}>(rows:T[])=>rows.filter(r=>r.row_id.startsWith('material:wall-paint:shared-water:'));

describe('wall paint constructor reuses ready operations with explicit material systems',()=>{
  test('every input has a real calculation/resource consumer and productivities are not hidden defaults',()=>{
    const {resourceConsumers}=buildMasterParameterCalculationConsumers({parameters:definition.parameters,formulas:definition.formulas,resources:definition.resources});
    expect(definition.parameters.filter(p=>!resourceConsumers[p.parameter_id]?.length)).toEqual([]);
    expect(Object.keys(definition.runtimeInput).some(id=>/productivity|_confirmed|trip_count|repair_area|repair_average_depth/.test(id))).toBe(false);
  });
  test.each(catalogs)('%s starts with measured area and visible preliminary material selections',async catalog=>{
    const result=await compile({area_m2:50},catalog);
    expect(result.rows).toHaveLength(28);expect(result.preliminaryNeeds).toHaveLength(5);
    expect(result.rows.find(r=>r.row_id==='material:wall-paint:ct54')?.quantity).toBe('15');
    expect(primer(result.rows)).toHaveLength(1);expect(primer(result.rows)[0]?.quantity).toBe('10');
    expect(water(result.rows)).toHaveLength(1);expect(water(result.rows)[0]?.quantity).toBe('5');
    expect(result.rows.some(r=>r.row_id==='material:wall-paint:ct29'||r.row_id==='wall-paint:ready:paint_equipment')).toBe(false);
    expect(result.rows.filter(r=>r.included_in_procurement).some(r=>r.unit_id==='set')).toBe(false);
  });
  test('ready labour, equipment, preparation and control ASTs are preserved',()=>{
    for(const key of ['paint_labor','paint_equipment','substrate_preparation','quality_tests','documentation_records']){
      const formula=definition.formulas.find(f=>f.formula_id==='wall_paint_ready_'+key+'_v1')!;
      expect(formula.ast).toEqual(compileFormulaGraph(ready[key]!.formula.expression).ast);
    }
  });
  test('CT54 rate is for both coats, with packaging and inventory applied once',async()=>{
    const result=await compile({area_m2:10,ct54_container_l:'3.5',material_wall_paint_ct54_stock:3});
    expect(trace(result.rows.find(r=>r.row_id==='material:wall-paint:ct54')!).purchaseBalance).toMatchObject({consumed:'3',effectiveOrder:'0',remaining:'0'});
    expect(result.rows.find(r=>r.row_id==='scope:wall-paint:ct54-net')?.quantity).toBe('3');
    await expect(compile({area_m2:10,ct54_coat_count:1})).rejects.toThrow();
    await expect(compile({area_m2:10,ct54_total_rate_l_m2:0.6})).rejects.toThrow();
  });
  test('compatible CT17 repair/painting combine before rounding, with two nonpayable allocations',async()=>{
    const result=await compile({area_m2:10,...repair,wall_paint_ct17_stock:0.4,wall_paint_ct17_reserve:0.5});
    const owners=primer(result.rows);expect(owners).toHaveLength(1);
    const owner=owners[0]!;expect(trace(owner).purchaseBalance).toMatchObject({consumed:'2.4',stock:'0.4',reserve:'0.5',effectiveOrder:'5',remaining:'3',freeBeyondReserve:'2.5'});
    const allocations=result.rows.filter(r=>r.row_id.startsWith('allocation:'+owner.row_id+':'));
    expect(allocations.map(r=>r.quantity)).toEqual(['2','0.4']);
    expect(allocations.every(r=>!r.included_in_estimate&&!r.included_in_procurement)).toBe(true);
    const saved=selectCanonicalArtifactRows(result.rows);
    const projection=buildCanonicalProcurementProjection({revision:{id:'TEST',release_id:'TEST',catalog_id:'TEST',checksum_sha256:'a'.repeat(64),row_count:result.rows.length},procurementRows:saved.procurementRows,sourceRows:result.rows});
    expect(projection.rows.find(r=>r.rowId===owner.row_id)?.consumptionAllocations).toEqual(expect.arrayContaining([
      expect.objectContaining({consumed:'2',separatelyPayable:false}),expect.objectContaining({consumed:'0.4',separatelyPayable:false})]));
    const stocked=await compile({area_m2:10,...repair,wall_paint_ct17_stock:2.4});expect(primer(stocked.rows)[0]?.quantity).toBe('0');
  });
  test('actual diluted product dose is required and water is 1:1 without inventing a half dose',async()=>{
    const pending=await compile({area_m2:10,paint_priming_mode:'CT17_DILUTED_1_TO_1'});
    expect(pending.preliminaryNeeds.some(r=>r.missing_parameter_ids.includes('ct17_diluted_product_rate_l_m2_pass'))).toBe(true);
    const result=await compile({area_m2:10,paint_priming_mode:'CT17_DILUTED_1_TO_1',ct17_diluted_product_rate_l_m2_pass:0.1,ct17_paint_pass_count:2});
    expect(trace(primer(result.rows)[0]!).purchaseBalance.consumed).toBe('2');
    expect(trace(water(result.rows)[0]!).purchaseBalance.consumed).toBe('3');
  });
  test('all shared water uses add net quantities before stock/reserve/order and export stage allocations',async()=>{
    const result=await compile({area_m2:10,...repair,ct29_pack_kg:'5',paint_priming_mode:'CT17_DILUTED_1_TO_1',ct17_diluted_product_rate_l_m2_pass:0.1,
      ct54_first_coat_water_ratio:'0.1',ct54_first_coat_paint_l:2,wall_paint_water_stock:1,wall_paint_water_reserve:0.5});
    const owner=water(result.rows)[0]!;expect(water(result.rows)).toHaveLength(1);
    expect(trace(owner).purchaseBalance).toMatchObject({consumed:'7.6',effectiveOrder:'10',remaining:'3.4',freeBeyondReserve:'2.9'});
    const allocations=result.rows.filter(r=>r.row_id.startsWith('allocation:'+owner.row_id+':'));
    expect(allocations.map(r=>r.quantity)).toEqual(['1','0.2','5.4','1']);
    expect(allocations.every(r=>!r.included_in_estimate&&!r.included_in_procurement)).toBe(true);
    const stocked=await compile({area_m2:10,...repair,ct29_pack_kg:'5',paint_priming_mode:'CT17_DILUTED_1_TO_1',ct17_diluted_product_rate_l_m2_pass:0.1,
      ct54_first_coat_water_ratio:'0.1',ct54_first_coat_paint_l:2,wall_paint_water_stock:7.6});
    expect(water(stocked.rows)[0]?.quantity).toBe('0');
    const previousUnderestimate=await compile({area_m2:10,...repair,ct29_pack_kg:'5',paint_priming_mode:'CT17_DILUTED_1_TO_1',ct17_diluted_product_rate_l_m2_pass:0.1,
      ct54_first_coat_water_ratio:'0.1',ct54_first_coat_paint_l:2,wall_paint_water_stock:6.928});
    expect(water(previousUnderestimate.rows)[0]?.quantity).toBe('5');
  });
  test.each(['NOT_REQUIRED','CT17_UNDILUTED','CT17_DILUTED_1_TO_1'].flatMap(mode=>['NONE','5','25'].flatMap(pack=>[false,true].map(first=>({mode,pack,first})))))
    ('one water purchase owner for primer=$mode repair=$pack first-coat dilution=$first',async({mode,pack,first})=>{
      const result=await compile({area_m2:10,paint_priming_mode:mode,ct17_diluted_product_rate_l_m2_pass:0.1,
        ...(pack==='NONE'?{}:{...repair,ct29_pack_kg:pack}),ct54_first_coat_water_ratio:first?'0.1':'0',...(first?{ct54_first_coat_paint_l:2}:{})});
      const owners=water(result.rows);expect(owners).toHaveLength(1);
      const owner=owners[0]!;const consumption=1+(mode==='CT17_DILUTED_1_TO_1'?1:0)+(first?0.2:0)+(pack==='NONE'?0:(pack==='5'?2*1.2:6)+3);
      expect(Number(trace(owner).purchaseBalance.consumed)).toBeCloseTo(consumption,9);
      const allocations=result.rows.filter(r=>r.row_id.startsWith('allocation:'+owner.row_id+':'));
      expect(allocations.reduce((sum,r)=>sum+Number(r.quantity),0)).toBeCloseTo(consumption,9);
      expect(allocations.every(r=>!r.included_in_estimate&&!r.included_in_procurement)).toBe(true);
      expect(primer(result.rows)).toHaveLength(mode==='NOT_REQUIRED'&&pack==='NONE'?0:1);
    });
  test('only actual first-coat quantity supplies dilution water and cannot exceed total two-coat consumption',async()=>{
    const pending=await compile({area_m2:10,ct54_first_coat_water_ratio:'0.1'});
    expect(pending.preliminaryNeeds.some(r=>r.missing_parameter_ids.includes('ct54_first_coat_paint_l'))).toBe(true);
    await expect(compile({area_m2:10,ct54_first_coat_water_ratio:'0.1',ct54_first_coat_paint_l:4})).rejects.toThrow();
    await expect(compile({area_m2:10,ct54_first_coat_water_ratio:'0.1',ct54_first_coat_paint_l:3})).rejects.toThrow();
    await expect(compile({area_m2:10,ct54_first_coat_water_ratio:'0.1',ct54_first_coat_paint_l:0})).rejects.toThrow();
  });
  test('no new priming removes its product, water and labour, retaining conditional repair priming',async()=>{
    const result=await compile({area_m2:10,paint_priming_mode:'ALREADY_PRIMED'});
    expect(primer(result.rows)).toHaveLength(0);
    expect([...result.rows,...result.preliminaryNeeds].some(r=>r.row_id==='labor:wall-paint:primer-before-paint')).toBe(false);
    expect(trace(water(result.rows)[0]!).purchaseBalance.consumed).toBe('1');
    const repaired=await compile({area_m2:10,paint_priming_mode:'NOT_REQUIRED',...repair});
    expect(trace(primer(repaired.rows)[0]!).purchaseBalance.consumed).toBe('0.4');
  });
  test('CT29 uses surveyed area/depth and the actual selected bag mixing profile',async()=>{
    const pending=await compile({area_m2:10,mineral_repair_mode:'CT29_REQUIRED'});
    expect(pending.preliminaryNeeds.find(r=>r.row_id==='scope:wall-paint:repair-net')?.missing_parameter_ids).toEqual(expect.arrayContaining(['repair_area_m2','repair_average_depth_mm','repair_preparation_reference','repair_drying_compatibility_reference']));
    const result=await compile({area_m2:10,...repair,ct29_pack_kg:'5'});
    expect(result.rows.find(r=>r.row_id==='material:wall-paint:ct29')?.quantity).toBe('10');
    expect(result.rows.find(r=>r.row_id==='scope:wall-paint:repair-net')?.quantity).toBe('7.2');
    expect(result.rows.find(r=>r.row_id==='scope:wall-paint:ct29-full-mixes')?.quantity).toBe('10');
    expect(result.rows.find(r=>r.row_id==='scope:wall-paint:ct29-wet-surplus')?.quantity).toBe('2.8');
    expect(result.rows.find(r=>r.row_id==='scope:wall-paint:ct29-wet-surplus')?.title_ru).toContain('сухой эквивалент');
    await expect(compile({area_m2:10,...repair,repair_area_m2:11})).rejects.toThrow();
    const moistened=await compile({area_m2:10,...repair,paint_priming_mode:'NOT_REQUIRED',repair_preparation_mode:'MOISTEN_ONLY'});
    expect(primer(moistened.rows)).toHaveLength(0);
  });
  test('CT29 water depends on full mixes, not ordered stock or dry reserve, and wet surplus cannot become dry stock',async()=>{
    const stocked=await compile({area_m2:10,...repair,ct29_pack_kg:'5',ct29_stock_full_bags:3,ct29_reserve_full_bags:1});
    expect(trace(stocked.rows.find(r=>r.row_id==='material:wall-paint:ct29')!).purchaseBalance).toMatchObject({consumed:'10',stock:'15',reserve:'5',effectiveOrder:'0',remaining:'5'});
    expect(trace(water(stocked.rows)[0]!).purchaseBalance.consumed).toBe('6.4');
    const extra=await compile({area_m2:10,...repair,ct29_pack_kg:'5',ct29_additional_full_batches:1});
    expect(extra.rows.find(r=>r.row_id==='material:wall-paint:ct29')?.quantity).toBe('15');
    expect(extra.rows.find(r=>r.row_id==='scope:wall-paint:ct29-wet-surplus')?.quantity).toBe('7.8');
    expect(trace(water(extra.rows)[0]!).purchaseBalance.consumed).toBe('7.6');
  });
  test('manual equipment and paid spray are exclusive and operators stay in a single labour row',async()=>{
    const pending=await compile({area_m2:50,paint_application_mode:'PAID_SPRAY_EQUIPMENT'});
    expect(pending.preliminaryNeeds.find(r=>r.row_id==='wall-paint:ready:paint_equipment')?.missing_parameter_ids).toEqual(expect.arrayContaining(['paint_equipment_productivity_m2_per_machine_hour','spray_payment_scope_reference']));
    const result=await compile({area_m2:50,paint_application_mode:'PAID_SPRAY_EQUIPMENT',paint_productivity_m2_per_man_hour:5,
      paint_equipment_productivity_m2_per_machine_hour:25,spray_payment_scope_reference:'EXPLICIT_TEST_APPARATUS_WITHOUT_OPERATOR'});
    expect(result.rows.find(r=>r.row_id==='wall-paint:ready:paint_labor')?.quantity).toBe('10');
    expect(result.rows.find(r=>r.row_id==='wall-paint:ready:paint_equipment')?.quantity).toBe('2');
    expect(result.rows.some(r=>r.row_id==='material:wall-paint:tool:paint-roller'||r.row_id==='material:wall-paint:tool:telescopic-pole')).toBe(false);
    expect(result.rows.filter(r=>r.category==='equipment')).toHaveLength(1);
  });
  test('delivery and actual system confirmations require scope facts without manufacturing site readiness',async()=>{
    const pending=await compile({area_m2:50,separate_delivery_trip_count:1,applicability_mode:'CONFIRMED_PROJECT_FACTS'});
    expect(pending.preliminaryNeeds.find(r=>r.row_id==='delivery:wall-paint:system')?.missing_parameter_ids).toContain('delivery_payment_scope_reference');
    expect(pending.preliminaryNeeds.find(r=>r.row_id==='material:wall-paint:ct54')?.missing_parameter_ids).toContain('mineral_compatible_substrate_confirmed');
    const included=await compile({area_m2:50,separate_delivery_trip_count:0});
    expect([...included.rows,...included.preliminaryNeeds].some(r=>r.row_id==='delivery:wall-paint:system')).toBe(false);
    await expect(compile({area_m2:50,mineral_compatible_substrate_confirmed:'NO'})).rejects.toThrow();
    await expect(compile({area_m2:50,substrate_product_profile:'ACRYLIC_POLYMER'})).rejects.toThrow();
  });
});

import {canonicalEstimateOperationReferences as referenceOperationRefs} from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {buildWallPaintReferenceProjectSystemS2735,CT54_REFERENCE_INDEPENDENT_COMPOSITION_S2735} from '../../src/lib/estimate/v4/wallPaintConstructorS2735';
import {auditCanonicalEstimateOperationResourcesV1} from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
describe('explicit CT54 PROJECT_SYSTEM reference composition, not full norms',()=>{
  const input=()=>({requireIndependentComposition:true,independentComposition:CT54_REFERENCE_INDEPENDENT_COMPOSITION_S2735,
    resources:buildWallPaintReferenceProjectSystemS2735().resources.map(row=>({rowId:row.row_id,
      nameRu:String((row.resource_graph.publicResourcePresentationV1 as {nameRu:string}).nameRu),
      resourceKind:String((row.resource_graph.publicResourcePresentationV1 as {resourceKind:string}).resourceKind),
      operation:row.resource_graph.operationCompositionV1,publicNameVerified:true,quantityKnown:false}))});
  test('independent full roster permits quantity-only preliminary output and preserves one shared resource ID',()=>{
    const source=input(),result=auditCanonicalEstimateOperationResourcesV1(source);
    expect(result.issues.map(issue=>issue.code)).toEqual(['RESOURCE_QUANTITY_UNRESOLVED']);
    expect(result.pdfAllowed).toBe(true);expect(result.definitionAdmissionAllowed).toBe(true);expect(result.completeClaimAllowed).toBe(false);
    const cloth=source.resources.find(row=>row.rowId==='reference:wall-paint:ct54:work-clothing')!;
    expect(referenceOperationRefs(cloth.operation)).toHaveLength(7);
    expect(source.resources.filter(row=>row.rowId===cloth.rowId)).toHaveLength(1);
    expect(CT54_REFERENCE_INDEPENDENT_COMPOSITION_S2735.operationRequirements).toHaveLength(7);
  });
  test('omitted wash water and a resource masquerading as an operation cannot satisfy the reviewed method',()=>{
    const source=input(),water='reference:wall-paint:ct54:water';
    const missing=auditCanonicalEstimateOperationResourcesV1({...source,resources:source.resources.filter(row=>row.rowId!==water)});
    expect(missing.pdfAllowed).toBe(false);expect(missing.definitionAdmissionAllowed).toBe(false);
    const fake={...source,resources:source.resources.map((row,index)=>index===0?{...row,operation:{...referenceOperationRefs(row.operation)[0],operationId:'paint-can'}}:row)};
    expect(auditCanonicalEstimateOperationResourcesV1(fake).pdfAllowed).toBe(false);
  });
});
