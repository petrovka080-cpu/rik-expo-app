import {
  getCanonicalEstimateRevision,
  createCanonicalEstimateArtifact,
  getCanonicalEstimateArtifact,
  getCanonicalEstimateJob,
  cancelCanonicalEstimateJob,
  waitForCanonicalEstimateJob,
  getCanonicalEstimateParameterSessionSnapshot,
  resetCanonicalEstimateRuntimeCompatibilityForTests,
} from "./canonicalEstimateClient";
import { createConsumerEstimateHydrationTrace, type ConsumerEstimateHydrationPhaseEvent } from "../../consumerRequests/consumerEstimateHydrationTrace";

const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();
const mockFetchWithRequestTimeout = jest.fn();

jest.mock("../../supabaseClient", () => ({
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
    },
  },
}));

jest.mock("../../requestTimeoutPolicy", () => ({
  fetchWithRequestTimeout: (...args: unknown[]) => mockFetchWithRequestTimeout(...args),
}));

const revisionId = "11111111-1111-4111-8111-111111111111";
const successfulResponse = () => new Response(
  JSON.stringify({ revisionId }),
  { status: 200, headers: { "Content-Type": "application/json" } },
);

const runtimeTuple = {
  definitionReleaseId: "definition-release", searchReleaseId: "search-release",
  sourceHead: "source-head", sourceTree: "source-tree", frontendSourceTreeHash: "source-tree",
  frontendProductSourceHash: "product-tree", frontendJsBundleFingerprint: "bundle-fingerprint", capabilityId: "capability-id",
};
function configureCompatibleRuntime() {
  Object.assign(process.env, {
    EXPO_PUBLIC_CANONICAL_ESTIMATE_REQUIRE_RUNTIME_COMPATIBILITY: "true",
    EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID: runtimeTuple.definitionReleaseId,
    EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID: runtimeTuple.searchReleaseId,
    EXPO_PUBLIC_BUILD_COMMIT: runtimeTuple.sourceHead,
    EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH: runtimeTuple.sourceTree,
    EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH: runtimeTuple.frontendProductSourceHash,
    EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT: runtimeTuple.frontendJsBundleFingerprint,
    EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID: runtimeTuple.capabilityId,
  });
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: "token", expires_at: Math.floor(Date.now() / 1000) + 7200 } }, error: null,
  });
}
function busyCompatibleManifest() {
  return { runtimeRole: "FULL_CANONICAL_ESTIMATE_BACKEND", authMode: "STRICT_SESSION_INTROSPECTION",
    activeCompileJobCount: 1, capability: { status: "ACTIVE", ttlSeconds: 7200 }, compatibilityTuple: { ...runtimeTuple } };
}

