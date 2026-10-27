import {canonicalEstimateResourceOperationSections,canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
// Prospective real shared-compiler cases. WORK only; no canonical/test execution acceptance.
import {readFileSync}from'node:fs';import{createHash}from'node:crypto';
import {estimateDeterministicHash}from'../estimateDeterministicHash';
import {buildCanonicalRevisionCommitPayload}from'../backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds}from'../backendPlatform/canonicalEstimateArtifactContract';
import {elecorSingleRouteMaterialDefinitionR1 as base,elecorSingleRouteControlInputR1 as baseControl,prefix}from'./elecorSingleRouteMaterialR1';
import {compileElecorMechanicalProjectFixingsR1 as compile,elecorMechanicalProjectFixingsDefinitionR1 as definition,
 elecorMechanicalProjectFixingsControlInputR1 as control,elecorMechanicalProjectFixingsPackR1 as pack,
 elecorMechanicalProjectFixingsOwnerR1 as owner}from'./elecorMechanicalProjectFixingsCompletionR1';
const qty=(r:Awaited<ReturnType<typeof compile>>,suffix:string)=>r.rows.find(x=>x.row_id===prefix+':'+suffix)?.quantity;
const row=(r:Awaited<ReturnType<typeof compile>>)=>r.rows.find(x=>x.row_id===owner);
const provenance={kind:'manual',reason:'CONTROL_ONLY exact535463 percompleteassembly price; not a labour norm'};
const remaining=['installation-labour','end-node-components','tools','access-protection','acceptance','delivery-handling','cleanup-disposal'];
function savedArtifactNeeds(result:Awaited<ReturnType<typeof compile>>,rowOverrides:unknown){
 const checksum=estimateDeterministicHash(result.revisionProjection),payload=buildCanonicalRevisionCommitPayload({
  rowCount:result.rows.length,currencyCode:'KGS',totals:result.totals,checksumSha256:checksum,
  compilerVersion:pack.contract,parameters:result.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},
  effectiveUserParameters:result.parameters,parentRevisionId:null,identityContract:{fixture:'TEST_ONLY_NOT_SAVED'},
  derivedParameters:result.derivedParameters,preliminaryNeeds:result.preliminaryNeeds,
  purchaseSupplyIndexV1:result.purchaseSupplyIndexV1,compositionSelectionV1:result.compositionSelectionV1});
 return canonicalArtifactPreliminaryNeeds({id:'TEST_ONLY_ELECOR_UNRESOLVED_MANUAL',release_id:'TEST_ONLY_NOT_SAVED',catalog_id:pack.catalogId,
  checksum_sha256:checksum,row_count:result.rows.length,amendment_contract:{...payload,rowOverrides:structuredClone(rowOverrides??{})}});
}

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
  const before=await compile(control()),legacyInput={...control(),elecor_fixing_method:pack.unresolvedMethod};
  for(const v of [0,1,77]){
   await expect(compile({...control(),[pack.legacyUnresolvedQuantityParameterId]:v})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
   const overrides={[pack.existingNeedRowId]:{quantity:String(v),unitPrice:'77',provenance}};
   const active=await compile(control(),overrides);
   expect([...active.rows,...active.preliminaryNeeds].some(r=>r.row_id===pack.existingNeedRowId)).toBe(false);
   expect(row(active)).toEqual(row(before));expect(active.totals).toEqual(before.totals);
   expect(active.parameters).not.toHaveProperty(pack.legacyUnresolvedQuantityParameterId);
   const legacy=await compile(legacyInput,overrides);
   expect(legacy.rows.some(r=>[pack.existingNeedRowId,owner].includes(r.row_id))).toBe(false);
   const needs=legacy.preliminaryNeeds.filter(r=>r.row_id===pack.existingNeedRowId);expect(needs).toHaveLength(1);
   expect(needs[0]).toMatchObject({quantity:String(v),unit_price:'77',missing_parameter_ids:expect.arrayContaining([pack.legacyUnresolvedQuantityParameterId]),
    calculation_trace:{preliminaryNeed:true,manualQuantityOverride:true,calculatedQuantityBeforeOverride:null,manualAmendment:provenance}});
   expect(legacy.parameters).not.toHaveProperty(pack.legacyUnresolvedQuantityParameterId);
   const saved=savedArtifactNeeds(legacy,overrides).filter(r=>r.row_id===pack.existingNeedRowId);expect(saved).toHaveLength(1);
   expect(saved[0]).toMatchObject({quantity:String(v),unit_price:'77',amount:null,included_in_estimate:false,included_in_procurement:false,procurement_eligible:false});
  }
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
  const before=await compile(control()),needId=prefix+':open-'+gap;
  for(const v of [0,1]){
   await expect(compile({...control(),[id]:v})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
   const overrides={[needId]:{quantity:String(v),unitPrice:'77',provenance}};
   await expect(compile(control(),{[needId]:{...overrides[needId],includedInProcurement:true}}))
    .rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
   const result=await compile(control(),overrides);
   const needs=result.preliminaryNeeds.filter(n=>n.row_id===needId);expect(needs).toHaveLength(1);
   expect(needs[0]).toMatchObject({quantity:String(v),unit_price:'77',missing_parameter_ids:expect.arrayContaining([id]),
    calculation_trace:{preliminaryNeed:true,manualQuantityOverride:true,calculatedQuantityBeforeOverride:null,manualAmendment:provenance}});
   expect(result.parameters).not.toHaveProperty(id);expect(result.rows.some(r=>r.row_id===needId)).toBe(false);
   expect(result.totals).toEqual(before.totals);
   expect(result.rows.filter(r=>r.included_in_procurement).map(r=>r.row_id)).toEqual(before.rows.filter(r=>r.included_in_procurement).map(r=>r.row_id));
   expect(result.preliminaryNeeds.map(n=>n.row_id)).toEqual(before.preliminaryNeeds.map(n=>n.row_id));
   const saved=savedArtifactNeeds(result,overrides).filter(n=>n.row_id===needId);expect(saved).toHaveLength(1);
   expect(saved[0]).toMatchObject({quantity:String(v),unit_price:'77',amount:null,included_in_estimate:false,included_in_procurement:false,procurement_eligible:false});
  }
 });
});


