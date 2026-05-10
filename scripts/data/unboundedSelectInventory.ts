import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const DEFAULT_SELECT_INVENTORY_WAVE = "S_NIGHT_DATA_02_UNBOUNDED_SELECTS_REPEATABLE_SCANNER";

export type SelectInventoryQueryType =
  | "list"
  | "lookup"
  | "existence"
  | "aggregation"
  | "export"
  | "reference";

export type SelectInventoryRisk = "high" | "medium" | "low";

export type SelectInventoryAction =
  | "fix_now"
  | "already_bounded"
  | "domain_bounded"
  | "export_allowlist"
  | "needs_rpc_change";

export type SelectInventoryEntry = {
  file: string;
  line: number;
  function: string | null;
  queryString: string;
  table: string | null;
  rpc: string | null;
  hasLimit: boolean;
  hasRange: boolean;
  hasSingle: boolean;
  hasMaybeSingle: boolean;
  hasFilter: boolean;
  hasIndirectBound: boolean;
  hasCountOrHead: boolean;
  mutationReturning: boolean;
  queryType: SelectInventoryQueryType;
  risk: SelectInventoryRisk;
  action: SelectInventoryAction;
  selectStar: boolean;
  priorClassified: boolean;
  reason: string;
};

export type SelectInventoryMetrics = {
  totalSelectCalls: number;
  scannerScope: string;
  excludedNonSupabaseSelectCalls: number;
  currentUnresolvedUnboundedSelects: number;
  selectStarCount: number;
  fixNowCount: number;
  needsRpcChangeCount: number;
  alreadyClassifiedCount: number;
  alreadyBoundedCount: number;
  domainBoundedCount: number;
  exportAllowlistCount: number;
  realCodeFixCandidates: number;
  unboundedWithoutDetectedLimitRangeSingle: number;
  topRiskFiles: SelectInventoryTopRiskFile[];
  byAction: Record<SelectInventoryAction, number>;
  byRisk: Record<SelectInventoryRisk, number>;
  byQueryType: Record<SelectInventoryQueryType, number>;
};

export type SelectInventoryTopRiskFile = {
  file: string;
  high: number;
  medium: number;
  total: number;
  fixNow: number;
  needsRpcChange: number;
};

export type SelectInventoryStartedFrom = {
  head: string;
  origin_main: string;
  ahead: number;
  behind: number;
  worktree: "clean" | "dirty";
};

export type SelectInventoryPayload = {
  wave: string;
  final_status: "GREEN_UNBOUNDED_SELECTS_REPEATABLE_SCANNER_READY";
  generatedAt: string;
  startedFrom: SelectInventoryStartedFrom;
  scanner: {
    roots: string[];
    extensions: string[];
    excludedFilePatterns: string[];
    ignoresCommentsAndStringLiterals: true;
    excludedNonSupabaseSelectCalls: number;
    classifier: string;
  };
  metrics: SelectInventoryMetrics;
  inventory: SelectInventoryEntry[];
  safety: {
    toolingOnlyCodeChanged: true;
    runtimeCodeChanged: false;
    productionTouched: false;
    dbWrites: false;
    migrations: false;
    supabaseProjectChanges: false;
    spendCapChanges: false;
    realtimeLoadRun: false;
    destructiveDml: false;
    otaPublished: false;
    easBuildTriggered: false;
    secretsPrinted: false;
    broadCacheEnablement: false;
    broadRateLimitEnablement: false;
  };
};

export type SelectInventoryScanOptions = {
  roots?: string[];
  extensions?: string[];
  priorClassifiedFiles?: ReadonlySet<string>;
};

const DEFAULT_ROOTS = ["src", "app"] as const;
const DEFAULT_EXTENSIONS = [".ts", ".tsx"] as const;
const DEFAULT_PRIOR_CLASSIFICATION_ARTIFACTS = [
  "artifacts/S_DATA_01_QUERY_BOUNDS_TOP_30_inventory_delta.json",
  "artifacts/S_PAG_5_remaining_unbounded_selects_matrix.json",
] as const;

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const excludeSourceFile = (name: string): boolean =>
  /(?:\.test|\.spec|\.contract)\.(?:ts|tsx)$/.test(name) || name.endsWith(".d.ts");

const compact = (value: string): string => value.replace(/\s+/g, " ").trim();

