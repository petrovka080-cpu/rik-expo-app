import fs from "node:fs";
import path from "node:path";

export type ErrorHandlingGapClassification =
  | "finally_cleanup"
  | "intentional_propagation";

export type TryFinallyAllowlistEntry = {
  file: string;
  ordinal: number;
  owner: string;
  reason: string;
  classification: ErrorHandlingGapClassification;
  migrationPath: string;
  redactedObservabilityProof: string;
};

export type TrySegment = {
  file: string;
  line: number;
  ordinal: number;
  hasCatch: boolean;
  hasFinally: boolean;
};

export type TryFinallyOnlyFinding = TrySegment & {
  allowlist: TryFinallyAllowlistEntry | null;
  status: "documented" | "undocumented";
};

export type CatchBlockFinding = {
  file: string;
  line: number;
  ordinal: number;
  empty: boolean;
  hasThrow: boolean;
  hasRedactedObservabilitySignal: boolean;
  status: "ok" | "empty" | "missing_signal";
};

export type RawDiagnosticSinkFinding = {
  file: string;
  line: number;
  sink: "console.error" | "console.warn";
  status: "raw_sink";
};

export type ErrorHandlingGapRatchetSummary = {
  targetFiles: number;
  tryFinallyOnly: number;
  documentedTryFinallyOnly: number;
  undocumentedTryFinallyOnly: number;
  catchBlocks: number;
  catchBlocksMissingSignal: number;
  emptyCatchBlocks: number;
  rawDiagnosticSinkFindings: number;
  silentSwallow: number;
  allowlistEntries: number;
  matchedAllowlistEntries: number;
  staleAllowlistEntries: number;
  allowlistMetadataErrors: number;
  topFiles: readonly { file: string; count: number }[];
};

export type ErrorHandlingGapRatchetResult = {
  summary: ErrorHandlingGapRatchetSummary;
  tryFinallyOnlyFindings: readonly TryFinallyOnlyFinding[];
  catchBlockFindings: readonly CatchBlockFinding[];
  rawDiagnosticSinkFindings: readonly RawDiagnosticSinkFinding[];
  errors: readonly string[];
};

const TARGET_FILES = [
  "src/lib/api/director_reports.naming.ts",
  "src/lib/documents/pdfDocumentActions.ts",
  "src/lib/pdfRunner.ts",
  "src/screens/contractor/hooks/useContractorProgressReliability.ts",
] as const;

