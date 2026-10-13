import {compareFormulaGraphDecimals} from './formulaGraph';
import standalone from '../../../../data/estimate-benchmarks/source-packs/roof-screed25-five-bindings-s27-69.json';

export type CanonicalMachineHourPriceCoverageV1 = {
  contractVersion:'canonical-machine-hour-price-coverage/v1';
  resourceCode:string;
  unitId:'machine_hour';
  currencyCode:string;
  unitPrice:string;
  billingBasis:'MACHINE_HOUR';
  operationScope:'FULL_SOURCE_OPERATION';
  minimumBillableHours:'0';
  fixedFees:'0';
  separateNormedInputs:'EXCLUDED_FROM_RATE';
  source:{kind:'MANUAL';rowId:string;priceProvenanceReason:string|null}|{kind:'SNAPSHOT';snapshotId:string;priceKey:string};
};
type Requirement={resourceCode:string;operator:'OPERATOR'|'DRIVER'|'NO_ADDITIONAL_OPERATOR_NORM'};
const owners:Record<string,Requirement>={};
const add=(prefix:string,roles:Record<string,string>)=>Object.entries(roles).forEach(([role,resourceCode])=>{
  owners[prefix+':'+role]={resourceCode,operator:resourceCode==='40-0001'?'DRIVER':['15-0060','10-0007','12-0340'].includes(resourceCode)?'NO_ADDITIONAL_OPERATOR_NORM':'OPERATOR'};
});
add('roof:torch-two:krer12-002-09',{tower_crane_8t:'02-0005',truck_crane_10t:'02-0075',gas_flame_burner:'15-0060',flatbed_truck_to_5t:'40-0001'});
add('roof:prime-ready-emulsion:krer12-016-02',{flatbed_truck:'40-0001'});
add('roof:valley-torch-two:krer12-005-03',{tower_crane_8t:'02-0005',truck_crane_10t:'02-0075',gas_flame_burner:'15-0060',flatbed_truck_to_5t:'40-0001'});
add('roof:cement-screed15:krer12-017-01',{tower_crane_8t:'02-0005',forklift_5t:'03-0020',mortar_pump:'10-0007'});
add('roof:cement-screed25:krer12-017-01-plus-10x02',{tower_crane_8t:'02-0005',forklift_5t:'03-0020',mortar_pump:'10-0007'});
add('roof:metal-trim:krer12-010-01',{tower_crane_8t:'02-0005',flatbed_truck_to_5t:'40-0001'});
add('roof:vapor:krer12-015-03',{tower_crane_8t:'02-0005',truck_crane_10t:'02-0075',bitumen_kettle_400l:'12-0340',flatbed_truck_to_5t:'40-0001'});
add('roof:clay-insulation:krer12-014-02',{tower_crane_8t:'02-0005',forklift_5t:'03-0020'});
add('roof:hanging-gutters:krer12-009-02',{tower_crane_8t:'02-0005',truck_crane_10t:'02-0075',flatbed_truck_to_5t:'40-0001'});
const aliases=new Set(['FULL_OPERATED_MACHINE_HOUR','FULL_OPERATED_VEHICLE_HOUR_DRIVER_INCLUDED_NOT_IN_INFO','FULL_OPERATED','FULL_DRIVER','FULL_MACHINE_SOURCE_COST','EQUIPMENT_OPERATION_NO_ADDITIONAL_OPERATOR_NORM_ADMITTED']);
const admittedCatalogs=new Set(['canonical-work:base:roofing_interior_flat_roof_install_technical_room','canonical-work:base:roofing_interior_flat_roof_install_wet_zone']);
const admittedOwner=(catalogId:string,rowId:string)=>admittedCatalogs.has(catalogId)
  ||standalone.targets.some(t=>t.catalogId===catalogId)&&rowId.startsWith('roof:cement-screed25:krer12-017-01-plus-10x02:');
