import type {PoolClient} from 'pg';
import {canonicalSameImmutableCalculationV1,canonicalSavedApprovedTemplateBaselineIdV1,assertCanonicalImmutableCalculationBridgeV1,
  parseCanonicalImmutableCalculationIdentityV1,type CanonicalImmutableCalculationIdentityV1} from '../../../src/lib/estimate/backendPlatform/canonicalImmutableCalculationContinuityV1';

type Json=Record<string,any>;

/** Resolve one cumulative manifest entry; no identity is accepted from a request
 * or inferred from an ordinal version, display label or payload hash alone. */
export async function readCanonicalImmutableCalculationIdentityR1(
  client:Pick<PoolClient,'query'>,releaseId:string,catalogId:string,
):Promise<CanonicalImmutableCalculationIdentityV1|null>{
  const {rows}=await client.query(`select m.catalog_id, d.id definition_version_id,d.definition_sha256,b.id approved_template_baseline_id
    from public.estimate_cumulative_manifest_entry m
    join public.estimate_definition_version d on d.id=m.definition_version_id and d.catalog_id=m.catalog_id
    join public.estimate_approved_template_baseline b on b.id=m.approved_template_baseline_id
      and b.definition_version_id=d.id and b.catalog_id=m.catalog_id
    where m.release_id=$1 and m.catalog_id=$2 and m.baseline_ready and m.scenario_ready limit 2`,[releaseId,catalogId]);
  if(rows.length!==1)return null;
  const row=rows[0];return parseCanonicalImmutableCalculationIdentityV1({catalogId:row.catalog_id,
    definitionVersionId:row.definition_version_id,definitionSha256:row.definition_sha256,
    approvedTemplateBaselineId:row.approved_template_baseline_id});
}

/** Caller retains owner/tenant, explicit migration admission and writer fences. */
export async function readCanonicalSameImmutableCalculationR1(client:Pick<PoolClient,'query'>,
  parent:Json,targetReleaseId:string):Promise<CanonicalImmutableCalculationIdentityV1|null>{
  if(parent.release_id===targetReleaseId||parent.status!=='ready')return null;
  const from=await readCanonicalImmutableCalculationIdentityR1(client,String(parent.release_id),String(parent.catalog_id));
  const to=await readCanonicalImmutableCalculationIdentityR1(client,targetReleaseId,String(parent.catalog_id));
  return canonicalSameImmutableCalculationV1({fromIdentity:from,toIdentity:to,savedCatalogId:parent.catalog_id,
    savedDefinitionVersionId:parent.definition_version_id,
    savedApprovedTemplateBaselineId:canonicalSavedApprovedTemplateBaselineIdV1(parent.amendment_contract)})?to:null;
}

export function assertCanonicalImmutableCalculationSavedInputsR1(parent:Json,payload:Json):readonly string[]{
  return assertCanonicalImmutableCalculationBridgeV1({parentCurrency:parent.currency_code,requestedCurrency:payload.currencyCode,
    parentOverrides:parent.amendment_contract?.rowOverrides,requestedOverrides:payload.rowOverrides??{},
    parentCustomRows:parent.amendment_contract?.customRows,requestedCustomRows:payload.customRows??[],
    parentUserParameters:parent.amendment_contract?.parameterSources?.userParameters,requestedParameters:payload.parameters,
    parentPriceSnapshotIds:parent.price_snapshot_ids,requestedPriceSnapshotIds:Object.hasOwn(payload,'priceSnapshotIds')?payload.priceSnapshotIds:undefined,
    parentCompositionSelection:parent.amendment_contract?.parameterSources?.compositionSelectionV1,
    requestedCompositionSelection:Object.hasOwn(payload,'compositionSelectionV1')?payload.compositionSelectionV1:undefined});
}
