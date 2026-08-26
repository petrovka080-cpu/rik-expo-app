import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(
  "supabase/migrations/20260821140000_r3_technology_passport_tenant_acceptance.sql",
), "utf8");

describe("R3 tenant-scoped Technology Passport human acceptance", () => {
  it("stores candidate, authorization and immutable decision history as separate records", () => {
    expect(migration).toContain("create table if not exists public.estimate_technology_engineer_authorization_r3");
    expect(migration).toContain("create table if not exists public.estimate_technology_passport_r3");
    expect(migration).toContain("create table if not exists public.estimate_technology_passport_acceptance_r3");
    expect(migration).toContain("before update or delete on public.estimate_technology_passport_acceptance_r3");
    expect(migration).toContain("ESTIMATE_TECHNOLOGY_R3_AUDIT_APPEND_ONLY");
  });

  it("binds decisions to tenant, real users, definition, passport and source hashes", () => {
    expect(migration).toContain("check (author_id<>reviewer_id)");
    expect(migration).toContain("manifest_payload->>'tenantId'=tenant_id::text");
    expect(migration).toContain("manifest_payload->>'definitionSha256'=definition_sha256");
    expect(migration).toContain("manifest_payload->>'passportContentSha256'=passport_content_sha256");
    expect(migration).toContain("manifest_payload->>'sourceSetSha256'=source_set_sha256");
    expect(migration).toContain("ESTIMATE_TECHNOLOGY_R3_REVIEWER_IDENTITY_MISMATCH");
  });

  it("uses append-only revocation and a deterministic latest-decision winner", () => {
    expect(migration).toContain("decision_sequence bigint generated always as identity unique");
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended(");
    expect(migration).toContain("ESTIMATE_TECHNOLOGY_R3_STALE_SUPERSEDES");
    expect(migration).toContain("order by decision.decision_sequence desc");
    expect(migration).toContain("supersedes_acceptance_id");
  });

  it("keeps product writes behind authenticated engineer RPC and logs service-role attempts", () => {
    expect(migration).toContain("create or replace function public.estimate_record_technology_acceptance_r3");
    expect(migration).toContain("public.estimate_request_jwt_role_r3()='service_role'");
    expect(migration).toContain("SERVICE_ROLE_PRODUCT_PATH_FORBIDDEN");
    expect(migration).toContain("'SERVICE_ROLE_BLOCKED'::text,false");
    expect(migration).toContain("revoke all on table public.estimate_technology_passport_acceptance_r3 from public,anon,authenticated,service_role");
  });

  it("enforces tenant RLS for reads and provides no authenticated direct-write policy", () => {
    expect(migration).toContain("alter table public.estimate_technology_passport_acceptance_r3 force row level security");
    expect(migration).toContain("create policy estimate_technology_acceptance_r3_tenant_select");
    expect(migration).toContain("tenant_id,auth.uid(),reviewer_scope");
    expect(migration).not.toMatch(/create policy estimate_technology_acceptance_r3_[^\n]*insert/u);
  });

  it("makes unscoped admission fail closed and passes organization_id at every runtime boundary", () => {
    expect(migration).toContain("create or replace function public.estimate_content_passport_exact_r3(\n  p_release_id uuid,\n  p_catalog_id text,\n  p_tenant_id uuid");
    expect(migration).toContain("select false;");
    expect(migration).toContain("v_release_id,new.catalog_id,new.organization_id");
    expect(migration).toContain("new.release_id,new.catalog_id,new.organization_id");
    expect(migration).toContain("v_revision.release_id,v_revision.catalog_id,v_revision.organization_id");
  });
});
