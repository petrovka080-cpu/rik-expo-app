import {
  parseRoofPrimerPrerequisiteCommandV1,readRoofPrimerPrerequisiteDecisionV1,resolveRoofPrimerPrerequisiteV1,
  roofPrimerPrerequisiteCommandFromDecisionV1,roofPrimerPrerequisiteErrorV1,
  ROOF_PRIMER_SOURCE_CATALOGS_V1,ROOF_PRIMER_LINK_CATALOGS_V1,ROOF_PRIMER_PREFIX_V1,
  type RoofPrimerPrerequisiteDecisionV1,type RoofPrimerPrerequisiteCandidateV1,
} from './canonicalRoofPrimerPrerequisiteV1';
import {assertRoofPlannedPreparationOwnerContextV1} from './canonicalRoofPlannedPreparationV1';
import {roofConditionIncludesPlannedPrimerV1} from './canonicalRoofForecastConditionV1';
type Json=Record<string,unknown>;
type Reader={query:(text:string,values?:unknown[])=>Promise<{rows:Json[]}>};
type Principal={ownerUserId:string;organizationId:string|null};
const record=(v:unknown):Json=>v!=null&&typeof v==='object'&&!Array.isArray(v)?v as Json:{};
async function authorizedRevision(client:Reader,id:string,principal:Principal):Promise<Json> {
  const r=(await client.query(`select id,parent_revision_id,owner_user_id,organization_id,status,catalog_id,definition_version_id,release_id,
    input_parameters,amendment_contract,checksum_sha256,display_title_ru,canonical_work_title_ru,revision_number,
    public.estimate_definition_withdrawal_reason_v1(definition_version_id) definition_withdrawal_reason,
    exists(select 1 from public.estimate_revision_row rr where rr.revision_id=r.id and rr.included_in_estimate
      and not rr.row_id=any($4::text[])) extra_payable_rows
    from public.estimate_revision r where id=$1 and (owner_user_id=$2 or organization_id=$3)`,[id,principal.ownerUserId,principal.organizationId,
      ['workers','flatbed_truck','ready_bitumen_emulsion'].map(role=>ROOF_PRIMER_PREFIX_V1+':'+role)])).rows[0];
  if(!r)roofPrimerPrerequisiteErrorV1('Выбранная смета подготовки недоступна.','NOT_FOUND');
  return r;
}
async function rootInstance(client:Reader,id:string,principal:Principal):Promise<string> {
  const ancestors=(await client.query(`with recursive chain as (
    select id,parent_revision_id,array[id] seen,0 depth from public.estimate_revision
      where id=$1 and (owner_user_id=$2 or organization_id=$3)
    union all select r.id,r.parent_revision_id,c.seen||r.id,c.depth+1 from chain c
      join public.estimate_revision r on r.id=c.parent_revision_id
      where c.depth<128 and not r.id=any(c.seen) and (r.owner_user_id=$2 or r.organization_id=$3)
    ) select id from chain where parent_revision_id is null limit 1`,[id,principal.ownerUserId,principal.organizationId])).rows;
  if(ancestors.length!==1)roofPrimerPrerequisiteErrorV1('Не подтверждена история экземпляра работы.','ROOF_PRIMER_INSTANCE_IDENTITY_MISMATCH');
  return String(ancestors[0].id);
}
async function sourceRows(client:Reader,source:Json):Promise<Json[]> {
  return (await client.query(`select rr.row_id,rr.unit_id,rr.quantity::text,rr.included_in_estimate,rr.row_sha256,rr.calculation_trace,
      rs.cost_owner_id,rs.resource_graph,rs.source_metadata
    from public.estimate_revision_row rr join public.estimate_resource_spec rs on rs.id=rr.resource_spec_id
    where rr.revision_id=$1 and rs.definition_version_id=$2 and rr.row_id=any($3::text[]) order by rr.ordinal`,
    [source.id,source.definition_version_id,['workers','flatbed_truck','ready_bitumen_emulsion'].map(role=>ROOF_PRIMER_PREFIX_V1+':'+role)])).rows;
}
export async function admitRoofPrimerPrerequisiteServerV1(client:Reader,input:Principal & {
  fieldRevisionId:string;fieldCatalogId:string;fieldParameters:Json;
  supplied:boolean;command:unknown;parentAmendmentContract:unknown;
}):Promise<RoofPrimerPrerequisiteDecisionV1|null> {
  const inheritedValue=record(record(input.parentAmendmentContract).parameterSources).roofPrimerPrerequisiteV1;
  assertRoofPlannedPreparationOwnerContextV1({parameters:input.fieldParameters,inheritedExternalOwner:inheritedValue,
    suppliedExternalOwner:input.supplied?input.command:undefined});
  if(roofConditionIncludesPlannedPrimerV1(input.fieldParameters.roof_torch_conditions)) {
    // A cleared link does not establish cancellation of external work/payment.
    // Check the complete authorized instance ancestry; a truncated/cyclic chain
    // also fails closed rather than claiming that no external owner exists.
    const history=(await client.query(`with recursive owner_history as (
      select id,parent_revision_id,amendment_contract,array[id] seen,0 depth from public.estimate_revision
        where id=$1 and (owner_user_id=$2 or organization_id=$3)
      union all select r.id,r.parent_revision_id,r.amendment_contract,h.seen||r.id,h.depth+1
        from owner_history h join public.estimate_revision r on r.id=h.parent_revision_id
        where h.depth<128 and not r.id=any(h.seen) and (r.owner_user_id=$2 or r.organization_id=$3)
    ) select bool_or(amendment_contract#>'{parameterSources,roofPrimerPrerequisiteV1}' is not null
      and amendment_contract#>'{parameterSources,roofPrimerPrerequisiteV1}'<>'null'::jsonb) external_owner_seen,
      bool_or(parent_revision_id is null) complete_instance from owner_history`,
    [input.fieldRevisionId,input.ownerUserId,input.organizationId])).rows[0];
    if(history?.complete_instance!==true)roofPrimerPrerequisiteErrorV1('История исполнителя подготовки не подтверждена. Исходная смета сохранена.','ROOF_PRIMER_INSTANCE_IDENTITY_MISMATCH');
    assertRoofPlannedPreparationOwnerContextV1({parameters:input.fieldParameters,inheritedExternalOwner:history.external_owner_seen===true?{historicalExternalOwner:true}:null});
  }
  if(!input.supplied&&inheritedValue==null)return null;
  if(!ROOF_PRIMER_LINK_CATALOGS_V1.some(id=>id===input.fieldCatalogId))roofPrimerPrerequisiteErrorV1('Связь огрунтовки не применима к выбранной технологии.');
  if(input.supplied&&input.command===null)return null;
  const inherited=readRoofPrimerPrerequisiteDecisionV1(inheritedValue);
  if(!input.supplied&&!inherited)roofPrimerPrerequisiteErrorV1('Сохранённая связь подготовки некорректна.');
  const command=parseRoofPrimerPrerequisiteCommandV1(input.supplied?input.command:roofPrimerPrerequisiteCommandFromDecisionV1(inherited!));
  const source=await authorizedRevision(client,command.sourceRevisionId,input);
  const [fieldInstanceId,sourceInstanceId,rows]=await Promise.all([
    rootInstance(client,input.fieldRevisionId,input),rootInstance(client,command.sourceRevisionId,input),sourceRows(client,source),
  ]);
  return resolveRoofPrimerPrerequisiteV1({command,fieldCatalogId:input.fieldCatalogId,fieldParameters:input.fieldParameters,
    fieldInstanceId,sourceInstanceId,source,sourceRows:rows});
}
/** Bounded user-scoped suggestions; choosing a row still needs an explicit
 * same-section/project-compatibility fact and is validated again at commit. */
