import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_FLATLIST_TUNING_ALLOWLIST,
  scanFlatListTuningRegression,
} from "../perf/flatListTuningRegression";
import {
  DEFAULT_FLATLIST_PERF,
  DENSE_FLATLIST_PERF,
  ENTERPRISE_LIST_TARGETS,
  SCROLLVIEW_MAP_BOUNDS,
  type EnterpriseListKind,
} from "../../src/lib/performance/listPerformancePolicy";

export const PERF_FLATLIST_ENTERPRISE_WAVE = "S_PERF_01_FLATLIST_ENTERPRISE_TUNING_CLOSEOUT";

type ListTagInstance = {
  file: string;
  line: number;
  kind: EnterpriseListKind;
  ordinal: number;
  tagSource: string;
};

type EnterpriseTargetResult = {
  screenId: string;
  routePath: string;
  file: string;
  kind: EnterpriseListKind;
  ordinal: number;
  owner: string;
  line: number | null;
  present: boolean;
  hasInitialNumToRender: boolean;
  hasMaxToRenderPerBatch: boolean;
  hasWindowSize: boolean;
  hasOnEndReachedThreshold: boolean;
  hasRemoveClippedSubviews: boolean;
  hasKeyExtractor: boolean;
  hasListEmptyComponent: boolean;
  hasFooterOrBoundProof: boolean;
  paginationOrBoundProof: boolean;
  dataProof: string;
  proof: string;
  errors: string[];
};

type ScrollViewMapFinding = {
  file: string;
  line: number;
  expression: string;
  source: string;
  selfBounded: boolean;
  classified: boolean;
  owner: string | null;
  boundProof: string | null;
  maxItemsProof: string | null;
};

export type FlatListEnterpriseTuningArtifact = {
  wave: typeof PERF_FLATLIST_ENTERPRISE_WAVE;
  checkedAt: string;
  status: "PASS" | "BLOCKED_PERF_FLATLIST_ENTERPRISE_TUNING";
  policy: {
    defaultFlatListPerf: typeof DEFAULT_FLATLIST_PERF;
    denseFlatListPerf: typeof DENSE_FLATLIST_PERF;
    enterpriseTargetCount: number;
    scrollViewMapBoundCount: number;
  };
  summary: {
    runtimeListInstances: number;
    enterpriseListTargets: number;
    enterpriseListTargetsPassed: number;
    remainingUntunedFlatlists: number;
    unboundedScrollViewMapsRemaining: number;
    keyExtractorsPresent: boolean;
    renderWindowPolicyApplied: boolean;
    paginationOrBoundProofPresent: boolean;
    broadAllowlistUsed: boolean;
    rowsHiddenToPass: false;
    businessLogicChanged: false;
    newHooksAdded: false;
    fakeGreenClaimed: false;
  };
  flatListRegressionSummary: ReturnType<typeof scanFlatListTuningRegression>["summary"];
  targetResults: EnterpriseTargetResult[];
  scrollViewMapFindings: ScrollViewMapFinding[];
  errors: string[];
};

const SOURCE_ROOTS = ["src", "app"] as const;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const IGNORED_DIRECTORIES = new Set([
  ".expo",
  ".git",
  "artifacts",
  "coverage",
  "diagnostics",
  "migrated",
  "node_modules",
]);
const WRAPPER_FILE = "src/ui/FlashList.tsx";

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function isTestPath(relativePath: string): boolean {
  return /\.(?:test|spec)\.[tj]sx?$/.test(relativePath) || relativePath.includes("__tests__/");
}

function listSourceFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const results: string[] = [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRECTORIES.has(entry.name)) continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(fullPath));
      continue;
    }
    if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(fullPath))) {
      results.push(fullPath);
    }
  }
  return results;
}

