// DRAFT / NOT_RUN. All project facts and prices below are SYNTHETIC.
// No old arithmetic-control result or project revision is an oracle here.
import {createHash} from 'node:crypto';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {stringifyCanonicalEstimateJson} from '../estimateDeterministicHash';
import {effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {knaufProtektor105922DefinitionR1,knaufProtektor105922PackR1 as pack,
  knaufProtektor105922FactsR1 as f} from './knaufProtektor105922ForwardR1';

const hash = (v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
const owner = pack.ownerRowId,prefix = pack.prefix,c = pack.choiceRu;
const SYNTHETIC_FACTS:Record<string,unknown> = {q:'24',interior_plaster_material_system:c.manual,
  knauf_scope_external_corner_scope:c.hasCorners,[f.count]:'3',[f.length]:'2600',
  [f.product]:c.product,[f.exposure]:c.exposure,[f.cutFit]:c.cutFit,
  [f.stock]:'0',[f.reserve]:'0',[f.multiple]:'1'};
const SYNTHETIC_TITLE = 'Мой угловой профиль <105922>';
function compile(facts:Record<string,unknown>,overrides:NonNullable<CanonicalEstimateCompileCoreInput['rowOverrides']>={}) {
  const d = knaufProtektor105922DefinitionR1();
  return compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.targetCatalogIds[0]!,
    compilerVersion:pack.contract+':synthetic-control',primaryMeasureParameterId:f.count,
    parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
    submittedParameters:facts,confirmedParameters:{},rowOverrides:overrides,priceItems:[],currencyCode:'KGS',
    maximumResourceRows:d.resources.length,hashJson:hash});
}
type Result = Awaited<ReturnType<typeof compile>>;
const row = (r:Result,id:string)=>r.rows.find(x=>x.row_id === id);
const need = (r:Result,id:string)=>r.preliminaryNeeds.find(x=>x.row_id === id);
const manual = (quantity:string,unitPrice:string|null='91.23')=>({[owner]:{
  quantity,unitPrice,titleRu:SYNTHETIC_TITLE,provenance:{kind:'manual',reason:'SYNTHETIC_NEW_SKU_ORDER_NOT_PROJECT_PRICE_EVIDENCE'},
}});
const dependent = ['ordered-bars','manufacturer-bundles','remaining','free-after-reserve','consumption-shortage','reserve-deficit'];

test('the descriptor opts in one existing metre owner without defaults, new labour or registry IDs',()=>{
  const d = knaufProtektor105922DefinitionR1();
  expect(d.resources).toHaveLength(10);expect(d.parameters).toHaveLength(13);
  // The standalone model's genuine primary measure is the number of angles.
  // q remains a borrowed parent parameter and is not a standalone formula input.
  expect(d.parameters.find(p=>p.parameter_id===f.count)).toMatchObject({value_type:'integer'});
  expect(d.formulas.find(p=>p.formula_id===prefix+':formula:allocated-bars')?.input_parameter_ids).toEqual([f.count]);
  expect(d.formulas.some(p=>p.input_parameter_ids.includes('q'))).toBe(false);
  expect(d.runtimeInput).toEqual({});expect(d.runtimeClassification).toEqual({});
  expect(d.parameters.every(p=>p.default_value === null)).toBe(true);
  expect(d.resources.filter(r=>r.resource_graph.costTreatment === 'OWN_COST').map(r=>r.row_id)).toEqual([owner]);
  expect(d.resources.every(r=>r.category === 'material')).toBe(true);
  expect(d.resources.find(r=>r.row_id === owner)?.resource_graph.purchaseBalanceV1).toMatchObject({
    unitId:'m',manualQuantumViolationPolicy:'retain-raw-and-block-quantum',orderQuantumExpression:`75*${f.multiple}`});
  expect(pack.productionRegistry.locatorId).toBeNull();expect(pack.manualPolicy.priceCompatibilityGate).toBeNull();
  expect(pack.installationCoverage.newLabourOrMortarRows).toBe(0);
  for(const info of pack.informationRows) {
    const r = d.resources.find(r=>r.row_id === prefix+':'+info.suffix)!;
    expect(r.resource_graph.publicResourcePresentationV1).toMatchObject({nameRu:info.titleRu,detailsRu:[info.detailRu]});
    expect(info.detailRu).not.toMatch(/цен[аыуе]/iu);
    expect(r.resource_graph.derivedQuantityEditPolicyV1).toMatchObject({mode:'PARAMETERS_ONLY',unitId:info.unitId});
  }
});

