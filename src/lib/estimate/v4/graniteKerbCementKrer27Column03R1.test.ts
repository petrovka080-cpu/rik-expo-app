// WORK prospective27; not current catalog membership, not a publisher/payment admission.
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import {graniteKerbCementPackR1 as pack,graniteKerbCementPrefixR1 as prefix,
 graniteKerbCementDefinitionR1 as definition,graniteKerbCementCompletenessMapR1 as completeness,
 compileGraniteKerbCementR1} from './graniteKerbCementKrer27Column03R1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const d=definition(),catalogId=pack.proposedIdentity.catalogId;
const control=(n=35.5):Record<string,unknown>=>{
 const p:Record<string,unknown>={kerb_length_m:n};
 for(const f of pack.scopeFacts)p[f.id]=f.value;
 for(const m of pack.machines)p[m.parameterId]=m.ownValue;
 const quantum:Record<string,number>={nails:1,timber:0.01,concrete:0.1,mortar:0.001,stone:1};
 for(const m of pack.materials){p[m.specificationId]='CONTROL_ONLY actual product specification would be required';p[m.id+'_stock']=0;p[m.id+'_reserve']=0;p[m.id+'_quantum']=quantum[m.id];}
 return p;
};
const compile=(p:Record<string,unknown>)=>compileGraniteKerbCementR1(catalogId,p);
const amended=(p:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides'])=>compileCanonicalEstimateCore({
 operation:'recalculate',catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'kerb_length_m',
 parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
 submittedParameters:p,confirmedParameters:{...d.runtimeInput},rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:27,
 hashJson:async v=>estimateDeterministicHash(v)});
const by=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(x=>x.row_id===prefix+':'+id);
const provenance={kind:'manual',reason:'CONTROL_ONLY saved supplier order; not a normative rate'};
it('pins exact cached official source and visual column03 without claiming current membership',()=>{
 for(const [path,hash] of [[pack.source.path,pack.source.sha256],[pack.guidance.path,pack.guidance.sha256],
  [pack.sourceAdmission.exactCellImagePath,pack.sourceAdmission.exactCellImageSha256]])
  expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),path))).digest('hex')).toBe(hash);
 expect(pack.normId).toBe('27-02-010-03');expect(pack.proposedIdentity.persisted).toBe(false);
 expect(pack.fullTechnicalAcceptance).toBe(false);expect(pack.paymentAdmission.publisherOrRuntimeAdoptionAllowed).toBe(false);
});
it('keeps ordinary linear metres and original source/order units',()=>{
 expect(d.parameters.filter(p=>p.truth_metadata.input_origin_class==='KNOWN_PRIMARY_WORK_SCOPE').map(p=>[p.parameter_id,p.unit_id])).toEqual([['kerb_length_m','m']]);
 expect(d.resources.find(r=>r.row_id===prefix+':nails-consumed')?.unit_id).toBe('t');
 expect(d.resources.find(r=>r.row_id===prefix+':nails')?.unit_id).toBe('kg');
 expect(d.resources.find(r=>r.row_id===prefix+':stone')?.unit_id).toBe('m');
 expect(pack.materials.find(m=>m.id==='mortar')?.sourceCode).toBeNull();
});
it.each([
 [100,'109','0.68','0.04','0.001','0.17','3.9','0.06','100'],
 [35.5,'38.695','0.2414','0.0142','0.000355','0.06035','1.3845','0.0213','35.5'],
] as const)('uses independently transcribed03 rates at%s metres',async(n,labor,crane,truck,nails,timber,concrete,mortar,stone)=>{
 const r=await compile(control(n));
 for(const [id,q] of [['whole-labor',labor],['machine-operators-included',crane],['crane-consumed',crane],['truck-consumed',truck],
  ['nails-consumed',nails],['timber-consumed',timber],['concrete-consumed',concrete],['mortar-consumed',mortar],['stone-consumed',stone]])expect(by(r,id)?.quantity).toBe(q);
 expect(r.rows).toHaveLength(19);expect(r.preliminaryNeeds).toHaveLength(6);expect(r.rows.every(x=>x.unit_price===null)).toBe(true);
});
it.each([{kerb_length_m:0},{covering_kind:'Другое покрытие; цементобетонное исключено'},{granite_product_scope:'Бетонный борт или3ГП'}])(
 'rejects excluded physical scope%j',async change=>{await expect(compile({...control(),...change})).rejects.toBeDefined();});
