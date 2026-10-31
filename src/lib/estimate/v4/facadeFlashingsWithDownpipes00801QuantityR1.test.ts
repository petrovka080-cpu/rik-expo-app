import {facadeDownpipes00801QuantityDefinitionR1 as definition,compileFacadeDownpipes00801ScenarioR1 as scenario,
 facadeDownpipes00801ScenarioFactsR1 as facts,facadeDownpipes00801PackR1 as pack,facadeDownpipes00801PrefixR1 as prefix,
 facadeDownpipes00801PrimaryR1 as primary,facadeDownpipes00801FactIdsR1 as factIds,facadeDownpipes00801NeedRowIdsR1 as needs,
 facadeDownpipes00801NeedParameterIdsR1 as needParameters,facadeDownpipes00801IndependentCompletenessMapR1 as completeness,
} from './facadeFlashingsWithDownpipes00801QuantityR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {canonicalPublisherPriceBindingIsCompatible} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
const physical=pack.physicalSourceRows.map(r=>prefix+':'+r.id),included=pack.operationsIncludedInWholeLabour.map(o=>prefix+':'+o.id),gated=[...physical,...included];
const provenance={kind:'manual',reason:'TEST_ONLY CONTROL77; no actual supplier price or approved project'};
const core=async(p:Record<string,unknown>,overrides:Parameters<typeof scenario>[1]={},prices:Parameters<typeof scenario>[2]=[])=>(await scenario(p,overrides,prices)).compiled;
const vector100=['13.4','0.03','0.0014','0.0112','0.0039','0.053'];

