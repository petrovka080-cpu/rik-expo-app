import {compileFormulaGraph,evaluateFormulaGraph} from './formulaGraph';
import {canonicalRoundDecimal} from './canonicalEstimateDeterminism';

export const ROOF_PRIMER_PREREQUISITE_CONTRACT_V1='canonical-roof-primer-prerequisite/v1' as const;
export const ROOF_PRIMER_LINK_CATALOGS_V1=[
  'canonical-work:base:roofing_interior_flat_roof_install_technical_room',
  'canonical-work:base:roofing_interior_flat_roof_install_wet_zone',
] as const;
export const ROOF_PRIMER_SOURCE_CATALOGS_V1=['standard','small_area','large_area','technical_room','wet_zone']
  .map(type=>'canonical-work:base:waterproofing_interior_roof_prime_'+type);
export const ROOF_PRIMER_PREFIX_V1='roof:prime-ready-emulsion:krer12-016-02';
export type RoofPrimerPhaseV1='completed_accepted'|'planned'|'applied_readiness_unknown'|'partly_completed'|'unknown';
export type RoofPrimerPrerequisiteCommandV1={
  contractVersion:typeof ROOF_PRIMER_PREREQUISITE_CONTRACT_V1;
  sourceRevisionId:string; sourceChecksumSha256:string;
  phase:RoofPrimerPhaseV1; sectionLabelRu:string;
  sameSectionAndCompatibilityConfirmed:true;
};
export type RoofPrimerPrerequisiteDecisionV1=RoofPrimerPrerequisiteCommandV1 & {
  fieldInstanceId:string; sourceInstanceId:string;
  sourceCatalogId:string; sourceDefinitionVersionId:string; sourceReleaseId:string;
  sourceDisplayTitleRu:string; sourceRevisionNumber:number; sourceNormAreaM2:string;
  consumerNormAreaM2:string|null;
  ownerRows:{rowId:string;costOwnerId:string;rowSha256:string;quantity:string;unitId:string}[];
  referencedCostOnly:true; addsPaidRows:false; setsActualReadiness:false;
  namedProductQuantityAccepted:false; procurementAccepted:false; quantityAllocationAccepted:false;
};
export type RoofPrimerPrerequisiteCandidateV1=Pick<RoofPrimerPrerequisiteDecisionV1,
  'sourceRevisionId'|'sourceChecksumSha256'|'sourceCatalogId'|'sourceDisplayTitleRu'|'sourceRevisionNumber'|'sourceNormAreaM2'>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const SHA=/^[0-9a-f]{64}$/u;
