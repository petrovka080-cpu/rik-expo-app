import {
  auditR4A6IdentityRows,
  type R4A6IdentityRow,
} from "../../scripts/estimate/r4a6/identityDag11610Contract";

function hash(character: string): string {
  return character.repeat(64);
}

const visible: R4A6IdentityRow = {
  source_identity_id: "source:visible",
  catalog_id: "catalog:visible",
  disposition: "VISIBLE_CANONICAL",
  canonical_work_id: "canonical:visible",
  redirect_target_source_identity_id: null,
  redirect_target_catalog_id: null,
  record_sha256: hash("a"),
};

describe("R4-A6 identity and DAG ledger contract", () => {
  it("resolves an alias only through its explicit visible canonical target", () => {
    const alias: R4A6IdentityRow = {
      source_identity_id: "source:alias",
      catalog_id: "catalog:alias",
      disposition: "ALIAS_REDIRECT",
      canonical_work_id: visible.canonical_work_id,
      redirect_target_source_identity_id: visible.source_identity_id,
      redirect_target_catalog_id: visible.catalog_id,
      record_sha256: hash("b"),
    };
    const result = auditR4A6IdentityRows([visible, alias]);

    expect(result.missingRedirectTargets).toBe(0);
    expect(result.redirectTargetMismatches).toBe(0);
    expect(result.canonicalTargetMismatches).toBe(0);
    expect(result.redirectCycles).toBe(0);
    expect(result.resolvedCanonicalWorkIds.get(alias.source_identity_id)).toBe(visible.canonical_work_id);
  });

  it("rejects redirect chains/cycles instead of silently resolving them", () => {
    const aliasA: R4A6IdentityRow = {
      source_identity_id: "source:a",
      catalog_id: "catalog:a",
      disposition: "ALIAS_REDIRECT",
      canonical_work_id: visible.canonical_work_id,
      redirect_target_source_identity_id: "source:b",
      redirect_target_catalog_id: "catalog:b",
      record_sha256: hash("b"),
    };
    const aliasB: R4A6IdentityRow = {
      source_identity_id: "source:b",
      catalog_id: "catalog:b",
      disposition: "ALIAS_REDIRECT",
      canonical_work_id: visible.canonical_work_id,
      redirect_target_source_identity_id: "source:a",
      redirect_target_catalog_id: "catalog:a",
      record_sha256: hash("c"),
    };
    const result = auditR4A6IdentityRows([visible, aliasA, aliasB]);

    expect(result.redirectCycles).toBe(2);
    expect(result.failures).toContain("STOP_IDENTITY_REDIRECT_CYCLE");
    expect(result.failures).toContain("STOP_IDENTITY_RESOLUTION_INCOMPLETE");
  });

  it("rejects an orphan and a canonical-target mismatch", () => {
    const orphan: R4A6IdentityRow = {
      source_identity_id: "source:orphan",
      catalog_id: "catalog:orphan",
      disposition: "ALIAS_REDIRECT",
      canonical_work_id: "canonical:other",
      redirect_target_source_identity_id: "source:missing",
      redirect_target_catalog_id: "catalog:missing",
      record_sha256: hash("b"),
    };
    const mismatch: R4A6IdentityRow = {
      source_identity_id: "source:mismatch",
      catalog_id: "catalog:mismatch",
      disposition: "ALIAS_REDIRECT",
      canonical_work_id: "canonical:other",
      redirect_target_source_identity_id: visible.source_identity_id,
      redirect_target_catalog_id: visible.catalog_id,
      record_sha256: hash("c"),
    };
    const result = auditR4A6IdentityRows([visible, orphan, mismatch]);

    expect(result.missingRedirectTargets).toBe(1);
    expect(result.canonicalTargetMismatches).toBe(1);
    expect(result.failures).toContain("STOP_IDENTITY_ORPHAN_REDIRECT");
    expect(result.failures).toContain("STOP_IDENTITY_CANONICAL_TARGET_MISMATCH");
  });
});