export const DEFAULT_TRY_FINALLY_ALLOWLIST: readonly TryFinallyAllowlistEntry[] = [
  {
    file: "src/lib/api/director_reports.naming.ts",
    ordinal: 1,
    classification: "finally_cleanup",
    owner: "director reports naming owner",
    reason: "Object-name lookup in-flight cache cleanup must always release the key while the read failure propagates to the caller.",
    migrationPath: "Move lookup cache lifecycle into a typed director naming repository boundary.",
    redactedObservabilityProof: "No catch body logs here; errors propagate and cache cleanup has no payload fields.",
  },
  {
    file: "src/lib/api/director_reports.naming.ts",
    ordinal: 2,
    classification: "finally_cleanup",
    owner: "director reports naming owner",
    reason: "Code lookup in-flight cleanup must run after success or failure without converting the read error to a fallback.",
    migrationPath: "Move code lookup cache lifecycle into a typed director naming repository boundary.",
    redactedObservabilityProof: "No catch body logs here; errors propagate and cache cleanup has no payload fields.",
  },
  {
    file: "src/lib/api/director_reports.naming.ts",
    ordinal: 3,
    classification: "finally_cleanup",
    owner: "director reports naming owner",
    reason: "Material-name resolution in-flight cleanup releases the lookup key while preserving the caller-visible read result.",
    migrationPath: "Move material-name lookup cache lifecycle into a typed director naming repository boundary.",
    redactedObservabilityProof: "No catch body logs here; errors propagate and cache cleanup has no payload fields.",
  },
  {
    file: "src/lib/documents/pdfDocumentActions.ts",
    ordinal: 1,
    classification: "intentional_propagation",
    owner: "pdf document owner",
    reason: "PDF busy orchestration intentionally lets prepare/viewer errors propagate after the nested boundary records terminal failure.",
    migrationPath: "Keep the split prepare/viewer boundary; future PDF state machine can own the cleanup contract explicitly.",
    redactedObservabilityProof: "Terminal failures are recorded through PDF action/open boundary helpers before propagation.",
  },
  {
    file: "src/lib/documents/pdfDocumentActions.ts",
    ordinal: 2,
    classification: "finally_cleanup",
    owner: "pdf document owner",
    reason: "Manual busy cleanup must hide the busy owner even when PDF prepare/viewer work rejects.",
    migrationPath: "Move manual busy cleanup to the typed PDF visibility busy plan if the flow is split again.",
    redactedObservabilityProof: "Finally body only hides busy UI and records a fixed stage marker.",
  },
  {
    file: "src/lib/pdfRunner.ts",
    ordinal: 1,
    classification: "finally_cleanup",
    owner: "pdf runner owner",
    reason: "Timeout cleanup clears the timer after success or rejection and must not wrap the original error.",
    migrationPath: "Keep the utility local until PDF runner timeout handling moves to a shared cancellable helper.",
    redactedObservabilityProof: "Finally body only clears a timeout handle and never logs payloads.",
  },
  {
    file: "src/lib/pdfRunner.ts",
    ordinal: 2,
    classification: "finally_cleanup",
    owner: "pdf runner owner",
    reason: "Manual busy cleanup must hide the native PDF busy indicator while preserving prepare/open error propagation.",
    migrationPath: "Move manual busy cleanup into a typed PDF runner execution plan.",
    redactedObservabilityProof: "Finally body only hides local busy state and never logs payloads.",
  },
  {
    file: "src/screens/contractor/hooks/useContractorProgressReliability.ts",
    ordinal: 1,
    classification: "intentional_propagation",
    owner: "contractor progress owner",
    reason: "Submit progress keeps saving-state cleanup local while preserving queue/draft failure propagation to the caller boundary.",
    migrationPath: "Move submit lifecycle into a typed contractor progress controller boundary.",
    redactedObservabilityProof: "Finally body only resets saving state; telemetry is fixed-field before flush/queue calls.",
  },
  {
    file: "src/screens/contractor/hooks/useContractorProgressReliability.ts",
    ordinal: 2,
    classification: "intentional_propagation",
    owner: "contractor progress owner",
    reason: "Manual retry keeps saving-state cleanup local while preserving queue/draft failure propagation to the caller boundary.",
    migrationPath: "Move retry lifecycle into a typed contractor progress controller boundary.",
    redactedObservabilityProof: "Finally body only resets saving state; telemetry is fixed-field before flush/queue calls.",
  },
];

const normalizePath = (value: string): string => value.replace(/\\/g, "/");

const countLine = (source: string, index: number): number =>
  source.slice(0, index).split(/\r?\n/).length;

function findMatchingBrace(source: string, openBraceIndex: number): number {
  let depth = 0;
  let mode: "normal" | "line_comment" | "block_comment" | "single" | "double" | "template" = "normal";
  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index] ?? "";
    const next = source[index + 1] ?? "";

    if (mode === "line_comment") {
      if (char === "\n") mode = "normal";
      continue;
    }
    if (mode === "block_comment") {
      if (char === "*" && next === "/") {
        mode = "normal";
        index += 1;
      }
      continue;
    }
    if (mode === "single") {
      if (char === "\\") {
        index += 1;
      } else if (char === "'") {
        mode = "normal";
      }
      continue;
    }
    if (mode === "double") {
      if (char === "\\") {
        index += 1;
      } else if (char === "\"") {
        mode = "normal";
      }
      continue;
    }
    if (mode === "template") {
      if (char === "\\") {
        index += 1;
      } else if (char === "`") {
        mode = "normal";
      }
      continue;
    }

    if (char === "/" && next === "/") {
      mode = "line_comment";
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      mode = "block_comment";
      index += 1;
      continue;
    }
    if (char === "'") {
      mode = "single";
      continue;
    }
    if (char === "\"") {
      mode = "double";
      continue;
    }
    if (char === "`") {
      mode = "template";
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function skipIgnorable(source: string, start: number): number {
  let index = start;
  while (index < source.length) {
    const char = source[index] ?? "";
    const next = source[index + 1] ?? "";
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "/" && next === "/") {
      index += 2;
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) index += 1;
      index += 2;
      continue;
    }
    break;
  }
  return index;
}

function startsWithWord(source: string, index: number, word: "catch" | "finally"): boolean {
  if (source.slice(index, index + word.length) !== word) return false;
  const before = index > 0 ? source[index - 1] ?? "" : "";
  const after = source[index + word.length] ?? "";
  return !/[A-Za-z0-9_$]/.test(before) && !/[A-Za-z0-9_$]/.test(after);
}

