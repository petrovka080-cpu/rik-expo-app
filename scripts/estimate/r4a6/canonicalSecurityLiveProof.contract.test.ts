import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "scripts/estimate/r4a6/runR4A6CanonicalSecurityLiveProof.ts"),
  "utf8",
);

describe("R4-A6 canonical security live proof", () => {
  it("is rollback-only and covers canonical revision descendants", () => {
    expect(source).toContain('await client.query("begin")');
    expect(source).toContain('await client.query("rollback")');
    expect(source).not.toContain('await client.query("commit")');
    expect(source).toContain('await setActor(client, "authenticated", ownerId)');
    expect(source).toContain('await setActor(client, "authenticated", foreignUserId)');
    expect(source).toContain('"estimate_revision_artifact"');
    expect(source).toContain('"estimate_revision_photo_attachment"');
    expect(source).toContain('"estimate_revision_photo_upload"');
  });

  it("never serializes the database URL or raw security subject identifiers", () => {
    expect(source).toContain("databaseIdentitySha256");
    expect(source).toContain("revisionIdSha256");
    expect(source).toContain("ownerUserIdSha256");
    expect(source).not.toContain("databaseUrl: databaseUrl");
    expect(source).not.toMatch(/targetIdentity:\s*\{[^}]*revisionId,/su);
  });
});
