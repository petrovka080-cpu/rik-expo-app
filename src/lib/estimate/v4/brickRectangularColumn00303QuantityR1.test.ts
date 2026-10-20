// Prospective source-only shared-core tests. Author does not run Node/Jest/TS/DB/API.
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import {brickColumn00303QuantityDefinitionR1 as definition,brickColumn00303ScenarioFactsR1 as facts,brickColumn00303PackR1 as pack,
 brickColumn00303PrimaryR1 as volume,brickColumn00303FactIdsR1 as factIds,brickColumn00303NeedParameterIdsR1 as needParams,
 brickColumn00303WholeRowIdR1 as whole,brickColumn00303CompletenessMapR1 as completeness} from './brickRectangularColumn00303QuantityR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateParameterChoiceLabelRu} from '../backendPlatform/canonicalEstimateParameterSemantics';
import {assertCanonicalMachineHourDefinitionV1} from '../backendPlatform/canonicalMachineHourPriceCoverageV1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalPublisherPriceBindingIsCompatible} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const d=definition(),p=pack.prefix,included=p+':'+pack.includedOperation.id,known=d.resources.slice(0,7).map(r=>r.row_id),info=d.resources.slice(1,6).map(r=>r.row_id),nonwhole=[...info,included];
const manual={kind:'manual',reason:'TEST_ONLY CONTROL77; не цена поставщика, не норматив и не допуск закупки'};
const compile=(parameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimateCompileCoreInput['priceItems']=[])=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:'TEST_ONLY_BRICK_COLUMN00303_NO_CATALOG_BINDING',compilerVersion:pack.contract,primaryMeasureParameterId:volume,
 parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:parameters,confirmedParameters:{},rowOverrides,priceItems,currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:async v=>estimateDeterministicHash(v)});
