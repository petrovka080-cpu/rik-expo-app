import { PVC15_BASE, PVC15_MACHINE, PVC15_SYSTEM, PVC15_REQUIRED, PVC15_NOT_REQUIRED, PVC15_FULL_DEFINITION_S2743 as definition, PVC15_SERIES_MANIFEST_S2743 as manifest } from '../../src/lib/estimate/v4/pvcRoofMembraneFullCompositionS2743';
import { PVC_ROOF_MEMBRANE_INSTALLATION_CATALOG_ID as catalogId } from '../../src/lib/estimate/v4/pvcRoofMembraneInstallationR1';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../../src/lib/estimate/estimateDeterministicHash';
import { pvc15ControlInputS2743 } from '../fixtures/pvc15FullCompositionS2743';
import { G6_COMPLETION_REQUIRED_S2741, G6_WASTE_SERVICE_PRICE_SCOPE_S2741 } from '../../src/lib/estimate/v4/g6PvcProjectCompletionS2741';
import { G6_NEXT_MANUAL_LOADING, G6_NEXT_LIQUID_ENERGY_SCOPE } from '../../src/lib/estimate/v4/g6PvcCompletionServiceComponentsS2741';

function compile(submittedParameters: Record<string,unknown>, rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'] = {}) {
  return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides).length?'recalculate':'compile',compilerVersion:'S2743-PVC15-contract-control',catalogId,primaryMeasureParameterId:'area_m2',
    parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],submittedParameters,confirmedParameters:{},
    currencyCode:'KGS',priceItems:[],maximumResourceRows:definition.resources.length,hashJson:async value=>estimateDeterministicHash(value),rowOverrides});
}
const find = (result: Awaited<ReturnType<typeof compile>>, id: string) => result.rows.find(r=>r.row_id===id)!;

test('one existing compatible ID, no invented accepted variants, no project or engineering quantity defaults',async()=>{
  expect(manifest.catalogIds).toEqual([catalogId]);expect(manifest.acceptedNewTypeDelta).toBe(0);
  expect(manifest.incompatibleGenericRoofVariantsIncluded).toBe(false);expect(definition.runtimeInput).toEqual({});
  expect(definition.parameters.every(p=>p.default_value===null)).toBe(true);
  const result=await compile({area_m2:500});expect(result.rows).toHaveLength(1);expect(result.rows[0]).toMatchObject({row_id:'rc09:pvc_membrane_hot_air_install',quantity:'500'});
  expect(result.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('pvc15_base'))).toBe(true);
});

test('preserves 535 m2 as the project order and keeps independent consumption, balances and integer facts',async()=>{
  const result=await compile(pvc15ControlInputS2743());expect(result.preliminaryNeeds).toEqual([]);
  expect(find(result,'rc09:reinforced_pvc_roof_membrane_1_5mm')).toMatchObject({quantity:'535',calculation_trace:{purchaseBalance:{consumed:'525',effectiveOrder:'535',remaining:'10',stock:'0',reserve:'0',quantum:'5'}}});
  expect(find(result,'rc09:pvc_membrane_telescopic_fastener').quantity).toBe('2700');
  expect(find(result,'rc09:pvc_membrane_edge_rail').quantity).toBe('112');
  expect(find(result,'rc09:liquid_pvc_joint_sealant').quantity).toBe('7');
  expect(find(result,'rc09:pvc_membrane_weld_probe_test').quantity).toBe('10');
  expect(find(result,'pvc15:separation:mineral')).toMatchObject({quantity:'510',calculation_trace:{purchaseBalance:{remaining:'0'}}});
});

