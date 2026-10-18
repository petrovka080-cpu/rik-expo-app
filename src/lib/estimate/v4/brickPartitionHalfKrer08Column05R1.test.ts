// Prospective62 cases for root-admitted profile and exact machine owners. Author did not run this suite.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {brickPartitionHalfPackR1 as pack,brickPartitionHalfPrefixR1 as prefix,brickPartitionHalfDefinitionR1 as definition,
 brickPartitionHalfCompletenessMapR1 as completeness,brickPartitionCraneModesR1 as modes,compileBrickPartitionHalfR1} from './brickPartitionHalfKrer08Column05R1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {assertCanonicalMachineHourDefinitionV1,canonicalManualMachineHourPriceCoverageV1,resolveCanonicalMachineHourPriceCoverageV1} from '../backendPlatform/canonicalMachineHourPriceCoverageV1';
import {assertBrickPartition005CapturedAppendPreimageR1} from '../../../../scripts/estimate/r4a13/prepareBrickPartitionHalfKrer08Column05AppendR1';

const d=definition(),catalogId=pack.proposedIdentity.catalogId;
const control=(area=35.5):Record<string,unknown>=>{
 const p:Record<string,unknown>={net_partition_area_m2:area,storey_height_m:4,crane_fulfillment:modes.own};
 for(const f of pack.scopeFacts)p[f.id]=f.value;
 for(const id of pack.requiredProjectReferences)p[id]='CONTROL_ONLY accepted reference; no actual object data';
 const quantum:Record<string,number>={water:0.001,brick:1,timber:0.001,forgings:0.001,mortar:0.001};
 for(const m of pack.materials){p[m.specificationParameterId]='CONTROL_ONLY exact source-compatible supply specification';p[m.id+'_stock']=0;p[m.id+'_reserve']=0;p[m.id+'_quantum']=quantum[m.id];}
 return p;
};
const compile=(p:Record<string,unknown>)=>compileBrickPartitionHalfR1(catalogId,p);
const by=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(row=>row.row_id===prefix+':'+id);
const provenance={kind:'manual',reason:'CONTROL_ONLY saved supplier order; not a source norm'};

