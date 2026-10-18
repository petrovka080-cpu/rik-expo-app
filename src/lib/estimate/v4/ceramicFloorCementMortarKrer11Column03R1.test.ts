// Prospective source-bound partial scenarios. Root owns all actual test execution and adoption.
import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';import {resolve} from 'node:path';
import {ceramicFloor02703PackR1 as pack,ceramicFloor02703PrefixR1 as prefix,ceramicFloor02703CatalogIdR1 as catalogId,
 ceramicFloor02703DefinitionR1 as definition,ceramicFloor02703CompletenessMapR1 as completeness,compileCeramicFloor02703R1 as compile} from './ceramicFloorCementMortarKrer11Column03R1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {assertCanonicalMachineHourDefinitionV1,canonicalManualMachineHourPriceCoverageV1,resolveCanonicalMachineHourPriceCoverageV1} from '../backendPlatform/canonicalMachineHourPriceCoverageV1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const d=definition();
const control=(n=35.5):Record<string,unknown>=>{
 const p:Record<string,unknown>={net_ceramic_floor_area_m2:n};
 for(const f of pack.scopeFacts)p[f.id]=f.value;
 for(const id of pack.requiredProjectReferences)p[id]='CONTROL_ONLY approved project reference, not actual object';
 for(const m of pack.machines)p[m.parameterId]=m.ownValue;
 const q:Record<string,number>={water:0.001,'ceramic-tile':0.01,sawdust:0.001,'ready-mortar-m150':0.001};
 for(const m of pack.materials){p[m.specificationId]='CONTROL_ONLY exact source-compatible product, not actual SKU';p[m.parameterPrefix+'_stock']=0;p[m.parameterPrefix+'_reserve']=0;p[m.parameterPrefix+'_quantum']=q[m.id];}
 return p;
};
const by=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(x=>x.row_id===prefix+':'+id);
const provenance={kind:'manual',reason:'CONTROL_ONLY saved object amendment; not a source norm'};
const recalculate=(p:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides'])=>compileCanonicalEstimateCore({
 operation:'recalculate',catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:pack.primaryMeasureParameterId,
 parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:p,
 confirmedParameters:{...d.runtimeInput},rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:async v=>estimateDeterministicHash(v)});

it('pins the already captured official source and exact03, with root-classified partial identity; no publication',()=>{
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.source.path))).digest('hex')).toBe('e56ef148df993609c325b7d505c54b1806e8185a4fd7a1550b15266144538223');
 expect(pack.normId).toBe('KRER11-01-027-03');expect(pack.catalogId).toBe(catalogId);expect(pack.proposedIdentity.persisted).toBe(false);expect(pack.paymentAdmission.publisherOrRuntimeAdoptionRequiresRootChecks).toBe(true);
});
it('keeps one ordinary net covering area and exact source/material units',()=>{
 expect(d.ordinaryParameterIds).toEqual(['net_ceramic_floor_area_m2']);expect(d.parameters.find(p=>p.parameter_id===pack.primaryMeasureParameterId)?.unit_id).toBe('m2');
 expect(pack.materials.map(m=>[m.id,m.unitId])).toEqual([['water','m3'],['ceramic-tile','m2'],['sawdust','m3'],['ready-mortar-m150','m3']]);
 expect(d.runtimeInput).toEqual({});expect(d.parameters.every(p=>p.default_value===null)).toBe(true);
});
it.each([
 [100,'119.78','2.66','0.36','2.3','0.28','3.85','102','3.06','1.3'],
 [35.5,'42.5219','0.9443','0.1278','0.8165','0.0994','1.36675','36.21','1.0863','0.4615'],
] as const)('uses the independently transcribed full03 source at%s m2',async(n,labour,info,forklift,hoist,truck,water,tile,sawdust,mortar)=>{
 const r=await compile(control(n));
 for(const [id,quantity] of [['whole-labor',labour],['operator-information',info],['forklift5t-consumed',forklift],['hoist500kg45m-consumed',hoist],['truck5t-consumed',truck],['water-consumed',water],['ceramic-tile-consumed',tile],['sawdust-consumed',sawdust],['ready-mortar-m150-consumed',mortar]])expect(by(r,id)?.quantity).toBe(quantity);
 expect(r.rows).toHaveLength(20);expect(r.preliminaryNeeds).toHaveLength(6);expect(r.rows.every(x=>x.unit_price===null)).toBe(true);
});
it.each(Array.from({length:8},(_,mask)=>[mask] as const))('selects exactly one owner per physical machine, fulfillment mask%s',async mask=>{
 const input=control();pack.machines.forEach((m,index)=>{input[m.parameterId]=(mask&(1<<index))?m.hiredValue:m.ownValue;});
 const r=await compile(input);
 for(const m of pack.machines)expect(r.rows.filter(x=>x.row_id===prefix+':'+m.id+'-own'||x.row_id===prefix+':'+m.id+'-hired')).toHaveLength(1);
 expect(r.rows.filter(x=>x.included_in_procurement)).toHaveLength(4+[0,1,2].filter(bit=>mask&(1<<bit)).length);
 expect(by(r,'operator-information')).toMatchObject({included_in_estimate:false,included_in_procurement:false});
});
const machineRows=pack.machines.flatMap(m=>['own','hired'].map(kind=>({rowId:prefix+':'+m.id+'-'+kind,resourceCode:m.resourceCode,operator:m.operator})));
const foreignRoof=['canonical-work:base:roofing_interior_flat_roof_install_technical_room','canonical-work:base:roofing_interior_flat_roof_install_wet_zone'];
const foreignVectors=machineRows.flatMap(m=>foreignRoof.map(foreign=>({...m,foreign})));
const snapshotId='00000000-0000-4000-8000-000000000001';
const manualInput=(rowId:string)=>({catalogId,rowId,unitId:'machine_hour',currencyCode:'KGS',unitPrice:'77',manual:true,
 evidence:canonicalManualMachineHourPriceCoverageV1({rowId,unitPrice:'77',currencyCode:'KGS'}),manualProvenanceReason:'consumer_estimate_row_batch_edit'});