// Existing producer/source-only opt-in: partial drilling inventory, not a new work.
describe('existing ELECOR owned initial drilling block; runtime UNRUN',()=>{
 const options={ownedDrillingInventorySourceOnly:true} as const;
 const inventoryPrefix=prefix+':owned-drilling';
 const keys=['body','sds-chuck','auxiliary-handle','depth-stop','spare-chuck','cloth','case'];
 const ids=keys.map(key=>inventoryPrefix+':'+key);
 const facts=():Record<string,unknown>=>{
  const d=definition(undefined,options),value=(id:string)=>{
   const q=d.parameters.find(p=>p.parameter_id===id),values=q?.constraints_json?.values;
   if(!Array.isArray(values)||typeof values[0]!=='string')throw Error('TEST_OWNED_DRILLING_EXACT_CHOICE_REQUIRED');return values[0];};
  return {...control(),elecor_owned_drilling_method:value('elecor_owned_drilling_method'),elecor_owned_drilling_usable_kits:'2',
   elecor_owned_drilling_inventory_reference:'TEST_ONLY declared allocation; not actual stock or source admission',
   elecor_owned_drilling_fit:value('elecor_owned_drilling_fit')};
 };
 it('adds only seven declared physical roles under opt-in and preserves every old resource and all seven whole-installation needs',()=>{
  const before=definition(),next=definition(undefined,options);
  expect(before.resources.some(r=>ids.includes(r.row_id))).toBe(false);
  expect(next.resources).toHaveLength(before.resources.length+7);
  expect(new Set(next.resources.map(r=>r.row_id)).size).toBe(next.resources.length);
  for(const r of before.resources)expect(next.resources.find(x=>x.row_id===r.row_id)).toEqual(r);
  for(const gap of remaining)expect(next.resources.find(r=>r.row_id===prefix+':open-'+gap)).toEqual(before.resources.find(r=>r.row_id===prefix+':open-'+gap));
  const added=next.resources.filter(r=>ids.includes(r.row_id));
  expect(added.map(r=>r.row_id)).toEqual(ids);
  expect(added.every(r=>r.cost_owner_id===null&&!r.procurement_eligible&&r.resource_graph.costTreatment==='INFORMATIONAL_SCOPE')).toBe(true);
  const witness=added[0]!.source_metadata?.primaryCapabilityWitness as {path:string;sha256:string};
  expect(createHash('sha256').update(readFileSync(witness.path)).digest('hex')).toBe(witness.sha256);
  expect(added[0]?.resource_graph.physicalProvisionV1).toMatchObject({wholeToolKitClaimed:false,compatibleDrillBitClaimed:false,dustExtractionClaimed:false});
  for(const id of ['elecor_owned_drilling_usable_kits','elecor_owned_drilling_inventory_reference','elecor_owned_drilling_fit'])
   expect(next.parameters.find(q=>q.parameter_id===id)?.truth_metadata.resource_branch_consumers).toHaveLength(7);
 });
 it('compiles two actual declared initial blocks as14physical roles without a second payment/order or closing the unknown whole-tool scope',async()=>{
  const before=await compile(control()),input=facts(),saved=JSON.stringify(input);
  const r=await compile(input,{[ids[0]!]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}},options);
  expect(JSON.stringify(input)).toBe(saved);
  const parts=r.rows.filter(x=>ids.includes(x.row_id));expect(parts).toHaveLength(7);
  expect(parts.reduce((n,x)=>n+Number(x.quantity),0)).toBe(14);
  expect(parts.every(x=>!x.included_in_estimate&&!x.included_in_procurement)).toBe(true);
  expect(r.totals).toEqual({...before.totals,excludedRowCount:before.totals.excludedRowCount+7});
  for(const gap of remaining)expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':open-'+gap)).toBe(true);
  expect(r.rows.filter(x=>x.included_in_procurement).map(x=>x.row_id)).toEqual(before.rows.filter(x=>x.included_in_procurement).map(x=>x.row_id));
 });
 it('keeps omitted inventory unknown and reuses the same row IDs in actual fixing/completion operations',async()=>{
  const input=facts();delete input.elecor_owned_drilling_usable_kits;
  const r=await compile(input,undefined,options);
  for(const id of ids)expect(r.preliminaryNeeds.find(n=>n.row_id===id)).toMatchObject({quantity:null,
   missing_parameter_ids:expect.arrayContaining(['elecor_owned_drilling_usable_kits'])});
  const d=definition(undefined,options),parts=d.resources.filter(x=>ids.includes(x.row_id));
  const sections=canonicalEstimateResourceOperationSections(parts.map(x=>({rowId:x.row_id,titleRu:x.title_ru,operation:x.resource_graph.operationCompositionV1})));
  expect(sections.find(x=>x.operation?.operationId==='project-mechanical-fixings')?.resourceIds).toEqual(ids);
  expect(sections.find(x=>x.operation?.operationId==='completion')?.sharedResources.map(x=>x.rowId)).toEqual(ids);
  await expect(compile({...facts(),elecor_owned_drilling_usable_kits:'0'},undefined,options)).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  await expect(compile({...facts(),elecor_owned_drilling_usable_kits:'1.5'},undefined,options)).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
});


