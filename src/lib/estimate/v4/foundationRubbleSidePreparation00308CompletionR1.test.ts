// Prospective shared compiler cases. NOT_RUN; no registry, catalog or API admission.
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import {foundationRubblePreparationDefinitionR1 as definition,foundationRubblePreparationSyntheticFactsR1 as facts,
 foundationRubblePreparationPackR1 as pack,foundationRubblePreparationCompletenessMapR1,foundationRubblePreparationCoverageConditionR1} from './foundationRubbleSidePreparation00308CompletionR1';
import {foundationSideHotBitumenDefinitionR1 as oldDefinition,foundationSideHotBitumenSyntheticFactsR1 as oldFacts,foundationSideHotBitumenPackR1 as oldPack} from './foundationSideHotBitumenTwoCoatsKrer08R1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput,type CanonicalEstimatePriceItem} from '../backendPlatform/canonicalEstimateCompileCore';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalPublisherPriceBindingIsCompatible} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const d=definition(),old=oldDefinition(),p=pack.prefix,op=oldPack.prefix,a=pack.measurement.parameterId,oa=oldPack.measurement.parameterId;
const n=pack.targetNeedRowId,whole=p+':whole-preparation-labour',oldWhole=op+':whole-labour';
const sourceIds=pack.physicalSourceRows.map(r=>p+':'+r.id),infoIds=pack.physicalSourceRows.filter(r=>r.costTreatment==='INFORMATIONAL_SCOPE').map(r=>p+':'+r.id);
const includedIds=pack.includedOperations.map(r=>p+':'+r.id),nonWhole=[...infoIds,...includedIds];
const manual={kind:'manual',reason:'QA_ONLY explicit control; no actual price or performed-work assertion'};
const compile=(parameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimatePriceItem[]=[],def=d)=>compileCanonicalEstimateCore({
 operation:'recalculate',catalogId:'canonical-work:test:source00307_completion00308_not_persisted',compilerVersion:pack.contract,primaryMeasureParameterId:oa,
 parameterDefinitions:[...def.parameters],formulaDefinitions:[...def.formulas],resourceDefinitions:[...def.resources],submittedParameters:parameters,confirmedParameters:{},rowOverrides,
 priceItems,currencyCode:'KGS',maximumResourceRows:def.resources.length,hashJson:async v=>estimateDeterministicHash(v)});
