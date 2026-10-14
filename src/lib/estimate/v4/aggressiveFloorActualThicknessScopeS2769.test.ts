import {buildAggressiveFloorActualThicknessSuccessorS2769,compileAggressiveFloorActualThicknessS2769,
 aggressiveFloorActualThicknessBindingS2769 as pack,aggressiveFloorWorkScopeIdS2769 as work,aggressiveFloorProtectionScopeIdS2769 as protection,
 aggressiveFloorDustScopeIdS2769 as dust,aggressiveFloorWasteModeIdS2769 as waste,aggressiveFloorWasteScopeValuesS2769 as wasteScope} from './aggressiveFloorActualThicknessScopeS2769';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const snapshot=require('../../../../data/estimate-benchmarks/fixtures/aggressive-floor-four-v3-parents-s27-69.json') as {models:PurchaseGroupRepresentative[]};
const facts=(mm:number)=>({floor_covering_area_m2:35.5,[pack.actualThicknessParameterId]:mm,[work]:pack.workScopeValue,
 [protection]:pack.adjacentProtectionNotRequiredValue,[dust]:pack.dustControlProvidedValue,[waste]:wasteScope.retainModeValue});

describe('Four exact aggressive floor parents: observed millimetres, existing rates and explicit source obligations',()=>{
 test.each(snapshot.models)('retains the numerical declarations and physical owners of $definition.catalog_id',parent=>{
  const next=buildAggressiveFloorActualThicknessSuccessorS2769(parent);
  expect(next.formulas.slice(0,5).map(f=>f.formula_id)).toEqual(parent.formulas.map(f=>f.formula_id));
  expect(next.formulas.slice(0,5).every(f=>!f.input_parameter_ids.includes(pack.legacyThicknessStepsParameterId))).toBe(true);
  for(const old of parent.resources){const r=next.resources.find(r=>r.row_id===old.row_id)!;
   expect([r.row_id,r.formula_id,r.unit_id,r.semantic_owner,r.cost_owner_id,r.procurement_eligible,r.source_metadata])
    .toEqual([old.row_id,old.formula_id,old.unit_id,old.semantic_owner,old.cost_owner_id,old.procurement_eligible,old.source_metadata]);
  }
  for(const id of [pack.legacyProfileParameterId,pack.legacyThicknessStepsParameterId]){
   const p=next.parameters.find(p=>p.parameter_id===id)!;
   expect(p.truth_metadata.visibility_role).toBe('INTERNAL_ONLY');expect(p.default_value).toBeNull();expect(p.required).toBe(false);
  }
  expect(next.parameters.find(p=>p.parameter_id===pack.actualThicknessParameterId)?.default_value).toBeNull();
  expect(next.passport.decision.quantityScope).toBe('PARTIAL');
  expect(next.passport.decision.wasteScopeIntegrationPending).toBe(false);
 });
 test.each(snapshot.models)('calculates 35mm directly for $definition.catalog_id',async parent=>{
  const r=await compileAggressiveFloorActualThicknessS2769(parent,facts(35));
  expect(r.rows.map(row=>row.quantity)).toEqual(['35.5','12.6167','2.7619','2.7619','5.5238','35.5']);
  expect(r.preliminaryNeeds).toHaveLength(0);
 });
 test.each([5,25,30,35])('uses the accepted signed correction at observed thickness %imm',async mm=>{
  const r=await compileAggressiveFloorActualThicknessS2769(snapshot.models[0]!,facts(mm));
  expect(Number(r.rows[1]!.quantity)).toBeCloseTo(35.5*(28.54+3.5*(mm-25)/5)/100,8);
  expect(Number(r.rows[3]!.quantity)).toBeCloseTo(35.5*(5.58+1.1*(mm-25)/5)/100,8);
  expect(r.preliminaryNeeds).toHaveLength(0);
 });
 test.each([0,4,6,24,33,35.5,Infinity,NaN])('never rounds or admits unsupported thickness %s',async mm=>{
  await expect(compileAggressiveFloorActualThicknessS2769(snapshot.models[0]!,facts(mm))).rejects.toThrow();
 });
 test('does not invent 25mm or trust a supplied hidden coefficient without the observed thickness',async()=>{
  const input={floor_covering_area_m2:35.5,[work]:pack.workScopeValue,[pack.legacyThicknessStepsParameterId]:2};
  const r=await compileAggressiveFloorActualThicknessS2769(snapshot.models[0]!,input);
  expect(r.rows).toHaveLength(0);expect(r.preliminaryNeeds.length).toBeGreaterThan(0);
 });
 test('an actual thickness supersedes a stale hidden coefficient',async()=>{
  const r=await compileAggressiveFloorActualThicknessS2769(snapshot.models[0]!,{...facts(35),[pack.legacyThicknessStepsParameterId]:99});
  expect(r.rows[1]!.quantity).toBe('12.6167');
 });
 test.each(snapshot.models)('retains both unsupported source obligations for $definition.catalog_id',async parent=>{
  const input={...facts(35),[protection]:pack.adjacentProtectionNeededValue,[dust]:pack.dustControlNeededValue};
  const r=await compileAggressiveFloorActualThicknessS2769(parent,input);
  expect(r.rows).toHaveLength(6);expect(r.preliminaryNeeds).toHaveLength(2);
  const next=buildAggressiveFloorActualThicknessSuccessorS2769(parent);
  expect(next.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toHaveLength(2);
 });
 test('never accepts an invented quantity in place of a missing application norm',async()=>{
  await expect(compileAggressiveFloorActualThicknessS2769(snapshot.models[0]!,{
   ...facts(35),[dust]:pack.dustControlNeededValue,aggressive_floor_dust_control_quantity_application:999,
  })).rejects.toThrow('unresolved application norm cannot be supplied');
 });
 test.each([wasteScope.onSiteExtraModeValue,wasteScope.contractorModeValue])('reuses one full service on confirmed tonnes: %s',async mode=>{
  const r=await compileAggressiveFloorActualThicknessS2769(snapshot.models[0]!,{...facts(35),[waste]:mode,
   aggressive_floor_floor_waste_mass_t:1.25,aggressive_floor_haul_distance_km:12,
   aggressive_floor_waste_service_coverage:wasteScope.coverageValue,aggressive_floor_transport_designation:'Договорный контейнеровоз',
   aggressive_floor_waste_packaging_description:'Тара исполнителя',aggressive_floor_waste_receiver_designation:'Согласованный приёмный пункт',
   aggressive_floor_waste_service_specification_ref:'Контрольная спецификация: полная услуга',
   aggressive_floor_waste_lowering_loading_scope:'Дополнительный спуск, погрузка, труд и тара включены в единую цену за тонну',
  });
  expect(r.preliminaryNeeds).toHaveLength(0);
  const rows=r.rows.filter(row=>row.category==='service');
  expect(rows).toHaveLength(1);expect(rows[0]!.quantity).toBe('1.25');
  expect(rows[0]!.title_ru).toContain('Контрольная спецификация');
 });
 test('cannot build for an unlisted or forged parent',()=>{
  const p=structuredClone(snapshot.models[0]!);p.definition.catalog_id+='-forged';
  expect(()=>buildAggressiveFloorActualThicknessSuccessorS2769(p)).toThrow('EXACT_FOUR_V3_PARENTS_REQUIRED');
 });
});