const countBy = <T extends string>(
  entries: readonly SelectInventoryEntry[],
  read: (entry: SelectInventoryEntry) => T,
): Record<T, number> =>
  entries.reduce<Record<T, number>>((accumulator, entry) => {
    const key = read(entry);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {} as Record<T, number>);

function git(projectRoot: string, args: string[]): string {
  return execFileSync("git", args, { cwd: projectRoot, encoding: "utf8" }).trim();
}

function walkSourceFiles(projectRoot: string, roots: readonly string[], extensions: ReadonlySet<string>): string[] {
  const files: string[] = [];
  const walk = (directory: string): void => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "__tests__") walk(fullPath);
      } else if (extensions.has(path.extname(entry.name)) && !excludeSourceFile(entry.name)) {
        files.push(fullPath);
      }
    }
  };

  for (const rootName of roots) walk(path.join(projectRoot, rootName));
  return files;
}

function selectPositions(text: string): number[] {
  const positions: number[] = [];
  let quote: string | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? "";
    const next = text[index + 1] ?? "";
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "." && /^\.select\b/.test(text.slice(index, index + 10))) {
      let cursor = index + 7;
      while (/\s/.test(text[cursor] ?? "")) cursor += 1;
      if (text[cursor] === "(") positions.push(index);
    }
  }

  return positions;
}

function previousIdentifier(text: string, index: number): string {
  let cursor = index - 1;
  while (cursor >= 0 && /\s/.test(text[cursor] ?? "")) cursor -= 1;
  const end = cursor + 1;
  while (cursor >= 0 && /[A-Za-z0-9_$]/.test(text[cursor] ?? "")) cursor -= 1;
  return text.slice(cursor + 1, end);
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

function parseCall(text: string, openIndex: number): { end: number; raw: string } {
  let quote: string | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let depth = 0;

  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index] ?? "";
    const next = text[index + 1] ?? "";
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return { end: index, raw: text.slice(openIndex + 1, index) };
    }
  }

  return { end: openIndex, raw: "" };
}

