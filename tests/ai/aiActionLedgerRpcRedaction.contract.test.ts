import fs from "node:fs";
import path from "node:path";

import { createAiActionLedgerRpcRepository } from "../../src/features/ai/actionLedger/aiActionLedgerRpcRepository";

describe("AI action ledger RPC redaction", () => {
  it("keeps runtime mount server-side and free of mobile service role usage", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/features/ai/actionLedger/aiActionLedgerRuntimeMount.ts"),
      "utf8",
    );

    expect(source).toContain("serverSideOnly: true");
    expect(source).toContain("redactedPayloadOnly: true");
    expect(source).toContain("serviceRoleFromMobile: false");
    expect(source).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE_KEY|auth\.admin|listUsers/);
  });

  it("returns readiness without exposing raw organization or actor ids", () => {
    const mount = createAiActionLedgerRpcRepository({
      organizationId: "not-a-uuid",
      actorUserId: "buyer-user",
      actorRole: "buyer",
    });

    expect(mount.readiness).toMatchObject({
      ready: false,
      mounted: false,
      blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
      rawIdsExposed: false,
      finalExecution: false,
      serviceRoleFromMobile: false,
    });
    expect(JSON.stringify(mount.readiness)).not.toContain("buyer-user");
  });
});