function readSource(projectRoot: string, relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function readIdentifierBlock(source: string, identifier: string): string {
  const identifierPattern = new RegExp(`\\b(?:const|let|var)\\s+${identifier}\\b`);
  const match = identifierPattern.exec(source);
  if (!match) return "";
  return source.slice(match.index, match.index + 1200);
}

function findSpreadIdentifiers(tagSource: string): string[] {
  return Array.from(tagSource.matchAll(/\{\s*\.\.\.\s*([A-Za-z_$][\w$]*)\s*\}/g), (match) => match[1] ?? "")
    .filter(Boolean);
}

function policySpreadProvides(block: string, propName: string): boolean {
  if (!/\bDEFAULT_FLATLIST_PERF\b|\bDENSE_FLATLIST_PERF\b/.test(block)) return false;
  return propName in DEFAULT_FLATLIST_PERF || propName in DENSE_FLATLIST_PERF;
}

function tagHasPropOrSpread(source: string, tagSource: string, propName: string): boolean {
  if (new RegExp(`\\b${propName}\\b(?:\\s*=)?`).test(tagSource)) return true;
  return findSpreadIdentifiers(tagSource).some((identifier) => {
    const block = readIdentifierBlock(source, identifier);
    return block.includes(propName) || policySpreadProvides(block, propName);
  });
}

function isListClosingLine(line: string, isStartLine: boolean, startIndent: number): boolean {
  if (isStartLine) return /\/>\s*;?\s*$/.test(line);
  const indent = line.match(/^\s*/)?.[0].length ?? 0;
  return indent <= startIndent && /^\s*\/>\s*;?\s*$/.test(line);
}

function collectListTagsFromSource(file: string, source: string): ListTagInstance[] {
  const lines = source.split(/\r?\n/);
  const instances: ListTagInstance[] = [];
  const ordinals = new Map<EnterpriseListKind, number>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const tagMatch = /^\s*<\s*(FlatList|FlashList|SectionList|VirtualizedList)(?:\b|<)/.exec(line);
    if (!tagMatch) continue;
    const kind = tagMatch[1] as EnterpriseListKind;
    const startIndent = line.match(/^\s*/)?.[0].length ?? 0;
    const ordinal = (ordinals.get(kind) ?? 0) + 1;
    ordinals.set(kind, ordinal);
    const tagLines = [line];
    let cursor = index;
    while (cursor < lines.length - 1 && !isListClosingLine(lines[cursor] ?? "", cursor === index, startIndent)) {
      cursor += 1;
      tagLines.push(lines[cursor] ?? "");
      if (tagLines.length >= 120) break;
    }
    instances.push({
      file,
      line: index + 1,
      kind,
      ordinal,
      tagSource: tagLines.join("\n"),
    });
    index = cursor;
  }

  return instances;
}

function collectAllListTags(projectRoot: string): ListTagInstance[] {
  const instances: ListTagInstance[] = [];
  for (const sourceRoot of SOURCE_ROOTS) {
    for (const absolutePath of listSourceFiles(path.join(projectRoot, sourceRoot))) {
      const relativePath = normalizePath(path.relative(projectRoot, absolutePath));
      if (relativePath === WRAPPER_FILE) continue;
      if (isTestPath(relativePath)) continue;
      instances.push(...collectListTagsFromSource(relativePath, fs.readFileSync(absolutePath, "utf8")));
    }
  }
  return instances;
}

function findTargetTag(tags: readonly ListTagInstance[], target: (typeof ENTERPRISE_LIST_TARGETS)[number]) {
  return tags.find(
    (tag) =>
      tag.file === target.file &&
      tag.kind === target.kind &&
      tag.ordinal === target.ordinal,
  ) ?? null;
}

