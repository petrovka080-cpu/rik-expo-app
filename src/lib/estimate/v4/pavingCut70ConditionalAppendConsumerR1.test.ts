import {pavingCut70ConditionalConsumerDefinitionR1 as definition,compilePavingCut70ConditionalProposalR1 as core,
 pavingCut70AcceptanceInputR1 as facts,pavingCut70OpenNeedIdsR1 as needIds,pavingCut70IndependentCompletenessMapR1 as completeness} from './pavingCut70ConditionalAppendConsumerR1';
import {pavingCutStationary70QuantityDefinitionR1 as original,pavingCutStationary70PrefixR1 as prefix,
 pavingCutStationary70PrimaryR1 as primary,pavingCutStationary70QuantityPackR1 as pack} from './pavingCutStationary70QuantityR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const provenance={kind:'manual',reason:'VALIDATION_ONLY saved manual amount; not a real price'};
describe('conditional cut70 append wrapper: prospective, not root identity admission',()=>{
 it('retains the four immutable source formulas and six unitless unresolved obligations',()=>{
  const before=JSON.stringify(original()),d=definition();
  expect(d.parameters).toHaveLength(12);expect(d.formulas).toHaveLength(10);expect(d.resources).toHaveLength(10);
  expect(d.formulas.slice(0,4)).toEqual(original().formulas);expect(JSON.stringify(original())).toBe(before);
  expect(d.resources.slice(4).map(r=>r.unit_id)).toEqual(['','','','','','']);
  expect(d.resources.slice(4).every(r=>r.source_metadata!==null&&r.source_metadata.normativeTrace instanceof Array&&r.source_metadata.normativeTrace.length===0)).toBe(true);
  expect(d.parameters.every(p=>p.default_value===null)).toBe(true);
  expect(validateIndependentCompletenessMapReferences({completenessMap:completeness(),formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
 });
 it.each([['1',['0.39','0.16','0.16','0.014']],['12.5',['4.875','2','2','0.175']],['100',['39','16','16','1.4']]])('compiles exact source length %s while six needs remain',async(length,quantities)=>{
  const r=await core(facts(length as string));expect(r.rows.map(x=>x.quantity)).toEqual(quantities);
  expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual([...needIds].sort());
  expect(r.rows.filter(x=>x.included_in_estimate).map(x=>x.row_id)).toEqual([prefix+':whole-cutting-labor']);
  expect(r.rows.every(x=>x.unit_price===null&&!x.included_in_procurement)).toBe(true);
 });
 it.each(needIds)('cannot erase or quantify unresolved scope %s with manual0/1',async id=>{
  for(const quantity of ['0','1'])await expect(core(facts(),{[id]:{quantity,unitPrice:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 });
 it.each(['operator-information','stationary-machine-consumed','diamond-disc-consumed'])('cannot turn informational %s into a second paid/procurement owner',async suffix=>{
  const id=prefix+':'+suffix,r=await core(facts(),{[id]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}});
  expect(r.rows.find(x=>x.row_id===id)).toMatchObject({included_in_estimate:false,included_in_procurement:false});
  const d=definition(),resource=d.resources.find(x=>x.row_id===id)!;
  const snap=await core(facts(),{},[{price_key:resource.cost_owner_id??id,unit_id:resource.unit_id,unit_price:'77',currency_code:'KGS',snapshot_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}]);
  expect(snap.rows.find(x=>x.row_id===id)).toMatchObject({included_in_estimate:false,included_in_procurement:false});
 });
 it('preserves same-owner manual price/title/exclusions through recalculate',async()=>{
  const id=prefix+':whole-cutting-labor',raw={unitPrice:'77',titleRu:'VALIDATION_ONLY manual labour',includedInEstimate:false,includedInProcurement:false,provenance},before=JSON.stringify(raw);
  const r=await core(facts(),{[id]:raw});expect(r.rows.find(x=>x.row_id===id)).toMatchObject({unit_price:'77',title_ru:raw.titleRu,included_in_estimate:false,included_in_procurement:false});
  expect(JSON.stringify(raw)).toBe(before);expect(r.preliminaryNeeds).toHaveLength(6);
 });
 it('does not admit unknown purchase facts or machine rates and cannot change literal33-0667',async()=>{
  await expect(core({...facts(),blade_order_quantum:'1'})).rejects.toThrow('unknown estimate parameters');
  const d=definition();expect(d.resources.find(r=>r.row_id.endsWith(':stationary-machine-consumed'))?.source_metadata)
   .toMatchObject({resource_code:'33-0667',machine_price_admission:false,printed_resource_name_ru:pack.rows[2]!.printedNameRu});
  expect(d.resources.some(r=>r.procurement_eligible)).toBe(false);
 });
 it('zero length invents neither scope quantities nor product/method defaults',async()=>{
  const r=await core({[primary]:'0'});expect(r.rows.every(x=>x.quantity==='0')).toBe(true);expect(r.preliminaryNeeds).toHaveLength(0);
 });
});