it.each(pack.materials.map(m=>m.id))('does not invent unknown supplier stock for%s',async id=>{
 const input=control();delete input[id+'_stock'];const r=await compile(input);
 expect(by(r,id+'-consumed')).toBeDefined();expect(by(r,id)).toBeUndefined();
 expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':'+id&&n.missing_parameter_ids.includes(id+'_stock'))).toBe(true);
});
it.each([[false,false,5],[true,false,6],[false,true,6],[true,true,7]] as const)(
 'selects one crane/truck price owner per actual fulfillment%s/%s',async(craneHire,truckHire,buyer)=>{
 const input=control();input.crane_fulfillment=craneHire?pack.machines[0].hiredValue:pack.machines[0].ownValue;
 input.truck_fulfillment=truckHire?pack.machines[1].hiredValue:pack.machines[1].ownValue;
 const r=await compile(input);expect(r.rows.filter(x=>x.included_in_procurement)).toHaveLength(buyer);
 for(const id of ['crane','truck'])expect(r.rows.filter(x=>x.row_id===prefix+':'+id+'-own'||x.row_id===prefix+':'+id+'-hired')).toHaveLength(1);
 expect(by(r,'machine-operators-included')?.included_in_estimate).toBe(false);
 expect(by(r,'machine-operators-included')?.included_in_procurement).toBe(false);
});
it('preserves manual concrete order/price/title through recalculate without replacing source3.9 norm',async()=>{
 const r=await amended(control(),{[prefix+':concrete']:{quantity:'3',unitPrice:'100',titleRu:'CONTROL_ONLY saved concrete delivery order',provenance}});
 expect(by(r,'concrete')).toMatchObject({quantity:'3',unit_price:'100',amount:'300',title_ru:'CONTROL_ONLY saved concrete delivery order'});
 expect(by(r,'concrete-consumed')?.quantity).toBe('1.3845');expect(r.preliminaryNeeds).toHaveLength(6);
});
it('preserves saved exclusions while keeping physical consumption and open needs visible',async()=>{
 const r=await amended(control(),{[prefix+':concrete']:{includedInEstimate:false,includedInProcurement:false,provenance}});
 expect(by(r,'concrete')).toMatchObject({included_in_estimate:false,included_in_procurement:false});
 expect(by(r,'concrete-consumed')?.quantity).toBe('1.3845');expect(r.preliminaryNeeds).toHaveLength(6);
});
it.each(pack.gaps.map(g=>g.id))('retains exact source gap%s and rejects guessed manual quantity',async id=>{
 const r=await compile(control());expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':'+id&&n.quantity===null)).toBe(true);
 await expect(amended(control(),{[prefix+':'+id]:{quantity:'1',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it('keeps included base/formwork/joints/cleaning in one whole-labour owner',async()=>{
 const r=await compile(control());expect(r.rows.filter(x=>x.included_in_estimate&&x.category==='labor').map(x=>x.row_id)).toEqual([prefix+':whole-labor']);
 for(const o of pack.operations){expect(by(r,o.id)?.included_in_estimate).toBe(false);expect(d.resources.find(x=>x.row_id===prefix+':'+o.id)?.resource_graph.parentCostOwnerId).toBe(prefix+':whole-labor');}
 expect(d.resources.find(x=>x.row_id===prefix+':machine-operators-included')?.resource_graph).not.toHaveProperty('parentCostOwnerId');
 expect(validateIndependentCompletenessMapReferences({completenessMap:completeness(),formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
 const declared=completeness().entries.map(e=>e.resolution.rowId);expect(declared.slice().sort()).toEqual(d.resources.map(r=>r.row_id).sort());expect(new Set(declared).size).toBe(27);
 for(const m of pack.materials)expect(completeness().entries.find(e=>e.expectedResourceId===pack.normId+':derived-order:'+m.id)).toMatchObject({unitId:m.orderUnitId,quantityRule:'DERIVED_PURCHASE_BALANCE_FROM_EXACT_CONSUMPTION_STOCK_RESERVE_QUANTUM',resolution:{kind:'ROW',rowId:prefix+':'+m.id}});
});
it('declares object/product/supply facts required for positive length, stock references only for positive stock',()=>{
 const ids=[...pack.scopeFacts.map(f=>f.id),...pack.machines.map(m=>m.parameterId),...pack.materials.flatMap(m=>[m.specificationId,m.id+'_stock',m.id+'_reserve',m.id+'_quantum'])];
 for(const id of ids)expect(d.parameters.find(p=>p.parameter_id===id)?.constraints_json?.requiredWhen).toEqual({kind:'greater_than',parameterId:'kerb_length_m',value:0});
 for(const m of pack.materials)expect(d.parameters.find(p=>p.parameter_id===m.id+'_stock_compatibility_reference')?.constraints_json?.requiredWhen).toEqual({kind:'greater_than',parameterId:m.id+'_stock',value:0});
});
it('applies actual supply quantum after stock/reserve without changing physical concrete or nails',async()=>{
 const r=await compile({...control(),concrete_stock:0.5,concrete_stock_compatibility_reference:'CONTROL_ONLY suitable V15 batch',concrete_reserve:0.1,concrete_quantum:0.2});
 expect(by(r,'concrete')?.quantity).toBe('1');expect(by(r,'concrete-consumed')?.quantity).toBe('1.3845');
 expect(by(r,'nails')?.quantity).toBe('1');expect(by(r,'nails-consumed')?.quantity).toBe('0.000355');
});
