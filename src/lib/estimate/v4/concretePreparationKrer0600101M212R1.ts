/** Exact entire primary column, distinct from structural foundation09 and floor
 * underlayer11-002-09. This source module introduces no public catalogue ID. */
import pack from '../../../../data/estimate-benchmarks/source-packs/concrete-preparation-krer06-001-01-master212-r1.json';
import {buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
 type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const CONCRETE_PREPARATION_M212_R1_PRIMARY=pack.measure.parameterId;
export const CONCRETE_PREPARATION_M212_R1_PREFIX=pack.prefix;
export const CONCRETE_PREPARATION_M212_R1_SOURCE=pack;
export function assertPreparationPrimaryRosterM212R1(resources:readonly typeof pack.resources[number][]=pack.resources){
 const expected=[['workers','man_hour','163.03','labor'],['machinists','man_hour','10.38','labor'],['tower-crane','machine_hour','10.38','equipment'],
  ['deep-vibrator','machine_hour','8.03','equipment'],['flatbed-truck','machine_hour','0.35','equipment'],['water','m3','1.75','material'],['matting','m2','250','material'],['concrete','m3','102','material']];
 if(resources.length!==expected.length)throw Error('M212_PREPARATION_WHOLE_PRIMARY_ROSTER_REQUIRED');
 for(const [key,unit,rate,category]of expected){const r=resources.find(r=>r.key===key);
  if(!r||r.unitId!==unit||r.ratePer100M3!==rate||r.category!==category)throw Error('M212_PREPARATION_PRIMARY_ROW_MISMATCH:'+key);}
 const crane=resources.find(r=>r.key==='tower-crane')!;
 if(crane.resourceCode!=='02-0005'||!crane.titleRu.includes('Башенный'))throw Error('M212_PREPARATION_TOWER_CRANE_NOT_MOBILE_OR_CRAWLER');
 if(resources.find(r=>r.key==='deep-vibrator')!.resourceCode!=='11-0180'||resources.find(r=>r.key==='flatbed-truck')!.resourceCode!=='40-0001')throw Error('M212_PREPARATION_PRIMARY_MACHINE_IDENTITY_REQUIRED');
}

export function buildConcretePreparationKrer0600101M212R1(){
 if(pack.source.sha256!=='45c065fb0e35586948fdb06cd21fe331358e2c454c25a4dc83d4a686bf9f3e4b'
  ||pack.normId!=='06-01-001-01'||pack.measure.denominator!=='100'||pack.resources.length!==8)
  throw Error('M212_PREPARATION_EXACT_PRIMARY_COLUMN_REQUIRED');
 assertPreparationPrimaryRosterM212R1();
 const v=pack.measure.parameterId, positive={kind:'greater_than' as const,parameterId:v,value:0};
 const condition={kind:'and' as const,operands:[positive,
  {kind:'equals' as const,parameterId:pack.method.id,value:pack.method.value},
  {kind:'equals' as const,parameterId:pack.fit.id,value:pack.fit.value}]};
 const conditional:AutomaticParameterSpec[]=pack.needs.map(n=>({id:n.parameterId,title:n.titleRu,valueType:'decimal',unitId:n.unitId,kind:'internal',min:0}));
 const rows:AutomaticRowSpec[]=pack.resources.map(r=>({rowId:pack.prefix+':'+r.key,formulaId:pack.prefix+':formula:'+r.key,
  section:pack.titleRu,title:r.titleRu,category:r.category,unitId:r.unitId,expression:v+'*'+r.ratePer100M3+'/100',
  inclusion:condition,inputParameterIds:[pack.method.id,pack.fit.id],procurement:r.category==='material'||r.category==='equipment',
  costTreatment:r.key==='machinists'?'INFORMATIONAL_SCOPE':'OWN_COST'}));
 for(const n of pack.needs)rows.push({rowId:pack.prefix+':need:'+n.key,formulaId:pack.prefix+':formula:need:'+n.key,
  section:n.stageTitleRu,title:n.titleRu,category:n.category,unitId:n.unitId,expression:n.parameterId,inclusion:positive,
  procurement:false,costTreatment:'INFORMATIONAL_SCOPE'});
 const base=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.source.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,
   artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},applicabilityRu:pack.scopeRu,
  ordinary:[{id:v,title:'Чистый объём бетонной подготовки',kind:'ordinary',valueType:'decimal',unitId:'m3',min:0},
   {id:pack.method.id,title:'Применимая система и нормативная база подготовки',kind:'ordinary',valueType:'enum',unitId:null,values:[pack.method.value]},
   {id:pack.fit.id,title:'Условия бетонной подготовки',kind:'ordinary',valueType:'enum',unitId:null,values:[pack.fit.value]}],
  profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.exclusionsRu});
 const parameters=base.parameters.map(p=>{const need=pack.needs.find(n=>n.parameterId===p.parameter_id);
  return {...p,required:false,default_value:null,truth_metadata:need?unresolvedApplicationNormTruthR1(p.truth_metadata,need.reasonRu):
   {...p.truth_metadata,source_confirmation_required:false,value_source_role:p.parameter_id===v?'USER_INPUT':'PROJECT_SPECIFIC_INPUT',
    provenance:{consumer_input_role_v1:'OBJECT_FACT'},preliminary_compilation_allowed:true}};});
 const resources=base.resources.map(r=>{const literal=pack.resources.find(n=>r.row_id===pack.prefix+':'+n.key),need=pack.needs.find(n=>r.row_id===pack.prefix+':need:'+n.key);
  const {row_sha256:_old,...body}=r;
  const changed={...body,resource_graph:{...r.resource_graph,
   derivedQuantityEditPolicyV1:literal?{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[v],
    reasonRu:'Весь исходный столбец01 масштабируется по чистому объёму; вручную не заменяется нормативный расход.'}:undefined,
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:pack.titleRu,
    operationId:pack.prefix+':operation:'+ (literal?.operationId??need!.operationId),operationTitleRu:literal?.operationTitleRu??need!.stageTitleRu,
    processOrdinal:literal?.ordinal??need!.ordinal,completionCriterionRu:literal?'Полный количественный ресурс исходного столбца01; сопутствующее обеспечение сохраняется отдельно.':need!.reasonRu}},
   source_metadata:{...r.source_metadata,full_technical_acceptance:false,automaticGenericPriceInheritanceAllowed:false,
    sourceRole:literal?'OFFICIAL_KG_EXACT_COLUMN_QUANTITY':'UNRESOLVED_APPLICATION_NORM',
    ...(literal?{normativeResourceCode:literal.resourceCode,sourceRatePer100M3:literal.ratePer100M3,exactColumn:pack.normId,
     official_url:pack.source.officialUrl,source_artifact_sha256:pack.source.sha256,normQuantityIsNotOrderOrPackaging:true,
     operatorQuantityIsNotSecondPayableLabor:literal.key==='machinists',
     ...(literal.category==='equipment'?{machinePriceOperationScope:'FULL_SOURCE_OPERATION',machinePriceCoverageRequired:literal.key==='flatbed-truck'?'FULL_OPERATED_VEHICLE_HOUR_DRIVER_INCLUDED_NOT_IN_INFO':literal.key==='deep-vibrator'?'EQUIPMENT_OPERATION_NO_ADDITIONAL_OPERATOR_NORM_ADMITTED':'FULL_OPERATED_MACHINE_HOUR'}:{})}:{normativeTrace:[],normative_source_ids:[]})}};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 return {...base,parameters,resources,fullTechnicalAcceptance:false as const};
}

export async function compileConcretePreparationKrer0600101M212R1(input:Record<string,unknown>){
 const d=buildConcretePreparationKrer0600101M212R1();
 return compileCanonicalEstimateCore({operation:'compile',catalogId:'source-review-only:master212:concrete-preparation-06-01-001-01',compilerVersion:pack.contract,
  primaryMeasureParameterId:pack.measure.parameterId,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
  submittedParameters:input,confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:64,hashJson:async v=>estimateDeterministicHash(v)});
}