const record=(value:unknown):Record<string,unknown>=>value!=null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const decimal=(value:unknown)=>typeof value==='string'&&/^\d+(?:\.\d+)?$/.test(value)&&value.length<=80;
export function canonicalMachineHourPriceRequirementV1(rowId:string,unitId:string):Requirement|null{
  return unitId==='machine_hour'?owners[rowId]??null:null;
}
export function assertCanonicalMachineHourDefinitionV1(input:{catalogId:string;rowId:string;unitId:string;sourceMetadata:Record<string,unknown>|null}){
  if(!admittedOwner(input.catalogId,input.rowId))return null;
  const requirement=canonicalMachineHourPriceRequirementV1(input.rowId,input.unitId);
  if(!requirement)return null;
  if(input.sourceMetadata?.normativeResourceCode!==requirement.resourceCode||!aliases.has(String(input.sourceMetadata?.machinePriceCoverageRequired??'')))
    throw Object.assign(Error('Machine-hour definition identity is not admitted'),{code:'DEFINITION_INTEGRITY_FAILED'});
  return requirement;
}
export function parseCanonicalMachineHourPriceCoverageV1(value:unknown):CanonicalMachineHourPriceCoverageV1|null{
  const v=record(value),s=record(v.source);
  const keys=['contractVersion','resourceCode','unitId','currencyCode','unitPrice','billingBasis','operationScope','minimumBillableHours','fixedFees','separateNormedInputs','source'];
  if(Object.keys(v).length!==keys.length||Object.keys(v).some(k=>!keys.includes(k))
    ||v.contractVersion!=='canonical-machine-hour-price-coverage/v1'||!/^\d{2}-\d{4}$/.test(String(v.resourceCode))
    ||v.unitId!=='machine_hour'||! /^[A-Z]{3}$/.test(String(v.currencyCode))||!decimal(v.unitPrice)
    ||v.billingBasis!=='MACHINE_HOUR'||v.operationScope!=='FULL_SOURCE_OPERATION'||v.minimumBillableHours!=='0'||v.fixedFees!=='0'
    ||v.separateNormedInputs!=='EXCLUDED_FROM_RATE')return null;
  if(s.kind==='MANUAL'){
    if(Object.keys(s).length!==3||typeof s.rowId!=='string'||!owners[s.rowId]
      ||!(s.priceProvenanceReason===null||typeof s.priceProvenanceReason==='string'&&s.priceProvenanceReason.length<=240))return null;
  }else if(s.kind==='SNAPSHOT'){
    if(Object.keys(s).length!==3||typeof s.snapshotId!=='string'||!/^[0-9a-f-]{36}$/i.test(s.snapshotId)
      ||typeof s.priceKey!=='string'||!s.priceKey.trim()||s.priceKey.length>240)return null;
  }else return null;
  return v as CanonicalMachineHourPriceCoverageV1;
}
export function resolveCanonicalMachineHourPriceCoverageV1(input:{catalogId:string;rowId:string;unitId:string;currencyCode:unknown;unitPrice:unknown;evidence:unknown;manual:boolean;manualProvenanceReason?:unknown;snapshotId?:string|null;priceKey?:string|null}){
  if(!admittedOwner(input.catalogId,input.rowId))return null;
  const requirement=canonicalMachineHourPriceRequirementV1(input.rowId,input.unitId);if(!requirement)return null;
  const evidence=parseCanonicalMachineHourPriceCoverageV1(input.evidence);
  const price=String(input.unitPrice??'');
  const matches=evidence!=null&&decimal(price)&&compareFormulaGraphDecimals(evidence.unitPrice,price)===0
    &&evidence.currencyCode===input.currencyCode&&evidence.resourceCode===requirement.resourceCode
    &&(input.manual?evidence.source.kind==='MANUAL'&&evidence.source.rowId===input.rowId&&evidence.source.priceProvenanceReason===(input.manualProvenanceReason??null)
      :evidence.source.kind==='SNAPSHOT'&&evidence.source.snapshotId===input.snapshotId&&evidence.source.priceKey===input.priceKey);
  return {contractVersion:'canonical-machine-hour-price-decision/v1' as const,...requirement,
    status:matches?(input.manual?'CONFIRMED_MANUAL' as const:'CONFIRMED_SOURCE' as const):'UNCONFIRMED' as const,
    evidence:matches?evidence:null};
}
/** Historical scalar prices remain readable, but never acquire evidence retroactively. */
export function canonicalMachineHourRowPriceDecisionV1(row:{row_id:unknown;unit_id?:unknown;unit_price?:unknown;currency_code?:unknown;price_snapshot_id?:unknown;price_source_kind?:unknown;calculation_trace?:unknown;price_resolution_trace?:unknown},catalogId:string){
  const trace=record(row.price_resolution_trace),saved=record(record(row.calculation_trace).machineHourPriceCoverageV1);
  const evidence=parseCanonicalMachineHourPriceCoverageV1(saved.evidence??trace.machineHourPriceCoverageV1);
  return resolveCanonicalMachineHourPriceCoverageV1({catalogId,rowId:String(row.row_id??''),unitId:String(row.unit_id??''),currencyCode:row.currency_code,unitPrice:row.unit_price,
    evidence,manual:trace.kind==='manual_override'||row.price_source_kind==='MANUAL',manualProvenanceReason:typeof record(trace.provenance).reason==='string'?String(record(trace.provenance).reason):null,
    snapshotId:typeof row.price_snapshot_id==='string'?row.price_snapshot_id:null,priceKey:typeof trace.priceKey==='string'?trace.priceKey:null});
}
export function canonicalMachineHourPriceNeedsConfirmationV1(row:Parameters<typeof canonicalMachineHourRowPriceDecisionV1>[0],catalogId:string){
  return row.unit_price!=null&&canonicalMachineHourRowPriceDecisionV1(row,catalogId)?.status==='UNCONFIRMED';
}
export function canonicalManualMachineHourPriceCoverageV1(input:{rowId:string;unitPrice:string;currencyCode:string}):CanonicalMachineHourPriceCoverageV1{
  const requirement=canonicalMachineHourPriceRequirementV1(input.rowId,'machine_hour');if(!requirement)throw Error('MACHINE_HOUR_OWNER_REQUIRED');
  return {contractVersion:'canonical-machine-hour-price-coverage/v1',resourceCode:requirement.resourceCode,unitId:'machine_hour',currencyCode:input.currencyCode,unitPrice:input.unitPrice,
    billingBasis:'MACHINE_HOUR',operationScope:'FULL_SOURCE_OPERATION',minimumBillableHours:'0',fixedFees:'0',separateNormedInputs:'EXCLUDED_FROM_RATE',source:{kind:'MANUAL',rowId:input.rowId,priceProvenanceReason:'consumer_estimate_row_batch_edit'}};
}
export const CANONICAL_MACHINE_HOUR_PRICE_CONFIRMATION_RU='Цена за машино-час включает полную эксплуатацию и обслуживание, оператора или водителя там, где они предусмотрены нормой. Нет минимальной смены, выезда и иных фиксированных доплат. Отдельно рассчитанные материалы и технологический газ повторно в цену не включены.';
