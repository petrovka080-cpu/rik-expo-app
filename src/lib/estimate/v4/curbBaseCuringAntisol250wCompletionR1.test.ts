import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import fixture from '../../../../data/estimate-benchmarks/fixtures/curb-base-curing-current-need-preimage-r1.json';
import {appendCurbBaseCuringMaterialR1,compileCurbBaseCuringMaterialR1,curbBaseCuringMaterialPackR1 as pack,curbBaseCuringControlFactsR1,curbBaseCuringMaterialOwnerR1 as owner} from './curbBaseCuringAntisol250wCompletionR1';
import {graniteKerbCementDefinitionR1,graniteKerbCementPackR1 as parentPack,graniteKerbCementPrefixR1 as oldPrefix} from './graniteKerbCementKrer27Column03R1';
import {concreteCuringAntisolDefinitionS2763,concreteCuringAntisolPackS2763,concreteCuringAntisolPrefixS2763 as prefix} from './concreteCuringAntisolMaterialS2763';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
const base=graniteKerbCementDefinitionR1(),d=appendCurbBaseCuringMaterialR1(base);
const baseFacts=(n='100'):Record<string,unknown>=>{
 const p:Record<string,unknown>={kerb_length_m:n};for(const f of parentPack.scopeFacts)p[f.id]=f.value;
 for(const m of parentPack.machines)p[m.parameterId]=m.ownValue;
 const quanta:Record<string,string>={nails:'1',timber:'0.01',concrete:'0.1',mortar:'0.001',stone:'1'};
 for(const m of parentPack.materials){p[m.specificationId]='QA_SYNTHETIC_ONLY exact sourcecompatible product; not actual quote';p[m.id+'_stock']='0';p[m.id+'_reserve']='0';p[m.id+'_quantum']=quanta[m.id];}
 return p;
};
const facts=(area='49')=>({...baseFacts(),...curbBaseCuringControlFactsR1(area)});
const compile=compileCurbBaseCuringMaterialR1;
const by=(r:Awaited<ReturnType<typeof compile>>,rowId:string)=>r.rows.find(x=>x.row_id===rowId);
const material=(r:Awaited<ReturnType<typeof compile>>,suffix:string)=>by(r,suffix==='order'?owner:prefix+':'+suffix);
const provenance={kind:'manual',reason:'QA_SYNTHETIC_ONLY user supply amendment; not a source norm or market quote'};
const amended=(p:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides'])=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'kerb_length_m',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:p,confirmedParameters:{...d.runtimeInput},rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:async v=>estimateDeterministicHash(v)});
it('pins primary PDS and actual accepted unresolved umbrella need, without claiming new DB acceptance',()=>{
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.source.path))).digest('hex')).toBe(pack.source.sha256);
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.acceptedNeedFixture.path))).digest('hex')).toBe(pack.acceptedNeedFixture.sha256);
 expect(fixture.rawNeed.row_id).toBe(pack.completionNeedRowId);expect(fixture.rawNeed.need_sha256).toBe(pack.completionNeedRawSha256);
 expect(fixture.rawNeed.quantity).toBeNull();expect(fixture.rawNeed.unit_price).toBeNull();expect(fixture.rawNeed.unit_id).toBe('');
 expect(pack.publicationAllowed).toBe(false);expect(pack.fullTechnicalAcceptance).toBe(false);
});
it('appends existing Antisol7rows/7formulas and19parameters, preserving all old27/50 exact and without mutation',()=>{
 expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([69,34,34]);
 expect(d.parameters.slice(0,50)).toEqual(base.parameters);expect(d.formulas.slice(0,27)).toEqual(base.formulas);expect(d.resources.slice(0,27)).toEqual(base.resources);
 expect(base).toEqual(graniteKerbCementDefinitionR1());
 const shared=concreteCuringAntisolDefinitionS2763();expect(d.formulas.slice(27)).toEqual(shared.formulas);
 expect(d.resources.slice(27).map(r=>r.row_id)).toEqual(shared.resources.map(r=>r.row_id));
 expect(d.runtimeInput).toEqual(base.runtimeInput);expect(d.parameters.every(p=>p.default_value==null)).toBe(true);
});
it('keeps original need unbound/unquantified and old109labour even when material nominal amount is known',async()=>{
 const r=await compile(facts());expect(by(r,oldPrefix+':whole-labor')?.quantity).toBe('109');expect(material(r,'consumed')?.quantity).toBe('10');
 expect(r.preliminaryNeeds.some(n=>n.row_id===pack.completionNeedRowId&&n.quantity===null)).toBe(true);
 expect(d.resources.slice(27).every(x=>x.category==='material')).toBe(true);expect(d.resources.filter(x=>x.category==='labor')).toEqual(base.resources.filter(x=>x.category==='labor'));
});
it('does not choose a product or invent cure quantity from a100m kerb with no new branch choice',async()=>{
 const r=await compile(baseFacts());expect(material(r,'order')).toBeUndefined();expect(material(r,'consumed')).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.row_id===pack.completionNeedRowId)).toBe(true);
});
it('explicit other/unconfirmed method keeps original cure need and no new paid material',async()=>{
 const r=await compile({...baseFacts(),[pack.selectionParameter]:pack.otherOption});expect(material(r,'order')).toBeUndefined();expect(material(r,'consumed')).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.row_id===pack.completionNeedRowId)).toBe(true);
});
it.each([['49','10','19','1','9'],['93.1','19','19','1','0'],['98','20','38','2','18']] as const)('measured%s m2 yields nominal%s L/order%s L without using kerb length',async(area,need,order,packages,remaining)=>{
 const r=await compile(facts(area));expect(material(r,'consumed')?.quantity).toBe(need);expect(material(r,'order')?.quantity).toBe(order);expect(material(r,'packages')?.quantity).toBe(packages);expect(material(r,'remaining')?.quantity).toBe(remaining);
});
it('doubling kerb length changes original labour but does not change an independently measured curing area',async()=>{
 const r=await compile({...facts(),kerb_length_m:'200'});expect(by(r,oldPrefix+':whole-labor')?.quantity).toBe('218');expect(material(r,'consumed')?.quantity).toBe('10');
});
it('missing measured area remains missing, with no area from3.9m3 foundation or100m stone',async()=>{
 const p:Record<string,unknown>=facts();delete p.exposed_curing_surface_area_m2;const r=await compile(p);expect(material(r,'consumed')).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('exposed_curing_surface_area_m2'))).toBe(true);
});
it.each(pack.physicalFacts.map(x=>x.id))('missing source/application fact%s does not produce material consumption or paid order',async id=>{
 const p:Record<string,unknown>=facts();delete p[id];const r=await compile(p);expect(material(r,'consumed')).toBeUndefined();expect(material(r,'order')).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(id))).toBe(true);
});
it.each([
 {curb_curing_surface_scope:'GRANITE_OR_MORTAR_OR_COVERED_BASE'},
 {curb_curing_surface_finish:'SMOOTH_OR_MIXED_OR_OLD_SURFACE'},
 {curb_curing_future_interface:'LATER_COVERED_BY_KERB_MORTAR_PAVEMENT_OR_COATING'},
 {antisol_material_choice:'AntisolA or nonUS250W'},
 {approved_external_curing_method:'WATER_CURING'},
 {antisol_surface_ready:'Вертикальная поверхность: опалубка только снята, конденсата нет'},
 {antisol_subsequent_surface_use:'LATER_ADHESIVE_OR_WATERPROOFING'},
 {curb_curing_material_payment_scope:'ALREADY_INCLUDED_IN_CONCRETE_OR_CURING_QUOTE'},
 {exposed_curing_surface_area_m2:'0'},
 {antisol_minimum_temperature_12h_c:'7'},
 {antisol_minimum_temperature_12h_c:'6'},
])('rejects incompatible explicit source scope instead of selecting another product%j',async change=>{
 await expect(compile({...facts(),...change})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it('unknown inventory/reserve does not erase nominal consumption or invent order/remaining stock',async()=>{
 const p:Record<string,unknown>=facts();delete p.antisol_usable_stock_l;delete p.antisol_retained_reserve_l;const r=await compile(p);expect(material(r,'consumed')?.quantity).toBe('10');expect(material(r,'order')).toBeUndefined();expect(material(r,'remaining')).toBeUndefined();
});
it('separate payment proof missing keeps nominal material known but does not admit an order owner',async()=>{
 const p:Record<string,unknown>=facts();delete p.curb_curing_material_payment_reference;const r=await compile(p);expect(material(r,'consumed')?.quantity).toBe('10');expect(material(r,'order')).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.row_id===owner&&n.missing_parameter_ids.includes('curb_curing_material_payment_reference'))).toBe(true);
});
it('positive stock needs exact suitability evidence before being subtracted',async()=>{
 const r=await compile({...facts('98'),antisol_usable_stock_l:'5',antisol_retained_reserve_l:'2'});expect(material(r,'consumed')?.quantity).toBe('20');expect(material(r,'order')).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes('curb_curing_stock_compatibility_reference'))).toBe(true);
});
it('98m2 with confirmed usable5L/reserve2L reuses existing balance:19L order,4L remaining,2L free',async()=>{
 const r=await compile({...facts('98'),antisol_usable_stock_l:'5',antisol_retained_reserve_l:'2',curb_curing_stock_compatibility_reference:'QA_SYNTHETIC_ONLY exact unopened unfrozen indate USproduct5L'});expect(material(r,'order')?.quantity).toBe('19');expect(material(r,'remaining')?.quantity).toBe('4');expect(material(r,'free')?.quantity).toBe('2');
});
it('confirmed stock can cover demand+reserve while source consumption stays10L',async()=>{
 const r=await compile({...facts(),antisol_usable_stock_l:'20',antisol_retained_reserve_l:'2',curb_curing_stock_compatibility_reference:'QA_SYNTHETIC_ONLY exact suitable20L'});expect(material(r,'consumed')?.quantity).toBe('10');expect(material(r,'order')?.quantity).toBe('0');expect(material(r,'remaining')?.quantity).toBe('10');
});
it('only one added material owner is paid/procured; all six controls stay informational',()=>{
 const added=d.resources.slice(27);expect(added.filter(x=>x.resource_graph.costTreatment==='OWN_COST').map(x=>x.row_id)).toEqual([owner]);expect(added.filter(x=>x.procurement_eligible).map(x=>x.row_id)).toEqual([owner]);expect(added.filter(x=>x.row_id!==owner).every(x=>x.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'&&!x.procurement_eligible)).toBe(true);
});
it('no price is assigned by the PDS, factory, source4.9 or stock/reserve',async()=>{const r=await compile(facts());expect(material(r,'order')?.unit_price).toBeNull();expect(material(r,'order')?.amount).toBeNull();expect(d.parameters.some(p=>/rate|coverage|density|loss|package_l/.test(p.parameter_id)&&!base.parameters.some(b=>b.parameter_id===p.parameter_id))).toBe(false);});
it('explicit control77 affects only the single material order and does not transfer a need price',async()=>{
 const r=await amended(facts(),{[owner]:{unitPrice:'77',provenance}});expect(material(r,'order')).toMatchObject({quantity:'19',unit_price:'77',amount:'1463'});expect(material(r,'consumed')?.unit_price).toBeNull();expect(by(r,oldPrefix+':whole-labor')?.quantity).toBe('109');expect(r.preliminaryNeeds.some(n=>n.row_id===pack.completionNeedRowId)).toBe(true);
});
it('saved exclusion of material keeps nominal quantity visible and original need open',async()=>{
 const r=await amended(facts(),{[owner]:{includedInEstimate:false,includedInProcurement:false,provenance}});expect(material(r,'order')).toMatchObject({included_in_estimate:false,included_in_procurement:false});expect(material(r,'consumed')?.quantity).toBe('10');expect(r.preliminaryNeeds.some(n=>n.row_id===pack.completionNeedRowId)).toBe(true);
});
it('RAW77 cannot replace the source consumption formula',async()=>{await expect(amended(facts(),{[pack.materialRows.consumed]:{quantity:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});});
it.each(['0','1'])('manual%s cannot close the old unconfirmed umbrella cure need',async quantity=>{await expect(amended(facts(),{[pack.completionNeedRowId]:{quantity,unitPrice:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});});
it('nominal approximate material consumption preserves existing seven formula arithmetic exactly',()=>{
 expect(d.formulas.slice(27)).toEqual(concreteCuringAntisolDefinitionS2763().formulas);expect(d.resources.slice(27).every(r=>r.source_metadata?.quantityQuality==='APPROXIMATE')).toBe(true);expect(d.resources.slice(27).every(r=>r.source_metadata?.completionNeedRawSha256===pack.completionNeedRawSha256)).toBe(true);
});
it('rejects any parent whoseB15foundation formula was replaced before composition',()=>{
 const p={...base,formulas:base.formulas.map(f=>f.formula_id===oldPrefix+':formula:concrete-consumed'?{...f,expression_source:'kerb_length_m*5.9/100'}:f)};expect(()=>appendCurbBaseCuringMaterialR1(p)).toThrow('CURB_CURING_B15_PARENT_MISMATCH');
});

it('rejects negative stock rather than treating it as a negative physical material allowance',async()=>{await expect(compile({...facts(),antisol_usable_stock_l:'-1'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});});
