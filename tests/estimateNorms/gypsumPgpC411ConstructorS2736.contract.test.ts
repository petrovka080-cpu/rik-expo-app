import {compileGypsumPgpC411S2736 as compile, PGP_C411_DEFINITION_S2736 as definition, PGP_C411_SOURCE_METADATA_S2736 as source} from '../../src/lib/estimate/v4/gypsumPgpC411ConstructorS2736';
import {buildMasterParameterCalculationConsumers} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {buildCanonicalProcurementProjection, selectCanonicalArtifactRows} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonicalEstimateWorkProcess} from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
const balance=(row:Record<string,unknown>)=>(row.calculation_trace as Record<string,any>).purchaseBalance;

describe('standard100mm PGP C411, current product profile and common purchase owner',()=>{
  test('included works disclose their resources while the complete labor remains payable once',async()=>{
    const r=await compile({area_m2:30});
    const process=canonicalEstimateWorkProcess(r.rows.map(row=>({rowId:row.row_id,
      operation:(row.calculation_trace as {resourceGraph?:{operationCompositionV1?:unknown}})?.resourceGraph?.operationCompositionV1})));
    expect(process).toHaveLength(1);
    expect(process[0]?.operations.map(step=>step.operationId)).toEqual(['prepare','mount','junction']);
    expect(process[0]?.sequenceUnspecified).toBe(true);
    expect(process[0]?.operations.flatMap(step=>step.resourceIds)).not.toContain('work:pgp:worker');
    expect(r.rows.find(row=>row.row_id==='work:pgp:worker')).toMatchObject({quantity:'33.213',included_in_estimate:true});
    expect(r.rows.filter(row=>row.category==='labor'&&row.included_in_estimate)).toHaveLength(1);
  });
  test('source identity and every input consumer are retained, confirmations are not defaults',()=>{
    const {resourceConsumers}=buildMasterParameterCalculationConsumers({parameters:definition.parameters,formulas:definition.formulas,resources:definition.resources});
    expect(definition.parameters.filter(p=>!resourceConsumers[p.parameter_id]?.length)).toEqual([]);
    expect(Object.keys(definition.runtimeInput).some(id=>/_confirmed|productivity|_reference/.test(id))).toBe(false);
    expect(source.artifact_sha256).toBe(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/gypsum-pgp-c411-s27-36.json')).digest('hex'));
    expect(JSON.stringify(definition.formulas)).not.toMatch(/c111|bia|0\.25|1\.8\*area|price/);
  });
  test('short area30 produces current mounting resources and labor once, not two-face area',async()=>{
    const r=await compile({area_m2:30});
    expect(r.preliminaryNeeds).toEqual([]);expect(r.rows).toHaveLength(40);
    const q=(id:string)=>r.rows.find(x=>x.row_id===id)?.quantity;
    expect(q('scope:pgp:area')).toBe('30');expect(q('material:pgp:plate')).toBe('95');
    expect(q('material:pgp:fugen')).toBe('45');expect(q('work:pgp:worker')).toBe('33.213');
    expect(q('work:pgp:crane')).toBe('0.585');expect(q('work:pgp:truck')).toBe('0.297');
    expect(r.rows.filter(x=>x.included_in_procurement)).toHaveLength(7);
    expect(r.rows.filter(x=>x.category==='labor'&&x.included_in_estimate)).toHaveLength(1);
    expect(r.rows.find(x=>x.row_id==='allocation:pgp:machinist')).toMatchObject({quantity:'0.585',included_in_estimate:false,included_in_procurement:false});
    expect(r.rows.some(x=>/primer|tief|betogrund|lintel|reinforc|hydro/.test(x.row_id))).toBe(false);
  });
  test('whole pieces include explicit project losses; stock and reserve do not contain offcuts',async()=>{
    const r=await compile({area_m2:30,pgp_plate_stock:20,pgp_plate_reserve:3});
    expect(balance(r.rows.find(x=>x.row_id==='material:pgp:plate')!)).toMatchObject({consumed:'95',effectiveOrder:'78',remaining:'3',freeBeyondReserve:'0',quantum:'1'});
    const noLoss=await compile({area_m2:30,pgp_plate_loss_fraction:0});
    expect(noLoss.rows.find(x=>x.row_id==='material:pgp:plate')?.quantity).toBe('90');
    await expect(compile({area_m2:30,pgp_plate_stock:0.5})).rejects.toThrow();
    await expect(compile({area_m2:30,pgp_plate_loss_fraction:-0.1})).rejects.toThrow();
  });
  test('perimeter and whole fixings respond to height, and small panels keep project layout',async()=>{
    const r=await compile({area_m2:30});
    expect(Number(balance(r.rows.find(x=>x.row_id==='material:pgp:cork')!).consumed)).toBeCloseTo(27.318181818,8);
    expect(r.rows.find(x=>x.row_id==='material:pgp:cork')?.quantity).toBe('28');
    expect(r.rows.find(x=>x.row_id==='material:pgp:bracket')?.quantity).toBe('30');
    const low=await compile({area_m2:30,pgp_height_m:1});
    expect(low.rows.find(x=>x.row_id==='material:pgp:bracket')?.quantity).toBe('66');
    const small=await compile({area_m2:0.55});
    expect(small.rows.find(x=>x.row_id==='material:pgp:bracket')?.quantity).toBe('10');
    expect(small.rows.find(x=>x.row_id==='material:pgp:tn35')?.quantity).toBe('50');
    expect(small.rows.find(x=>x.row_id==='material:pgp:dowel')?.quantity).toBe('50');
    const fractionalLength=await compile({area_m2:11.275}); // 4.1m long: 5 floor + 5 ceiling + 4 each side.
    expect(fractionalLength.rows.find(x=>x.row_id==='material:pgp:bracket')?.quantity).toBe('18');
    expect(fractionalLength.rows.find(x=>x.row_id==='material:pgp:tn35')?.quantity).toBe('90');
    expect(fractionalLength.rows.find(x=>x.row_id==='material:pgp:dowel')?.quantity).toBe('90');
  });
  test('mounting and extra junction powder merge before bags; mix water ignores purchase reserve',async()=>{
    const r=await compile({area_m2:30,pgp_extra_junction_glue_kg:2,pgp_fugen_stock:10,pgp_fugen_reserve:5});
    expect(balance(r.rows.find(x=>x.row_id==='material:pgp:fugen')!)).toMatchObject({consumed:'47',effectiveOrder:'45',remaining:'8',freeBeyondReserve:'3'});
    expect(balance(r.rows.find(x=>x.row_id==='material:pgp:water')!)).toMatchObject({consumed:'33.55',effectiveOrder:'35',freeBeyondReserve:'1.45'});
    const saved=selectCanonicalArtifactRows(r.rows);
    const projection=buildCanonicalProcurementProjection({revision:{id:'TEST',release_id:'TEST',catalog_id:'TEST',checksum_sha256:'a'.repeat(64),row_count:r.rows.length},procurementRows:saved.procurementRows,sourceRows:r.rows});
    expect(projection.rows.find(x=>x.rowId==='material:pgp:fugen')?.consumptionAllocations).toEqual(expect.arrayContaining([expect.objectContaining({consumed:'45',separatelyPayable:false}),expect.objectContaining({consumed:'2',separatelyPayable:false})]));
    expect(projection.rows.find(x=>x.rowId==='material:pgp:water')?.consumptionAllocations).toEqual(expect.arrayContaining([expect.objectContaining({consumed:'30.55',separatelyPayable:false}),expect.objectContaining({consumed:'3',separatelyPayable:false})]));
  });
  test('tools and machinist are explicitly included, not purchased/priced again',async()=>{
    const r=await compile({area_m2:30});
    const tools=r.rows.filter(x=>x.row_id.startsWith('tool:'));
    expect(tools).toHaveLength(21);
    expect(tools.every(x=>x.quantity==='1'&&!x.included_in_estimate&&!x.included_in_procurement)).toBe(true);
    const roots=definition.resources.filter(x=>x.row_id.startsWith('tool:'));
    expect(roots.every(x=>x.resource_graph?.includedInResourceOwnerRowId==='work:pgp:worker')).toBe(true);
  });
  test('source trace separates present material from historical labor and old geometry',async()=>{
    const r=await compile({area_m2:30});
    expect(r.rows.find(x=>x.row_id==='material:pgp:fugen')?.normative_trace).toEqual(expect.arrayContaining([expect.objectContaining({source_url:expect.stringContaining('07-IL-KNAUF_Fugen'),exact_locator:expect.stringContaining('1.5kg/m2')})]));
    expect(r.rows.find(x=>x.row_id==='work:pgp:worker')?.normative_trace).toEqual(expect.arrayContaining([expect.objectContaining({source_url:expect.stringContaining('minstroy.gov.kg'),exact_locator:expect.stringContaining('08-04-001-09')})]));
    expect(r.rows.find(x=>x.row_id==='material:pgp:cork')?.normative_trace).toEqual(expect.arrayContaining([expect.objectContaining({source_url:expect.stringContaining('Tehnicheskiy_list')})]));
  });
  test('confirmed mode requires actual project facts, normative floor limit is not wall approval',async()=>{
    const r=await compile({area_m2:30,applicability_mode:'CONFIRMED_PROJECT_FACTS'});
    expect(r.preliminaryNeeds.some(x=>x.missing_parameter_ids.includes('pgp_junctions_and_glue_confirmed'))).toBe(true);
    expect(r.preliminaryNeeds.some(x=>x.missing_parameter_ids.includes('pgp_ready_substrate_and_krer_confirmed'))).toBe(true);
    const confirmed=await compile({area_m2:30,applicability_mode:'CONFIRMED_PROJECT_FACTS',pgp_geometry_and_system_confirmed:'YES',pgp_junctions_and_glue_confirmed:'YES',pgp_ready_substrate_and_krer_confirmed:'YES',pgp_delivery_and_cost_owners_confirmed:'YES'});
    expect(confirmed.preliminaryNeeds).toEqual([]);
    await expect(compile({area_m2:30,pgp_floor_height_m:4.01})).rejects.toThrow();
    await expect(compile({area_m2:30,pgp_height_m:3.61})).rejects.toThrow();
    await expect(compile({area_m2:30,pgp_height_m:3.6,pgp_floor_height_m:1})).rejects.toThrow();
    await expect(compile({area_m2:30,pgp_height_m:3.6,pgp_floor_height_m:1,applicability_mode:'CONFIRMED_PROJECT_FACTS',pgp_geometry_and_system_confirmed:'YES',pgp_junctions_and_glue_confirmed:'YES',pgp_ready_substrate_and_krer_confirmed:'YES',pgp_delivery_and_cost_owners_confirmed:'YES'})).rejects.toThrow();
    const fitting=await compile({area_m2:30,pgp_height_m:3.6,pgp_floor_height_m:4});
    expect(fitting.preliminaryNeeds).toEqual([]);
    await expect(compile({area_m2:30,pgp_fugen_water_l_kg:0.8})).rejects.toThrow();
    await expect(compile({area_m2:30,pgp_junctions_and_glue_confirmed:'NO'})).rejects.toThrow();
  });
});
