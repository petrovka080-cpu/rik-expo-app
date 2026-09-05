export const R4_A6_EXPECTED_IDENTITIES = 11_610;
export const R4_A6_EXPECTED_VISIBLE_CANONICAL = 10_322;
export const R4_A6_EXPECTED_ALIASES = 1_288;

export type R4A6IdentityRow = {
  source_identity_id: string;
  catalog_id: string;
  disposition: "VISIBLE_CANONICAL" | "ALIAS_REDIRECT" | string;
  canonical_work_id: string;
  redirect_target_source_identity_id: string | null;
  redirect_target_catalog_id: string | null;
  record_sha256: string;
};

export type R4A6IdentityAudit = {
  identities: number;
  uniqueSourceIdentities: number;
  uniqueCatalogIdentities: number;
  visibleCanonical: number;
  aliasesRedirects: number;
  uniqueCanonicalWorkIds: number;
  uniqueRecordHashes: number;
  invalidRecordHashes: number;
  missingRedirectTargets: number;
  redirectTargetMismatches: number;
  canonicalTargetMismatches: number;
  redirectCycles: number;
  failures: string[];
  resolvedCanonicalWorkIds: Map<string, string>;
};

function duplicateCount(values: readonly string[]): number {
  return values.length - new Set(values).size;
}

/**
 * Audits the immutable 11,610 source-identity ledger. Redirects are required to
 * terminate at a visible canonical owner; this deliberately rejects redirect
 * chains as well as cycles so runtime resolution stays single-hop and explicit.
 */
export function auditR4A6IdentityRows(rows: readonly R4A6IdentityRow[]): R4A6IdentityAudit {
  const failures: string[] = [];
  const sourceIds = rows.map((row) => String(row.source_identity_id));
  const catalogIds = rows.map((row) => String(row.catalog_id));
  const recordHashes = rows.map((row) => String(row.record_sha256));
  const visible = rows.filter((row) => row.disposition === "VISIBLE_CANONICAL");
  const aliases = rows.filter((row) => row.disposition === "ALIAS_REDIRECT");
  const invalidDispositions = rows.length - visible.length - aliases.length;
  const bySourceId = new Map(rows.map((row) => [row.source_identity_id, row]));
  const byCatalogId = new Map(rows.map((row) => [row.catalog_id, row]));
  const visibleByCanonicalWorkId = new Map(visible.map((row) => [row.canonical_work_id, row]));
  const resolvedCanonicalWorkIds = new Map<string, string>();
  let missingRedirectTargets = 0;
  let redirectTargetMismatches = 0;
  let canonicalTargetMismatches = 0;
  let redirectCycles = 0;

  for (const row of visible) {
    if (row.redirect_target_source_identity_id != null || row.redirect_target_catalog_id != null) {
      redirectTargetMismatches += 1;
    }
    resolvedCanonicalWorkIds.set(row.source_identity_id, row.canonical_work_id);
  }

  for (const alias of aliases) {
    const targetBySource = alias.redirect_target_source_identity_id
      ? bySourceId.get(alias.redirect_target_source_identity_id)
      : undefined;
    const targetByCatalog = alias.redirect_target_catalog_id
      ? byCatalogId.get(alias.redirect_target_catalog_id)
      : undefined;
    if (!targetBySource || !targetByCatalog) {
      missingRedirectTargets += 1;
      continue;
    }
    if (targetBySource !== targetByCatalog || targetBySource.disposition !== "VISIBLE_CANONICAL") {
      redirectTargetMismatches += 1;
      if (targetBySource.disposition === "ALIAS_REDIRECT") redirectCycles += 1;
      continue;
    }
    if (targetBySource.canonical_work_id !== alias.canonical_work_id
      || !visibleByCanonicalWorkId.has(alias.canonical_work_id)) {
      canonicalTargetMismatches += 1;
      continue;
    }
    resolvedCanonicalWorkIds.set(alias.source_identity_id, targetBySource.canonical_work_id);
  }

  const invalidRecordHashes = recordHashes.filter((value) => !/^[a-f0-9]{64}$/u.test(value)).length;
  const duplicateSourceIds = duplicateCount(sourceIds);
  const duplicateCatalogIds = duplicateCount(catalogIds);
  const duplicateRecordHashes = duplicateCount(recordHashes);
  const duplicateCanonicalOwners = duplicateCount(visible.map((row) => row.canonical_work_id));

  if (rows.length !== R4_A6_EXPECTED_IDENTITIES) failures.push("STOP_IDENTITY_11610_INCOMPLETE");
  if (visible.length !== R4_A6_EXPECTED_VISIBLE_CANONICAL) failures.push("STOP_IDENTITY_VISIBLE_DENOMINATOR");
  if (aliases.length !== R4_A6_EXPECTED_ALIASES) failures.push("STOP_IDENTITY_ALIAS_DENOMINATOR");
  if (invalidDispositions > 0) failures.push("STOP_IDENTITY_UNKNOWN_DISPOSITION");
  if (duplicateSourceIds > 0 || duplicateCatalogIds > 0) failures.push("STOP_IDENTITY_DUPLICATE_SOURCE");
  if (duplicateCanonicalOwners > 0) failures.push("STOP_IDENTITY_DUPLICATE_CANONICAL_OWNER");
  if (invalidRecordHashes > 0 || duplicateRecordHashes > 0) failures.push("STOP_IDENTITY_RECORD_HASH_INVALID");
  if (missingRedirectTargets > 0) failures.push("STOP_IDENTITY_ORPHAN_REDIRECT");
  if (redirectTargetMismatches > 0) failures.push("STOP_IDENTITY_REDIRECT_TARGET_INVALID");
  if (canonicalTargetMismatches > 0) failures.push("STOP_IDENTITY_CANONICAL_TARGET_MISMATCH");
  if (redirectCycles > 0) failures.push("STOP_IDENTITY_REDIRECT_CYCLE");
  if (resolvedCanonicalWorkIds.size !== rows.length) failures.push("STOP_IDENTITY_RESOLUTION_INCOMPLETE");

  return {
    identities: rows.length,
    uniqueSourceIdentities: new Set(sourceIds).size,
    uniqueCatalogIdentities: new Set(catalogIds).size,
    visibleCanonical: visible.length,
    aliasesRedirects: aliases.length,
    uniqueCanonicalWorkIds: visibleByCanonicalWorkId.size,
    uniqueRecordHashes: new Set(recordHashes).size,
    invalidRecordHashes,
    missingRedirectTargets,
    redirectTargetMismatches,
    canonicalTargetMismatches,
    redirectCycles,
    failures,
    resolvedCanonicalWorkIds,
  };
}