const phases=new Set(['completed_accepted','planned','applied_readiness_unknown','partly_completed','unknown']);
const commandKeys=new Set(['contractVersion','sourceRevisionId','sourceChecksumSha256','phase','sectionLabelRu','sameSectionAndCompatibilityConfirmed']);
const record=(v:unknown):Record<string,unknown>=>v!=null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export function roofPrimerPrerequisiteErrorV1(message:string,code='ROOF_PRIMER_LINK_INVALID'):never {
  throw Object.assign(new Error(message),{code,httpStatus:409});
}
export function parseRoofPrimerPrerequisiteCommandV1(value:unknown):RoofPrimerPrerequisiteCommandV1 {
  const v=record(value);
  if(Object.keys(v).length!==commandKeys.size||Object.keys(v).some(k=>!commandKeys.has(k))
    ||v.contractVersion!==ROOF_PRIMER_PREREQUISITE_CONTRACT_V1||!UUID.test(String(v.sourceRevisionId))
    ||!SHA.test(String(v.sourceChecksumSha256))||!phases.has(String(v.phase))
    ||typeof v.sectionLabelRu!=='string'||!v.sectionLabelRu.trim()||v.sectionLabelRu.length>200
    ||v.sameSectionAndCompatibilityConfirmed!==true)roofPrimerPrerequisiteErrorV1('Связь огрунтовки не сохранена: проверьте участок, совместимость и выбранную смету.');
  return {...v,sectionLabelRu:v.sectionLabelRu.trim()} as RoofPrimerPrerequisiteCommandV1;
}
export function roofPrimerPrerequisiteCommandFromDecisionV1(d:RoofPrimerPrerequisiteDecisionV1):RoofPrimerPrerequisiteCommandV1 {
  return {contractVersion:d.contractVersion,sourceRevisionId:d.sourceRevisionId,sourceChecksumSha256:d.sourceChecksumSha256,
    phase:d.phase,sectionLabelRu:d.sectionLabelRu,sameSectionAndCompatibilityConfirmed:true};
}
export function readRoofPrimerPrerequisiteDecisionV1(value:unknown):RoofPrimerPrerequisiteDecisionV1|null {
  const d=record(value);
  try {
    parseRoofPrimerPrerequisiteCommandV1(roofPrimerPrerequisiteCommandFromDecisionV1(d as RoofPrimerPrerequisiteDecisionV1));
    if(![d.fieldInstanceId,d.sourceInstanceId,d.sourceDefinitionVersionId,d.sourceReleaseId].every(v=>UUID.test(String(v)))
      ||!ROOF_PRIMER_SOURCE_CATALOGS_V1.includes(String(d.sourceCatalogId))||typeof d.sourceDisplayTitleRu!=='string'
      ||!Number.isInteger(d.sourceRevisionNumber)||Number(d.sourceRevisionNumber)<1
      ||typeof d.sourceNormAreaM2!=='string'||!/^\d+(?:\.\d+)?$/u.test(d.sourceNormAreaM2)
      ||!(d.consumerNormAreaM2===null||typeof d.consumerNormAreaM2==='string'&&/^\d+(?:\.\d+)?$/u.test(d.consumerNormAreaM2))
      ||!Array.isArray(d.ownerRows)||d.ownerRows.length!==3
      ||d.ownerRows.some(r=>{const v=record(r),expected=expectedOwners.find(([role])=>v.rowId===ROOF_PRIMER_PREFIX_V1+':'+role);return !expected||v.unitId!==expected[1]||!UUID.test(String(v.costOwnerId))||!SHA.test(String(v.rowSha256))||typeof v.quantity!=='string'||!/^\d+(?:\.\d+)?$/u.test(v.quantity);})
      ||new Set(d.ownerRows.map(r=>record(r).rowId)).size!==3
      ||new Set(d.ownerRows.map(r=>record(r).costOwnerId)).size!==3
      ||d.referencedCostOnly!==true||d.addsPaidRows!==false||d.setsActualReadiness!==false
      ||d.namedProductQuantityAccepted!==false||d.procurementAccepted!==false||d.quantityAllocationAccepted!==false)return null;
    return d as RoofPrimerPrerequisiteDecisionV1;
  }catch{return null;}
}
const expectedOwners=[['workers','man_hour','2.80'],['flatbed_truck','machine_hour','0.04'],['ready_bitumen_emulsion','kg','45']] as const;

/** Resolves a non-cost dependency from server-authorized immutable evidence.
 * It never changes the field's actual-ready guard, copies payable rows, selects
 * a named product, or turns a plan into a completed operation. */