it('pins the official2015 column005 source, not a current catalog decision',()=>{
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.source.artifactPath))).digest('hex')).toBe(pack.source.sha256);
 expect(pack.normId).toBe('08-02-002-05');expect(pack.source.sha256).toBe('cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436');
 expect(pack.proposedIdentity.persisted).toBe(false);expect(pack.fullTechnicalAcceptance).toBe(false);expect(pack.newAcceptedCompleteTypes).toBe(0);
});
it('keeps one ordinary net partition area and explicit source-unit normalization',()=>{
 expect(d.parameters.filter(p=>p.truth_metadata.input_origin_class==='KNOWN_PRIMARY_WORK_SCOPE').map(p=>[p.parameter_id,p.unit_id])).toEqual([['net_partition_area_m2','m2']]);
 expect(d.resources.find(r=>r.row_id===prefix+':brick-consumed')?.unit_id).toBe('item');
 expect(d.resources.find(r=>r.row_id===prefix+':forgings-consumed')?.unit_id).toBe('kg');
 expect(pack.materials.find(m=>m.id==='brick')).toMatchObject({sourceUnitLabel:'1000шт.',sourcePer100M2:'5.04',normalizationFactor:'1000',ratePer100M2:'5040'});
 expect(pack.materials.find(m=>m.id==='forgings')).toMatchObject({sourceUnitLabel:'т',sourcePer100M2:'0.0023',normalizationFactor:'1000',ratePer100M2:'2.3'});
});
it.each([
 [100,'143.99','4.11','0.3','5040','0.016','2.3','2.3'],
 [35.5,'51.11645','1.45905','0.1065','1789.2','0.00568','0.8165','0.8165'],
] as const)('uses independently transcribed005 rates at%s netm²',async(n,labor,crane,water,brick,timber,forgings,mortar)=>{
 const r=await compile(control(n));
 for(const [id,q] of [['whole-labor',labor],['operator-information',crane],['crane-consumed',crane],['water-consumed',water],['brick-consumed',brick],['timber-consumed',timber],['forgings-consumed',forgings],['mortar-consumed',mortar]])expect(by(r,id)?.quantity).toBe(q);
 expect(r.rows).toHaveLength(15);expect(r.preliminaryNeeds).toHaveLength(8);expect(r.rows.every(row=>row.unit_price===null)).toBe(true);
});
it.each([{net_partition_area_m2:0},{storey_height_m:0},{storey_height_m:4.01},
 {partition_profile_confirmation:'Армированная перегородка01–04 или иной кирпич'},
 {construction_conditions:'Зимняя кладка/ремонт без подтверждения исходной нормы'}])('rejects excluded or invalid scope%j',async changes=>{
 await expect(compile({...control(),...changes})).rejects.toBeDefined();
});
it('admits4m inclusive and does not invent a separate truck/reinforcement/labour phase',async()=>{
 const r=await compile(control());expect(by(r,'whole-labor')?.quantity).toBe('51.11645');
 expect(d.resources.some(row=>/truck|reinforc|armature/.test(row.row_id))).toBe(false);
 expect(r.rows.filter(row=>row.category==='labor'&&row.included_in_estimate).map(row=>row.row_id)).toEqual([prefix+':whole-labor']);
 expect(by(r,'operator-information')).toMatchObject({included_in_estimate:false,included_in_procurement:false});
 expect(d.resources.find(row=>row.row_id===prefix+':whole-masonry-operation')?.resource_graph.parentCostOwnerId).toBe(prefix+':whole-labor');
});
it.each(pack.requiredProjectReferences)('requires the exact project/payment reference%s before source rows resolve',async id=>{
 const p=control();delete p[id];const r=await compile(p);
 expect(by(r,'whole-labor')).toBeUndefined();expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':whole-labor'&&n.missing_parameter_ids.includes(id))).toBe(true);
});
it.each(pack.materials.map(m=>m.id))('keeps%s consumption but does not guess supplier stock',async id=>{
 const p=control();delete p[id+'_stock'];const r=await compile(p);
 expect(by(r,id+'-consumed')).toBeDefined();expect(by(r,id)).toBeUndefined();
 expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':'+id&&n.missing_parameter_ids.includes(id+'_stock'))).toBe(true);
});
it.each([false,true])('selects exactly one whole crane-hour owner; hired=%s',async hired=>{
 const r=await compile({...control(),crane_fulfillment:hired?modes.hired:modes.own});
 expect(r.rows.filter(row=>[prefix+':crane-own',prefix+':crane-hired'].includes(row.row_id))).toHaveLength(1);
 expect(by(r,hired?'crane-hired':'crane-own')?.quantity).toBe('1.45905');
 expect(r.rows.filter(row=>row.included_in_procurement)).toHaveLength(hired?6:5);
 expect(by(r,'operator-information')?.included_in_estimate).toBe(false);
});
it('requires a positive-stock compatibility reference and rounds only the actual order quantum',async()=>{
 const input={...control(),brick_stock:100,brick_reserve:10,brick_quantum:20};
 const missing=await compile(input);expect(by(missing,'brick')).toBeUndefined();
 const r=await compile({...input,brick_stock_compatibility_reference:'CONTROL_ONLY suitable source-dimension M100 batch'});
 expect(by(r,'brick')?.quantity).toBe('1700');expect(by(r,'brick-consumed')?.quantity).toBe('1789.2');
 expect(by(r,'forgings-consumed')?.quantity).toBe('0.8165');expect(by(r,'forgings')?.quantity).toBe('0.817');
});
it('does not accept a fractional supplier brick quantum as a whole-item package',async()=>{
 await expect(compile({...control(),brick_quantum:0.5})).rejects.toBeDefined();
});
it('preserves manual order, title and price through recalculate while keeping source consumption',async()=>{
 const r=await compileBrickPartitionHalfR1(catalogId,control(),{[prefix+':mortar']:{quantity:'1',unitPrice:'100',titleRu:'CONTROL_ONLY saved M50 supply',provenance}});
 expect(by(r,'mortar')).toMatchObject({quantity:'1',unit_price:'100',amount:'100',title_ru:'CONTROL_ONLY saved M50 supply'});
 expect(by(r,'mortar-consumed')?.quantity).toBe('0.8165');expect(r.preliminaryNeeds).toHaveLength(8);
});
it('preserves saved material exclusions and keeps the source and eight obligations visible',async()=>{
 const r=await compileBrickPartitionHalfR1(catalogId,control(),{[prefix+':brick']:{includedInEstimate:false,includedInProcurement:false,provenance}});
 expect(by(r,'brick')).toMatchObject({included_in_estimate:false,included_in_procurement:false});
 expect(by(r,'brick-consumed')?.quantity).toBe('1789.2');expect(r.preliminaryNeeds).toHaveLength(8);
});
it.each(['whole-labor','operator-information','crane-consumed','brick-consumed','whole-masonry-operation'])(
 'rejects a persisted manual quantity replacing derived%s',async id=>{
 await expect(compileBrickPartitionHalfR1(catalogId,control(),{[prefix+':'+id]:{quantity:'1',provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it.each(pack.sourceNeeds.map(g=>g.id))('retains exact open need%s and rejects guessed0/1 quantities',async id=>{
 const r=await compile(control());expect(r.preliminaryNeeds.some(n=>n.row_id===prefix+':'+id&&n.quantity===null)).toBe(true);
 for(const quantity of ['0','1'])await expect(compileBrickPartitionHalfR1(catalogId,control(),{[prefix+':'+id]:{quantity,provenance}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it('declares positive-area facts requiredNow; stock references are conditional only on stock',()=>{
 const required=[...pack.scopeFacts.map(f=>f.id),'storey_height_m',...pack.requiredProjectReferences,'crane_fulfillment',...pack.materials.flatMap(m=>[m.specificationParameterId,m.id+'_stock',m.id+'_reserve',m.id+'_quantum'])];
 for(const id of required)expect(d.parameters.find(p=>p.parameter_id===id)?.constraints_json?.requiredWhen).toEqual({kind:'greater_than',parameterId:'net_partition_area_m2',value:0});
 for(const m of pack.materials)expect(d.parameters.find(p=>p.parameter_id===m.id+'_stock_compatibility_reference')?.constraints_json?.requiredWhen).toEqual({kind:'greater_than',parameterId:m.id+'_stock',value:0});
 expect(validateIndependentCompletenessMapReferences({completenessMap:completeness(),formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
});
const machineRows=['crane-own','crane-hired'].map(id=>prefix+':'+id);
const foreignRoof=['canonical-work:base:roofing_interior_flat_roof_install_technical_room','canonical-work:base:roofing_interior_flat_roof_install_wet_zone'];
const foreignVectors=machineRows.flatMap(rowId=>foreignRoof.map(catalogId=>({rowId,catalogId})));
const snapshotId='00000000-0000-4000-8000-000000000001';
const manualInput=(rowId:string)=>({catalogId,rowId,unitId:'machine_hour',currencyCode:'KGS',unitPrice:'77',manual:true,
 evidence:canonicalManualMachineHourPriceCoverageV1({rowId,unitPrice:'77',currencyCode:'KGS'}),manualProvenanceReason:'consumer_estimate_row_batch_edit'});
const snapshotInput=(rowId:string)=>{const m=manualInput(rowId),priceKey='CONTROL_ONLY:'+rowId;return {...m,manual:false,snapshotId,priceKey,
 evidence:{...m.evidence,source:{kind:'SNAPSHOT',snapshotId,priceKey}}};};
it.each(machineRows)('admits exact full-source machine price for%s with manual and snapshot evidence',rowId=>{
 const row=d.resources.find(r=>r.row_id===rowId)!;
 expect(assertCanonicalMachineHourDefinitionV1({catalogId,rowId,unitId:row.unit_id,sourceMetadata:row.source_metadata})).toMatchObject({resourceCode:'02-0005',operator:'OPERATOR'});
 expect(resolveCanonicalMachineHourPriceCoverageV1(manualInput(rowId))?.status).toBe('CONFIRMED_MANUAL');
 expect(resolveCanonicalMachineHourPriceCoverageV1(snapshotInput(rowId))?.status).toBe('CONFIRMED_SOURCE');
 expect(manualInput(rowId).evidence.operationScope).toBe('FULL_SOURCE_OPERATION');
});
it.each(foreignVectors)('refuses foreign roof definition identity%j',({rowId,catalogId:foreign})=>{
 const row=d.resources.find(r=>r.row_id===rowId)!;
 expect(assertCanonicalMachineHourDefinitionV1({catalogId:foreign,rowId,unitId:row.unit_id,sourceMetadata:row.source_metadata})).toBeNull();
});
it.each(foreignVectors)('refuses foreign roof manual evidence%j',({rowId,catalogId:foreign})=>{
 expect(resolveCanonicalMachineHourPriceCoverageV1({...manualInput(rowId),catalogId:foreign})).toBeNull();
});
it.each(foreignVectors)('refuses foreign roof snapshot evidence%j',({rowId,catalogId:foreign})=>{
 expect(resolveCanonicalMachineHourPriceCoverageV1({...snapshotInput(rowId),catalogId:foreign})).toBeNull();
});
it.each(machineRows)('rejects wrong normative definition metadata for%s',rowId=>{
 const row=d.resources.find(r=>r.row_id===rowId)!;
 expect(()=>assertCanonicalMachineHourDefinitionV1({catalogId,rowId,unitId:row.unit_id,sourceMetadata:{...row.source_metadata,normativeResourceCode:'02-0075'}})).toThrow();
});
it.each(machineRows)('does not confirm price evidence with a changed scope, source or billed unit for%s',rowId=>{
 const m=manualInput(rowId),s=snapshotInput(rowId);
 const inputs=[
  {...m,evidence:{...m.evidence,resourceCode:'02-0075'}},
  {...m,evidence:{...m.evidence,operationScope:'MACHINE_ONLY_WORKER_AND_COMPRESSED_AIR_SEPARATE'}},
  {...m,evidence:{...m.evidence,minimumBillableHours:'8'}},
  {...m,evidence:{...m.evidence,fixedFees:'1'}},
  {...m,currencyCode:'USD'}, {...m,unitPrice:'78'}, {...m,unitId:'man_hour'},
  {...m,evidence:{...m.evidence,source:{kind:'MANUAL',rowId:prefix+':another-owner',priceProvenanceReason:'consumer_estimate_row_batch_edit'}}},
  {...m,manualProvenanceReason:'different saved reason'},
  {...s,snapshotId:'00000000-0000-4000-8000-000000000002'}, {...s,priceKey:'different source item'},
 ];
 for(const input of inputs){const result=resolveCanonicalMachineHourPriceCoverageV1(input);
  expect(result?.status).not.toBe('CONFIRMED_MANUAL');expect(result?.status).not.toBe('CONFIRMED_SOURCE');}
});
it('shows the machine payment boundary without internal admission implementation status',()=>{
 const guide=JSON.stringify(d.parameters.find(p=>p.parameter_id==='crane_fulfillment')?.truth_metadata.guide);
 expect(guide).not.toMatch(/price helper|Допуск точных строк|ещё не выполнен/iu);
 for(const rowId of machineRows){const row=d.resources.find(r=>r.row_id===rowId)!;
  expect(row.source_metadata).not.toHaveProperty('machineCoverageAdmissionPending');
  expect(JSON.stringify(row.resource_graph.publicResourcePresentationV1)).not.toMatch(/admission pending|roof\/road\/floor/iu);}
});
it('accepts only the captured absent source/new-group preimage at the governed append boundary',()=>{
 expect(()=>assertBrickPartition005CapturedAppendPreimageR1({source:null,group:null,ordinalCollisionCount:0})).not.toThrow();
});
it.each([
 {source:{id:'appeared',source_key:pack.sourceId,artifact_sha256:pack.source.sha256},group:null,ordinalCollisionCount:0},
 {source:{id:'appeared',source_key:pack.sourceId,artifact_sha256:'0'.repeat(64)},group:null,ordinalCollisionCount:0},
 {source:null,group:{group_id:'wg:master:brick_partition_half_unreinforced_upto4m'},ordinalCollisionCount:0},
 {source:null,group:null,ordinalCollisionCount:1},
])('refuses any changed captured source/group/ordinal preimage%j',snapshot=>{
 expect(()=>assertBrickPartition005CapturedAppendPreimageR1(snapshot)).toThrow();
});
