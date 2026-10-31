import {compareFormulaGraphDecimals} from './formulaGraph';
import standalone from '../../../../data/estimate-benchmarks/source-packs/roof-screed25-five-bindings-s27-69.json';

export type CanonicalMachineHourPriceCoverageV1 = {
  contractVersion:'canonical-machine-hour-price-coverage/v1';
  resourceCode:string;
  unitId:'machine_hour';
  currencyCode:string;
  unitPrice:string;
  billingBasis:'MACHINE_HOUR';
  operationScope:'FULL_SOURCE_OPERATION'|'MACHINE_ONLY_WORKER_AND_COMPRESSED_AIR_SEPARATE';
  minimumBillableHours:'0';
  fixedFees:'0';
  separateNormedInputs:'EXCLUDED_FROM_RATE';
  source:{kind:'MANUAL';rowId:string;priceProvenanceReason:string|null}|{kind:'SNAPSHOT';snapshotId:string;priceKey:string};
};
type Requirement={resourceCode:string;operator:'OPERATOR'|'DRIVER'|'NO_ADDITIONAL_OPERATOR_NORM';operationScope?:CanonicalMachineHourPriceCoverageV1['operationScope']};
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
// Exact source-backed road upper-layer owners; the existing v1 price contract is unchanged.
const roadUpperCatalog='canonical-work:master:road_upper_crushed_stone_150mm_m1200_two_layer_krer27_04_005_02';
const roadUpperOwners:Record<string,Requirement>={
  'road-upper-base:krer27-04-005-02:equipment:loader':{resourceCode:'03-0020',operator:'OPERATOR'},
  'road-upper-base:krer27-04-005-02:equipment:grader':{resourceCode:'12-0023',operator:'OPERATOR'},
  'road-upper-base:krer27-04-005-02:equipment:roller8t':{resourceCode:'12-0272',operator:'OPERATOR'},
  'road-upper-base:krer27-04-005-02:equipment:roller13t':{resourceCode:'12-0273',operator:'OPERATOR'},
  'road-upper-base:krer27-04-005-02:equipment:waterBowser':{resourceCode:'12-0400',operator:'DRIVER'},
  'road-upper-base:krer27-04-005-02:equipment:spreader':{resourceCode:'12-0540',operator:'OPERATOR'},
};
Object.assign(owners,roadUpperOwners);
const floorSandCatalog='canonical-work:master:floor_sand_underlayer_krer11_01_002_01';
const floorRammerRow='floor-underlayer:sand:krer11-01-002-01:equipment:pneumaticRammer';
const floorRammerScope='MACHINE_ONLY_WORKER_AND_COMPRESSED_AIR_SEPARATE' as const;
const floorSandOwners:Record<string,Requirement>={
 'floor-underlayer:sand:krer11-01-002-01:equipment:forklift5t':{resourceCode:'03-0020',operator:'OPERATOR'},
 'floor-underlayer:sand:krer11-01-002-01:equipment:compressor':{resourceCode:'05-0005',operator:'OPERATOR'},
 [floorRammerRow]:{resourceCode:'33-0741',operator:'NO_ADDITIONAL_OPERATOR_NORM',operationScope:floorRammerScope},
};
Object.assign(owners,floorSandOwners);
// Exact root-classified 1GP identity; adopted only by the root integration wave.
const graniteKerb1gpCatalog='canonical-work:master:granite_kerb_1gp_install_cement_concrete_pavement_standard';
const graniteKerb1gpOwners:Record<string,Requirement>={
 'granite-kerb:1gp-cement-pavement:crane-own':{resourceCode:'02-0075',operator:'OPERATOR',operationScope:'FULL_SOURCE_OPERATION'},
 'granite-kerb:1gp-cement-pavement:crane-hired':{resourceCode:'02-0075',operator:'OPERATOR',operationScope:'FULL_SOURCE_OPERATION'},
 'granite-kerb:1gp-cement-pavement:truck-own':{resourceCode:'40-0001',operator:'DRIVER',operationScope:'FULL_SOURCE_OPERATION'},
 'granite-kerb:1gp-cement-pavement:truck-hired':{resourceCode:'40-0001',operator:'DRIVER',operationScope:'FULL_SOURCE_OPERATION'},
};
Object.assign(owners,graniteKerb1gpOwners);
// Exact unreinforced half-brick partition; physical crane ownership is source-specific.
const brickPartitionHalfCatalog='canonical-work:master:brick_partition_half_unreinforced_upto4m_krer08_02_002_05';
const brickPartitionHalfOwners:Record<string,Requirement>={
 'masonry:brick-partition:krer08-02-002-05:crane-own':{resourceCode:'02-0005',operator:'OPERATOR',operationScope:'FULL_SOURCE_OPERATION'},
 'masonry:brick-partition:krer08-02-002-05:crane-hired':{resourceCode:'02-0005',operator:'OPERATOR',operationScope:'FULL_SOURCE_OPERATION'},
};
Object.assign(owners,brickPartitionHalfOwners);
// Exact ceramic floor on ready M150 mortar; three exclusive own/hired machines.
const ceramicCementFloorCatalog='canonical-work:master:ceramic_floor_unglazed_single_colour_cement_m150_krer11_01_027_03';
const ceramicCementFloorOwners:Record<string,Requirement>={
 'ceramic-floor:cement-mortar:krer11-01-027-03:forklift5t-own':{resourceCode:'03-0020',operator:'OPERATOR',operationScope:'FULL_SOURCE_OPERATION'},
 'ceramic-floor:cement-mortar:krer11-01-027-03:forklift5t-hired':{resourceCode:'03-0020',operator:'OPERATOR',operationScope:'FULL_SOURCE_OPERATION'},
 'ceramic-floor:cement-mortar:krer11-01-027-03:hoist500kg45m-own':{resourceCode:'03-0327',operator:'OPERATOR',operationScope:'FULL_SOURCE_OPERATION'},
 'ceramic-floor:cement-mortar:krer11-01-027-03:hoist500kg45m-hired':{resourceCode:'03-0327',operator:'OPERATOR',operationScope:'FULL_SOURCE_OPERATION'},
 'ceramic-floor:cement-mortar:krer11-01-027-03:truck5t-own':{resourceCode:'40-0001',operator:'DRIVER',operationScope:'FULL_SOURCE_OPERATION'},
 'ceramic-floor:cement-mortar:krer11-01-027-03:truck5t-hired':{resourceCode:'40-0001',operator:'DRIVER',operationScope:'FULL_SOURCE_OPERATION'},
};
Object.assign(owners,ceramicCementFloorOwners);
// MASTER2.12 construction consumers: exact source columns and existing IDs.
// A source machine-hour owns its complete operation rate; the separately
// printed machinist time stays informational. No physical rigging or machine
// count is inferred from these rates.
type ConstructionMachineAdmission={requirement:Requirement;catalogIds:readonly string[];
 sourceSha256:string;column:string;columnMetadataKey:'exact_column'|'exactColumn'|'machinePriceExactSourceColumnsR24'};