const row=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(q=>q.row_id===id);
it('pins exact official PDF; no new identity, publication or acceptance',()=>{
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.source.path))).digest('hex')).toBe(pack.source.sha256);
 expect(pack.normId).toBe('08-01-003-08');expect(pack.source.pages).toEqual([6,13,14]);expect(pack.catalogId).toBeNull();expect(pack.newCatalogIdClaim).toBe(false);expect(pack.publicationAllowed).toBe(false);expect(pack.fullTechnicalAcceptance).toBe(false);
});
it('adds 13 object facts and six rows without defaults, effective controls or procurement',()=>{
 expect([old.parameters.length,old.formulas.length,old.resources.length]).toEqual([23,18,18]);expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([36,24,24]);
 expect(d.parameters.slice(old.parameters.length)).toHaveLength(13);expect(d.parameters.every(q=>q.default_value==null)).toBe(true);expect(d.runtimeInput).toEqual(old.runtimeInput);
 expect(d.resources.slice(old.resources.length).every(r=>r.procurement_eligible===false)).toBe(true);
 expect(d.resources.slice(old.resources.length).filter(r=>r.resource_graph.costTreatment==='OWN_COST')).toHaveLength(1);
 expect(d.parameters.some(q=>q.parameter_id.startsWith('effective_resource_quantity_'))).toBe(false);
});
it('retains every old parameter and formula exactly, and seventeen old resources byte-semantically',()=>{
 expect(d.parameters.slice(0,23)).toEqual(old.parameters);expect(d.formulas.slice(0,18)).toEqual(old.formulas);
 expect(d.resources.slice(0,18).filter(r=>r.row_id!==n)).toEqual(old.resources.filter(r=>r.row_id!==n));
});
it('the single old need delta is its explicit inclusion/coverage seal and rowhash; trace/identity/formula/unit/payment stay exact',()=>{
 const before=old.resources.find(r=>r.row_id===n)!,after=d.resources.find(r=>r.row_id===n)!;
 const{inclusion_ast:_i,source_metadata:_s,row_sha256:_h,...oldProtected}=before;
 const{inclusion_ast:_ii,source_metadata:_ss,row_sha256:_hh,...newProtected}=after;
 expect(newProtected).toEqual(oldProtected);expect(after.source_metadata?.normativeTrace).toEqual(before.source_metadata?.normativeTrace);
 const{completionNeedTransitionV1,...afterSource}=after.source_metadata!;expect(afterSource).toEqual(before.source_metadata);expect(completionNeedTransitionV1).toEqual({featureContract:pack.contract,selectedMethodParameterId:'rubble_prep_profile',resolvedOnlyForMethod:pack.scopeFacts[0].values![0],resolvedThroughPaidOwnerRowId:whole,automaticLegacyPriceOrQuantityTransferAllowed:false});
 expect(after.inclusion_ast).toEqual({kind:'and',operands:[before.inclusion_ast,{kind:'not',operand:foundationRubblePreparationCoverageConditionR1()}]});
});
it.each(['missing','unconfirmed'] as const)('%s selection preserves exact original applied/preliminary behavior and creates no 008 charge',async mode=>{
 const input=oldFacts();if(mode==='unconfirmed')input[pack.selectionParameter]=pack.states.unconfirmed;
 const r=await compile(input),before=await compile(oldFacts(),{},[],old);
 expect(r.rows).toEqual(before.rows);expect(r.totals).toEqual(before.totals);
 expect(r.preliminaryNeeds.map(v=>[v.row_id,v.quantity,v.unit_id,v.unit_price,v.need_state,v.missing_parameter_ids])).toEqual(before.preliminaryNeeds.map(v=>[v.row_id,v.quantity,v.unit_id,v.unit_price,v.need_state,v.missing_parameter_ids]));
 expect(sourceIds.every(id=>row(r,id)===undefined)).toBe(true);expect(r.preliminaryNeeds.some(v=>v.row_id===n)).toBe(true);
});
it.each([
 ['whole-preparation-labour','96.7','man_hour'],['flatbed-truck','0.2','machine_hour'],['water','0.105','m3'],['ready-cement-mortar1_3','3.05','m3'],
] as const)('separately measured 100 m² gives source008 %s=%s %s',async(id,quantity,unit)=>{
 const r=await compile(facts('100','100'));expect(row(r,p+':'+id)).toMatchObject({quantity,unit_id:unit});expect(r.totals.amount).toBe('0');
});
it('required-but-not-ready quantifies only 008; original 007 source rows remain blocked by unchanged readiness facts',async()=>{
 const r=await compile(facts('100','100'),{[whole]:{unitPrice:'77',provenance:manual},[oldWhole]:{unitPrice:'77',provenance:manual}});
 expect(row(r,whole)).toMatchObject({quantity:'96.7',amount:'7445.9'});expect(row(r,oldWhole)).toBeUndefined();expect(r.totals.amount).toBe('7445.9');
 expect(r.preliminaryNeeds.some(v=>v.row_id===oldWhole&&v.missing_parameter_ids.includes('waterproofing_prepared_substrate'))).toBe(true);
 expect(r.preliminaryNeeds.some(v=>v.row_id===n)).toBe(false);
});
it('accepted source work plus separate readiness permits the two distinct whole owners once, not duplicate primer/heat',async()=>{
 const r=await compile(facts('100','100','acceptedWork'),{[whole]:{unitPrice:'77',provenance:manual},[oldWhole]:{unitPrice:'77',provenance:manual}});
 expect(row(r,whole)).toMatchObject({quantity:'96.7',amount:'7445.9'});expect(row(r,oldWhole)).toMatchObject({quantity:'21.2',amount:'1632.4'});expect(r.totals.amount).toBe('9078.3');
 expect(r.rows.filter(v=>v.included_in_estimate)).toHaveLength(2);
});
it('125 m² scales 008 once, canonical QA amount rounds 9307.375 to 9307.38',async()=>{
 const r=await compile(facts('125','125'),{[whole]:{unitPrice:'77',titleRu:'Проверочная подготовка бутового участка',provenance:manual}});
 expect(row(r,whole)).toMatchObject({quantity:'120.875',amount:'9307.38',title_ru:'Проверочная подготовка бутового участка'});expect(r.totals.amount).toBe('9307.38');
 expect(row(r,p+':water')?.quantity).toBe('0.13125');expect(row(r,p+':ready-cement-mortar1_3')?.quantity).toBe('3.8125');
});
it('already-ready state charges no new 008 work; no prep area is inferred',async()=>{
 const input=facts('100','100','alreadyReady');delete input[a];for(const f of pack.scopeFacts)if(!['rubble_prep_profile','rubble_prep_project_reference'].includes(f.id))delete input[f.id];
 const r=await compile(input,{[whole]:{unitPrice:'77',provenance:manual},[oldWhole]:{unitPrice:'77',provenance:manual}});
 expect(sourceIds.every(id=>row(r,id)===undefined)).toBe(true);expect(row(r,oldWhole)?.amount).toBe('1632.4');expect(r.totals.amount).toBe('1632.4');expect(r.preliminaryNeeds.some(v=>v.row_id===n)).toBe(false);
});
it.each(['acceptedWork','alreadyReady'] as const)('missing independent acceptance reference in %s does not claim readiness or close old source gap',async selection=>{
 const input=facts('100','100',selection);delete input[pack.readinessReferenceId];const r=await compile(input);
 expect(row(r,whole)).toBeUndefined();expect(r.preliminaryNeeds.some(v=>v.row_id===n)).toBe(true);expect(r.totals.amount).toBe('0');
});
it('required-not-ready plus supplied parent ready fact is a contradictory object record, rejected',async()=>{
 await expect(compile({...facts('100','100'),waterproofing_prepared_substrate:'PREPARED_EVEN_RUBBLE_MASONRY'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it.each(['PREPARED_EVEN_BRICK','PREPARED_EVEN_CONCRETE'])('accepted-work scope refuses %s instead of transferring rubble norm',async substrate=>{
 await expect(compile({...facts('100','100','acceptedWork'),waterproofing_prepared_substrate:substrate})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it.each(pack.scopeFacts.map(f=>f.id))('missing required 008 fact %s withholds all new source outputs and retains original prep need',async id=>{
 const input=facts('100','100');delete input[id];const r=await compile(input);
 expect(sourceIds.every(k=>row(r,k)===undefined)).toBe(true);expect(r.preliminaryNeeds.some(v=>v.row_id===n)).toBe(true);expect(r.preliminaryNeeds.some(v=>v.missing_parameter_ids.includes(id))).toBe(true);
});
it.each([
 {[a]:'0'},{[a]:'-1'},{[a]:'99.99'},{[oa]:'99.99'},
 {rubble_prep_substrate:'BRICK_OR_CONCRETE'}, {rubble_prep_method:'FULL_DEMOLITION_OR_GENERAL_PLASTER'},
 {rubble_prep_mortar_spec:'DRY_MIX_OR_SITE_RECIPE_WITH_DEFAULT_DENSITY'},
 {rubble_prep_payment_scope:'PRIMER_AND_HEATING_PAID_AGAIN'}, {rubble_prep_scope:'DIFFERENT_FACE_OR_AGGREGATED_SCOPE'},
 {rubble_prep_profile:'ANY_FOUNDATION_PREPARATION'}, {rubble_prep_quantity_basis:'AREA_FROM_MORTAR_VOLUME'},
] as const)('supplied incompatible method/area/source fact %j fails closed',async change=>{
 await expect(compile({...facts('100','100'),...change})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it('missing separate preparation area is not copied from the parent area',async()=>{
 const input=facts('100','100');delete input[a];const r=await compile(input);expect(row(r,whole)).toBeUndefined();expect(r.preliminaryNeeds.some(v=>v.row_id===n)).toBe(true);expect(r.preliminaryNeeds.some(v=>v.missing_parameter_ids.includes(a))).toBe(true);
});
it('missing parent measured area is not inferred from the preparation area, including its peer relation',async()=>{
 const input=facts('100','100');delete input[oa];const r=await compile(input);expect(row(r,whole)).toBeUndefined();expect(r.preliminaryNeeds.some(v=>v.missing_parameter_ids.includes(oa))).toBe(true);
});
it('tiny positive area uses existing positivity policy, no invented minimum',async()=>{
 const r=await compile(facts('0.00001','0.00001'));expect(row(r,whole)?.quantity).toBe('0.00000967');
 expect(d.parameters.find(q=>q.parameter_id===a)?.constraints_json).toMatchObject({min:0,exclusiveMin:0,forbiddenWhen:{kind:'or'}});
 expect(d.parameters.find(q=>q.parameter_id===a)?.constraints_json).not.toHaveProperty('equalToParameter');
});
it.each(sourceIds)('raw quantity77 cannot replace computed source008 quantity on %s',async id=>{
 await expect(compile(facts('100','100'),{[id]:{quantity:'77',provenance:manual}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it('source008 labour exclusion preserves source quantity and creates no alternate paid owner',async()=>{
 const r=await compile(facts('100','100'),{[whole]:{unitPrice:'77',includedInEstimate:false,provenance:manual}});expect(row(r,whole)).toMatchObject({quantity:'96.7',unit_price:'77',included_in_estimate:false});expect(r.totals.amount).toBe('0');
});
it.each(nonWhole)('manual price77/included true cannot pay or procure source008 nonwhole %s',async id=>{
 const r=await compile(facts('100','100'),{[id]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance:manual}});
 expect(row(r,id)).toMatchObject({unit_price:'77',included_in_estimate:false,included_in_procurement:false});expect(r.totals.amount).toBe('0');
});
it.each(infoIds)('snapshot reference77 cannot pay or procure %s; generic migration blocked separately',async id=>{
 const resource=d.resources.find(v=>v.row_id===id)!;const r=await compile(facts('100','100'),{},[{price_key:resource.cost_owner_id!,unit_id:resource.unit_id,currency_code:'KGS',unit_price:'77',snapshot_id:'qa-control-not-real-price'}]);
 expect(row(r,id)).toMatchObject({unit_price:'77',included_in_estimate:false,included_in_procurement:false});expect(r.totals.amount).toBe('0');
 expect(resource.source_metadata?.automaticGenericPriceInheritanceAllowed).toBe(false);
 expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:{...resource,source_metadata:{}},targetResource:resource,sourceBindingPriceKey:resource.cost_owner_id!})).toBe(false);
});
it.each(includedIds)('included step %s belongs to the same 96.70 whole owner',id=>{
 const r=d.resources.find(v=>v.row_id===id)!;expect(r.cost_owner_id).toBe(whole);expect(r.resource_graph).toMatchObject({costTreatment:'INCLUDED_IN_RESOURCE_ROWS',parentCostOwnerId:whole,includedInResourceOwnerRowId:whole});
});
it.each(['0','1','77'])('no user value %s can replace the original unresolved application norm even when coverage is selected',async value=>{
 await expect(compile({...facts('100','100'),unresolved_waterproofing_substrate_preparation:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it('no manual old-need price/title is migrated onto new labour owner',async()=>{
 const r=await compile(facts('100','100'),{[n]:{unitPrice:'77',titleRu:'Старая открытая потребность',provenance:manual}});expect(row(r,whole)).toMatchObject({unit_price:null});expect(r.totals.amount).toBe('0');
});
it('eight other original application needs remain even after known preparation is selected',async()=>{
 const r=await compile(facts('100','100','acceptedWork'));for(const gap of oldPack.sourceNeeds.filter(v=>v.id!=='substrate-preparation'))expect(r.preliminaryNeeds.some(v=>v.row_id===op+':open:'+gap.id)).toBe(true);
 expect(r.preliminaryNeeds.some(v=>v.row_id===n)).toBe(false);expect(pack.fullTechnicalAcceptance).toBe(false);
});
it('truck has explicit unresolved price scope, not helper-null admission or new driver hours',()=>{
 const resource=d.resources.find(v=>v.row_id===p+':flatbed-truck')!;expect(resource.source_metadata).toMatchObject({machinePriceScopePending:true,operatorRoleNotAdmitted:true,noAdditionalOperatorInferred:false});
 expect(d.resources.slice(18).filter(v=>v.category==='labor')).toHaveLength(1);expect(pack.finance.newPaidMachineOrMaterials).toBe(0);
});
it('ready/no-new-work coverage requires exact selector, rubble and two independent references',()=>{
 const good=facts('100','100','alreadyReady');expect(resolveInclusionGraph(foundationRubblePreparationCoverageConditionR1(),good).value).toBe(true);
 const missing={...good};delete missing[pack.readinessReferenceId];expect(resolveInclusionGraph(foundationRubblePreparationCoverageConditionR1(),missing).value).not.toBe(true);
 expect(resolveInclusionGraph(foundationRubblePreparationCoverageConditionR1(),oldFacts()).value).toBe(false);
});
it('independent map lists the two preparation operations within one whole owner plus all original source obligations',()=>{
 const map=foundationRubblePreparationCompletenessMapR1();expect(map.entries).toHaveLength(24);expect(validateIndependentCompletenessMapReferences({completenessMap:map,resourceDefinitions:d.resources,formulaDefinitions:d.formulas})).toEqual([]);
 expect(map.entries.filter(v=>v.sourceId===pack.sourceId)).toHaveLength(6);
});

it('a snapshot for the shared whole owner prices the single labour only, both included operations remain unpayable',async()=>{
 const r=await compile(facts('100','100'),{},[{price_key:whole,unit_id:'man_hour',currency_code:'KGS',unit_price:'77',snapshot_id:'qa-whole-control'}]);
 expect(r.totals.amount).toBe('7445.9');for(const id of includedIds){expect(row(r,id)?.included_in_estimate).toBe(false);expect(row(r,id)?.included_in_procurement).toBe(false);const target=d.resources.find(v=>v.row_id===id)!;
 expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:{...target,source_metadata:{}},targetResource:target,sourceBindingPriceKey:whole})).toBe(false);}
});
it('same separately entered decimal area 100 and 100.0 is valid without string identity',async()=>{
 const r=await compile(facts('100.0','100'));expect(row(r,whole)?.quantity).toBe('96.7');
});
it('exact existing formula comparison rejects distinct areas which JS Number would merge',async()=>{
 await expect(compile(facts('9007199254740992','9007199254740993'))).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it('already-ready without an explicit 008 method witness has no new charge and does not erase the original unknown-method need',async()=>{
 const input=facts('100','100','alreadyReady');delete input.rubble_prep_profile;const r=await compile(input);expect(row(r,whole)).toBeUndefined();expect(r.preliminaryNeeds.some(v=>v.row_id===n)).toBe(true);
});
it('already-ready selection cannot invent any of the thirteen old 007 application facts',async()=>{
 const input=facts('100','100','alreadyReady');for(const f of oldPack.scopeFacts)delete input[f.id];const r=await compile(input);
 expect(row(r,whole)).toBeUndefined();expect(row(r,oldWhole)).toBeUndefined();expect(r.preliminaryNeeds.some(v=>v.row_id===n)).toBe(true);expect(r.totals.amount).toBe('0');
});
