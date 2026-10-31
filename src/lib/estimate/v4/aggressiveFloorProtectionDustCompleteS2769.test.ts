import {buildAggressiveFloorProtectionDustCompleteS2769 as build,compileAggressiveFloorProtectionDustCompleteS2769 as compile,
 aggressiveFloorCompleteBindingS2769 as pack,aggressiveFloorPlannedDefaultsS2769 as defaults} from './aggressiveFloorProtectionDustCompleteS2769';
import {aggressiveFloorActualThicknessBindingS2769 as old,aggressiveFloorProtectionScopeIdS2769 as protection,
 aggressiveFloorDustScopeIdS2769 as dust,aggressiveFloorWasteModeIdS2769 as waste,aggressiveFloorWasteScopeValuesS2769 as wasteScope,
 aggressiveFloorWorkScopeIdS2769 as work} from './aggressiveFloorActualThicknessScopeS2769';
import {canonicalDefinitionTitleRu} from '../backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalApprovedBaselineRuntimeDefaultValue} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const frozenAll=require('../../../../data/estimate-benchmarks/fixtures/aggressive-floor-four-v4-parents-and-barrier-s27-69.json') as {models:PurchaseGroupRepresentative[];barrier:PurchaseGroupRepresentative};
const frozen={...frozenAll,models:frozenAll.models.filter(model=>pack.targets.some(target=>target.catalogId===model.definition.catalog_id))};
const facts=()=>({floor_covering_area_m2:35.5,[old.actualThicknessParameterId]:35,[work]:old.workScopeValue,[pack.barrierAreaParameterId]:12});
test.each(frozen.models)('complete selected composition and correct observed-thickness title: $definition.catalog_id',async parent=>{
 const r=await compile(parent,facts());
 expect(r.preliminaryNeeds).toHaveLength(0);expect(r.rows).toHaveLength(20);
 const values=Object.fromEntries(r.rows.map(row=>[row.row_id,row.quantity]));
 expect(values['f09:aggressive_environment_cement_or_concrete_floor_25mm_demolition:labor']).toBe('12.6167');
 expect(values['f09:temporary_vertical_protective_barrier_board_frame:labor']).toBe('6.2928');
 expect(values['f09:temporary_vertical_protective_barrier_board_frame:truck_crane_10t']).toBe('0.0228');
 expect(values['f09:temporary_vertical_protective_barrier_board_frame:roofing_felt_tk350']).toBe('13.8');
 expect(values['dust:industrial-vacuum:krer13-06-004-01:workers']).toBe('3.55');
 expect(values['dust:industrial-vacuum:krer13-06-004-01:vacuum']).toBe('3.55');
 expect(r.rows.filter(row=>row.row_id.includes('machinist')).every(row=>row.unit_price==null)).toBe(true);
 const next=build(parent);expect(next.resources).toHaveLength(24);expect(next.parameters).toHaveLength(22);
 expect(canonicalDefinitionTitleRu(next.definition)).toContain('по фактической толщине');
 expect(canonicalDefinitionTitleRu(next.definition)).not.toContain('25 мм');
 for(const row of parent.resources)expect(next.resources.find(r=>r.row_id===row.row_id)?.cost_owner_id).toBe(row.cost_owner_id);
 for(const [id,value] of Object.entries(defaults)){
  expect(canonicalApprovedBaselineRuntimeDefaultValue(next.baseline,id)).toBe(value);
  expect(next.baseline.input_classification[id]).toBe('ASSUMPTION');
 }
 expect(canonicalApprovedBaselineRuntimeDefaultValue(next.baseline,pack.barrierAreaParameterId)).toBeNull();
});
test('does not derive barrier area from floor area',async()=>{
 const input=facts();delete input[pack.barrierAreaParameterId];const r=await compile(frozen.models[0]!,input);
 expect(r.preliminaryNeeds.length).toBeGreaterThan(0);
 expect(r.rows.some(row=>row.row_id.startsWith('f09:temporary_vertical'))).toBe(false);
 expect(r.rows.find(row=>row.row_id.endsWith(':vacuum'))?.quantity).toBe('3.55');
});
test.each([[pack.barrierMethodParameterId,pack.otherBarrierValue,':adjacent-protection'],[pack.dustMethodParameterId,pack.otherDustValue,':dust-control']])('other method retains its application gap: %s',async(id,value,suffix)=>{
 const r=await compile(frozen.models[0]!,{...facts(),[id]:value});
 expect(r.preliminaryNeeds).toHaveLength(1);expect(r.preliminaryNeeds[0]!.row_id).toContain(suffix);
});
test('already provided protection and dedusting do not charge planned work twice',async()=>{
 const r=await compile(frozen.models[0]!,{...facts(),[protection]:old.adjacentProtectionProvidedValue,[dust]:old.dustControlProvidedValue});
 expect(r.preliminaryNeeds).toHaveLength(0);expect(r.rows).toHaveLength(6);
});
test.each([wasteScope.contractorModeValue,wasteScope.onSiteExtraModeValue])('complete service remains a single payable owner: %s',async mode=>{
 const r=await compile(frozen.models[0]!,{...facts(),[waste]:mode,aggressive_floor_floor_waste_mass_t:1.25,
  aggressive_floor_haul_distance_km:12,aggressive_floor_waste_service_coverage:wasteScope.coverageValue,
  aggressive_floor_transport_designation:'Контейнеровоз',aggressive_floor_waste_packaging_description:'Тара исполнителя',
  aggressive_floor_waste_receiver_designation:'Согласованный приёмный пункт',
  aggressive_floor_waste_service_specification_ref:'Полный согласованный состав услуги. '.repeat(20),
  aggressive_floor_waste_lowering_loading_scope:'Спуск, погрузка, тара, труд и техника включены в единую стоимость тонны'});
 expect(r.rows).toHaveLength(21);expect(r.preliminaryNeeds).toHaveLength(0);
 const service=r.rows.filter(row=>row.category==='service');expect(service).toHaveLength(1);expect(service[0]!.quantity).toBe('1.25');
 expect(String(service[0]!.title_ru).length).toBeGreaterThan(500);
});
test('source norms stay exact and old prices and unlisted consumables are absent',()=>{
 const next=build(frozen.models[0]!);
 expect(next.resources.filter(row=>row.row_id.startsWith('dust:'))).toHaveLength(3);
 for(const original of frozen.barrier.formulas){const f=next.formulas.find(f=>f.formula_id===original.formula_id)!;
  expect(f.expression_source).toBe(String(original.expression_source).replaceAll('barrier_vertical_area_m2',pack.barrierAreaParameterId));
 }
 expect(next.resources.filter(row=>row.row_id.startsWith('dust:')).every(row=>row.source_metadata.sourceRole==='OFFICIAL_KG_UNIT_RATE')).toBe(true);
 expect(next.passport.decision.quantityScope).toBe('PARTIAL');
});
