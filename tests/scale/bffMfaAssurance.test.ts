import http from "http";
import { createBffStagingHttpServer } from "../../scripts/server/stagingBffHttpServer";
import { applyBffReadonlyRequestIdentity } from "../../scripts/server/stagingBffRequestAuth";

const actorId = "9bf0d8f2-8876-493f-bb8b-5901b1610102";
const authOrigin = "https://mfa-proof.example.supabase.co";

describe("BFF authoritative mobile MFA assurance", () => {
  it.each<[string, string | undefined, unknown, number]>([
    ["non-enrolled AAL1", "aal1", undefined, 200],
    ["empty factor list AAL1", "aal1", [], 200],
    ["pending factor AAL1", "aal1", [{ status: "unverified", factor_type: "totp" }], 200],
    ["verified TOTP AAL1", "aal1", [{ status: "verified", factor_type: "totp" }], 401],
    ["verified phone AAL1", "aal1", [{ status: "verified", factor_type: "phone" }], 401],
    ["verified factor missing AAL", undefined, [{ status: "verified", factor_type: "totp" }], 401],
    ["verified factor AAL2", "aal2", [{ status: "verified", factor_type: "totp" }], 200],
    ["mixed pending and verified AAL1", "aal1", [{ status: "unverified" }, { status: "verified" }], 401],
    ["malformed factor list", "aal2", { status: "verified" }, 401],
    ["malformed factor entry", "aal2", [null], 401],
  ])("%s", async (_name, aal, factors, expectedStatus) => {
    const realFetch = globalThis.fetch;
    const payload = { sub: actorId, role: "authenticated", ...(aal ? { aal } : {}) };
    const token = `test-header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.test-signature`;
    const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input) === `${authOrigin}/auth/v1/user`) {
        expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${token}`);
        return new Response(JSON.stringify({
          id: actorId, factors,
          // A hostile editable claim must not disable a verified second factor.
          user_metadata: { mfa_enabled: false, aal: "aal2" },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return realFetch(input, init);
    });
    const query = jest.fn(async (_text: string, _values?: unknown[]) => ({ rows: [] }));
    const read = jest.fn(async () => {
      await applyBffReadonlyRequestIdentity({ query });
      return [];
    });
    const server: http.Server = createBffStagingHttpServer({
      BFF_READONLY_MOBILE_AUTH_STAGING_ENABLED: "true",
      STAGING_SUPABASE_URL: authOrigin,
      STAGING_SUPABASE_ANON_KEY: "synthetic-anon-key",
    }, { readPortsFactory: () => ({
      requestProposal: { listRequestProposals: read },
      marketplaceCatalog: { searchCatalog: async () => [] },
      warehouseLedger: { listWarehouseLedger: async () => [] },
      accountantInvoice: { listAccountantInvoices: async () => [] },
      directorPending: { listDirectorPending: async () => [] },
    }) });
    try {
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("TEST_LISTEN_FAILED");
      const response = await realFetch(`http://127.0.0.1:${address.port}/api/staging-bff/read/request-proposal-list`, {
        method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ input: { page: 0, pageSize: 5 } }),
      });
      expect(response.status).toBe(expectedStatus);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      if (expectedStatus === 401) {
        expect(read).not.toHaveBeenCalled();
        expect(query).not.toHaveBeenCalled();
      } else {
        expect(read).toHaveBeenCalledTimes(1);
        const claimsCall = query.mock.calls.find((call) => String(call[0]).includes("request.jwt.claims"));
        expect(claimsCall).toBeDefined();
        const verified = JSON.parse(String(claimsCall?.[1]?.[0]));
        expect(verified).toMatchObject({ sub: actorId, role: "authenticated" });
        expect(verified.aal).toBe(aal);
      }
      expect(JSON.stringify(await response.json())).not.toContain(token);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      fetchMock.mockRestore();
    }
  });
});
