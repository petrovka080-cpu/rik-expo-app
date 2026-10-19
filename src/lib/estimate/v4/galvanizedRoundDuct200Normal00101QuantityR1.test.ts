import {canonicalPublisherPriceBindingIsCompatible} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {roundDuct00101QuantityDefinitionR1 as definition,compileRoundDuct00101ScenarioR1 as scenario,
 roundDuct00101ScenarioFactsR1 as facts,roundDuct00101PackR1 as pack,roundDuct00101PrefixR1 as prefix,
 roundDuct00101PrimaryR1 as primary,roundDuct00101FactIdsR1 as factIds,roundDuct00101NeedRowIdsR1 as needs,
 roundDuct00101NeedParameterIdsR1 as needParameters,roundDuct00101IndependentCompletenessMapR1 as completeness,
} from './galvanizedRoundDuct200Normal00101QuantityR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const physical=pack.physicalSourceRows.map(r=>prefix+':'+r.id),included=pack.operationsIncludedInWholeLabour.map(o=>prefix+':'+o.id),gated=[...physical,...included];
const provenance={kind:'manual',reason:'TEST_ONLY CONTROL77, no supplier quote or project approval'};
const core=async(p:Record<string,unknown>,overrides:Parameters<typeof scenario>[1]={},prices:Parameters<typeof scenario>[2]=[])=>(await scenario(p,overrides,prices)).compiled;
const reference100=['167.86','0.52','0.52','0.39','1.79','0.78','0.015','0.00089','8','0.00501','0.00045','100'];