const constructionMachineAdmissions:Record<string,ConstructionMachineAdmission>={};
const masonryBrickCatalogs=[
 'canonical-work:base:masonry_interior_brick_wall_lay_standard',
 'canonical-work:base:masonry_interior_brick_wall_lay_technical_room',
] as const;
const masonryAacCatalogs=[
 'canonical-work:base:masonry_interior_gas_block_lay_standard',
 'canonical-work:base:masonry_interior_gas_block_lay_technical_room',
] as const;
const masonrySourceSha256='cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436';
const admitConstructionMachine=(rowId:string,catalogIds:readonly string[],resourceCode:string,
 operator:Requirement['operator'],sourceSha256:string,column:string,columnMetadataKey:ConstructionMachineAdmission['columnMetadataKey'])=>{
 if(owners[rowId]||constructionMachineAdmissions[rowId])throw Error('DUPLICATE_CONSTRUCTION_MACHINE_OWNER');
 const requirement:Requirement={resourceCode,operator,operationScope:'FULL_SOURCE_OPERATION'};
 constructionMachineAdmissions[rowId]={requirement,catalogIds,sourceSha256,column,columnMetadataKey};
 owners[rowId]=requirement;
};
for(const column of ['08-02-001-07','08-02-001-08'])for(const mode of ['own','hired'])admitConstructionMachine(
 'masonry:wall:krer'+column+':tower-crane-'+mode,masonryBrickCatalogs,'02-0005','OPERATOR',masonrySourceSha256,column,'exact_column');
