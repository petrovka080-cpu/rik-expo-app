import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compilePvcBitumenTransitionReinforcedGuide2024S2737 as compile,
  PVC_BITUMEN_TRANSITION_DEFINITION_S2737 as definition, PVC_BITUMEN_TRANSITION_SOURCE_PACK_SHA256_S2737 as packHash,
} from '../../src/lib/estimate/v4/pvcBitumenTransitionReinforcedGuide2024S2737';
import {PVC_TRANSITION_GUIDE2024_CONTROL_INPUT as fixture} from '../../scripts/estimate/r4a13/pvcBitumenTransitionGuide2024ControlInput';
import {canonicalEstimateWorkProcess} from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {buildMasterParameterCalculationConsumers} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {pvcBitumenTransitionGuide2024S2737PublishConfig} from '../../scripts/estimate/r4a13/prepareS2737PvcBitumenTransitionGuide2024Successor';
const balance=(row:Record<string,unknown>|undefined)=>(row?.calculation_trace as {purchaseBalance?:Record<string,unknown>}|undefined)?.purchaseBalance;
const row=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(x=>x.row_id===id);
describe('reinforced Tape PVC-B single continuous transition, pinned February 2024 guide',()=>{
  test('publisher accepts its exact visible runtime profile while project fixtures remain separate',()=>{
    const config=pvcBitumenTransitionGuide2024S2737PublishConfig({releaseId:'d75f339e-b75f-52a3-86a9-f011af08e026',searchReleaseId:'509e7550-285e-5b7c-bfc3-97af05d6de02'});
    for(const [id,value] of Object.entries(config.runtimeProfileInput??{}))expect(config.acceptanceInput[id]).toEqual(value);
    expect(config.runtimeProfileInput).toEqual(definition.runtimeInput);
    expect(config.runtimeProfileInput).not.toHaveProperty('reinforced_guide2024_profile_confirmed');
    expect(config.runtimeProfileInput).not.toHaveProperty('transition_worker_man_h');
    expect(config.passport.excludedScopeRu).toEqual(expect.arrayContaining([expect.stringContaining('Нагрев на объекте')]));
  });
  test('source is sealed; the nonreinforced KZ profile, roll sizes and fixtures never become defaults',()=>{
    const bytes=readFileSync('data/estimate-benchmarks/source-packs/pvc-bitumen-transition-reinforced-guide2024-s27-37.json');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(packHash);
    const pack=JSON.parse(bytes.toString('utf8'));
    expect(pack.primaryDocument.version).toBe('02.2024');
    expect(pack.adhesive).toMatchObject({lowerRateKgM2:1,upperRateKgM2:1,densityConversionAllowed:false});
    expect(pack.distinctProfileNotImported).toMatchObject({compatibilityConfirmed:false,runtimeDefault:false});
    for(const id of ['tape_roll_length_m','lower_adhesive_area_m2','upper_adhesive_area_m2','transition_worker_man_h'])expect(definition.runtimeInput).not.toHaveProperty(id);
    expect(Object.keys(definition.runtimeInput).some(id=>id.endsWith('_confirmed'))).toBe(false);
    const {resourceConsumers}=buildMasterParameterCalculationConsumers({parameters:definition.parameters,formulas:definition.formulas,resources:definition.resources});
    expect(definition.parameters.filter(p=>!resourceConsumers[p.parameter_id]?.length)).toEqual([]);
  });
  test('short input retains material and process needs without inventing source confirmation, package or zero quantities',async()=>{
    const r=await compile({transition_length_m:10});
    expect(r.rows.map(x=>x.row_id)).toEqual(['transition:scope:length']);
    const tape=r.preliminaryNeeds.find(x=>x.row_id==='transition:material:tape');
    expect(tape?.quantity).toBeNull();
    expect(tape?.missing_parameter_ids).toEqual(expect.arrayContaining(['tape_roll_length_m','tape_width_mm','reinforced_guide2024_profile_confirmed']));
    expect(r.preliminaryNeeds.some(x=>x.row_id==='transition:scope:drying'&&x.missing_parameter_ids.includes('adhesive_drying_instruction'))).toBe(true);
  });
  test('two separately measured zones share one purchase and retain unrounded consumptions',async()=>{
    const r=await compile({...fixture,adhesive22_stock:1,adhesive22_reserve:1});
    expect(r.preliminaryNeeds).toEqual([]);
    expect(balance(row(r,'transition:material:adhesive22'))).toMatchObject({consumed:'4.1',stock:'1',reserve:'1',effectiveOrder:'5',remaining:'1.9',freeBeyondReserve:'0.9'});
    expect(row(r,'transition:allocation:adhesive22:lower')).toMatchObject({quantity:'2.4',included_in_estimate:false,included_in_procurement:false});
    expect(row(r,'transition:allocation:adhesive22:upper')).toMatchObject({quantity:'1.7',included_in_estimate:false,included_in_procurement:false});
    expect(r.rows.filter(x=>x.row_id.startsWith('transition:material:adhesive'))).toHaveLength(1);
    expect(r.rows.filter(x=>x.included_in_procurement)).toHaveLength(6);
    expect(r.rows.filter(x=>x.category==='labor'&&x.included_in_estimate)).toHaveLength(1);
  });
  test('missing upper area remains a need and cannot silently produce a lower-only adhesive order',async()=>{
    const {upper_adhesive_area_m2:_,...input}=fixture;
    const r=await compile(input);
    expect(row(r,'transition:material:adhesive22')).toBeUndefined();
    expect(r.preliminaryNeeds.find(x=>x.row_id==='transition:material:adhesive22')).toMatchObject({quantity:null,missing_parameter_ids:expect.arrayContaining(['upper_adhesive_area_m2'])});
  });
  test('actual roll length and whole-roll stock preserve continuous-strip bounds and reserve',async()=>{
    const r=await compile({...fixture,tape_stock_full_rolls:1,tape_reserve_m:10});
    expect(balance(row(r,'transition:material:tape'))).toMatchObject({consumed:'10.5',stock:'19',reserve:'10',effectiveOrder:'19',remaining:'27.5',freeBeyondReserve:'17.5'});
    await expect(compile({...fixture,tape_required_length_m:20})).rejects.toThrow();
    await expect(compile({...fixture,tape_required_length_m:9})).rejects.toThrow();
    await expect(compile({...fixture,tape_stock_full_rolls:0.5})).rejects.toThrow();
    await expect(compile({...fixture,reinforced_guide2024_profile_confirmed:'Неармированная KZ 08.2026'})).rejects.toThrow();
  });
  test('switching to a permanent adhesive never transfers the temporary product inventory',async()=>{
    const r=await compile({...fixture,adhesive22_stock:20,adhesive_profile:'Постоянный узел — горячий битум БН 90-10',hot_bitumen_quantum:5,
      hot_bitumen_supply_specification:'Контрольная поставка горячего битума, не норма тары',
      hot_delivery_confirmation:'Поставка при температуре применения; оборудование и энергия обеспечения температуры включены в цену материала',
      hot_delivery_plan:'Контрольный договор: поставка и температурное обеспечение включены в цену битума'});
    expect(row(r,'transition:material:adhesive22')).toBeUndefined();
    expect(balance(row(r,'transition:material:hot_bitumen'))).toMatchObject({consumed:'4.1',stock:'0',effectiveOrder:'5'});
    expect(row(r,'transition:scope:hot_bitumen:hot-delivery')).toMatchObject({included_in_estimate:false,included_in_procurement:false});
    expect(definition.resources.find(x=>x.row_id==='transition:scope:hot_bitumen:hot-delivery')?.resource_graph.includedInResourceOwnerRowId).toBe('transition:material:hot_bitumen');
  });
  test('permanent hot material cannot become procurement without the thermal plan and cost owner',async()=>{
    const r=await compile({...fixture,adhesive_profile:'Постоянный узел — горячая мастика',hot_mastic_quantum:5,hot_mastic_supply_specification:'Контрольный продукт'});
    expect(row(r,'transition:material:hot_mastic')).toBeUndefined();
    expect(r.preliminaryNeeds.find(x=>x.row_id==='transition:material:hot_mastic')?.missing_parameter_ids).toEqual(expect.arrayContaining(['hot_delivery_confirmation','hot_delivery_plan']));
  });
  test('project fasteners stay whole and alternatives are not added',async()=>{
    const r=await compile(fixture);
    expect(row(r,'transition:material:plate_holder')?.quantity).toBe('50');
    expect(row(r,'transition:material:screw')?.quantity).toBe('60');
    expect(row(r,'transition:material:telescopic_holder')).toBeUndefined();
    expect(balance(row(r,'transition:material:plate_holder'))?.consumed).toBe('43');
    await expect(compile({...fixture,fixing_count_piece:43.5})).rejects.toThrow();
  });
  test('unknown exposure is not zero, while an explicitly measured zero excludes UV supplies',async()=>{
    const {exposed_adhesive_area_m2:_,...input}=fixture;
    const unknown=await compile(input);
    expect(unknown.preliminaryNeeds.some(x=>x.missing_parameter_ids.includes('exposed_adhesive_area_m2'))).toBe(true);
    const zero=await compile({...fixture,exposed_adhesive_area_m2:0});
    expect(zero.rows.some(x=>x.row_id==='transition:material:uv_grit'||x.row_id==='transition:material:uv_band')).toBe(false);
    await expect(compile({...fixture,uv_method:'Бандажная полоса',exposed_adhesive_area_m2:1,uv_band_required_m2:0.1,
      uv_band_quantum:0.1,uv_band_specification:'Контрольный бандаж'})).rejects.toThrow();
    const adequate=await compile({...fixture,uv_method:'Бандажная полоса',exposed_adhesive_area_m2:1,uv_band_required_m2:1.2,
      uv_band_quantum:1,uv_band_specification:'Контрольный бандаж с запасом раскроя'});
    expect(row(adequate,'transition:material:uv_band')?.quantity).toBe('2');
    expect(row(adequate,'transition:material:uv_grit')).toBeUndefined();
  });
  test('selected liquid PVC reuses the litre operation, with no implicit kilogram conversion',async()=>{
    const r=await compile({...fixture,liquid_pvc_selection:'Выбрано по проекту',liquid_pvc_designation:'Контрольный совместимый продукт в литрах',liquid_pvc_volume_l:0.6,liquid_pvc_quantum:0.5});
    expect(row(r,'transition:material:liquid_pvc')).toMatchObject({unit_id:'l',quantity:'1'});
    await expect(compile({...fixture,liquid_pvc_selection:'Выбрано по проекту',liquid_pvc_required_kg:0.6})).rejects.toThrow('unknown estimate parameters');
    const missing=await compile({...fixture,liquid_pvc_selection:'Выбрано по проекту',liquid_pvc_designation:'Контрольная поставка',liquid_pvc_quantum:0.5});
    expect(missing.preliminaryNeeds.find(x=>x.row_id==='transition:material:liquid_pvc')?.missing_parameter_ids).toContain('liquid_pvc_volume_l');
  });
  test('process, common adhesive and equipment inclusion cannot create a second complex labor charge',async()=>{
    const r=await compile(fixture);
    const process=canonicalEstimateWorkProcess(r.rows.map(x=>({rowId:x.row_id,titleRu:typeof x.title_ru==='string'?x.title_ru:undefined,
      operation:(x.calculation_trace as {resourceGraph?:{operationCompositionV1?:unknown}})?.resourceGraph?.operationCompositionV1})));
    expect(Boolean(process[0]?.sequenceUnspecified)).toBe(false);
    expect(process[0]?.operations).toHaveLength(10);
    expect(process[0]?.operations.flatMap(x=>x.sharedResources??[]).find(x=>x.rowId==='transition:material:adhesive22')).toBeDefined();
    expect(process[0]?.operations.flatMap(x=>x.resourceIds)).not.toContain('transition:labor:worker');
    expect(row(r,'transition:machine:welder_included')).toMatchObject({included_in_estimate:false,included_in_procurement:false});
    const rental=await compile({...fixture,welder_cost_mode:'Отдельная аренда по плану'});
    expect(row(rental,'transition:machine:welder_included')).toBeUndefined();
    expect(row(rental,'transition:machine:welder_rental')).toMatchObject({included_in_estimate:true,quantity:'0.25'});
  });
});