describe('Catalogue-null composite facade flashings with downpipes00801, shared-core prospective cases NOT_RUN',()=>{
 it('keeps26parameters/17formulas/17resources and one paid owner, with no catalog or hidden project defaults',()=>{
  const d=definition();expect(d).toMatchObject({catalogId:null,workKey:null,groupId:null,identityAdmitted:false,publicationAllowed:false,fullTechnicalAcceptance:false,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{}});
  expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([26,17,17]);expect(d.parameters.map(p=>p.ordinal)).toEqual(Array.from({length:26},(_,i)=>i));expect(d.resources.map(r=>r.ordinal)).toEqual(Array.from({length:17},(_,i)=>i));
  expect(d.parameters.every(p=>p.default_value===null)).toBe(true);expect(d.resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id)).toEqual([physical[0]]);
  expect(d.resources.every(r=>!r.procurement_eligible)).toBe(true);expect(d.resources.some(r=>'purchaseBalanceV1' in r.resource_graph)).toBe(false);
 });
 it.each([
  ['100',vector100],['125',['16.75','0.0375','0.00175','0.014','0.004875','0.06625']],
 ])('compiles%s gross facade m2 using the exact full00801 vector, not independent pipe metres',async(area,expected)=>{
  const r=await core(facts(area as string));expect(r.rows.map(r=>r.row_id)).toEqual(gated);expect(r.rows.slice(0,6).map(r=>r.quantity)).toEqual(expected);expect(r.rows.slice(6).map(r=>r.quantity)).toEqual([area,area,area]);
  expect(r.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id)).toEqual([physical[0]]);expect(r.rows.every(r=>!r.included_in_procurement&&r.unit_price===null)).toBe(true);
  expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual([...needs].sort());expect(r.preliminaryNeeds.every(n=>n.quantity===null&&n.unit_price===null&&!n.procurement_eligible)).toBe(true);
  expect(r.rows.some(r=>r.unit_id==='m'||r.unit_id==='linear_m'||r.unit_id==='pcs')).toBe(false);
 });
 it.each(pack.physicalSourceRows.slice(1).map(r=>r.id))('keeps INFO%s nonfinancial and nonprocurement through manual/snapshot77',async suffix=>{
  const id=prefix+':'+suffix,resource=definition().resources.find(r=>r.row_id===id)!;
  for(const route of ['manual','snapshot'] as const){
   const r=await core(facts(),{[id]:{includedInEstimate:true,includedInProcurement:true,provenance,...(route==='manual'?{unitPrice:'77'}:{})}},
    route==='snapshot'?[{price_key:resource.cost_owner_id!,unit_id:resource.unit_id,unit_price:'77',currency_code:'KGS',snapshot_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}]:[]);
   expect(r.rows.find(v=>v.row_id===id)).toMatchObject({unit_price:'77',ownership_status:'OWNED_EXCLUDED',included_in_estimate:false,included_in_procurement:false});expect(r.totals.amount).toBe('0');expect(r.preliminaryNeeds).toHaveLength(8);
  }
 });
 it.each(gated)('manual8.5 on%s is an explicit amendment, never a neighbour-derived source norm',async id=>{
  const source=definition(),sourceBefore=JSON.stringify(source),input=facts();
  const overrides={[id]:{quantity:'8.5',provenance:provenance}},inputBefore=JSON.stringify({input,overrides});
  const before=await core(input),after=await core(input,overrides);
  const original=before.rows.find(r=>r.row_id===id)!,edited=after.rows.find(r=>r.row_id===id)!;
  expect(original).toBeDefined();expect(edited).toBeDefined();
  const authoredFormulaId=source.resources.find(resource=>resource.row_id===id)!.formula_id;
  expect(original.calculation_trace).toMatchObject({formulaId:authoredFormulaId});
  expect(edited).toMatchObject({row_id:id,quantity:'8.5',unit_id:original.unit_id,
    included_in_estimate:original.included_in_estimate,included_in_procurement:false,unit_price:null,amount:null,
    calculation_trace:{manualQuantityOverride:true,manualAmendment:provenance,calculatedQuantityBeforeOverride:original.quantity}});
  expect(edited.calculation_trace).toMatchObject({formulaId:authoredFormulaId,
    formulaAstSha256:source.formulas.find(f=>f.formula_id===authoredFormulaId)!.ast_sha256});
  expect(edited.normative_trace).toEqual(original.normative_trace);
  expect((edited.calculation_trace as Record<string,unknown>).resourceGraph).toEqual((original.calculation_trace as Record<string,unknown>).resourceGraph);
  expect(after.rows.map(r=>r.row_id)).toEqual(before.rows.map(r=>r.row_id));
  expect(after.rows.filter(r=>r.row_id!==id)).toEqual(before.rows.filter(r=>r.row_id!==id));
  expect(after.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id)).toEqual(before.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id));
  expect(after.rows.every(r=>!r.included_in_procurement)).toBe(true);
  expect(after.preliminaryNeeds).toEqual(before.preliminaryNeeds);expect(after.totals.amount).toBe('0');
  expect(JSON.stringify({input,overrides})).toBe(inputBefore);expect(JSON.stringify(source)).toBe(sourceBefore);
  await expect(core(input,{[id]:{quantity:'8.5'}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 });
 it.each(factIds)('missing mandatory composite fact%s prevents paid application while conditional source references may remain',async id=>{
  const input=facts();delete input[id];const r=await core(input,{[physical[0]!]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:false,provenance}});
  expect(r.rows).toEqual([]);const conditional=r.preliminaryNeeds.filter(n=>gated.includes(n.row_id));expect(conditional.map(n=>n.row_id)).toEqual(gated);
  expect(conditional.map(n=>n.quantity)).toEqual([...vector100,'100','100','100']);expect(conditional.every(n=>n.need_state==='CONDITION_REQUIRED'&&n.missing_parameter_ids.includes(id)&&!n.procurement_eligible)).toBe(true);
  expect(r.preliminaryNeeds.filter(n=>needs.includes(n.row_id)).every(n=>n.quantity===null)).toBe(true);expect(r.totals.amount).toBe('0');
  expect(definition().parameters.find(p=>p.parameter_id===id)).toMatchObject({default_value:null,constraints_json:{requiredWhen:{kind:'greater_than',parameterId:primary,value:0}}});
 });
 const invalid:Array<[string,Record<string,unknown>]>= [
  ['pipe-only',{work_scope:'DOWNSPOUT_ONLY_PER_LINEAR_METRE'}],['00801minus00802',{work_scope:'DOWNPIPE_DIFFERENCE_00801_MINUS_00802'}],
  ['without-pipes00802',{work_scope:'FLASHINGS_WITHOUT_PIPES_00802'}],['hanging-gutters00902',{work_scope:'HANGING_GUTTERS00902'}],
  ['net-facade',{measurement_scope:'FACADE_MINUS_OPENINGS'}],['roof-area',{measurement_scope:'ROOF_AREA_M2'}],['metal-area',{measurement_scope:'SHEET_COVER_AREA_M2'}],['pipe-metres',{measurement_scope:'DOWNPIPE_LENGTH_M'}],
  ['factory-pipe-kit',{pipe_method:'READY_FACTORY_PIPE_KIT'}],['PVC',{material_scope:'PVC_PIPES'}],['other-steel',{material_scope:'BLACK_STEEL'}],['thickness0.5',{steel_thickness_mm:'0.5'}],
  ['wrong-fixing-base',{fastening_scope:'UNCONFIRMED_BASE_OR_DIFFERENT_ANCHORS'}],['adjacent008009010merge',{adjacent_scope:'MERGE_SAME_AREA_ALL_GUTTER_AND_COVER_OWNERS'}],
  ['repeat-pipe-labour',{payment_boundary:'ADD_PIPE_INSTALLATION_TO_EXISTING00801_LABOUR'}],['cold-weather',{conditions_scope:'FREEZING_TEMPERATURE_WITH_IMPLICIT_COEFFICIENT'}],
  ['height15.01',{working_height_m:'15.01'}],['negative-height',{working_height_m:'-1'}],['negative-area',{[primary]:'-1'}],['unconfirmed-coefficient',{coefficient_scope:'AUTOMATIC_HIGH_ALTITUDE_OR_HEIGHT_COEFFICIENT'}],
 ];
 it.each(invalid)('rejects scope%s rather than silently changing measure/material/column or pay owner',async(_name,extra)=>{
  await expect(core({...facts(),...extra})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 it.each(pack.openNeeds.map(n=>n.id))('manual0/1 on need%s remains preliminary; protected source input still rejects',async id=>{
  const row=prefix+':open:'+id,param='facade00801_application_need_'+id.replaceAll('-','_');for(const value of ['0','1']){
   const source=definition(),sourceBefore=JSON.stringify(source),input=facts();
   const overrides={[row]:{quantity:value,unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance:provenance}},inputBefore=JSON.stringify({input,overrides});
   const before=await core(input),after=await core(input,overrides),original=before.preliminaryNeeds.find(n=>n.row_id===row)!,need=after.preliminaryNeeds.find(n=>n.row_id===row)!;
   expect(original).toBeDefined();expect(need).toBeDefined();expect(original.quantity).toBeNull();
   expect(need).toMatchObject({row_id:row,quantity:value,unit_price:'77',unit_id:'',selected:false,procurement_eligible:false,
     need_state:original.need_state,formula_id:original.formula_id,
     calculation_trace:{preliminaryNeed:true,manualQuantityOverride:true,manualAmendment:provenance,calculatedQuantityBeforeOverride:null}});
   expect(need.missing_parameter_ids).toEqual(original.missing_parameter_ids);expect(need.missing_parameter_ids).toContain(param);
   expect(need.normative_trace).toEqual([]);
   expect(need.calculation_trace).toMatchObject({formulaId:original.formula_id,formulaAstSha256:source.formulas.find(f=>f.formula_id===original.formula_id)!.ast_sha256});
   expect((need.calculation_trace as Record<string,unknown>).resourceGraph).toEqual((original.calculation_trace as Record<string,unknown>).resourceGraph);
   expect(after.rows).toEqual(before.rows);expect(after.preliminaryNeeds.map(n=>n.row_id)).toEqual(before.preliminaryNeeds.map(n=>n.row_id));
   expect(after.preliminaryNeeds.filter(n=>n.row_id!==row)).toEqual(before.preliminaryNeeds.filter(n=>n.row_id!==row));
   expect(after.rows.some(r=>r.row_id===row)).toBe(false);expect(after.totals.amount).toBe('0');
   expect(JSON.stringify({input,overrides})).toBe(inputBefore);expect(JSON.stringify(source)).toBe(sourceBefore);
   await expect(core(input,{[row]:{quantity:value}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
   await expect(core({...facts(),[param]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  }
  expect(definition().parameters.find(p=>p.parameter_id===param)).toMatchObject({unit_id:null,default_value:null,truth_metadata:{value_source_role:'UNRESOLVED_APPLICATION_NORM',visibility_role:'INTERNAL_ONLY'}});
 });
 it.each(['pipe_length_m','roof_area_m2','metal_area_m2','q','forgings_piece','wire_length_m','height_extra_coefficient','pipe_package_m','operator_hours'])('cannot add unconfirmed conversion/order/operator parameter%s',async id=>{
  await expect(core({...facts(),[id]:'1'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 it('pays the whole13.4h once and never sells three included operations separately',async()=>{
  const r=await core(facts(),{[physical[0]!]:{unitPrice:'100',provenance},...Object.fromEntries(included.map(id=>[id,{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}]))});
  expect(r.totals.amount).toBe('1340');expect(r.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id)).toEqual([physical[0]]);expect(r.rows.every(r=>!r.included_in_procurement)).toBe(true);
  for(const id of included)expect(definition().resources.find(r=>r.row_id===id)).toMatchObject({cost_owner_id:physical[0],resource_graph:{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',parentCostOwnerId:physical[0]}});
 });
 it('preserves same-method manual title/exclusion/reference77 without mutating input or changing facade measure',async()=>{
  const override={unitPrice:'77',titleRu:'TEST_ONLY единый состав фасадных обделок и труб',includedInEstimate:false,includedInProcurement:false,provenance};const before=JSON.stringify(override);
  const r=await core(facts('125'),{[physical[0]!]:override});expect(r.rows[0]).toMatchObject({quantity:'16.75',unit_price:'77',title_ru:override.titleRu,included_in_estimate:false});expect(r.totals.amount).toBe('0');expect(JSON.stringify(override)).toBe(before);
 });
 it('keeps an exact CONTROL77 whole-owner amount while labour procurement remains forbidden',async()=>{
  const r=await core(facts('125'),{[physical[0]!]:{unitPrice:'77',provenance}});expect(r.rows[0]).toMatchObject({quantity:'16.75',unit_price:'77',amount:'1289.75'});expect(r.totals.amount).toBe('1289.75');
  await expect(core(facts(),{[physical[0]!]:{includedInProcurement:true,unitPrice:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 });
 it('does not infer a positive facade scope from missing area or a zero declaration',async()=>{
  const input=facts();delete input[primary];const r=await core(input);expect(r.rows).toEqual([]);expect(r.preliminaryNeeds.filter(n=>gated.includes(n.row_id))).toHaveLength(9);expect(r.preliminaryNeeds.filter(n=>gated.includes(n.row_id)).every(n=>n.quantity===null)).toBe(true);
  const zero=await core({[primary]:'0'});expect(zero.rows.every(r=>r.quantity==='0'&&!r.included_in_procurement)).toBe(true);
 });
 it('keeps six source rows, no invented machinist hours, and needs without borrowed trace',()=>{
  const d=definition();expect(d.resources.slice(0,6).map(r=>r.source_metadata?.normativeResourceCode)).toEqual(pack.physicalSourceRows.map(r=>r.resourceCode));expect(d.resources.slice(0,6).filter(r=>r.unit_id==='man_hour').map(r=>r.row_id)).toEqual([physical[0]]);
  expect(d.resources.slice(9).every(r=>r.unit_id===''&&JSON.stringify(r.source_metadata?.normativeTrace)==='[]'&&JSON.stringify(r.source_metadata?.normative_source_ids)==='[]'&&r.source_metadata?.standalonePipeQuantity===null)).toBe(true);
  expect(d.resources.slice(0,9).every(r=>r.source_metadata?.standalonePipeQuantityNotDerived===true)).toBe(true);expect(needParameters).toHaveLength(8);expect(d.formulas.slice(0,9).every(f=>f.input_parameter_ids.length===1&&f.input_parameter_ids[0]===primary)).toBe(true);
 });
 it('resolves every source/included/full-cycle entry through the existing independent-map contract',()=>{
  const d=definition(),map=completeness();expect(map.generatedFromCurrentRows).toBe(false);expect(map.entries).toHaveLength(17);expect(map.entries.filter(e=>e.quantityRule==='SOURCE_REQUIRED_NOT_QUANTIFIED')).toHaveLength(8);
  expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources]})).toEqual([]);
 });

 it.each([...physical.slice(1),...included])('refuses generic publisher price inheritance for nonpaid%s even with identical unit/effective owner/key',id=>{
  const target=definition().resources.find(r=>r.row_id===id)!,source={...target,source_metadata:{}};
  expect(target.source_metadata?.automaticGenericPriceInheritanceAllowed).toBe(false);
  expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:source,targetResource:target,sourceBindingPriceKey:source.cost_owner_id})).toBe(false);
 });
 it('keeps compatible whole-worker price inheritance available without giving INFO or included rows its owner rights',()=>{
  const target=definition().resources.find(r=>r.row_id===physical[0])!,source={...target,source_metadata:{}};
  expect(target.source_metadata?.automaticGenericPriceInheritanceAllowed).toBeUndefined();
  expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:source,targetResource:target,sourceBindingPriceKey:source.cost_owner_id})).toBe(true);
 });
 it('declares unresolved needs noninheriting without filling their source, unit, quantity or order',()=>{
  const targets=definition().resources.filter(r=>needs.includes(r.row_id));expect(targets).toHaveLength(8);
  for(const target of targets)expect(target).toMatchObject({unit_id:'',procurement_eligible:false,source_metadata:{automaticGenericPriceInheritanceAllowed:false,normativeTrace:[],normative_source_ids:[]}});
 });
});
