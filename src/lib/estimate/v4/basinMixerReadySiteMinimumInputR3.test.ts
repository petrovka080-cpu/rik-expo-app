import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {basinMixerReadySiteMinimumInputDefinitionR3 as definition,basinMixerReadySiteMinimumInputR3 as profile} from './basinMixerReadySiteMinimumInputR3';

const id=(key:string)=>profile.prefix+':'+key;
const facts={[profile.countParameterId]:'3',[profile.siteParameterId]:profile.siteValueRu};
const run=(input:Record<string,string>,rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={})=>{
 const d=definition();return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides).length?'recalculate':'compile',
  catalogId:profile.catalogId,compilerVersion:profile.contract,primaryMeasureParameterId:profile.countParameterId,
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
  submittedParameters:input,confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:128,hashJson:estimateDeterministicHash});
};
const row=(r:Awaited<ReturnType<typeof run>>,key:string)=>r.rows.find(value=>value.row_id===id(key))!;

it('calculates one purchase and one installation from count and a real ready-site fact, with no quantity questionnaire for included tools',async()=>{
 const result=await run(facts);
 expect(result.rows.filter(value=>value.included_in_estimate).map(value=>[value.row_id,value.quantity])).toEqual([
  [id('kit-order'),'3'],[id('complete-installation-work'),'3']]);
 expect(result.rows.filter(value=>value.included_in_procurement).map(value=>value.row_id)).toEqual([id('kit-order')]);
 for(const key of ['flexible-hoses-reference','waste-set-reference','mounting-set-reference'])expect(row(result,key)).toMatchObject({quantity:'3',included_in_estimate:false,included_in_procurement:false});
 expect(result.preliminaryNeeds).toHaveLength(7);
 for(const need of result.preliminaryNeeds){
  expect(need).toMatchObject({quantity:null,missing_parameter_ids:[]});
  expect(['INCLUDED','NOT_APPLICABLE']).toContain(((need.calculation_trace as Record<string,any>).resourceGraph as Record<string,any>).scopeRequirementDecisionV1.status);
 }
 expect(definition().parameters.filter(value=>value.truth_metadata.visibility_role==='USER_INPUT').map(value=>value.parameter_id)).toEqual([profile.countParameterId,profile.siteParameterId]);
 expect(result.rows.filter(value=>value.included_in_estimate).every(value=>value.unit_price===null)).toBe(true);
});

it('represents an expressly selected new order without asserting a warehouse inventory fact',async()=>{
 const result=await run(facts);
 expect((row(result,'kit-order').calculation_trace as Record<string,unknown>).purchaseBalance).toMatchObject({balanceScope:'new_order_vs_required_consumption',requirementBasis:'selected_supply_order',effectiveOrder:'3',procurementReady:true});
 expect(Object.keys(facts)).not.toContain('grohe33265002_usable_stock_item');
});

it.each([profile.countParameterId,profile.siteParameterId])('keeps missing object fact %s unresolved',async parameter=>{
 const input:Record<string,string>={...facts};delete input[parameter];const result=await run(input);
 expect(result.preliminaryNeeds.some(need=>need.missing_parameter_ids.includes(parameter))).toBe(true);
 expect(result.rows.some(value=>value.included_in_estimate)).toBe(false);
});

it('preserves manual unit prices as the install count changes and never charges included components twice',async()=>{
 const result=await run({...facts,[profile.countParameterId]:'4'},{
  [id('kit-order')]:{unitPrice:'77',provenance:{kind:'manual',reason:'TEST_ONLY price retention'}},
  [id('complete-installation-work')]:{unitPrice:'11',provenance:{kind:'manual',reason:'TEST_ONLY price retention'}},
 });
 expect(row(result,'kit-order')).toMatchObject({quantity:'4',unit_price:'77',amount:'308'});
 expect(row(result,'complete-installation-work')).toMatchObject({quantity:'4',unit_price:'11',amount:'44'});
 expect(result.totals.amount).toBe('352');
});

it('retains a deliberately smaller manual order and blocks its procurement for the real shortage',async()=>{
 const result=await run(facts,{[id('kit-order')]:{quantity:'2',provenance:{kind:'manual',reason:'TEST_ONLY incomplete order'}}});
 expect(row(result,'kit-order')).toMatchObject({quantity:'2',included_in_procurement:false});
 expect((row(result,'kit-order').calculation_trace as Record<string,unknown>).purchaseBalance).toMatchObject({consumptionShortage:'1',procurementReady:false});
});

it('does not treat excluded paid work as coverage for its required ordinary tools',async()=>{
 const result=await run(facts,{[id('complete-installation-work')]:{includedInEstimate:false,provenance:{kind:'manual'}}});
 const tools=result.preliminaryNeeds.filter(need=>[id('mounting-key'),id('waste-key')].includes(need.row_id));
 expect(tools).toHaveLength(2);
 for(const tool of tools)expect(((tool.calculation_trace as Record<string,any>).resourceGraph as Record<string,any>).scopeRequirementDecisionV1.status).toBe('REQUIRED_RESOURCE_EXCLUDED');
});