export function resolveRoofPrimerPrerequisiteV1(input:{
  command:unknown;fieldCatalogId:string;fieldInstanceId:string;fieldParameters:Record<string,unknown>;
  source:Record<string,unknown>;sourceInstanceId:string;
  sourceRows:Record<string,unknown>[];
}):RoofPrimerPrerequisiteDecisionV1 {
  const command=parseRoofPrimerPrerequisiteCommandV1(input.command),s=input.source;
  if(!ROOF_PRIMER_LINK_CATALOGS_V1.some(id=>id===input.fieldCatalogId))roofPrimerPrerequisiteErrorV1('Для этой технологии связь с битумной огрунтовкой не подтверждена.');
  if(input.fieldParameters.roof_torch_system!=='Наружная кровля: ЭПП-4 снизу, ЭКП-4.5 сверху, два наплавляемых слоя')roofPrimerPrerequisiteErrorV1('Для связи сначала подтвердите проектную систему наплавляемого покрытия.');
  if(!UUID.test(input.fieldInstanceId)||!UUID.test(input.sourceInstanceId)||input.fieldInstanceId===input.sourceInstanceId
    ||s.id!==command.sourceRevisionId||s.checksum_sha256!==command.sourceChecksumSha256||s.status!=='ready'
    ||!ROOF_PRIMER_SOURCE_CATALOGS_V1.includes(String(s.catalog_id))||s.definition_withdrawal_reason!=null||s.extra_payable_rows!==false)roofPrimerPrerequisiteErrorV1('Выбранная версия огрунтовки не подтверждена или содержит иной платный состав.','ROOF_PRIMER_SOURCE_IDENTITY_MISMATCH');
  const parameters=record(s.input_parameters);
  if(parameters.roof_prime_system!=='Готовая битумная эмульсия по бетонному или растворному основанию кровли'
    ||parameters.roof_prime_conditions!=='Основание и совместимый ковёр подтверждены; высота до 15 м; огрунтовка отдельно не оплачена'
    ||parameters.roof_prime_area_scope!=='Нормативная площадь этой огрунтовки проверена')roofPrimerPrerequisiteErrorV1('Условия и отдельный обмер огрунтовки ещё не подтверждены.');
  if(!/^\d+(?:\.\d+)?$/u.test(String(parameters.q))||String(parameters.q).length>64)roofPrimerPrerequisiteErrorV1('Обмер огрунтовки ещё не подтверждён.');
  const area=canonicalRoundDecimal(String(parameters.q),9);
  if(Number(area)<=0)roofPrimerPrerequisiteErrorV1('Нормативная площадь огрунтовки должна быть подтверждена.');
  const fieldReady=input.fieldParameters.roof_torch_conditions==='Основание принято и огрунтовано; высота до 15 м; обычные условия нового строительства';
  if(fieldReady&&command.phase!=='completed_accepted')roofPrimerPrerequisiteErrorV1('Основание уже подтверждено как огрунтованное. Привяжите выполненную подготовку; повторную работу не планируйте.','ROOF_PRIMER_PHASE_CONFLICT');
  const ownerRows=expectedOwners.map(([role,unitId,rate])=>{
    const rowId=ROOF_PRIMER_PREFIX_V1+':'+role,r=input.sourceRows.find(r=>r.row_id===rowId);
    const graph=record(r?.resource_graph),trace=record(r?.calculation_trace),sourceMetadata=record(r?.source_metadata);
    const expected=evaluateFormulaGraph(compileFormulaGraph(`q/100*${rate}`).ast,{q:area});
    if(!r||r.unit_id!==unitId||!/^\d+(?:\.\d+)?$/u.test(String(r.quantity))||canonicalRoundDecimal(String(r.quantity),9)!==expected||r.included_in_estimate!==true
      ||!UUID.test(String(r.cost_owner_id))||!SHA.test(String(r.row_sha256))
      ||graph.costTreatment!=='OWN_COST'||sourceMetadata.sourceNormQuantityAccepted!==true
      ||!Array.isArray(sourceMetadata.normativeTrace)||!sourceMetadata.normativeTrace.some(e=>record(e).sourceSnapshotHash==='114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8')
      ||trace.manualQuantityOverride===true)roofPrimerPrerequisiteErrorV1('Ресурсы огрунтовки не подтвердили принятую норму и единственных владельцев затрат.');
    return {rowId,costOwnerId:String(r.cost_owner_id),rowSha256:String(r.row_sha256),quantity:expected,unitId};
  });
  if(new Set(ownerRows.map(r=>r.costOwnerId)).size!==3)roofPrimerPrerequisiteErrorV1('Владельцы затрат огрунтовки неоднозначны.');
  const decision:RoofPrimerPrerequisiteDecisionV1={...command,fieldInstanceId:input.fieldInstanceId,sourceInstanceId:input.sourceInstanceId,
    sourceCatalogId:String(s.catalog_id),sourceDefinitionVersionId:String(s.definition_version_id),sourceReleaseId:String(s.release_id),
    sourceDisplayTitleRu:String(s.display_title_ru??s.canonical_work_title_ru??'Огрунтовка основания'),sourceRevisionNumber:Number(s.revision_number),sourceNormAreaM2:area,
    consumerNormAreaM2:input.fieldParameters.q==null?null:canonicalRoundDecimal(String(input.fieldParameters.q),9),ownerRows,
    referencedCostOnly:true,addsPaidRows:false,setsActualReadiness:false,namedProductQuantityAccepted:false,procurementAccepted:false,quantityAllocationAccepted:false};
  if(!readRoofPrimerPrerequisiteDecisionV1(decision))roofPrimerPrerequisiteErrorV1('Доказательство связи огрунтовки некорректно.');
  return decision;
}
export function roofPrimerPhaseRuV1(phase:RoofPrimerPhaseV1):string {
  return {completed_accepted:'Выполнена и принята',planned:'Запланирована',applied_readiness_unknown:'Нанесена; готовность ещё проверяется',partly_completed:'Выполнена частично',unknown:'Состояние ещё не подтверждено'}[phase];
}
