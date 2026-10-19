// Prospective tests only: no Jest/TS/DB/API run or identity/BOM admission by the author.
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import {simpleCementLime01601QuantityDefinitionR1 as definition,simpleCementLime01601ScenarioFactsR1 as facts,
 simpleCementLime01601PackR1 as pack,simpleCementLime01601PrimaryR1 as area,simpleCementLime01601FactIdsR1 as factIds,
 simpleCementLime01601NeedParameterIdsR1 as needParams,simpleCementLime01601WholeRowIdR1 as whole,simpleCementLime01601CompletenessMapR1 as completeness} from './simpleCementLimeStoneWall01601QuantityR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {assertCanonicalMachineHourDefinitionV1} from '../backendPlatform/canonicalMachineHourPriceCoverageV1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalPublisherPriceBindingIsCompatible} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const d=definition(),p=pack.prefix,included=p+':'+pack.includedOperation.id,known=d.resources.slice(0,9).map(r=>r.row_id),info=d.resources.slice(1,8).map(r=>r.row_id),nonwhole=[...info,included];
const manual={kind:'manual',reason:'TEST_ONLY CONTROL77; not a supplier price or source admission'};
const compile=(parameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimateCompileCoreInput['priceItems']=[])=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:'TEST_ONLY_SIMPLE_CEMENT_LIME01601_NO_CATALOG_BINDING',compilerVersion:pack.contract,
 primaryMeasureParameterId:area,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:parameters,confirmedParameters:{},rowOverrides,priceItems,currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:async v=>estimateDeterministicHash(v)});
