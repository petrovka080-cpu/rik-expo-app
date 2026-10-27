import {
 assertCanonicalMachineHourDefinitionV1 as definition,
 canonicalMachineHourPriceRequirementV1 as requirement,
 canonicalManualMachineHourPriceCoverageV1 as manual,
 parseCanonicalMachineHourPriceCoverageV1 as parse,
 resolveCanonicalMachineHourPriceCoverageV1 as resolve,
} from './canonicalMachineHourPriceCoverageV1';

// Independently reviewed primary columns. Initial stock, tools and the source
// aggregate operator line are outside the paid machine-hour admission.
const hash='45c065fb0e35586948fdb06cd21fe331358e2c454c25a4dc83d4a686bf9f3e4b';
const profiles=[
 {column:'06-01-001-15',catalog:'canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard',prefix:'master212:family-b:krer06-01-001-15:r1',variant:false,surface:false,welder:false},
 {column:'06-01-041-03',catalog:'canonical-work:base:concrete_foundation_interior_concrete_slab_pour_standard',prefix:'master212:family-b:krer06-01-041-03:r1',variant:false,surface:true,welder:false},
 {column:'06-01-031-04',catalog:'canonical-work:master:monolithic_reinforced_concrete_wall_standard',prefix:'master212:family-b:krer06-01-031-04:r1',variant:false,surface:false,welder:true},
 {column:'06-01-107-02',catalog:'canonical-work:master:monolithic_reinforced_concrete_column_standard',prefix:'monolithic-family:krer06:r1:column-107-02',variant:true,surface:false,welder:true},
 {column:'06-01-109-03',catalog:'canonical-work:master:monolithic_reinforced_concrete_beam_standard',prefix:'monolithic-family:krer06:r1:beam-109-03',variant:true,surface:false,welder:true},
 {column:'06-01-111-01',catalog:'canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_standard',prefix:'monolithic-family:krer06:r1:stair-111-01',variant:true,surface:true,welder:true},
];
const cases=profiles.flatMap(p=>{
 const machines=[
  [p.variant?'tower-crane8t':'tower-crane','02-0005','OPERATOR'],
  [p.variant?'truck-crane10t':'truck-crane','02-0075','OPERATOR'],
  [p.variant?'forklift5t':'forklift','03-0020','OPERATOR'],
  [p.variant?'vibrator':p.surface?'surface-vibrator':'deep-vibrator',p.surface?'11-0183':'11-0180','NO_ADDITIONAL_OPERATOR_NORM'],
  ['chain-saw','33-0503','NO_ADDITIONAL_OPERATOR_NORM'],
  [p.variant?'flatbed8t':'flatbed-truck',p.variant?'40-0002':'40-0001','DRIVER'],
  ...(p.welder?[[p.variant?'arc-welder':'welder','04-0444','NO_ADDITIONAL_OPERATOR_NORM']]:[]),
 ];
 return machines.flatMap(([key,code,operator])=>(p.variant?['own','hired']:['']).map(mode=>({
  ...p,rowId:p.prefix+':'+key+(mode?'-'+mode:''),code,operator,
  columnKey:p.variant?'exact_column':'exactColumn',
 })));
});
const metadata=(c:typeof cases[number])=>({normativeResourceCode:c.code,machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',machinePriceOperationScope:'FULL_SOURCE_OPERATION',source_artifact_sha256:hash,[c.columnKey]:c.column});

it('pins six distinct scopes,61 paid owners and no operator or consumed aliases',()=>{
 expect(cases).toHaveLength(61);expect(new Set(cases.map(c=>c.rowId)).size).toBe(61);
 for(const p of profiles)for(const key of ['operators','machinists-info','tower-crane8t-consumed','physical-kit'])expect(requirement(p.prefix+':'+key,'machine_hour')).toBeNull();
});

it.each(cases)('rejects source, machine or catalog substitution for $rowId',c=>{
 const input={catalogId:c.catalog,rowId:c.rowId,unitId:'machine_hour',sourceMetadata:metadata(c)};
 expect(definition(input)).toEqual({resourceCode:c.code,operator:c.operator,operationScope:'FULL_SOURCE_OPERATION'});
 expect(definition({...input,catalogId:profiles.find(p=>p.catalog!==c.catalog)!.catalog})).toBeNull();
 expect(requirement(c.rowId,'man_hour')).toBeNull();
 for(const patch of [{source_artifact_sha256:'0'.repeat(64)},{[c.columnKey]:'06-01-001-16'},{normativeResourceCode:'99-9999'},{machinePriceOperationScope:'BARE_RENT'},{machinePriceCoverageRequired:'BARE_RENT'}])expect(()=>definition({...input,sourceMetadata:{...metadata(c),...patch}})).toThrow('Machine-hour definition identity is not admitted');
});

it.each(cases)('requires exact full-hour commercial evidence for $rowId',c=>{
 const evidence=manual({rowId:c.rowId,unitPrice:'77',currencyCode:'KGS'});
 const input={catalogId:c.catalog,rowId:c.rowId,unitId:'machine_hour',unitPrice:'77',currencyCode:'KGS',manual:true,manualProvenanceReason:'consumer_estimate_row_batch_edit',evidence};
 expect(resolve(input)?.status).toBe('CONFIRMED_MANUAL');
 for(const patch of [{evidence:null},{unitPrice:'78'},{currencyCode:'USD'},{manualProvenanceReason:'different quote'}])expect(resolve({...input,...patch})?.status).toBe('UNCONFIRMED');
 for(const patch of [{billingBasis:'SHIFT'},{minimumBillableHours:'8'},{fixedFees:'1'}])expect(parse({...evidence,...patch})).toBeNull();
 const source={kind:'SNAPSHOT',snapshotId:'00000000-0000-4000-8000-000000000034',priceKey:'whole-operation-hour'};
 const snapshot={...input,manual:false,evidence:{...evidence,source},snapshotId:source.snapshotId,priceKey:source.priceKey};
 expect(resolve(snapshot)?.status).toBe('CONFIRMED_SOURCE');
 expect(resolve({...snapshot,priceKey:'bare-machine-rent'})?.status).toBe('UNCONFIRMED');
});
