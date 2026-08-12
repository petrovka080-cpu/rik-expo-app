import { createHash } from "node:crypto";

export function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function shaObject(value) {
  return sha256(canonical(value));
}

export function parseJsonl(text) {
  return text.split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
}

export function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

export function validateInventory(inventory, expectedCount = 11_610) {
  const ids = inventory.map((row) => row.catalog_id);
  const duplicates = duplicateValues(ids);
  const invalidHashes = inventory.filter((row) => !/^[0-9a-f]{64}$/u.test(row.source_row_hash ?? "")).map((row) => row.catalog_id);
  return {
    ok: inventory.length === expectedCount && duplicates.length === 0 && invalidHashes.length === 0,
    rowCount: inventory.length,
    expectedCount,
    uniqueCatalogIds: new Set(ids).size,
    duplicateCatalogIds: duplicates,
    invalidSourceRowHashes: invalidHashes,
  };
}

export function compareInventories(independent, target) {
  const left = new Map(independent.map((row) => [row.catalog_id, row]));
  const right = new Map(target.map((row) => [row.catalog_id, row]));
  const missingInTarget = [...left.keys()].filter((id) => !right.has(id)).sort();
  const extraInTarget = [...right.keys()].filter((id) => !left.has(id)).sort();
  const rowHashMismatches = [...left.keys()].filter((id) => right.has(id) && left.get(id).source_row_hash !== right.get(id).source_row_hash).sort();
  return {
    ok: missingInTarget.length === 0 && extraInTarget.length === 0 && rowHashMismatches.length === 0,
    missingInTarget,
    extraInTarget,
    rowHashMismatches,
  };
}

export function validateGroupPartition(groups, inventoryIds) {
  const allMembers = groups.flatMap((group) => group.primaryMemberIds ?? []);
  const membershipCounts = new Map();
  for (const id of allMembers) membershipCounts.set(id, (membershipCounts.get(id) ?? 0) + 1);
  const overlaps = [...membershipCounts].filter(([, count]) => count > 1).map(([id, count]) => ({ catalog_id: id, membership_count: count }));
  const unassigned = inventoryIds.filter((id) => !membershipCounts.has(id));
  const unknown = [...membershipCounts.keys()].filter((id) => !inventoryIds.includes(id));
  const duplicateGroupIds = duplicateValues(groups.map((group) => group.workGroupId));
  return {
    ok: unassigned.length === 0 && unknown.length === 0 && overlaps.length === 0 && duplicateGroupIds.length === 0,
    groupCount: groups.length,
    unionCount: membershipCounts.size,
    membershipCount: allMembers.length,
    unassigned,
    unknown,
    overlaps,
    duplicateGroupIds,
  };
}

export function validateFoundationEvidenceIndex(index, rootFiles) {
  const listed = new Map(index.files.map((row) => [row.file.replaceAll("\\", "/"), row]));
  const checked = rootFiles.map((row) => {
    const expected = listed.get(row.file);
    return {
      file: row.file,
      expected_bytes: expected?.bytes ?? null,
      actual_bytes: row.bytes,
      expected_sha256: expected?.sha256 ?? null,
      actual_sha256: row.sha256,
      verdict: expected && expected.bytes === row.bytes && expected.sha256 === row.sha256 ? "PASS" : "FAIL",
    };
  });
  const missing = index.files.filter((row) => !rootFiles.some((actual) => actual.file === row.file)).map((row) => row.file);
  return {
    ok: index.fileCount === 27 && index.files.length === 27 && missing.length === 0 && checked.every((row) => row.verdict === "PASS"),
    declaredFileCount: index.fileCount,
    listedFileCount: index.files.length,
    missing,
    checked,
  };
}