const row=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(x=>x.row_id===id);
it('pins exact135 column01 and technical scope, source-only identities stillNULL',()=>{
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.source.path))).digest('hex')).toBe('58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc');
 expect(pack.normId).toBe('15-02-016-01');expect(pack.source.pages).toEqual([8,10,13,14,134,135]);expect([pack.catalogId,pack.workKey,pack.groupId,pack.actualCurrentClassification,pack.futureRootExecutionPin,pack.futureCurrentParentCapturePin,pack.futureRootDecisionPin]).toEqual([null,null,null,null,null,null,null]);expect(pack.identityAdmitted).toBe(false);expect(pack.publicationAllowed).toBe(false);
});
it('builds24parameters/19formulas/19rows through one existing owner and preserves ordinals/defaults',()=>{
 expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([24,19,19]);expect(d.parameters.map(q=>q.ordinal)).toEqual(Array.from({length:24},(_,i)=>i));expect(d.resources.map(r=>r.ordinal)).toEqual(Array.from({length:19},(_,i)=>i));expect(new Set(d.formulas.map(f=>f.formula_id)).size).toBe(19);
 expect(d.runtimeInput).toEqual({});expect(d.parameters.every(q=>q.default_value===null)).toBe(true);expect(d.ordinaryParameterIds).toEqual([area]);expect(d.resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id)).toEqual([whole]);
});
it.each([
 ['100',['75.4','6.07','0.62','5.45','0.00007','0.006','1.51','2.77']],
 ['125',['94.25','7.5875','0.775','6.8125','0.0000875','0.0075','1.8875','3.4625']],
 ['12.5',['9.425','0.75875','0.0775','0.68125','0.00000875','0.00075','0.18875','0.34625']],
] as const)('exact%s separately measured netwallm2 applies each printed rate once',async(a,values)=>{
 const r=await compile(facts(a));pack.physicalRows.forEach((source,i)=>expect(row(r,p+':'+source.id)?.quantity).toBe(values[i]));expect(row(r,included)?.quantity).toBe(a);
 expect(r.preliminaryNeeds).toHaveLength(10);expect(r.rows.every(x=>!x.included_in_procurement)).toBe(true);expect(r.totals.amount).toBe('0');
});
it('zero measuredarea produces no physicalwork/needs or manufactured minimumquantity',async()=>{
 const r=await compile(facts('0'));expect(r.rows).toEqual([]);expect(r.preliminaryNeeds).toEqual([]);expect(r.totals.amount).toBe('0');
});
it('missing independentarea remains unknown, not grossfacade/floorarea/ready-mortar conversion',async()=>{
 const input=facts('100');delete input[area];const r=await compile(input);expect(known.every(id=>!row(r,id))).toBe(true);expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(area))).toBe(true);expect(r.totals.amount).toBe('0');
});
it.each(factIds)('missing project/scopefact%s withholds application while known sourcequantity may remain preliminary',async id=>{
 const input=facts('100');delete input[id];const r=await compile(input);expect(known.every(id=>!row(r,id))).toBe(true);expect(r.preliminaryNeeds.some(n=>n.row_id===whole&&n.missing_parameter_ids.includes(id))).toBe(true);expect(r.totals.amount).toBe('0');
});
const invalid:Array<[string,Record<string,unknown>]>= [
 ['negativearea',{[area]:'-1'}],['unknownarea',{[area]:'UNKNOWN'}],['exterior',{plaster01601_method:'FACADE_GROSS_SIMPLE_RENDER'}],['ceiling',{plaster01601_method:'SIMPLE_CEILING01602'}],['improved',{plaster01601_method:'IMPROVED_WALL01603'}],
 ['CT29',{plaster01601_mortar:'CERESIT_CT29_DRY_MIX_BAG'}],['KNAUF',{plaster01601_mortar:'KNAUF_ROTBAND_GYPSUM'}],['cement1to3',{plaster01601_mortar:'READY_CEMENT_1_3_BY_NAME'}],
 ['wood',{plaster01601_base:'WOOD_LATH_AND_GYPSUM_BOARD'}],['grossarea',{plaster01601_area_rule:'GROSS_FACADE00801_WITH_OPENINGS'}],['separatereveals',{plaster01601_elements:'PAY_SOURCE_INCLUDED_WINDOW_ZAGLUSHINY_AND_NICHE_REVEALS_TWICE'}],
 ['thicknessfromvolume',{plaster01601_adjustment:'TF_FROM1_51M3_APPLY_K_DEFAULT'}],['doubleoperator',{plaster01601_payment:'ADD6_07_PAID_OPERATOR_AND_ALL_MACHINES'}],['automaticstock',{plaster01601_material_scope:'SOURCE_IS_CONFIRMED_STOCK_AND_ORDER'}],
 ['allwindowsExtra031',{plaster01601_elements:'ALL_WINDOWS_ALWAYS_EXTRA031_BY_DEFAULT'}],['allrevealsIncluded',{plaster01601_elements:'ALL_REVEALS_ALWAYS_INCLUDED01601'}],
 ['height0',{plaster01601_room_height_m:'0'}],['height3.6',{plaster01601_room_height_m:'3.6'}],
];
it.each(invalid)('invalid%s rejects without silently borrowing a neighbournorm/product/unit',async(_id,change)=>{
 await expect(compile({...facts('100'),...change})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it.each(known)('rawquantity77 cannot replace source/included row%s',async id=>{
 await expect(compile(facts('12.5'),{[id]:{quantity:'77',provenance:manual}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it('wholeCONTROL77 rounds core725.725→725.73 once and preserves title/exclusion rights',async()=>{
 const input=facts('12.5'),o={unitPrice:'77',titleRu:'TEST_ONLY самостоятельная простая штукатурка',provenance:manual},before=JSON.stringify(o);
 const r=await compile(input,{[whole]:o});expect(row(r,whole)).toMatchObject({quantity:'9.425',unit_price:'77',amount:'725.73',title_ru:o.titleRu,included_in_estimate:true});expect(r.totals.amount).toBe('725.73');expect(JSON.stringify(o)).toBe(before);
 const excluded=await compile(input,{[whole]:{...o,includedInEstimate:false,includedInProcurement:false}});expect(row(excluded,whole)).toMatchObject({quantity:'9.425',unit_price:'77',amount:'725.73',included_in_estimate:false});expect(excluded.totals.amount).toBe('0');
});
it.each(nonwhole)('manual/snapshot77 on%s stays referenceonly despite forcedinclude, no price leakage onto whole',async id=>{
 const target=d.resources.find(r=>r.row_id===id)!;
 for(const route of ['manual','snapshot'] as const){const r=await compile(facts('12.5'),{[id]:{includedInEstimate:true,includedInProcurement:true,provenance:manual,...(route==='manual'?{unitPrice:'77'}:{})}},route==='snapshot'?[{price_key:target.cost_owner_id!,unit_id:target.unit_id,currency_code:'KGS',unit_price:'77',snapshot_id:'TEST_ONLY_REFERENCE_NOT_SUPPLIER'}]:[]);
 expect(row(r,id)).toMatchObject({unit_price:'77',included_in_estimate:false,included_in_procurement:false,ownership_status:'OWNED_EXCLUDED'});expect(row(r,whole)?.unit_price).toBeNull();expect(r.totals.amount).toBe('0');}
});
it('INFO mortar reference amount mayround14.53375→14.53 while no money/procurement is admitted',async()=>{
 const id=p+':ready-cement-lime-mortar-reference',r=await compile(facts('12.5'),{[id]:{unitPrice:'77',titleRu:'TEST_ONLY готовый раствор 1:1:6',provenance:manual}});expect(row(r,id)).toMatchObject({quantity:'0.18875',unit_price:'77',amount:'14.53',included_in_estimate:false,included_in_procurement:false});expect(r.totals.amount).toBe('0');
});
it.each(nonwhole)('realpublisher rejects sameunit/owner/key automatic inheritance onto%s',id=>{
 const target=d.resources.find(r=>r.row_id===id)!;expect(target.source_metadata.automaticGenericPriceInheritanceAllowed).toBe(false);expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:{...target,source_metadata:{}},targetResource:target,sourceBindingPriceKey:target.cost_owner_id})).toBe(false);
});
it('whole compatible policy stays ordinary, snapshot77 prices only the one whole labour owner',async()=>{
 const target=d.resources.find(r=>r.row_id===whole)!;expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:{...target,source_metadata:{}},targetResource:target,sourceBindingPriceKey:target.cost_owner_id})).toBe(true);
 const r=await compile(facts('12.5'),{},[{price_key:whole,unit_id:'man_hour',currency_code:'KGS',unit_price:'77',snapshot_id:'TEST_ONLY_WHOLE_CONTROL'}]);expect(r.totals.amount).toBe('725.73');expect(row(r,p+':operator-information')?.unit_price).toBeNull();expect(row(r,included)?.included_in_estimate).toBe(false);
});
it.each(pack.physicalRows.filter(r=>r.category==='equipment'))('source machine%s isINFO without catalog/paidquote mapping',source=>{
 const r=d.resources.find(v=>v.row_id===p+':'+source.id)!;expect(r.source_metadata).toMatchObject({machinePriceScopePending:true,operatorRoleNotAdmitted:true,noAdditionalOperatorInferred:false});expect(assertCanonicalMachineHourDefinitionV1({catalogId:'TEST_ONLY_NOT_ADMITTED',rowId:r.row_id,unitId:r.unit_id,sourceMetadata:r.source_metadata})).toBeNull();
});
it('one sourcecomposition marker is included inwhole; it doesnot claim actual area of openings or separatemeshwork',()=>{
 const r=d.resources.find(v=>v.row_id===included)!;expect(r.cost_owner_id).toBe(whole);expect(r.resource_graph).toMatchObject({costTreatment:'INCLUDED_IN_RESOURCE_ROWS',parentCostOwnerId:whole,includedInResourceOwnerRowId:whole});expect(r.source_metadata.includedMarkerIsNotSeparateElementArea).toBe(true);expect(pack.includedOperation.printedCompositionRu).toHaveLength(4);
 expect(pack.measurement.ruleRu).toContain('§2.11');expect(pack.measurement.ruleRu).toContain('§2.13');expect(pack.measurement.noGrossFacadeArea).toBe(true);
});
it.each(pack.openNeeds.map(n=>n.id))('unresolvedneed%s cannot beclosed by0/1/77 or addedprice',async id=>{
 const parameter='plaster01601_application_need_'+id.replaceAll('-','_'),rowId=p+':open:'+id;
 for(const value of ['0','1','77']){await expect(compile({...facts('100'),[parameter]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});await expect(compile(facts('100'),{[rowId]:{quantity:value,unitPrice:'77',provenance:manual}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});}
});
it('alltenneeds remain visible/protected/unitless and sourcearrays empty; no source laundering or hiddenreadiness',async()=>{
 const r=await compile(facts('100'));expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual(pack.openNeeds.map(n=>p+':open:'+n.id).sort());expect(needParams).toHaveLength(10);
 for(const n of d.resources.slice(9)){expect(n.unit_id).toBe('');expect(n.source_metadata).toMatchObject({sourceRole:'UNRESOLVED_APPLICATION_NORM',normativeTrace:[],normative_source_ids:[],automaticGenericPriceInheritanceAllowed:false});}
 expect(d.parameters.filter(q=>needParams.includes(q.parameter_id)).every(q=>q.truth_metadata.visibility_role==='INTERNAL_ONLY'&&q.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toBe(true);expect(pack.fullTechnicalAcceptance).toBe(false);
});
it.each(['layer_thickness_mm','normative_thickness_mm','mortar_density_kg_m3','water_for_mix_m3','source_grade_multiplier','operator_extra_hours','ct29_bag_count','plaster_gross_facade_area_m2'])('no guessed conversion or otherproductfact%s enters the existingcompiler',async id=>{
 await expect(compile({...facts('100'),[id]:'1'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it('all knownformula inputs stay actualwallarea only; grade/operator/hours are never area multipliers',()=>{
 expect(d.formulas.slice(0,9).every(f=>f.input_parameter_ids.join()===area)).toBe(true);expect(pack.payment.workerGrade).toBe('3.5');expect(pack.payment.operatorHoursPer100M2).toBe('6.07');expect(pack.payment.sourceMachineHoursPer100M2).toEqual(['0.62','5.45']);expect(d.resources.every(r=>!r.procurement_eligible)).toBe(true);
});
it('independent19-entry fullcycle map covers eight source rows, one included owner marker andten concrete needs',()=>{
 const map=completeness();expect(map.entries).toHaveLength(19);expect(map.generatedFromCurrentRows).toBe(false);expect(validateIndependentCompletenessMapReferences({completenessMap:map,resourceDefinitions:d.resources,formulaDefinitions:d.formulas})).toEqual([]);expect(pack.eightCycle).toHaveLength(8);
});
