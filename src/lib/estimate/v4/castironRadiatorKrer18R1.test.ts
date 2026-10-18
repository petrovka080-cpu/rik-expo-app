// Prospective WORK cases using the actual shared compiler. NOT_RUN, no current consumer acceptance.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {castironRadiatorPackR1 as pack,castironRadiatorPrefixR1 as prefix,castironRadiatorDefinitionR1 as definition,
  compileCastironRadiatorR1,castironRadiatorCompletenessMapR1 as completeness} from './castironRadiatorKrer18R1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const d=definition(),catalogId=pack.workOnlyTestCatalogId;
const control=(kw=25.5,prepKW=10.2):Record<string,unknown>=>{
  const p:Record<string,unknown>={[pack.primaryMeasureParameterId]:kw,[pack.preparationModeParameterId]:'REQUIRES_PREPARATION',
    [pack.preparationParameterId]:prepKW,preparation_method_reference:'CONTROL_ONLY required regrouping/approved local test'};
  for(const f of pack.scopeFacts)p[f.id]=f.value;
  for(const f of pack.projectReferenceFacts)p[f.id]='CONTROL_ONLY actual project output/fixing/access reference';
  for(const m of pack.materials){p[m.parameterPrefix+'_specification']='CONTROL_ONLY exact '+m.nameRu;
    p[m.parameterPrefix+'_stock']=0;p[m.parameterPrefix+'_reserve']=0;
    p[m.parameterPrefix+'_quantum']=m.orderUnitId==='pcs'?1:m.orderUnitId==='m3'?(m.id==='prep-water'?0.01:0.001):0.1;}
  return p;
};
const compile=(p:Record<string,unknown>)=>compileCastironRadiatorR1(catalogId,p);
const amended=(p:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides'])=>compileCanonicalEstimateCore({
  operation:'recalculate',catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:pack.primaryMeasureParameterId,
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:p,
  confirmedParameters:{...d.runtimeInput},rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:78,
  hashJson:async value=>estimateDeterministicHash(value)});
type Result=Awaited<ReturnType<typeof compile>>;
const row=(r:Result,id:string)=>r.rows.find(x=>x.row_id===prefix+':'+id);
const need=(r:Result,id:string)=>r.preliminaryNeeds.find(x=>x.row_id===prefix+':'+id);
const provenance={kind:'manual',reason:'CONTROL_ONLY saved material order amendment, not accepted normative or project evidence'};
const infoIds=[...pack.machines.map(m=>m.id),pack.operators.id,pack.radiatorSource.id];

