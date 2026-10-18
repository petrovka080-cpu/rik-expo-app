// WORK prospective cases. Real shared compiler; no current catalog or price admission.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {
  hydrotestSteelPackR1 as pack, hydrotestSteelPrefixR1 as prefix,
  hydrotestSteelDefinitionR1 as definition, hydrotestSteelCompletenessMapR1 as completeness,
  compileHydrotestSteelR1,
} from './hydrotestInternalSteelDn50Krer16R1';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';

const d = definition(), catalogId = pack.workOnlyTestCatalogId;
const control = (n=35.5):Record<string,unknown> => {
  const p:Record<string,unknown> = {tested_steel_pipe_length_m:n,nominal_bore_mm:50,working_pressure_mpa:0.6,test_pressure_mpa:0.8,test_hold_h:0.5};
  for (const f of pack.scopeFacts) p[f.id] = f.value;
  for (const f of pack.projectReferenceFacts) p[f.id] = 'CONTROL_ONLY approved project reference; no actual acceptance claim';
  const quantum:Record<string,number> = {water:0.1,paint:0.01,'linseed-oil':0.001,linen:0.001};
  for (const m of pack.materials) {
    p[m.parameterPrefix+'_specification'] = 'CONTROL_ONLY '+m.nameRu+' actual lot/specification';
    p[m.parameterPrefix+'_stock'] = 0; p[m.parameterPrefix+'_reserve'] = 0; p[m.parameterPrefix+'_quantum'] = quantum[m.id];
  }
  return p;
};
const compile = (p:Record<string,unknown>) => compileHydrotestSteelR1(catalogId,p);
const amended = (p:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']) => compileCanonicalEstimateCore({
  operation:'recalculate',catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:pack.primaryMeasureParameterId,
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
  submittedParameters:p,confirmedParameters:{...d.runtimeInput},rowOverrides,currencyCode:'KGS',priceItems:[],
  maximumResourceRows:44,hashJson:async value=>estimateDeterministicHash(value),
});
type Result = Awaited<ReturnType<typeof compile>>;
const row = (r:Result,id:string) => r.rows.find(x=>x.row_id===prefix+':'+id);
const need = (r:Result,id:string) => r.preliminaryNeeds.find(x=>x.row_id===prefix+':'+id);
const provenance = {kind:'manual',reason:'CONTROL_ONLY saved actual order amendment, not source norm or accepted site evidence'};

