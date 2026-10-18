import {createHash} from 'node:crypto';
import type {PoolClient} from 'pg';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {assertCanonicalFusionSourceTransactionS2758 as transaction} from './canonicalFusionPublishedSourceReaderS2758';

type Row=Record<string,any>;
export type SelectedDeliveryReadFenceR1=Readonly<{
  contractVersion:'canonical-selected-delivery-read-fence/v1';
  parentRevisionId:string;parentChecksumSha256:string;readSetSha256:string;
}>;
const failure=(reason:string)=>Object.assign(new Error('Сохранённая доставка требует повторной сверки. Исходная смета и её цена сохранены.'),
  {code:'SELECTED_DELIVERY_SAVED_CONTEXT_REVIEW_REQUIRED',httpStatus:409,reason});
const one=(rows:readonly Row[],reason:string)=>{if(rows.length!==1)throw failure(reason);return rows[0]!;};
const normalized=(value:unknown)=>JSON.parse(JSON.stringify(value));
const digest=(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(normalized(value))).digest('hex');

/** Server-only, caller-owned explicit repeatable-read/serializable transaction.
 * The caller supplies its authenticated principal; HTTP cannot supply rows,
 * prices, route bindings or the evidence used to construct this read set.
 * No command, transaction, lock, owner or shipment receipt is created here.
 */