for(const column of ['08-03-004-01','08-03-004-02','08-03-004-03','08-03-004-04']){
 for(const [key,code,operator] of [
  ['tower-crane','02-0004','OPERATOR'],['truck-crane','02-0075','OPERATOR'],
  ['perforator','33-0462','NO_ADDITIONAL_OPERATOR_NORM'],['flatbed-truck','40-0001','DRIVER'],
 ] as const)for(const mode of ['own','hired'])admitConstructionMachine('masonry:wall:krer'+column+':'+key+'-'+mode,masonryAacCatalogs,
  code,operator,masonrySourceSha256,column,'exact_column');
}
// R220 exact KG46 hole-filling machine costs only; no additional operator quantity or physical supply is admitted.
admitConstructionMachine("krer46-hole-r61:01:winch",["canonical-work:master:concrete_hole_filling_krer46_017"],"03-0158","NO_ADDITIONAL_OPERATOR_NORM","21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471","46-03-017-01",'exact_column');
admitConstructionMachine("krer46-hole-r61:01:truck",["canonical-work:master:concrete_hole_filling_krer46_017"],"40-0001","DRIVER","21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471","46-03-017-01",'exact_column');
admitConstructionMachine("krer46-hole-r61:02:winch",["canonical-work:master:concrete_hole_filling_krer46_017"],"03-0158","NO_ADDITIONAL_OPERATOR_NORM","21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471","46-03-017-02",'exact_column');
admitConstructionMachine("krer46-hole-r61:02:truck",["canonical-work:master:concrete_hole_filling_krer46_017"],"40-0001","DRIVER","21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471","46-03-017-02",'exact_column');
admitConstructionMachine("krer46-hole-r61:03:winch",["canonical-work:master:concrete_hole_filling_krer46_017"],"03-0158","NO_ADDITIONAL_OPERATOR_NORM","21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471","46-03-017-03",'exact_column');
admitConstructionMachine("krer46-hole-r61:03:truck",["canonical-work:master:concrete_hole_filling_krer46_017"],"40-0001","DRIVER","21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471","46-03-017-03",'exact_column');
admitConstructionMachine("krer46-hole-r61:04:winch",["canonical-work:master:concrete_hole_filling_krer46_017"],"03-0158","NO_ADDITIONAL_OPERATOR_NORM","21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471","46-03-017-04",'exact_column');
admitConstructionMachine("krer46-hole-r61:04:truck",["canonical-work:master:concrete_hole_filling_krer46_017"],"40-0001","DRIVER","21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471","46-03-017-04",'exact_column');
admitConstructionMachine("krer46-hole-r61:05:winch",["canonical-work:master:concrete_hole_filling_krer46_017"],"03-0158","NO_ADDITIONAL_OPERATOR_NORM","21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471","46-03-017-05",'exact_column');
admitConstructionMachine("krer46-hole-r61:05:truck",["canonical-work:master:concrete_hole_filling_krer46_017"],"40-0001","DRIVER","21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471","46-03-017-05",'exact_column');
admitConstructionMachine("krer46-hole-r61:06:winch",["canonical-work:master:concrete_hole_filling_krer46_017"],"03-0158","NO_ADDITIONAL_OPERATOR_NORM","21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471","46-03-017-06",'exact_column');
admitConstructionMachine("krer46-hole-r61:06:truck",["canonical-work:master:concrete_hole_filling_krer46_017"],"40-0001","DRIVER","21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471","46-03-017-06",'exact_column');
// Exact existing brick-column source-native cost successor. No physical provision/purchase admission.
admitConstructionMachine("masonry:brick-rectangular-column:krer08-02-003-03:tower-crane8t-reference",["canonical-work:base:masonry_interior_column_lay_standard"],"02-0005","OPERATOR","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-003-03",'exact_column');
admitConstructionMachine("masonry:brick-rectangular-column:krer08-02-003-04:tower-crane8t-reference",["canonical-work:base:masonry_interior_column_lay_standard"],"02-0005","OPERATOR","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-003-04",'exact_column');
admitConstructionMachine("masonry:brick-column:krer08-02-003-01:tower-crane8t-reference",["canonical-work:base:masonry_interior_column_lay_standard"],"02-0005","OPERATOR","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-003-01",'exact_column');
admitConstructionMachine("masonry:brick-column:krer08-02-003-01:flatbed-truck5t-reference",["canonical-work:base:masonry_interior_column_lay_standard"],"40-0001","DRIVER","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-003-01",'exact_column');
admitConstructionMachine("masonry:brick-column:krer08-02-003-02:tower-crane8t-reference",["canonical-work:base:masonry_interior_column_lay_standard"],"02-0005","OPERATOR","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-003-02",'exact_column');
admitConstructionMachine("masonry:brick-column:krer08-02-003-02:flatbed-truck5t-reference",["canonical-work:base:masonry_interior_column_lay_standard"],"40-0001","DRIVER","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-003-02",'exact_column');
admitConstructionMachine("masonry:brick-column:krer08-02-003-05:tower-crane8t-reference",["canonical-work:base:masonry_interior_column_lay_standard"],"02-0005","OPERATOR","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-003-05",'exact_column');
admitConstructionMachine("masonry:brick-column:krer08-02-003-05:flatbed-truck5t-reference",["canonical-work:base:masonry_interior_column_lay_standard"],"40-0001","DRIVER","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-003-05",'exact_column');
admitConstructionMachine("masonry:brick-column:krer08-02-003-06:tower-crane8t-reference",["canonical-work:base:masonry_interior_column_lay_standard"],"02-0005","OPERATOR","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-003-06",'exact_column');
admitConstructionMachine("masonry:brick-column:krer08-02-003-06:flatbed-truck5t-reference",["canonical-work:base:masonry_interior_column_lay_standard"],"40-0001","DRIVER","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-003-06",'exact_column');
const concretePreparationCatalogs=[
 'canonical-work:base:concrete_foundation_interior_strip_foundation_pour_standard',
 'canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard',
] as const;
for(const [key,code,operator] of [
 ['tower-crane','02-0005','OPERATOR'],['deep-vibrator','11-0180','NO_ADDITIONAL_OPERATOR_NORM'],
 ['flatbed-truck','40-0001','DRIVER'],
] as const)admitConstructionMachine('master212:concrete-preparation:krer06-01-001-01:r1:'+key,
 concretePreparationCatalogs,code,operator,'45c065fb0e35586948fdb06cd21fe331358e2c454c25a4dc83d4a686bf9f3e4b',
 '06-01-001-01','exactColumn');
// Exact complete strip-foundation column22. The printed machinist aggregate
// remains informational; its hours never create a second paid operator owner.
// Neither slab16 nor another catalog may reuse these price-scope admissions.
for(const [key,code,operator] of [
 ['tower-crane','02-0005','OPERATOR'],['truck-crane','02-0075','OPERATOR'],
 ['forklift','03-0020','OPERATOR'],['welder','04-0444','NO_ADDITIONAL_OPERATOR_NORM'],
 ['deep-vibrator','11-0180','NO_ADDITIONAL_OPERATOR_NORM'],
 ['chain-saw','33-0503','NO_ADDITIONAL_OPERATOR_NORM'],['flatbed-truck','40-0001','DRIVER'],
] as const)admitConstructionMachine('master212:concrete-completion:krer06-01-001-22:r1:'+key,
 ['canonical-work:base:concrete_foundation_interior_strip_foundation_pour_standard'],code,operator,
 '45c065fb0e35586948fdb06cd21fe331358e2c454c25a4dc83d4a686bf9f3e4b',
 '06-01-001-22','exactColumn');
