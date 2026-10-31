// Prospective shared-core tests only. No product/admission or runtime executed by author.
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {ventPitotCapProjectReferenceDefinitionR1 as definition,ventPitotCapProjectScenarioFactsR1 as facts,ventPitotCapProjectPackR1 as pack,ventPitotCapProjectCompletenessMapR1} from './ventPitotPortCapsProjectPReferenceR1';
import {roundDuct00101QuantityDefinitionR1,roundDuct00101ScenarioFactsR1,roundDuct00101FactIdsR1} from './galvanizedRoundDuct200Normal00101QuantityR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput,type CanonicalEstimatePriceItem} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {canonicalPublisherPriceBindingIsCompatible} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const d=definition(),parent=roundDuct00101QuantityDefinitionR1(),ids=Object.values(pack.rowIds),owner=pack.rowIds.order;
const whole=pack.parentPrefix+':whole-worker',effective=effectiveResourceQuantityParameterId(owner);
const control=()=>facts('100','7','2','1','10');
const provenance={kind:'manual',reason:'QA_ONLY reference77, not actual supplier quote or project admission'};
const compile=(parameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimatePriceItem[]=[],def=d)=>compileCanonicalEstimateCore({
 operation:'recalculate',catalogId:'TEST_ONLY_VENT_PITOT_CAP_REFERENCE_NO_IDENTITY',compilerVersion:pack.contract,primaryMeasureParameterId:pack.primaryParameter,
 parameterDefinitions:[...def.parameters],formulaDefinitions:[...def.formulas],resourceDefinitions:[...def.resources],submittedParameters:parameters,confirmedParameters:{},rowOverrides,
 priceItems,currencyCode:'KGS',maximumResourceRows:def.resources.length,hashJson:async v=>estimateDeterministicHash(v)});
