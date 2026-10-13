import parents from '../../../../data/estimate-benchmarks/fixtures/asphalt-floor-four-v4-parents-s27-69.json';
import {buildAsphaltFloorWasteSuccessorS2769,compileAsphaltFloorWasteS2769,asphaltFloorWasteBindingS2769 as p,asphaltFloorWasteModeIdS2769 as mode} from './asphaltFloorWasteScopeS2769';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {buildCanonicalProfessionalPdfProjection} from '../backendPlatform/canonicalProfessionalPdf';
import {overlayS2769AsphaltFloorWasteFour} from '../../../../scripts/estimate/r4a13/s2769AsphaltFloorWasteFourOverlay';
const reps=parents.reps as unknown as PurchaseGroupRepresentative[],prefix='f09:asphalt_floor_covering_demolition:';
const facts={floor_covering_area_m2:'35.5',asphalt_floor_work_scope_confirmed:p.confirmedWorkScopeValue};
const service={asphalt_floor_waste_mass_t:'1.25',asphalt_floor_haul_distance_km:'12',asphalt_floor_waste_service_coverage:p.coverageValue,
 asphalt_floor_transport_designation:'VALIDATION_FIXTURE: транспорт',asphalt_floor_waste_packaging_description:'VALIDATION_FIXTURE: тара',asphalt_floor_waste_receiver_designation:'VALIDATION_FIXTURE: приём',
 asphalt_floor_waste_service_specification_ref:'VALIDATION_FIXTURE S27.69: единая полная услуга',asphalt_floor_waste_lowering_loading_scope:'VALIDATION_FIXTURE: спуск, труд и тара включены'};