it('pins the exact official heating PDF without using historical base prices or choosing a current identity',()=>{
  expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.source.path))).digest('hex')).toBe(pack.source.sha256);
  expect(pack.source.sourceBasePricesUsed).toBe(false);expect(pack.catalogBinding).toBeNull();expect(pack.publicationAllowed).toBe(false);
  expect(pack.fullTechnicalAcceptance).toBe(false);expect(pack.sourceId).toBe(pack.sourceId.toLowerCase());
});
it('uses nominal project kW as primary and a separate prep subset, without a pcs multiplication',()=>{
  expect(d.ordinaryParameterIds).toEqual(['installed_nominal_output_kw']);
  expect(d.parameters.find(p=>p.parameter_id===pack.primaryMeasureParameterId)?.unit_id).toBe('kW');
  expect(d.parameters.find(p=>p.parameter_id===pack.preparationParameterId)?.constraints_json).toMatchObject({lessThanOrEqualParameter:pack.primaryMeasureParameterId});
  expect(d.parameters.every(p=>p.default_value===null)).toBe(true);expect(pack.radiatorSource.pcsBridgeAdmitted).toBe(false);
  expect(d.formulas.some(f=>f.input_parameter_ids.includes(pack.primaryMeasureParameterId))).toBe(true);
});
it.each([
  [100,40,'75.7','15','2.72','0.14','2.58','0.21','3.34','0.00632','253','0.324','124','0.00164','3.2'],
  [25.5,10.2,'19.3035','3.825','0.6936','0.0357','0.6579','0.05355','0.8517','0.0016116','64.515','0.08262','31.62','0.0004182','0.816'],
] as const)('retains independently transcribed01/04 source quantities at%s kW with%s prep kW',async(kw,prepKW,labor,prepLabor,operators,crane,hoist,drill,truck,dowels,brackets,water,gaskets,oil,plugs)=>{
  const r=await compile(control(kw,prepKW));
  for(const [id,q] of [['install-worker',labor],['prep-worker',prepLabor],['included-operators',operators],['truck-crane',crane],['mast-hoist',hoist],
    ['electric-drill',drill],['flatbed-truck',truck],['calibrated-head-dowels-consumed',dowels],['brackets-131-consumed',brackets],
    ['brackets-325-consumed',brackets],['prep-water-consumed',water],['paronite-gaskets-consumed',gaskets],['linseed-oil-consumed',oil],['radiator-plugs-consumed',plugs]])
    expect(row(r,id)?.quantity).toBe(q);
  expect(row(r,pack.radiatorSource.id)?.quantity).toBe(String(kw));expect(r.preliminaryNeeds).toHaveLength(8);
});
it('excludes all preparation04 quantities for confirmed factory-ready radiators and does not invent a zero input',async()=>{
  const p=control();p[pack.preparationModeParameterId]='FACTORY_READY_NO_PREPARATION';delete p[pack.preparationParameterId];delete p.preparation_method_reference;
  for(const m of pack.materials.filter(x=>x.branch==='PREPARATION'))for(const k of Object.keys(p))if(k.startsWith(m.parameterPrefix+'_'))delete p[k];
  const r=await compile(p);expect(row(r,'install-worker')?.quantity).toBe('19.3035');
  expect(row(r,'prep-worker')).toBeUndefined();for(const o of pack.operations.filter(x=>x.branch==='PREPARATION'))expect(row(r,o.id)).toBeUndefined();
  expect(r.preliminaryNeeds.filter(x=>!x.row_id.includes(':open:'))).toHaveLength(0);expect(r.preliminaryNeeds).toHaveLength(8);
  expect(r.parameters[pack.preparationParameterId]).toBeUndefined();
});
it('does not silently select factory-ready or04 when preparation status is unknown',async()=>{
  const p=control();delete p[pack.preparationModeParameterId];const r=await compile(p);
  expect(row(r,'install-worker')).toBeUndefined();expect(need(r,'install-worker')?.missing_parameter_ids).toContain(pack.preparationModeParameterId);
});
it.each([{radiator_material_scope:'STEEL_PANEL_TYPE22'},{radiator_material_scope:'ALUMINIUM'},{radiator_material_scope:'CONVECTOR'},
  {nominal_output_basis:'BUILDING_HEAT_LOSS_W_PER_M2'},{nominal_output_basis:'RADIATOR_PIECE_COUNT'},{fixing_substrate_scope:'DRYWALL_PARTITION_UNDESIGNED'},
  {installed_nominal_output_kw:0},{installed_nominal_output_kw:-1},{preparation_nominal_output_kw:26},{preparation_nominal_output_kw:0}])(
  'rejects an incompatible or invalid physical branch%j',async change=>{
    await expect(compile({...control(),...change})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  });
it('rejects a contradictory nonzero preparation subset under factory-ready status',async()=>{
  await expect(compile({...control(),[pack.preparationModeParameterId]:'FACTORY_READY_NO_PREPARATION'}))
    .rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it.each(pack.projectReferenceFacts.map(f=>f.id))('keeps source facts explicit when%s is absent',async id=>{
  const p=control();delete p[id];const r=await compile(p);expect(row(r,'install-worker')).toBeUndefined();
  expect(need(r,'install-worker')?.missing_parameter_ids).toContain(id);expect(need(r,'install-worker')?.quantity).toBe('19.3035');
});
it.each([pack.preparationParameterId,'preparation_method_reference'])('does not guess missing preparation fact%s',async id=>{
  const p=control();delete p[id];const r=await compile(p);expect(row(r,'install-worker')?.quantity).toBe('19.3035');
  expect(row(r,'prep-worker')).toBeUndefined();expect(need(r,'prep-worker')?.missing_parameter_ids).toContain(id);
});
it.each(pack.materials.map(m=>m.id))('does not invent supplier stock for%s',async id=>{
  const m=pack.materials.find(x=>x.id===id)!,p=control();delete p[m.parameterPrefix+'_stock'];const r=await compile(p);
  expect(row(r,id+'-consumed')).toBeDefined();expect(row(r,id)).toBeUndefined();expect(need(r,id)?.missing_parameter_ids).toContain(m.parameterPrefix+'_stock');
});
it.each(pack.materials.map(m=>m.id))('requires exact positive-stock compatibility for%s',async id=>{
  const m=pack.materials.find(x=>x.id===id)!,r=await compile({...control(),[m.parameterPrefix+'_stock']:1});
  expect(row(r,id)).toBeUndefined();expect(need(r,id)?.missing_parameter_ids).toContain(m.parameterPrefix+'_stock_reference');
});
it('scales printed hundreds/thousands exactly and rounds only the order quantum',async()=>{
  const r=await compile(control());expect(row(r,'brackets-131-consumed')?.quantity).toBe('64.515');expect(row(r,'brackets-325-consumed')?.quantity).toBe('64.515');
  expect(row(r,'brackets-131')?.quantity).toBe('65');expect(row(r,'brackets-325')?.quantity).toBe('65');
  expect(row(r,'paronite-gaskets')?.quantity).toBe('32');expect(row(r,'calibrated-head-dowels')?.quantity).toBe('1.7');
  expect(row(r,'linseed-oil')?.quantity).toBe('0.5');expect(row(r,'prep-water')?.quantity).toBe('0.09');expect(row(r,'radiator-plugs')?.quantity).toBe('1');
});
it('retains material quantity/title/price77 and saved exclusions while source consumption stays derived',async()=>{
  const r=await amended(control(),{[prefix+':brackets-131']:{quantity:'77',unitPrice:'77',titleRu:'CONTROL_ONLY bracket131 exact order',provenance},
    [prefix+':brackets-325']:{includedInEstimate:false,includedInProcurement:false,provenance}});
  expect(row(r,'brackets-131')).toMatchObject({quantity:'77',unit_price:'77',amount:'5929',title_ru:'CONTROL_ONLY bracket131 exact order'});
  expect(row(r,'brackets-131-consumed')?.quantity).toBe('64.515');expect(row(r,'brackets-325-consumed')?.quantity).toBe('64.515');
  expect(row(r,'brackets-325')).toMatchObject({included_in_estimate:false,included_in_procurement:false});expect(r.preliminaryNeeds).toHaveLength(8);
});
it('keeps consumption shortage and protected-reserve deficit distinct',async()=>{
  const r=await amended({...control(),rad_brackets_131_reserve:10},{[prefix+':brackets-131']:{quantity:'65',provenance},[prefix+':prep-water']:{quantity:'0.01',provenance}});
  expect(row(r,'brackets-131:reserve-deficit')?.quantity).toBe('9.515');expect(row(r,'brackets-131:shortage')).toBeUndefined();
  expect(row(r,'prep-water:shortage')?.quantity).toBe('0.07262');
});
it.each(infoIds)('never pays or procures informational scope%s from a scalar price or inclusion request',async id=>{
  const r=await amended(control(),{[prefix+':'+id]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}});
  expect(row(r,id)).toMatchObject({included_in_estimate:false,included_in_procurement:false});expect(r.preliminaryNeeds).toHaveLength(8);
});
it.each(infoIds)('rejects a manual quantity77 pin on informational source scope%s',async id=>{
  await expect(amended(control(),{[prefix+':'+id]:{quantity:'77',unitPrice:'77',includedInEstimate:true,provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it.each(pack.gaps.map(g=>g.id))('retains the concrete application need%s and rejects invented closures',async id=>{
  const r=await compile(control());expect(need(r,'open:'+id)?.quantity).toBeNull();expect(need(r,'open:'+id)?.normative_trace).toEqual([]);
  for(const q of ['0','1'])await expect(amended(control(),{[prefix+':open:'+id]:{quantity:q,unitPrice:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
  await expect(compile({...control(),['radiator_open_'+id.replaceAll('-','_')]:0})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it('keeps installation and conditional preparation operations under their separate whole-labour owners',async()=>{
  const r=await compile(control());expect(d.resources.filter(x=>x.category==='labor'&&x.resource_graph.costTreatment==='OWN_COST').map(x=>x.row_id).sort())
    .toEqual([prefix+':install-worker',prefix+':prep-worker']);
  for(const o of pack.operations){expect(row(r,o.id)?.included_in_estimate).toBe(false);
    expect(d.resources.find(x=>x.row_id===prefix+':'+o.id)?.resource_graph.parentCostOwnerId).toBe(prefix+':'+o.parentLaborId);}
});
it('covers all78 rows including eight derived paid orders,40 controls and eight unbound needs',()=>{
  const map=completeness();expect(d.resources).toHaveLength(78);expect(map.entries).toHaveLength(78);expect(new Set(map.entries.map(x=>x.expectedResourceId)).size).toBe(78);
  expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
  expect(d.resources.filter(x=>x.category==='equipment'&&x.resource_graph.costTreatment==='OWN_COST')).toHaveLength(0);
});
it('does not create thermal-test3% hours, material percentage or a hidden priced owner',()=>{
  expect(d.formulas.some(f=>String(f.expression_source).includes('0.03'))).toBe(false);
  expect(d.resources.filter(x=>x.row_id.includes('thermal-commissioning-money-basis')).every(x=>x.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM')).toBe(true);
});
it('refuses the existing steel-panel pcs catalog before actual owner review',()=>{
  expect(()=>compileCastironRadiatorR1('canonical-work:base:heating_hvac_interior_radiator_install_standard',control()))
    .toThrow('CASTIRON_RADIATOR_CURRENT_CONSUMER_BINDING_REVIEW_REQUIRED');
});
it('rejects claimed full-scope machine evidence while this candidate has no exact machine admission',async()=>{
  const machineHourPriceCoverageV1={contractVersion:'canonical-machine-hour-price-coverage/v1',resourceCode:'33-0241',unitId:'machine_hour',currencyCode:'KGS',unitPrice:'77',
    billingBasis:'MACHINE_HOUR',operationScope:'FULL_SOURCE_OPERATION',minimumBillableHours:'0',fixedFees:'0',separateNormedInputs:'EXCLUDED_FROM_RATE',
    source:{kind:'MANUAL',rowId:prefix+':electric-drill',priceProvenanceReason:provenance.reason}};
  await expect(amended(control(),{[prefix+':electric-drill']:{unitPrice:'77',includedInEstimate:true,machineHourPriceCoverageV1,provenance}}))
    .rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it('recalculates changed primary output while retaining an explicit saved material order and visible shortage',async()=>{
  const r=await amended(control(100,40),{[prefix+':brackets-131']:{quantity:'77',unitPrice:'77',provenance}});
  expect(row(r,'install-worker')?.quantity).toBe('75.7');expect(row(r,'prep-worker')?.quantity).toBe('15');
  expect(row(r,'brackets-131-consumed')?.quantity).toBe('253');expect(row(r,'brackets-131:shortage')?.quantity).toBe('176');
});
