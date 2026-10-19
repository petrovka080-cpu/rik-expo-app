import {brickPartitionHalfDefinitionR1} from './brickPartitionHalfKrer08Column05R1';
import {applyBrickPartitionNeedsScopeR1} from './brickPartitionNeedsScopeR1';
import {resolveCanonicalScopeRequirementV1} from '../backendPlatform/canonicalScopeRequirementV1';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import pack from '../../../../data/estimate-benchmarks/source-packs/brick-partition-half-unreinforced-krer08-002-05-r1.json';

// AUTHORING COPY ONLY; ROOT owns the guarded test slot. These have NOT run.
const prefix=pack.rowPrefix;
const facts:Record<string,unknown>={net_partition_area_m2:'35.5',storey_height_m:'4',
 ...Object.fromEntries(pack.scopeFacts.map(f=>[f.id,f.value])),
 ...Object.fromEntries(pack.requiredProjectReferences.map(id=>[id,'Проект ПР-17, ведомость В-3, раздел границ оплаты']))};
const decide=(id:string,changes:Record<string,unknown>={},known?:Set<string>,excludedCosts?:Set<string>)=>{
 const d=applyBrickPartitionNeedsScopeR1(brickPartitionHalfDefinitionR1());
 const r=d.resources.find(x=>x.row_id===prefix+':'+id)!;
 return resolveCanonicalScopeRequirementV1({graph:r.resource_graph,rowId:r.row_id,parameters:{...facts,...changes},
  resourceIds:new Set(d.resources.map(x=>x.row_id)),parameterIds:new Set(d.parameters.map(p=>p.parameter_id)),
  knownQuantityRowIds:known??new Set(d.resources.map(x=>x.row_id)),excludedOwnCostRowIds:excludedCosts});
};

test('the overlay retains all quantities, formulas, stock balances and source owners',()=>{
 const d=brickPartitionHalfDefinitionR1(),before=JSON.stringify(d),r=applyBrickPartitionNeedsScopeR1(d);
 expect(JSON.stringify(d)).toBe(before);expect(r.parameters).toEqual(d.parameters);expect(r.formulas).toEqual(d.formulas);
 expect(r.resources.map(x=>[x.row_id,x.formula_id,x.unit_id,x.cost_owner_id])).toEqual(d.resources.map(x=>[x.row_id,x.formula_id,x.unit_id,x.cost_owner_id]));
 const gaps=new Set(pack.sourceNeeds.map(g=>prefix+':'+g.id));
 expect(r.resources.filter(x=>!gaps.has(x.row_id))).toEqual(d.resources.filter(x=>!gaps.has(x.row_id)));
 expect(r.resources.filter(x=>gaps.has(x.row_id)).every(x=>x.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'&&!x.procurement_eligible)).toBe(true);
});
test.each([
 ['base-and-dpc','PROJECT_SCOPE_OPEN'],['connections-lintels','PROJECT_SCOPE_OPEN'],['access-boundary','INCLUDED'],
 ['tools-ppe','FINANCIAL_POLICY'],['curing-protection','PROCESS_REQUIRED'],['quality-control','PROCESS_REQUIRED'],
 ['external-logistics','PARTLY_INCLUDED'],['cleanup-waste','FINANCIAL_POLICY'],
])('%s has a subject specific status %s without a numeric surrogate',(id,status)=>{
 expect(decide(id)).toMatchObject({status,numericNormAccepted:false,separatePaymentAccepted:false});
});
test.each([undefined,'Другой кирпич или армированная перегородка'])('a missing or different exact profile never closes access: %s',value=>{
 expect(decide('access-boundary',{partition_profile_confirmation:value})?.status).toBe('SCOPE_UNVERIFIED');
});
test('the height boundary is inclusive and unsupported height does not close scope',()=>{
 expect(decide('access-boundary',{storey_height_m:'4'})?.status).toBe('INCLUDED');
 expect(decide('access-boundary',{storey_height_m:'4.01'})?.status).toBe('SCOPE_UNVERIFIED');
});
test('missing project evidence is not completion and a missing/excluded covering owner is not inclusion',()=>{
 expect(decide('access-boundary',{approved_partition_design_reference:undefined})?.status).toBe('SCOPE_UNVERIFIED');
 expect(decide('access-boundary',{},new Set([prefix+':whole-labor']))?.status).toBe('SCOPE_UNVERIFIED');
 expect(decide('access-boundary',{},undefined,new Set([prefix+':whole-labor']))?.status).toBe('REQUIRED_RESOURCE_EXCLUDED');
});
test('official source identity must match005; a different masonry norm is not an eligible parent',()=>{
 const d=brickPartitionHalfDefinitionR1();d.resources.find(x=>x.row_id===prefix+':whole-labor')!.source_metadata!.exact_column='08-02-002-01';
 expect(()=>applyBrickPartitionNeedsScopeR1(d)).toThrow('BRICK_EXACT_OFFICIAL_COLUMN005_REQUIRED');
});
test('the existing compiler reports classified obligations and rejects manual0/1, even after a price is entered',async()=>{
 const d=applyBrickPartitionNeedsScopeR1(brickPartitionHalfDefinitionR1());
 const compile=(rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={})=>compileCanonicalEstimateCore({
  operation:'recalculate',catalogId:pack.proposedIdentity.catalogId,compilerVersion:'brick-needs-targeted-draft',
  primaryMeasureParameterId:'net_partition_area_m2',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],
  resourceDefinitions:[...d.resources],submittedParameters:facts,confirmedParameters:{...d.runtimeInput},rowOverrides,
  currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:async value=>estimateDeterministicHash(value)});
 const id=prefix+':tools-ppe',r=await compile({[id]:{unitPrice:'99',provenance:{kind:'manual',reason:'Проверка границы оплаты'}}});
 const need=r.preliminaryNeeds.find(n=>n.row_id===id)!;
 expect(need.quantity).toBeNull();expect(need.selected).toBe(false);expect(need.procurement_eligible).toBe(false);
 const requested=await compile({[id]:{includedInProcurement:true,includedInEstimate:true,provenance:{kind:'manual',reason:'Информационная строка не закупается'}}});
 expect(requested.preliminaryNeeds.find(n=>n.row_id===id)).toMatchObject({quantity:null,selected:false,procurement_eligible:false});
 for(const quantity of ['0','1'])await expect(compile({[id]:{quantity,provenance:{kind:'manual',reason:'Нельзя заменить норму'}}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
