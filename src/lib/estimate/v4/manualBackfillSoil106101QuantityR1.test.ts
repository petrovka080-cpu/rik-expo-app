// Prospective cases only. Shared compiler is the sole quantity engine; author did not execute them.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {manualBackfill06101QuantityDefinitionR1 as definition,compileManualBackfill06101ScenarioR1 as scenario,
 manualBackfill06101ScenarioFactsR1 as facts,manualBackfill06101PackR1 as pack,manualBackfill06101PrimaryR1 as primary,
 manualBackfill06101PrefixR1 as prefix,manualBackfill06101FactIdsR1 as factIds,manualBackfill06101NeedParameterIdsR1 as needParameters,
 manualBackfill06101NeedRowIdsR1 as needs,manualBackfill06101IndependentCompletenessMapR1 as completeness} from './manualBackfillSoil106101QuantityR1';
import {canonicalPublisherPriceBindingIsCompatible} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const worker=prefix+':whole-worker',included=pack.operationsIncludedInWholeLabour.map(o=>prefix+':'+o.id),gated=[worker,...included];
const manual={kind:'manual',reason:'TEST_ONLY CONTROL77; not a supplier quote or actual approved project'};
const core=async(p:Record<string,unknown>,o:Parameters<typeof scenario>[1]={},prices:Parameters<typeof scenario>[2]=[])=>(await scenario(p,o,prices)).compiled;
const row=(r:Awaited<ReturnType<typeof core>>,id:string)=>r.rows.find(x=>x.row_id===id);
describe('Source-only manual backfill06101, one exact column, catalogue null, NOT_RUN',()=>{
 it('keeps28parameters/12formulas/12resources, precise ordinals and no defaults or order controls',()=>{
  const d=definition();expect(d).toMatchObject({catalogId:null,workKey:null,groupId:null,identityAdmitted:false,publicationAllowed:false,fullTechnicalAcceptance:false,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{}});
  expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([28,12,12]);expect(d.parameters.map(p=>p.ordinal)).toEqual(Array.from({length:28},(_,i)=>i));expect(d.resources.map(r=>r.ordinal)).toEqual(Array.from({length:12},(_,i)=>i));
  expect(d.parameters.every(p=>p.default_value===null)).toBe(true);expect(d.resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id)).toEqual([worker]);expect(d.resources.every(r=>!r.procurement_eligible)).toBe(true);
  expect(d.resources.some(r=>'purchaseBalanceV1' in r.resource_graph||'commercialRateV1' in r.resource_graph)).toBe(false);
 });
 it('pins the exact officialPDF, literal grade1.5 and independent88.50h rate without copying 2015 prices',()=>{
  expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.source.path))).digest('hex')).toBe(pack.source.sha256);
  expect(pack.normId).toBe('01-02-061-01');expect(pack.physicalSourceRows[0]).toMatchObject({resourceCode:'000-1001-5',sourceUnit:'man_hour',ratePer100M3:'88.50'});
  expect(pack.physicalSourceRows).toHaveLength(1);expect(pack.payment.priceBindings).toBe(0);
 });
 it.each([['100','88.5'],['125','110.625'],['200','177']])('uses%s projectsoil m3 to yield%s wholeh once, including clods/tamping and necessary watering',async(volume,hours)=>{
  const r=await core(facts(volume));expect(r.rows.map(r=>r.row_id)).toEqual(gated);expect(row(r,worker)).toMatchObject({quantity:hours,unit_id:'man_hour',unit_price:null});
  expect(r.rows.slice(1).every(r=>r.unit_id==='m3'&&r.quantity===volume&&!r.included_in_estimate&&!r.included_in_procurement)).toBe(true);
  expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual([...needs].sort());expect(r.preliminaryNeeds.every(n=>n.quantity===null&&!n.procurement_eligible)).toBe(true);expect(r.totals.amount).toBe('0');
 });
 it('confirmed no watering omits only its includedstep/waterneed without reducing the whole88.50h norm',async()=>{
  const r=await core({...facts(),backfill_watering_state:'NOT_REQUIRED_CONFIRMED'});
  expect(r.rows.map(r=>r.row_id)).toEqual([worker,included[0]]);expect(row(r,worker)?.quantity).toBe('88.5');
  expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual(needs.filter(id=>id!==prefix+':open:water-supply').sort());expect(r.preliminaryNeeds).toHaveLength(8);
 });
 it('uses rounded CONTROL77 coreamount/totals8518.13 on125m3; raw8518.125 is diagnostic only',async()=>{
  const r=await core(facts('125'),{[worker]:{unitPrice:'77',provenance:manual}});
  expect(row(r,worker)).toMatchObject({quantity:'110.625',unit_price:'77',amount:'8518.13'});expect(r.totals.amount).toBe('8518.13');
  expect(r.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id)).toEqual([worker]);expect(r.rows.every(r=>!r.included_in_procurement)).toBe(true);
 });
 it('preserves manual wholeprice/exclusion without creating another labour owner',async()=>{
  const r=await core(facts(),{[worker]:{unitPrice:'77',includedInEstimate:false,provenance:manual}});expect(row(r,worker)).toMatchObject({quantity:'88.5',unit_price:'77',amount:'6814.5',included_in_estimate:false});expect(r.totals.amount).toBe('0');
  await expect(core(facts(),{[worker]:{unitPrice:'77',includedInProcurement:true,provenance:manual}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 });
 it('preserves same-method title and explicitreferenceprice without mutating submitted amendments',async()=>{
  const o={unitPrice:'77',titleRu:'TEST_ONLY ручная засыпка согласованного участка',includedInEstimate:false,includedInProcurement:false,provenance:manual};const before=JSON.stringify(o);
  const r=await core(facts('125'),{[worker]:o});expect(row(r,worker)).toMatchObject({title_ru:o.titleRu,unit_price:'77',quantity:'110.625',included_in_estimate:false});expect(JSON.stringify(o)).toBe(before);
 });
 it.each(factIds)('missing%s withholds all source application while preliminary quantities remain referenceonly',async id=>{
  const input=facts();delete input[id];const r=await core(input,{[worker]:{unitPrice:'77',provenance:manual}});expect(r.rows).toEqual([]);expect(r.totals.amount).toBe('0');
  const conditional=r.preliminaryNeeds.filter(n=>gated.includes(n.row_id));expect(conditional).toHaveLength(3);expect(conditional.every(n=>n.need_state==='CONDITION_REQUIRED'&&n.missing_parameter_ids.includes(id)&&!n.procurement_eligible)).toBe(true);
  expect(definition().parameters.find(p=>p.parameter_id===id)).toMatchObject({default_value:null,constraints_json:{requiredWhen:{kind:'greater_than',parameterId:primary,value:0}}});
 });
 const invalid:Array<[string,Record<string,unknown>]>= [
  ['group2',{backfill_soil_group:'GROUP_2'}],['group3',{backfill_soil_group:'GROUP_3'}],['group4',{backfill_soil_group:'GROUP_4'}],
  ['new-delivered-soil',{backfill_soil_availability:'NEW_SUPPLIER_SOIL'}],['unknown-availability',{backfill_soil_availability:'UNCONFIRMED'}],
  ['machine',{backfill_method:'MECHANICAL_TAMPING_MACHINE'}],['frozen',{backfill_soil_conditions:'FROZEN_WITH_DEFAULT_COEFFICIENT'}],['wet',{backfill_soil_conditions:'WET_WITH_DEFAULT_COEFFICIENT'}],
  ['pipe-length',{backfill_measurement_basis:'PIPE_LENGTH_M'}],['loose-order',{backfill_measurement_basis:'LOOSE_ORDER_M3'}],['auto-excavation',{backfill_measurement_basis:'EXCAVATION_MINUS_PIPE_AUTOMATIC'}],
  ['not-ready',{backfill_ready_scope:'NOT_ACCEPTED_EXCAVATION'}],['second-tamping-owner',{backfill_payment_scope:'EXTRA_TAMPING_LABOUR'}],
  ['auto-water',{backfill_watering_state:'UNCONFIRMED_DEFAULT_WATER'}],['water-off0',{backfill_watering_state:'0'}],['wrongnorm',{backfill_exact_profile:'MANUAL_EXCAVATION05701'}],
  ['unsupportedobject',{backfill_object:'WHOLE_EMBANKMENT'}],['zero-volume',{[primary]:'0'}],['negative-volume',{[primary]:'-1'}],['invalid-volume',{[primary]:'abc'}],
 ];
 it.each(invalid)('rejects%s without substituting method, soilgroup, measure, coefficient or owner',async(_name,change)=>{
  await expect(core({...facts(),...change})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 it.each(gated)('manual77 on%s retains the source formula and cannot create another pay owner',async id=>{
  const source=definition(),sourceBefore=JSON.stringify(source),input=facts();
  const overrides={[id]:{quantity:'77',provenance:manual}},inputBefore=JSON.stringify({input,overrides});
  const before=await core(input),after=await core(input,overrides);
  const original=before.rows.find(r=>r.row_id===id)!,edited=after.rows.find(r=>r.row_id===id)!;
  expect(original).toBeDefined();expect(edited).toBeDefined();
  const authoredFormulaId=source.resources.find(resource=>resource.row_id===id)!.formula_id;
  expect(original.calculation_trace).toMatchObject({formulaId:authoredFormulaId});
  expect(edited).toMatchObject({row_id:id,quantity:'77',unit_id:original.unit_id,
    included_in_estimate:original.included_in_estimate,included_in_procurement:false,unit_price:null,amount:null,
    calculation_trace:{manualQuantityOverride:true,manualAmendment:manual,calculatedQuantityBeforeOverride:original.quantity}});
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
  await expect(core(input,{[id]:{quantity:'77'}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 });
 it.each(included)('included%s permits manual/snapshot77 reference but never a secondpayment or procurement',async id=>{
  const resource=definition().resources.find(r=>r.row_id===id)!;
  for(const route of ['manual','snapshot'] as const){
   const r=await core(facts(),{[id]:{includedInEstimate:true,includedInProcurement:true,provenance:manual,...(route==='manual'?{unitPrice:'77'}:{})}},
    route==='snapshot'?[{price_key:resource.cost_owner_id!,unit_id:resource.unit_id,unit_price:'77',currency_code:'KGS',snapshot_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}]:[]);
   expect(row(r,id)).toMatchObject({quantity:'100',unit_price:'77',amount:'7700',ownership_status:'OWNED_EXCLUDED',included_in_estimate:false,included_in_procurement:false});expect(r.totals.amount).toBe('0');
  }
  expect(resource).toMatchObject({cost_owner_id:worker,resource_graph:{parentCostOwnerId:worker,costTreatment:'INCLUDED_IN_RESOURCE_ROWS'}});
 });
 it.each(pack.openNeeds.map(n=>n.id))('manual0/1 and reference price on need%s retain the source gap and cannot create an order',async id=>{
  const rowId=prefix+':open:'+id,param='manual_backfill06101_application_need_'+id.replaceAll('-','_');
  for(const value of ['0','1']){
   const source=definition(),sourceBefore=JSON.stringify(source),input=facts();
   const overrides={[rowId]:{quantity:value,unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance:manual}},inputBefore=JSON.stringify({input,overrides});
   const before=await core(input),after=await core(input,overrides),original=before.preliminaryNeeds.find(n=>n.row_id===rowId)!,need=after.preliminaryNeeds.find(n=>n.row_id===rowId)!;
   expect(original).toBeDefined();expect(need).toBeDefined();expect(original.quantity).toBeNull();
   expect(need).toMatchObject({row_id:rowId,quantity:value,unit_price:'77',unit_id:'',selected:false,procurement_eligible:false,
     need_state:original.need_state,formula_id:original.formula_id,
     calculation_trace:{preliminaryNeed:true,manualQuantityOverride:true,manualAmendment:manual,calculatedQuantityBeforeOverride:null}});
   expect(need.missing_parameter_ids).toEqual(original.missing_parameter_ids);expect(need.missing_parameter_ids).toContain(param);
   expect(need.normative_trace).toEqual([]);
   expect(need.calculation_trace).toMatchObject({formulaId:original.formula_id,formulaAstSha256:source.formulas.find(f=>f.formula_id===original.formula_id)!.ast_sha256});
   expect((need.calculation_trace as Record<string,unknown>).resourceGraph).toEqual((original.calculation_trace as Record<string,unknown>).resourceGraph);
   expect(after.rows).toEqual(before.rows);expect(after.preliminaryNeeds.map(n=>n.row_id)).toEqual(before.preliminaryNeeds.map(n=>n.row_id));
   expect(after.preliminaryNeeds.filter(n=>n.row_id!==rowId)).toEqual(before.preliminaryNeeds.filter(n=>n.row_id!==rowId));
   expect(after.rows.some(r=>r.row_id===rowId)).toBe(false);expect(after.totals.amount).toBe('0');
   expect(JSON.stringify({input,overrides})).toBe(inputBefore);expect(JSON.stringify(source)).toBe(sourceBefore);
   await expect(core(input,{[rowId]:{quantity:value}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
   await expect(core({...facts(),[param]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  }
  expect(definition().parameters.find(p=>p.parameter_id===param)).toMatchObject({unit_id:null,default_value:null,truth_metadata:{value_source_role:'UNRESOLVED_APPLICATION_NORM',visibility_role:'INTERNAL_ONLY'}});
 });
 it('needreferenceprice77 cannot supply missingwaterquantity or create payablewateringservice',async()=>{
  const id=prefix+':open:water-supply';const r=await core(facts(),{[id]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance:manual}});
  expect(r.preliminaryNeeds.find(n=>n.row_id===id)).toMatchObject({quantity:null,unit_price:'77',selected:false,procurement_eligible:false});expect(r.totals.amount).toBe('0');
 });
 it.each(['q','pipe_length_m','volume_m3','backfill_loose_per_installed_m3','density','compaction_coefficient','water_volume_m3','water_service_count','machine_hours','operator_hours'])('unknown conversion/order input%s is rejected by the existing parametercontract',async id=>{
  await expect(core({...facts(),[id]:'1'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 it('missing primary does not create quantity from a pipe, soilgrade, condition or hiddenvalue',async()=>{
  const input=facts();delete input[primary];const r=await core(input);expect(r.rows).toEqual([]);expect(r.totals.amount).toBe('0');expect(r.preliminaryNeeds.filter(n=>gated.includes(n.row_id)).every(n=>n.quantity===null)).toBe(true);
 });
 it.each(included)('publisher cannot inherit a matching owner/unit/key price onto%s',id=>{
  const target=definition().resources.find(r=>r.row_id===id)!,source={...target,source_metadata:{}};expect(target.source_metadata?.automaticGenericPriceInheritanceAllowed).toBe(false);
  expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:source,targetResource:target,sourceBindingPriceKey:source.cost_owner_id})).toBe(false);
 });
 it('compatible wholeworker route retains the existing global pricepolicy',()=>{
  const target=definition().resources.find(r=>r.row_id===worker)!,source={...target,source_metadata:{}};if(!target.source_metadata)throw Error('TEST_WORKER_SOURCE_METADATA_REQUIRED');expect(target.source_metadata.automaticGenericPriceInheritanceAllowed).toBeUndefined();
  expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:source,targetResource:target,sourceBindingPriceKey:source.cost_owner_id})).toBe(true);
 });
 it('all9needs have no priceinheritance/sourceunit/numericnorm or borrowedsourcearray',()=>{
  const d=definition();expect(needParameters).toHaveLength(9);for(const r of d.resources.filter(r=>needs.includes(r.row_id)))expect(r).toMatchObject({unit_id:'',procurement_eligible:false,source_metadata:{automaticGenericPriceInheritanceAllowed:false,normativeTrace:[],normative_source_ids:[],quantityUnitUnconfirmed:true}});
 });
 it('no unprinted machine/operator/materialorder is created and grade1.5 is not a multiplier',()=>{
  const d=definition();expect(d.resources.filter(r=>r.unit_id==='man_hour').map(r=>r.row_id)).toEqual([worker]);expect(d.resources.filter(r=>r.unit_id==='machine_hour')).toEqual([]);
  expect(d.formulas.find(f=>f.formula_id===prefix+':formula:whole-worker')?.expression_source).toBe(primary+'*88.50/100');expect(d.formulas.slice(0,3).every(f=>f.input_parameter_ids.join()===primary)).toBe(true);
 });
 it('finite12entry map accounts for sourcewhole/includedsteps/9needs with exact references',()=>{
  const d=definition(),map=completeness();expect(map.entries).toHaveLength(12);expect(map.generatedFromCurrentRows).toBe(false);expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources]})).toEqual([]);
 });
});
