import {compileAutomaticConstructionOwnerR1} from './automaticConstructionOwnerR1';
import {repairS2763ConcreteCuringConsumerFacts} from '../../../../scripts/estimate/r4a13/s2763ConcreteCuringAntisolOverlay';
import {canonicalApprovedBaselineRuntimeParameters} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {concreteCuringAntisolDefinitionS2763,concreteCuringAntisolPackS2763 as pack,concreteCuringAntisolOwnerS2763 as owner,concreteCuringAntisolPrefixS2763 as prefix,concreteCuringAntisolReadyChoicesS2763 as ready,concreteCuringAntisolInterfaceS2763 as interfaceCase} from './concreteCuringAntisolMaterialS2763';
const facts={exposed_curing_surface_area_m2:'49',approved_external_curing_method:'MEMBRANE_CURING_COMPOUND',antisol_material_choice:pack.selectedProductRu,antisol_surface_ready:ready[0],antisol_minimum_temperature_12h_c:'20',antisol_subsequent_surface_use:interfaceCase};
const compile=(submittedParameters:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:'control:concrete-curing',compilerVersion:pack.contract,primaryMeasureParameterId:'exposed_curing_surface_area_m2',definition:concreteCuringAntisolDefinitionS2763(),submittedParameters});
const value=(result:Awaited<ReturnType<typeof compile>>,id:string)=>result.rows.find(r=>r.row_id===(id==='order'?owner:prefix+':'+id))?.quantity;
describe('source-owned Antisol nominal consumption and existing effective supply balance',()=>{
 test('a versioned repair removes project fixtures from runtime without losing their evidence or source authority',()=>{
   const target=pack.targets.find(t=>!t.areaParameterId.startsWith('external_curing_'))!;
   const ids=['cured_concrete_volume_m3','exposed_curing_surface_area_m2','concrete_mix_reference','curing_location','approved_external_curing_method','curing_method_statement_reference','curing_duration_day'];
   const parameters=ids.map(id=>({parameter_id:id,default_value:null,unit_id:null,value_type:'text',constraints_json:{},truth_metadata:{visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',guide:{guide_validation_policy:'PROJECT_AUTHORITY'},provenance:{original_owner:'project'}}}));
   const parent={definition:{catalog_id:target.catalogId},resources:[{row_id:owner}],parameters,baseline:{input_values:Object.fromEntries(ids.map(id=>[id,'CONTROL_ONLY'])),input_classification:Object.fromEntries(ids.map(id=>[id,'NORMATIVE']))}} as never;
   const before=structuredClone(parent) as any;
   const result=repairS2763ConcreteCuringConsumerFacts(parent);
   expect(result.changedFixtureIds).toEqual(ids);
   expect(result.representative.baseline.input_values).toEqual(before.baseline.input_values);
   expect(canonicalApprovedBaselineRuntimeParameters(result.representative.baseline)).toEqual({});
   expect(parent).toEqual(before);
   for(const p of result.representative.parameters){const original=before.parameters.find((v:any)=>v.parameter_id===p.parameter_id);
     const {contract:successorContract,...authority}=p.truth_metadata;
     expect(successorContract).toBe(`${pack.contract}.consumer-facts-r2`);
     expect({...authority,provenance:original.truth_metadata.provenance}).toEqual(original.truth_metadata);
     expect(p.constraints_json).toEqual(original.constraints_json);expect(p.default_value).toBeNull();}
   const unsafe=structuredClone(before);unsafe.parameters[0].default_value='UNSAFE_SITE_DEFAULT';
   expect(()=>repairS2763ConcreteCuringConsumerFacts(unsafe)).toThrow('DEFAULT_OR_OWNERSHIP_DRIFT');
 });
 test('unknown inventory preserves nominal demand without an invented order',async()=>{const r=await compile(facts);expect(value(r,'consumed')).toBe('10');expect(value(r,'order')).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.row_id===owner&&n.missing_parameter_ids.includes('antisol_usable_stock_l'))).toBe(true);});
 test('explicit zero inventory/reserve produces one19L canister, not10L paid consumption',async()=>{const r=await compile({...facts,antisol_usable_stock_l:'0',antisol_retained_reserve_l:'0'});expect(value(r,'consumed')).toBe('10');expect(value(r,'order')).toBe('19');expect(value(r,'packages')).toBe('1');expect(value(r,'remaining')).toBe('9');expect(r.rows.filter(x=>x.included_in_estimate)).toHaveLength(1);});
 test('93.1m2 uses exactly one nominal package without double rounding',async()=>{const r=await compile({...facts,exposed_curing_surface_area_m2:'93.1',antisol_usable_stock_l:'0',antisol_retained_reserve_l:'0'});expect(value(r,'consumed')).toBe('19');expect(value(r,'order')).toBe('19');expect(value(r,'remaining')).toBe('0');});
 test('98m2 with usable5L stock and2L reserve orders19L with4L remaining/2L free',async()=>{const r=await compile({...facts,exposed_curing_surface_area_m2:'98',antisol_usable_stock_l:'5',antisol_retained_reserve_l:'2'});expect(value(r,'consumed')).toBe('20');expect(value(r,'order')).toBe('19');expect(value(r,'remaining')).toBe('4');expect(value(r,'free')).toBe('2');});
 test('stock can cover demand and reserve without removing source consumption',async()=>{const r=await compile({...facts,exposed_curing_surface_area_m2:'98',antisol_usable_stock_l:'30',antisol_retained_reserve_l:'2'});expect(value(r,'consumed')).toBe('20');expect(value(r,'order')).toBe('0');expect(value(r,'remaining')).toBe('10');});
 test('missing measured surface is not inferred from concrete volume',async()=>{const{exposed_curing_surface_area_m2:_a,...rest}=facts;const r=await compile(rest);expect(value(r,'consumed')).toBeUndefined();await expect(compile({...rest,concrete_volume_m3:'5'})).rejects.toThrow('unknown estimate parameters');});
 test('7C and colder cannot pass manufacturer conditions',async()=>{await expect(compile({...facts,antisol_minimum_temperature_12h_c:'7'})).rejects.toThrow();await expect(compile({...facts,antisol_minimum_temperature_12h_c:'6'})).rejects.toThrow();});
 test('unknown ready surface/interface cannot certify applicability',async()=>{for(const key of['antisol_surface_ready','antisol_subsequent_surface_use']){const input={...facts}as Record<string,unknown>;delete input[key];const r=await compile(input);expect(value(r,'consumed')).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(key))).toBe(true);}});
 test('water and other-product paths never add a payable Antisol owner',async()=>{for(const input of[{...facts,approved_external_curing_method:'WATER_CURING'},{...facts,antisol_material_choice:pack.legacyProductRu}]){const r=await compile(input);expect(r.rows).toHaveLength(0);expect(r.preliminaryNeeds).toHaveLength(0);}});
 test('55 exact consumers, no fixed defaults, density, loss, time or norm question',()=>{const d=concreteCuringAntisolDefinitionS2763();expect(pack.targets).toHaveLength(55);expect(new Set(pack.targets.map(t=>t.catalogId)).size).toBe(55);expect(d.parameters.every(p=>p.default_value==null)).toBe(true);expect(d.runtimeInput).toEqual({});expect(d.parameters.some(p=>/coverage|consumption_rate|density|package_l/.test(p.parameter_id))).toBe(false);expect(d.parameters.find(p=>p.parameter_id==='antisol_usable_stock_l')?.truth_metadata.guide).toEqual(expect.objectContaining({guide_short_ru:expect.stringContaining('замороженный')}));});
});