const snapshotInput=(rowId:string)=>{const m=manualInput(rowId),priceKey='CONTROL_ONLY:'+rowId;return {...m,manual:false,snapshotId,priceKey,evidence:{...m.evidence,source:{kind:'SNAPSHOT',snapshotId,priceKey}}};};
it.each(machineRows)('admits exact operated machine definition/manual/snapshot %j',m=>{
 const row=d.resources.find(r=>r.row_id===m.rowId)!;
 expect(assertCanonicalMachineHourDefinitionV1({catalogId,rowId:m.rowId,unitId:row.unit_id,sourceMetadata:row.source_metadata})).toMatchObject({resourceCode:m.resourceCode,operator:m.operator,operationScope:'FULL_SOURCE_OPERATION'});
 expect(resolveCanonicalMachineHourPriceCoverageV1(manualInput(m.rowId))?.status).toBe('CONFIRMED_MANUAL');
 expect(resolveCanonicalMachineHourPriceCoverageV1(snapshotInput(m.rowId))?.status).toBe('CONFIRMED_SOURCE');
});
it.each(foreignVectors)('refuses foreign roof definition identity %j',m=>{
 const row=d.resources.find(r=>r.row_id===m.rowId)!;
 expect(assertCanonicalMachineHourDefinitionV1({catalogId:m.foreign,rowId:m.rowId,unitId:row.unit_id,sourceMetadata:row.source_metadata})).toBeNull();
});
it.each(foreignVectors)('refuses foreign roof manual evidence %j',m=>{
 expect(resolveCanonicalMachineHourPriceCoverageV1({...manualInput(m.rowId),catalogId:m.foreign})).toBeNull();
});
it.each(foreignVectors)('refuses foreign roof snapshot evidence %j',m=>{
 expect(resolveCanonicalMachineHourPriceCoverageV1({...snapshotInput(m.rowId),catalogId:m.foreign})).toBeNull();
});
it.each(machineRows)('rejects wrong normative code or operation scope %j',m=>{
 const row=d.resources.find(r=>r.row_id===m.rowId)!;
 for(const change of [{normativeResourceCode:'02-0005'},{machinePriceOperationScope:'MACHINE_ONLY_WORKER_AND_COMPRESSED_AIR_SEPARATE'}])
  expect(()=>assertCanonicalMachineHourDefinitionV1({catalogId,rowId:m.rowId,unitId:row.unit_id,sourceMetadata:{...row.source_metadata,...change}})).toThrow();
});
it.each(machineRows)('does not confirm wrong price identity/unit/scope/fixed fees %j',m=>{
 const x=manualInput(m.rowId),s=snapshotInput(m.rowId);
 const wrong=[{...x,evidence:{...x.evidence,resourceCode:'02-0005'}},{...x,evidence:{...x.evidence,operationScope:'MACHINE_ONLY_WORKER_AND_COMPRESSED_AIR_SEPARATE'}},
  {...x,evidence:{...x.evidence,minimumBillableHours:'8'}},{...x,evidence:{...x.evidence,fixedFees:'1'}},
  {...x,currencyCode:'USD'},{...x,unitPrice:'78'},{...x,unitId:'man_hour'},{...x,manualProvenanceReason:'different reason'},
  {...x,evidence:{...x.evidence,source:{kind:'MANUAL',rowId:prefix+':foreign',priceProvenanceReason:'consumer_estimate_row_batch_edit'}}},
  {...s,snapshotId:'00000000-0000-4000-8000-000000000002'},{...s,priceKey:'different price item'}];
 for(const input of wrong){const result=resolveCanonicalMachineHourPriceCoverageV1(input);expect(result?.status).not.toBe('CONFIRMED_MANUAL');expect(result?.status).not.toBe('CONFIRMED_SOURCE');}
});
it.each([{net_ceramic_floor_area_m2:0},{ceramic_floor_profile:'PORCELAIN_600x600'},{cement_mortar_system:'CM11_OR_CE40'},{base_scope_confirmed:'UNKNOWN_REPAIR'},{net_area_rule:'GROSS_FLOOR_WITH_OCCUPIED_COLUMNS'}])('rejects excluded or invalid source scope%j',async change=>{
 await expect(compile({...control(),...change})).rejects.toBeDefined();
});
it.each([...pack.scopeFacts.map(f=>f.id),...pack.requiredProjectReferences].map(id=>[id] as const))('does not invent missing source/project fact%s',async id=>{
 const input=control();delete input[id];const r=await compile(input);
 expect(by(r,'whole-labor')).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':whole-labor'&&n.missing_parameter_ids.includes(id))).toBe(true);
});
it.each(pack.materials.map(m=>[m.id] as const))('keeps known consumption but defers unknown supply stock for%s',async id=>{
 const input=control(),m=pack.materials.find(m=>m.id===id)!;delete input[m.parameterPrefix+'_stock'];const r=await compile(input);
 expect(by(r,id+'-consumed')).toBeDefined();expect(by(r,id+'-order')).toBeUndefined();
 expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':'+id+'-order'&&n.missing_parameter_ids.includes(m.parameterPrefix+'_stock'))).toBe(true);
});
it.each(pack.gaps.map(g=>[g.id] as const))('preserves open gap%s and refuses a guessed user quantity',async id=>{
 const r=await compile(control());expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':'+id&&n.quantity===null)).toBe(true);
 await expect(recalculate(control(),{[prefix+':'+id]:{quantity:'1',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it('uses stock/reserve/quantum only after source mortar consumption',async()=>{
 const r=await compile({...control(),ready_mortar_m150_stock:0.2,ready_mortar_m150_stock_compatibility_reference:'CONTROL_ONLY compatible M150 batch',ready_mortar_m150_reserve:0.1,ready_mortar_m150_quantum:0.2});
 expect(by(r,'ready-mortar-m150-consumed')?.quantity).toBe('0.4615');expect(by(r,'ready-mortar-m150-order')?.quantity).toBe('0.4');
});
it('preserves saved material quantity/title/price through recalculate',async()=>{
 const r=await recalculate(control(),{[prefix+':water-order']:{quantity:'2',unitPrice:'77',titleRu:'CONTROL_ONLY saved water order',provenance}});
 expect(by(r,'water-order')).toMatchObject({quantity:'2',unit_price:'77',amount:'154',title_ru:'CONTROL_ONLY saved water order'});
 expect(by(r,'water-consumed')?.quantity).toBe('1.36675');expect(r.preliminaryNeeds).toHaveLength(6);
});
it('preserves saved exclusions and leaves physical consumption/gaps visible',async()=>{
 const r=await recalculate(control(),{[prefix+':ceramic-tile-order']:{includedInEstimate:false,includedInProcurement:false,provenance}});
 expect(by(r,'ceramic-tile-order')).toMatchObject({included_in_estimate:false,included_in_procurement:false});expect(by(r,'ceramic-tile-consumed')?.quantity).toBe('36.21');expect(r.preliminaryNeeds).toHaveLength(6);
});
it('keeps repeated exact manual application deterministic',async()=>{
 const overrides={[prefix+':water-order']:{quantity:'2',unitPrice:'77',provenance}};
 expect((await recalculate(control(),overrides)).rows).toEqual((await recalculate(control(),overrides)).rows);
});
it.each(['whole-labor','operator-information','forklift5t-consumed','ceramic-tile-consumed','included-tiles-bedding-joints'])(
 'does not replace source-derived quantity %s by a saved row amount',async id=>{
 await expect(recalculate(control(),{[prefix+':'+id]:{quantity:'2',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it('declares all source/project/supply facts conditionally required without stock-reference defaults',()=>{
 const ids=[...pack.scopeFacts.map(f=>f.id),...pack.requiredProjectReferences,...pack.machines.map(m=>m.parameterId),...pack.materials.flatMap(m=>[m.specificationId,m.parameterPrefix+'_stock',m.parameterPrefix+'_reserve',m.parameterPrefix+'_quantum'])];
 for(const id of ids)expect(d.parameters.find(p=>p.parameter_id===id)?.constraints_json?.requiredWhen).toEqual({kind:'greater_than',parameterId:pack.primaryMeasureParameterId,value:0});
 for(const m of pack.materials)expect(d.parameters.find(p=>p.parameter_id===m.parameterPrefix+'_stock_compatibility_reference')?.constraints_json?.requiredWhen).toEqual({kind:'greater_than',parameterId:m.parameterPrefix+'_stock',value:0});
});
it('has one whole labour and one mortar owner, with included stages and no second grout',async()=>{
 const r=await compile(control());expect(r.rows.filter(x=>x.included_in_estimate&&x.category==='labor').map(x=>x.row_id)).toEqual([prefix+':whole-labor']);
 for(const o of pack.operations){expect(by(r,o.id)?.included_in_estimate).toBe(false);expect(d.resources.find(r=>r.row_id===prefix+':'+o.id)?.resource_graph.parentCostOwnerId).toBe(prefix+':whole-labor');}
 expect(d.resources.some(r=>/cm11|ce40|ct17|cs25/iu.test(r.row_id))).toBe(false);
 const c=completeness();expect(validateIndependentCompletenessMapReferences({completenessMap:c,formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
 expect(c.entries.map(e=>e.resolution.rowId).sort()).toEqual(d.resources.map(r=>r.row_id).sort());expect(d.resources).toHaveLength(29);
 for(const m of pack.materials)expect(c.entries.some(e=>e.expectedResourceId===pack.normId+':'+m.id+'-order')).toBe(true);
});
it('keeps scope/price admission partial and never claims a complete new type',()=>{
 expect(pack.fullTechnicalAcceptance).toBe(false);expect(pack.newAcceptedCompleteTypes).toBe(0);expect(pack.paymentAdmission.exactMachineOwnerMapRequired).toBe(true);
 expect(pack.gaps.map(g=>g.id)).toContain('additional-logistics-waste');expect(pack.gaps.map(g=>g.id)).toContain('skirting');
});

it('accepts one explicit operated quote without duplicating operator or changing six needs',async()=>{
 const rowId=prefix+':forklift5t-own',evidence=manualInput(rowId).evidence;
 const r=await recalculate(control(),{[rowId]:{unitPrice:'77',machineHourPriceCoverageV1:evidence,provenance:{kind:'manual',reason:'consumer_estimate_row_batch_edit'}}});
 expect(by(r,'forklift5t-own')).toMatchObject({unit_price:'77',quantity:'0.1278'});
 expect(by(r,'operator-information')).toMatchObject({included_in_estimate:false,included_in_procurement:false});expect(r.preliminaryNeeds).toHaveLength(6);
});
it('keeps public guides free of authoring/admission flags and all six needs source-owned',()=>{
 for(const m of pack.machines){const guide=JSON.stringify(d.parameters.find(p=>p.parameter_id===m.parameterId)?.truth_metadata.guide);expect(guide).not.toMatch(/pending|admission|price helper|ещё не выполнен/iu);}
 for(const row of d.resources){expect(row.source_metadata).not.toHaveProperty('test_only_unclassified');expect(row.source_metadata).not.toHaveProperty('machinePriceAdmissionPending');}
 expect(pack.gaps.every(g=>g.ownerRu&&g.nextTaskRu&&g.acceptanceRu)).toBe(true);
});