// Whole monolithic family: six exact source columns and their paid owners.
// Consumed informational rows, physical kits and aggregate operator time are
// not admitted here. Each source/catalog keeps its own machine and hour scope.
for(const [column,catalog,vibratorKey,vibratorCode,withWelder] of [
 ['06-01-001-15','canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard','deep-vibrator','11-0180',false],
 ['06-01-041-03','canonical-work:base:concrete_foundation_interior_concrete_slab_pour_standard','surface-vibrator','11-0183',false],
 ['06-01-031-04','canonical-work:master:monolithic_reinforced_concrete_wall_standard','deep-vibrator','11-0180',true],
] as const){
 const prefix='master212:family-b:krer'+column+':r1:';
 for(const [key,code,operator] of [
  ['tower-crane','02-0005','OPERATOR'],['truck-crane','02-0075','OPERATOR'],
  ['forklift','03-0020','OPERATOR'],[vibratorKey,vibratorCode,'NO_ADDITIONAL_OPERATOR_NORM'],
  ['chain-saw','33-0503','NO_ADDITIONAL_OPERATOR_NORM'],['flatbed-truck','40-0001','DRIVER'],
 ] as const)admitConstructionMachine(prefix+key,[catalog],code,operator,
  '45c065fb0e35586948fdb06cd21fe331358e2c454c25a4dc83d4a686bf9f3e4b',column,'exactColumn');
 if(withWelder)admitConstructionMachine(prefix+'welder',[catalog],'04-0444','NO_ADDITIONAL_OPERATOR_NORM',
  '45c065fb0e35586948fdb06cd21fe331358e2c454c25a4dc83d4a686bf9f3e4b',column,'exactColumn');
}
for(const [profileKey,column,catalog,vibratorCode] of [
 ['column-107-02','06-01-107-02','canonical-work:master:monolithic_reinforced_concrete_column_standard','11-0180'],
 ['beam-109-03','06-01-109-03','canonical-work:master:monolithic_reinforced_concrete_beam_standard','11-0180'],
 ['stair-111-01','06-01-111-01','canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_standard','11-0183'],
] as const)for(const [key,code,operator] of [
 ['tower-crane8t','02-0005','OPERATOR'],['truck-crane10t','02-0075','OPERATOR'],
 ['forklift5t','03-0020','OPERATOR'],['arc-welder','04-0444','NO_ADDITIONAL_OPERATOR_NORM'],
 ['vibrator',vibratorCode,'NO_ADDITIONAL_OPERATOR_NORM'],['chain-saw','33-0503','NO_ADDITIONAL_OPERATOR_NORM'],
 ['flatbed8t','40-0002','DRIVER'],
] as const)for(const mode of ['own','hired'])admitConstructionMachine(
 'monolithic-family:krer06:r1:'+profileKey+':'+key+'-'+mode,[catalog],code,operator,
 '45c065fb0e35586948fdb06cd21fe331358e2c454c25a4dc83d4a686bf9f3e4b',column,'exact_column');
