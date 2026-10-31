import {createCanonicalEstimateArtifact,getCanonicalEstimateArtifact,getCanonicalEstimateRevision,resetCanonicalEstimateRuntimeCompatibilityForTests} from './canonicalEstimateClient';
const mockGetSession=jest.fn(),mockRefreshSession=jest.fn(),mockFetch=jest.fn();
jest.mock('../../supabaseClient',()=>({SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'test-anon',supabase:{auth:{
 getSession:(...args:unknown[])=>mockGetSession(...args),refreshSession:(...args:unknown[])=>mockRefreshSession(...args)}}}));
jest.mock('../../requestTimeoutPolicy',()=>({fetchWithRequestTimeout:(...args:unknown[])=>mockFetch(...args)}));
const input={revisionId:'test-revision',kind:'pdf' as const,documentProfile:'professional_v1' as const,
 issuancePurpose:'PRELIMINARY_REVIEW' as const,idempotencyKey:'test-review-request',reviewRequest:{revisionId:'test-revision',
 releaseId:'test-release',definitionVersionId:'test-definition',checksumSha256:'a'.repeat(64),acknowledgedPreliminaryReview:true as const}};
beforeEach(()=>{
 resetCanonicalEstimateRuntimeCompatibilityForTests();jest.clearAllMocks();
 delete process.env.EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW;delete process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_REQUIRE_RUNTIME_COMPATIBILITY;
 mockGetSession.mockResolvedValue({data:{session:{access_token:'test-session',expires_at:Math.floor(Date.now()/1000)+7200}},error:null});
 mockFetch.mockImplementation(async()=>new Response(JSON.stringify({jobId:null,artifactId:'test-artifact',artifactStatus:'ready'}),{status:200,headers:{'Content-Type':'application/json'}}));
});
test('only explicit review intent and saved tuple enter existing authenticated create; GET preserves purpose',async()=>{
 await createCanonicalEstimateArtifact(input);const [url,request]=mockFetch.mock.calls[0]!;
 expect(url).toContain('/revisions/test-revision/artifacts/pdf');expect(request.method).toBe('POST');
 expect(JSON.parse(request.body)).toEqual({idempotencyKey:input.idempotencyKey,documentProfile:'professional_v1',issuancePurpose:'PRELIMINARY_REVIEW',reviewRequest:input.reviewRequest});
 expect(request.headers).toMatchObject({Authorization:'Bearer test-session'});expect(mockRefreshSession).not.toHaveBeenCalled();
 await getCanonicalEstimateArtifact(input);expect(mockFetch.mock.calls[1]![0]).toContain('documentProfile=professional_v1&issuancePurpose=PRELIMINARY_REVIEW');
 expect(mockFetch.mock.calls[1]![1]?.method??'GET').toBe('GET');expect(mockFetch).toHaveBeenCalledTimes(2);
});
test('ordinary omitted purpose preserves existing wire payload and never adds a review acknowledgment',async()=>{
 await createCanonicalEstimateArtifact({revisionId:'test-revision',kind:'pdf',documentProfile:'professional_v1',idempotencyKey:'ordinary'});
 expect(JSON.parse(mockFetch.mock.calls[0]![1].body)).toEqual({idempotencyKey:'ordinary',documentProfile:'professional_v1'});
 await getCanonicalEstimateArtifact({revisionId:'test-revision',kind:'pdf',documentProfile:'professional_v1'});
 expect(mockFetch.mock.calls[1]![0]).not.toContain('issuancePurpose');
});

test('explicit report header read carries purpose and keeps authentication and signal',async()=>{
 const controller=new AbortController();
 await getCanonicalEstimateRevision('saved/revision',{issuancePurpose:'PRELIMINARY_REVIEW',signal:controller.signal});
 expect(mockFetch.mock.calls[0]![0]).toContain('/revisions/saved%2Frevision?issuancePurpose=PRELIMINARY_REVIEW');
 expect(mockFetch.mock.calls[0]![1].headers).toMatchObject({Authorization:'Bearer test-session'});
 expect(mockFetch.mock.calls[0]![1].signal).toBe(controller.signal);
});
test('existing revision read AbortSignal overload and omitted signal retain ordinary read semantics',async()=>{
 const controller=new AbortController();await getCanonicalEstimateRevision('saved',controller.signal);await getCanonicalEstimateRevision('saved');
 expect(mockFetch.mock.calls[0]![0]).not.toContain('issuancePurpose');
 expect(mockFetch.mock.calls[0]![1].signal).toBe(controller.signal);
 expect(mockFetch.mock.calls[1]![0]).not.toContain('issuancePurpose');
});
test.each(['STANDARD','OTHER',null])('unsupported explicit report read purpose rejects before transport: %s',issuancePurpose=>{
 expect(()=>getCanonicalEstimateRevision('saved',{issuancePurpose} as unknown as Parameters<typeof getCanonicalEstimateRevision>[1]))
  .toThrow(expect.objectContaining({code:'ARTIFACT_PURPOSE_INVALID'}));
 expect(mockFetch).not.toHaveBeenCalled();expect(mockGetSession).not.toHaveBeenCalled();
});
test.each([{...input,kind:'procurement'},{...input,documentProfile:undefined},{...input,issuancePurpose:'UNKNOWN'},
 {...input,issuancePurpose:null}])('rejects unsupported purpose/profile before authentication or transport',bad=>{
 expect(()=>createCanonicalEstimateArtifact(bad as unknown as Parameters<typeof createCanonicalEstimateArtifact>[0])).toThrow(expect.objectContaining({code:'ARTIFACT_PURPOSE_INVALID'}));
 expect(mockGetSession).not.toHaveBeenCalled();expect(mockFetch).not.toHaveBeenCalled();
});