export function validateAsphaltDenominator(crosswalk) {
  const global = crosswalk.filter((row) => row.foundationCatalogId);
  const external = crosswalk.filter((row) => !row.foundationCatalogId);
  const aliases = crosswalk.filter((row) => row.predecessorRole === "ALIAS");
  const globalAliases = aliases.filter((row) => row.foundationCatalogId);
  const externalAliases = aliases.filter((row) => !row.foundationCatalogId);
  return {
    ok: crosswalk.length === 63 && global.length === 63,
    predecessorRoutes: crosswalk.length,
    globalBindings: global.length,
    externalEntrypoints: external.length,
    aliasesTotal: aliases.length,
    aliasesGlobal: globalAliases.length,
    aliasesExternal: externalAliases.length,
    arithmeticVariant: external.length === 0 ? "A_GLOBAL_63" : "B_GLOBAL_55_PLUS_EXTERNAL_8",
    denominatorVerdict: external.length === 0 ? "PASS" : "FAIL",
  };
}

export function validateNormativeRows(rows, expectedCount) {
  const missingFormula = rows.filter((row) => !row.formula_id).map((row) => `${row.catalog_id}:${row.row_id}`);
  const noExactSourceIds = rows.filter((row) => !Array.isArray(row.normative_source_ids) || row.normative_source_ids.length === 0);
  const pendingExactTableReview = rows.filter((row) => String(row.applicability_status).includes("requires_exact_table_review"));
  const unsupportedStatuses = rows.filter((row) => !["EXACT_ROW_SOURCE_BOUND", "official_scope_verified_numeric_rate_requires_exact_table_review", "PROJECT_OR_REGISTERED_NORM_SOURCE"].includes(row.applicability_status));
  return {
    ok: rows.length === expectedCount && missingFormula.length === 0 && noExactSourceIds.length === 0 && pendingExactTableReview.length === 0 && unsupportedStatuses.length === 0,
    rowCount: rows.length,
    expectedCount,
    missingFormulaCount: missingFormula.length,
    noExactSourceIdsCount: noExactSourceIds.length,
    pendingExactTableReviewCount: pendingExactTableReview.length,
    unsupportedStatusCount: unsupportedStatuses.length,
    sampleNoExactSourceIds: noExactSourceIds.slice(0, 20).map((row) => ({ catalog_id: row.catalog_id, row_id: row.row_id, source: row.normative_source, status: row.applicability_status })),
    samplePendingExactTableReview: pendingExactTableReview.slice(0, 20).map((row) => ({ catalog_id: row.catalog_id, row_id: row.row_id, source_ids: row.normative_source_ids })),
  };
}

export function validateReferenceProof(proof, expected) {
  const audit = proof.audit ?? {};
  const durable = proof.durable ?? {};
  return {
    ok:
      proof.rawRowCount === expected.boq &&
      proof.acceptedProfessionalResourceRowCount === expected.boq &&
      proof.PDFRowCount === expected.pdf &&
      proof.procurementEligibleRowCount === expected.procurement &&
      proof.row_evidence?.length === expected.boq &&
      durable.restored_row_count === expected.boq &&
      durable.parity === true &&
      audit.duplicate_row_ids === 0 &&
      audit.duplicate_exact_content_rows === 0 &&
      audit.duplicate_priced_cost_owners === 0 &&
      audit.non_positive_quantity_rows === 0,
    catalogId: proof.catalogId,
    workId: proof.workId,
    counts: {
      raw: proof.rawRowCount,
      accepted: proof.acceptedProfessionalResourceRowCount,
      pdf: proof.PDFRowCount,
      procurement: proof.procurementEligibleRowCount,
      durable: durable.restored_row_count,
      rowEvidence: proof.row_evidence?.length ?? null,
    },
    duplicates: {
      rowIds: audit.duplicate_row_ids,
      exactContent: audit.duplicate_exact_content_rows,
      pricedCostOwners: audit.duplicate_priced_cost_owners,
    },
    nonPositiveQuantityRows: audit.non_positive_quantity_rows,
  };
}

export function mutationMustFail(validator, value, mutate) {
  const clone = structuredClone(value);
  mutate(clone);
  const result = validator(clone);
  return { passed: result.ok === false, validatorResult: result };
}