describe('same ELECOR whole-operation PPR source-only opt-in; runtime UNRUN',()=>{
 const options={wholeOperationProjectFactsSourceOnly:true} as const,post=prefix+':whole-post',labour=post+':whole-labour';
 const conditionalClosed=['installation-labour','acceptance','delivery-handling','cleanup-disposal'];
 const open=['end-node-components','tools','access-protection'];
 const facts=():Record<string,unknown>=>{
  const d=definition(undefined,options),value=(id:string)=>{
   const values=d.parameters.find(q=>q.parameter_id===id)?.constraints_json?.values;
   if(!Array.isArray(values)||typeof values[0]!=='string')throw Error('TEST_ELECOR_WHOLE_EXACT_CHOICE_REQUIRED');return values[0];};
  return {...control(),elecor_whole_post_method:value('elecor_whole_post_method'),elecor_whole_post_scope_fit:value('elecor_whole_post_scope_fit'),
   elecor_whole_post_ppr_reference:'TEST_ONLY whole-route labour sheet; not actual project admission',elecor_whole_post_labour_hours:'5.5',
   elecor_whole_post_qa_count:'3',elecor_whole_post_qa_program_reference:'TEST_ONLY QA programme; no completed test results',
   elecor_whole_post_price_scope:value('elecor_whole_post_price_scope'),elecor_whole_post_delivery_trips:'0',elecor_whole_post_waste_trips:'0'};
 };
 it('preserves default material scope, adds only4rows on opt-in and retains the three uncovered whole-installation needs',()=>{
  const before=definition(),next=definition(undefined,options);
  expect(next.resources).toHaveLength(before.resources.length+4);expect(next.formulas).toHaveLength(before.formulas.length+4);
  expect(new Set(next.resources.map(r=>r.row_id)).size).toBe(next.resources.length);
  for(const old of before.resources.filter(r=>![...conditionalClosed,...open].some(k=>r.row_id===prefix+':open-'+k)))
   expect(next.resources.find(r=>r.row_id===old.row_id)).toEqual(old);
  const withoutOperation=(resource:typeof before.resources[number])=>{
   const {row_sha256:_sha,resource_graph,...body}=resource;
   const {operationCompositionV1:_operation,...graph}=resource_graph;return{...body,resource_graph:graph};};
  const unknownRows=open.map(key=>next.resources.find(r=>r.row_id===prefix+':open-'+key)!);
  for(const resource of unknownRows){
   const old=before.resources.find(r=>r.row_id===resource.row_id)!;
   expect(withoutOperation(resource)).toEqual(withoutOperation(old));
   const uses=canonicalEstimateOperationReferences(resource.resource_graph.operationCompositionV1);
   expect(uses[0]?.operationId).toBe('completion');
   expect(uses.slice(1).every(op=>op.groupId===prefix&&JSON.stringify(op.whenResourcePresent)===JSON.stringify([labour]))).toBe(true);
   expect(new Set(uses.map(op=>op.operationId)).size).toBe(uses.length);
  }
  const needsOnly=canonicalEstimateResourceOperationSections(unknownRows.map(r=>({rowId:r.row_id,titleRu:r.title_ru,operation:r.resource_graph.operationCompositionV1})));
  expect(needsOnly).toHaveLength(1);expect(needsOnly[0]?.operation?.operationId).toBe('completion');
  expect(needsOnly[0]?.resourceIds).toEqual(unknownRows.map(r=>r.row_id));
  expect(next.resources.find(r=>r.row_id===post+':qa-included')).toMatchObject({cost_owner_id:labour,procurement_eligible:false,
   resource_graph:{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',includedInResourceOwnerRowId:labour}});
  const whole=next.resources.find(r=>r.row_id===labour)!;
  const sections=canonicalEstimateResourceOperationSections([{rowId:whole.row_id,titleRu:whole.title_ru,operation:whole.resource_graph.operationCompositionV1}]);
  expect(sections).toHaveLength(6);
  expect(sections.flatMap(section=>section.resourceIds)).toEqual([labour]);
  expect(sections.flatMap(section=>section.sharedResources).map(r=>r.rowId)).toEqual(Array(5).fill(labour));
  const withNeeds=canonicalEstimateResourceOperationSections([whole,...unknownRows].map(r=>({rowId:r.row_id,titleRu:r.title_ru,operation:r.resource_graph.operationCompositionV1})));
  expect(withNeeds).toHaveLength(6);
  expect(withNeeds.find(s=>s.operation?.operationId==='ppr-cut-and-prepare')?.sharedResources.map(r=>r.rowId))
   .toEqual(expect.arrayContaining([prefix+':open-tools',prefix+':open-access-protection']));
  expect(withNeeds.find(s=>s.operation?.operationId==='ppr-close-covers')?.sharedResources.map(r=>r.rowId))
   .toEqual(expect.arrayContaining(unknownRows.map(r=>r.row_id)));
  expect(withNeeds.find(s=>s.operation?.operationId==='ppr-qa')?.sharedResources.map(r=>r.rowId)).toContain(prefix+':open-access-protection');
  for(const resource of unknownRows)expect(withNeeds.flatMap(s=>s.resourceIds).filter(id=>id===resource.row_id)).toHaveLength(1);
  expect(whole.source_metadata).toMatchObject({manufacturerLabourNormAuthored:false,projectAuthenticated:false,sourceAuthorityPromoted:false,publicationAllowed:false});
 });
 it('uses5.5declared whole-hours once and includes3QAchecks, without deriving a rate or ordering zero-trip services',async()=>{
  const r=await compile(facts(),{[labour]:{unitPrice:'77',provenance},[post+':qa-included']:{unitPrice:'88',includedInEstimate:true,includedInProcurement:true,provenance}},options);
  expect(r.rows.find(x=>x.row_id===labour)).toMatchObject({quantity:'5.5',unit_price:'77',amount:'423.5',included_in_estimate:true,included_in_procurement:false});
  expect(r.rows.find(x=>x.row_id===post+':qa-included')).toMatchObject({quantity:'3',included_in_estimate:false,included_in_procurement:false});
  expect(r.rows.some(x=>[post+':delivery',post+':waste'].includes(x.row_id))).toBe(false);
  for(const key of conditionalClosed)expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':open-'+key)).toBe(false);
  for(const key of open)expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':open-'+key)).toBe(true);
  expect(r.rows.filter(x=>x.row_id===labour&&x.included_in_estimate)).toHaveLength(1);
 });
 it('keeps absent PPRhours/node and external-service scope unresolved, with no manual-source bypass',async()=>{
  const legacyPrice=await compile(facts(),{[prefix+':open-installation-labour']:{unitPrice:'88',provenance}},options);
  expect(legacyPrice.rows.find(r=>r.row_id===labour)?.unit_price).toBeNull();
  const input=facts();delete input.elecor_whole_post_labour_hours;
  const missing=await compile(input,undefined,options);
  expect(missing.preliminaryNeeds.find(n=>n.row_id===labour)?.missing_parameter_ids).toContain('elecor_whole_post_labour_hours');
  const node=facts();delete node.elecor_fixing_project_node_acceptance;
  expect((await compile(node,undefined,options)).preliminaryNeeds.find(n=>n.row_id===labour)?.missing_parameter_ids).toContain('elecor_fixing_project_node_acceptance');
  const delivery=await compile({...facts(),elecor_whole_post_delivery_trips:'1'},undefined,options);
  expect(delivery.preliminaryNeeds.find(n=>n.row_id===post+':delivery')?.missing_parameter_ids).toContain('elecor_whole_post_delivery_scope_reference');
  for(const key of ['elecor_whole_post_labour_hours','elecor_whole_post_qa_count'])
   await expect(compile({...facts(),[key]:'0'},undefined,options)).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
});


describe('same ELECOR compatible endcap component source-only opt-in; runtime UNRUN',()=>{
 const options={endcapProjectQuantitySourceOnly:true} as const,p=prefix+':endcap',owner=p+':order';
 const facts=():Record<string,unknown>=>{
  const d=definition(undefined,options),value=(id:string)=>{
   const values=d.parameters.find(q=>q.parameter_id===id)?.constraints_json?.values;
   if(!Array.isArray(values)||typeof values[0]!=='string')throw Error('TEST_ELECOR_ENDCAP_EXACT_CHOICE_REQUIRED');return values[0];};
  return {...control(),elecor_endcap_method:value('elecor_endcap_method'),elecor_endcap_count:'2',
   elecor_endcap_ppr_reference:'TEST_ONLY endpoint schedule E1; not authenticated PPR',elecor_endcap_fit:value('elecor_endcap_fit'),
   elecor_endcap_price_scope:value('elecor_endcap_price_scope'),elecor_endcap_stock:'0',elecor_endcap_reserve:'1',
   elecor_endcap_supplier_quantum_pcs:'4',elecor_endcap_supply_reference:'TEST_ONLY actual supplier quote4physical units; not manufacturer pack fact'};
 };
 it('adds only6component/balance rows and preserves all old resources and the unresolved end-node need',()=>{
  const before=definition(),next=definition(undefined,options);expect(next.resources).toHaveLength(before.resources.length+6);
  for(const old of before.resources)expect(next.resources.find(r=>r.row_id===old.row_id)).toEqual(old);
  expect(new Set(next.resources.map(r=>r.row_id)).size).toBe(next.resources.length);
  expect(next.parameters.find(q=>q.parameter_id==='elecor_endcap_count')?.default_value).toBeNull();
  expect(next.parameters.find(q=>q.parameter_id==='elecor_endcap_supplier_quantum_pcs')?.default_value).toBeNull();
  const added=next.resources.filter(r=>r.row_id.startsWith(p+':'));
  expect(added.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id)).toEqual([owner]);
  const paid=added.find(r=>r.row_id===owner)!;
  expect(paid.source_metadata).toMatchObject({noManufacturerPackQuantityAdmitted:true,projectAuthenticated:false,publicationAllowed:false});
  expect(added.filter(r=>r.resource_graph.excludeKnownZeroQuantityV1===true).map(r=>r.row_id)).toEqual([owner]);
  const sources=paid.source_metadata?.primaryArtifactCandidates as {logicalPath:string;sha256:string;bytes:number}[];
  expect(sources).toHaveLength(1);const primary=sources[0]!;
  expect(primary).toMatchObject({sha256:'aadd7920e9214ebe6c6ecf16836416037f92d531a7b664a4bcbad17dc33eb6c5',bytes:282938,totalPdfPages:2,readPdfPages:[2],wholeDocumentRead:false,
    pageTextSha256:'4cf1618ebfb5d300f90820b72ce9cb250b687e45af3ac4a9006a82d8e983c459',projectEndpointCountAuthored:false,manufacturerPackQuantityAdmitted:false,sourceAuthorityPromoted:false});
  const bytes=readFileSync(primary.logicalPath);expect(bytes.length).toBe(primary.bytes);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(primary.sha256);
  for(const resource of added)expect(resource.source_metadata?.primaryArtifactCandidates).toEqual(sources);
  const addedParameters=next.parameters.filter(q=>!before.parameters.some(old=>old.parameter_id===q.parameter_id));
  expect(addedParameters).toHaveLength(11);
  const derived=addedParameters.filter(q=>q.truth_metadata.visibility_role==='INTERNAL_ONLY');expect(derived).toHaveLength(1);
  expect(derived[0]?.truth_metadata.effective_resource_quantity_v1).toMatchObject({sourceRowId:owner,unitId:'pcs'});
  for(const parameter of addedParameters){
   expect(parameter.default_value).toBeNull();
   if(parameter.truth_metadata.visibility_role==='INTERNAL_ONLY')expect(Object.hasOwn(parameter.truth_metadata,'guide')).toBe(false);
  }
  const witness=paid.source_metadata?.primaryCapabilityWitness as {path:string;sha256:string};
  expect(createHash('sha256').update(readFileSync(witness.path)).digest('hex')).toBe(witness.sha256);
  const sections=canonicalEstimateResourceOperationSections([{rowId:paid.row_id,titleRu:paid.title_ru,operation:paid.resource_graph.operationCompositionV1}]);
  expect(sections.find(s=>s.operation?.operationId==='material-plan')?.resourceIds).toEqual([owner]);
  expect(sections.find(s=>s.operation?.operationId==='completion')?.sharedResources.map(r=>r.rowId)).toEqual([owner]);
 });
 it('orders the declared supply quantum once and rebalances a saved manual order without transferring the legacy node price',async()=>{
  const input=facts(),saved=JSON.stringify(input);
  const result=await compile(input,{[owner]:{unitPrice:'7',provenance},[prefix+':open-end-node-components']:{unitPrice:'88',provenance}},options);
  expect(JSON.stringify(input)).toBe(saved);
  expect(result.rows.find(r=>r.row_id===owner)).toMatchObject({quantity:'4',unit_price:'7',amount:'28',included_in_procurement:true});
  expect(result.rows.find(r=>r.row_id===p+':consumed')).toMatchObject({quantity:'2',included_in_estimate:false,included_in_procurement:false});
  expect(result.rows.find(r=>r.row_id===p+':remaining')?.quantity).toBe('2');expect(result.rows.find(r=>r.row_id===p+':free')?.quantity).toBe('1');
  expect(result.preliminaryNeeds.some(n=>n.row_id===prefix+':open-end-node-components')).toBe(true);
  const manual=await compile(input,{[owner]:{quantity:'8',unitPrice:'7',provenance}},options);
  expect(manual.rows.find(r=>r.row_id===owner)).toMatchObject({quantity:'8',amount:'56'});
  expect(manual.rows.find(r=>r.row_id===p+':remaining')?.quantity).toBe('6');
  const zero=await compile({...input,elecor_endcap_count:'0',elecor_endcap_reserve:'0'}, {[owner]:{unitPrice:'7',provenance}}, options);
  const zeroOrder=zero.rows.filter(r=>r.row_id===owner);expect(zeroOrder).toHaveLength(1);
  expect(zeroOrder[0]).toMatchObject({quantity:'0',unit_price:'7',included_in_estimate:false,included_in_procurement:false,
   calculation_trace:{knownZeroExclusionV1:{calculatedQuantity:'0',orderedQuantity:'0'}}});
  expect(zero.preliminaryNeeds.some(n=>n.row_id===prefix+':open-end-node-components')).toBe(true);
  const spare=await compile({...input,elecor_endcap_count:'0',elecor_endcap_reserve:'0'}, {[owner]:{quantity:'4',unitPrice:'7',provenance}}, options);
  expect(spare.rows.find(r=>r.row_id===owner)).toMatchObject({quantity:'4',amount:'28',included_in_estimate:true,included_in_procurement:true});
  const noPrice=await compile(input,{[prefix+':open-end-node-components']:{unitPrice:'88',provenance}},options);
  expect(noPrice.rows.find(r=>r.row_id===owner)?.unit_price).toBeNull();
 });
 it('keeps missing endpoint/supply facts unknown, rejects a third endpoint and coexists with both earlier explicit opt-ins',async()=>{
  for(const id of ['elecor_endcap_count','elecor_endcap_supplier_quantum_pcs','elecor_endcap_supply_reference']){
   const input=facts();delete input[id];
   const out=await compile(input,undefined,options);
   const need=out.preliminaryNeeds.find(n=>n.row_id===owner);expect(need?.missing_parameter_ids).toContain(id);
   if(id!=='elecor_endcap_supply_reference')expect(need?.quantity).toBeNull();
  }
  const stock=await compile({...facts(),elecor_endcap_stock:'1'},undefined,options);
  expect(stock.preliminaryNeeds.find(n=>n.row_id===owner)?.missing_parameter_ids).toContain('elecor_endcap_stock_reference');
  await expect(compile({...facts(),elecor_endcap_count:'3'},undefined,options)).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  const unconfirmed=await compile(facts(),{[owner]:{quantity:'3',unitPrice:'7',provenance}},options);
  expect(unconfirmed.rows.find(r=>r.row_id===owner)).toMatchObject({quantity:'3',amount:null,included_in_procurement:false});
  const all=definition(undefined,{...options,ownedDrillingInventorySourceOnly:true,wholeOperationProjectFactsSourceOnly:true});
  expect(all.resources).toHaveLength(definition().resources.length+7+4+6);
  expect(new Set(all.resources.map(r=>r.row_id)).size).toBe(all.resources.length);
  for(const key of ['end-node-components','tools','access-protection'])expect(all.resources.some(r=>r.row_id===prefix+':open-'+key)).toBe(true);
 });
});