test('explicit no-corners and the original technology branch cannot be overridden into a profile purchase',async()=>{
  for(const extra of [{knauf_scope_external_corner_scope:c.noCorners},{interior_plaster_material_system:c.legacy}]) {
    const overrides=manual('8'),saved=structuredClone(overrides);
    const result=await compile({...SYNTHETIC_FACTS,...extra},overrides);
    expect(result.rows).toHaveLength(0);expect(result.preliminaryNeeds).toHaveLength(0);
    expect(overrides).toEqual(saved); // Authored input preservation, not a DB-history assertion.
  }
});

test.each([
  ['unknown product',{[f.product]:undefined}],['other product',{[f.product]:c.otherProduct}],
  ['unknown exposure',{[f.exposure]:undefined}],['unsupported exposure',{[f.exposure]:c.otherExposure}],
  ['unknown cut fit',{[f.cutFit]:undefined}],['unsupported cut fit',{[f.cutFit]:c.otherCutFit}],
  ['unknown length',{[f.length]:undefined}],['lower boundary excluded',{[f.length]:'1500'}],
  ['longer than one bar',{[f.length]:'3001'}],
  ['unknown corner scope',{knauf_scope_external_corner_scope:c.unknown}],
] as const)('%s keeps the existing owner as a need despite a manual full-bundle order',async(_label,delta)=>{
  const result=await compile({...SYNTHETIC_FACTS,...delta},manual('75'));
  const open=need(result,owner)!;
  expect(open).toBeDefined();expect(open.quantity).toBe('75');expect(open.title_ru).toBe(SYNTHETIC_TITLE);
  expect(open.unit_price).toBe('91.23');expect(row(result,owner)).toBeUndefined();
  expect(result.derivedParameters[effectiveResourceQuantityParameterId(owner)]).toBeUndefined();
  expect(result.rows.some(x=>x.included_in_procurement)).toBe(false);
});

test('an absent primary count becomes original allocation and owner needs, even with a manual full-bundle order',async()=>{
  const allocated=prefix+':allocated-bars';
  const result=await compile({...SYNTHETIC_FACTS,[f.count]:undefined},manual('75'));
  for(const id of [allocated,owner]) {
    expect(need(result,id)).toBeDefined();
    expect(need(result,id)!.missing_parameter_ids).toContain(f.count);
    expect(row(result,id)).toBeUndefined();
  }
  expect(need(result,allocated)!.quantity).toBeNull();
  expect(need(result,owner)).toMatchObject({quantity:'75',title_ru:SYNTHETIC_TITLE,unit_price:'91.23'});
  expect(result.derivedParameters[effectiveResourceQuantityParameterId(allocated)]).toBeUndefined();
  expect(result.derivedParameters[effectiveResourceQuantityParameterId(owner)]).toBeUndefined();
  expect(result.rows.some(r=>r.included_in_procurement)).toBe(false);
});

test('missing stock, reserve and supplier multiple stay unknown while the independent geometry is retained',async()=>{
  const facts={...SYNTHETIC_FACTS,[f.stock]:undefined,[f.reserve]:undefined,[f.multiple]:undefined};
  const result=await compile(facts,manual('8'));
  expect(row(result,prefix+':installed-length')?.quantity).toBe('7.8');
  expect(row(result,prefix+':allocated-bars')?.quantity).toBe('3');
  const open=need(result,owner)!;
  expect(open.quantity).toBe('8');expect(open.missing_parameter_ids).toEqual(expect.arrayContaining([f.stock,f.reserve,f.multiple]));
  expect((open.calculation_trace as any).purchaseSupplyBlocksV1[0]).toMatchObject({
    rawManualQuantity:'8',reasonCode:'ORDER_QUANTUM_UNCONFIRMED',quantum:null,procurementReady:false});
});