function findBlockAfterKeyword(source: string, keywordIndex: number): { open: number; close: number } | null {
  const open = source.indexOf("{", keywordIndex);
  if (open < 0) return null;
  const close = findMatchingBrace(source, open);
  if (close < 0) return null;
  return { open, close };
}

function stripCommentsAndWhitespace(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\r\n]*/g, "")
    .trim();
}

function hasRedactedObservabilitySignal(body: string): boolean {
  return /\b(recordCatchDiscipline|reportAndSwallow|recordPlatformObservability|warnDirectorNaming|recordPdfRunnerCatch|recordBoundary|recordPdfOpenStage|logError|observation\.error|sourceObservation\.error|openObservation\.error)\b/.test(body);
}

function findTrySegments(params: { file: string; source: string }): {
  segments: TrySegment[];
  catchBlocks: CatchBlockFinding[];
} {
  const segments: TrySegment[] = [];
  const catchBlocks: CatchBlockFinding[] = [];
  const tryRegex = /\btry\s*\{/g;
  let match: RegExpExecArray | null;
  let tryOrdinal = 0;
  let tryFinallyOnlyOrdinal = 0;
  let catchOrdinal = 0;

  while ((match = tryRegex.exec(params.source)) !== null) {
    const tryOpen = params.source.indexOf("{", match.index);
    const tryClose = findMatchingBrace(params.source, tryOpen);
    if (tryClose < 0) continue;

    tryOrdinal += 1;
    let cursor = skipIgnorable(params.source, tryClose + 1);
    let hasCatch = false;
    let hasFinally = false;

    if (startsWithWord(params.source, cursor, "catch")) {
      hasCatch = true;
      const catchKeyword = cursor;
      const catchBlock = findBlockAfterKeyword(params.source, catchKeyword);
      if (catchBlock) {
        catchOrdinal += 1;
        const body = params.source.slice(catchBlock.open + 1, catchBlock.close);
        const empty = stripCommentsAndWhitespace(body).length === 0;
        const hasThrow = /\bthrow\b/.test(body);
        const hasSignal = hasRedactedObservabilitySignal(body);
        catchBlocks.push({
          file: params.file,
          line: countLine(params.source, catchKeyword),
          ordinal: catchOrdinal,
          empty,
          hasThrow,
          hasRedactedObservabilitySignal: hasSignal,
          status: empty ? "empty" : hasThrow || hasSignal ? "ok" : "missing_signal",
        });
        cursor = skipIgnorable(params.source, catchBlock.close + 1);
      }
    }

    if (startsWithWord(params.source, cursor, "finally")) {
      hasFinally = true;
    }

    if (hasFinally && !hasCatch) {
      tryFinallyOnlyOrdinal += 1;
      segments.push({
        file: params.file,
        line: countLine(params.source, match.index),
        ordinal: tryFinallyOnlyOrdinal,
        hasCatch,
        hasFinally,
      });
    } else {
      segments.push({
        file: params.file,
        line: countLine(params.source, match.index),
        ordinal: tryOrdinal,
        hasCatch,
        hasFinally,
      });
    }
  }

  return { segments, catchBlocks };
}

function findRawDiagnosticSinks(params: { file: string; source: string }): RawDiagnosticSinkFinding[] {
  const lines = params.source.split(/\r?\n/);
  const findings: RawDiagnosticSinkFinding[] = [];
  lines.forEach((lineText, index) => {
    const sink = /\b(console\.(?:error|warn))\b/.exec(lineText)?.[1];
    if (!sink) return;
    if (/\b(redactSensitive|safeMessage|redacted)\b/.test(lineText)) return;
    if (lineText.includes("[director_reports.naming]")) return;
    findings.push({
      file: params.file,
      line: index + 1,
      sink: sink === "console.warn" ? "console.warn" : "console.error",
      status: "raw_sink",
    });
  });
  return findings;
}

function allowlistKey(entry: Pick<TryFinallyAllowlistEntry, "file" | "ordinal">): string {
  return `${normalizePath(entry.file)}#${entry.ordinal}`;
}

function validateAllowlist(
  allowlist: readonly TryFinallyAllowlistEntry[],
  findings: readonly TryFinallyOnlyFinding[],
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const findingKeys = new Set(findings.map((finding) => `${finding.file}#${finding.ordinal}`));
  for (const entry of allowlist) {
    const key = allowlistKey(entry);
    if (seen.has(key)) errors.push(`error_handling_allowlist_duplicate:${key}`);
    seen.add(key);
    if (
      !entry.owner.trim() ||
      !entry.reason.trim() ||
      !entry.migrationPath.trim() ||
      !entry.redactedObservabilityProof.trim()
    ) {
      errors.push(`error_handling_allowlist_missing_metadata:${key}`);
    }
    if (!findingKeys.has(key)) errors.push(`error_handling_allowlist_stale:${key}`);
  }
  return errors;
}

function countByFile(
  findings: readonly (TryFinallyOnlyFinding | CatchBlockFinding | RawDiagnosticSinkFinding)[],
): readonly { file: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding.file, (counts.get(finding.file) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([file, count]) => ({ file, count }))
    .sort((left, right) => right.count - left.count || left.file.localeCompare(right.file))
    .slice(0, 8);
}

export function scanErrorHandlingGapSource(params: {
  file: string;
  source: string;
  allowlist?: readonly TryFinallyAllowlistEntry[];
}): ErrorHandlingGapRatchetResult {
  const file = normalizePath(params.file);
  const allowlist = params.allowlist ?? DEFAULT_TRY_FINALLY_ALLOWLIST;
  const { segments, catchBlocks } = findTrySegments({ file, source: params.source });
  const tryFinallyOnlyFindings = segments
    .filter((segment) => segment.hasFinally && !segment.hasCatch)
    .map((segment): TryFinallyOnlyFinding => {
      const allowlistEntry =
        allowlist.find((entry) => allowlistKey(entry) === `${segment.file}#${segment.ordinal}`) ?? null;
      return {
        ...segment,
        allowlist: allowlistEntry,
        status: allowlistEntry ? "documented" : "undocumented",
      };
    });
  const rawSinks = findRawDiagnosticSinks({ file, source: params.source });
  const allowlistErrors = validateAllowlist(allowlist, tryFinallyOnlyFindings);
  const missingCatchSignal = catchBlocks.filter((finding) => finding.status !== "ok");
  const errors = [
    ...tryFinallyOnlyFindings
      .filter((finding) => finding.status === "undocumented")
      .map((finding) => `error_handling_try_finally_unclassified:${finding.file}:${finding.line}:ordinal=${finding.ordinal}`),
    ...missingCatchSignal.map(
      (finding) => `error_handling_catch_${finding.status}:${finding.file}:${finding.line}:ordinal=${finding.ordinal}`,
    ),
    ...rawSinks.map((finding) => `error_handling_raw_diagnostic_sink:${finding.file}:${finding.line}:${finding.sink}`),
    ...allowlistErrors,
  ];
  const matchedAllowlistEntries = allowlist.filter((entry) =>
    tryFinallyOnlyFindings.some((finding) => `${finding.file}#${finding.ordinal}` === allowlistKey(entry)),
  ).length;

  return {
    summary: {
      targetFiles: 1,
      tryFinallyOnly: tryFinallyOnlyFindings.length,
      documentedTryFinallyOnly: tryFinallyOnlyFindings.filter((finding) => finding.status === "documented").length,
      undocumentedTryFinallyOnly: tryFinallyOnlyFindings.filter((finding) => finding.status === "undocumented").length,
      catchBlocks: catchBlocks.length,
      catchBlocksMissingSignal: missingCatchSignal.filter((finding) => finding.status === "missing_signal").length,
      emptyCatchBlocks: missingCatchSignal.filter((finding) => finding.status === "empty").length,
      rawDiagnosticSinkFindings: rawSinks.length,
      silentSwallow: missingCatchSignal.length,
      allowlistEntries: allowlist.length,
      matchedAllowlistEntries,
      staleAllowlistEntries: allowlist.length - matchedAllowlistEntries,
      allowlistMetadataErrors: allowlistErrors.filter((error) => error.includes("missing_metadata")).length,
      topFiles: countByFile([...tryFinallyOnlyFindings, ...missingCatchSignal, ...rawSinks]),
    },
    tryFinallyOnlyFindings,
    catchBlockFindings: catchBlocks,
    rawDiagnosticSinkFindings: rawSinks,
    errors,
  };
}

export function scanErrorHandlingGapRatchet(
  projectRoot = process.cwd(),
  allowlist: readonly TryFinallyAllowlistEntry[] = DEFAULT_TRY_FINALLY_ALLOWLIST,
  targetFiles: readonly string[] = TARGET_FILES,
): ErrorHandlingGapRatchetResult {
  const tryFinallyOnlyFindings: TryFinallyOnlyFinding[] = [];
  const catchBlockFindings: CatchBlockFinding[] = [];
  const rawDiagnosticSinkFindings: RawDiagnosticSinkFinding[] = [];
  const missingTargetFiles: string[] = [];

  for (const targetFile of targetFiles) {
    const file = normalizePath(targetFile);
    const absolutePath = path.join(projectRoot, file);
    if (!fs.existsSync(absolutePath)) {
      missingTargetFiles.push(file);
      continue;
    }
    const source = fs.readFileSync(absolutePath, "utf8");
    const result = scanErrorHandlingGapSource({
      file,
      source,
      allowlist: allowlist.filter((entry) => normalizePath(entry.file) === file),
    });
    tryFinallyOnlyFindings.push(...result.tryFinallyOnlyFindings);
    catchBlockFindings.push(...result.catchBlockFindings);
    rawDiagnosticSinkFindings.push(...result.rawDiagnosticSinkFindings);
  }

  const allowlistErrors = validateAllowlist(allowlist, tryFinallyOnlyFindings);
  const undocumented = tryFinallyOnlyFindings.filter((finding) => finding.status === "undocumented");
  const catchFailures = catchBlockFindings.filter((finding) => finding.status !== "ok");
  const matchedAllowlistEntries = allowlist.filter((entry) =>
    tryFinallyOnlyFindings.some((finding) => `${finding.file}#${finding.ordinal}` === allowlistKey(entry)),
  ).length;
  const errors = [
    ...missingTargetFiles.map((file) => `error_handling_target_missing:${file}`),
    ...undocumented.map(
      (finding) => `error_handling_try_finally_unclassified:${finding.file}:${finding.line}:ordinal=${finding.ordinal}`,
    ),
    ...catchFailures.map(
      (finding) => `error_handling_catch_${finding.status}:${finding.file}:${finding.line}:ordinal=${finding.ordinal}`,
    ),
    ...rawDiagnosticSinkFindings.map(
      (finding) => `error_handling_raw_diagnostic_sink:${finding.file}:${finding.line}:${finding.sink}`,
    ),
    ...allowlistErrors,
  ];

  return {
    summary: {
      targetFiles: targetFiles.length - missingTargetFiles.length,
      tryFinallyOnly: tryFinallyOnlyFindings.length,
      documentedTryFinallyOnly: tryFinallyOnlyFindings.length - undocumented.length,
      undocumentedTryFinallyOnly: undocumented.length,
      catchBlocks: catchBlockFindings.length,
      catchBlocksMissingSignal: catchFailures.filter((finding) => finding.status === "missing_signal").length,
      emptyCatchBlocks: catchFailures.filter((finding) => finding.status === "empty").length,
      rawDiagnosticSinkFindings: rawDiagnosticSinkFindings.length,
      silentSwallow: catchFailures.length,
      allowlistEntries: allowlist.length,
      matchedAllowlistEntries,
      staleAllowlistEntries: allowlist.length - matchedAllowlistEntries,
      allowlistMetadataErrors: allowlistErrors.filter((error) => error.includes("missing_metadata")).length,
      topFiles: countByFile([...tryFinallyOnlyFindings, ...catchFailures, ...rawDiagnosticSinkFindings]),
    },
    tryFinallyOnlyFindings,
    catchBlockFindings,
    rawDiagnosticSinkFindings,
    errors,
  };
}

export function evaluateErrorHandlingGapRatchet(result: ErrorHandlingGapRatchetResult): {
  check: { name: string; status: "pass" | "fail"; errors: string[] };
  summary: ErrorHandlingGapRatchetSummary;
} {
  return {
    check: {
      name: "error_handling_gap_ratchet",
      status: result.errors.length === 0 ? "pass" : "fail",
      errors: [...result.errors],
    },
    summary: result.summary,
  };
}

function main(): void {
  const result = scanErrorHandlingGapRatchet(process.cwd());
  const evaluated = evaluateErrorHandlingGapRatchet(result);
  console.info(
    JSON.stringify(
      {
        ...evaluated,
        tryFinallyOnlyFindings: result.tryFinallyOnlyFindings,
        catchBlockFindings: result.catchBlockFindings,
        rawDiagnosticSinkFindings: result.rawDiagnosticSinkFindings,
      },
      null,
      2,
    ),
  );
  if (evaluated.check.status === "fail") process.exit(1);
}

const invokedAsCli = /(?:^|\/)errorHandlingGapRatchet\.[tj]s$/.test(
  normalizePath(process.argv[1] ?? ""),
);

if (invokedAsCli) {
  main();
}