it('pins exact official PDF and general guidance without asserting current membership',()=>{
  for (const source of [pack.source,pack.guidance])
    expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),source.path))).digest('hex')).toBe(source.sha256);
  expect(pack.normId).toBe('16-07-005-01'); expect(pack.catalogBinding).toBeNull(); expect(pack.publicationAllowed).toBe(false);
  expect(pack.fullTechnicalAcceptance).toBe(false); expect(pack.source.sourceBasePricesUsed).toBe(false);
  expect(pack.sourceId).toBe(pack.sourceId.toLowerCase()); expect(pack.originSourceId).toBe('KG_KRER16_INTERNAL_PIPELINES_2015_STEEL_HYDROTEST_005_01');
  expect(pack.sourceMachinePricePublicationAllowed).toBe(false); expect(pack.newGroupAbsenceCaptured).toBe(false);
});
it('keeps source100m primary metres and exact source-to-order units',()=>{
  expect(d.ordinaryParameterIds).toEqual(['tested_steel_pipe_length_m']);
  expect(d.parameters.find(p=>p.parameter_id==='tested_steel_pipe_length_m')?.unit_id).toBe('m');
  expect(d.resources.find(r=>r.row_id===prefix+':paint-consumed')?.unit_id).toBe('t');
  expect(d.resources.find(r=>r.row_id===prefix+':paint')?.unit_id).toBe('kg');
  expect(d.formulas.some(f=>f.input_parameter_ids.includes('tested_steel_pipe_length_m'))).toBe(true);
});
it.each([
  [100,'5.01','1.5','1','0.00005','0.00002','0.02'],
  [35.5,'1.77855','0.5325','0.355','0.00001775','0.0000071','0.0071'],
] as const)('retains six independently transcribed resource quantities at%s metres',async(n,labor,machine,water,paint,oil,linen)=>{
  const r = await compile(control(n));
  for (const [id,q] of [['whole-worker',labor],['hydraulic-plant-consumed',machine],['water-consumed',water],
    ['paint-consumed',paint],['linseed-oil-consumed',oil],['linen-consumed',linen]]) expect(row(r,id)?.quantity).toBe(q);
  expect(r.rows).toHaveLength(30); expect(r.preliminaryNeeds).toHaveLength(6);
  expect(r.rows.every(x=>x.unit_price===null)).toBe(true);
});
it.each([
  {pipe_material_scope:'PPR'}, {pipe_material_scope:'Hep2O'}, {pipe_material_scope:'HDPE'},
  {system_location_scope:'EXTERNAL_PRESSURE_MAIN'}, {system_location_scope:'GAS'}, {system_location_scope:'SEWER'},
  {diameter_measurement_basis:'POLYMER_OUTSIDE_DIAMETER'}, {nominal_bore_mm:50.01},
  {tested_steel_pipe_length_m:0}, {tested_steel_pipe_length_m:-1}, {working_pressure_mpa:1.6001},
] as Record<string,unknown>[])('rejects an incompatible physical scope%j through the real parameter gate',async change=>{
  await expect(compile({...control(),...change})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it.each(['test_boundary_reference','test_program_reference','working_pressure_mpa','test_pressure_mpa','test_hold_h',
  'test_acceptance_reference','plant_compatibility_reference','water_supply_discharge_reference','isolation_access_reference'])(
  'does not invent missing project fact%s',async id=>{
    const p = control(); delete p[id]; const r = await compile(p);
    expect(row(r,'whole-worker')).toBeUndefined();
    expect(need(r,'whole-worker')?.missing_parameter_ids).toContain(id);
    expect(need(r,'whole-worker')?.quantity).toBe('1.77855');
  });
it.each([{test_pressure_mpa:0.05},{test_pressure_mpa:10.01},{test_hold_h:0}])(
  'rejects equipment/program incompatibility instead of inventing a setpoint%j',async change=>{
    await expect(compile({...control(),...change})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  });
it('does not derive source water from pipe capacity or multiply a VALTEC pressure rule',async()=>{
  const r = await compile({...control(),test_pressure_mpa:1.1,test_hold_h:1.25,nominal_bore_mm:25});
  expect(row(r,'water-consumed')?.quantity).toBe('0.355'); expect(row(r,'whole-worker')?.quantity).toBe('1.77855');
  expect(r.parameters.test_pressure_mpa).toBe(1.1); expect(r.parameters.test_hold_h).toBe(1.25);
  expect(d.parameters.every(p=>p.default_value===null)).toBe(true);
});
it.each(pack.materials.map(m=>m.id))('does not guess supplier stock for%s',async id=>{
  const m = pack.materials.find(x=>x.id===id)!, p=control(); delete p[m.parameterPrefix+'_stock'];
  const r = await compile(p); expect(row(r,id+'-consumed')).toBeDefined(); expect(row(r,id)).toBeUndefined();
  expect(need(r,id)?.missing_parameter_ids).toContain(m.parameterPrefix+'_stock');
});
it.each(pack.materials.map(m=>m.id))('requires exact positive-stock compatibility for%s',async id=>{
  const m = pack.materials.find(x=>x.id===id)!, r = await compile({...control(),[m.parameterPrefix+'_stock']:0.01});
  expect(row(r,id)).toBeUndefined(); expect(need(r,id)?.missing_parameter_ids).toContain(m.parameterPrefix+'_stock_reference');
});
it('applies supplier quantum after conversion and explicit stock/reserve, leaving source consumption exact',async()=>{
  const r = await compile({...control(),hydro_paint_stock:0.01,hydro_paint_stock_reference:'CONTROL_ONLY same MA-0115 lot',
    hydro_paint_reserve:0.01,hydro_paint_quantum:0.01});
  expect(row(r,'water')?.quantity).toBe('0.4'); expect(row(r,'paint')?.quantity).toBe('0.02');
  expect(row(r,'linseed-oil')?.quantity).toBe('0.008'); expect(row(r,'linen')?.quantity).toBe('0.008');
  expect(row(r,'paint-consumed')?.quantity).toBe('0.00001775');
  expect(row(r,'paint:remaining')?.quantity).toBe('0.01225'); expect(row(r,'paint:free')?.quantity).toBe('0.00225');
});
it('preserves saved material order quantity,price77,title while retaining the source norm',async()=>{
  const r = await amended(control(),{[prefix+':paint']:{quantity:'0.03',unitPrice:'77',titleRu:'CONTROL_ONLY saved MA-0115 order',provenance}});
  expect(row(r,'paint')).toMatchObject({quantity:'0.03',unit_price:'77',amount:'2.31',title_ru:'CONTROL_ONLY saved MA-0115 order'});
  expect(row(r,'paint-consumed')?.quantity).toBe('0.00001775'); expect(row(r,'paint:packages')?.quantity).toBe('3');
  expect(r.preliminaryNeeds).toHaveLength(6);
});
it('preserves saved exclusions without hiding normative consumption or source obligations',async()=>{
  const r = await amended(control(),{[prefix+':paint']:{includedInEstimate:false,includedInProcurement:false,provenance}});
  expect(row(r,'paint')).toMatchObject({included_in_estimate:false,included_in_procurement:false});
  expect(row(r,'paint-consumed')?.quantity).toBe('0.00001775'); expect(r.preliminaryNeeds).toHaveLength(6);
});
it('retains an insufficient manual order with a visible consumption shortage',async()=>{
  const r = await amended(control(),{[prefix+':water']:{quantity:'0.1',provenance}});
  expect(row(r,'water')?.quantity).toBe('0.1'); expect(row(r,'water:shortage')?.quantity).toBe('0.255');
  expect(row(r,'water-consumed')?.quantity).toBe('0.355');
});
it('keeps the reserve deficit distinct from consumption shortage',async()=>{
  const r = await amended({...control(),hydro_water_reserve:0.2},{[prefix+':water']:{quantity:'0.4',provenance}});
  expect(row(r,'water:reserve-deficit')?.quantity).toBe('0.155'); expect(row(r,'water:shortage')).toBeUndefined();
});
it('does not pay the unadmitted machine scope even when scalar price and inclusion are supplied',async()=>{
  const r = await amended(control(),{[prefix+':hydraulic-plant-consumed']:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}});
  expect(row(r,'hydraulic-plant-consumed')).toMatchObject({quantity:'0.5325',included_in_estimate:false,included_in_procurement:false});
  expect(need(r,'open:machine-price-and-worker-boundary')?.quantity).toBeNull();
  const machine = d.resources.find(x=>x.row_id===prefix+':hydraulic-plant-consumed')!;
  expect(machine.source_metadata).toMatchObject({machinePriceScopeStatus:'MACHINE_PRICE_SCOPE_PENDING',machinePriceOwnerAdmitted:false,
    codeSpecificOperatorRole:null,codeSpecificOperationScope:null});
  expect(d.resources.filter(x=>x.category==='equipment'&&x.resource_graph.costTreatment==='OWN_COST')).toHaveLength(0);
});
it('rejects a quantity77 and price77 override rather than turning the unknown machine into a paid owner',async()=>{
  await expect(amended(control(),{[prefix+':hydraulic-plant-consumed']:{quantity:'77',unitPrice:'77',
    includedInEstimate:true,includedInProcurement:true,provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it('rejects claimed manual machine coverage before a code-specific owner admission',async()=>{
  const machineHourPriceCoverageV1 = {contractVersion:'canonical-machine-hour-price-coverage/v1',resourceCode:'04-0440',
    unitId:'machine_hour',currencyCode:'KGS',unitPrice:'77',billingBasis:'MACHINE_HOUR',operationScope:'FULL_SOURCE_OPERATION',
    minimumBillableHours:'0',fixedFees:'0',separateNormedInputs:'EXCLUDED_FROM_RATE',
    source:{kind:'MANUAL',rowId:prefix+':hydraulic-plant-consumed',priceProvenanceReason:provenance.reason}};
  await expect(amended(control(),{[prefix+':hydraulic-plant-consumed']:{unitPrice:'77',includedInEstimate:true,
    includedInProcurement:true,machineHourPriceCoverageV1,provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it.each(['whole-worker','hydraulic-plant-consumed','paint-consumed','water:remaining'])(
  'rejects manual source/control quantity pins on%s',async id=>{
    await expect(amended(control(),{[prefix+':'+id]:{quantity:'1',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
  });
it.each(pack.gaps.map(g=>g.id))('retains concrete application need%s and rejects guessed user or row quantities',async id=>{
  const r = await compile(control()), n = need(r,'open:'+id);
  expect(n?.quantity).toBeNull(); expect(n?.normative_trace).toEqual([]);
  await expect(amended(control(),{[prefix+':open:'+id]:{quantity:'1',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
  await expect(amended(control(),{[prefix+':open:'+id]:{quantity:'0',unitPrice:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
  await expect(compile({...control(),['hydro_open_'+id.replaceAll('-','_')]:0})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it('keeps all eight included operation rows under the one whole labor owner',async()=>{
  const r = await compile(control());
  expect(d.resources.filter(x=>x.category==='labor'&&x.resource_graph.costTreatment==='OWN_COST').map(x=>x.row_id)).toEqual([prefix+':whole-worker']);
  for (const o of pack.operations) {
    expect(row(r,o.id)?.included_in_estimate).toBe(false); expect(row(r,o.id)?.included_in_procurement).toBe(false);
    expect(d.resources.find(x=>x.row_id===prefix+':'+o.id)?.resource_graph.parentCostOwnerId).toBe(prefix+':whole-worker');
  }
  expect(d.resources.some(x=>String(x.source_metadata?.normativeResourceCode??'').includes('operator'))).toBe(false);
});
it('covers all44declared rows including four derived paid orders and20balance controls',()=>{
  const map = completeness(); expect(map.entries).toHaveLength(44);
  expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
  expect(new Set(map.entries.map(e=>e.expectedResourceId)).size).toBe(44);
  for (const m of pack.materials) expect(map.entries.find(e=>e.expectedResourceId===pack.normId+':'+m.id)).toMatchObject({
    unitId:m.orderUnitId,quantityRule:'DERIVED_PURCHASE_BALANCE_FROM_EXACT_CONSUMPTION_STOCK_RESERVE_QUANTUM'});
});
it('recalculates quantity after a primary change without carrying an old physical pin',async()=>{
  const r = await amended(control(100),{[prefix+':paint']:{quantity:'0.03',unitPrice:'77',provenance}});
  expect(row(r,'paint')?.quantity).toBe('0.03'); expect(row(r,'paint-consumed')?.quantity).toBe('0.00005');
  expect(row(r,'paint:shortage')?.quantity).toBe('0.02'); expect(row(r,'whole-worker')?.quantity).toBe('5.01');
});
it('requires a future explicit root consumer binding before any canonical catalog can be used',()=>{
  expect(()=>compileHydrotestSteelR1('canonical-work:base:plumbing_interior_water_pipe_pressure_test_standard',control()))
    .toThrow('HYDROTEST_ACTUAL_CURRENT_CONSUMER_BINDING_REVIEW_REQUIRED');
  expect(pack.machine.noAdditionalOperatorNormAdmitted).toBe(false); expect(pack.machine.operationScope).toBeNull();
});