test.each(reps.map((parent,i)=>[String(parent.definition.catalog_id),i] as const))('all published physical quantities and five owners remain: %s',async(_id,i)=>{
 const parent=reps[i]!,before=JSON.stringify(parent),model=buildAsphaltFloorWasteSuccessorS2769(parent);
 const r=await compileAsphaltFloorWasteS2769(parent,{...facts,[mode]:p.retainModeValue});
 expect(r.rows).toHaveLength(6);expect(r.preliminaryNeeds).toHaveLength(0);
 const quantities={operation:'35.5',labor:'8.4419',machinist_labor:'1.67205',compressor_5m3_min_686kpa:'1.67205',pneumatic_breaker:'3.3441'};
 for(const [id,q]of Object.entries(quantities))expect(r.rows.find(row=>row.row_id===prefix+id)?.quantity).toBe(q);
 expect(r.rows.filter(row=>row.included_in_estimate)).toHaveLength(3);expect(r.rows.find(row=>row.row_id===prefix+'machinist_labor')?.included_in_estimate).toBe(false);
 for(const row of parent.resources)expect(model.resources.find(next=>next.row_id===row.row_id)?.cost_owner_id).toBe(row.cost_owner_id);
 for(const formula of parent.formulas)expect(model.formulas.find(next=>next.formula_id===formula.formula_id)).toEqual(formula);
 expect(JSON.stringify(parent)).toBe(before);
});
test('unknown waste handling retains old quantities and a missing object fact rather than a false full estimate',async()=>{
 const r=await compileAsphaltFloorWasteS2769(reps[2]!,{...reps[2]!.baseline.input_values,floor_covering_area_m2:'35.5'});
 expect(r.rows).toHaveLength(5);expect(r.preliminaryNeeds).toHaveLength(1);
 expect(r.preliminaryNeeds[0]?.row_id).toBe(prefix+'unconfirmed-waste-scope');expect(r.preliminaryNeeds[0]?.missing_parameter_ids).toContain(mode);
 expect(r.preliminaryNeeds[0]?.need_state).toBe('CONDITION_REQUIRED');
});
test.each(reps.map((parent,i)=>[String(parent.definition.catalog_id),i] as const))('full external service is measured once and machinery/operator are not duplicated: %s',async(_id,i)=>{
 const r=await compileAsphaltFloorWasteS2769(reps[i]!,{...facts,...service,[mode]:p.contractorModeValue});
 expect(r.rows).toHaveLength(7);expect(r.preliminaryNeeds).toHaveLength(0);
 expect(r.rows.find(row=>row.row_id===prefix+'waste-service')?.quantity).toBe('1.25');
 expect(r.rows.some(row=>row.row_id===prefix+'waste-onsite-service')).toBe(false);
 expect(r.rows.filter(row=>row.included_in_estimate)).toHaveLength(4);expect(r.rows.filter(row=>row.included_in_procurement)).toHaveLength(3);
 expect(r.rows.every(row=>row.unit_price==null)).toBe(true);
});
test('on-site service needs no external distance, transport or receiving destination',async()=>{
 const r=await compileAsphaltFloorWasteS2769(reps[2]!,{...facts,...service,[mode]:p.onSiteExtraModeValue,
  asphalt_floor_haul_distance_km:undefined,asphalt_floor_transport_designation:undefined,asphalt_floor_waste_receiver_designation:undefined,asphalt_floor_waste_service_coverage:undefined});
 expect(r.preliminaryNeeds).toHaveLength(0);expect(r.rows.find(row=>row.row_id===prefix+'waste-onsite-service')?.quantity).toBe('1.25');
});
test('mass, exact specification and coverage remain object facts and cannot be inferred from area',async()=>{
 for(const missing of ['asphalt_floor_waste_mass_t','asphalt_floor_waste_service_specification_ref','asphalt_floor_waste_lowering_loading_scope','asphalt_floor_waste_service_coverage']){
  const r=await compileAsphaltFloorWasteS2769(reps[2]!,{...facts,...service,[mode]:p.contractorModeValue,[missing]:undefined});
  expect(r.preliminaryNeeds).toHaveLength(1);expect(r.rows.some(row=>row.row_id===prefix+'waste-service')).toBe(false);
 }
});
test('manual prices and excluded old machinery stay on old owners while the new service price remains unknown',async()=>{
 const parent=reps[2]!,model=buildAsphaltFloorWasteSuccessorS2769(parent);
 const overrides={[prefix+'labor']:{unitPrice:'123.45',provenance:{kind:'manual',reason:'Сохранённая цена'}},
  [prefix+'compressor_5m3_min_686kpa']:{includedInEstimate:false,unitPrice:'7',provenance:{kind:'manual',reason:'Сохранённое участие и цена'}}};
 const before=JSON.stringify(overrides),r=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:p.contract,catalogId:String(parent.definition.catalog_id),
  primaryMeasureParameterId:'floor_covering_area_m2',parameterDefinitions:model.parameters as never,formulaDefinitions:model.formulas as never,resourceDefinitions:model.resources as never,
  submittedParameters:{...facts,...service,[mode]:p.contractorModeValue},confirmedParameters:{},currencyCode:'KGS',priceItems:[],rowOverrides:overrides as never,maximumResourceRows:9,hashJson:async v=>JSON.stringify(v)});
 expect(r.rows.find(row=>row.row_id===prefix+'labor')?.unit_price).toBe('123.45');
 expect(r.rows.find(row=>row.row_id===prefix+'compressor_5m3_min_686kpa')).toMatchObject({unit_price:'7',included_in_estimate:false});
 expect(r.rows.find(row=>row.row_id===prefix+'waste-service')?.unit_price).toBeNull();expect(JSON.stringify(overrides)).toBe(before);
});
test('ordinary PDF retains chosen handling, full service reference and actual route before publishing',async()=>{
 const parameters={...facts,...service,[mode]:p.contractorModeValue},r=await compileAsphaltFloorWasteS2769(reps[2]!,parameters);
 const pdf=buildCanonicalProfessionalPdfProjection({revision:{id:'11111111-2222-4333-8444-555555555555',release_id:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  catalog_id:String(reps[2]!.definition.catalog_id),checksum_sha256:'f'.repeat(64),row_count:r.rows.length,revision_number:1,currency_code:'KGS',totals:{amount:null},
  input_parameters:parameters,primary_measure_value:'35.5',primary_measure_unit_id:'m2',created_at:'2026-10-14T00:00:00.000Z'},rows:r.rows,workTitleRu:'Разборка асфальтового покрытия пола'});
 expect(pdf.html).toContain(p.contractorModeValue);expect(pdf.html).toContain(service.asphalt_floor_waste_service_specification_ref);
 expect(pdf.html).toContain('Расстояние внешней перевозки, км: 12');expect(pdf.html).toContain('<td class="numeric">1,25</td>');
});
test('outside haul is conditionally resolved by actual scope, never excluded merely because KRER excludes it',()=>{
 for(const parent of reps){const {representative}=overlayS2769AsphaltFloorWasteFour(parent),map=representative.passport.decision.independentCompletenessMap;
  const external=map.entries.find((entry:Record<string,unknown>)=>entry.operationId==='offsite_waste_haul');
  expect(external.resolution).toEqual({kind:'ROW',rowId:prefix+'waste-service'});expect(external.conditionalScopeResolutionS2769.unknownRemainsOpen).toBe(true);
  expect(representative.passport.excluded_scope_ru).not.toContain('внеобъектовый вывоз и размещение отходов');
  expect(representative.passport.decision.unresolvedNumericalSourceGaps).toBe(0);
 }
});
