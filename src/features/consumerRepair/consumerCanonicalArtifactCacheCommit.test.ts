import type { ConsumerRepairDraftBundle } from '../../lib/consumerRequests/consumerRequestTypes';
import { awaitConsumerRepairBundleDurableCommit } from '../../lib/consumerRequests/consumerRequestRepository';
import { bindConsumerRepairCanonicalArtifactReady } from '../../lib/consumerRequests/consumerRequestService';
import { getCanonicalEstimateArtifact } from '../../lib/estimate/backendPlatform/canonicalEstimateClient';
import { ESTIMATE_PLATFORM_API_VERSION, type CanonicalEstimateArtifactView } from '../../lib/estimate/backendPlatform/contracts';
import { restoreConsumerCanonicalReadyArtifactBindings } from './consumerCanonicalArtifactHydration';
jest.mock('../../lib/consumerRequests/consumerRequestRepository',()=>({awaitConsumerRepairBundleDurableCommit:jest.fn()}));
jest.mock('../../lib/consumerRequests/consumerRequestService',()=>({bindConsumerRepairCanonicalArtifactReady:jest.fn()}));
jest.mock('../../lib/estimate/backendPlatform/canonicalEstimateClient',()=>({getCanonicalEstimateArtifact:jest.fn(),buildCanonicalEstimateArtifact:jest.fn(),assertCanonicalEstimateArtifactIdentity:jest.fn()}));
const binding={revisionId:'saved-revision',releaseId:'saved-release'},bundle={draft:{id:'saved-draft',status:'draft'}}as ConsumerRepairDraftBundle,
 bound={...bundle},read=jest.mocked(getCanonicalEstimateArtifact),commit=jest.mocked(awaitConsumerRepairBundleDurableCommit),bind=jest.mocked(bindConsumerRepairCanonicalArtifactReady);
const view=(kind:'pdf'|'procurement'):CanonicalEstimateArtifactView=>({apiVersion:ESTIMATE_PLATFORM_API_VERSION,artifactId:'saved-'+kind,...binding,kind,status:'ready',contentType:null,byteSize:null,sha256:null,metadata:{},errorCode:null,createdAt:'2026-10-21T00:00:00Z',updatedAt:'2026-10-21T00:00:00Z',readyAt:'2026-10-21T00:00:00Z',signedUrl:null,signedUrlExpiresAt:null});
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
beforeEach(()=>{jest.clearAllMocks();read.mockImplementation(async({kind})=>view(kind==='procurement'?'procurement':'pdf'));bind.mockReturnValue(bound);commit.mockResolvedValue();});
it('opens an already durable revision while its optional document binding cache is still committing',async()=>{
 let release!:()=>void;const pending=new Promise<void>(r=>{release=r;});commit.mockReturnValueOnce(pending);let resolved=false;
 const restore=restoreConsumerCanonicalReadyArtifactBindings({bundle,binding,onPersistenceError:jest.fn()}).then(b=>{resolved=true;return b;});
 try{await flush();expect(read).toHaveBeenCalledTimes(2);expect(bind).toHaveBeenCalledTimes(2);expect(commit).toHaveBeenCalledWith({requestDraftId:'saved-draft',expectedStatus:'draft',expectedRevisionId:'saved-revision'});expect(resolved).toBe(true);}
 finally{release();await restore;}
 await expect(restore).resolves.toBe(bound);
});
it('keeps valid backend document identities visible and reports a later cache persistence failure',async()=>{
 let fail!:(error:Error)=>void;commit.mockReturnValueOnce(new Promise<void>((_,reject)=>{fail=reject;}));const onPersistenceError=jest.fn();let resolved=false;
 const restore=restoreConsumerCanonicalReadyArtifactBindings({bundle,binding,onPersistenceError}).then(b=>{resolved=true;return b;});
 await flush();expect(resolved).toBe(true);const error=new Error('local cache unavailable');fail(error);await flush();await expect(restore).resolves.toBe(bound);expect(onPersistenceError).toHaveBeenCalledWith(error);
});
it('rejects another revision before binding or persisting any document cache',async()=>{
 read.mockResolvedValue({...view('pdf'),revisionId:'foreign-revision'});
 await expect(restoreConsumerCanonicalReadyArtifactBindings({bundle,binding,onPersistenceError:jest.fn()})).rejects.toMatchObject({code:'CANONICAL_ARTIFACT_COLD_REOPEN_IDENTITY_MISMATCH'});
 expect(bind).not.toHaveBeenCalled();expect(commit).not.toHaveBeenCalled();
});
