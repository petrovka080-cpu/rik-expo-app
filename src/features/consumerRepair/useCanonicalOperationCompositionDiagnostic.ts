import type {CanonicalEstimateRevisionView} from '../../lib/estimate/backendPlatform/contracts';
import * as React from 'react';
import {getCanonicalEstimateRevision} from '../../lib/estimate/backendPlatform/canonicalEstimateClient';
import type {CanonicalEstimateOperationResourceAcceptanceV1} from '../../lib/estimate/backendPlatform/canonicalEstimateOperationComposition';

export type CanonicalOperationCompositionDiagnostic = Readonly<{
  state:'PENDING'|'AVAILABLE'|'UNAVAILABLE';
  errorCode?:string;
  acceptance?:CanonicalEstimateOperationResourceAcceptanceV1; revision?:CanonicalEstimateRevisionView;
}>;

/** Transient read of the same immutable saved revision on cold/detail reopen.
 * No new persisted approval, row audit, calculation or current definition. */
export function useCanonicalOperationCompositionDiagnostic(binding:{revisionId:string;releaseId:string;checksumSha256?:string}|null):CanonicalOperationCompositionDiagnostic|null {
  const revisionId=binding?.revisionId,releaseId=binding?.releaseId,checksum=binding?.checksumSha256;
  const identity=revisionId&&releaseId?`${revisionId}:${releaseId}:${checksum??''}`:null;
  const [read,setRead]=React.useState<{identity:string;diagnostic:CanonicalOperationCompositionDiagnostic}|null>(null);
  React.useEffect(()=>{
    if(!identity||!revisionId||!releaseId)return;
    let disposed=false;
    setRead({identity,diagnostic:{state:'PENDING'}});
    void getCanonicalEstimateRevision(revisionId).then(revision=>{
      if(disposed)return;
      const acceptance=revision.operationResourceAcceptanceV1;
      const matches=revision.revisionId===revisionId&&revision.releaseId===releaseId
        &&(!checksum||revision.checksumSha256===checksum);
      setRead({identity,diagnostic:matches&&acceptance?.contractVersion==='canonical-operation-resource-acceptance/v1'
        ? {state:'AVAILABLE',acceptance,revision}:{state:'UNAVAILABLE'}});
    }).catch(error=>{if(!disposed)setRead({identity,diagnostic:{state:'UNAVAILABLE',errorCode:typeof error?.code==='string'?error.code:'REVISION_READ_UNAVAILABLE'}});});
    return()=>{disposed=true;};
  },[identity,revisionId,releaseId,checksum]);
  return !identity?null:read?.identity===identity?read.diagnostic:{state:'PENDING'};
}