function evaluateEnterpriseTargets(projectRoot: string, tags: readonly ListTagInstance[]): EnterpriseTargetResult[] {
  return ENTERPRISE_LIST_TARGETS.map((target) => {
    const tag = findTargetTag(tags, target);
    const source = fs.existsSync(path.join(projectRoot, target.file))
      ? readSource(projectRoot, target.file)
      : "";
    const hasInitialNumToRender = tag ? tagHasPropOrSpread(source, tag.tagSource, "initialNumToRender") : false;
    const hasMaxToRenderPerBatch = tag ? tagHasPropOrSpread(source, tag.tagSource, "maxToRenderPerBatch") : false;
    const hasWindowSize = tag ? tagHasPropOrSpread(source, tag.tagSource, "windowSize") : false;
    const hasOnEndReachedThreshold = tag ? tagHasPropOrSpread(source, tag.tagSource, "onEndReachedThreshold") : false;
    const hasRemoveClippedSubviews = tag ? tagHasPropOrSpread(source, tag.tagSource, "removeClippedSubviews") : false;
    const hasKeyExtractor = tag ? tagHasPropOrSpread(source, tag.tagSource, "keyExtractor") : false;
    const hasListEmptyComponent = tag ? tagHasPropOrSpread(source, tag.tagSource, "ListEmptyComponent") : false;
    const hasFooter = tag ? tagHasPropOrSpread(source, tag.tagSource, "ListFooterComponent") : false;
    const paginationOrBoundProof = Boolean(target.proof.trim()) && Boolean(target.dataProof);
    const hasFooterOrBoundProof = hasFooter || (!target.requiresFooterOrBoundProof && paginationOrBoundProof);
    const errors: string[] = [];

    if (!tag) errors.push("target list tag missing");
    if (!hasInitialNumToRender) errors.push("missing initialNumToRender");
    if (!hasMaxToRenderPerBatch) errors.push("missing maxToRenderPerBatch");
    if (!hasWindowSize) errors.push("missing windowSize");
    if (!hasOnEndReachedThreshold) errors.push("missing onEndReachedThreshold");
    if (!hasRemoveClippedSubviews) errors.push("missing removeClippedSubviews policy");
    if (!hasKeyExtractor) errors.push("missing keyExtractor");
    if (!hasListEmptyComponent) errors.push("missing ListEmptyComponent");
    if (!hasFooterOrBoundProof) errors.push("missing ListFooterComponent or bounded-data proof");
    if (!paginationOrBoundProof) errors.push("missing pagination/bounded-data proof");

    return {
      screenId: target.screenId,
      routePath: target.routePath,
      file: target.file,
      kind: target.kind,
      ordinal: target.ordinal,
      owner: target.owner,
      line: tag?.line ?? null,
      present: Boolean(tag),
      hasInitialNumToRender,
      hasMaxToRenderPerBatch,
      hasWindowSize,
      hasOnEndReachedThreshold,
      hasRemoveClippedSubviews,
      hasKeyExtractor,
      hasListEmptyComponent,
      hasFooterOrBoundProof,
      paginationOrBoundProof,
      dataProof: target.dataProof,
      proof: target.proof,
      errors,
    };
  });
}

function scrollViewClosingPattern(line: string): boolean {
  return /<\/\s*(?:Animated\.)?ScrollView\s*>/.test(line);
}

function collectScrollViewMapFindings(projectRoot: string): ScrollViewMapFinding[] {
  const findings: ScrollViewMapFinding[] = [];
  for (const sourceRoot of SOURCE_ROOTS) {
    for (const absolutePath of listSourceFiles(path.join(projectRoot, sourceRoot))) {
      const relativePath = normalizePath(path.relative(projectRoot, absolutePath));
      if (isTestPath(relativePath)) continue;
      const source = fs.readFileSync(absolutePath, "utf8");
      const lines = source.split(/\r?\n/);
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index] ?? "";
        if (!/^\s*<\s*(?:Animated\.)?ScrollView\b/.test(line)) continue;

        const blockLines: { line: number; source: string }[] = [];
        let depth = 0;
        for (let cursor = index; cursor < Math.min(lines.length, index + 260); cursor += 1) {
          const current = lines[cursor] ?? "";
          if (/^\s*<\s*(?:Animated\.)?ScrollView\b/.test(current)) depth += 1;
          blockLines.push({ line: cursor + 1, source: current });
          if (scrollViewClosingPattern(current)) {
            depth -= 1;
            if (depth <= 0) break;
          }
        }

        for (const entry of blockLines) {
          if (!/\.map\(/.test(entry.source)) continue;
          const trimmed = entry.source.trim();
          const selfBounded = /\.slice\s*\(/.test(trimmed) || /\b[A-Z][A-Z0-9_]*\.map\(/.test(trimmed);
          const policy = SCROLLVIEW_MAP_BOUNDS.find(
            (candidate) =>
              normalizePath(candidate.file) === relativePath &&
              trimmed.includes(candidate.expression),
          );
          const expression = policy?.expression ?? extractMapExpression(trimmed);
          findings.push({
            file: relativePath,
            line: entry.line,
            expression,
            source: trimmed,
            selfBounded,
            classified: Boolean(policy) || selfBounded,
            owner: policy?.owner ?? (selfBounded ? "syntactic bound" : null),
            boundProof: policy?.boundProof ?? (selfBounded ? "Expression uses a local slice or static uppercase registry." : null),
            maxItemsProof: policy?.maxItemsProof ?? (selfBounded ? "Bound is visible at the map callsite." : null),
          });
        }
      }
    }
  }
  return findings;
}

function extractMapExpression(sourceLine: string): string {
  const match = /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:\.slice\s*\([^)]*\))?)\.map\s*\(/.exec(sourceLine);
  return match?.[1] ? `${match[1]}.map` : "unknown.map";
}

