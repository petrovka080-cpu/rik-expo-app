import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(
  "supabase/migrations/20260821130000_r2_technology_passport_human_acceptance.sql",
), "utf8");

describe("R2 Technology Passport database admission", () => {
  it("stores passport candidates and human decisions separately", () => {
    expect(migration).toContain("create table if not exists public.estimate_technology_passport_r2");
    expect(migration).toContain("create table if not exists public.estimate_technology_passport_acceptance_r2");
    expect(migration).toContain("passport_content_sha256");
    expect(migration).toContain("source_set_sha256");
    expect(migration).toContain("author_created_by_agent boolean not null check (not author_created_by_agent)");
    expect(migration).toContain("created_by_agent boolean not null check (not created_by_agent)");
    expect(migration).toContain("manifest_payload->>'passportContentSha256'=passport_content_sha256");
    expect(migration).toContain("validator_decision->>'sourceSetSha256'=source_set_sha256");
  });

  it("rejects self-review and keeps signed decisions immutable", () => {
    expect(migration).toContain("ESTIMATE_TECHNOLOGY_R2_AUTHOR_REVIEWER_COLLISION");
    expect(migration).toContain("ESTIMATE_TECHNOLOGY_R2_ACCEPTANCE_IMMUTABLE");
    expect(migration).toContain("before update or delete on public.estimate_technology_passport_acceptance_r2");
  });

  it("resets accepted content to DRAFT after passport or source drift", () => {
    expect(migration).toContain("new.passport_content_sha256<>old.passport_content_sha256");
    expect(migration).toContain("new.source_set_sha256<>old.source_set_sha256");
    expect(migration).toContain("new.status := 'DRAFT'");
    expect(migration).toContain("jsonb_set(new.validator_decision,'{allowed}','false'::jsonb,true)");
    expect(migration).toContain("'{status}',to_jsonb('DRAFT'::text),true");
  });

  it("makes exact human acceptance part of the existing compile/revision/artifact gate", () => {
    expect(migration).toContain("create or replace function public.estimate_content_passport_exact_r3");
    expect(migration).toContain("public.estimate_technology_passport_exact_accepted_r2(p_release_id,p_catalog_id)");
    expect(migration).toContain("passport.validator_decision->>'status'='ENGINEER_ACCEPTED'");
    expect(migration).toContain("acceptance.decision='ACCEPTED'");
  });

  it("blocks content GREEN promotion before the independent human gate", () => {
    expect(migration).toContain("create or replace function public.estimate_enforce_content_gate_promotion_r3");
    expect(migration).toContain("ESTIMATE_TECHNOLOGY_R2_HUMAN_ACCEPTANCE_MISSING");
    expect(migration).toContain(
      "public.estimate_technology_passport_exact_accepted_r2(new.release_id,new.catalog_id)",
    );
  });

  it("binds each candidate to the exact definition release and catalog identity", () => {
    expect(migration).toContain("ESTIMATE_TECHNOLOGY_R2_PASSPORT_DEFINITION_BINDING_MISMATCH");
    expect(migration).toContain("definition.release_id=new.release_id");
    expect(migration).toContain("definition.catalog_id=new.catalog_id");
  });
});
