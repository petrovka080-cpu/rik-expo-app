import type { Session } from "@supabase/supabase-js";

import { authPrincipalFingerprint } from "./useAuthLifecycle";

function session(input: {
  userId: string;
  role: string;
  accessToken: string;
  tenantId?: string;
}): Session {
  return {
    access_token: input.accessToken,
    refresh_token: `refresh-${input.accessToken}`,
    expires_in: 3_600,
    token_type: "bearer",
    user: {
      id: input.userId,
      app_metadata: {
        role: input.role,
        tenant_id: input.tenantId ?? "tenant-1",
      },
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-01-01T00:00:00.000Z",
    },
  } as Session;
}

describe("authPrincipalFingerprint", () => {
  it("does not treat a rotated access token as a principal state change", () => {
    expect(
      authPrincipalFingerprint(
        session({ userId: "user-1", role: "consumer", accessToken: "token-2" }),
      ),
    ).toBe(
      authPrincipalFingerprint(
        session({ userId: "user-1", role: "consumer", accessToken: "token-1" }),
      ),
    );
  });

  it("changes when the effective role or tenant changes", () => {
    const baseline = authPrincipalFingerprint(
      session({ userId: "user-1", role: "consumer", accessToken: "token-1" }),
    );
    expect(
      authPrincipalFingerprint(
        session({ userId: "user-1", role: "buyer", accessToken: "token-2" }),
      ),
    ).not.toBe(baseline);
    expect(
      authPrincipalFingerprint(
        session({
          userId: "user-1",
          role: "consumer",
          accessToken: "token-2",
          tenantId: "tenant-2",
        }),
      ),
    ).not.toBe(baseline);
  });

  it("returns null without a verified provider session", () => {
    expect(authPrincipalFingerprint(null)).toBeNull();
  });
});
