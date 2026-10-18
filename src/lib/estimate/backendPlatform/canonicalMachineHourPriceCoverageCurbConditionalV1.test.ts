import {
 assertCanonicalMachineHourDefinitionV1,canonicalMachineHourPriceRequirementV1,
 resolveCanonicalMachineHourPriceCoverageV1,canonicalMachineHourRowPriceDecisionV1,
 canonicalMachineHourPriceConfirmationRuV1,
} from './canonicalMachineHourPriceCoverageV1';
const catalog='canonical-work:master:granite_kerb_1gp_install_cement_concrete_pavement_standard';
const rows=[
 {rowId:'granite-kerb:1gp-cement-pavement:crane-own',resourceCode:'02-0075',operator:'OPERATOR'},
 {rowId:'granite-kerb:1gp-cement-pavement:crane-hired',resourceCode:'02-0075',operator:'OPERATOR'},
 {rowId:'granite-kerb:1gp-cement-pavement:truck-own',resourceCode:'40-0001',operator:'DRIVER'},
 {rowId:'granite-kerb:1gp-cement-pavement:truck-hired',resourceCode:'40-0001',operator:'DRIVER'},
];
type Owner=typeof rows[number];type Input=Parameters<typeof resolveCanonicalMachineHourPriceCoverageV1>[0];
const snapshotId='12345678-1234-1234-1234-123456789012',reason='consumer_estimate_row_batch_edit';
function evidence(r:Owner,manual=true):Record<string,unknown>{return {
 contractVersion:'canonical-machine-hour-price-coverage/v1',resourceCode:r.resourceCode,
 unitId:'machine_hour',currencyCode:'KGS',unitPrice:'77',billingBasis:'MACHINE_HOUR',
 operationScope:'FULL_SOURCE_OPERATION',minimumBillableHours:'0',fixedFees:'0',separateNormedInputs:'EXCLUDED_FROM_RATE',
 source:manual?{kind:'MANUAL',rowId:r.rowId,priceProvenanceReason:reason}:{kind:'SNAPSHOT',snapshotId,priceKey:r.rowId},
};}
function input(r:Owner,manual=true,e:unknown=evidence(r,manual)):Input{return {catalogId:catalog,rowId:r.rowId,unitId:'machine_hour',currencyCode:'KGS',unitPrice:'77',evidence:e,manual,manualProvenanceReason:reason,snapshotId,priceKey:r.rowId};}
const meta=(r:Owner):Record<string,unknown>=>({normativeResourceCode:r.resourceCode,machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',machinePriceOperationScope:'FULL_SOURCE_OPERATION'});
function definitionError(r:Owner,metadata:Record<string,unknown>){let error:unknown;try{assertCanonicalMachineHourDefinitionV1({catalogId:catalog,rowId:r.rowId,unitId:'machine_hour',sourceMetadata:metadata});}catch(e){error=e;}expect(error).toMatchObject({code:'DEFINITION_INTEGRITY_FAILED'});}
test.each(rows)('exact owner/code/operator/scope and manual/snapshot confirmation: $rowId',r=>{
 const expected={resourceCode:r.resourceCode,operator:r.operator,operationScope:'FULL_SOURCE_OPERATION'};
 expect(canonicalMachineHourPriceRequirementV1(r.rowId,'machine_hour')).toEqual(expected);
 expect(assertCanonicalMachineHourDefinitionV1({catalogId:catalog,rowId:r.rowId,unitId:'machine_hour',sourceMetadata:meta(r)})).toEqual(expected);
 expect(resolveCanonicalMachineHourPriceCoverageV1(input(r))).toMatchObject({...expected,status:'CONFIRMED_MANUAL'});
 expect(resolveCanonicalMachineHourPriceCoverageV1(input(r,false))).toMatchObject({...expected,status:'CONFIRMED_SOURCE'});
});
const foreign=[
 'canonical-work:base:roofing_interior_flat_roof_install_technical_room',
 'canonical-work:base:roofing_interior_flat_roof_install_wet_zone',
 'canonical-work:master:road_upper_crushed_stone_150mm_m1200_two_layer_krer27_04_005_02',
 'canonical-work:master:floor_sand_underlayer_krer11_01_002_01',
];
test.each(rows.flatMap(r=>foreign.map(c=>({r,c}))))('foreign catalog blocked at definition/manual/snapshot: $r.rowId / $c',({r,c})=>{
 expect(assertCanonicalMachineHourDefinitionV1({catalogId:c,rowId:r.rowId,unitId:'machine_hour',sourceMetadata:meta(r)})).toBeNull();
 expect(resolveCanonicalMachineHourPriceCoverageV1({...input(r),catalogId:c})).toBeNull();
 expect(resolveCanonicalMachineHourPriceCoverageV1({...input(r,false),catalogId:c})).toBeNull();
});
const badMetadata:[string,(r:Owner)=>Record<string,unknown>][]=[
 ['wrong resource',r=>({...meta(r),normativeResourceCode:'02-0005'})],
 ['missing coverage',r=>({normativeResourceCode:r.resourceCode,machinePriceOperationScope:'FULL_SOURCE_OPERATION'})],
 ['missing explicit scope',r=>({normativeResourceCode:r.resourceCode,machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST'})],
 ['wrong operation scope',r=>({...meta(r),machinePriceOperationScope:'MACHINE_ONLY_WORKER_AND_COMPRESSED_AIR_SEPARATE'})],
];
test.each(rows.flatMap(r=>badMetadata.map(([label,make])=>({r,label,make}))))('strict definition metadata: $r.rowId / $label',({r,make})=>definitionError(r,make(r)));
const otherRow=(r:Owner)=>r.rowId.endsWith('-own')?r.rowId.slice(0,-4)+'-hired':r.rowId.slice(0,-6)+'-own';
const badPrices:[string,(r:Owner)=>Input][]=[
 ['scalar without evidence',r=>input(r,true,null)],
 ['wrong resource',r=>input(r,true,{...evidence(r),resourceCode:'02-0005'})],
 ['wrong currency',r=>({...input(r),currencyCode:'USD'})],
 ['wrong scalar price',r=>({...input(r),unitPrice:'78'})],
 ['wrong operation scope',r=>input(r,true,{...evidence(r),operationScope:'MACHINE_ONLY_WORKER_AND_COMPRESSED_AIR_SEPARATE'})],
 ['minimum shift',r=>input(r,true,{...evidence(r),minimumBillableHours:'8'})],
 ['fixed callout fee',r=>input(r,true,{...evidence(r),fixedFees:'1'})],
 ['separate inputs included',r=>input(r,true,{...evidence(r),separateNormedInputs:'INCLUDED_IN_RATE'})],
 ['shift billing',r=>input(r,true,{...evidence(r),billingBasis:'SHIFT'})],
 ['other own/hired row',r=>input(r,true,{...evidence(r),source:{kind:'MANUAL',rowId:otherRow(r),priceProvenanceReason:reason}})],
 ['different manual reason',r=>({...input(r),manualProvenanceReason:'other'})],
 ['different snapshot',r=>({...input(r,false),snapshotId:'87654321-4321-4321-4321-210987654321'})],
 ['different price key',r=>({...input(r,false),priceKey:'foreign-price-key'})],
];
test.each(rows.flatMap(r=>badPrices.map(([label,make])=>({r,label,make}))))('price evidence remains unconfirmed: $r.rowId / $label',({r,make})=>expect(resolveCanonicalMachineHourPriceCoverageV1(make(r))).toMatchObject({status:'UNCONFIRMED',evidence:null}));
test.each(rows)('wrong unit and near-match row receive no admission: $rowId',r=>{
 expect(canonicalMachineHourPriceRequirementV1(r.rowId,'hour')).toBeNull();
 expect(resolveCanonicalMachineHourPriceCoverageV1({...input(r),unitId:'hour'})).toBeNull();
 expect(resolveCanonicalMachineHourPriceCoverageV1({...input(r),rowId:r.rowId+':near-match'})).toBeNull();
});
const legacy=[
 {catalogId:foreign[0],rowId:'roof:torch-two:krer12-002-09:truck_crane_10t',resourceCode:'02-0075',operator:'OPERATOR'},
 {catalogId:foreign[2],rowId:'road-upper-base:krer27-04-005-02:equipment:waterBowser',resourceCode:'12-0400',operator:'DRIVER'},
 {catalogId:foreign[3],rowId:'floor-underlayer:sand:krer11-01-002-01:equipment:forklift5t',resourceCode:'03-0020',operator:'OPERATOR'},
 {catalogId:foreign[3],rowId:'floor-underlayer:sand:krer11-01-002-01:equipment:compressor',resourceCode:'05-0005',operator:'OPERATOR'},
 {catalogId:foreign[3],rowId:'floor-underlayer:sand:krer11-01-002-01:equipment:pneumaticRammer',resourceCode:'33-0741',operator:'NO_ADDITIONAL_OPERATOR_NORM'},
];
test.each(legacy)('existing roof/road/floor semantics preserved: $rowId',r=>{
 const rammer=r.resourceCode==='33-0741',scope=rammer?'MACHINE_ONLY_WORKER_AND_COMPRESSED_AIR_SEPARATE':'FULL_SOURCE_OPERATION';
 const metadata={normativeResourceCode:r.resourceCode,machinePriceCoverageRequired:rammer?'EQUIPMENT_OPERATION_NO_ADDITIONAL_OPERATOR_NORM_ADMITTED':'FULL_OPERATED_MACHINE_HOUR',...(rammer?{machinePriceOperationScope:scope}:{})};
 expect(assertCanonicalMachineHourDefinitionV1({catalogId:r.catalogId,rowId:r.rowId,unitId:'machine_hour',sourceMetadata:metadata})).toMatchObject({resourceCode:r.resourceCode,operator:r.operator});
 expect(resolveCanonicalMachineHourPriceCoverageV1({...input(r),catalogId:r.catalogId,evidence:{...evidence(r),operationScope:scope}})).toMatchObject({status:'CONFIRMED_MANUAL',operator:r.operator});
 expect(resolveCanonicalMachineHourPriceCoverageV1({...input(r),catalogId:catalog})).toBeNull();
 if(rammer)expect(canonicalMachineHourPriceConfirmationRuV1(r.rowId)).toContain('Рабочий и работа компрессора со сжатым воздухом учитываются отдельно');
});
test.each(rows)('historical scalar remains unconfirmed through saved-row projection: $rowId',r=>{
 const row={row_id:r.rowId,unit_id:'machine_hour',unit_price:'77',currency_code:'KGS',price_source_kind:'MANUAL',price_resolution_trace:{kind:'manual_override',provenance:{reason}},calculation_trace:{}};
 expect(canonicalMachineHourRowPriceDecisionV1(row,catalog)).toMatchObject({status:'UNCONFIRMED',evidence:null});
 expect(row.unit_price).toBe('77');
});
