import {ceramicFloorM150WholeProvisionDefinitionR4 as definition,ceramicFloorM150WholeProvisionCompletenessR4 as completeness,compileCeramicFloorM150WholeProvisionR4 as compile,ceramicFloorM150WholeProvisionPackR4 as pack} from './ceramicFloorCementMortarWholeProvisionR4';
import {ceramicFloorM150WholeProvisionDefinitionR3 as parentDefinition,compileCeramicFloorM150WholeProvisionR3 as parentCompile} from './ceramicFloorCementMortarWholeProvisionR3';
import {ceramicFloorM150ExactFormatDefinitionR2,ceramicFloorM150ExactFormatCompletenessR2,compileCeramicFloorM150ExactFormatR2} from './ceramicFloorM150ExactFormatBranchesR2';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {validateIndependentCompletenessMapReferences,validateMasterFormulaGraphConsistency} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const c=pack.cleanser,input=(A=100,L=50)=>({[pack.parent.primaryParameterId]:A,[pack.parent.skirtingLengthParameterId]:L});
const row=(result:Awaited<ReturnType<typeof compile>>,id:string)=>result.rows.find(r=>r.row_id===id)!;
it.each([[100,50,'0.042','1'],[100,52.5,'0.042','1'],[1,0,'0.0168','1'],[0.01,0,'0.0168','1'],[100,0,'0.0336','1'],[10000,5000,'2.3268','3']])('supplies the complete normal cleanser/dispenser profile at %s/%s without new facts',async(A,L,consumed,supply)=>{
 const before=hash(parentDefinition()),facts=input(Number(A),Number(L)),r=await compile(facts),old=await parentCompile(facts);
 expect(row(r,c.rowId)).toMatchObject({quantity:consumed,unit_id:'l',category:'material',included_in_estimate:false,included_in_procurement:false});
 expect(row(r,c.order.rowId)).toMatchObject({quantity:supply,unit_id:'l',category:'material',included_in_estimate:false,included_in_procurement:false,procurement_readiness:'READY'});
 expect(row(r,c.dispenser.rowId)).toMatchObject({quantity:'1',unit_id:'pcs',category:'tool',included_in_estimate:false,included_in_procurement:false});
 expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual(pack.actualRemaining.map(n=>n.rowId).sort());expect(r.preliminaryNeeds).toHaveLength(4);
 for(const oldRow of old.rows.filter(x=>x.row_id!==c.rowId)){const current=row(r,oldRow.row_id);expect(current).toBeDefined();for(const key of ['quantity','category','unit_id','included_in_procurement','included_in_estimate'] as const)expect(current[key]).toEqual(oldRow[key]);}
 expect(hash(parentDefinition())).toBe(before);expect(row(r,c.existingCostOwnerRowId).quantity).toBe(String(A));
});
it('has an independent full category/unit/operation oracle and retains the exact geometry-only public inputs',()=>{
 const d=definition(),map=completeness();expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([31,86,86]);expect(map.entries).toHaveLength(86);expect(map.generatedFromCurrentRows).toBe(false);
 expect(d.parameters.filter(p=>p.required).map(p=>p.parameter_id)).toEqual([pack.parent.primaryParameterId,pack.parent.skirtingLengthParameterId]);expect(d.parameters.some(p=>p.parameter_id===c.parameterId)).toBe(false);
 expect(validateMasterFormulaGraphConsistency(d.formulas)).toEqual([]);expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
 for(const entry of map.entries){expect(entry.category).toBeDefined();expect(Object.hasOwn(entry,'unitId')).toBe(true);expect(entry.requiredOperationIds.length).toBeGreaterThan(0);}
 for(const id of [c.rowId,c.order.rowId,c.dispenser.rowId]){const resource=d.resources.find(r=>r.row_id===id)!;expect(resource.cost_owner_id).toBe(c.existingCostOwnerRowId);expect(canonicalEstimateOperationReferences(resource.resource_graph.operationCompositionV1).map(o=>o.operationId)).toEqual(expect.arrayContaining(c.requiredOperationIds));}
 expect(d.resources.every(r=>((r.resource_graph.publicResourcePresentationV1 as {detailsRu:unknown[]})?.detailsRu??[]).length===0)).toBe(true);expect(pack.fullTechnicalAcceptance).toBe(false);
});
it.each(['category','unit','operation','formula-output'])('rejects an independent %s mutation in the new physical provision',kind=>{
 const d=definition(),resources=structuredClone(d.resources),formulas=structuredClone(d.formulas),r=resources.find(r=>r.row_id===c.dispenser.rowId)!;
 if(kind==='category')r.category='material';if(kind==='unit')r.unit_id='l';if(kind==='formula-output')formulas.find(f=>f.formula_id===r.formula_id)!.output_unit_id='l';
 if(kind==='operation'){const op=r.resource_graph.operationCompositionV1 as {additionalOperations:{operationId:string}[]};op.additionalOperations=op.additionalOperations.filter(x=>x.operationId!==c.requiredOperationIds.at(-1));}
 expect(validateIndependentCompletenessMapReferences({completenessMap:completeness(),formulaDefinitions:formulas,resourceDefinitions:resources}).length).toBeGreaterThan(0);
});
it.each(['ceramic100x100','ceramic150x150'] as const)('reuses the same whole soap profile for exact format %s',async format=>{
 const d=ceramicFloorM150ExactFormatDefinitionR2(format),map=ceramicFloorM150ExactFormatCompletenessR2(format),r=await compileCeramicFloorM150ExactFormatR2(format,input());expect(d.formulas).toEqual(definition().formulas);
 expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);expect(row(r,c.rowId).quantity).toBe('0.042');expect(row(r,c.order.rowId).quantity).toBe('1');expect(r.preliminaryNeeds).toHaveLength(4);
});
it('retains a single paid provision owner and a source-balanced whole cartridge after manual resource editing',async()=>{
 const d=definition(),result=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.catalogId,primaryMeasureParameterId:pack.parent.primaryParameterId,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:input(),confirmedParameters:{...d.runtimeInput},currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:hash,rowOverrides:{
  [c.existingCostOwnerRowId]:{unitPrice:'10',provenance:{kind:'manual'}},[c.rowId]:{quantity:'1.4',provenance:{kind:'manual'}},[c.dispenser.rowId]:{unitPrice:'17',provenance:{kind:'manual'}},
 }});
 expect(result.totals.amount).toBe('1000');expect(row(result,c.order.rowId).quantity).toBe('2');expect(row(result,c.dispenser.rowId)).toMatchObject({unit_price:'17',included_in_estimate:false,included_in_procurement:false});
 expect(row(result,c.order.rowId).calculation_trace).toMatchObject({purchaseBalance:{consumed:'1.4',reserve:'0.6',effectiveOrder:'2',procurementReady:true}});
});
it('preserves an old saved manual10 litre demand and orders10 whole litres through the common balance',async()=>{
 const d=definition(),r=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:pack.catalogId,primaryMeasureParameterId:pack.parent.primaryParameterId,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:input(),confirmedParameters:{...d.runtimeInput},currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:hash,rowOverrides:{[c.rowId]:{quantity:'10',provenance:{kind:'manual'}}}});
 expect(row(r,c.rowId)).toMatchObject({quantity:'10',calculation_trace:{manualQuantityOverride:true,resourceGraph:{publicResourcePresentationV1:{rowKind:'CALCULATION_DETAIL'}}}});expect(row(r,c.order.rowId)).toMatchObject({quantity:'10',calculation_trace:{purchaseBalance:{consumed:'10',effectiveOrder:'10',quantum:'1',consumptionShortage:'0',reserveDeficit:'0',procurementReady:true}}});
 expect(r.preliminaryNeeds).toHaveLength(4);expect(r.rows.filter(x=>x.row_id===c.existingCostOwnerRowId)).toHaveLength(1);
});