describe("canonicalEstimateClient access-token refresh", () => {
  it('explains a rejected composition change without exposing its code or retrying the mutation', async () => {
    mockGetSession.mockResolvedValue({data:{session:{access_token:'token',expires_at:Math.floor(Date.now()/1000)+7200}},error:null});
    mockFetchWithRequestTimeout.mockResolvedValue(new Response(JSON.stringify({jobId:revisionId,status:'failed',errorCode:'COMPOSITION_SELECTION_INVALID',resultRevisionId:null}),{status:200,headers:{'Content-Type':'application/json'}}));
    await expect(waitForCanonicalEstimateJob({jobId:revisionId})).rejects.toMatchObject({code:'COMPOSITION_SELECTION_INVALID',httpStatus:422,retryable:false,
      message:'Изменение состава не выполнено. Для выбранной подработы нужно проверить общие ресурсы и применимость состава. Исходная смета и ручные данные сохранены.'});
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout.mock.calls[0]?.[1]?.method??'GET').toBe('GET');
  });
  beforeEach(() => {
    mockGetSession.mockReset();
    mockRefreshSession.mockReset();
    mockFetchWithRequestTimeout.mockReset();
    resetCanonicalEstimateRuntimeCompatibilityForTests();
    for (const name of [
      "EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW",
      "EXPO_PUBLIC_CANONICAL_ESTIMATE_REQUIRE_RUNTIME_COMPATIBILITY",
      "EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID",
      "EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID",
      "EXPO_PUBLIC_BUILD_COMMIT",
      "EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH",
      "EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH",
      "EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT",
      "EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID",
    ]) delete process.env[name];
  });

  it("refreshes a session that is inside the expiry skew before transport", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "near-expiry-token",
          expires_at: Math.floor(Date.now() / 1_000) + 2,
        },
      },
      error: null,
    });
    mockRefreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: "fresh-token",
          expires_at: Math.floor(Date.now() / 1_000) + 60,
        },
      },
      error: null,
    });
    mockFetchWithRequestTimeout.mockResolvedValue(successfulResponse());

    await expect(getCanonicalEstimateRevision(revisionId)).resolves.toMatchObject({ revisionId });

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: "Bearer fresh-token" }),
    });
  });

  it("refreshes and retries exactly once after the backend returns 401", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "initial-token",
          expires_at: Math.floor(Date.now() / 1_000) + 60,
        },
      },
      error: null,
    });
    mockRefreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: "refreshed-token",
          expires_at: Math.floor(Date.now() / 1_000) + 60,
        },
      },
      error: null,
    });
    mockFetchWithRequestTimeout
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ error: { code: "AUTH_REQUIRED", message: "expired" } }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ))
      .mockResolvedValueOnce(successfulResponse());

    await expect(getCanonicalEstimateRevision(revisionId)).resolves.toMatchObject({ revisionId });

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(2);
    expect(mockFetchWithRequestTimeout.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: "Bearer initial-token" }),
    });
    expect(mockFetchWithRequestTimeout.mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: "Bearer refreshed-token" }),
    });
    expect(mockFetchWithRequestTimeout.mock.calls[1]?.[0]).toBe(
      mockFetchWithRequestTimeout.mock.calls[0]?.[0],
    );
  });

  it("shares one refresh among concurrent near-expiry requests", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "near-expiry-token",
          expires_at: Math.floor(Date.now() / 1_000) + 2,
        },
      },
      error: null,
    });
    let resolveRefresh: ((value: unknown) => void) | null = null;
    mockRefreshSession.mockImplementation(() => new Promise((resolve) => {
      resolveRefresh = resolve;
    }));
    mockFetchWithRequestTimeout.mockImplementation(async () => successfulResponse());

    const first = getCanonicalEstimateRevision(revisionId);
    const second = getCanonicalEstimateRevision(revisionId);
    await Promise.resolve();
    await Promise.resolve();
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);

    const completeRefresh = resolveRefresh as ((value: unknown) => void) | null;
    if (!completeRefresh) throw new Error("refresh resolver was not installed");
    completeRefresh({
      data: {
        session: {
          access_token: "shared-fresh-token",
          expires_at: Math.floor(Date.now() / 1_000) + 60,
        },
      },
      error: null,
    });
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);

    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(2);
    for (const call of mockFetchWithRequestTimeout.mock.calls) {
      expect(call[1]).toMatchObject({
        headers: expect.objectContaining({ Authorization: "Bearer shared-fresh-token" }),
      });
    }
  });

  it.each([
    ["EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW", "1"],
    ["EXPO_PUBLIC_CANONICAL_ESTIMATE_REQUIRE_RUNTIME_COMPATIBILITY", "true"],
  ])("checks the exact runtime tuple before transport with %s", async (mode, flag) => {
    Object.assign(process.env, {
      [mode]: flag,
      EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID: "definition-release",
      EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID: "search-release",
      EXPO_PUBLIC_BUILD_COMMIT: "source-head",
      EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH: "source-tree",
      EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH: "product-tree",
      EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT: "bundle-fingerprint",
      EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID: "capability-id",
    });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "token", expires_at: Math.floor(Date.now() / 1_000) + 60 } },
      error: null,
    });
    mockFetchWithRequestTimeout
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runtimeRole: "FULL_CANONICAL_ESTIMATE_BACKEND",
        authMode: "STRICT_SESSION_INTROSPECTION",
        activeCompileJobCount: 0,
        capability: { status: "ACTIVE", ttlSeconds: 7200 },
        compatibilityTuple: {
          definitionReleaseId: "definition-release",
          searchReleaseId: "search-release",
          sourceHead: "source-head",
          sourceTree: "source-tree",
          frontendSourceTreeHash: "source-tree",
          frontendProductSourceHash: "product-tree",
          frontendJsBundleFingerprint: "bundle-fingerprint",
          capabilityId: "capability-id",
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(successfulResponse());

    await expect(getCanonicalEstimateRevision(revisionId)).resolves.toMatchObject({ revisionId });
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(2);
    expect(String(mockFetchWithRequestTimeout.mock.calls[0]?.[0])).toContain("runtime-manifest");
    expect(mockFetchWithRequestTimeout.mock.calls[0]?.[2]).toMatchObject({
      requestClass: "ui_scope_load",
      owner: "canonical_estimate_client",
      operation: "runtime-manifest",
    });
  });

  it.each([
    ["EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW", "1"],
    ["EXPO_PUBLIC_CANONICAL_ESTIMATE_REQUIRE_RUNTIME_COMPATIBILITY", "true"],
  ])("fails closed on frontend/backend mismatch with %s", async (mode, flag) => {
    Object.assign(process.env, {
      [mode]: flag,
      EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID: "definition-release",
      EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID: "search-release",
      EXPO_PUBLIC_BUILD_COMMIT: "source-head",
      EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH: "source-tree",
      EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH: "product-tree",
      EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT: "bundle-fingerprint",
      EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID: "capability-id",
    });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "token", expires_at: Math.floor(Date.now() / 1_000) + 60 } },
      error: null,
    });
    mockFetchWithRequestTimeout.mockResolvedValue(new Response(JSON.stringify({
      runtimeRole: "FULL_CANONICAL_ESTIMATE_BACKEND",
      authMode: "STRICT_SESSION_INTROSPECTION",
      activeCompileJobCount: 0,
      capability: { status: "ACTIVE", ttlSeconds: 7200 },
      compatibilityTuple: { definitionReleaseId: "stale-release" },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(getCanonicalEstimateRevision(revisionId)).rejects.toMatchObject({
      code: "RUNTIME_COMPATIBILITY_MISMATCH_definitionReleaseId",
    });
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(1);
  });

  it("does not bypass a missing tuple for the ordinary whole-app session", async () => {
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_REQUIRE_RUNTIME_COMPATIBILITY = "true";
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "ordinary-token", expires_at: Math.floor(Date.now() / 1_000) + 60 } },
      error: null,
    });
    await expect(getCanonicalEstimateRevision(revisionId)).rejects.toMatchObject({
      code: "RUNTIME_COMPATIBILITY_CONFIG_MISSING",
    });
    expect(mockFetchWithRequestTimeout).not.toHaveBeenCalled();
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it("keeps PDF, own-job polling and cancellation available on a compatible busy runtime after cache expiry", async () => {
    let now = 1_800_000_000_000;
    const clock = jest.spyOn(Date, "now").mockImplementation(() => now);
    try {
      configureCompatibleRuntime();
      mockFetchWithRequestTimeout.mockImplementation(async (url: string) => {
        const payload = url.endsWith("/runtime-manifest") ? busyCompatibleManifest()
          : url.endsWith("/jobs/own-job/cancel") ? { jobId: "own-job", status: "cancelled" }
          : url.endsWith("/jobs/own-job") ? { jobId: "own-job", status: "running" }
          : url.includes("/artifacts/pdf") ? { revisionId, jobId: "own-job", artifactId: "own-artifact" }
          : { revisionId };
        return new Response(JSON.stringify(payload), { status: 200 });
      });
      await expect(getCanonicalEstimateRevision(revisionId)).resolves.toMatchObject({ revisionId });
      now += 31_000;
      await expect(createCanonicalEstimateArtifact({ revisionId, kind: "pdf", documentProfile: "professional_v1", idempotencyKey: "same-pdf" }))
        .resolves.toMatchObject({ jobId: "own-job" });
      now += 31_000;
      const signal = new AbortController().signal;
      await expect(getCanonicalEstimateJob("own-job", signal)).resolves.toMatchObject({ status: "running" });
      now += 31_000;
      await expect(cancelCanonicalEstimateJob("own-job", signal)).resolves.toMatchObject({ status: "cancelled" });
      await expect(getCanonicalEstimateArtifact({ revisionId, kind: "pdf", documentProfile: "professional_v1" }))
        .resolves.toMatchObject({ artifactId: "own-artifact" });
      const calls = mockFetchWithRequestTimeout.mock.calls;
      expect(calls.filter(([url]) => String(url).endsWith("/runtime-manifest"))).toHaveLength(4);
      const targets = calls.filter(([url]) => !String(url).endsWith("/runtime-manifest"));
      expect(targets.map(([url]) => String(url).replace("https://example.supabase.co/functions/v1/canonical-estimate/", ""))).toEqual([
        `revisions/${revisionId}`, `revisions/${revisionId}/artifacts/pdf`, "jobs/own-job", "jobs/own-job/cancel",
        `revisions/${revisionId}/artifacts/pdf?documentProfile=professional_v1`,
      ]);
      expect(targets[1]?.[1]).toMatchObject({ method: "POST", body: JSON.stringify({ idempotencyKey: "same-pdf", documentProfile: "professional_v1" }) });
      expect(targets[2]?.[1]).toMatchObject({ method: "GET", signal });
      expect(targets[3]?.[1]).toMatchObject({ method: "POST", signal });
      expect(mockRefreshSession).not.toHaveBeenCalled();
    } finally { clock.mockRestore(); }
  });

  it.each(Object.keys(runtimeTuple) as Array<keyof typeof runtimeTuple>)("still rejects a busy runtime with mismatched %s before the PDF request", async key => {
    configureCompatibleRuntime();
    const manifest = busyCompatibleManifest();
    manifest.compatibilityTuple[key] = "stale-value";
    mockFetchWithRequestTimeout.mockResolvedValue(new Response(JSON.stringify(manifest), { status: 200 }));
    await expect(getCanonicalEstimateArtifact({ revisionId, kind: "pdf" })).rejects.toMatchObject({ code: `RUNTIME_COMPATIBILITY_MISMATCH_${key}` });
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(1);
  });

  it.each(["role", "auth", "inactive-capability", "short-ttl", "http-error"])("still rejects a busy runtime with %s before job transport", async invalid => {
    configureCompatibleRuntime();
    const manifest = busyCompatibleManifest();
    if (invalid === "role") manifest.runtimeRole = "OTHER_BACKEND";
    if (invalid === "auth") manifest.authMode = "UNVERIFIED";
    if (invalid === "inactive-capability") manifest.capability.status = "REVOKED";
    if (invalid === "short-ttl") manifest.capability.ttlSeconds = 3599;
    mockFetchWithRequestTimeout.mockResolvedValue(new Response(JSON.stringify(manifest), { status: invalid === "http-error" ? 503 : 200 }));
    await expect(getCanonicalEstimateJob("own-job")).rejects.toMatchObject({ code: "RUNTIME_MANIFEST_NOT_READY" });
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(1);
  });

  it("separates snapshot auth, exact runtime compatibility, HTTP and decoding without recording contents", async () => {
    let time = 0;
    const events: ConsumerEstimateHydrationPhaseEvent[] = [];
    const trace = createConsumerEstimateHydrationTrace({ clock: () => time, report: event => { events.push(event); } });
    Object.assign(process.env, {
      EXPO_PUBLIC_CANONICAL_ESTIMATE_REQUIRE_RUNTIME_COMPATIBILITY: "true",
      EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID: "definition-release",
      EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID: "search-release",
      EXPO_PUBLIC_BUILD_COMMIT: "source-head",
      EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH: "source-tree",
      EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH: "product-tree",
      EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT: "bundle-fingerprint",
      EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID: "capability-id",
    });
    mockGetSession.mockImplementation(async () => {
      time += 7;
      return { data: { session: { access_token: "private-auth", expires_at: Math.floor(Date.now() / 1000) + 60 } }, error: null };
    });
    const payload = { revision: { revisionId, parameters: { privateBusiness: "private-specification" } }, catalog: {}, parent: null };
    const response = new Response(JSON.stringify(payload), { status: 200 });
    const json = response.json.bind(response);
    response.json = async () => { time += 19; return json(); };
    mockFetchWithRequestTimeout
      .mockImplementationOnce(async () => {
        time += 41;
        return new Response(JSON.stringify({ runtimeRole: "FULL_CANONICAL_ESTIMATE_BACKEND", authMode: "STRICT_SESSION_INTROSPECTION",
          activeCompileJobCount: 0, capability: { status: "ACTIVE", ttlSeconds: 7200 }, compatibilityTuple: {
            definitionReleaseId: "definition-release", searchReleaseId: "search-release", sourceHead: "source-head", sourceTree: "source-tree",
            frontendSourceTreeHash: "source-tree", frontendProductSourceHash: "product-tree", frontendJsBundleFingerprint: "bundle-fingerprint", capabilityId: "capability-id",
          } }), { status: 200 });
      })
      .mockImplementationOnce(async () => { time += 13; return response; });
    const signal = new AbortController().signal;
    await expect(getCanonicalEstimateParameterSessionSnapshot(revisionId, signal, trace)).resolves.toEqual(payload);
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(2);
    expect(mockFetchWithRequestTimeout.mock.calls[1]?.[1]).toMatchObject({ method: "GET", signal });
    expect(mockFetchWithRequestTimeout.mock.calls[1]?.[2]).toMatchObject({ requestClass: "ui_scope_load" });
    expect(events.map(({ phase, durationMs, status }) => ({ phase, durationMs, status }))).toEqual([
      { phase: "PARAMETER_TRANSPORT_AUTH", durationMs: 7, status: "completed" },
      { phase: "PARAMETER_TRANSPORT_COMPATIBILITY", durationMs: 41, status: "completed" },
      { phase: "PARAMETER_TRANSPORT_HTTP", durationMs: 13, status: "completed" },
      { phase: "PARAMETER_TRANSPORT_DECODE", durationMs: 19, status: "completed" },
    ]);
    for (const event of events) expect(Object.keys(event).sort()).toEqual(["durationMs", "elapsedMs", "phase", "status", "trace"]);
    expect(JSON.stringify(events)).not.toMatch(/private-|parameters|revisionId|source-head|11111111|Bearer/u);
  });

  it("tracing preserves the single 401 refresh/retry without retaining a token or response in events", async () => {
    const events: ConsumerEstimateHydrationPhaseEvent[] = [];
    const trace = createConsumerEstimateHydrationTrace({ report: event => { events.push(event); } });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "private-initial", expires_at: Math.floor(Date.now() / 1000) + 60 } }, error: null });
    mockRefreshSession.mockResolvedValue({ data: { session: { access_token: "private-refreshed" } }, error: null });
    mockFetchWithRequestTimeout.mockResolvedValueOnce(new Response("private-401-body", { status: 401 })).mockResolvedValueOnce(successfulResponse());
    await expect(getCanonicalEstimateParameterSessionSnapshot(revisionId, null, trace)).resolves.toEqual({ revisionId });
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(2);
    expect(events.map(event => event.phase)).toEqual([
      "PARAMETER_TRANSPORT_AUTH", "PARAMETER_TRANSPORT_COMPATIBILITY", "PARAMETER_TRANSPORT_HTTP",
      "PARAMETER_TRANSPORT_AUTH", "PARAMETER_TRANSPORT_COMPATIBILITY", "PARAMETER_TRANSPORT_HTTP", "PARAMETER_TRANSPORT_DECODE",
    ]);
    expect(JSON.stringify(events)).not.toMatch(/private-|11111111|Bearer/u);
  });

  it("tracing preserves fail-closed compatibility and the original transport rejection", async () => {
    const events: ConsumerEstimateHydrationPhaseEvent[] = [];
    const trace = createConsumerEstimateHydrationTrace({ report: event => { events.push(event); } });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "private-auth", expires_at: Math.floor(Date.now() / 1000) + 60 } }, error: null });
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_REQUIRE_RUNTIME_COMPATIBILITY = "true";
    await expect(getCanonicalEstimateParameterSessionSnapshot(revisionId, null, trace)).rejects.toMatchObject({ code: "RUNTIME_COMPATIBILITY_CONFIG_MISSING" });
    expect(mockFetchWithRequestTimeout).not.toHaveBeenCalled();
    expect(events.at(-1)).toMatchObject({ phase: "PARAMETER_TRANSPORT_COMPATIBILITY", status: "failed" });
    delete process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_REQUIRE_RUNTIME_COMPATIBILITY;
    const error = new Error("private-network-body");
    mockFetchWithRequestTimeout.mockRejectedValue(error);
    await expect(getCanonicalEstimateParameterSessionSnapshot(revisionId, null, trace)).rejects.toBe(error);
    expect(events.at(-1)).toMatchObject({ phase: "PARAMETER_TRANSPORT_HTTP", status: "failed" });
    expect(JSON.stringify(events)).not.toMatch(/private-|CONFIG_MISSING|11111111/u);
  });

  it("a failing diagnostic sink cannot change successful or malformed-response normalization", async () => {
    const trace = createConsumerEstimateHydrationTrace({ report: () => { throw new Error("private-sink-error"); } });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "private-auth", expires_at: Math.floor(Date.now() / 1000) + 60 } }, error: null });
    mockFetchWithRequestTimeout.mockResolvedValueOnce(successfulResponse()).mockResolvedValueOnce(new Response("malformed", { status: 502 }));
    await expect(getCanonicalEstimateParameterSessionSnapshot(revisionId, null, trace)).resolves.toEqual({ revisionId });
    await expect(getCanonicalEstimateParameterSessionSnapshot(revisionId, null, trace)).rejects.toMatchObject({ code: "BACKEND_OPERATION_FAILED", httpStatus: 502 });
    expect(mockFetchWithRequestTimeout).toHaveBeenCalledTimes(2);
  });
});