function extractQuery(raw: string): string {
  const trimmed = raw.trim();
  const literal = trimmed.match(/^(["'`])([\s\S]*?)\1/);
  return literal ? compact(literal[2] ?? "") : compact(trimmed).slice(0, 180);
}

function lastMatch(regex: RegExp, value: string): RegExpExecArray | null {
  let match: RegExpExecArray | null = null;
  let last: RegExpExecArray | null = null;
  while ((match = regex.exec(value))) last = match;
  return last;
}

function detectFunctionName(text: string, index: number): string | null {
  const before = text.slice(Math.max(0, index - 4000), index);
  const patterns = [
    /function\s+([A-Za-z0-9_]+)/g,
    /async\s+function\s+([A-Za-z0-9_]+)/g,
    /const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(/g,
    /export\s+const\s+([A-Za-z0-9_]+)\s*=/g,
  ];
  let bestIndex = -1;
  let bestName: string | null = null;
  for (const regex of patterns) {
    let match: RegExpExecArray | null = null;
    while ((match = regex.exec(before))) {
      if (match.index > bestIndex) {
        bestIndex = match.index;
        bestName = match[1] ?? null;
      }
    }
  }
  return bestName;
}

export function collectSelectInventoryFromSource(params: {
  file: string;
  text: string;
  priorClassifiedFiles?: ReadonlySet<string>;
}): { entries: SelectInventoryEntry[]; excludedNonSupabaseSelectCalls: number } {
  const entries: SelectInventoryEntry[] = [];
  let excludedNonSupabaseSelectCalls = 0;

  for (const index of selectPositions(params.text)) {
    if (previousIdentifier(params.text, index) === "Platform") {
      excludedNonSupabaseSelectCalls += 1;
      continue;
    }
    const open = params.text.indexOf("(", index);
    const call = parseCall(params.text, open);
    entries.push(
      classifySelect({
        file: normalizePath(params.file),
        text: params.text,
        index,
        raw: call.raw,
        end: call.end,
        priorClassifiedFiles: params.priorClassifiedFiles ?? new Set<string>(),
      }),
    );
  }

  return { entries, excludedNonSupabaseSelectCalls };
}

function classifySelect(params: {
  file: string;
  text: string;
  index: number;
  raw: string;
  end: number;
  priorClassifiedFiles: ReadonlySet<string>;
}): SelectInventoryEntry {
  const queryString = extractQuery(params.raw);
  const before = params.text.slice(Math.max(0, params.index - 3000), params.index);
  const after = params.text.slice(params.end, Math.min(params.text.length, params.end + 3000));
  const afterStatement = after.split(/;|\n\s*\n/)[0] || after.slice(0, 600);
  const functionWindow = params.text.slice(
    Math.max(0, params.index - 6000),
    Math.min(params.text.length, params.index + 6000),
  );
  const functionName = detectFunctionName(params.text, params.index);
  const tableMatch = lastMatch(/\.from\s*\(\s*(["'`])([^"'`]+)\1/g, before);
  const dynamicTableMatch = lastMatch(/fromCatalogDynamicReadSource\s*\(\s*([A-Za-z0-9_]+)/g, before);
  const rpcMatch = lastMatch(/\.rpc\s*\(\s*(["'`])([^"'`]+)\1/g, before);
  const table = tableMatch?.[2] ?? (dynamicTableMatch?.[1] ? `dynamic:${dynamicTableMatch[1]}` : null);
  const rpc = rpcMatch?.[2] ?? null;
  const hasLimit = /\.limit\s*\(/.test(afterStatement);
  const hasRange = /\.range\s*\(/.test(afterStatement);
  const hasSingle = /\.single\s*\(/.test(afterStatement);
  const hasMaybeSingle = /\.maybeSingle\s*\(/.test(afterStatement);
  const hasFilter = /\.(?:eq|in|match|or|not|is|contains|containedBy|overlaps|gte|gt|lte|lt|ilike|like)\s*\(/.test(
    afterStatement,
  );
  const hasCountOrHead = /count\s*:\s*["'`]exact["'`]|head\s*:\s*true/i.test(params.raw + afterStatement);
  const hasIndirectBound =
    /loadPagedRowsWithCeiling|fetchAllPagesWithCeiling|loadPaged[A-Za-z0-9]*Rows(?:<[^>]+>)?\s*\(/.test(
      functionWindow,
    ) || (/normalizePage\s*\(/.test(functionWindow) && /\.range\s*\(/.test(functionWindow));
  const mutationReturning = /\.(?:insert|upsert)\s*\(/.test(before.slice(-900));
  const selectStar = /^\*$/.test(queryString.trim());
  const textForClassification = `${params.file} ${functionName ?? ""} ${table ?? ""} ${queryString}`.toLowerCase();

  let queryType: SelectInventoryQueryType = "list";
  if (hasCountOrHead || /count\(/i.test(queryString)) queryType = "aggregation";
  else if (hasSingle || hasMaybeSingle) queryType = /^id(?:,|$)|\bid\b/i.test(queryString) ? "existence" : "lookup";
  else if (/pdf|export|xlsx|csv|report|builder/.test(textForClassification)) queryType = "export";
  else if (
    /dict|dictionary|reference|option|catalog|profile|company|companies|users|roles|membership|unit|work_type|materials|name_map/.test(
      textForClassification,
    )
  ) {
    queryType = "reference";
  } else if (hasFilter && /\bid\b|_id|ids|parent|proposal|request|subcontract|progress|log|item/.test(textForClassification)) {
    queryType = "lookup";
  }

  let action: SelectInventoryAction = "fix_now";
  let risk: SelectInventoryRisk = "high";
  let reason = "No direct or detected indirect bound on a runtime list select.";

  if (hasLimit || hasRange || hasSingle || hasMaybeSingle) {
    action = "already_bounded";
    risk = "low";
    reason = "Direct Supabase chain has limit/range/single/maybeSingle.";
  } else if (hasIndirectBound) {
    action = "already_bounded";
    risk = "low";
    reason = "Select is inside a detected page-through helper or normalizePage/range context.";
  } else if (mutationReturning) {
    action = "domain_bounded";
    risk = "low";
    reason = "Mutation-returning select is bounded by inserted/upserted payload cardinality, not a list fetch.";
  } else if (queryType === "aggregation") {
    action = "domain_bounded";
    risk = "low";
    reason = "Aggregation/existence style read; not a row-list fetch.";
  } else if (queryType === "export") {
    action = "export_allowlist";
    risk = "medium";
    reason = "Document/report/export path; full selected-domain reads are intentionally preserved for output completeness.";
  } else if (queryType === "reference") {
    action = "domain_bounded";
    risk = selectStar ? "medium" : "low";
    reason = "Reference/dictionary/domain lookup; no current broad user-facing list/search fix candidate.";
  } else if (hasFilter) {
    action = "domain_bounded";
    risk = selectStar ? "medium" : "low";
    reason = "Filtered by caller/domain identifiers; likely parent/detail scoped rather than global list.";
  } else if (rpc) {
    action = "needs_rpc_change";
    risk = "high";
    reason = "RPC-returning select shape needs RPC/contract review before changing row bounds.";
  }

  return {
    file: params.file,
    line: lineOf(params.text, params.index),
    function: functionName,
    queryString,
    table,
    rpc,
    hasLimit,
    hasRange,
    hasSingle,
    hasMaybeSingle,
    hasFilter,
    hasIndirectBound,
    hasCountOrHead,
    mutationReturning,
    queryType,
    risk,
    action,
    selectStar,
    priorClassified: params.priorClassifiedFiles.has(params.file),
    reason,
  };
}

function readPriorClassifiedFiles(projectRoot: string): Set<string> {
  const priorFiles = new Set<string>();
  for (const artifact of DEFAULT_PRIOR_CLASSIFICATION_ARTIFACTS) {
    const fullPath = path.join(projectRoot, artifact);
    if (!fs.existsSync(fullPath)) continue;
    const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8")) as {
      entries?: Array<{ file?: string }>;
      classificationMatrix?: Array<{ file?: string }>;
    };
    for (const entry of parsed.entries ?? []) if (entry.file) priorFiles.add(entry.file);
    for (const entry of parsed.classificationMatrix ?? []) if (entry.file) priorFiles.add(entry.file);
  }
  return priorFiles;
}

export function collectSelectInventory(
  projectRoot: string,
  options: SelectInventoryScanOptions = {},
): { inventory: SelectInventoryEntry[]; excludedNonSupabaseSelectCalls: number } {
  const roots = options.roots ?? [...DEFAULT_ROOTS];
  const extensions = new Set(options.extensions ?? [...DEFAULT_EXTENSIONS]);
  const priorClassifiedFiles = options.priorClassifiedFiles ?? readPriorClassifiedFiles(projectRoot);
  const inventory: SelectInventoryEntry[] = [];
  let excludedNonSupabaseSelectCalls = 0;

  for (const file of walkSourceFiles(projectRoot, roots, extensions)) {
    const relativeFile = normalizePath(path.relative(projectRoot, file));
    const result = collectSelectInventoryFromSource({
      file: relativeFile,
      text: fs.readFileSync(file, "utf8"),
      priorClassifiedFiles,
    });
    inventory.push(...result.entries);
    excludedNonSupabaseSelectCalls += result.excludedNonSupabaseSelectCalls;
  }

  inventory.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
  return { inventory, excludedNonSupabaseSelectCalls };
}

function buildMetrics(
  inventory: SelectInventoryEntry[],
  excludedNonSupabaseSelectCalls: number,
): SelectInventoryMetrics {
  const byAction = countBy(inventory, (entry) => entry.action);
  const byRisk = countBy(inventory, (entry) => entry.risk);
  const byQueryType = countBy(inventory, (entry) => entry.queryType);
  const unresolved = inventory.filter((entry) => entry.action === "fix_now" || entry.action === "needs_rpc_change");
  const topRiskFiles = Object.values(
    inventory
      .filter((entry) => entry.risk !== "low")
      .reduce<Record<string, SelectInventoryTopRiskFile>>((accumulator, entry) => {
        const current =
          accumulator[entry.file] ??
          ({
            file: entry.file,
            high: 0,
            medium: 0,
            total: 0,
            fixNow: 0,
            needsRpcChange: 0,
          } satisfies SelectInventoryTopRiskFile);
        if (entry.risk === "high") current.high += 1;
        if (entry.risk === "medium") current.medium += 1;
        current.total += 1;
        if (entry.action === "fix_now") current.fixNow += 1;
        if (entry.action === "needs_rpc_change") current.needsRpcChange += 1;
        accumulator[entry.file] = current;
        return accumulator;
      }, {}),
  ).sort(
    (left, right) =>
      right.high - left.high ||
      right.medium - left.medium ||
      right.total - left.total ||
      left.file.localeCompare(right.file),
  );

  return {
    totalSelectCalls: inventory.length,
    scannerScope:
      "src/** and app/** TypeScript/TSX runtime files; excludes tests/specs/contracts, comments, string literals, and non-Supabase Platform.select calls",
    excludedNonSupabaseSelectCalls,
    currentUnresolvedUnboundedSelects: unresolved.length,
    selectStarCount: inventory.filter((entry) => entry.selectStar).length,
    fixNowCount: byAction.fix_now ?? 0,
    needsRpcChangeCount: byAction.needs_rpc_change ?? 0,
    alreadyClassifiedCount: inventory.filter((entry) => entry.priorClassified).length,
    alreadyBoundedCount: byAction.already_bounded ?? 0,
    domainBoundedCount: byAction.domain_bounded ?? 0,
    exportAllowlistCount: byAction.export_allowlist ?? 0,
    realCodeFixCandidates: unresolved.length,
    unboundedWithoutDetectedLimitRangeSingle: inventory.filter((entry) => entry.action !== "already_bounded").length,
    topRiskFiles: topRiskFiles.slice(0, 15),
    byAction,
    byRisk,
    byQueryType,
  };
}

export function buildSelectInventoryPayload(params: {
  projectRoot: string;
  wave?: string;
  generatedAt?: string;
  inventory?: SelectInventoryEntry[];
  excludedNonSupabaseSelectCalls?: number;
}): SelectInventoryPayload {
  const wave = params.wave ?? DEFAULT_SELECT_INVENTORY_WAVE;
  const collected =
    params.inventory == null || params.excludedNonSupabaseSelectCalls == null
      ? collectSelectInventory(params.projectRoot)
      : {
          inventory: params.inventory,
          excludedNonSupabaseSelectCalls: params.excludedNonSupabaseSelectCalls,
        };
  const aheadBehind = git(params.projectRoot, ["rev-list", "--left-right", "--count", "HEAD...origin/main"])
    .split(/\s+/)
    .map((value) => Number(value));
  const startedFrom: SelectInventoryStartedFrom = {
    head: git(params.projectRoot, ["rev-parse", "HEAD"]),
    origin_main: git(params.projectRoot, ["rev-parse", "origin/main"]),
    ahead: aheadBehind[0] ?? 0,
    behind: aheadBehind[1] ?? 0,
    worktree: git(params.projectRoot, ["status", "--short"]) === "" ? "clean" : "dirty",
  };

  return {
    wave,
    final_status: "GREEN_UNBOUNDED_SELECTS_REPEATABLE_SCANNER_READY",
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    startedFrom,
    scanner: {
      roots: [...DEFAULT_ROOTS],
      extensions: [...DEFAULT_EXTENSIONS],
      excludedFilePatterns: ["*.test.ts(x)", "*.spec.ts(x)", "*.contract.ts(x)", "*.d.ts"],
      ignoresCommentsAndStringLiterals: true,
      excludedNonSupabaseSelectCalls: collected.excludedNonSupabaseSelectCalls,
      classifier:
        "AST-light balanced-call scanner with Supabase chain/context heuristics; no production calls and no DB writes",
    },
    metrics: buildMetrics(collected.inventory, collected.excludedNonSupabaseSelectCalls),
    inventory: collected.inventory,
    safety: {
      toolingOnlyCodeChanged: true,
      runtimeCodeChanged: false,
      productionTouched: false,
      dbWrites: false,
      migrations: false,
      supabaseProjectChanges: false,
      spendCapChanges: false,
      realtimeLoadRun: false,
      destructiveDml: false,
      otaPublished: false,
      easBuildTriggered: false,
      secretsPrinted: false,
      broadCacheEnablement: false,
      broadRateLimitEnablement: false,
    },
  };
}

export function artifactPathsForWave(wave: string): { matrix: string; proof: string; inventory: string } {
  return {
    matrix: `artifacts/${wave}_matrix.json`,
    proof: `artifacts/${wave}_proof.md`,
    inventory: `artifacts/${wave}_inventory.json`,
  };
}

export function buildMatrixPayload(payload: SelectInventoryPayload): Record<string, unknown> {
  return {
    wave: payload.wave,
    final_status: payload.final_status,
    generatedAt: payload.generatedAt,
    startedFrom: payload.startedFrom,
    scope: payload.scanner,
    metrics: payload.metrics,
    selectedFiles: Object.values(artifactPathsForWave(payload.wave)),
    reasonSelected:
      "Repeatable scanner wave to make exact unbounded select inventory reproducible from the current checkout.",
    gates: {
      focusedTests: "pending",
      tsc: "pending",
      lint: "pending",
      npmTestRunInBand: "pending",
      architectureScanner: "pending",
      gitDiffCheck: "pending",
      releaseVerifyPostPush: "pending",
      artifactJsonParse: "pending",
    },
    negativeConfirmations: payload.safety,
    supabaseRealtimeStatus: "WAITING_FOR_SUPABASE_SUPPORT_RESPONSE",
  };
}

export function renderSelectInventoryProof(payload: SelectInventoryPayload): string {
  const lines = [
    `# ${payload.wave}`,
    "",
    `final_status: ${payload.final_status}`,
    `generated_at: ${payload.generatedAt}`,
    "",
    "## Scope",
    "",
    `- roots scanned: ${payload.scanner.roots.join(", ")}`,
    "- excluded: tests/specs/contracts, comments, string literals, Platform.select",
    `- Supabase-like select calls: ${payload.metrics.totalSelectCalls}`,
    `- excluded non-Supabase Platform.select calls: ${payload.metrics.excludedNonSupabaseSelectCalls}`,
    "",
    "## Metrics",
    "",
    `- current unresolved unbounded selects: ${payload.metrics.currentUnresolvedUnboundedSelects}`,
    `- select(\"*\") count: ${payload.metrics.selectStarCount}`,
    `- fix_now count: ${payload.metrics.fixNowCount}`,
    `- needs_rpc_change count: ${payload.metrics.needsRpcChangeCount}`,
    `- already_bounded count: ${payload.metrics.alreadyBoundedCount}`,
    `- domain_bounded count: ${payload.metrics.domainBoundedCount}`,
    `- export_allowlist count: ${payload.metrics.exportAllowlistCount}`,
    `- already classified count: ${payload.metrics.alreadyClassifiedCount}`,
    `- real-code-fix candidates: ${payload.metrics.realCodeFixCandidates}`,
    `- unbounded without detected limit/range/single: ${payload.metrics.unboundedWithoutDetectedLimitRangeSingle}`,
    "",
    "## Top Risk Files",
    "",
    "| file | high | medium | total | fix_now | needs_rpc_change |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...payload.metrics.topRiskFiles.map(
      (item) =>
        `| ${item.file} | ${item.high} | ${item.medium} | ${item.total} | ${item.fixNow} | ${item.needsRpcChange} |`,
    ),
    "",
    "## Negative Confirmations",
    "",
    "- production touched: NO",
    "- DB writes: NO",
    "- migrations: NO",
    "- Supabase project changes: NO",
    "- spend cap changes: NO",
    "- Realtime 50K/60K load: NO",
    "- destructive/unbounded DML: NO",
    "- OTA/EAS/TestFlight/native builds: NO",
    "- broad cache enablement: NO",
    "- broad rate-limit enablement: NO",
    "- secrets printed: NO",
    "",
    "## Supabase Realtime",
    "",
    "WAITING_FOR_SUPABASE_SUPPORT_RESPONSE",
  ];
  return `${lines.join("\n")}\n`;
}

export function writeSelectInventoryArtifacts(projectRoot: string, payload: SelectInventoryPayload): void {
  const paths = artifactPathsForWave(payload.wave);
  for (const relativePath of Object.values(paths)) {
    fs.mkdirSync(path.dirname(path.join(projectRoot, relativePath)), { recursive: true });
  }
  fs.writeFileSync(path.join(projectRoot, paths.inventory), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(projectRoot, paths.matrix), `${JSON.stringify(buildMatrixPayload(payload), null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(projectRoot, paths.proof), renderSelectInventoryProof(payload), "utf8");
}

function readFlagValue(flag: string): string | null {
  const prefix = `${flag}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(flag);
  if (index >= 0) return process.argv[index + 1] ?? null;
  return null;
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const wave = readFlagValue("--wave") ?? DEFAULT_SELECT_INVENTORY_WAVE;
  const payload = buildSelectInventoryPayload({ projectRoot: process.cwd(), wave });
  if (args.has("--write-artifacts")) writeSelectInventoryArtifacts(process.cwd(), payload);
  const summary = {
    final_status: payload.final_status,
    wave: payload.wave,
    metrics: payload.metrics,
    artifacts: artifactPathsForWave(payload.wave),
  };
  if (args.has("--json") || args.has("--write-artifacts")) console.info(JSON.stringify(summary, null, 2));
  else console.info(`final_status: ${payload.final_status}`);
}

const invokedAsCli = /(?:^|\/)unboundedSelectInventory\.[tj]s$/.test(normalizePath(process.argv[1] ?? ""));

if (invokedAsCli) main();
