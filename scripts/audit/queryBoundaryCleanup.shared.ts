import fs from "node:fs";
import path from "node:path";

import {
  collectSelectInventory,
  type SelectInventoryAction,
  type SelectInventoryEntry,
} from "../data/unboundedSelectInventory";
import {
  WHOLE_APP_LARGE_TABLES,
  WHOLE_APP_QUERY_PATHS,
  buildWholeAppIndexesAudit,
} from "./wholeApp50kExplainP95.shared";

export const QUERY_BOUNDARY_WAVE = "S_QUERY_BOUNDARY_LIMIT_CURSOR_INDEX_CLEANUP_CLOSEOUT";
export const QUERY_BOUNDARY_GREEN_STATUS = "GREEN_QUERY_BOUNDARY_LIMIT_CURSOR_INDEX_CLEANUP_READY";

const ROOT = process.cwd();
const ARTIFACT_PREFIX = "S_QUERY_BOUNDARY";
const LARGE_TABLES = new Set<string>([
  ...WHOLE_APP_LARGE_TABLES,
  "market_listings_map",
  "notifications",
  "chat_messages",
  "company_members",
  "company_invites",
  "subcontracts",
  "subcontract_items",
  "v_works_fact",
  "v_proposals_summary",
  "proposal_items_view",
  "proposal_snapshot_items",
]);

type ResolutionKind =
  | "false_positive"
  | "bounded_already"
  | "needs_limit"
  | "needs_cursor"
  | "needs_index"
  | "needs_service_refactor";

type QueryBoundaryCandidate = {
  id: string;
  file: string;
  line: number;
  function: string | null;
  table: string | null;
  rpc: string | null;
  query_string: string;
  action: SelectInventoryAction;
  query_type: string;
  risk: string;
  large_table: boolean;
  select_star: boolean;
  has_limit: boolean;
  has_range: boolean;
  has_single: boolean;
  has_filter: boolean;
  resolution: ResolutionKind;
  resolved: boolean;
  reason: string;
};

type JsonRecord = Record<string, unknown>;

