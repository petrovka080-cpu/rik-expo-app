import { applyBffReadonlyRequestIdentity, withBffRequestAuth } from "../../scripts/server/stagingBffRequestAuth";

const mobile = (userId: string) => ({
  kind: "mobile" as const,
  principal: { userId, claims: { sub: "forged-subject", role: "service_role", tenant_id: "signed-tenant" } },
});

it("binds the verified subject and authenticated role while retaining signed custom claims", async () => {
  const query = jest.fn(async (_sql: string, _values?: unknown[]) => ({}));
  await withBffRequestAuth(mobile("user-a"), () => applyBffReadonlyRequestIdentity({ query }));
  expect(query.mock.calls[0][0]).toBe("set local role authenticated");
  const values = query.mock.calls.find(([sql]) => sql.includes("request.jwt.claims"))?.[1];
  expect(JSON.parse(String(values?.[0]))).toEqual({ sub: "user-a", role: "authenticated", tenant_id: "signed-tenant" });
  expect(values?.[1]).toBe("user-a");
});

it("propagates role-assumption failures without proceeding to claims or application SQL", async () => {
  const query = jest.fn(async () => { throw new Error("permission denied"); });
  await expect(withBffRequestAuth(mobile("user-a"), () => applyBffReadonlyRequestIdentity({ query })))
    .rejects.toThrow("permission denied");
  expect(query).toHaveBeenCalledTimes(1);
});

it("isolates asynchronous contexts between concurrent mobile requests", async () => {
  const subjects: string[] = [];
  await Promise.all(["user-a", "user-b"].map(userId => withBffRequestAuth(mobile(userId), async () => {
    await new Promise(resolve => setTimeout(resolve, userId === "user-a" ? 5 : 1));
    await applyBffReadonlyRequestIdentity({ query: async (sql, values) => {
      if (sql.includes("request.jwt.claims")) {
        expect(JSON.parse(String(values?.[0])).sub).toBe(userId);
        subjects.push(String(values?.[1]));
      }
    } });
  })));
  expect(subjects.sort()).toEqual(["user-a", "user-b"]);
});

it("restores the trusted server context after a mobile request finishes", async () => {
  const query = jest.fn(async () => ({}));
  await withBffRequestAuth(mobile("user-a"), () => applyBffReadonlyRequestIdentity({ query }));
  query.mockClear();
  await withBffRequestAuth({ kind: "server" }, () => applyBffReadonlyRequestIdentity({ query }));
  await applyBffReadonlyRequestIdentity({ query });
  expect(query).not.toHaveBeenCalled();
});