export async function readCanonicalSelectedDeliveryReadSetR1(client:Pick<PoolClient,'query'>,input:Readonly<{
  phase:'PREVIEW'|'INTAKE'|'WORKER';parentRevisionId:string;catalogId:string;
  ownerUserId:string;organizationId:string|null;targetReleaseId:string;
  priceSnapshotIds?:readonly string[];
  expected?:SelectedDeliveryReadFenceR1;
}>){
  const identity=await transaction(client);
  const exactReadRecords:string[]=[];
  async function read(sql:string,values:unknown[]=[]):Promise<Row[]>{
    const result=one((await client.query(`select pg_current_xact_id()::text transaction_id,
      pg_backend_pid() backend_id,coalesce((select jsonb_agg(to_jsonb(source)) from (${sql}) source),'[]'::jsonb)::text records_text`,values)).rows,'transaction-read-missing');
    if(result.transaction_id!==identity.transaction_id||result.backend_id!==identity.backend_id||typeof result.records_text!=='string')throw failure('transaction-read-changed');
    // Hash the exact server serialization before JSON.parse can turn a nested
    // numeric into a rounded JS Number. Financial fields are also cast below
    // so their returned values retain the saved decimal scale and precision.
    exactReadRecords.push(result.records_text);
    const records:unknown=JSON.parse(result.records_text);
    if(!Array.isArray(records))throw failure('transaction-read-invalid');
    return records;
  }
  const parent=one(await read(`select * from public.estimate_revision where id=$1 and catalog_id=$2
    and owner_user_id=$3 and organization_id is not distinct from $4::uuid`,
    [input.parentRevisionId,input.catalogId,input.ownerUserId,input.organizationId]),'parent-outside-exact-principal-scope');
  if(parent.status!=='ready'||typeof parent.checksum_sha256!=='string'||!/^[a-f0-9]{64}$/u.test(parent.checksum_sha256)
    ||typeof parent.definition_version_id!=='string')throw failure('parent-not-current-ready-evidence');
  const rows=await read('select row.*,row.quantity::text quantity,row.unit_price::text unit_price,row.amount::text amount from public.estimate_revision_row row where revision_id=$1 order by ordinal',[parent.id]);
  if(rows.length!==parent.row_count||new Set(rows.map(row=>row.row_id)).size!==rows.length)throw failure('saved-row-set-incomplete');
  const prices=await read('select price.*,price.unit_price::text unit_price from public.estimate_revision_row_price price where revision_id=$1 order by row_id',[parent.id]);
  if(new Set(prices.map(price=>price.row_id)).size!==prices.length||prices.some(price=>!rows.some(row=>row.row_id===price.row_id)))throw failure('saved-price-set-conflict');
  const storedReceipt=parent.amendment_contract?.parameterSources?.selectedMaterialDeliveryV1??null;
  const originLineage:Row[]=[];
  if(storedReceipt!==null){
    if(storedReceipt.contractVersion!=='canonical-selected-material-delivery-receipt/v1'
      ||typeof storedReceipt.originRevisionId!=='string'||typeof storedReceipt.originChecksumSha256!=='string')throw failure('stored-delivery-receipt-invalid');
    let cursor:Row=parent;const seen=new Set<string>();
    for(let depth=0;depth<64;depth++){
      if(seen.has(cursor.id))throw failure('stored-delivery-origin-cycle');seen.add(cursor.id);
      originLineage.push({id:cursor.id,parent_revision_id:cursor.parent_revision_id,checksum_sha256:cursor.checksum_sha256});
      if(cursor.id===storedReceipt.originRevisionId){
        if(cursor.checksum_sha256!==storedReceipt.originChecksumSha256)throw failure('stored-delivery-origin-changed');
        break;
      }
      if(!cursor.parent_revision_id)throw failure('stored-delivery-origin-not-an-ancestor');
      cursor=one(await read(`select id,parent_revision_id,checksum_sha256 from public.estimate_revision
        where id=$1 and catalog_id=$2 and owner_user_id=$3 and organization_id is not distinct from $4::uuid`,
        [cursor.parent_revision_id,input.catalogId,input.ownerUserId,input.organizationId]),'stored-delivery-origin-outside-principal');
    }
    if(originLineage.at(-1)?.id!==storedReceipt.originRevisionId)throw failure('stored-delivery-origin-too-deep');
  }
  const parentDefinition=one(await read('select * from public.estimate_definition_version where id=$1 and catalog_id=$2',
    [parent.definition_version_id,input.catalogId]),'parent-definition-missing');
  const targetManifest=one(await read('select * from public.estimate_cumulative_manifest_entry where release_id=$1 and catalog_id=$2',
    [input.targetReleaseId,input.catalogId]),'target-manifest-missing');
  const targetDefinition=one(await read('select * from public.estimate_definition_version where id=$1 and catalog_id=$2',
    [targetManifest.definition_version_id,input.catalogId]),'target-definition-missing');
  const definitions:Row[]=[];
  for(const definition of [parentDefinition,targetDefinition]){
    if(definitions.some(entry=>entry.definition.id===definition.id))continue;
    const resources=await read('select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal',[definition.id]);
    const priceBindings=await read(`select binding.* from public.estimate_resource_price_route_binding binding
      join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
      where resource.definition_version_id=$1 order by resource.ordinal,binding.priority,binding.route_id`,[definition.id]);
    const parameters=await read('select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal',[definition.id]);
    const formulas=await read('select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id',[definition.id]);
    definitions.push({definition,resources,priceBindings,parameters,formulas});
  }
  const priceSnapshotIds=input.priceSnapshotIds??parent.price_snapshot_ids;
  if(!Array.isArray(priceSnapshotIds)||priceSnapshotIds.length>256||priceSnapshotIds.some(id=>typeof id!=='string'||!/^[a-f0-9-]{36}$/u.test(id)))throw failure('compile-price-selection-invalid');
  const resolvedPriceItems=priceSnapshotIds.length===0?[]:await read(`select snapshot_id::text,price_key,unit_id,unit_price::text,currency_code,cost_scope_id,machine_hour_price_coverage_v1,
    jsonb_build_object('route_id',route_id::text) estimate_price_snapshot
    from public.estimate_resolve_compile_price_items_v3($1::uuid,$2::uuid[])
    order by price_key,unit_id,snapshot_id,cost_scope_id`,[targetDefinition.id,priceSnapshotIds]);
  const snapshot=normalized({principal:{ownerUserId:input.ownerUserId,organizationId:input.organizationId},
    parent,rows,prices,targetReleaseId:input.targetReleaseId,targetManifest,definitions,priceSnapshotIds,resolvedPriceItems,originLineage}) as Row;
  const fence:SelectedDeliveryReadFenceR1={contractVersion:'canonical-selected-delivery-read-fence/v1',
    parentRevisionId:parent.id,parentChecksumSha256:parent.checksum_sha256,readSetSha256:digest({snapshot,exactReadRecords})};
  if(input.phase!=='PREVIEW'&&!input.expected)throw failure('saved-context-acknowledgement-required');
  if(input.expected&&(input.expected.contractVersion!==fence.contractVersion
    ||input.expected.parentRevisionId!==fence.parentRevisionId||input.expected.parentChecksumSha256!==fence.parentChecksumSha256
    ||input.expected.readSetSha256!==fence.readSetSha256))throw failure('saved-row-price-or-definition-changed');
  await transaction(client,identity);
  return {phase:input.phase,fence,snapshot,transactionIdentity:identity,
    scope:'ONE_IMMUTABLE_REVISION_READ_SET' as const,writesPerformed:false as const,
    globalConsignmentPaymentUniquenessProven:false as const,
    existingDeliveryReceipt:parent.amendment_contract?.parameterSources?.selectedMaterialDeliveryV1??null};
}
