// Prospective real shared-compiler cases. WORK only; no canonical/test execution acceptance.
import {readFileSync}from'node:fs';import{createHash}from'node:crypto';
import {elecorSingleRouteMaterialDefinitionR1 as base,elecorSingleRouteControlInputR1 as baseControl,prefix}from'./elecorSingleRouteMaterialR1';
import {compileElecorMechanicalProjectFixingsR1 as compile,elecorMechanicalProjectFixingsDefinitionR1 as definition,
 elecorMechanicalProjectFixingsControlInputR1 as control,elecorMechanicalProjectFixingsPackR1 as pack,
 elecorMechanicalProjectFixingsOwnerR1 as owner}from'./elecorMechanicalProjectFixingsCompletionR1';
const qty=(r:Awaited<ReturnType<typeof compile>>,suffix:string)=>r.rows.find(x=>x.row_id===prefix+':'+suffix)?.quantity;
const row=(r:Awaited<ReturnType<typeof compile>>)=>r.rows.find(x=>x.row_id===owner);
const provenance={kind:'manual',reason:'CONTROL_ONLY exact535463 percompleteassembly price; not a labour norm'};
const remaining=['installation-labour','end-node-components','tools','access-protection','acceptance','delivery-handling','cleanup-disposal'];
describe('existing ELECOR consumer conditional PPR mechanical fixing completion',()=>{
 it('pins manufacturer edition8 and exact535463 supply contents, not inferred tooltime/labour',()=>{
  for(const p of [pack.officialPassport,pack.fixedProduct.source])
   expect(createHash('sha256').update(readFileSync(p.path)).digest('hex')).toBe(p.sha256);
  expect(pack.fixedProduct).toMatchObject({article:'535463',gtin:'4048962239928',supplyBoxCompleteFixings:50,
   boxContents:{dowels6x30:50,panheadScrews4_5x40:50}});
  expect(pack.manufacturerFacts.labourHoursPublished).toBe(false);
  expect(pack.manufacturerFacts.spacingIsRecommendationNotConsumptionNorm).toBe(true);
 });
 it('preserves every preexisting nonfixing resource/formula/parameter byte shape',()=>{
  const before=base(),after=definition();
  for(const r of before.resources.filter(r=>r.row_id!==pack.existingNeedRowId))expect(after.resources.find(x=>x.row_id===r.row_id)).toEqual(r);
  for(const f of before.formulas)expect(after.formulas.find(x=>x.formula_id===f.formula_id)).toEqual(f);
  for(const p of before.parameters)
   expect(after.parameters.find(x=>x.parameter_id===p.parameter_id)).toEqual(p);
  expect(after.resources).toHaveLength(before.resources.length+6);
  expect(after.formulas).toHaveLength(before.formulas.length+6);
  expect(after.ordinaryParameterIds).toEqual(['elecor_route_m']);
 });
 it('keeps mountingfact choices in plainRussian and hides PPRdetails until the mechanicalmethod isselected',()=>{
  const d=definition(),condition={kind:'equals',parameterId:'elecor_fixing_method',value:pack.method};
  expect(pack.method).toMatch(/[А-Яа-яЁё]/u);expect(pack.unresolvedMethod).toMatch(/[А-Яа-яЁё]/u);
  for(const id of pack.projectFactsRequired.filter(id=>id!=='elecor_fixing_method')){
   const p=d.parameters.find(p=>p.parameter_id===id)!;expect(p.constraints_json?.requiredWhen).toEqual(condition);expect(p.truth_metadata.visible_when).toEqual(condition);}
 });
 it('requires actual unresolved materialpcs preimage instead of silently overlaying a priced/current successor',()=>{
  const d=base();expect(()=>definition({...d,resources:d.resources.filter(x=>x.row_id!==pack.existingNeedRowId)})).toThrow('EXACT_UNRESOLVED_ELECOR_FIXINGS_PREIMAGE_REQUIRED');
 });
 it('calculates documented38completefixings as50pcs order,12pcs remaining and unchanged25m geometry',async()=>{
  const r=await compile(control());expect(qty(r,'fixings-consumed')).toBe('38');expect(row(r)?.quantity).toBe('50');
  expect(qty(r,'fixings-remaining')).toBe('12');expect(qty(r,'fixings-free')).toBe('12');
  expect(qty(r,'installed-sections')).toBe('13');expect(qty(r,'internal-joints')).toBe('12');
  expect(qty(r,'channel-order')).toBe('2');expect(qty(r,'kms-order')).toBe('3');
  expect(r.preliminaryNeeds.map(x=>x.row_id).sort()).toEqual(remaining.map(x=>prefix+':open-'+x).sort());
  expect(row(r)).toMatchObject({unit_id:'pcs',unit_price:null,amount:null,included_in_procurement:true});
 });
 it('never derives count from25m or recommended1m: two accepted synthetic schedules remain38versus77',async()=>{
  const a=await compile(control()),b=await compile({...control(),elecor_fixing_ppr_point_count:77});
  expect(qty(a,'fixings-consumed')).toBe('38');expect(qty(b,'fixings-consumed')).toBe('77');expect(row(b)?.quantity).toBe('100');
  expect(qty(a,'installed-sections')).toBe(qty(b,'installed-sections'));
  expect(definition().parameters.find(p=>p.parameter_id==='elecor_fixing_max_interpoint_m')?.default_value).toBeNull();
 });
 it('keeps the unresolvedmethod branch as original8needs, without defaultfixingSKU supply',async()=>{
  const r=await compile({...baseControl(),elecor_fixing_method:pack.unresolvedMethod});
  expect(row(r)).toBeUndefined();expect(r.preliminaryNeeds).toHaveLength(8);
  expect(r.preliminaryNeeds.some(n=>n.row_id===pack.existingNeedRowId)).toBe(true);
 });
 it('preserves exact completeassembly stock20/reserve5 and supplier2box quantum100',async()=>{
  const r=await compile({...control(),elecor_fixing_stock_pcs:20,elecor_fixing_reserve_pcs:5,elecor_fixing_supplier_box_multiple:2,
   elecor_fixing_stock_reference:'CONTROL_ONLY inventory20complete535463pairs'});
  expect(row(r)?.quantity).toBe('100');expect(qty(r,'fixings-remaining')).toBe('82');expect(qty(r,'fixings-free')).toBe('77');
 });
 it('orders zero when confirmed38completeassemblies cover38points without fabricatingprice',async()=>{
  const r=await compile({...control(),elecor_fixing_stock_pcs:38,elecor_fixing_stock_reference:'CONTROL_ONLY exact535463pairs'});
  expect(row(r)?.quantity).toBe('0');expect(qty(r,'fixings-consumption-shortage')).toBe('0');expect(qty(r,'fixings-free')).toBe('0');
 });
 it('retains manual150assembly order/77price/title and recalculates physicalbalance',async()=>{
  const r=await compile(control(),{[owner]:{quantity:'150',unitPrice:'77',titleRu:'Сохранённый комплект535463',provenance}});
  expect(row(r)).toMatchObject({quantity:'150',unit_price:'77',amount:'11550',title_ru:'Сохранённый комплект535463'});
  expect(qty(r,'fixings-remaining')).toBe('112');expect(qty(r,'fixings-consumed')).toBe('38');
 });
 it('retains rawmanual77without rounding or pretending complete50box supply is procured',async()=>{
  const r=await compile(control(),{[owner]:{quantity:'77',unitPrice:'77',provenance}});
  expect(row(r)).toMatchObject({quantity:'77',unit_price:'77',amount:null,included_in_procurement:false,procurement_readiness:'SUPPLY_CONFIRMATION_REQUIRED'});
  // An unconfirmed 77-piece order cannot prove a usable physical remainder.
  expect(qty(r,'fixings-remaining')).toBeUndefined();expect(qty(r,'fixings-free')).toBeUndefined();
  expect(qty(r,'fixings-consumed')).toBe('38');
 });
 it('retains costexclusion/title/price without deletingphysicalneed or sevenopenobligations',async()=>{
  const r=await compile(control(),{[owner]:{quantity:'100',unitPrice:'77',titleRu:'Исключено только из стоимости',includedInEstimate:false,provenance}});
  expect(row(r)).toMatchObject({quantity:'100',unit_price:'77',included_in_estimate:false,title_ru:'Исключено только из стоимости'});
  expect(qty(r,'fixings-consumption-shortage')).toBe('0');expect(r.preliminaryNeeds).toHaveLength(7);
 });
 it('requires stockevidence only forpositive complete535463stock, evenwithmanualorder',async()=>{
  const r=await compile({...control(),elecor_fixing_stock_pcs:1},{[owner]:{quantity:'100',provenance}});
  expect(row(r)).toBeUndefined();expect(r.preliminaryNeeds.find(x=>x.row_id===owner)?.missing_parameter_ids).toContain('elecor_fixing_stock_reference');
  expect(row(await compile(control()))?.quantity).toBe('50');
 });
 it('keeps old unknownnorm authority and never maps itsprice/quantity into newpaidowner',async()=>{
  const d=definition();expect(d.parameters.find(p=>p.parameter_id===pack.legacyUnresolvedQuantityParameterId)?.truth_metadata.value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');
  for(const v of [0,1,77]){await expect(compile({...control(),[pack.legacyUnresolvedQuantityParameterId]:v})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
   await expect(compile(control(),{[pack.existingNeedRowId]:{quantity:String(v),unitPrice:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});}
  const r=await compile(control(),{[pack.existingNeedRowId]:{unitPrice:'77',titleRu:'Oldunknownneedprice',provenance}});
  expect(row(r)?.unit_price).toBeNull();expect(row(r)?.quantity).toBe('50');
 });
 it('keeps packetpublicationfalse/fulltechnicalfalse and freezesexactSKU ratherthanusereditablegenericfastener',()=>{
  expect(pack.publicationAllowed).toBe(false);expect(pack.fullTechnicalAcceptance).toBe(false);expect(pack.acceptedNewCompleteTypes).toBe(0);
  expect(definition().parameters.find(p=>p.parameter_id==='elecor_fixing_product_sku')?.constraints_json?.values).toEqual(['535463']);
  expect(definition().resources.filter(x=>x.row_id===owner&&x.procurement_eligible)).toHaveLength(1);
 });
 const missing=[...pack.projectFactsRequired,'elecor_route_document_reference'];
 it.each(missing)('does not bypass missingPPR/productfact %s withmanualquantity77',async id=>{
  const input:Record<string,unknown>={...control()};delete input[id];
  const r=await compile(input,{[owner]:{quantity:'77',unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}});
  expect(row(r)).toBeUndefined();expect(r.preliminaryNeeds.find(x=>x.row_id===owner)?.missing_parameter_ids).toContain(id);
 });
 it.each([
  {elecor_fixing_method:'ADHESIVE_OR_MIXED'},
  {elecor_fixing_product_sku:'535459'},
  {elecor_fixing_complete_unit_acceptance:'ONE_LOOSE_DOWEL_WITHOUT_SCREW'},
  {elecor_fixing_price_scope:'LABOUR_TOOLS_DELIVERY_ALL_IN'},
  {elecor_fixing_schedule_route_m:24},
  {elecor_fixing_max_interpoint_m:1.1},
  {elecor_fixing_max_interpoint_m:0},
  {elecor_fixing_attachment_thickness_m:0.007},
  {elecor_fixing_attachment_thickness_m:0},
  {elecor_fixing_ppr_point_count:0},
  {elecor_fixing_ppr_point_count:0.5},
  {elecor_fixing_supplier_box_multiple:0},
 ])('rejects incompatibleproject/unit/supplyfact %j',async change=>{
  await expect(compile({...control(),...change})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 it.each(remaining)('does not close remainingnormneed %s bysubmitted0/1or manual0/1',async gap=>{
  const id='elecor_open_qty_'+gap.replaceAll('-','_');
  expect(definition().parameters.find(p=>p.parameter_id===id)?.truth_metadata).toMatchObject({value_source_role:'UNRESOLVED_APPLICATION_NORM',visibility_role:'INTERNAL_ONLY'});
  for(const v of [0,1]){
   await expect(compile({...control(),[id]:v})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
   await expect(compile(control(),{[prefix+':open-'+gap]:{quantity:String(v),unitPrice:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
  }
 });
});
