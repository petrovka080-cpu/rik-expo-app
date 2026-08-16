import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("BATCH-008 Concrete R5 exact domain contracts", () => {
  it("keeps the corrected complexity-aware valid/invalid scenario minimums", () => {
    const model = read("scripts/estimate/concreteBackendR5/concreteR5Model.ts");
    const builder = read("scripts/estimate/concreteBackendR5/buildConcreteR5ContentEvidence.ts");
    expect(model).toContain("L1: { valid: 4, invalid: 5 }");
    expect(model).toContain("L5: { valid: 22, invalid: 25 }");
    expect(builder).toContain("expectedScenarioRows");
    expect(builder).not.toContain("identities.length * 12");
  });

  it("builds the cumulative immutable release from one clean source tree", () => {
    const release = read("scripts/estimate/concreteBackendR5/buildConcreteR5Release.ts");
    expect(release).toContain("CONCRETE_SOURCE_FREEZE_REQUIRES_CLEAN_WORKTREE");
    expect(release).toContain("definitions: 1_218");
    expect(release).toContain("global: 830");
    expect(release).toContain("external: 388");
    expect(release).toContain("scenarios: 27_213");
    expect(release).toContain("52e12ca58ddf4e2817c26b8c837d7f911d6cecd3a8b1ac54a04b359b9973ccc8");
  });

  it("uses only row types accepted by the persistent backend schema", () => {
    const model = read("scripts/estimate/concreteBackendR5/concreteR5Model.ts");
    expect(model).toContain('"equipment", "MACHINE"');
    expect(model).toContain('"testing", "TEST"');
    expect(model).toContain('"transport", "LOGISTICS"');
    expect(model).not.toContain('"machine", "MACHINE"');
    expect(model).not.toContain('"test", "TEST"');
    expect(model).not.toContain('"logistics", "LOGISTICS"');
  });

  it("imports transactionally without early activation or queue mutation", () => {
    const importer = read("scripts/estimate/concreteBackendR5/importConcreteR5Release.ts");
    expect(importer).toContain('client.query("begin isolation level serializable")');
    expect(importer).toContain("releaseStatus: row.release_status");
    expect(importer).toContain("queueMutation: 0");
    expect(importer).toContain("concrete_domain_remaining");
    expect(importer).toContain("when 'OFFICIAL_MATERIAL_BOOK' then 'catalog'");
    expect(importer).toContain("when 'OFFICIAL_RESOURCE_RATE' then 'normative'");
    expect(importer).toContain("when 'CHILD_OWNER_ESTIMATE' then 'fallback'");
  });

  it("activates and rebases exactly once with an idempotent read-only retry", () => {
    const migration = read("supabase/migrations/20260816180000_batch008_concrete_r5.sql");
    expect(migration).toContain("estimate_activate_concrete_release_and_rebase_v5");
    expect(migration).toContain("A retry after the one committed transition is a read-only success");
    expect(migration).toContain("v_state.admitted_global_count<>3755");
    expect(migration).toContain("v_state.queue_remaining<>7855");
    expect(migration).toContain("p_expected_newly_admitted<>830");
    expect(migration).toContain("p_expected_external_definitions<>388");
    expect(migration).not.toContain("batch009_started");
  });

  it("runs all backend definitions and the same frozen 50 through thin clients", () => {
    const mass = read("scripts/estimate/concreteBackendR5/runConcreteR5MassBackend.ts");
    const frozen = read("scripts/estimate/concreteBackendR5/buildConcreteR5Frozen50.ts");
    const clients = read("scripts/estimate/concreteBackendR5/collectConcreteR5ClientEvidence.ts");
    expect(mass).toContain("470_016");
    expect(mass).toContain("27_213");
    expect(mass).toContain("DEFINITION_SHARD = 10");
    expect(mass).toContain("estimate_cleanup_release_admission_runtime_v3");
    expect(mass).toContain("passport->>'complexityClass'");
    expect(mass).toContain("delete parameters[row.parameter_id]");
    expect(frozen).toContain("externalDemolition === 10");
    expect(frozen).toContain("externalNonDemolition === 15");
    expect(clients).toContain("selectionEquality: \"50/50\"");
    expect(clients).toContain("apkFullCorpus: 0");
  });

  it("keeps Full Jest explicitly deferred and never claims repository-wide green", () => {
    const sources = [
      read("scripts/estimate/concreteBackendR5/runConcreteR5MassBackend.ts"),
      read("scripts/estimate/concreteBackendR5/buildConcreteR5Preflight.ts"),
    ].join("\n");
    expect(sources).toContain("DEFERRED_BY_OPERATOR_NOT_RUN");
    expect(sources).not.toContain("REPOSITORY_WIDE_TEST_GREEN=GREEN");
  });
});