export async function listRoofPrimerPrerequisiteCandidatesServerV1(client:Reader,input:Principal & {fieldRevisionId:string}):Promise<RoofPrimerPrerequisiteCandidateV1[]> {
  const field=await authorizedRevision(client,input.fieldRevisionId,input);
  if(!ROOF_PRIMER_LINK_CATALOGS_V1.some(id=>id===field.catalog_id))return [];
  const candidates=(await client.query(`select id,parent_revision_id,status,catalog_id,definition_version_id,release_id,input_parameters,
      checksum_sha256,display_title_ru,canonical_work_title_ru,revision_number,
      public.estimate_definition_withdrawal_reason_v1(definition_version_id) definition_withdrawal_reason,
      exists(select 1 from public.estimate_revision_row rr where rr.revision_id=r.id and rr.included_in_estimate
        and not rr.row_id=any($4::text[])) extra_payable_rows
    from public.estimate_revision r where (owner_user_id=$1 or organization_id=$2) and status='ready'
      and catalog_id=any($3::text[]) order by created_at desc,id desc limit 40`,
    [input.ownerUserId,input.organizationId,ROOF_PRIMER_SOURCE_CATALOGS_V1,
      ['workers','flatbed_truck','ready_bitumen_emulsion'].map(role=>ROOF_PRIMER_PREFIX_V1+':'+role)])).rows;
  const seenInstances=new Set<string>(),result:RoofPrimerPrerequisiteCandidateV1[]=[];
  const fieldInstanceId=await rootInstance(client,input.fieldRevisionId,input);
  for(const source of candidates){
    try {
      const sourceInstanceId=await rootInstance(client,String(source.id),input);
      if(seenInstances.has(sourceInstanceId))continue;
      seenInstances.add(sourceInstanceId);
      const decision=resolveRoofPrimerPrerequisiteV1({command:{contractVersion:'canonical-roof-primer-prerequisite/v1',sourceRevisionId:source.id,
        sourceChecksumSha256:source.checksum_sha256,phase:'completed_accepted',sectionLabelRu:'Участок ещё не подтверждён',sameSectionAndCompatibilityConfirmed:true},
        fieldCatalogId:String(field.catalog_id),fieldInstanceId,fieldParameters:record(field.input_parameters),source,sourceInstanceId,sourceRows:await sourceRows(client,source)});
      result.push({sourceRevisionId:decision.sourceRevisionId,sourceChecksumSha256:decision.sourceChecksumSha256,sourceCatalogId:decision.sourceCatalogId,
        sourceDisplayTitleRu:decision.sourceDisplayTitleRu,sourceRevisionNumber:decision.sourceRevisionNumber,sourceNormAreaM2:decision.sourceNormAreaM2});
    }catch(error){
      if(!['ROOF_PRIMER_LINK_INVALID','ROOF_PRIMER_SOURCE_IDENTITY_MISMATCH','ROOF_PRIMER_INSTANCE_IDENTITY_MISMATCH'].includes(String(record(error).code)))throw error;
    }
    if(result.length===20)break;
  }
  return result;
}
