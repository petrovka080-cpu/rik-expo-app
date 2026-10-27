// Read-only target guard for the EXISTING publisher's client/transaction.
// No connection, BEGIN/COMMIT/ROLLBACK, lock acquisition or DML is added here.
import assert from 'node:assert/strict';
type Json=Record<string,any>;
type QueryClient={query:(text:string,values?:any[])=>Promise<{rows:Json[]}>};
type RawSet={rowCount:number;rawRows:string[]};
const sorted=(rows:readonly string[])=>[...rows].sort();
const table=(name:string,where:string)=>`select row_to_json(t)::text raw from public.${name} t where ${where}`;
/** Original capture used row_to_json, including PostgreSQL JSON whitespace and
 * the session's +05:00 timestamp rendering. Array order is NOT a source guard:
 * compare exact raw row multisets, retaining duplicates and full row coverage. */
export async function verifyCeramicM150TargetPreconditionR2(input:{client:QueryClient;releaseId:string;expectedCapture:Json;phase:'PREFLIGHT'|'LOCKED_BEFORE'}):Promise<{phase:string;sets:Record<string,RawSet>;comparedRawRows:number;databaseWrites:false}>{
 const {client,expectedCapture:c}=input,catalogId=c.catalogId,newSourceKey=c.newSourceKey;
 assert.equal(c.contract,'master27-ceramic-m150-r2-readonly-parent/v1');
 const offset=(await client.query('select extract(timezone from current_timestamp)::int offset_seconds')).rows[0]?.offset_seconds;
 assert.equal(Number(offset),18000,'CERAMIC_CAPTURE_RAW_TIMESTAMP_RENDER_REQUIRES_PLUS05');
 const header=(await client.query(`select m.definition_version_id::text,m.approved_template_baseline_id::text,
  d.definition_version,d.definition_sha256,
  (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=d.id) parameters,
  (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=d.id) formulas,
  (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=d.id) resources
  from public.estimate_cumulative_manifest_entry m join public.estimate_definition_version d on d.id=m.definition_version_id
  where m.release_id=$1 and m.catalog_id=$2`,[input.releaseId,catalogId])).rows;
 assert.equal(header.length,1,'CERAMIC_TARGET_HEADER_COUNT');const h=header[0]!,old=JSON.parse(c.sets.target.rawRows[0]);
 for(const key of ['definition_version_id','approved_template_baseline_id','definition_version','definition_sha256','parameters','formulas','resources'])assert.equal(h[key],old[key],'CERAMIC_TARGET_ANCHOR:'+key);
 const definitionId=h.definition_version_id,baselineId=h.approved_template_baseline_id;
 const queries:[string,string,any[]][]=[
  ['definition',table('estimate_definition_version','t.id=$1'),[definitionId]],
  ['baseline',table('estimate_approved_template_baseline','t.id=$1'),[baselineId]],
  ['parameters',table('estimate_parameter_definition','t.definition_version_id=$1'),[definitionId]],
  ['formulas',table('estimate_formula_graph','t.definition_version_id=$1'),[definitionId]],
  ['resources',table('estimate_resource_spec','t.definition_version_id=$1'),[definitionId]],
  ['bindings',table('estimate_work_normative_binding','t.definition_version_id=$1'),[definitionId]],
  ['normativeLocators',table('estimate_normative_locator',`t.id in(select b.locator_id from public.estimate_work_normative_binding b where b.definition_version_id=$1)`),[definitionId]],
  ['normativeSources',table('estimate_normative_source',`t.id in(select l.source_id from public.estimate_normative_locator l join public.estimate_work_normative_binding b on b.locator_id=l.id where b.definition_version_id=$1)`),[definitionId]],
  ['newSourcePreimage',table('estimate_normative_source','t.source_key=$1'),[newSourceKey]],
  // The captured identity projection excludes its server creation timestamp;
  // all declared identity fields and every matching row remain compared.
  ['workIdentity',`select row_to_json(t)::text raw from(select catalog_id,namespace,domain,source_identity,
   work_key,title_ru,denominator_eligible,canonical_owner,retired_at from public.estimate_work_identity where catalog_id=$1)t`,[catalogId]],
 ];
 const sets:Record<string,RawSet>={};let comparedRawRows=0;
 // Sequential on the caller's single client, especially within the held locks.
 for(const[name,sql,values]of queries){const result=await client.query(sql,values),rawRows=result.rows.map(r=>r.raw as string);
  assert(rawRows.every(r=>typeof r==='string'),'CERAMIC_RAW_TEXT_REQUIRED:'+name);
  const expected=c.sets[name];assert.equal(rawRows.length,expected.rowCount,'CERAMIC_TARGET_ROW_COUNT:'+name);
  assert.deepEqual(sorted(rawRows),sorted(expected.rawRows),'CERAMIC_TARGET_RAW_PREIMAGE:'+name);
  sets[name]={rowCount:rawRows.length,rawRows};comparedRawRows+=rawRows.length;
 }
 return{phase:input.phase,sets,comparedRawRows,databaseWrites:false};
}