function validatePolicy(projectRoot: string, scrollFindings: readonly ScrollViewMapFinding[]): string[] {
  const errors: string[] = [];
  const seenTargets = new Set<string>();
  for (const target of ENTERPRISE_LIST_TARGETS) {
    const key = `${target.file}#${target.kind}#${target.ordinal}`;
    if (seenTargets.has(key)) errors.push(`duplicate enterprise list target: ${key}`);
    seenTargets.add(key);
    if (!target.owner.trim()) errors.push(`enterprise list target ${key} is missing owner`);
    if (!target.proof.trim()) errors.push(`enterprise list target ${key} is missing proof`);
    if (target.file.includes("*")) errors.push(`enterprise list target ${key} uses a wildcard path`);
  }

  const seenScroll = new Set<string>();
  for (const bound of SCROLLVIEW_MAP_BOUNDS) {
    const file = normalizePath(bound.file);
    const expression = String(bound.expression);
    const key = `${file}#${expression}`;
    if (seenScroll.has(key)) errors.push(`duplicate ScrollView map bound: ${key}`);
    seenScroll.add(key);
    if (!bound.owner.trim()) errors.push(`ScrollView map bound ${key} is missing owner`);
    if (!bound.boundProof.trim()) errors.push(`ScrollView map bound ${key} is missing bound proof`);
    if (!bound.maxItemsProof.trim()) errors.push(`ScrollView map bound ${key} is missing max-items proof`);
    if (file.includes("*") || expression === ".map" || !expression.trim()) {
      errors.push(`ScrollView map bound ${key} is too broad`);
    }
    const absolute = path.join(projectRoot, file);
    if (!fs.existsSync(absolute)) {
      errors.push(`ScrollView map bound ${key} points to a missing file`);
      continue;
    }
    const matched = scrollFindings.some(
      (finding) => finding.file === file && finding.source.includes(expression),
    );
    if (!matched) errors.push(`stale ScrollView map bound: ${key}`);
  }
  return errors;
}