// Four roof technologies: exact source/catalog paid machine-hour owners only.
// Installed equipment, source operator aggregates and held033-02/03 are not additional paid owners.
admitConstructionMachine("master212:roof:r1:mastic_field:airless",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"39-0541","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-033-01","exactColumn");
admitConstructionMachine("master212:roof:r1:mastic_field:compressor",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"05-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-033-01","exactColumn");
admitConstructionMachine("master212:roof:r1:mastic_field:forklift",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-033-01","exactColumn");
admitConstructionMachine("master212:roof:r1:mastic_field:lift",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0330","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-033-01","exactColumn");
admitConstructionMachine("master212:roof:r1:metal_cut:grinder",["canonical-work:base:roofing_interior_metal_roof_install_standard"],"33-0367","NO_ADDITIONAL_OPERATOR_NORM","32c46cf8625c84489677e0d2ca38001097ed7cde12c8ca832302f60f30a8f574","09-05-006-01","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:clay:roof:clay-insulation:krer12-014-02:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-014-02","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:clay:roof:clay-insulation:krer12-014-02:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-014-02","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:gutter:roof:hanging-gutters:krer12-009-02:flatbed_truck_to_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room", "canonical-work:base:roofing_interior_metal_roof_install_standard", "canonical-work:base:roofing_interior_pitched_roof_install_standard"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-009-02","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:gutter:roof:hanging-gutters:krer12-009-02:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room", "canonical-work:base:roofing_interior_metal_roof_install_standard", "canonical-work:base:roofing_interior_pitched_roof_install_standard"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-009-02","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:gutter:roof:hanging-gutters:krer12-009-02:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room", "canonical-work:base:roofing_interior_metal_roof_install_standard", "canonical-work:base:roofing_interior_pitched_roof_install_standard"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-009-02","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:metal_field:roof:metal-tile:krer12-023-01:electric_drill",["canonical-work:base:roofing_interior_metal_roof_install_standard"],"33-0241","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-023-01","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:metal_field:roof:metal-tile:krer12-023-01:flatbed_truck",["canonical-work:base:roofing_interior_metal_roof_install_standard"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-023-01","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:metal_field:roof:metal-tile:krer12-023-01:tower_crane",["canonical-work:base:roofing_interior_metal_roof_install_standard"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-023-01","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:metal_field:roof:metal-tile:krer12-023-01:truck_crane",["canonical-work:base:roofing_interior_metal_roof_install_standard"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-023-01","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:screed:roof:cement-screed15:krer12-017-01:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-017-01","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:screed:roof:cement-screed15:krer12-017-01:mortar_pump",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"10-0007","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-017-01","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:screed:roof:cement-screed15:krer12-017-01:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-017-01","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:tile_field:roof:clay-tile:krer12-007-05:flatbed_truck",["canonical-work:base:roofing_interior_pitched_roof_install_standard"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-007-05","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:tile_field:roof:clay-tile:krer12-007-05:tower_crane",["canonical-work:base:roofing_interior_pitched_roof_install_standard"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-007-05","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:tile_field:roof:clay-tile:krer12-007-05:truck_crane",["canonical-work:base:roofing_interior_pitched_roof_install_standard"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-007-05","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:torch_field:roof:torch-two:krer12-002-09:flatbed_truck_to_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-09","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:torch_field:roof:torch-two:krer12-002-09:gas_flame_burner",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"15-0060","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-09","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:torch_field:roof:torch-two:krer12-002-09:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-09","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:torch_field:roof:torch-two:krer12-002-09:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-09","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:torch_primer:roof:prime-ready-emulsion:krer12-016-02:flatbed_truck",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-016-02","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:trim:roof:metal-trim:krer12-010-01:flatbed_truck_to_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-010-01","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:trim:roof:metal-trim:krer12-010-01:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-010-01","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:vapor:roof:vapor:krer12-015-03:bitumen_kettle_400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-03","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:vapor:roof:vapor:krer12-015-03:flatbed_truck_to_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-03","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:vapor:roof:vapor:krer12-015-03:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-03","exactColumn");
admitConstructionMachine("master212:roof:r1:reuse:vapor:roof:vapor:krer12-015-03:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-03","exactColumn");
// Three additional exact monolithic source profiles; physical stock is separate.
for(const [profileKey,column,catalog,surface] of [
 ['column-107-01','06-01-107-01','canonical-work:master:monolithic_reinforced_concrete_column_standard',false],
 ['beam-109-02','06-01-109-02','canonical-work:master:monolithic_reinforced_concrete_beam_standard',false],
 ['stair-111-02','06-01-111-02','canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_standard',true],
] as const)for(const [key,code,operator] of [
 ['tower-crane8t','02-0005','OPERATOR'],['truck-crane10t','02-0075','OPERATOR'],
 ['forklift5t','03-0020','OPERATOR'],['arc-welder','04-0444','NO_ADDITIONAL_OPERATOR_NORM'],
 ['vibrator',surface?'11-0183':'11-0180','NO_ADDITIONAL_OPERATOR_NORM'],
 ['chain-saw','33-0503','NO_ADDITIONAL_OPERATOR_NORM'],['flatbed8t','40-0002','DRIVER'],
] as const)for(const mode of ['own','hired'])admitConstructionMachine(
 'monolithic-remaining:krer06:r1:'+profileKey+':'+key+'-'+mode,[catalog],code,operator,
 '45c065fb0e35586948fdb06cd21fe331358e2c454c25a4dc83d4a686bf9f3e4b',column,'exact_column');

// One distinct complete RU2020 beam column. These identities do not replace
// the blocked KG10901 glyph or inherit the KG10t crane's price scope.
const internationalBeamMachineCodes=[
 ['tower-crane8t','91.05.01-017','OPERATOR'],['truck-crane16t','91.05.05-015','OPERATOR'],
 ['forklift5t','91.06.05-011','OPERATOR'],['vibrator','91.07.04-001','NO_ADDITIONAL_OPERATOR_NORM'],
 ['flatbed8t','91.14.02-002','DRIVER'],['arc-welder','91.17.04-233','NO_ADDITIONAL_OPERATOR_NORM'],
] as const;
const admittedInternationalBeamCodes=new Set<string>(internationalBeamMachineCodes.map(([,code])=>code));
for(const [key,code,operator] of internationalBeamMachineCodes)for(const mode of ['own','hired'])admitConstructionMachine(
 'monolithic-beam:gesn2020:06-19-003-01:r5:'+key+'-'+mode,
 ['canonical-work:master:monolithic_reinforced_concrete_beam_standard'],code,operator,
 '6bf1fbac1c69cf519d1bc9c8a0c3402628848d8cdf54341e1cf24f651ef637be','06-19-003-01','exact_column');

// Exact whole RU2020 stair-landing column, existing stairs catalog only.
// Physical kits and informational operator hours acquire no price owner here.
const internationalLandingMachineCodesR53=[
 ['tower-crane-10t','91.05.01-018','OPERATOR'],
 ['loader-5t','91.06.05-011','OPERATOR'],
 ['deep-vibrator','91.07.04-001','NO_ADDITIONAL_OPERATOR_NORM'],
 ['gas-welding-cutting','91.17.04-042','NO_ADDITIONAL_OPERATOR_NORM'],
] as const;
const admittedInternationalLandingCodesR53=new Set<string>(internationalLandingMachineCodesR53.map(([,code])=>code));
for(const [key,code,operator] of internationalLandingMachineCodesR53)for(const mode of ['own','hired'])admitConstructionMachine(
 'monolithic-stair-landing:gesn2020:06-20-001-01:r53:'+key+'-'+mode,
 ['canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_standard'],code,operator,
 '6bf1fbac1c69cf519d1bc9c8a0c3402628848d8cdf54341e1cf24f651ef637be','06-20-001-01','exact_column');

// Two complete exact RU2020 stair-flight columns, same existing stairs card.
// No physical stock, operator aggregate or foreign machine is admitted here.
const internationalFlightMachineCodesR54=[
 ['tower-crane8t','91.05.01-017','OPERATOR'],['truck-crane16t','91.05.05-015','OPERATOR'],
 ['forklift5t','91.06.05-011','OPERATOR'],['surface-vibrator','91.07.04-002','NO_ADDITIONAL_OPERATOR_NORM'],
 ['flatbed8t','91.14.02-002','DRIVER'],['arc-welder','91.17.04-233','NO_ADDITIONAL_OPERATOR_NORM'],
] as const;
const admittedInternationalFlightCodesR54=new Set<string>(internationalFlightMachineCodesR54.map(([,code])=>code));
for(const column of ['06-19-005-01','06-19-005-02'])for(const [key,code,operator] of internationalFlightMachineCodesR54)
for(const mode of ['own','hired'])admitConstructionMachine(
 'monolithic-stair-flight:gesn2020:'+column+':r54:'+key+'-'+mode,
 ['canonical-work:base:concrete_foundation_interior_stairs_concrete_pour_standard'],code,operator,
 '6bf1fbac1c69cf519d1bc9c8a0c3402628848d8cdf54341e1cf24f651ef637be',column,'exact_column');


// SOURCE_ONLY exact whole539 113=95new+18accepted003006 native machine scopes.
// This does not admit norm/PPR/stock/product/supply or add operator hours.
admitConstructionMachine("roof:protected-flat:missing002:r24:01:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:protected-flat:missing002:r24:01:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:protected-flat:missing002:r24:01:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:protected-flat:missing002:r24:01:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:protected-flat:missing002:r24:01:flatbed_to5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:protected-flat:missing002:r24:02:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:protected-flat:missing002:r24:02:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:protected-flat:missing002:r24:02:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:protected-flat:missing002:r24:02:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:protected-flat:missing002:r24:02:flatbed_to5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:protected-flat:missing002:r24:03:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-03",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:protected-flat:missing002:r24:03:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-03",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:protected-flat:missing002:r24:03:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-03",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:protected-flat:missing002:r24:03:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-03",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:protected-flat:missing002:r24:03:flatbed_to5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-03",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:04:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:04:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:04:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:04:flatbed_to5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:05:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-05",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:05:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-05",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:05:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-05",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:05:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-05",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:05:flatbed_to5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-05",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:06:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-06",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:06:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-06",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:06:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-06",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:06:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-06",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:06:flatbed_to5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-06",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:07:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-07",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:07:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-07",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:07:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-07",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:07:flatbed_to5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-07",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:08:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-08",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:08:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-08",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:08:gas_burners",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"15-0060","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-08",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:08:flatbed_to5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-08",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:10:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-10",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:10:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-10",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:10:gas_burners",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"15-0060","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-10",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:10:flatbed_to5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-10",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:11:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-11",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:11:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-11",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:11:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-11",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:11:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-11",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:flat-roll:missing002:r24:11:flatbed_to5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-002-11",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:insulation:missing014:r24:01:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-014-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:insulation:missing014:r24:01:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-014-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:insulation:missing014:r24:03:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-014-03",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:insulation:missing014:r24:03:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-014-03",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:insulation:missing014:r24:04:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-014-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:insulation:missing014:r24:04:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-014-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:insulation:missing014:r24:05:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-014-05",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:insulation:missing014:r24:05:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-014-05",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:01:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:01:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:01:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:01:flatbed_truck_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:02:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:02:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:02:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:02:flatbed_truck_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:04:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:04:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:04:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:04:flatbed_truck_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:05:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-05",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:05:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-05",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:05:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-05",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:vapor:missing015:r24:05:flatbed_truck_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-015-05",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:primer-preparation:whole01601:r24:flatbed_to5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-016-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:screed:missing017:r24:03:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-017-03+12-01-017-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:screed:missing017:r24:03:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-017-03+12-01-017-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:screed:missing017:r24:05:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-017-05",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:screed:missing017:r24:05:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-017-05",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:screed:missing017:r24:05:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-017-05",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:01:tower_crane8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:01:truck_crane10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:01:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:01:flatbed5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:02:tower_crane8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:02:truck_crane10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:02:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:02:flatbed5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:03:tower_crane8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-03",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:03:truck_crane10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-03",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:03:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-03",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:03:flatbed5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-03",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:04:tower_crane8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:04:truck_crane10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:04:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:rooflight-curb:whole018:r24:04:flatbed5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-018-04",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:mastic-preparation:whole01901:r24:truck_crane10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-019-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:mastic-preparation:whole01901:r24:boiler400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-019-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:mastic-preparation:whole01901:r24:flatbed5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-019-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:mastic-mesh:whole003:r24:bitumen:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-003-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:mastic-mesh:whole003:r24:bitumen:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-003-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:mastic-mesh:whole003:r24:bitumen:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-003-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:mastic-mesh:whole003:r24:bitumen:mobile_bitumen_boiler_400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-003-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:mastic-mesh:whole003:r24:bitumen:flatbed_truck_to_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-003-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:mastic-mesh:whole003:r24:bitumen_rubber:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-003-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:mastic-mesh:whole003:r24:bitumen_rubber:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-003-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:mastic-mesh:whole003:r24:bitumen_rubber:forklift_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"03-0020","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-003-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:mastic-mesh:whole003:r24:bitumen_rubber:mobile_bitumen_boiler_400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-003-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:mastic-mesh:whole003:r24:bitumen_rubber:flatbed_truck_to_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-003-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:expansion-joint:krer12-006-r24:mastic:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-006-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:expansion-joint:krer12-006-r24:mastic:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-006-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:expansion-joint:krer12-006-r24:mastic:mobile_bitumen_boiler_400l",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"12-0340","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-006-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:expansion-joint:krer12-006-r24:mastic:flatbed_truck_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-006-01",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:expansion-joint:krer12-006-r24:torch:tower_crane_8t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0005","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-006-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:expansion-joint:krer12-006-r24:torch:truck_crane_10t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"02-0075","OPERATOR","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-006-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:expansion-joint:krer12-006-r24:torch:flame_burner",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"15-0060","NO_ADDITIONAL_OPERATOR_NORM","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-006-02",'machinePriceExactSourceColumnsR24');
admitConstructionMachine("roof:expansion-joint:krer12-006-r24:torch:flatbed_truck_5t",["canonical-work:base:roofing_interior_flat_roof_install_technical_room"],"40-0001","DRIVER","114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8","12-01-006-02",'machinePriceExactSourceColumnsR24');

const aliases=new Set(['FULL_OPERATED_MACHINE_HOUR','FULL_OPERATED_VEHICLE_HOUR_DRIVER_INCLUDED_NOT_IN_INFO','FULL_OPERATED','FULL_DRIVER','FULL_MACHINE_SOURCE_COST','EQUIPMENT_OPERATION_NO_ADDITIONAL_OPERATOR_NORM_ADMITTED']);
// Exact KG15-2015 facade080-03 paid owners only; no consumed/reference row.
// Physical stock, rigging and tools are separate unresolved obligations.
for(const [key,code,operator] of [
 ['winch','03-0164','OPERATOR'],['loader','15-0260','OPERATOR'],
 ['drill','33-0241','NO_ADDITIONAL_OPERATOR_NORM'],
 ['sheet-bender','33-0362','NO_ADDITIONAL_OPERATOR_NORM'],
 ['angle-grinder','33-0367','NO_ADDITIONAL_OPERATOR_NORM'],
 ['perforator','33-0462','NO_ADDITIONAL_OPERATOR_NORM'],
 ['flatbed','40-0004','DRIVER'],
] as const)for(const mode of ['own','hired'])admitConstructionMachine(
 'facade:bolix-mw120:krer15:r1:'+key+'-'+mode,
 ['canonical-work:base:insulation_interior_facade_install_standard'],code,operator,
 '58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc',
 '15-01-080-03','exact_column');
// Exact independent historical steel-siding065-01 owners; no modern-frame bridge.
// The KG column prints no aggregate machinist row. No physical tool count is
// inferred from the complete machine-operation hours.
for(const [key,code,operator] of [
 ['screwdriver','13-0400','NO_ADDITIONAL_OPERATOR_NORM'],
 ['electric-grinding-machine','33-0368','NO_ADDITIONAL_OPERATOR_NORM'],
 ['perforator','33-0440','NO_ADDITIONAL_OPERATOR_NORM'],
 ['flatbed','40-0001','DRIVER'],
] as const)for(const mode of ['own','hired'])admitConstructionMachine(
 'facade:steel-siding:krer15-06501:r2:'+key+'-'+mode,
 ['canonical-work:master:facade_steel_siding_insulated_krer15_01_065_01','canonical-work:expanded:ventilated_facade'],code,operator,
 '58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc',
 '15-01-065-01','exact_column');
// Whole façade source methods R3; exact finite paid machine owners only.
// No structural mass comparator, source operator aggregate or INFO stock admitted.
admitConstructionMachine("facade:face-brick-aac:krer:r3:tower-crane-own",["canonical-work:master:facade_face_brick_cladding"],"02-0004","OPERATOR","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-017-01",'exact_column');
admitConstructionMachine("facade:face-brick-aac:krer:r3:tower-crane-hired",["canonical-work:master:facade_face_brick_cladding"],"02-0004","OPERATOR","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-017-01",'exact_column');
admitConstructionMachine("facade:face-brick-aac:krer:r3:mobile-crane-own",["canonical-work:master:facade_face_brick_cladding"],"02-0075","OPERATOR","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-017-01",'exact_column');
admitConstructionMachine("facade:face-brick-aac:krer:r3:mobile-crane-hired",["canonical-work:master:facade_face_brick_cladding"],"02-0075","OPERATOR","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-017-01",'exact_column');
admitConstructionMachine("facade:face-brick-aac:krer:r3:angle-grinder-own",["canonical-work:master:facade_face_brick_cladding"],"33-0367","NO_ADDITIONAL_OPERATOR_NORM","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-017-01",'exact_column');
admitConstructionMachine("facade:face-brick-aac:krer:r3:angle-grinder-hired",["canonical-work:master:facade_face_brick_cladding"],"33-0367","NO_ADDITIONAL_OPERATOR_NORM","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-017-01",'exact_column');
admitConstructionMachine("facade:face-brick-aac:krer:r3:truck-own",["canonical-work:master:facade_face_brick_cladding"],"40-0001","DRIVER","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-017-01",'exact_column');
admitConstructionMachine("facade:face-brick-aac:krer:r3:truck-hired",["canonical-work:master:facade_face_brick_cladding"],"40-0001","DRIVER","cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436","08-02-017-01",'exact_column');
admitConstructionMachine("facade:limestone-mortar:krer:r3:forklift-own",["canonical-work:master:facade_natural_stone_mortar_cladding"],"03-0020","OPERATOR","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-01-002-01",'exact_column');
admitConstructionMachine("facade:limestone-mortar:krer:r3:forklift-hired",["canonical-work:master:facade_natural_stone_mortar_cladding"],"03-0020","OPERATOR","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-01-002-01",'exact_column');
admitConstructionMachine("facade:limestone-mortar:krer:r3:hoist-own",["canonical-work:master:facade_natural_stone_mortar_cladding"],"03-0327","OPERATOR","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-01-002-01",'exact_column');
admitConstructionMachine("facade:limestone-mortar:krer:r3:hoist-hired",["canonical-work:master:facade_natural_stone_mortar_cladding"],"03-0327","OPERATOR","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-01-002-01",'exact_column');
admitConstructionMachine("facade:limestone-mortar:krer:r3:compressor-own",["canonical-work:master:facade_natural_stone_mortar_cladding"],"05-0005","OPERATOR","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-01-002-01",'exact_column');
admitConstructionMachine("facade:limestone-mortar:krer:r3:compressor-hired",["canonical-work:master:facade_natural_stone_mortar_cladding"],"05-0005","OPERATOR","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-01-002-01",'exact_column');
admitConstructionMachine("facade:limestone-mortar:krer:r3:abrasive-blaster-own",["canonical-work:master:facade_natural_stone_mortar_cladding"],"33-0082","NO_ADDITIONAL_OPERATOR_NORM","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-01-002-01",'exact_column');
admitConstructionMachine("facade:limestone-mortar:krer:r3:abrasive-blaster-hired",["canonical-work:master:facade_natural_stone_mortar_cladding"],"33-0082","NO_ADDITIONAL_OPERATOR_NORM","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-01-002-01",'exact_column');
admitConstructionMachine("facade:ceramic-tile-mortar:krer:r3:forklift-own",["canonical-work:master:facade_ceramic_tile_mortar_install"],"03-0020","OPERATOR","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-01-017-01",'exact_column');
admitConstructionMachine("facade:ceramic-tile-mortar:krer:r3:forklift-hired",["canonical-work:master:facade_ceramic_tile_mortar_install"],"03-0020","OPERATOR","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-01-017-01",'exact_column');
admitConstructionMachine("facade:ceramic-tile-mortar:krer:r3:hoist-own",["canonical-work:master:facade_ceramic_tile_mortar_install"],"03-0327","OPERATOR","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-01-017-01",'exact_column');
admitConstructionMachine("facade:ceramic-tile-mortar:krer:r3:hoist-hired",["canonical-work:master:facade_ceramic_tile_mortar_install"],"03-0327","OPERATOR","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-01-017-01",'exact_column');
admitConstructionMachine("facade:plain-render:krer:r3:winch-own",["canonical-work:master:facade_improved_cement_lime_render"],"03-0159","NO_ADDITIONAL_OPERATOR_NORM","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-02-001-01",'exact_column');
admitConstructionMachine("facade:plain-render:krer:r3:winch-hired",["canonical-work:master:facade_improved_cement_lime_render"],"03-0159","NO_ADDITIONAL_OPERATOR_NORM","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-02-001-01",'exact_column');
admitConstructionMachine("facade:plain-render:krer:r3:mortar-pump-own",["canonical-work:master:facade_improved_cement_lime_render"],"11-0341","OPERATOR","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-02-001-01",'exact_column');
admitConstructionMachine("facade:plain-render:krer:r3:mortar-pump-hired",["canonical-work:master:facade_improved_cement_lime_render"],"11-0341","OPERATOR","58d744b089e279151eb5ef57d4ff9d3a925597742093a800146d4190c5c037bc","15-02-001-01",'exact_column');

const admittedCatalogs=new Set(['canonical-work:base:roofing_interior_flat_roof_install_technical_room','canonical-work:base:roofing_interior_flat_roof_install_wet_zone']);
const admittedOwner=(catalogId:string,rowId:string)=>Object.prototype.hasOwnProperty.call(constructionMachineAdmissions,rowId)
  ?constructionMachineAdmissions[rowId]!.catalogIds.includes(catalogId)
  :Object.prototype.hasOwnProperty.call(ceramicCementFloorOwners,rowId)
  ?catalogId===ceramicCementFloorCatalog
  :Object.prototype.hasOwnProperty.call(brickPartitionHalfOwners,rowId)
  ?catalogId===brickPartitionHalfCatalog
  :Object.prototype.hasOwnProperty.call(graniteKerb1gpOwners,rowId)
  ?catalogId===graniteKerb1gpCatalog
  :Object.prototype.hasOwnProperty.call(floorSandOwners,rowId)
  ?catalogId===floorSandCatalog
  :Object.prototype.hasOwnProperty.call(roadUpperOwners,rowId)
    ?catalogId===roadUpperCatalog
    :admittedCatalogs.has(catalogId)
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
  if(input.sourceMetadata?.normativeResourceCode!==requirement.resourceCode||!aliases.has(String(input.sourceMetadata?.machinePriceCoverageRequired??''))
    ||requirement.operationScope!==undefined&&input.sourceMetadata?.machinePriceOperationScope!==requirement.operationScope
    ||Object.prototype.hasOwnProperty.call(constructionMachineAdmissions,input.rowId)
      &&(input.sourceMetadata?.source_artifact_sha256!==constructionMachineAdmissions[input.rowId]!.sourceSha256
        ||input.sourceMetadata?.[constructionMachineAdmissions[input.rowId]!.columnMetadataKey]!==constructionMachineAdmissions[input.rowId]!.column))
    throw Object.assign(Error('Machine-hour definition identity is not admitted'),{code:'DEFINITION_INTEGRITY_FAILED'});
  return requirement;
}
export function parseCanonicalMachineHourPriceCoverageV1(value:unknown):CanonicalMachineHourPriceCoverageV1|null{
  const v=record(value),s=record(v.source);
  const keys=['contractVersion','resourceCode','unitId','currencyCode','unitPrice','billingBasis','operationScope','minimumBillableHours','fixedFees','separateNormedInputs','source'];
  if(Object.keys(v).length!==keys.length||Object.keys(v).some(k=>!keys.includes(k))
    ||v.contractVersion!=='canonical-machine-hour-price-coverage/v1'
    ||(!/^\d{2}-\d{4}$/.test(String(v.resourceCode))&&!admittedInternationalBeamCodes.has(String(v.resourceCode))&&!admittedInternationalLandingCodesR53.has(String(v.resourceCode))&&!admittedInternationalFlightCodesR54.has(String(v.resourceCode)))
    ||v.unitId!=='machine_hour'||! /^[A-Z]{3}$/.test(String(v.currencyCode))||!decimal(v.unitPrice)
    ||v.billingBasis!=='MACHINE_HOUR'||(v.operationScope!=='FULL_SOURCE_OPERATION'&&!(v.operationScope===floorRammerScope&&v.resourceCode==='33-0741'))||v.minimumBillableHours!=='0'||v.fixedFees!=='0'
    ||v.separateNormedInputs!=='EXCLUDED_FROM_RATE')return null;
  if(s.kind==='MANUAL'){
    if(Object.keys(s).length!==3||typeof s.rowId!=='string'||!owners[s.rowId]
      ||v.operationScope===floorRammerScope&&s.rowId!==floorRammerRow
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
    &&evidence.operationScope===(requirement.operationScope??'FULL_SOURCE_OPERATION')
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
    billingBasis:'MACHINE_HOUR',operationScope:requirement.operationScope??'FULL_SOURCE_OPERATION',minimumBillableHours:'0',fixedFees:'0',separateNormedInputs:'EXCLUDED_FROM_RATE',source:{kind:'MANUAL',rowId:input.rowId,priceProvenanceReason:'consumer_estimate_row_batch_edit'}};
}
export const CANONICAL_MACHINE_HOUR_PRICE_CONFIRMATION_RU='Цена за машино-час включает полную эксплуатацию и обслуживание, оператора или водителя там, где они предусмотрены нормой. Нет минимальной смены, выезда и иных фиксированных доплат. Отдельно рассчитанные материалы и технологический газ повторно в цену не включены.';

export function canonicalMachineHourPriceConfirmationRuV1(rowId:string){
 return rowId===floorRammerRow
  ?'Цена за машино-час включает эксплуатацию и обслуживание пневматической трамбовки. Рабочий и работа компрессора со сжатым воздухом учитываются отдельно и в эту цену не входят. Нет минимальной смены, выезда и иных фиксированных доплат.'
  :CANONICAL_MACHINE_HOUR_PRICE_CONFIRMATION_RU;
}
export function canonicalMachineHourPricePromptRuV1(rowId:string){
 return rowId===floorRammerRow?'Нужна цена эксплуатации трамбовки за машино-час без рабочего, компрессора и сжатого воздуха.':'Нужна цена полной эксплуатации за машино-час.';
}
