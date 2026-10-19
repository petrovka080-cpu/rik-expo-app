// Prospective shared-core checks NOT_RUN; no sales unit, payment, publication or actual lineage admission.
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import {p31Ep341213PhysicalReferenceDefinitionR1 as definition,p31Ep341213PhysicalReferencePackR1 as pack,p31Ep341213PhysicalReferenceCompletenessMapR1 as completeness} from './p31Ep341213PhysicalReferenceR1';
import {legrandP31BlindEpJointFastenerDefinitionR1 as parentDefinition,legrandP31BlindEpJointControlInputR1 as control,legrandP31BlindEpJointPackR1 as parentPack} from './legrandP31BlindEpJointFastenersR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalPublisherPriceBindingIsCompatible} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const d=definition(),old:ReturnType<typeof definition>=parentDefinition(),id=pack.rowId,owner=parentPack.rowPrefix+':fastener-order';
// Same existing parent test key, explicitly TEST_ONLY; not a captured current catalog or lineage.
const catalogId=parentPack.proposedIdentity.catalogId;
const manual={kind:'manual',reason:'TEST_ONLY reference77, not a commercial supply admission'};
const input=()=>({...control(),[pack.method.parameterId]:pack.method.selected,[pack.projectReferenceId]:'TEST_ONLY exact accepted parent joint/EP side-plate schedule'});
const compile=(parameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimateCompileCoreInput['priceItems']=[],def=d)=>compileCanonicalEstimateCore({operation:'recalculate',catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'p31_joint_count',
 parameterDefinitions:[...def.parameters],formulaDefinitions:[...def.formulas],resourceDefinitions:[...def.resources],submittedParameters:parameters,confirmedParameters:{...def.runtimeInput},rowOverrides,priceItems,currencyCode:'KGS',maximumResourceRows:def.resources.length,hashJson:async x=>estimateDeterministicHash(x)});
