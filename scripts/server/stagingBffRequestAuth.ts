import { AsyncLocalStorage } from "node:async_hooks";

export type BffVerifiedMobilePrincipal = {
  userId: string;
  claims: Record<string, unknown>;
};

type BffRequestAuth =
  | { kind: "server" }
  | { kind: "mobile"; principal: BffVerifiedMobilePrincipal };

const requestAuth = new AsyncLocalStorage<BffRequestAuth>();

export function withBffRequestAuth<T>(auth: BffRequestAuth, action: () => T): T {
  return requestAuth.run(auth, action);
}

/** Call after BEGIN, before any application SQL, on the same dedicated client. */
export async function applyBffReadonlyRequestIdentity(client: {
  query: (text: string, values?: unknown[]) => Promise<unknown>;
}): Promise<void> {
  const auth = requestAuth.getStore();
  // Direct internal port calls retain their existing trusted-server contract.
  if (auth?.kind !== "mobile") return;
  const userId = auth.principal.userId.trim();
  if (!userId) throw new Error("BFF_VERIFIED_PRINCIPAL_REQUIRED");
  const claims = { ...auth.principal.claims, sub: userId, role: "authenticated" };
  // Failure to assume the authenticated role aborts the transaction, never falls back.
  await client.query("set local role authenticated");
  await client.query("set local row_security = on");
  await client.query(
    "select set_config('request.jwt.claims', $1, true), " +
      "set_config('request.jwt.claim.sub', $2, true), " +
      "set_config('request.jwt.claim.role', 'authenticated', true)",
    [JSON.stringify(claims), userId],
  );
}
