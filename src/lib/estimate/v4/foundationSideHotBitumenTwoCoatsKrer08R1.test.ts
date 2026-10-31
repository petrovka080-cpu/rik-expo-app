// Prospective shared-core cases NOT_RUN. No registry/identity/publication/API admission.
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import {foundationSideHotBitumenDefinitionR1 as definition,foundationSideHotBitumenSyntheticFactsR1 as facts,foundationSideHotBitumenPackR1 as pack,foundationSideHotBitumenCompletenessMapR1} from './foundationSideHotBitumenTwoCoatsKrer08R1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalPublisherPriceBindingIsCompatible} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const d=definition(),p=pack.prefix;
const compile=(parameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>compileCanonicalEstimateCore({
 operation:'recalculate',catalogId:'canonical-work:test:unclassified_krer08_01_003_07_not_persisted',compilerVersion:pack.contract,primaryMeasureParameterId:pack.measurement.parameterId,
 parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:parameters,confirmedParameters:{},rowOverrides,
 priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:async v=>estimateDeterministicHash(v)});
const row=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(x=>x.row_id===p+':'+id);
const manual={kind:'manual',reason:'QA_ONLY source/price reference, not publication or realpaid acceptance'};
const sourceIds=[pack.worker.id,...pack.machines.map(x=>x.id),...pack.materials.map(x=>x.id)];
const infoIds=[...pack.machines.map(x=>x.id),...pack.materials.map(x=>x.id)];
it('pins the provided official primaryPDF andkeeps catalogidentity deliberatelyNULL',()=>{
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.source.path))).digest('hex')).toBe('cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436');
 expect(pack.catalogId).toBeNull();expect(pack.publicationAllowed).toBe(false);expect(pack.noCurrentCatalogClaim).toBe(true);expect(pack.normId).toBe('08-01-003-07');
});
it('declares one wholelabour, sixINFO, twoincluded andnineconcrete open tasks, no fakeBOM/order/derivedquantity controls',()=>{
 expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([23,18,18]);
 expect(d.resources.filter(r=>r.resource_graph.costTreatment==='INFORMATIONAL_SCOPE')).toHaveLength(6);expect(d.resources.filter(r=>r.resource_graph.costTreatment==='INCLUDED_IN_RESOURCE_ROWS')).toHaveLength(2);
 expect(d.resources.every(r=>r.procurement_eligible===false)).toBe(true);expect(d.parameters.every(q=>q.default_value==null)).toBe(true);expect(d.runtimeInput).toEqual({});
 expect(d.parameters.some(q=>q.parameter_id.startsWith('effective_resource_quantity_'))).toBe(false);
});
it.each([
 ['whole-labour','21.2','man_hour'],['bitumen-boiler','1.95','machine_hour'],['flatbed-truck','0.2','machine_hour'],
 ['hot-mastic','0.24','t'],['bitumen-bn90-10','0.016','t'],['kerosene','0.024','t'],['rags','0.1','kg'],
]as const)('100m² gives exact printed%s=%s%s without multiplyingtwo sourcecoats again',async(id,quantity,unit)=>{
 const r=await compile(facts());expect(row(r,id)).toMatchObject({quantity,unit_id:unit});expect(r.totals.amount).toBe('0');
});
it('125m² scales source007 once;whole26.5×QA77=2040.5 andmaterials/machines remainunpaid',async()=>{
 const r=await compile(facts('125'),{[p+':whole-labour']:{unitPrice:'77',titleRu:'QA whole source007 operation',provenance:manual}});
 expect(row(r,'whole-labour')).toMatchObject({quantity:'26.5',unit_price:'77',amount:'2040.5'});expect(r.totals.amount).toBe('2040.5');
 expect(row(r,'hot-mastic')?.quantity).toBe('0.3');expect(row(r,'rags')?.quantity).toBe('0.125');
 expect(r.rows.filter(x=>x.included_in_estimate)).toHaveLength(1);
});
it('sourcewhole100m² price77 control gives1632.4, exclusion removesfinance without inventinganotherowner',async()=>{
 const a=await compile(facts(),{[p+':whole-labour']:{unitPrice:'77',provenance:manual}});expect(a.totals.amount).toBe('1632.4');
 const b=await compile(facts(),{[p+':whole-labour']:{unitPrice:'77',includedInEstimate:false,provenance:manual}});expect(b.totals.amount).toBe('0');expect(row(b,'whole-labour')?.quantity).toBe('21.2');
});
it.each(pack.scopeFacts.map(f=>f.id))('missing mandatory physical/project boundary%s withholds source output instead ofchoosing hotmethod',async id=>{
 const input=facts();delete input[id];const r=await compile(input);expect(sourceIds.every(k=>row(r,k)===undefined)).toBe(true);expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(id))).toBe(true);
});
it.each([
 {waterproofing_profile:'ANY_FOUNDATION_WATERPROOFING'}, {waterproofing_orientation:'HORIZONTAL_CUTOFF'},
 {waterproofing_prepared_substrate:'ROUGH_UNPREPARED_RUBBLE'}, {waterproofing_prepared_substrate:'XPS_OR_WET_ZONE_TILE'},
 {waterproofing_layers:'ONE_COAT'}, {waterproofing_layers:'THREE_COATS_TIMES1_5'},
 {waterproofing_method:'COLD_POLYMER_BITUMEN_OR_TORCH_MEMBRANE'},
 {waterproofing_material_scope:'MODERN_TRADE_PRODUCT_UNKNOWN_CONSUMPTION'},
 {waterproofing_payment_scope:'OPERATOR_NO_ADDITIONAL_INFERRED_OR_ALL_IN_RATE'},
 {waterproofing_conditions:'UNPROVED_WINTER_OR_OTHER_METHOD_COEFFICIENT'},
 {side_waterproofing_area_m2:'0'}, {side_waterproofing_area_m2:'-1'},
]as const)('rejects incompatible suppliedscope%j withoutswitching column/product',async change=>{
 await expect(compile({...facts(),...change})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it.each(infoIds)('INFO%s cannotbecome paid/procured from includedtrue andprice77',async id=>{
 const r=await compile(facts(),{[p+':'+id]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance:manual}});
 expect(row(r,id)).toMatchObject({unit_price:'77',included_in_estimate:false,included_in_procurement:false});expect(r.totals.amount).toBe('0');
});
it.each(sourceIds)('retains authored quantity77 for%s with its source formula, basis and ownership unchanged',async id=>{
 const source=d,input=facts(),overrides={[p+':'+id]:{quantity:'77',provenance:manual}},
  originalSource=JSON.stringify({source,input,overrides}),before=await compile(input),after=await compile(input,overrides),
  rowId=p+':'+id,original=before.rows.find(row=>row.row_id===rowId)!,edited=after.rows.find(row=>row.row_id===rowId)!,
  authoredFormulaId=source.resources.find(row=>row.row_id===rowId)!.formula_id;
 expect(original).toBeDefined();expect(edited).toBeDefined();
 expect(original.calculation_trace).toMatchObject({formulaId:authoredFormulaId});
 expect(edited).toMatchObject({row_id:rowId,quantity:'77',unit_id:original.unit_id,
  included_in_estimate:original.included_in_estimate,included_in_procurement:false,unit_price:null,amount:null});
 expect(edited.calculation_trace).toMatchObject({manualQuantityOverride:true,manualAmendment:manual,
  calculatedQuantityBeforeOverride:original.quantity,formulaId:authoredFormulaId,
  formulaAstSha256:source.formulas.find(formula=>formula.formula_id===authoredFormulaId)!.ast_sha256});
 expect(edited.normative_trace).toEqual(original.normative_trace);
 expect((edited.calculation_trace as Record<string,unknown>).resourceGraph).toEqual((original.calculation_trace as Record<string,unknown>).resourceGraph);
 expect(after.rows.map(row=>row.row_id)).toEqual(before.rows.map(row=>row.row_id));
 expect(after.preliminaryNeeds).toEqual(before.preliminaryNeeds);
 expect(after.rows.filter(row=>row.included_in_procurement).map(row=>row.row_id))
  .toEqual(before.rows.filter(row=>row.included_in_procurement).map(row=>row.row_id));
 expect(after.totals.amount).toBe('0');expect(JSON.stringify({source,input,overrides})).toBe(originalSource);
 const cleared=await compile(input,{[rowId]:{quantity:null,provenance:manual}}),restored=cleared.rows.find(row=>row.row_id===rowId)!;
 expect(restored.quantity).toBe(original.quantity);expect(restored.calculation_trace).not.toHaveProperty('manualQuantityOverride');
 await expect(compile(input,{[rowId]:{quantity:'77'}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it.each(pack.includedOperations.map(x=>x.id))('%s is includedinwholelabour andcannotbe a secondcharge',async id=>{
 const r=await compile(facts(),{[p+':'+id]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance:manual}});
 expect(row(r,id)).toMatchObject({quantity:'100',included_in_estimate:false,included_in_procurement:false});expect(r.totals.amount).toBe('0');
 expect(d.resources.find(r=>r.row_id===p+':'+id)?.cost_owner_id).toBe(p+':whole-labour');
});
it.each(['0','1'])('manual%s cannotclose equipment-price-scope APPLICATIONneed oradmitpaidmachine',async value=>{
 await expect(compile({...facts(),unresolved_waterproofing_machine_price_scope:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it('allnineexplicitneedowners remain and no machinehelper null is used as admission',async()=>{
 const r=await compile(facts());for(const need of pack.sourceNeeds)expect(r.preliminaryNeeds.some(n=>n.row_id===p+':open:'+need.id)).toBe(true);
 for(const m of pack.machines){const s=d.resources.find(x=>x.row_id===p+':'+m.id)!.source_metadata;if(!s)throw Error('TEST_MACHINE_SOURCE_METADATA_REQUIRED');expect(s.machinePriceScopePending).toBe(true);expect(s.operatorRoleNotAdmitted).toBe(true);expect(s.noAdditionalOperatorInferred).toBe(false);}
 expect(pack.payment.newProcurementOwners).toBe(0);expect(pack.fullTechnicalAcceptance).toBe(false);
 for(const need of pack.sourceNeeds){const resource=d.resources.find(v=>v.row_id===p+':open:'+need.id)!;const details=resource.resource_graph.publicResourcePresentationV1 as {detailsRu:string[]};expect(details.detailsRu).toEqual([need.nextTaskRu,'Ответственный: '+need.ownerTitleRu]);expect(details.detailsRu.join(' ')).not.toMatch(/actual defect map|source lead|effectivePurchaseBalance|APPLICATION_|PROJECT_|OWNER|\bINFO\b|NO_ADDITIONAL|OPERATOR/u);expect(need.owner).toMatch(/^[A-Z_]+$/u);}
});
it('explicitfalse blocks genericprice inheritance even matchingunit/owner/key for allsixINFOresources',()=>{
 for(const id of infoIds){const target=d.resources.find(r=>r.row_id===p+':'+id)!,source={...target,source_metadata:{}};
  expect(target.source_metadata?.automaticGenericPriceInheritanceAllowed).toBe(false);
  expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:source,targetResource:target,sourceBindingPriceKey:source.cost_owner_id})).toBe(false);}
});
it('independent18entry source/fullcycle map references only its declaredsource/steps/needs',()=>{
 const map=foundationSideHotBitumenCompletenessMapR1();expect(map.entries).toHaveLength(18);expect(validateIndependentCompletenessMapReferences({completenessMap:map,resourceDefinitions:d.resources,formulaDefinitions:d.formulas})).toEqual([]);
});
it('ordinary area hasstrictpositive existing policy without a sourceepsilon or editablecoatmultiplier',()=>{
 const q=d.parameters.find(q=>q.parameter_id===pack.measurement.parameterId)!;expect(q.constraints_json).toMatchObject({min:0,exclusiveMin:0});
 expect(d.parameters.some(q=>/density|layer_count|productivity|drying_hours|liter_per/i.test(q.parameter_id))).toBe(false);
});