describe('Catalogue-null КРЕР20-01-001-01 round galvanized duct source-only shared-core cases, NOT RUN by author',()=>{
 it('keeps one exact source column, thirty unique parameters and seventeen gated rows plus ten unresolved needs',()=>{
  const d=definition();expect(d).toMatchObject({catalogId:null,workKey:null,groupId:null,identityAdmitted:false,publicationAllowed:false,fullTechnicalAcceptance:false,
   runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{}});expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([30,27,27]);
  expect(d.parameters.map(p=>p.ordinal)).toEqual(Array.from({length:30},(_,i)=>i));expect(d.resources.map(r=>r.ordinal)).toEqual(Array.from({length:27},(_,i)=>i));
  expect(new Set(d.parameters.map(p=>p.parameter_id)).size).toBe(30);expect(d.parameters.every(p=>p.default_value===null)).toBe(true);
  expect(d.resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id)).toEqual([physical[0]]);
  expect(d.resources.every(r=>!r.procurement_eligible)).toBe(true);expect(d.resources.some(r=>'purchaseBalanceV1' in r.resource_graph)).toBe(false);
 });
 it.each([
  ['100',reference100],['125',['209.825','0.65','0.65','0.4875','2.2375','0.975','0.01875','0.0011125','10','0.0062625','0.0005625','125']],
 ])('compiles the exact vector for%s independently measured surface m2 without route conversion',async(area,expected)=>{
  const r=await core(facts(area as string));expect(r.rows.map(v=>v.row_id)).toEqual(gated);expect(r.rows.slice(0,12).map(v=>v.quantity)).toEqual(expected);
  expect(r.rows.slice(12).map(v=>v.quantity)).toEqual(Array.from({length:5},()=>area));expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual([...needs].sort());
  expect(r.preliminaryNeeds.every(n=>n.quantity===null&&n.unit_price===null&&!n.procurement_eligible)).toBe(true);
  expect(r.rows.every(v=>!v.included_in_procurement&&v.unit_price===null)).toBe(true);expect(r.rows.filter(v=>v.included_in_estimate).map(v=>v.row_id)).toEqual([physical[0]]);
  expect(r.rows.find(v=>v.row_id.endsWith(':pressed-rubber-gasket'))?.unit_id).toBe('kg');expect(r.rows.find(v=>v.row_id.endsWith(':construction-bolts'))?.unit_id).toBe('t');
 });
 it.each(pack.physicalSourceRows.slice(1).map(r=>r.id))('INFO%s stays reference-only through manual and matching snapshot CONTROL77',async suffix=>{
  const id=prefix+':'+suffix,resource=definition().resources.find(r=>r.row_id===id)!;
  for(const route of ['manual','snapshot'] as const){
   const overrides={[id]:{includedInEstimate:true,includedInProcurement:true,provenance,...(route==='manual'?{unitPrice:'77'}:{})}};
   const prices=route==='snapshot'?[{price_key:resource.cost_owner_id!,unit_id:resource.unit_id,unit_price:'77',currency_code:'KGS',snapshot_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}]:[];
   const r=await core(facts(),overrides,prices);expect(r.rows.find(v=>v.row_id===id)).toMatchObject({unit_price:'77',ownership_status:'OWNED_EXCLUDED',included_in_estimate:false,included_in_procurement:false});
   expect(r.totals.amount).toBe('0');expect(r.preliminaryNeeds).toHaveLength(10);
  }
 });
 it.each(gated)('rejects raw row quantity on%s using existing PARAMETERS_ONLY edit authority',async id=>{
  await expect(core(facts(),{[id]:{quantity:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 });
 it.each(factIds)('missing mandatory fact%s prevents every applied source and included row, not merely its price',async id=>{
  const input=facts();delete input[id];const owner=definition().resources[0]!;
  for(const priced of [false,true]){
   const r=await core(input,priced?{[owner.row_id]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:false,provenance}}:{});
   expect(r.rows).toEqual([]);const pending=r.preliminaryNeeds.filter(n=>gated.includes(n.row_id));expect(pending.map(n=>n.row_id)).toEqual(gated);
   expect(pending.map(n=>n.quantity)).toEqual([...reference100,...Array.from({length:5},()=>'100')]);
   expect(pending.every(n=>n.need_state==='CONDITION_REQUIRED'&&n.missing_parameter_ids.includes(id)&&n.calculation_trace!==null&&typeof n.calculation_trace==='object'&&'preliminaryNeed'in n.calculation_trace&&n.calculation_trace.preliminaryNeed===true&&!n.procurement_eligible)).toBe(true);
   expect(r.preliminaryNeeds.filter(n=>needs.includes(n.row_id)).every(n=>n.quantity===null&&n.unit_price===null)).toBe(true);expect(r.totals.amount).toBe('0');
  }
  expect(definition().parameters.find(p=>p.parameter_id===id)).toMatchObject({default_value:null,constraints_json:{requiredWhen:{kind:'greater_than',parameterId:primary,value:0}}});
 });
 const invalid:Array<[string,Record<string,unknown>]>= [
  ['rectangular-neighbour-column',{cross_section_scope:'RECTANGULAR'}],['stainless-coefficient',{material_scope:'STAINLESS_STEEL'}],
  ['aluminium-different-material',{material_scope:'ALUMINIUM'}],['sourceclassP',{tightness_source_class:'P_DENSE'}],['oldprojectclassB',{tightness_source_class:'B'}],
  ['thickness0.7',{steel_thickness_mm:'0.7'}],['diameter200.01',{duct_diameter_mm:'200.01'}],['diameter0',{duct_diameter_mm:'0'}],
  ['negative-diameter',{duct_diameter_mm:'-1'}],['height3.01',{working_height_m:'3.01'}],['negative-height',{working_height_m:'-0.01'}],
  ['negative-area',{[primary]:'-1'}],['clamps-instead-of-bolts',{joint_scope:'CLAMPED_SHINA_NO_BOLTS'}],
  ['new-through-openings',{ready_through_holes:'DRILL_NEW_THROUGH_OPENINGS'}],['route-length-as-area',{measurement_scope:'ROUTE_LENGTH_M'}],
  ['process-plant-equipment',{system_scope:'PROCESS_EQUIPMENT'}],['nuclear-branch',{system_scope:'NUCLEAR_POWER_PLANT_DUCT'}],
  ['separate-pay-five-operations',{payment_boundary:'SEPARATE_ASSEMBLY_LIFT_POSITION_JOINT_LABOUR'}],
 ];
 it.each(invalid)('rejects incompatible source scope%s without selecting another column or coefficient',async(_name,extra)=>{
  await expect(core({...facts(),...extra})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 it.each(pack.openNeeds.map(n=>n.id))('application need%s cannot be replaced by manual0or1/price/order or protected technical input',async id=>{
  const row=prefix+':open:'+id,param='duct00101_application_need_'+id.replaceAll('-','_');
  for(const value of ['0','1']){
   await expect(core(facts(),{[row]:{quantity:value,unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
   await expect(core({...facts(),[param]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  }
  expect(definition().parameters.find(p=>p.parameter_id===param)).toMatchObject({unit_id:null,default_value:null,truth_metadata:{value_source_role:'UNRESOLVED_APPLICATION_NORM',visibility_role:'INTERNAL_ONLY'}});
 });
 it.each(['length_m','q','project_fastening_P_kg','valve_quantity_P','stock_reserve','purchase_package_m2','test_hours_5_percent','machine_hour_price'])('does not invent conversion/order/cost/quantity input%s',async id=>{
  await expect(core({...facts(),[id]:'1'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 it('pays one whole labour owner while machinist and five included operations cannot add a second amount',async()=>{
  const overrides=Object.fromEntries([prefix+':machinists-reference',...included].map(id=>[id,{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}]));
  const r=await core(facts(),{...overrides,[physical[0]!]:{unitPrice:'100',provenance}});expect(r.totals.amount).toBe('16786');
  expect(r.rows.filter(v=>v.included_in_estimate).map(v=>v.row_id)).toEqual([physical[0]]);expect(r.rows.every(v=>!v.included_in_procurement)).toBe(true);
  for(const id of included)expect(definition().resources.find(r=>r.row_id===id)).toMatchObject({cost_owner_id:physical[0],resource_graph:{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',parentCostOwnerId:physical[0]}});
 });
 it('preserves manual title/exclusion/price within this same source without mutating its input',async()=>{
  const override={unitPrice:'77',titleRu:'TEST_ONLY пользовательский единый труд',includedInEstimate:false,includedInProcurement:false,provenance};const before=JSON.stringify(override);
  const r=await core(facts('125'),{[physical[0]!]:override});expect(r.rows[0]).toMatchObject({quantity:'209.825',unit_price:'77',title_ru:override.titleRu,included_in_estimate:false});expect(r.totals.amount).toBe('0');expect(JSON.stringify(override)).toBe(before);
 });
 it('rounds the whole-labour row and total to cents in the existing shared core',async()=>{
  const r=await core(facts('125'),{[physical[0]!]:{unitPrice:'77',provenance}});expect(r.rows[0]).toMatchObject({quantity:'209.825',unit_price:'77',amount:'16156.53'});expect(r.totals.amount).toBe('16156.53');
 });
 it('missing actual surface leaves every literal source quantity null; zero does not invent positive work',async()=>{
  const input=facts();delete input[primary];const r=await core(input);expect(r.rows).toEqual([]);expect(r.preliminaryNeeds.filter(n=>gated.includes(n.row_id))).toHaveLength(17);
  expect(r.preliminaryNeeds.filter(n=>gated.includes(n.row_id)).every(n=>n.quantity===null)).toBe(true);expect(r.totals.amount).toBe('0');
  const zero=await core({[primary]:'0'});expect(zero.rows.every(r=>r.quantity==='0'&&!r.included_in_procurement)).toBe(true);
 });
 it('keeps literal material quantities informational and P/source substitutions unresolved',()=>{
  const d=definition();expect(d.resources.slice(0,12).map(r=>r.source_metadata?.normativeResourceCode)).toEqual(pack.physicalSourceRows.map(r=>r.resourceCode));
  expect(d.resources.slice(17).every(r=>r.unit_id===''&&JSON.stringify(r.source_metadata?.normativeTrace)==='[]'&&JSON.stringify(r.source_metadata?.normative_source_ids)==='[]'&&r.source_metadata?.projectPQuantity===null)).toBe(true);
  expect(d.resources.find(r=>r.row_id.endsWith(':literal-asbestos-cord-reference'))?.source_metadata?.literalAsbestosCordIsNotProductOrApplicationAdmission).toBe(true);
  expect(d.resources.slice(0,17).every(r=>r.resource_graph.derivedQuantityEditPolicyV1!==null)).toBe(true);
  expect(d.formulas.slice(0,17).every(f=>f.input_parameter_ids.length===1&&f.input_parameter_ids[0]===primary)).toBe(true);expect(needParameters).toHaveLength(10);
 });
 it('resolves every finite source/included/full-cycle entry through the existing independent-map contract',()=>{
  const d=definition(),map=completeness();expect(map.generatedFromCurrentRows).toBe(false);expect(map.entries).toHaveLength(27);expect(map.entries.filter(e=>e.quantityRule==='SOURCE_REQUIRED_NOT_QUANTIFIED')).toHaveLength(10);
  expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources]})).toEqual([]);
 });
});

// Exercise the real generic publisher route policy with equal owner/unit preconditions.
it.each([...physical.slice(1),...included])('does not automatically inherit unadmitted reference price on %s',id=>{
 const target=definition().resources.find(r=>r.row_id===id)!;
 const source={...target,source_metadata:{}};
 expect(target.source_metadata?.automaticGenericPriceInheritanceAllowed).toBe(false);
 expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:source,targetResource:target,sourceBindingPriceKey:source.cost_owner_id})).toBe(false);
});
it('retains the existing compatible whole-labour price route policy',()=>{
 const target=definition().resources.find(r=>r.row_id===physical[0])!,source={...target,source_metadata:{}};
 expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:source,targetResource:target,sourceBindingPriceKey:source.cost_owner_id})).toBe(true);
});
