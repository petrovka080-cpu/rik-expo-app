import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const checkpoint =
  process.env.CURRENT_CORE_CHECKPOINT?.trim() ||
  "e4daae88344f3f8f07e943701df5529aa9c64b74";
const outputRelativePath =
  "artifacts/current-core-closeout/current-core-scope-ledger.json";

const userOwnedPaths = new Set([
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_api34_results.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_screenshots.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_ui_dumps.json",
  "scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts",
  "scripts/e2e/androidDeepLinkLaunchContract.ts",
  "tests/e2e/androidDeepLinkLaunchContract.contract.test.ts",
]);

type Domain =
  | "estimator_wbs_runtime"
  | "release_verification"
  | "route_developer_access"
  | "platform_architecture"
  | "security"
  | "unrelated_user_owned";

type ScopeEntry = {
  path: string;
  gitStatus: string;
  changeLayer: "committed_since_checkpoint" | "working_tree";
  ownerDomain: Domain;
  reason: string;
  confirmedBlocker: string;
  relatedTests: string[];
  disposition: "keep_current_core" | "exclude_user_owned";
  userOwned: boolean;
};

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

function parseNameStatus(raw: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [status, ...pathParts] = line.split("\t");
    const relativePath = pathParts.at(-1)?.replaceAll("\\", "/") ?? "";
    if (relativePath) entries.set(relativePath, status);
  }
  return entries;
}

function classify(relativePath: string): Domain {
  if (userOwnedPaths.has(relativePath)) return "unrelated_user_owned";
  if (
    /developerOverride|officeRuntimePolicy|local_role_screen_access|developer-route|appAccessModel|officeAccess\.services\.localDeveloper|roleGuards/.test(
      relativePath,
    )
  ) {
    return "route_developer_access";
  }
  if (
    /runDeterministicShardedFullJest|jestPeakMemoryReporter|auditCurrentCoreNoTestWeakening|runEstimatorMemoryLifecycleGate|deterministicShardedFullJestRunner|estimatorMemoryLifecycleGate|package(-lock)?\.json/.test(
      relativePath,
    )
  ) {
    return "release_verification";
  }
  if (
    /security|EvidenceHygiene|noPii|S_SECURITY_PRIVACY/i.test(relativePath)
  ) {
    return "security";
  }
  if (
    /estimate|boq|cost|xlsx|professional|procurement|roadScope|Wbs|workCatalog|inlineWorkPrompt|consumerRequestItemPresentation/i.test(
      relativePath,
    )
  ) {
    return "estimator_wbs_runtime";
  }
  return "platform_architecture";
}

function evidenceFor(domain: Domain, relativePath: string) {
  if (domain === "unrelated_user_owned") {
    return {
      reason: "User-owned Android/e2e overlay; preserved without modification or staging.",
      blocker: "Out of current-core ownership boundary.",
      tests: [] as string[],
    };
  }
  if (domain === "route_developer_access") {
    return {
      reason: "Replace false-green legacy href checks with canonical Expo Router inventory and fail-closed developer access.",
      blocker: "Five legacy hrefs rendered Not Found while the former verifier reported GREEN.",
      tests: [
        "npm run verify:local-role-smoke",
        "src/lib/developerOverride.test.ts",
        "tests/officeAuth/roleGuards.contract.test.ts",
      ],
    };
  }
  if (domain === "release_verification") {
    return {
      reason: "Provide deterministic one-file-one-shard exact-SHA regression and bounded estimator lifecycle evidence.",
      blocker: "Full Jest previously lacked terminal, reproducible exact-SHA evidence.",
      tests: [
        "tests/releasePipeline/deterministicShardedFullJestRunner.contract.test.ts",
        "tests/estimateRuntime/estimatorMemoryLifecycleGate.contract.test.ts",
      ],
    };
  }
  if (domain === "security") {
    return {
      reason: "Make secret/PII evidence deterministic without exempting production paths.",
      blocker: "Security evidence gate produced false positives in its own probe definitions.",
      tests: ["tests/security/noPiiInArtifacts.contract.test.ts"],
    };
  }
  if (domain === "estimator_wbs_runtime") {
    return {
      reason: "Seal honest professional coverage, exact selection, WBS semantics, costing, revision/PDF/procurement parity, and bounded runtime state.",
      blocker: "Confirmed estimator truth, crane/WBS, material/costing, durability, or scale regression.",
      tests: [
        "tests/exactEstimate/real10000Compatibility.contract.test.ts",
        "tests/boqDepth/professionalWbsNoPadding.contract.test.ts",
        "tests/estimateRuntime/full11610TrustedCostingAudit.test.ts",
      ],
    };
  }
  return {
    reason: "Close a concrete full-regression platform gate without adding product behavior.",
    blocker: /AddListing/.test(relativePath)
      ? "God-component ownership gate."
      : /ai\.tsx/.test(relativePath)
        ? "AI route loading architecture gate."
        : /market|FlatList|WorkTemplate|ProfessionalBoqFullDetailDrawer/.test(
              relativePath,
            )
          ? "Bounded-list rendering gate."
          : /Json|json|Ledger|HistoryStore|RevisionStore|Durable|repository|Projection|Assumptions/.test(
                relativePath,
              )
            ? "Safe JSON/durable boundary gate."
            : /Rpc|RPC|supabase/i.test(relativePath)
              ? "RPC runtime enforcement scanner gate."
              : "Confirmed full-regression architecture gate.",
    tests: [
      "tests/architecture/godComponentsDecomposition.contract.test.ts",
      "tests/performance/flatListTuning.contract.test.ts",
      "tests/scale/sParse2JsonParse.contract.test.ts",
    ],
  };
}