const row=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(x=>x.row_id===id);
it('pins official21 exact00303 and leaves catalogue/source/lineage admission NULL',()=>{
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.source.path))).digest('hex')).toBe('cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436');
 expect(pack.normId).toBe('08-02-003-03');expect(pack.source.pages).toEqual([5,7,8,21]);expect(pack.measurement.denominator).toBe('1');expect(pack.measurement.sourceUnitRu).toBe('м³ кладки');
 expect([pack.catalogId,pack.workKey,pack.groupId,pack.actualCurrentClassification,pack.futureRootExecutionPin,pack.futureCurrentParentCapturePin,pack.futureRootDecisionPin]).toEqual([null,null,null,null,null,null,null]);expect(pack.identityAdmitted).toBe(false);expect(pack.publicationAllowed).toBe(false);
});
it('builds23parameters/17formulas/17rows with unique contiguous ordinals, no defaults and one wholepaidowner',()=>{
 expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([23,17,17]);expect(d.parameters.map(q=>q.ordinal)).toEqual(Array.from({length:23},(_,i)=>i));expect(d.resources.map(r=>r.ordinal)).toEqual(Array.from({length:17},(_,i)=>i));
 expect(new Set(d.parameters.map(q=>q.parameter_id)).size).toBe(23);expect(new Set(d.formulas.map(f=>f.formula_id)).size).toBe(17);expect(d.runtimeInput).toEqual({});expect(d.parameters.every(q=>q.default_value===null)).toBe(true);expect(d.ordinaryParameterIds).toEqual([volume]);expect(d.resources.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id)).toEqual([whole]);
});
it.each([
 ['1',['7.93','0.42','0.42','0.1','404','0.22']],
 ['1.25',['9.9125','0.525','0.525','0.125','505','0.275']],
 ['0.001',['0.00793','0.00042','0.00042','0.0001','0.404','0.00022']],
] as const)('separately measured%s m3 scales allsix literalrates once; fractional bricks are not retailrounded',async(v,expected)=>{
 const r=await compile(facts(v));pack.physicalRows.forEach((source,i)=>expect(row(r,p+':'+source.id)?.quantity).toBe(expected[i]));expect(row(r,included)?.quantity).toBe(v);expect(r.preliminaryNeeds).toHaveLength(10);expect(r.rows.every(x=>!x.included_in_procurement)).toBe(true);expect(r.totals.amount).toBe('0');
});
it('zero independent volume creates no minimumjob/resources/needs',async()=>{
 const r=await compile(facts('0'));expect(r.rows).toEqual([]);expect(r.preliminaryNeeds).toEqual([]);expect(r.totals.amount).toBe('0');
});
it('missing masonryvolume stays unknown rather than borrowing count/wallarea/bankvolume',async()=>{
 const input=facts('1');delete input[volume];const r=await compile(input);expect(known.every(id=>!row(r,id))).toBe(true);expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(volume))).toBe(true);expect(r.totals.amount).toBe('0');
});
it.each(factIds)('missing projectfact%s withholds allsourcephysical/included rows without inventing applicability',async id=>{
 const input=facts('1');delete input[id];const r=await compile(input);expect(known.every(key=>!row(r,key))).toBe(true);expect(r.preliminaryNeeds.some(n=>n.row_id===whole&&n.missing_parameter_ids.includes(id))).toBe(true);expect(r.totals.amount).toBe('0');
});
const invalid:Array<[string,Record<string,unknown>]>= [
 ['negativevolume',{[volume]:'-1'}],['unknownvolume',{[volume]:'UNKNOWN'}],['height0',{column00303_storey_height_m:'0'}],['height4.01',{column00303_storey_height_m:'4.01'}],
 ['reinforced01',{column00303_profile:'Прямоугольные армированные столбы'}],['round05',{column00303_profile:'Круглые кирпичные столбы'}],['arch09',{column00303_profile:'Свод или арка'}],
 ['halfbrickpartition',{column00303_profile:'Перегородка в половину кирпича'}],['BIAwall',{column00303_brick:'BIA TN10 wall system'}],['silicate',{column00303_brick:'Силикатный кирпич по похожему названию'}],
 ['brickotherformat',{column00303_brick:'Керамический кирпич 250×120×88 мм'}],['mortarM25',{column00303_mortar:'Готовый раствор марки 25'}],['mortarrecipe',{column00303_mortar:'Смешать раствор из цемента по расходу 0,22 м³'}],
 ['capacityfromnorm',{column00303_design:'Несущая способность выведена из нормы 7,93 часа'}],['areaasm3',{column00303_volume_rule:'Площадь ограждения принята равной объёму кладки'}],
 ['extraoperator',{column00303_payment:'Добавить платного машиниста 0,42 часа к рабочим'}],['automaticorder',{column00303_material_scope:'0,404 — торговая упаковка, округлить на каждый столб'}],
];
it.each(invalid)('invalid%s rejects by existing compiler instead of applying a neighbourcolumn or price',async(_id,change)=>{
 await expect(compile({...facts('1'),...change})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it.each(known)('direct quantity77 cannot replace derived source/included row%s',async id=>{
 await expect(compile(facts('1.25'),{[id]:{quantity:'77',provenance:manual}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it('wholeCONTROL77 preserves manualtitle/exclusion and exact core763.26, raw763.2625 isdiagnostic only',async()=>{
 const override={unitPrice:'77',titleRu:'TEST_ONLY цельная кладка столбов',provenance:manual},before=JSON.stringify(override);
 const r=await compile(facts('1.25'),{[whole]:override});expect(row(r,whole)).toMatchObject({quantity:'9.9125',unit_price:'77',amount:'763.26',title_ru:override.titleRu,included_in_estimate:true});expect(r.totals.amount).toBe('763.26');expect(JSON.stringify(override)).toBe(before);
 const excluded=await compile(facts('1.25'),{[whole]:{...override,includedInEstimate:false,includedInProcurement:false}});expect(row(excluded,whole)).toMatchObject({quantity:'9.9125',unit_price:'77',amount:'763.26',title_ru:override.titleRu,included_in_estimate:false});expect(excluded.totals.amount).toBe('0');
 expect(pack.controlExpectations.rawMultiplicationDiagnostic).toBe('763.2625');expect(pack.controlExpectations.coreTotalAmount).toBe('763.26');
});
it('existing core rounds positivehalfup99.125h*CONTROL77 raw7632.625 to row/total7632.63',async()=>{
 const r=await compile(facts('12.5'),{[whole]:{unitPrice:'77',provenance:manual}});expect(row(r,whole)).toMatchObject({quantity:'99.125',amount:'7632.63'});expect(r.totals.amount).toBe('7632.63');
});
it.each(nonwhole)('manual/snapshot77 on%s stays referenceonly with title, bothfinancial/proc false even when forcedtrue',async id=>{
 const target=d.resources.find(r=>r.row_id===id)!;
 for(const route of ['manual','snapshot'] as const){const title='TEST_ONLY справочное количество '+target.title_ru;
 const r=await compile(facts('1.25'),{[id]:{titleRu:title,includedInEstimate:true,includedInProcurement:true,provenance:manual,...(route==='manual'?{unitPrice:'77'}:{})}},route==='snapshot'?[{price_key:target.cost_owner_id!,unit_id:target.unit_id,currency_code:'KGS',unit_price:'77',snapshot_id:'TEST_ONLY_REFERENCE_NOT_SUPPLIER'}]:[]);
 expect(row(r,id)).toMatchObject({unit_price:'77',title_ru:title,included_in_estimate:false,included_in_procurement:false,ownership_status:'OWNED_EXCLUDED'});expect(row(r,whole)?.unit_price).toBeNull();expect(r.totals.amount).toBe('0');}
});
it('INFO mortar can retain referenceamount21.18 with manual77 but contributes no financialtotal',async()=>{
 const id=p+':ready-m50-mortar-reference',r=await compile(facts('1.25'),{[id]:{unitPrice:'77',provenance:manual}});expect(row(r,id)).toMatchObject({quantity:'0.275',unit_price:'77',amount:'21.18',included_in_estimate:false,included_in_procurement:false});expect(r.totals.amount).toBe('0');
});
it.each(nonwhole)('realpublisher rejects matchingunit/owner/key automatic priceinheritance onto%s',id=>{
 const target=d.resources.find(r=>r.row_id===id)!;expect(target.source_metadata?.automaticGenericPriceInheritanceAllowed).toBe(false);expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:{...target,source_metadata:{}},targetResource:target,sourceBindingPriceKey:target.cost_owner_id})).toBe(false);
});
it('whole compatible genericpolicy and snapshot77 remain ordinary while operator isunpriced',async()=>{
 const target=d.resources.find(r=>r.row_id===whole)!;expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:{...target,source_metadata:{}},targetResource:target,sourceBindingPriceKey:target.cost_owner_id})).toBe(true);
 const r=await compile(facts('1.25'),{},[{price_key:whole,unit_id:'man_hour',currency_code:'KGS',unit_price:'77',snapshot_id:'TEST_ONLY_WHOLE_CONTROL'}]);expect(r.totals.amount).toBe('763.26');expect(row(r,p+':operator-information')?.unit_price).toBeNull();expect(row(r,included)?.included_in_estimate).toBe(false);
});
it('sourcecrane isINFO and no known machineadmission/catalogscope is forged from code02-0005',()=>{
 const r=d.resources.find(x=>x.row_id===p+':tower-crane8t-reference')!;expect(r.source_metadata).toMatchObject({machinePriceScopePending:true,operatorRoleNotAdmitted:true,noAdditionalOperatorInferred:false,machinePriceOwnerAdmitted:false});expect(assertCanonicalMachineHourDefinitionV1({catalogId:'TEST_ONLY_NOT_ADMITTED',rowId:r.row_id,unitId:r.unit_id,sourceMetadata:r.source_metadata})).toBeNull();
});
it('grade3.8 isnot multiplier; operator.42 isseparateINFO notproven part ofworkers7.93; no neighbourtruck/rebar',()=>{
 expect(pack.payment.workerGrade).toBe('3.8');expect(pack.payment.operatorIsNotProvenPartOfWorkerHours).toBe(true);expect(d.resources.find(r=>r.row_id===whole)?.source_metadata?.operatorIsNotProvenPartOfWorkerHours).toBe(true);
 expect(pack.physicalRows.map(r=>r.resourceCode)).not.toContain('40-0001');expect(pack.physicalRows.map(r=>r.resourceCode)).not.toContain('03-0104-0001');expect(d.resources.find(r=>r.row_id===p+':operator-information')?.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');
});
it('oneincluded operation marker shareswholeowner without a second carry/access/plug quantity',()=>{
 const r=d.resources.find(x=>x.row_id===included)!;expect(r.cost_owner_id).toBe(whole);expect(r.resource_graph).toMatchObject({costTreatment:'INCLUDED_IN_RESOURCE_ROWS',parentCostOwnerId:whole,includedInResourceOwnerRowId:whole});expect(r.source_metadata?.includedMarkerIsNotSeparateAccessOrMaterialQuantity).toBe(true);expect(pack.includedOperation.printedCompositionRu.some(s=>s.includes('5 м'))).toBe(true);
 expect(pack.openNeeds.find(n=>n.id==='access-scaffolding')?.missingFactRu).toContain('стен');expect(pack.openNeeds.find(n=>n.id==='external-logistics')?.missingFactRu).toContain('5 м');
});
it.each(pack.openNeeds.map(n=>n.id))('unresolvedneed%s cannot close with0/1/77 or newmanualquantity',async id=>{
 const parameter='column00303_application_need_'+id.replaceAll('-','_'),rowId=p+':open:'+id;
 for(const value of ['0','1','77']){await expect(compile({...facts('1'),[parameter]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});await expect(compile(facts('1'),{[rowId]:{quantity:value,unitPrice:'77',provenance:manual}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});}
});
it('allten concrete needs remain visible, protected/unitless, empty sourcearrays and falseinheritance',async()=>{
 const r=await compile(facts('1'));expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual(pack.openNeeds.map(n=>p+':open:'+n.id).sort());expect(needParams).toHaveLength(10);
 for(const n of d.resources.slice(7)){expect(n.unit_id).toBe('');expect(n.source_metadata).toMatchObject({sourceRole:'UNRESOLVED_APPLICATION_NORM',normativeTrace:[],normative_source_ids:[],automaticGenericPriceInheritanceAllowed:false});}
 expect(d.parameters.filter(q=>needParams.includes(q.parameter_id)).every(q=>q.truth_metadata.visibility_role==='INTERNAL_ONLY'&&q.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toBe(true);expect(pack.fullTechnicalAcceptance).toBe(false);
});
it.each(['column_count','column_width_m','wall_area_m2','bearing_capacity_kn','reinforcement_kg','brick_retail_pack_size','mortar_recipe_cement_kg','source_grade_multiplier'])('unknown proxy/control%s cannot enter the sharedcompiler as newquantity or default',async id=>{
 await expect(compile({...facts('1'),[id]:'1'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it.each(pack.scopeFacts)('newpublic choice%s isalready distinct Russian fact without common genericfallback',f=>{
 expect(f.values).toHaveLength(1);expect(canonicalEstimateParameterChoiceLabelRu(f.id,f.values[0]!)).toBe(f.values[0]);expect(f.values[0]).toMatch(/[А-Яа-яЁё]/u);
});
it('allseven knownformulas use onlyindependentm3; no count/height/grade hiddenmultiplier or procurement',()=>{
 expect(d.formulas.slice(0,7).every(f=>f.input_parameter_ids.join()===volume)).toBe(true);expect(d.resources.every(r=>!r.procurement_eligible)).toBe(true);expect(pack.measurement.noPerColumnOrPerM3Rounding).toBe(true);
 const brick=pack.physicalRows.find(r=>r.id==='ceramic-brick-reference')!;expect([brick.printedUnitRu,brick.printedRatePerM3,brick.normalizationFactor,brick.ratePerM3]).toEqual(['1000 шт.','0.404','1000','404']);
});
it('independent17-entry fullcyclemap covers6physical+1included+10specific gaps without claimed completeness',()=>{
 const map=completeness();expect(map.entries).toHaveLength(17);expect(map.generatedFromCurrentRows).toBe(false);expect(validateIndependentCompletenessMapReferences({completenessMap:map,resourceDefinitions:d.resources,formulaDefinitions:d.formulas})).toEqual([]);expect(pack.eightCycle).toHaveLength(8);
});
