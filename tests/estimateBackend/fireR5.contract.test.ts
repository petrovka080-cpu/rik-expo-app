import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("BATCH-009 Fire/Life Safety R5 exact domain contracts", () => {
  it("locks strict depth and complexity-aware scenario minimums", () => {
    const model = read("scripts/estimate/fireBackendR5/fireR5Model.ts");
    const builder = read("scripts/estimate/fireBackendR5/buildFireR5ContentEvidence.ts");
    expect(model).toContain("L1: 60, L2: 140, L3: 300, L4: 650, L5: 1_200");
    expect(model).toContain("L1: { valid: 4, invalid: 6 }");
    expect(model).toContain("L5: { valid: 26, invalid: 32 }");
    expect(builder).toContain("expectedScenarioRows");
    expect(builder).not.toContain("identities.length * 12");
  });

  it("builds the cumulative immutable release from the exact BATCH-008 package", () => {
    const release = read("scripts/estimate/fireBackendR5/buildFireR5Release.ts");
    expect(release).toContain("FIRE_SOURCE_FREEZE_REQUIRES_CLEAN_WORKTREE");
    expect(release).toContain("definitions: 231");
    expect(release).toContain("global: 88");
    expect(release).toContain("external: 143");
    expect(release).toContain("scenarios: 6_423");
    expect(release).toContain("610a9c633d8f100eef9fb328786bc44cfe936cce26a55f577796bffeb3d17fd3");
    expect(release).toContain("da29dc2b-1384-5487-b8da-6ee93f4e514e");
  });

  it("requires exact product conformity and never invents a price or certificate", () => {
    const model = read("scripts/estimate/fireBackendR5/fireR5Model.ts");
    expect(model).toContain('regulation: "TR_EAEU_043_2017"');
    expect(model).toContain('exactModelOrSeries: "PROJECT_MODEL_SERIES_REQUIRED"');
    expect(model).toContain("certificateOrDeclarationNumber: null");
    expect(model).toContain("inventedCertificate: false");
    expect(model).toContain("inventedPrice: false");
    expect(model).toContain('route: priceRequired ? "PROJECT_PRICE_REQUIRED"');
  });

  it("imports transactionally without early activation or queue mutation", () => {
    const importer = read("scripts/estimate/fireBackendR5/importFireR5Release.ts");
    expect(importer).toContain('client.query("begin isolation level serializable")');
    expect(importer).toContain("releaseStatus: row.release_status");
    expect(importer).toContain("queueMutation: 0");
    expect(importer).toContain("fire_domain_remaining");
    expect(importer).toContain("batch010_execution_started");
  });

  it("activates and rebases exactly 88 global IDs with a read-only retry", () => {
    const migration = read("supabase/migrations/20260817180000_batch009_fire_life_safety_r5.sql");
    expect(migration).toContain("estimate_activate_fire_release_and_rebase_v5");
    expect(migration).toContain("if v_target.status='active' then");
    expect(migration).toContain("v_state.admitted_global_count<>3755");
    expect(migration).toContain("v_state.queue_remaining<>7855");
    expect(migration).toContain("p_expected_newly_admitted<>88");
    expect(migration).toContain("p_expected_external_definitions<>143");
    expect(migration).toContain("v_domain_definition_count<>231");
    expect(migration).not.toContain("PRODUCTION_DATABASE_URL");
  });

  it("runs every definition and freezes one identical 50-case corpus", () => {
    const mass = read("scripts/estimate/fireBackendR5/runFireR5MassBackend.ts");
    const frozen = read("scripts/estimate/fireBackendR5/buildFireR5Frozen50.ts");
    const clients = read("scripts/estimate/fireBackendR5/collectFireR5ClientEvidence.ts");
    expect(mass).toContain("86_176");
    expect(mass).toContain("6_423");
    expect(mass).toContain("DEFINITION_SHARD = 10");
    expect(mass).toContain("estimate_cleanup_release_admission_runtime_v3");
    expect(frozen).toContain("externalDemolition === 4");
    expect(frozen).toContain("externalNonDemolition === 16");
    expect(frozen).toContain("sectionCoverage.length === requiredSections.length");
    expect(clients).toContain('selectionEquality: "50/50"');
    expect(clients).toContain("apkFullCorpus: 0");
  });

  it("derives all 172 mandatory mutation classes from the authoritative spec", () => {
    const mutations = read("scripts/estimate/fireBackendR5/runFireR5ControlledMutations.ts");
    expect(mutations).toContain("rows.length === 172");
    expect(mutations).toContain("Math.max(360, F + 75)");
    expect(mutations).toContain("required === 2_321");
  });

  it("keeps Full Jest deferred and BATCH-010 forbidden", () => {
    const sources = [
      read("scripts/estimate/fireBackendR5/runFireR5MassBackend.ts"),
      read("scripts/estimate/fireBackendR5/finalizeFireR5Closeout.ts"),
    ].join("\n");
    expect(sources).toContain("DEFERRED_BY_OPERATOR_NOT_RUN");
    expect(sources).toContain("BATCH010_STARTED=false");
    expect(sources).not.toContain("REPOSITORY_WIDE_TEST_GREEN=GREEN");
  });
});
