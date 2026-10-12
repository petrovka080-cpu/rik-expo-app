/** Price provenance lives in a separate immutable table. Do not reconstruct it
 * from the consuming row's coverage evidence or its definition. */
export function canonicalArtifactRowsWithPriceRecordsV1<T extends Record<string,unknown>>(input:{revisionId:string;rows:readonly T[];prices:readonly Record<string,unknown>[]}):T[]{
  const rows=new Set(input.rows.map(row=>String(row.row_id))),prices=new Map<string,Record<string,unknown>>();
  for(const price of input.prices){
    const id=String(price.row_id??'');
    if(price.revision_id!==input.revisionId||!rows.has(id)||prices.has(id))
      throw Object.assign(Error('Artifact price source identity is invalid'),{code:'ARTIFACT_SOURCE_INVALID'});
    prices.set(id,price);
  }
  return input.rows.map(row=>{
    if(row.revision_id!==input.revisionId)throw Object.assign(Error('Artifact row revision identity is invalid'),{code:'ARTIFACT_SOURCE_INVALID'});
    const price=prices.get(String(row.row_id));
    return {...row,price_snapshot_id:price?.price_snapshot_id??null,price_resolution_trace:price?.resolution_trace??{}};
  });
}