const row=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(q=>q.row_id===id);
it('pins official source, explicit projectP/pcs scope, and leaves all future admission identitiesNULL',()=>{
 expect(createHash('sha256').update(readFileSync(pack.source.path)).digest('hex')).toBe('6201e55037dcfd46fb9c7f12d8a37dbfc05f5f029c77ecc8773da28d29525d94');
 expect(pack.printedQuantityToken).toBe('П');expect(pack.resourceCode).toBe('23-1103-0001*');expect(pack.unitId).toBe('pcs');expect(pack.source.pages).toEqual([5,11]);
 expect([pack.catalogId,pack.workKey,pack.groupId,pack.rootExecutionPin,pack.identityAdmissionPin]).toEqual([null,null,null,null,null]);expect(pack.publicationAllowed).toBe(false);
});
it('retains every old30parameter/27formula/27resource including need metadata/inclusion exactly',()=>{
 expect(d.parameters.slice(0,30)).toEqual(parent.parameters);expect(d.formulas.slice(0,27)).toEqual(parent.formulas);expect(d.resources.slice(0,27)).toEqual(parent.resources);
 expect(d.resources.find(r=>r.row_id===pack.targetNeedRowId)).toEqual(parent.resources.find(r=>r.row_id===pack.targetNeedRowId));
});
it('adds22explicitfacts+onecompilercontrol andfourINFOrows without paid/procurement owner',()=>{
 expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([53,31,31]);
 expect(d.resources.slice(27).every(r=>r.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'&&!r.procurement_eligible&&r.source_metadata?.automaticGenericPriceInheritanceAllowed===false)).toBe(true);
 expect(d.resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id)).toEqual([whole]);
 expect(d.parameters.every(q=>q.default_value===null)).toBe(true);expect(d.runtimeInput).toEqual(parent.runtimeInput);
 expect(d.parameters.filter(q=>q.truth_metadata.visibility_role==='INTERNAL_ONLY'&&q.truth_metadata.effective_resource_quantity_v1!=null)).toHaveLength(1);
});
it.each(['missing','unconfirmed'] as const)('%s optionalprojectscope preserves the previous calculation/need behavior exactly',async mode=>{
 const input=roundDuct00101ScenarioFactsR1();if(mode==='unconfirmed')input[pack.selectionParameter]=pack.states.unconfirmed;
 const actual=await compile(input),before=await compile(roundDuct00101ScenarioFactsR1(),{},[],parent);
 expect(actual.rows).toEqual(before.rows);expect(actual.preliminaryNeeds).toEqual(before.preliminaryNeeds);expect(actual.totals).toEqual(before.totals);
});
it('uses independently supplied capcount7 and existing balance2stock/1reserve/quantum10 as reference10/5/4',async()=>{
 const r=await compile(control());expect(row(r,pack.rowIds.consumed)?.quantity).toBe('7');expect(row(r,owner)?.quantity).toBe('10');expect(row(r,pack.rowIds.remaining)?.quantity).toBe('5');expect(row(r,pack.rowIds.free)?.quantity).toBe('4');
 expect(r.derivedParameters[effective]).toBe('10');expect(r.totals.amount).toBe('0');expect(r.rows.filter(q=>ids.includes(q.row_id)).every(q=>!q.included_in_estimate&&!q.included_in_procurement)).toBe(true);
 expect(r.preliminaryNeeds.some(q=>q.row_id===pack.targetNeedRowId)).toBe(true);expect(pack.fullTechnicalAcceptance).toBe(false);
});
it('changing ductarea100→125 does not multiply capcount or turn P into a normperarea',async()=>{
 const r=await compile(facts('125','7','2','1','10'));expect(row(r,pack.rowIds.consumed)?.quantity).toBe('7');expect(row(r,owner)?.quantity).toBe('10');expect(row(r,whole)?.quantity).toBe('209.825');
});
it('one cap is a valid explicit projectposition with references, never a default replacing the oldnormP',async()=>{
 const r=await compile(facts('100','1','0','0','1'));expect(row(r,pack.rowIds.consumed)?.quantity).toBe('1');expect(row(r,owner)?.quantity).toBe('1');expect(r.preliminaryNeeds.some(q=>q.row_id===pack.targetNeedRowId)).toBe(true);
});
it.each(pack.projectFacts.map(f=>f.id))('missing project/type/size/scope fact%s withholds allnewquantity application',async id=>{
 const input=control();delete input[id];const r=await compile(input);expect(ids.every(id=>row(r,id)===undefined)).toBe(true);expect(r.preliminaryNeeds.some(q=>q.missing_parameter_ids.includes(id))).toBe(true);expect(r.preliminaryNeeds.some(q=>q.row_id===pack.targetNeedRowId)).toBe(true);
});
it.each(pack.balanceFacts.map(f=>f.id))('missing balancefact%s preserves projectcount but doesnot produce readyorder/remaining/free',async id=>{
 const input=control();delete input[id];const r=await compile(input);expect(row(r,pack.rowIds.consumed)?.quantity).toBe('7');expect([owner,pack.rowIds.remaining,pack.rowIds.free].every(id=>row(r,id)===undefined)).toBe(true);
 expect(r.preliminaryNeeds.some(q=>q.missing_parameter_ids.includes(id))).toBe(true);expect(r.derivedParameters).not.toHaveProperty(effective);
});
it.each(roundDuct00101FactIdsR1)('missing oldductscope%s cannot acquire newcapapplication through referencebranch',async id=>{
 const input=control();delete input[id];const r=await compile(input);expect(ids.every(id=>row(r,id)===undefined)).toBe(true);expect(r.totals.amount).toBe('0');
});
it.each([
 {vent_pitot_cap_count_pcs:'0'},{vent_pitot_cap_count_pcs:'-1'},{vent_pitot_cap_count_pcs:'1.5'},
 {vent_pitot_cap_kind:'DUCT_END_CAP_OR_TEST_INSTRUMENT'},{vent_pitot_cap_unit:'KG_TO_PCS'},
 {vent_pitot_cap_compatibility:'UNCONFIRMED_OR_DIFFERENT_PORT'},{vent_pitot_cap_installation_scope:'SECOND_PAID_INSTALLATION'},
 {vent_pitot_cap_commercial_status:'PRICE_OR_PROCUREMENT_ADMITTED_BY_QUOTE77'},
 {vent_pitot_cap_position_scope:'MIXED_CAP_SIZES_OR_COMBINED_KIT'},
 {vent_pitot_cap_stock_pcs:'-1'},{vent_pitot_cap_stock_pcs:'1.5'},{vent_pitot_cap_reserve_pcs:'-1'},
 {vent_pitot_cap_quantum_pcs:'0'},{vent_pitot_cap_quantum_pcs:'1.5'},
] as const)('rejects invalid project/compatibility/commercial claim%j with no source substitution',async change=>{
 await expect(compile({...control(),...change})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it('active caps cannot be attached to zero ductarea as an invented complete system',async()=>{
 await expect(compile(facts('0','7','2','1','10'))).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it('missing oldductprimary is not inferred from capcount',async()=>{
 const input=control();delete input[pack.primaryParameter];const r=await compile(input);expect(ids.every(id=>row(r,id)===undefined)).toBe(true);expect(r.preliminaryNeeds.some(q=>q.missing_parameter_ids.includes(pack.primaryParameter))).toBe(true);
});
it.each(ids)('manual reference77 and includedtrue do not pay/procure newINFO%s',async id=>{
 const r=await compile(control(),{[id]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}});
 expect(row(r,id)).toMatchObject({unit_price:'77',included_in_estimate:false,included_in_procurement:false});expect(r.totals.amount).toBe('0');
});
it.each(ids)('matching snapshot77 remains referenceonly and automatic inheritance isblocked on%s',async id=>{
 const target=d.resources.find(q=>q.row_id===id)!;const r=await compile(control(),{},[{price_key:target.cost_owner_id!,unit_id:'pcs',currency_code:'KGS',unit_price:'77',snapshot_id:'QA_ONLY_NOT_ACTUAL_SUPPLY_PRICE'}]);
 expect(row(r,id)).toMatchObject({unit_price:'77',included_in_estimate:false,included_in_procurement:false});expect(r.totals.amount).toBe('0');
 expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:{...target,source_metadata:{}},targetResource:target,sourceBindingPriceKey:target.cost_owner_id})).toBe(false);
});
it.each(ids)('explicit manual77 retains source/INFO holds and respects the declared order quantum on%s',async id=>{
 if(id===owner){
  await expect(compile(control(),{[id]:{quantity:'77',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID',message:expect.stringContaining('purchase quantity violates declared whole supply quantum')});
 }else await assertExplicitManualSourceRow(id,'77');
});
it('a whole manual order20 keeps consumed7 and derives remaining15/free14 without paying or procuring INFO',async()=>{
 const parameters=control(),saved=JSON.stringify(parameters),before=await compile(parameters),resource=d.resources.find(item=>item.row_id===owner)!;
 const formula=d.formulas.find(item=>item.formula_id===resource.formula_id)!;
 const overrides={[owner]:{quantity:'20',provenance}},raw=JSON.stringify(overrides),edited=await compile(parameters,overrides);
 expect([row(edited,pack.rowIds.consumed)?.quantity,row(edited,owner)?.quantity,row(edited,pack.rowIds.remaining)?.quantity,row(edited,pack.rowIds.free)?.quantity]).toEqual(['7','20','15','14']);
 expect(edited.derivedParameters[effective]).toBe('20');
 expect(row(edited,owner)?.calculation_trace).toMatchObject({formulaId:resource.formula_id,formulaAstSha256:formula.ast_sha256,inputParameterIds:formula.input_parameter_ids,calculatedQuantityBeforeOverride:'10',manualQuantityOverride:true,manualAmendment:provenance});
 expect(edited.rows.filter(item=>ids.includes(item.row_id)).every(item=>!item.included_in_estimate&&!item.included_in_procurement)).toBe(true);
 expect(edited.preliminaryNeeds).toEqual(before.preliminaryNeeds);expect(edited.totals).toEqual(before.totals);
 const cleared=await compile(parameters,{[owner]:{quantity:null,provenance}});
 expect([row(cleared,owner)?.quantity,row(cleared,pack.rowIds.remaining)?.quantity,row(cleared,pack.rowIds.free)?.quantity]).toEqual(['10','5','4']);expect(cleared.derivedParameters[effective]).toBe('10');
 expect(row(cleared,owner)?.calculation_trace).not.toHaveProperty('manualQuantityOverride');
 await expect(compile(parameters,{[owner]:{quantity:'20'}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 expect(JSON.stringify(parameters)).toBe(saved);expect(JSON.stringify(overrides)).toBe(raw);
});
it.each(['0','1','77'])('legacy applicationnorm%s cannot become a projectcapcount or new priceowner',async value=>{
 await expect(compile({...control(),duct00101_application_need_pitot_port_caps_project_P:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it.each(['77',null])('incoming compilercontrol%p is ignored and regenerated from originalfacts',async value=>{
 const r=await compile({...control(),[effective]:value});expect(r.derivedParameters[effective]).toBe('10');expect(row(r,owner)?.quantity).toBe('10');
});
it('whole167.86 remains the only financial owner and no extra capinstallation or machine hours appear',async()=>{
 const r=await compile(facts('125','7','2','1','10'),{[whole]:{unitPrice:'77',provenance},...Object.fromEntries(ids.map(id=>[id,{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}]))});
 expect(row(r,whole)).toMatchObject({quantity:'209.825',amount:'16156.53'});expect(r.totals.amount).toBe('16156.53');expect(r.rows.filter(q=>q.included_in_estimate).map(q=>q.row_id)).toEqual([whole]);
 expect(d.resources.slice(27).every(q=>q.category==='material'&&q.unit_id==='pcs')).toBe(true);
});
it('oldtenneed rows and commercialadmission task remain unresolved, with no metadata transition to a new paidowner',async()=>{
 const r=await compile(control());const oldNeedIds=parent.resources.slice(17).map(q=>q.row_id);expect(r.preliminaryNeeds.filter(q=>oldNeedIds.includes(q.row_id))).toHaveLength(10);
 expect(d.resources.find(q=>q.row_id===pack.targetNeedRowId)?.source_metadata).not.toHaveProperty('completionNeedTransitionV1');
 for(const q of d.resources.slice(27))expect(q.source_metadata).toMatchObject({materialPaymentAdmitted:false,purchase_order_admission:false,newPaidOwner:false,newLabourOwner:false});
});
it('finite31entry map preserves old obligations and shows four reference rows without a new universalnorm',()=>{
 const map=ventPitotCapProjectCompletenessMapR1();expect(map.entries).toHaveLength(31);expect(validateIndependentCompletenessMapReferences({completenessMap:map,resourceDefinitions:d.resources,formulaDefinitions:d.formulas})).toEqual([]);
 expect(d.formulas.slice(27).find(f=>f.formula_id===pack.prefix+':formula:project-count')?.expression_source).toBe(pack.countParameter);
});

it('explicit manual title remains first-class while technical source title, type and size facts remain unchanged',async()=>{
 const input=control(),overrides={[pack.rowIds.consumed]:{titleRu:'Заглушки измерительных лючков по ведомости В-7',unitPrice:'77',provenance}};const before=JSON.stringify(overrides);
 const r=await compile(input,overrides);expect(row(r,pack.rowIds.consumed)).toMatchObject({title_ru:overrides[pack.rowIds.consumed].titleRu,quantity:'7',unit_price:'77',included_in_estimate:false,included_in_procurement:false});
 expect(JSON.stringify(overrides)).toBe(before);expect(r.parameters.vent_pitot_cap_type_designation).toBe(input.vent_pitot_cap_type_designation);expect(r.parameters.vent_pitot_cap_size_designation).toBe(input.vent_pitot_cap_size_designation);
 const presentation=d.resources.find(q=>q.row_id===pack.rowIds.consumed)!.resource_graph.publicResourcePresentationV1 as {detailsRu:string[]};
 expect(presentation.detailsRu.some(v=>v.includes('Закрывает измерительное отверстие'))).toBe(true);expect(d.resources.find(q=>q.row_id===pack.rowIds.consumed)?.title_ru).toContain('питотметражных лючков');
});

// Manual amendments preserve the automatic source basis; they do not rewrite it.
async function assertExplicitManualSourceRow(rowId:string,quantity:string){
 const parameters=control(),sourceBefore=JSON.stringify(d),before=await compile(parameters);
 const original=before.rows.find(item=>item.row_id===rowId)!;
 expect(original).toBeDefined();
 const resource=d.resources.find(item=>item.row_id===rowId)!,formula=d.formulas.find(item=>item.formula_id===resource.formula_id)!;
 const overrides={[rowId]:{quantity,provenance:provenance}},saved=JSON.stringify(overrides);
 const edited=await compile(parameters,overrides),actual=edited.rows.find(item=>item.row_id===rowId)!;
 expect(actual).toMatchObject({quantity,unit_id:original.unit_id,unit_price:original.unit_price,
  included_in_estimate:original.included_in_estimate,included_in_procurement:original.included_in_procurement,
  calculation_trace:{formulaId:resource.formula_id,formulaAstSha256:formula.ast_sha256,inputParameterIds:formula.input_parameter_ids,
   manualQuantityOverride:true,manualAmendment:provenance,calculatedQuantityBeforeOverride:original.quantity}});
 expect(edited.parameters).toEqual(before.parameters);expect(edited.derivedParameters).toEqual(before.derivedParameters);
 expect(edited.rows.filter(item=>item.row_id!==rowId)).toEqual(before.rows.filter(item=>item.row_id!==rowId));
 expect(edited.preliminaryNeeds).toEqual(before.preliminaryNeeds);expect(edited.totals).toEqual(before.totals);
 const cleared=await compile(parameters,{[rowId]:{quantity:null,provenance:provenance}}),restored=cleared.rows.find(item=>item.row_id===rowId)!;
 expect(restored).toMatchObject({quantity:original.quantity,unit_id:original.unit_id,unit_price:original.unit_price,
  included_in_estimate:original.included_in_estimate,included_in_procurement:original.included_in_procurement,
  calculation_trace:{formulaId:resource.formula_id,formulaAstSha256:formula.ast_sha256,inputParameterIds:formula.input_parameter_ids}});
 expect(restored.calculation_trace).not.toHaveProperty('manualQuantityOverride');
 await expect(compile(parameters,{[rowId]:{quantity}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 expect(JSON.stringify(overrides)).toBe(saved);expect(JSON.stringify(d)).toBe(sourceBefore);
}