const row=(r:Awaited<ReturnType<typeof compile>>,rowId=id)=>r.rows.find(x=>x.row_id===rowId);
it('pins the accepted exact manufacturer physical method and keeps commercial/identity/lineage admission NULL',()=>{
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.source.path))).digest('hex')).toBe(pack.source.sha256);
 expect(pack.catalogId).toBeNull();expect(pack.currentLineage).toBeNull();expect(pack.unitKitDecisionPin).toBeNull();expect(pack.commercialAdmission).toBe(false);expect(pack.publicationAllowed).toBe(false);expect(pack.sidePiecesPerAcceptedJoint).toBe(2);
});
it('appends only2facts/1formula/1INFO row and preserves all parent24/13/13 including original couplers need',()=>{
 expect([old.parameters.length,old.formulas.length,old.resources.length]).toEqual([24,13,13]);expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([26,14,14]);
 expect(d.parameters.slice(0,24)).toEqual(old.parameters);expect(d.formulas.slice(0,13)).toEqual(old.formulas);expect(d.resources.slice(0,13)).toEqual(old.resources);
 expect(d.resources.find(r=>r.row_id===pack.targetNeedRowId)).toEqual(old.resources.find(r=>r.row_id===pack.targetNeedRowId));expect(d.runtimeInput).toEqual(old.runtimeInput);
 expect(d.parameters.map(p=>p.ordinal)).toEqual(Array.from({length:26},(_,i)=>i));expect(d.resources.map(r=>r.ordinal)).toEqual(Array.from({length:14},(_,i)=>i));
});
it('does not introduce numeric defaults, order balance, paid or procurement owner or completionNeedTransition',()=>{
 expect(d.parameters.every(p=>p.default_value===null)).toBe(true);const r=d.resources.at(-1)!;expect(r.procurement_eligible).toBe(false);expect(r.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');expect(r.resource_graph.purchaseBalanceV1).toBeUndefined();
 expect(r.source_metadata).toMatchObject({automaticGenericPriceInheritanceAllowed:false,salesUnitOrKitAdmitted:false,commercialProcurementAdmitted:false,purchaseBalanceAdmitted:false,originalCouplersNeedRetained:true});
 expect(d.resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST')).toEqual(old.resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST'));expect(d.resources.filter(r=>r.procurement_eligible)).toEqual(old.resources.filter(r=>r.procurement_eligible));
 const retainedNeed=d.resources.find(r=>r.row_id===pack.targetNeedRowId);if(!retainedNeed?.source_metadata)throw Error('TEST_RETAINED_NEED_METADATA_REQUIRED');expect(retainedNeed.source_metadata.completionNeedTransitionV1).toBeUndefined();
});
it.each(['missing','unconfirmed'])('%s reference selector leaves old output and six obligations unchanged',async mode=>{
 const q:Record<string,unknown>={...control()};if(mode==='unconfirmed')q[pack.method.parameterId]=pack.method.unconfirmed;
 const a=await compile(q),b=await compile(control(),{},[],old);expect(a.rows).toEqual(b.rows);expect(a.preliminaryNeeds).toEqual(b.preliminaryNeeds);expect(a.totals).toEqual(b.totals);expect(row(a)).toBeUndefined();
});
it.each([['1','2','8'],['3','6','24'],['10','20','80']])('joint%s yields%s physical sideplates, preserving%s bolt assemblies and all six pending needs',async(joints,plates,bolts)=>{
 const r=await compile({...input(),p31_joint_count:joints});expect(row(r)).toMatchObject({unit_id:'pcs',quantity:plates,included_in_estimate:false,included_in_procurement:false});
 expect(row(r,parentPack.rowPrefix+':fastener-consumed')?.quantity).toBe(bolts);expect(r.preliminaryNeeds).toHaveLength(6);expect(r.preliminaryNeeds.some(n=>n.row_id===pack.targetNeedRowId&&n.quantity===null)).toBe(true);expect(r.totals.amount).toBe('0');
});
it.each(pack.parentRequiredFacts)('missing parent fact%s cannot be manufactured by physical reference or manual price',async missing=>{
 const q=input();delete q[missing];const r=await compile(q,{[id]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance:manual}});
 expect(row(r)).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.row_id===id&&n.missing_parameter_ids.includes(missing))).toBe(true);
});
it('missing independent side-plate schedule reference keeps reference quantity pending, never closes sales unit need',async()=>{
 const q=input();delete q[pack.projectReferenceId];const r=await compile(q);expect(row(r)).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.row_id===id&&n.missing_parameter_ids.includes(pack.projectReferenceId))).toBe(true);expect(r.preliminaryNeeds.some(n=>n.row_id===pack.targetNeedRowId)).toBe(true);
});
it.each(['manual','snapshot'] as const)('%s price77 and forced inclusion remain reference-only, not hidden payment/stock or procurement',async route=>{
 const resource=d.resources.at(-1)!;const r=await compile(input(),{[id]:{...(route==='manual'?{unitPrice:'77'}:{}),includedInEstimate:true,includedInProcurement:true,provenance:manual}},route==='snapshot'?[{price_key:resource.cost_owner_id!,unit_id:'pcs',currency_code:'KGS',unit_price:'77',snapshot_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}]:[]);
 expect(row(r)).toMatchObject({quantity:'6',unit_price:'77',amount:'462',included_in_estimate:false,included_in_procurement:false,ownership_status:'OWNED_EXCLUDED'});expect(r.totals.amount).toBe('0');expect(row(r,owner)?.unit_price).toBeNull();expect(r.preliminaryNeeds.some(n=>n.row_id===pack.targetNeedRowId)).toBe(true);
});
it('manual title and exclusion stay legal reference presentation without changing original facts or admitting sales units',async()=>{
 const q=input(),before=JSON.stringify(q),o={titleRu:'Контроль: физические боковые пластины EP341213',unitPrice:'77',includedInEstimate:false,includedInProcurement:false,provenance:manual};const r=await compile(q,{[id]:o});
 expect(row(r)).toMatchObject({title_ru:o.titleRu,quantity:'6',amount:'462',included_in_estimate:false,included_in_procurement:false});expect(JSON.stringify(q)).toBe(before);
});
it.each(['0','6','77'])('manual sideplate quantity%s rejects even equalcomputed quantity; units cannot become kits/cartons',async quantity=>{
 await expect(compile(input(),{[id]:{quantity,provenance:manual}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it('manual unit override cannot create a kit basis',async()=>{
 const overrides={[id]:{unitId:'kit',unitPrice:'77',provenance:manual}} as unknown as CanonicalEstimateCompileCoreInput['rowOverrides'];await expect(compile(input(),overrides)).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it.each(pack.forbiddenCommercialInputs)('undeclared commercial fact%s cannot turn a physical count into admitted supply',async key=>{
 await expect(compile({...input(),[key]:'1'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it.each([{p31_coupler_sku:'482219'},{p31_coupler_sku:'480221'},{p31_tray_sku:'480306'},
 {[pack.method.parameterId]:'ONE_SKU_IS_A_TWO_PLATE_KIT'},{[pack.method.parameterId]:'ORDER_TWO_CARTONS_PER_JOINT'},
 {p31_joint_count:'1.5'},{p31_joint_count:'0'},{[pack.projectReferenceId]:''}])('incompatible or supplied invalid%j is not another method or commercial admission',async changed=>{
 await expect(compile({...input(),...changed})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it.each(parentPack.sourceNeeds.map(g=>g.id))('old need%s remains nonclosable by manual0/1 despite new physical reference',async gap=>{
 const rowId=parentPack.rowPrefix+':open-'+gap,param='p31_open_'+gap.replaceAll('-','_');for(const value of ['0','1']){
 await expect(compile({...input(),[param]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 await expect(compile(input(),{[rowId]:{quantity:value,unitPrice:'77',provenance:manual}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});}
});
it('actual publisher generic inheritance rejects exact matching price key/unit onto the new INFO row',()=>{
 const target=d.resources.at(-1)!,source={...target,source_metadata:{}};expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:source,targetResource:target,sourceBindingPriceKey:source.cost_owner_id})).toBe(false);
});
it('old341895 manual quantity/price/title/exclusion and balance survive unchanged and do not pay for341213',async()=>{
 const o={quantity:'40',unitPrice:'77',titleRu:'Сохранённый отдельный заказ болтов 341895 с гайкой',includedInEstimate:false,includedInProcurement:false,provenance:manual};const a=await compile(control(),{[owner]:o},[],old),b=await compile(input(),{[owner]:o});
 for(const oldRow of a.rows)expect(row(b,oldRow.row_id)).toEqual(oldRow);expect(b.preliminaryNeeds).toEqual(a.preliminaryNeeds);expect(b.totals).toEqual({...a.totals,excludedRowCount:a.totals.excludedRowCount+1});expect(row(b)?.unit_price).toBeNull();
});
it('an explicit oldcouplers price/title stays on its unresolved need and does not transfer to sideplate INFO or boltowner',async()=>{
 const o={unitPrice:'77',titleRu:'Старая неподтверждённая поставка муфт',provenance:manual};const r=await compile(input(),{[pack.targetNeedRowId]:o});
 expect(r.preliminaryNeeds.find(n=>n.row_id===pack.targetNeedRowId)).toMatchObject({quantity:null,unit_price:'77',title_ru:o.titleRu});expect(row(r)?.unit_price).toBeNull();expect(row(r,owner)?.unit_price).toBeNull();
});
it('independent source map retains all existing obligations and declares only one extra physical reference',()=>{
 const map=completeness();expect(map.entries.length).toBe(parentPack.independentCompletenessMap.entries.length+1);expect(map.generatedFromCurrentRows).toBe(false);expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
 expect(pack.fullCycle).toHaveLength(8);expect(pack.payment).toMatchObject({newPaidOwners:0,newProcurementOwners:0,newPriceBindings:0,oldCouplersNeedClosed:false});
});