test.each(['telescopic_fastener_quantity_piece','weld_probe_control_count_test'])('%s rejects fractional and zero facts without rounding',async id=>{
  for(const value of ['10.5',0]) await expect(compile({...pvc15ControlInputS2743(),[id]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});

test('allowed fractional area, usage, energy and manual supplier quantity remain exact',async()=>{
  const input={...pvc15ControlInputS2743(),area_m2:'500.25',hot_air_welder_machine_h:'9.125',pvc15_welding_energy_kwh:'13.751',reinforced_membrane_quantity_m2:'535.125',pvc15_supply_rc09_reinforced_pvc_roof_membrane_1_5mm_quantum:'0.125'};
  const result=await compile(input);expect(find(result,'rc09:pvc_membrane_hot_air_install').quantity).toBe('500.25');expect(find(result,'rc09:automatic_hot_air_roof_welder').quantity).toBe('9.125');
  expect(find(result,'rc09:reinforced_pvc_roof_membrane_1_5mm').quantity).toBe('535.125');expect(find(result,'pvc15:material:welding-energy').quantity).toBe('13.751');
});

test.each([[PVC15_BASE.eps,'glass','Стеклохолст','100'],[PVC15_BASE.mineral,'mineral','Геотекстиль','100'],[PVC15_BASE.bitumen,'bitumen','Геотекстиль','300']])('base %s selects only its verified separation material',async(base,suffix,material,density)=>{
  const input=pvc15ControlInputS2743();input.pvc15_base=base;input.pvc15_separation_product='VALIDATION_FIXTURE: совместимый '+material+' '+density+' г/м²';
  const prefix='pvc15_supply_pvc15_separation_'+suffix;input[prefix+'_stock']=0;input[prefix+'_reserve']=0;input[prefix+'_quantum']=10;
  const result=await compile(input);const layers=result.rows.filter(r=>r.row_id.startsWith('pvc15:separation:'));
  expect(layers).toHaveLength(1);expect(layers[0]).toMatchObject({row_id:'pvc15:separation:'+suffix,quantity:'510'});
  expect(layers[0]!.title_ru).toContain(material);expect(layers[0]!.title_ru).toContain(density+' г/м²');
});

test('another base without its system decision remains unresolved and receives no universal geotextile',async()=>{
  const result=await compile({...pvc15ControlInputS2743(),pvc15_base:PVC15_BASE.other});
  expect(result.rows.some(r=>r.row_id.startsWith('pvc15:separation:'))).toBe(false);
  expect(result.preliminaryNeeds.find(n=>n.row_id==='pvc15:scope:other-base')?.missing_parameter_ids).toContain('pvc15_other_layer_reference');
});
test('a different membrane system receives no borrowed LOGICROOF separation rule even on a known base',async()=>{
  const result=await compile({...pvc15ControlInputS2743(),pvc15_system_profile:PVC15_SYSTEM.other});
  expect(result.rows.some(r=>r.row_id.startsWith('pvc15:separation:'))).toBe(false);
  expect(result.preliminaryNeeds.find(n=>n.row_id==='pvc15:scope:other-base')?.missing_parameter_ids).toContain('pvc15_other_layer_reference');
});

test.each(Object.values(PVC15_MACHINE))('machine mode %s retains 9 usage hours and never orders apparatus in machine-hours',async mode=>{
  const input={...pvc15ControlInputS2743(),pvc15_machine_provision:mode,pvc15_machine_purchase_count:2,pvc15_rental_basis:'За сутки',pvc15_rental_billable_days:'2.5',
    pvc15_machine_delivery_mode:PVC15_NOT_REQUIRED,pvc15_machine_delivery_reference:'VALIDATION_FIXTURE: доставка в подтверждённом тарифе, отдельно не начисляется'};
  if(mode===PVC15_MACHINE.unknown) delete input.pvc15_machine_reference;
  const result=await compile(input);expect(find(result,'rc09:automatic_hot_air_roof_welder')).toMatchObject({quantity:'9',included_in_estimate:false,included_in_procurement:false});
  expect(result.rows.filter(r=>r.included_in_procurement&&r.unit_id==='machine_hour')).toEqual([]);
  if(mode===PVC15_MACHINE.rent) expect(find(result,'pvc15:equipment:rental-days')).toMatchObject({quantity:'2.5',unit_id:'day',included_in_procurement:false});
  if(mode===PVC15_MACHINE.purchase) expect(find(result,'pvc15:equipment:purchase')).toMatchObject({quantity:'2',unit_id:'piece',included_in_procurement:true});
  if(mode===PVC15_MACHINE.provided) expect(find(result,'pvc15:equipment:provided')).toMatchObject({included_in_estimate:false,included_in_procurement:false});
  if(mode===PVC15_MACHINE.unknown) expect(result.preliminaryNeeds.find(n=>n.row_id==='pvc15:equipment:provision-need')).toBeDefined();
});

test('main installation, preparation and own machine costs are independent while included workers and tools stay uncharged',async()=>{
  const result=await compile(pvc15ControlInputS2743(),{
    'rc09:pvc_membrane_hot_air_install':{unitPrice:'10',provenance:{kind:'manual'}},
    'pvc15:labor:preparation':{unitPrice:'100',provenance:{kind:'manual'}},
    'pvc15:equipment:own-use':{unitPrice:'20',provenance:{kind:'manual'}},
    'pvc15:labor:separation':{unitPrice:'75',provenance:{kind:'manual'}},
  });expect(result.totals.amount).toBe('5580');expect(result.totals.pricedRowCount).toBe(4);expect(result.totals.unpricedRowCount).toBeGreaterThan(0);
  expect(find(result,'pvc15:labor:welding')).toMatchObject({quantity:'6',included_in_estimate:false,unit_price:null});
  expect(find(result,'pvc15:tools:welding')).toMatchObject({included_in_estimate:false,included_in_procurement:false,calculation_trace:{resourceGraph:{includedInResourceOwnerRowId:'rc09:pvc_membrane_hot_air_install'}}});
  expect(find(result,'pvc15:labor:details')).toMatchObject({quantity:'2',included_in_estimate:false});
});

test('missing supply facts preserve known usage and scope while material order remains an explicit unresolved need',async()=>{
  const input=pvc15ControlInputS2743();delete input.pvc15_membrane_consumption_m2;
  const result=await compile(input);expect(find(result,'rc09:automatic_hot_air_roof_welder').quantity).toBe('9');
  expect(find(result,'rc09:pvc_membrane_hot_air_install').quantity).toBe('500');
  expect(result.preliminaryNeeds.find(n=>n.row_id==='rc09:reinforced_pvc_roof_membrane_1_5mm')?.missing_parameter_ids).toEqual(['pvc15_membrane_consumption_m2']);
});

test('confirmed catalogue roll42 rounds a selected real order but is never a default or a consumption factor',async()=>{
  const result=await compile({...pvc15ControlInputS2743(),reinforced_membrane_quantity_m2:546,pvc15_supply_rc09_reinforced_pvc_roof_membrane_1_5mm_quantum:42});
  expect(find(result,'rc09:reinforced_pvc_roof_membrane_1_5mm')).toMatchObject({quantity:'546',calculation_trace:{purchaseBalance:{consumed:'525',remaining:'21',quantum:'42'}}});
  await expect(compile({...pvc15ControlInputS2743(),pvc15_supply_rc09_reinforced_pvc_roof_membrane_1_5mm_quantum:42})).rejects.toHaveProperty('code');
});

test('provided machine and included energy retain physical needs without adding a second charge or purchase',async()=>{
  const result=await compile({...pvc15ControlInputS2743(),pvc15_machine_provision:PVC15_MACHINE.provided,pvc15_energy_cost_scope:'Энергия включена в основную расценку'},
    {'rc09:pvc_membrane_hot_air_install':{unitPrice:'10',provenance:{kind:'manual'}}});
  expect(result.totals.amount).toBe('5000');expect(find(result,'pvc15:equipment:provided')).toMatchObject({quantity:'9',included_in_estimate:false,included_in_procurement:false});
  expect(find(result,'pvc15:material:included-welding-energy')).toMatchObject({quantity:'13.75',included_in_estimate:false});
  expect(result.rows.some(r=>r.row_id==='pvc15:material:welding-energy')).toBe(false);
});

test('explicit hourly rental minimum and separate delivery use their actual invoice units',async()=>{
  const result=await compile({...pvc15ControlInputS2743(),pvc15_machine_provision:PVC15_MACHINE.rent,pvc15_rental_basis:'За машино-час',pvc15_rental_billable_hours:12,
    pvc15_machine_delivery_mode:PVC15_REQUIRED,pvc15_machine_delivery_reference:'VALIDATION_FIXTURE: два отдельных рейса, минимальная аренда12 часов подтверждена предложением',pvc15_machine_delivery_trips:2});
  expect(find(result,'rc09:automatic_hot_air_roof_welder').quantity).toBe('9');expect(find(result,'pvc15:equipment:rental-hours').quantity).toBe('12');
  expect(find(result,'pvc15:service:machine-delivery')).toMatchObject({quantity:'2',unit_id:'trip'});
});

test('actual cleanup, bags and full waste service reuse existing coverage; usable membrane remainder is retained',async()=>{
  const result=await compile({...pvc15ControlInputS2743(),g6_cleanup_applicability:G6_COMPLETION_REQUIRED_S2741,g6_waste_applicability:G6_COMPLETION_REQUIRED_S2741,
    g6_cleanup_worker_h:3,g6_cleanup_bag_count:5,g6_cleanup_bag_specification:'VALIDATION_FIXTURE: мешки120 л',g6_cleanup_bag_stock:1,g6_cleanup_bag_reserve:2,g6_cleanup_bag_quantum:4,
    g6_waste_mass_kg:12,g6_waste_service_scope:G6_WASTE_SERVICE_PRICE_SCOPE_S2741,g6_waste_service_specification:'VALIDATION_FIXTURE: полная услуга без уборки и мешков',
    g6_waste_receiver_reference:'VALIDATION_FIXTURE: согласованный принимающий пункт',g6_waste_vehicle_energy_scope:G6_NEXT_LIQUID_ENERGY_SCOPE,
    g6_waste_vehicle_specification:'VALIDATION_FIXTURE: подтверждённый грузовой транспорт',g6_waste_vehicle_hours:2.5,
    g6_waste_crew_scope:'VALIDATION_FIXTURE: труд погрузки и водителя учтён один раз',g6_waste_crew_hours:3.25,g6_waste_loading_method:G6_NEXT_MANUAL_LOADING,
    g6_waste_fuel_specification:'VALIDATION_FIXTURE: жидкое топливо транспорта',g6_waste_fuel_l:7.5},
    {'g6:completion:cleanup-workers':{unitPrice:'100',provenance:{kind:'manual'}},'g6:completion:bags':{unitPrice:'10',provenance:{kind:'manual'}},'g6:completion:waste-service':{unitPrice:'20',provenance:{kind:'manual'}}});
  expect(result.totals.amount).toBe('620');expect(find(result,'g6:completion:bags')).toMatchObject({quantity:'8',calculation_trace:{purchaseBalance:{consumed:'5',remaining:'4'}}});
  expect(find(result,'g6:completion:waste-vehicle')).toMatchObject({quantity:'2.5',included_in_estimate:false,included_in_procurement:false});
  expect(find(result,'g6:completion:waste-fuel')).toMatchObject({quantity:'7.5',included_in_estimate:false,included_in_procurement:false});
  expect(find(result,'rc09:reinforced_pvc_roof_membrane_1_5mm').calculation_trace).toMatchObject({purchaseBalance:{remaining:'10'}});
  expect(result.preliminaryNeeds).toEqual([]);
});

test('selected defect correction and recheck remain local needs until actual patch and labour facts are supplied',async()=>{
  const result=await compile({...pvc15ControlInputS2743(),pvc15_defects_mode:PVC15_REQUIRED});
  expect(result.preliminaryNeeds.find(n=>n.row_id==='pvc15:labor:defects')?.missing_parameter_ids).toContain('pvc15_defect_worker_hours');
  expect(result.preliminaryNeeds.find(n=>n.row_id==='pvc15:service:defect-recheck')?.missing_parameter_ids).toContain('pvc15_defect_recheck_count');
  expect(find(result,'rc09:pvc_membrane_hot_air_install').quantity).toBe('500');expect(find(result,'rc09:automatic_hot_air_roof_welder').quantity).toBe('9');
});
