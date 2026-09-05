import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const apiSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/canonical-estimate/index.ts"),
  "utf8",
);
const admissionMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260819090000_estimate_admission_r3.sql"),
  "utf8",
);
const tenantRevisionMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260825180000_r541_strict_tenant_revision_access.sql"),
  "utf8",
);
const photoMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260819220000_estimate_revision_photo_attachment_r55.sql"),
  "utf8",
);
const revisionVisibilityGrantMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260905133000_r4a6_revision_visibility_execute_grant.sql"),
  "utf8",
);
const photoSelectGrantMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260905134500_r4a6_photo_rls_authenticated_select.sql"),
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

  it("fails closed on capability scope, expiry, revocation, and source identity", () => {
    expect(admissionMigration).toContain("capability.revoked_at is null");
    expect(admissionMigration).toContain("capability.expires_at>clock_timestamp()");
    expect(admissionMigration).toContain("capability.tenant_id=new.organization_id");
    expect(admissionMigration).toContain("capability.release_id=v_release.id");
    expect(admissionMigration).toContain("capability.environment=new.input_payload#>>'{estimateAdmission,environment}'");
    expect(admissionMigration).toContain("capability.source_head=new.input_payload#>>'{estimateAdmission,sourceHead}'");
    expect(admissionMigration).toContain("capability.source_tree=new.input_payload#>>'{estimateAdmission,sourceTree}'");
  });

  it("enforces revision tenant visibility and row-photo ownership in database code", () => {
    expect(tenantRevisionMigration).toContain("revision.owner_user_id = auth.uid()");
    expect(tenantRevisionMigration).toContain("public.rls_current_user_company_member_v1(revision.organization_id)");
    expect(tenantRevisionMigration).toContain("request.estimate_tenant_id_r541");
    expect(photoMigration).toContain("where u.id = p_upload_id and u.owner_user_id = p_actor_user_id");
    expect(photoMigration).toContain("a.tenant_id = v_upload.tenant_id");
    expect(photoMigration).toContain("a.parent_revision_id = v_upload.parent_revision_id");
    expect(photoMigration).toContain("a.row_id = v_upload.row_id");
    expect(revisionVisibilityGrantMigration).toContain(
      "revoke all on function public.estimate_revision_visible_v1(uuid) from public, anon",
    );
    expect(revisionVisibilityGrantMigration).toContain(
      "grant execute on function public.estimate_revision_visible_v1(uuid) to authenticated",
    );
    expect(photoSelectGrantMigration).toContain("grant select on table");
    expect(photoSelectGrantMigration).toContain("public.estimate_revision_request_binding");
    expect(photoSelectGrantMigration).toContain("public.estimate_revision_photo_upload");
    expect(photoSelectGrantMigration).toContain("public.estimate_revision_photo_attachment_event");
    expect(photoSelectGrantMigration).toContain("to authenticated");
    expect(photoSelectGrantMigration).toContain("from public, anon");
  });
});