function buildLedger(): ScopeEntry[] {
  const committed = parseNameStatus(
    git(["diff", "--name-status", `${checkpoint}..HEAD`]),
  );
  const working = parseNameStatus(git(["diff", "--name-status"]));
  for (const relativePath of git(["ls-files", "--others", "--exclude-standard"]).split(
    /\r?\n/,
  )) {
    const normalized = relativePath.trim().replaceAll("\\", "/");
    if (normalized) working.set(normalized, "??");
  }
  working.set(outputRelativePath, working.get(outputRelativePath) ?? "generated");

  const allPaths = [...new Set([...committed.keys(), ...working.keys()])].sort();
  return allPaths.map((relativePath) => {
    const userOwned = userOwnedPaths.has(relativePath);
    const ownerDomain = classify(relativePath);
    const evidence = evidenceFor(ownerDomain, relativePath);
    return {
      path: relativePath,
      gitStatus: working.get(relativePath) ?? committed.get(relativePath) ?? "unknown",
      changeLayer: working.has(relativePath)
        ? "working_tree"
        : "committed_since_checkpoint",
      ownerDomain,
      reason: evidence.reason,
      confirmedBlocker: evidence.blocker,
      relatedTests: evidence.tests,
      disposition: userOwned ? "exclude_user_owned" : "keep_current_core",
      userOwned,
    };
  });
}

const entries = buildLedger();
const payload = {
  status: "CURRENT_CORE_SCOPE_RECONCILED",
  generatedAt: new Date().toISOString(),
  checkpoint,
  subjectHead: git(["rev-parse", "HEAD"]),
  counts: {
    total: entries.length,
    committedSinceCheckpoint: entries.filter(
      (entry) => entry.changeLayer === "committed_since_checkpoint",
    ).length,
    workingTree: entries.filter(
      (entry) => entry.changeLayer === "working_tree",
    ).length,
    userOwnedExcluded: entries.filter((entry) => entry.userOwned).length,
  },
  protectedUserOwnedPaths: [...userOwnedPaths].sort(),
  domains: {
    estimator_wbs_runtime: entries.filter(
      (entry) => entry.ownerDomain === "estimator_wbs_runtime",
    ).length,
    release_verification: entries.filter(
      (entry) => entry.ownerDomain === "release_verification",
    ).length,
    route_developer_access: entries.filter(
      (entry) => entry.ownerDomain === "route_developer_access",
    ).length,
    platform_architecture: entries.filter(
      (entry) => entry.ownerDomain === "platform_architecture",
    ).length,
    security: entries.filter((entry) => entry.ownerDomain === "security")
      .length,
    unrelated_user_owned: entries.filter(
      (entry) => entry.ownerDomain === "unrelated_user_owned",
    ).length,
  },
  entries,
};

const outputPath = path.join(projectRoot, outputRelativePath);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify(payload.counts));