test.each(['8','9007199254740993.000001'])('raw manual Q=%s is retained exactly without fictional physical balances',async quantity=>{
  const overrides=manual(quantity),inputBefore=structuredClone(overrides);
  const result=await compile(SYNTHETIC_FACTS,overrides),paid=row(result,owner)!;
  expect(paid).toMatchObject({quantity,unit_price:'91.23',title_ru:SYNTHETIC_TITLE,included_in_estimate:false,included_in_procurement:false});
  expect(paid.amount == null || paid.amount === '0').toBe(true);
  expect((paid.calculation_trace as any).purchaseSupplyBlocksV1[0]).toMatchObject({
    rawManualQuantity:quantity,quantum:'75',reasonCode:'ORDER_QUANTUM_VIOLATION',physicalBalanceReady:false});
  expect((paid.calculation_trace as any).exactPurchaseQuantityV1.manualQuantityText).toBe(quantity);
  expect(result.purchaseSupplyIndexV1?.owners[0]?.rawManualQuantity).toBe(quantity);
  expect(result.derivedParameters[effectiveResourceQuantityParameterId(owner)]).toBeUndefined();
  for(const suffix of dependent) {
    expect(row(result,prefix+':'+suffix)).toBeUndefined();
    expect(need(result,prefix+':'+suffix)?.quantity).toBeNull();
  }
  expect(row(result,prefix+':allocated-bars')?.quantity).toBe('3');
  expect(overrides).toEqual(inputBefore);
});

test('a valid explicit new-SKU manual order uses the same owner and preserves title, price zero and true pack units',async()=>{
  const facts={...SYNTHETIC_FACTS,[f.multiple]:'2'};
  const result=await compile(facts,manual('150','0'));
  expect(row(result,owner)).toMatchObject({quantity:'150',unit_price:'0',amount:'0',title_ru:SYNTHETIC_TITLE,included_in_procurement:true});
  expect(row(result,prefix+':ordered-bars')?.quantity).toBe('50');
  expect(row(result,prefix+':manufacturer-bundles')?.quantity).toBe('2'); // Not one supplier-quantum group.
  expect(row(result,prefix+':cut-remainder')?.quantity).toBe('1.2');
  expect(row(result,prefix+':remaining')?.quantity).toBe('141');
  expect(result.rows.filter(x=>x.included_in_estimate).map(x=>x.row_id)).toEqual([owner]);
  expect(result.purchaseSupplyIndexV1).toBeUndefined();
});

test('clearing the manual order returns to the same canonical formula without supplying a price',async()=>{
  const result=await compile(SYNTHETIC_FACTS);
  expect(row(result,owner)).toMatchObject({quantity:'75',unit_price:null});
  expect(row(result,prefix+':manufacturer-bundles')?.quantity).toBe('1');
  expect(result.rows.filter(x=>x.included_in_procurement).map(x=>x.row_id)).toEqual([owner]);
});

test.each([
  [f.count,'1.5','invalid integer'],[f.stock,'0.5','invalid integer'],
  [f.reserve,'-1','parameter below minimum'],[f.multiple,'0','parameter below minimum'],
] as const)('known invalid %s=%s is rejected by its exact parameter rule',async(id,value,message)=>{
  await expect(compile({...SYNTHETIC_FACTS,[id]:value},manual('75'))).rejects.toMatchObject({
    name:'CanonicalParameterValidationError',code:'PARAMETER_VALIDATION_FAILED',message:`${message} ${id}`,
  });
});

test('manual edits of derived allocation are rejected and forged effective inputs cannot supply applicability',async()=>{
  const allocated=prefix+':allocated-bars';
  await expect(compile(SYNTHETIC_FACTS,{[allocated]:{quantity:'3',provenance:{kind:'manual'}}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
  const result=await compile({...SYNTHETIC_FACTS,[f.length]:undefined,
    [effectiveResourceQuantityParameterId(allocated)]:'3'},manual('75'));
  expect(need(result,owner)).toBeDefined();expect(row(result,owner)).toBeUndefined();
});
