// WORK candidate scenarios. PREPARED, NOT RUN. Canonical cwd and staged resolver required.
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import {compileElecorSingleRouteMaterialR1 as compile,elecorSingleRouteMaterialDefinitionR1 as definition,
 elecorSingleRouteControlInputR1 as control,elecorSingleRoutePackR1 as pack,prefix} from './elecorSingleRouteMaterialR1';
import {effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const d=definition(),owner=(k:string)=>prefix+':'+k+'-order';
const provenance={kind:'manual',reason:'CONTROL_ONLY arithmetic/manual preservation; not a construction norm'};
const qty=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity;
describe('ELECOR60x40 distinct source-backed partial material profile',()=>{
 it('pins exact2m/18m/9section channel and independent60x40 KMS4, not delivered40x25',()=>{
  expect(pack.product).toMatchObject({channelSku:'CKK10-060-040-1-K01-018',channelSectionLengthM:2,
   channelTransportPackM:18,channelSectionsPerPackage:9,kmsSku:'CKMP10D-S-060-040-K01',kmsPiecesPerSet:4});
  for(const s of pack.sourceEvidence)expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),s.path))).digest('hex')).toBe(s.sha256);
  expect(pack.sourceEvidence[1].locatorRu).toContain('CKMP10D-S-060-040-K01');
  expect(pack.proposedIdentity.persisted).toBe(false);expect(pack.fullTechnicalAcceptance).toBe(false);
 });
 it('keeps one ordinary metre primary, no invented q/point bridge or runtime rate defaults',()=>{
  expect(d.ordinaryParameterIds).toEqual(['elecor_route_m']);expect(d.parameters.some(p=>p.parameter_id==='q')).toBe(false);
  expect(d.parameters.find(p=>p.parameter_id==='elecor_route_m')?.unit_id).toBe('m');
  expect(d.parameters.every(p=>p.default_value===null)).toBe(true);expect(d.runtimeInput).toEqual({});
  for(const id of ['elecor_route_scope','elecor_route_layout','elecor_route_document_reference'])
   expect(d.parameters.find(p=>p.parameter_id===id)?.constraints_json?.requiredWhen).toEqual({kind:'greater_than',parameterId:'elecor_route_m',value:0});
  expect(d.formulas.some(f=>/\bq\b|4m.hour|0\.05/.test(f.expression_source??''))).toBe(false);
 });
 it('calculates25m as13sections,12joints,2factory18m packs and3KMS sets',async()=>{
  const r=await compile(control());
  for(const [id,value] of [['route-net','25'],['installed-sections','13'],['tail-length','1'],['internal-joints','12'],
   ['channel-opened','2'],['channel-order','2'],['channel-pieces-in-opened','5'],['kms-opened','3'],['kms-order','3'],['kms-pieces-in-opened','0']])
   expect(qty(r,id)).toBe(value);
  expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual(pack.sourceNeeds.map(n=>prefix+':open-'+n.id).sort());
 });
 it('uses exact18m boundary without creating a second pack or ninth KMS',async()=>{
  const r=await compile({...control(),elecor_route_m:18});
  expect(qty(r,'installed-sections')).toBe('9');expect(qty(r,'internal-joints')).toBe('8');
  expect(qty(r,'channel-order')).toBe('1');expect(qty(r,'kms-order')).toBe('2');expect(qty(r,'tail-length')).toBe('0');
 });
 it('has no KMS consumption on a single2m section and does not add reserve to joints',async()=>{
  const r=await compile({...control(),elecor_route_m:2,elecor_kms_reserve_packages:1});
  expect(qty(r,'internal-joints')).toBe('0');expect(qty(r,'kms-opened')).toBe('0');expect(qty(r,'kms-order')).toBe('1');
  expect(qty(r,'kms-unopened')).toBe('1');
 });
 it('keeps stock/reserve/supplier quantum independent for both SKU owners',async()=>{
  const r=await compile({...control(),elecor_channel_stock_packages:1,elecor_channel_reserve_packages:1,elecor_channel_supplier_multiple:3,
   elecor_kms_stock_packages:3,elecor_kms_reserve_packages:0,elecor_kms_supplier_multiple:2,
   elecor_channel_stock_reference:'CONTROL_ONLY whole18m packs inventory',elecor_kms_stock_reference:'CONTROL_ONLY whole4piece sets inventory'});
  expect(qty(r,'channel-order')).toBe('3');expect(qty(r,'channel-unopened')).toBe('2');expect(qty(r,'channel-free')).toBe('1');
  expect(qty(r,'kms-order')).toBe('0');expect(qty(r,'internal-joints')).toBe('12');
 });
 it('prices only two exact factory-pack owners; information and shortages have no second price owner',async()=>{
  const r=await compile(control());const paid=r.rows.filter(x=>x.included_in_estimate);
  expect(paid.map(x=>x.row_id).sort()).toEqual([owner('channel'),owner('kms')].sort());
  expect(paid.every(x=>x.unit_id==='item'&&x.unit_price===null&&x.amount===null)).toBe(true);
  expect(r.rows.filter(x=>x.included_in_procurement).map(x=>x.row_id).sort()).toEqual([owner('channel'),owner('kms')].sort());
  expect(d.resources.filter(x=>x.procurement_eligible).map(x=>x.row_id).sort()).toEqual([owner('channel'),owner('kms')].sort());
  for(const id of [owner('channel'),owner('kms')])expect(d.resources.find(x=>x.row_id===id)?.source_metadata?.automaticGenericPriceInheritanceAllowed).toBe(false);
 });
 it('preserves a manual factory-pack order/price/title, recalculates balance and leaves13sections/12joints',async()=>{
  const r=await compile(control(),{[owner('channel')]:{quantity:'4',unitPrice:'100',titleRu:'Сохранённый заказ18м',provenance}});
  expect(qty(r,'channel-unopened')).toBe('2');expect(qty(r,'channel-free')).toBe('2');
  expect(qty(r,'installed-sections')).toBe('13');expect(qty(r,'internal-joints')).toBe('12');
  expect(r.rows.find(x=>x.row_id===owner('channel'))).toMatchObject({quantity:'4',unit_price:'100',amount:'400',title_ru:'Сохранённый заказ18м'});
 });
 it('keeps insufficient manual supply visible and blocks procurement without converting packs to m',async()=>{
  const r=await compile(control(),{[owner('channel')]:{quantity:'1',unitPrice:'100',includedInProcurement:true,provenance}});
  expect(qty(r,'channel-consumption-shortage')).toBe('1');
  expect(r.rows.find(x=>x.row_id===owner('channel'))).toMatchObject({quantity:'1',unit_id:'item',included_in_procurement:false,procurement_readiness:'SHORTAGE'});
  expect(qty(r,'internal-joints')).toBe('12');
 });
 it('preserves a saved cost exclusion without suppressing physical supply or the8open obligations',async()=>{
  const r=await compile(control(),{[owner('channel')]:{quantity:'4',unitPrice:'100',includedInEstimate:false,provenance}});
  expect(r.rows.find(x=>x.row_id===owner('channel'))).toMatchObject({quantity:'4',unit_price:'100',included_in_estimate:false});
  expect(qty(r,'channel-unopened')).toBe('2');expect(r.preliminaryNeeds).toHaveLength(8);
 });
 it('resets manual quantity to calculated supply without changing the physical geometry',async()=>{
  const r=await compile(control(),{[owner('channel')]:{unitPrice:'100',provenance}});
  expect(qty(r,'channel-order')).toBe('2');expect(qty(r,'channel-unopened')).toBe('0');expect(qty(r,'installed-sections')).toBe('13');
 });
 it.each(['elecor_route_scope','elecor_route_layout','elecor_route_document_reference'])('does not bypass missing project fact %s with a manual order',async fact=>{
  const input:Record<string,unknown>={...control()};delete input[fact];
  const r=await compile(input,{[owner('channel')]:{quantity:'4',provenance}});
  expect(r.rows).toHaveLength(0);expect(r.preliminaryNeeds.some(n=>n.row_id===owner('channel')&&n.missing_parameter_ids.includes(fact))).toBe(true);
 });
 it('does not default unknown supplier/stock facts to a ready order',async()=>{
  const r=await compile({elecor_route_m:25,elecor_route_scope:pack.exactScopeRu,elecor_route_layout:pack.exactLayoutRu,elecor_route_document_reference:'CONTROL_ONLY'});
  for(const id of [owner('channel'),owner('kms')])expect(r.preliminaryNeeds.some(n=>n.row_id===id&&n.quantity===null)).toBe(true);
 });
 it('does not require stock evidence for explicitly zero stock',async()=>{
  const r=await compile(control());
  expect(r.rows.filter(x=>x.included_in_procurement).map(x=>x.row_id).sort()).toEqual([owner('channel'),owner('kms')].sort());
  for(const k of ['channel','kms'])expect(d.parameters.find(p=>p.parameter_id===`elecor_${k}_stock_reference`)?.constraints_json?.requiredWhen)
   .toEqual({kind:'greater_than',parameterId:`elecor_${k}_stock_packages`,value:0});
 });
 it.each(['channel','kms'])('requires %s stock evidence only when positive, including manual orders',async kind=>{
  const id=`elecor_${kind}_stock_reference`;
  const r=await compile({...control(),[`elecor_${kind}_stock_packages`]:1},{[owner(kind)]:{quantity:'4',provenance}});
  expect(r.preliminaryNeeds.some(n=>n.row_id===owner(kind)&&n.missing_parameter_ids.includes(id))).toBe(true);
  expect(r.rows.some(n=>n.row_id===owner(kind))).toBe(false);
  expect(qty(r,'installed-sections')).toBe('13');
 });
 it.each([{elecor_route_m:0},{elecor_channel_stock_packages:-1},{elecor_channel_reserve_packages:0.5},{elecor_kms_supplier_multiple:0},
  {elecor_route_scope:'Влажная зона'},{elecor_route_layout:'Две трассы с поворотами'}])('rejects invalid or excluded facts %j',async change=>{
  await expect(compile({...control(),...change})).rejects.toBeDefined();
 });
 it('does not trust a submitted effective order output as supply',async()=>{
  const r=await compile({...control(),[effectiveResourceQuantityParameterId(owner('channel'))]:999});
  expect(qty(r,'channel-order')).toBe('2');expect(qty(r,'channel-unopened')).toBe('0');
 });
 it('keeps source-norm needs hidden/application-owned and rejects user/manual replacement',async()=>{
  for(const gap of pack.sourceNeeds){const id='elecor_open_qty_'+gap.id.replaceAll('-','_');
   expect(d.parameters.find(p=>p.parameter_id===id)?.truth_metadata).toMatchObject({visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM'});
   await expect(compile({...control(),[id]:1})).rejects.toBeDefined();
   await expect(compile(control(),{[prefix+':open-'+gap.id]:{quantity:'1',provenance}})).rejects.toBeDefined();
  }
 });
 it('links18 declared geometry/balance rows and10 independent obligations without binding an open norm',()=>{
  expect(pack.normativeBindingRowIds).toHaveLength(18);expect(pack.normativeBindingRowIds.some(id=>id.includes(':open-'))).toBe(false);
  expect(pack.normativeBindingRowIds).toEqual(d.resources.filter(r=>!r.row_id.includes(':open-')).map(r=>r.row_id));
  expect(pack.independentCompletenessMap.entries).toHaveLength(10);
  expect(validateIndependentCompletenessMapReferences({completenessMap:pack.independentCompletenessMap,formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
 });
});