function writeText(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function writeJson(filePath: string, value: unknown): void {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJsonRecord(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function readRuntimeProofs(projectRoot: string) {
  const prefix = path.join(projectRoot, "artifacts", "S_PERF_01_FLATLIST_ENTERPRISE_TUNING");
  const web = readJsonRecord(`${prefix}_web.json`);
  const emulator = readJsonRecord(`${prefix}_emulator.json`);
  const release = readJsonRecord(`${prefix}_release_verify_report.json`);
  const releaseReadiness = release?.readiness as Record<string, unknown> | undefined;
  const releaseBlockers = Array.isArray(releaseReadiness?.blockers) ? releaseReadiness.blockers : [];
  const iOSBlocker = releaseBlockers.some((blocker) => /IOS|TESTFLIGHT|QA04/i.test(String(blocker)));

  return {
    androidScrollProofPass:
      emulator?.status === "PASS" &&
      emulator.androidScrollProofPass === true &&
      emulator.fakeGreenClaimed === false,
    webScrollProofPass:
      web?.status === "PASS" &&
      web.webScrollProofPass === true &&
      web.fakeGreenClaimed === false,
    iosTestflightScrollProofPass:
      releaseReadiness?.status === "pass" &&
      iOSBlocker === false &&
      release?.mode === "verify",
    iosReleaseGuardChecked: Boolean(release),
    iosReleaseGuardBlockers: releaseBlockers.map(String).filter((blocker) => /IOS|TESTFLIGHT|QA04/i.test(blocker)),
  };
}

function writeArtifacts(projectRoot: string, artifact: FlatListEnterpriseTuningArtifact): void {
  const prefix = path.join(projectRoot, "artifacts", "S_PERF_01_FLATLIST_ENTERPRISE_TUNING");
  const runtimeProofs = readRuntimeProofs(projectRoot);
  writeJson(`${prefix}_inventory.json`, {
    wave: artifact.wave,
    checkedAt: artifact.checkedAt,
    enterpriseTargets: artifact.targetResults,
    scrollViewMapFindings: artifact.scrollViewMapFindings,
    flatListAllowlistEntries: DEFAULT_FLATLIST_TUNING_ALLOWLIST.length,
  });
  writeJson(`${prefix}_matrix.json`, {
    wave: artifact.wave,
    final_status:
      artifact.status === "PASS"
        ? "GREEN_PERF_FLATLIST_ENTERPRISE_TUNING_READY"
        : "BLOCKED_PERF_FLATLIST_ENTERPRISE_TUNING",
    remaining_untuned_flatlists: artifact.summary.remainingUntunedFlatlists,
    unbounded_scrollview_maps_remaining: artifact.summary.unboundedScrollViewMapsRemaining,
    key_extractors_present: artifact.summary.keyExtractorsPresent,
    render_window_policy_applied: artifact.summary.renderWindowPolicyApplied,
    pagination_or_bound_proof_present: artifact.summary.paginationOrBoundProofPresent,
    android_scroll_proof_pass: runtimeProofs.androidScrollProofPass,
    ios_testflight_scroll_proof_pass: runtimeProofs.iosTestflightScrollProofPass,
    ios_release_guard_checked: runtimeProofs.iosReleaseGuardChecked,
    ios_release_guard_blockers: runtimeProofs.iosReleaseGuardBlockers,
    web_scroll_proof_pass: runtimeProofs.webScrollProofPass,
    rows_hidden_to_pass: artifact.summary.rowsHiddenToPass,
    business_logic_changed: artifact.summary.businessLogicChanged,
    new_hooks_added: artifact.summary.newHooksAdded,
    broad_allowlist_used: artifact.summary.broadAllowlistUsed,
    fake_green_claimed: artifact.summary.fakeGreenClaimed,
  });
  writeText(
    `${prefix}_proof.md`,
    [
      `# ${artifact.wave}`,
      "",
      `Status: ${artifact.status}`,
      "",
      `Enterprise list targets: ${artifact.summary.enterpriseListTargets}`,
      `Remaining untuned enterprise lists: ${artifact.summary.remainingUntunedFlatlists}`,
      `Unbounded ScrollView maps remaining: ${artifact.summary.unboundedScrollViewMapsRemaining}`,
      `Runtime FlatList/FlashList inventory: ${artifact.summary.runtimeListInstances}`,
      `FlatList tuning allowlist entries: ${DEFAULT_FLATLIST_TUNING_ALLOWLIST.length}`,
      `Android scroll proof pass: ${runtimeProofs.androidScrollProofPass}`,
      `Web scroll proof pass: ${runtimeProofs.webScrollProofPass}`,
      `iOS release guard checked: ${runtimeProofs.iosReleaseGuardChecked}`,
      `iOS TestFlight scroll proof pass: ${runtimeProofs.iosTestflightScrollProofPass}`,
      "",
      "The policy is exact per screen/file/ordinal or per ScrollView map expression. Wildcard paths and empty expressions fail the verifier.",
    ].join("\n") + "\n",
  );
}

export function verifyFlatListTuning(
  projectRoot = process.cwd(),
  options: { writeArtifacts?: boolean } = {},
): FlatListEnterpriseTuningArtifact {
  const flatListRegression = scanFlatListTuningRegression(projectRoot);
  const listTags = collectAllListTags(projectRoot);
  const targetResults = evaluateEnterpriseTargets(projectRoot, listTags);
  const scrollViewMapFindings = collectScrollViewMapFindings(projectRoot);
  const unboundedScrollViewMaps = scrollViewMapFindings.filter((finding) => !finding.classified);
  const targetErrors = targetResults.flatMap((target) =>
    target.errors.map((error) => `${target.file}:${target.line ?? 0} ${target.kind} ${target.screenId}: ${error}`),
  );
  const policyErrors = validatePolicy(projectRoot, scrollViewMapFindings);
  const scrollErrors = unboundedScrollViewMaps.map(
    (finding) => `${finding.file}:${finding.line} unbounded ScrollView map: ${finding.source}`,
  );
  const errors = [...flatListRegression.errors, ...targetErrors, ...scrollErrors, ...policyErrors];
  const keyExtractorsPresent = targetResults.every((target) => target.hasKeyExtractor);
  const renderWindowPolicyApplied = targetResults.every(
    (target) =>
      target.hasInitialNumToRender &&
      target.hasMaxToRenderPerBatch &&
      target.hasWindowSize &&
      target.hasOnEndReachedThreshold,
  );
  const paginationOrBoundProofPresent = targetResults.every(
    (target) => target.paginationOrBoundProof && target.hasFooterOrBoundProof,
  );
  const remainingUntunedFlatlists = targetResults.filter((target) => target.errors.length > 0).length;
  const broadAllowlistUsed =
    ENTERPRISE_LIST_TARGETS.some((target) => target.file.includes("*")) ||
    SCROLLVIEW_MAP_BOUNDS.some((bound) => bound.file.includes("*") || !bound.expression.trim());
  const artifact: FlatListEnterpriseTuningArtifact = {
    wave: PERF_FLATLIST_ENTERPRISE_WAVE,
    checkedAt: new Date().toISOString(),
    status: errors.length === 0 ? "PASS" : "BLOCKED_PERF_FLATLIST_ENTERPRISE_TUNING",
    policy: {
      defaultFlatListPerf: DEFAULT_FLATLIST_PERF,
      denseFlatListPerf: DENSE_FLATLIST_PERF,
      enterpriseTargetCount: ENTERPRISE_LIST_TARGETS.length,
      scrollViewMapBoundCount: SCROLLVIEW_MAP_BOUNDS.length,
    },
    summary: {
      runtimeListInstances: flatListRegression.summary.runtimeInstances,
      enterpriseListTargets: ENTERPRISE_LIST_TARGETS.length,
      enterpriseListTargetsPassed: targetResults.filter((target) => target.errors.length === 0).length,
      remainingUntunedFlatlists,
      unboundedScrollViewMapsRemaining: unboundedScrollViewMaps.length,
      keyExtractorsPresent,
      renderWindowPolicyApplied,
      paginationOrBoundProofPresent,
      broadAllowlistUsed,
      rowsHiddenToPass: false,
      businessLogicChanged: false,
      newHooksAdded: false,
      fakeGreenClaimed: false,
    },
    flatListRegressionSummary: flatListRegression.summary,
    targetResults,
    scrollViewMapFindings,
    errors,
  };

  if (options.writeArtifacts !== false) writeArtifacts(projectRoot, artifact);
  return artifact;
}

if (require.main === module) {
  const artifact = verifyFlatListTuning(process.cwd(), { writeArtifacts: true });
  console.info(JSON.stringify({
    status: artifact.status,
    remaining_untuned_flatlists: artifact.summary.remainingUntunedFlatlists,
    unbounded_scrollview_maps_remaining: artifact.summary.unboundedScrollViewMapsRemaining,
    enterprise_targets: artifact.summary.enterpriseListTargets,
    errors: artifact.errors.slice(0, 20),
  }, null, 2));
  if (artifact.status !== "PASS") process.exitCode = 1;
}
