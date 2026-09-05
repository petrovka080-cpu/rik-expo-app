import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const apiSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/canonical-estimate/index.ts"),
  "utf8",
);

describe("R4-A6 canonical estimate security boundary", () => {
  it("uses an exact origin allowlist and never emits a wildcard CORS origin", () => {
    expect(apiSource).toContain('env("ESTIMATE_ALLOWED_ORIGINS")');
    expect(apiSource).toContain("allowed.has(origin)");
    expect(apiSource).toContain('"Vary": "Origin"');
    expect(apiSource).not.toMatch(/Access-Control-Allow-Origin["']?\s*:\s*["']\*/u);
  });

  it("requires caller authentication before route dispatch", () => {
    expect(apiSource).toContain("function requireRequester");
    expect(apiSource).toContain("if (!authorization)");
    expect(apiSource).toContain("const requester = requireRequester(request)");
    expect(apiSource).toContain("const user = await requireUser(requester)");
    expect(apiSource).toContain('code: "AUTH_REQUIRED"');
  });

  it("binds revision, artifact, and media operations to server requester context", () => {
    expect(apiSource).toContain("global: { headers: { Authorization: authorization, apikey: anonKey } }");
    expect(apiSource).toMatch(/requester\s*\.from\("estimate_revision"\)/u);
    expect(apiSource).toContain('requester.rpc("estimate_create_artifact_job_v1"');
    expect(apiSource).toContain('requester.rpc("estimate_create_row_photo_upload_r55"');
    expect(apiSource).toContain("sourceOwnerUserId");
    expect(apiSource).toContain("sourceOrganizationId");
    expect(apiSource).toContain("sourceRevisionChecksumSha256");
    expect(apiSource).toContain("ARTIFACT_REVISION_IDENTITY_MISMATCH");
  });

  it("enforces photo MIME, size, and SHA-256 before finalization", () => {
    expect(apiSource).toContain("MAX_PHOTO_BYTES");
    expect(apiSource).toContain('["image/jpeg", "image/png"].includes(mimeType)');
    expect(apiSource).toContain("!/^[0-9a-f]{64}$/.test(contentSha256)");
    expect(apiSource).toContain("verifiedContentSha256 !== reservation.expected_content_sha256");
    expect(apiSource).toContain("bytes.byteLength !== Number(reservation.expected_size_bytes)");
    expect(apiSource).toContain("verifiedMimeType !== reservation.expected_mime_type");
  });

  it("keeps artifact URLs short-lived and route identifiers typed", () => {
    expect(apiSource).toContain("ARTIFACT_SIGNED_URL_TTL_SECONDS = 15 * 60");
    expect(apiSource).toContain("PHOTO_SIGNED_URL_TTL_SECONDS = 15 * 60");
    expect(apiSource).toContain("assertUuid(revisionId");
    expect(apiSource).toContain("assertUuid(attachmentId");
    expect(apiSource).toContain("new URL(request.url).pathname.split");
  });
});
