// WORK scenarios, PREPARED / NOT RUN. This key is a proposed append, not a current catalog ID.
// Root stages/integrates the exact three captured manufacturer artifacts before this source-pin test.
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import {compileLegrandP31BlindEpJointFastenersR1,legrandP31BlindEpJointFastenerDefinitionR1 as definition,
 legrandP31BlindEpJointControlInputR1 as control,legrandP31BlindEpJointPackR1 as pack,p31EpPrefixR1 as prefix} from './legrandP31BlindEpJointFastenersR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateResourceDefinition,type CanonicalEstimateFormulaDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {resolveCanonicalEstimatePhysicalNormApplicabilityV1 as physical} from '../backendPlatform/canonicalEstimatePhysicalNormProjection';
import {effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const d=definition(),catalogId=pack.proposedIdentity.catalogId,owner=prefix+':fastener-order';
const compile=(input:Record<string,unknown>,overrides?:Parameters<typeof compileLegrandP31BlindEpJointFastenersR1>[2])=>
 compileLegrandP31BlindEpJointFastenersR1(catalogId,input,overrides);
const provenance={kind:'manual',reason:'CONTROL_ONLY supply arithmetic/manual preservation; not a construction norm'};
const qty=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity;
const raw=(resources:CanonicalEstimateResourceDefinition[],formulas:CanonicalEstimateFormulaDefinition[]=[...d.formulas])=>compileCanonicalEstimateCore({operation:'compile',catalogId,compilerVersion:pack.contract,
 primaryMeasureParameterId:'p31_joint_count',parameterDefinitions:d.parameters,formulaDefinitions:formulas,resourceDefinitions:resources,
 submittedParameters:control(),confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:13,
 hashJson:async value=>estimateDeterministicHash(value)});
describe('P31 blind75–300 EP source-bound joint fastener subwork',()=>{
 it('pins actual primary diagrams/product card and keeps reviewed8M6 norm unchanged',()=>{
  for(const artifact of pack.manufacturerArtifacts)
   expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),artifact.path))).digest('hex')).toBe(artifact.sha256);
  expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.existingNormSourcePack))).digest('hex')).toBe(pack.existingNormSourcePackSha256);
  expect(pack.fastener).toMatchObject({sku:'341895',unitId:'item',factoryPackageAccepted:false,unitPriceInherited:false});
  expect(pack.proposedIdentity.persisted).toBe(false);expect(pack.fullTechnicalAcceptance).toBe(false);
  expect(pack.couplerChoices.map(c=>c.sku)).toEqual(['341213']);
  expect(pack.knownEpAssemblyFacts).toMatchObject({sidePiecesPerJoint:2,m6PerSidePiece:4,m6PerJoint:8,labourManHourAccepted:false});
 });
 it('uses actual joint count as sole primary and requires all project/supply facts without defaults',()=>{
  expect(d.ordinaryParameterIds).toEqual(['p31_joint_count']);expect(d.parameters.find(p=>p.parameter_id==='p31_joint_count')?.unit_id).toBe('pcs');
  expect(d.parameters.every(p=>p.default_value===null)).toBe(true);expect(d.runtimeInput).toEqual({});
  for(const id of ['p31_tray_sku','p31_coupler_sku','p31_scope_confirmation','p31_project_reference','p31_supply_scope','p31_supply_reference',
   'p31_stock_item','p31_reserve_item','p31_supplier_quantum_item'])
   expect(d.parameters.find(p=>p.parameter_id===id)?.constraints_json?.requiredWhen).toEqual({kind:'greater_than',parameterId:'p31_joint_count',value:0});
  expect(d.parameters.some(p=>p.parameter_id==='q'||p.parameter_id==='route_length_m')).toBe(false);
 });
 it.each(pack.trayProducts.flatMap(tray=>pack.couplerChoices.map(coupler=>[tray.sku,coupler.sku,tray.widthMm] as const)))(
  'accepts exact blind tray%s/coupler%s at width%s without counting another catalog type',async(tray,coupler,width)=>{
   const r=await compile({...control(),p31_tray_sku:tray,p31_coupler_sku:coupler});
   expect(qty(r,'fastener-consumed')).toBe('24');expect(qty(r,'fastener-order')).toBe('24');
   const row=d.resources.find(x=>x.row_id===prefix+':fastener-consumed')!;
   const resolved=physical({parameters:r.parameters,capturedAt:'CONTROL_ONLY',resourceGraph:row.resource_graph,normativeTrace:row.source_metadata.normativeTrace});
   expect(resolved).toMatchObject({status:'APPLIED',norm_id:pack.existingNormId,calculated_tray_joint_fastener_quantity_piece:24});
   expect(r.parameters.p31_tray_width_mm).toBe(width);
  });
 it('calculates one real joint as8 bolt-with-nut assemblies, not8 extra nuts or metres',async()=>{
  const r=await compile({...control(),p31_joint_count:1,p31_tray_sku:'480301',p31_coupler_sku:'341213'});
  expect(qty(r,'joint-count')).toBe('1');expect(qty(r,'fastener-consumed')).toBe('8');expect(qty(r,'fastener-order')).toBe('8');
  expect(r.rows.filter(x=>x.included_in_estimate).map(x=>x.row_id)).toEqual([owner]);
  expect(r.rows.filter(x=>x.included_in_procurement).map(x=>x.row_id)).toEqual([owner]);
  expect(r.rows.find(x=>x.row_id===owner)).toMatchObject({unit_id:'item',unit_price:null,amount:null});
  expect(d.resources.filter(x=>x.procurement_eligible).map(x=>x.row_id)).toEqual([owner]);
 });
 it('applies supplier quantum to the new order only and preserves physical24 assembly consumption',async()=>{
  const r=await compile({...control(),p31_stock_item:3,p31_stock_reference:'CONTROL_ONLY compatible341895 inventory',p31_reserve_item:2,p31_supplier_quantum_item:10});
  expect(qty(r,'fastener-consumed')).toBe('24');expect(qty(r,'fastener-order')).toBe('30');
  expect(qty(r,'fastener-remaining')).toBe('9');expect(qty(r,'fastener-free')).toBe('7');
 });
 it('uses sufficient compatible stock without inventing a compulsory factory pack',async()=>{
  const r=await compile({...control(),p31_stock_item:26,p31_stock_reference:'CONTROL_ONLY compatible341895 inventory',p31_reserve_item:2,p31_supplier_quantum_item:10});
  expect(qty(r,'fastener-order')).toBe('0');expect(qty(r,'fastener-remaining')).toBe('2');expect(qty(r,'fastener-free')).toBe('0');
  expect(qty(r,'fastener-consumed')).toBe('24');expect(r.preliminaryNeeds).toHaveLength(6);
 });
 it('preserves manual order/price/title through recalculate and does not turn supply40 into consumption40',async()=>{
  const r=await compile(control(),{[owner]:{quantity:'40',unitPrice:'100',titleRu:'Сохранённый отдельный заказ341895 с гайкой',provenance}});
  expect(r.rows.find(x=>x.row_id===owner)).toMatchObject({quantity:'40',unit_price:'100',amount:'4000',title_ru:'Сохранённый отдельный заказ341895 с гайкой'});
  expect(qty(r,'fastener-consumed')).toBe('24');expect(qty(r,'fastener-remaining')).toBe('16');
 });
 it('retains insufficient manual supply, exposes physical/reserve shortages and blocks procurement',async()=>{
  const r=await compile({...control(),p31_stock_item:3,p31_stock_reference:'CONTROL_ONLY inventory',p31_reserve_item:2,p31_supplier_quantum_item:10},
   {[owner]:{quantity:'20',unitPrice:'100',includedInProcurement:true,provenance}});
  expect(qty(r,'fastener-shortage')).toBe('1');expect(qty(r,'fastener-reserve-deficit')).toBe('2');
  expect(r.rows.find(x=>x.row_id===owner)).toMatchObject({quantity:'20',procurement_readiness:'SHORTAGE',included_in_procurement:false});
 });
 it('rejects a manual order that violates the explicitly confirmed supplier quantum',async()=>{
  await expect(compile({...control(),p31_supplier_quantum_item:10},{[owner]:{quantity:'25',provenance}})).rejects.toBeDefined();
 });
 it('preserves cost/procurement exclusions without deleting physical balance or six open obligations',async()=>{
  const r=await compile(control(),{[owner]:{quantity:'40',unitPrice:'100',includedInEstimate:false,includedInProcurement:false,provenance}});
  expect(r.rows.find(x=>x.row_id===owner)).toMatchObject({quantity:'40',unit_price:'100',included_in_estimate:false,included_in_procurement:false});
  expect(qty(r,'fastener-remaining')).toBe('16');expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual(pack.sourceNeeds.map(g=>prefix+':open-'+g.id).sort());
 });
 it('preserves an explicitly saved unresolved-need exclusion/title/price while keeping its missing norm visible',async()=>{
  const id=prefix+':open-assembly-labour',r=await compile(control(),{[id]:{includedInEstimate:false,unitPrice:'77',titleRu:'Сохранённый незакрытый монтаж',provenance}});
  expect(r.preliminaryNeeds.find(n=>n.row_id===id)).toMatchObject({quantity:null,selected:false,unit_price:'77',title_ru:'Сохранённый незакрытый монтаж'});
  expect(r.preliminaryNeeds).toHaveLength(6);expect(qty(r,'fastener-consumed')).toBe('24');
 });
 it('resets quantity to the calculated order while preserving an explicitly saved price',async()=>{
  const r=await compile(control(),{[owner]:{unitPrice:'100',provenance}});
  expect(r.rows.find(x=>x.row_id===owner)).toMatchObject({quantity:'24',unit_price:'100',amount:'2400'});
  expect(qty(r,'fastener-consumed')).toBe('24');
 });
 it.each(['p31_tray_sku','p31_coupler_sku','p31_scope_confirmation','p31_project_reference','p31_supply_scope','p31_supply_reference'])(
  'does not bypass missing exact fact%s through a manual order',async fact=>{
   const input={...control()};delete input[fact];const r=await compile(input,{[owner]:{quantity:'40',provenance}});
   expect(r.rows.some(x=>x.row_id===owner)).toBe(false);
   expect(r.preliminaryNeeds.some(x=>x.row_id===owner&&x.missing_parameter_ids.includes(fact))).toBe(true);
  });
 it.each(['p31_stock_item','p31_reserve_item','p31_supplier_quantum_item'])('keeps unknown supply fact%s unresolved without inventing zero/one',async fact=>{
  const input={...control()};delete input[fact];const r=await compile(input);
  expect(qty(r,'fastener-consumed')).toBe('24');
  expect(r.preliminaryNeeds.some(x=>x.row_id===owner&&x.quantity===null&&x.missing_parameter_ids.includes(fact))).toBe(true);
 });
 it('requires stock evidence only for positive stock and never silently uses undocumented inventory',async()=>{
  const zero=await compile(control());expect(qty(zero,'fastener-order')).toBe('24');
  const r=await compile({...control(),p31_stock_item:1},{[owner]:{quantity:'40',provenance}});
  expect(r.preliminaryNeeds.some(x=>x.row_id===owner&&x.missing_parameter_ids.includes('p31_stock_reference'))).toBe(true);
  expect(qty(r,'fastener-consumed')).toBe('24');
  expect(d.parameters.find(p=>p.parameter_id==='p31_stock_reference')?.constraints_json?.requiredWhen)
   .toEqual({kind:'greater_than',parameterId:'p31_stock_item',value:0});
 });
 it.each([{p31_joint_count:0},{p31_joint_count:1.5},{p31_stock_item:-1},{p31_reserve_item:0.5},{p31_supplier_quantum_item:0},
  {p31_tray_sku:'480306'},{p31_coupler_sku:'482219'},{p31_coupler_sku:'480221'},{p31_supply_scope:'Крепёж уже включён в общую услугу'}])(
  'rejects excluded or invalid scope%j',async change=>{await expect(compile({...control(),...change})).rejects.toBeDefined();});
 it.each([{p31_tray_width_mm:400},{p31_torque_nm:9},{p31_coupler_reference:'Eclic LG-480221'},{p31_containment_type:'PLASTIC_CHANNEL'}])(
  'rejects forged manufacturer passport fields%j',async change=>{await expect(compile({...control(),...change})).rejects.toBeDefined();});
 it('does not accept a submitted effective order output as inventory or a second source norm',async()=>{
  const r=await compile({...control(),[effectiveResourceQuantityParameterId(owner)]:999});
  expect(qty(r,'fastener-order')).toBe('24');expect(qty(r,'fastener-remaining')).toBe('0');
 });
 it('rejects manual pins on source consumption and all derived information, including equal values',async()=>{
  for(const [suffix,value] of [['joint-count','3'],['fastener-consumed','24'],['fastener-remaining','0'],['fastener-free','0'],['fastener-shortage','0'],['fastener-reserve-deficit','0']])
   await expect(compile(control(),{[prefix+':'+suffix]:{quantity:value,provenance}})).rejects.toBeDefined();
 });
 it('retains all six source-owned needs and rejects fake application norms through inputs or manual rows',async()=>{
  const r=await compile(control());expect(r.rows).toHaveLength(7);expect(r.preliminaryNeeds).toHaveLength(6);
  for(const gap of pack.sourceNeeds){const id='p31_open_'+gap.id.replaceAll('-','_');
   expect(d.parameters.find(p=>p.parameter_id===id)?.truth_metadata).toMatchObject({visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM'});
   expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':open-'+gap.id&&n.quantity===null&&n.missing_parameter_ids.includes(id))).toBe(true);
   await expect(compile({...control(),[id]:1})).rejects.toBeDefined();
   await expect(compile(control(),{[prefix+':open-'+gap.id]:{quantity:'1',provenance}})).rejects.toBeDefined();
  }
 });
 it.each(['source_id','norm_id','source_document_version','source_definition_hash'])(
  'rejects source contract tampering in%s with the existing physical resolver',async field=>{
   const resources=d.resources.map(r=>r.row_id!==prefix+':fastener-consumed'?r:{...r,source_metadata:{...r.source_metadata,
    normativeTrace:[{...(r.source_metadata.normativeTrace as Record<string,unknown>[])[0],[field]:'CONTROL_ONLY_WRONG_SOURCE'}]}});
   await expect(raw(resources)).rejects.toBeDefined();
  });
 it.each([undefined,'PLASTIC_CHANNEL'])(
  'rejects missing or foreign material-system contract%p at both physical owners',async materialSystem=>{
   for(const suffix of ['fastener-consumed','fastener-order']){
    const rowId=prefix+':'+suffix;
    const resources=d.resources.map(r=>{
     if(r.row_id!==rowId)return r;
     const declared=r.resource_graph.professionalPhysicalNormBindingV1 as Record<string,unknown>;
     const {material_system:_accepted,...withoutMaterialSystem}=declared;
     const binding=materialSystem===undefined?withoutMaterialSystem:{...withoutMaterialSystem,material_system:materialSystem};
     return{...r,resource_graph:{...r.resource_graph,professionalPhysicalNormBindingV1:binding}};
    });
    await expect(raw(resources)).rejects.toMatchObject({code:'PHYSICAL_NORM_APPLICABILITY_FAILED',message:expect.stringContaining(rowId)});
   }
  });
 it('rejects a formula delta that silently replaces source8M6 with7M6 rather than accepting a copied arithmetic rate',async()=>{
  const compiled=compileFormulaGraph('p31_joint_count*7'),formulas=d.formulas.map(f=>f.formula_id!==prefix+':formula:fastener-consumed'?f:
   {...f,expression_source:'p31_joint_count*7',ast:compiled.ast,input_parameter_ids:compiled.inputParameterIds});
  await expect(raw(d.resources,formulas)).rejects.toMatchObject({code:'PHYSICAL_NORM_QUANTITY_MISMATCH'});
 });
 it('binds exactly the two physical source rows and independently resolves the full-cycle map without pricing an extra nut',()=>{
  expect(pack.normativeBindingRowIds).toEqual(d.resources.filter(r=>r.resource_graph.professionalPhysicalNormBindingV1!=null).map(r=>r.row_id));
  expect(pack.normativeBindingRowIds.some(id=>id.includes(':open-'))).toBe(false);
  expect(validateIndependentCompletenessMapReferences({completenessMap:pack.independentCompletenessMap,formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
  const consumers=buildMasterParameterCalculationConsumers({parameters:d.parameters,formulas:d.formulas,resources:d.resources});
  expect(d.parameters.every(p=>consumers.resourceConsumers[p.parameter_id].length>0)).toBe(true);
  expect(d.resources.find(r=>r.row_id===owner)?.source_metadata).toMatchObject({automaticGenericPriceInheritanceAllowed:false,selectedFastenerIncludesNut:true,extraNutPaidOwnerForbidden:true,fullTechnicalAcceptance:false});
 });
});