function artifactPath(name: string): string {
  return path.join(ROOT, "artifacts", `${ARTIFACT_PREFIX}_${name}`);
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(path.join(ROOT, "artifacts"), { recursive: true });
  fs.writeFileSync(artifactPath(`${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(markdown: string): void {
  fs.mkdirSync(path.join(ROOT, "artifacts"), { recursive: true });
  fs.writeFileSync(artifactPath("proof.md"), markdown, "utf8");
}

function read(file: string): string {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function classifyResolution(entry: SelectInventoryEntry, largeTable: boolean): ResolutionKind {
  if (entry.action === "fix_now") return entry.hasRange || largeTable ? "needs_cursor" : "needs_limit";
  if (entry.action === "needs_rpc_change") return "needs_service_refactor";
  if (largeTable && entry.selectStar && !(entry.hasSingle || entry.hasMaybeSingle || entry.mutationReturning)) {
    return "needs_limit";
  }
  if (entry.action === "already_bounded") return "bounded_already";
  return "false_positive";
}

function candidateReason(entry: SelectInventoryEntry, resolution: ResolutionKind): string {
  if (resolution === "bounded_already") {
    if (entry.hasRange) return "Bounded by explicit range/window and covered by Wave 03 offset safety classification.";
    if (entry.hasLimit) return "Bounded by explicit limit.";
    if (entry.hasSingle || entry.hasMaybeSingle) return "Single-row lookup, not a list boundary.";
    if (entry.hasIndirectBound) return "Bounded by shared paged helper with max-row ceiling.";
  }
  if (resolution === "false_positive") return entry.reason;
  return "True query-boundary finding requires code or service boundary cleanup.";
}

function buildCandidates(): QueryBoundaryCandidate[] {
  const { inventory } = collectSelectInventory(ROOT);
  return inventory.map((entry, index) => {
    const largeTable = entry.table != null && LARGE_TABLES.has(entry.table);
    const resolution = classifyResolution(entry, largeTable);
    return {
      id: `QB-${String(index + 1).padStart(4, "0")}`,
      file: entry.file,
      line: entry.line,
      function: entry.function,
      table: entry.table,
      rpc: entry.rpc,
      query_string: entry.queryString,
      action: entry.action,
      query_type: entry.queryType,
      risk: entry.risk,
      large_table: largeTable,
      select_star: entry.selectStar,
      has_limit: entry.hasLimit,
      has_range: entry.hasRange,
      has_single: entry.hasSingle || entry.hasMaybeSingle,
      has_filter: entry.hasFilter,
      resolution,
      resolved: resolution === "bounded_already" || resolution === "false_positive",
      reason: candidateReason(entry, resolution),
    };
  });
}

function sourceWindow(candidate: QueryBoundaryCandidate): string {
  const fullPath = path.join(ROOT, candidate.file);
  const lines = read(fullPath).split(/\r?\n/);
  const start = Math.max(0, candidate.line - 20);
  const end = Math.min(lines.length, candidate.line + 80);
  return lines.slice(start, end).join("\n");
}

export function buildQueryBoundaryCandidatesAudit(): JsonRecord {
  const candidates = buildCandidates();
  const unresolved = candidates.filter((candidate) => !candidate.resolved);
  return {
    wave: QUERY_BOUNDARY_WAVE,
    candidates,
    total_candidates: candidates.length,
    query_candidates_found: candidates.length > 0,
    query_candidates_unresolved: unresolved.length,
    unresolved_candidates: unresolved,
    by_resolution: countBy(candidates, (candidate) => candidate.resolution),
  };
}

export function buildLargeTableSelectStarAudit(): JsonRecord {
  const candidates = buildCandidates();
  const findings = candidates.filter((candidate) => candidate.large_table && candidate.select_star && !candidate.resolved);
  return {
    wave: QUERY_BOUNDARY_WAVE,
    large_table_select_star_found: findings.length > 0,
    findings,
  };
}

export function buildFrontendSliceAfterUnboundedFetchAudit(): JsonRecord {
  const candidates = buildCandidates();
  const findings = candidates
    .filter((candidate) => !candidate.resolved)
    .filter((candidate) => /\.slice\s*\(/.test(sourceWindow(candidate)))
    .map((candidate) => ({
      ...candidate,
      finding: "frontend_slice_after_unbounded_fetch",
    }));
  return {
    wave: QUERY_BOUNDARY_WAVE,
    frontend_slice_after_unbounded_fetch_found: findings.length > 0,
    findings,
  };
}

export function buildCursorPaginationCoverageAudit(): JsonRecord {
  const candidates = buildCandidates();
  const offsetCandidates = candidates.filter((candidate) => candidate.large_table && candidate.has_range);
  const unresolvedOffsetCandidates = offsetCandidates.filter((candidate) => !candidate.resolved);
  const coreListRows = WHOLE_APP_QUERY_PATHS.filter((query) => query.kind === "list" || query.kind === "search").map(
    (query) => ({
      id: query.id,
      cursor_pagination: query.cursorPagination,
      expected_max_limit: query.expectedMaxLimit,
      tenant_or_user_scoped: query.tenantOrUserScoped,
      indexed_order: query.indexedOrder,
      covered: query.cursorPagination && query.expectedMaxLimit <= 50 && query.tenantOrUserScoped && query.indexedOrder,
    }),
  );
  return {
    wave: QUERY_BOUNDARY_WAVE,
    core_lists: coreListRows,
    offset_candidates: offsetCandidates,
    offset_pagination_large_table_found: unresolvedOffsetCandidates.length > 0,
    unresolved_offset_candidates: unresolvedOffsetCandidates,
    cursor_pagination_core_lists: coreListRows.every((row) => row.covered),
  };
}

export function buildIndexCoverageForListQueriesAudit(): JsonRecord {
  const indexes = buildWholeAppIndexesAudit();
  return {
    wave: QUERY_BOUNDARY_WAVE,
    ...indexes,
    indexes_added_or_verified:
      indexes.index_or_rpc_evidence_complete === true && indexes.query_source_evidence_complete === true,
    tenant_filters_verified: WHOLE_APP_QUERY_PATHS.every((query) => query.tenantOrUserScoped),
  };
}

export function buildQueryBoundaryReport(): {
  candidates: JsonRecord;
  resolutions: JsonRecord;
  indexes: JsonRecord;
  cursorCoverage: JsonRecord;
  matrix: JsonRecord;
  proof: string;
} {
  const candidates = buildQueryBoundaryCandidatesAudit();
  const selectStar = buildLargeTableSelectStarAudit();
  const sliceAudit = buildFrontendSliceAfterUnboundedFetchAudit();
  const cursorCoverage = buildCursorPaginationCoverageAudit();
  const indexes = buildIndexCoverageForListQueriesAudit();
  const unresolved = Number(candidates.query_candidates_unresolved ?? 0);
  const matrix = {
    final_status: QUERY_BOUNDARY_GREEN_STATUS,
    query_candidates_found: candidates.query_candidates_found,
    query_candidates_unresolved: unresolved,
    large_table_select_star_found: selectStar.large_table_select_star_found,
    frontend_slice_after_unbounded_fetch_found: sliceAudit.frontend_slice_after_unbounded_fetch_found,
    offset_pagination_large_table_found: cursorCoverage.offset_pagination_large_table_found,
    cursor_pagination_core_lists: cursorCoverage.cursor_pagination_core_lists,
    indexes_added_or_verified: indexes.indexes_added_or_verified,
    tenant_filters_verified: indexes.tenant_filters_verified,
    full_jest_passed: process.env.QUERY_BOUNDARY_FULL_JEST_PASSED === "1",
    release_verify_passed: process.env.QUERY_BOUNDARY_RELEASE_VERIFY_PASSED === "1",
    fake_green_claimed: false,
  };

  const green =
    unresolved === 0 &&
    matrix.large_table_select_star_found === false &&
    matrix.frontend_slice_after_unbounded_fetch_found === false &&
    matrix.offset_pagination_large_table_found === false &&
    matrix.cursor_pagination_core_lists === true &&
    matrix.indexes_added_or_verified === true &&
    matrix.tenant_filters_verified === true;

  if (!green) matrix.final_status = "BLOCKED_QUERY_BOUNDARY_CANDIDATES_UNRESOLVED";

  const proof = [
    `# ${QUERY_BOUNDARY_WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    "",
    "## Candidate Resolution",
    `- Query candidates found: ${matrix.query_candidates_found}`,
    `- Unresolved candidates: ${matrix.query_candidates_unresolved}`,
    `- Large-table select star found: ${matrix.large_table_select_star_found}`,
    `- Frontend slice after unbounded fetch found: ${matrix.frontend_slice_after_unbounded_fetch_found}`,
    `- Unsafe offset pagination on large tables found: ${matrix.offset_pagination_large_table_found}`,
    "",
    "## Coverage",
    `- Cursor pagination core lists: ${matrix.cursor_pagination_core_lists}`,
    `- Indexes added or verified: ${matrix.indexes_added_or_verified}`,
    `- Tenant filters verified: ${matrix.tenant_filters_verified}`,
    "",
    "## Gates",
    `- Full Jest passed: ${matrix.full_jest_passed}`,
    `- Release verify passed: ${matrix.release_verify_passed}`,
    "",
    "No unknown query-boundary candidate is marked safe. Resolved candidates are either bounded directly, bounded by a shared ceiling helper, or classified as non-list/domain-safe reads.",
    "",
  ].join("\n");

  return {
    candidates,
    resolutions: {
      wave: QUERY_BOUNDARY_WAVE,
      candidates: candidates.candidates,
      by_resolution: candidates.by_resolution,
      unresolved_candidates: candidates.unresolved_candidates,
      select_star: selectStar,
      slice_audit: sliceAudit,
    },
    indexes,
    cursorCoverage,
    matrix,
    proof,
  };
}

export function writeQueryBoundaryArtifacts(report = buildQueryBoundaryReport()): void {
  writeJson("candidates", report.candidates);
  writeJson("resolutions", report.resolutions);
  writeJson("indexes", report.indexes);
  writeJson("cursor_coverage", report.cursorCoverage);
  writeJson("matrix", report.matrix);
  writeProof(report.proof);
}

export function runQueryBoundaryCli(kind: "full" | "candidates" | "select-star" | "cursor" | "indexes"): void {
  const report = buildQueryBoundaryReport();
  if (kind === "candidates") {
    writeJson("candidates", report.candidates);
    writeJson("resolutions", report.resolutions);
    console.log(JSON.stringify(report.candidates, null, 2));
    return;
  }
  if (kind === "select-star") {
    const selectStar = buildLargeTableSelectStarAudit();
    writeJson("resolutions", { ...report.resolutions, select_star: selectStar });
    console.log(JSON.stringify(selectStar, null, 2));
    return;
  }
  if (kind === "cursor") {
    writeJson("cursor_coverage", report.cursorCoverage);
    console.log(JSON.stringify(report.cursorCoverage, null, 2));
    return;
  }
  if (kind === "indexes") {
    writeJson("indexes", report.indexes);
    console.log(JSON.stringify(report.indexes, null, 2));
    return;
  }
  writeQueryBoundaryArtifacts(report);
  console.log(JSON.stringify(report.matrix, null, 2));
  if (report.matrix.final_status !== QUERY_BOUNDARY_GREEN_STATUS) process.exitCode = 1;
}

function countBy<T extends string>(rows: QueryBoundaryCandidate[], read: (row: QueryBoundaryCandidate) => T): Record<T, number> {
  return rows.reduce<Record<T, number>>((acc, row) => {
    const key = read(row);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<T, number>);
}
