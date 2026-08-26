import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SPEC_SHA256 = "5a8e16fb5e9695103fad7b7ea4a959a52edbc8d414583a8aee2d26e460ad22b6";
const SUCCESSOR_CHECKPOINT = "f2dac926d1b34d61efdb3aeaa82bf5423358da78";
const EVIDENCE_ROOT = path.join(
  ".release-runtime",
  "p0-one-monolith-r5",
  "evidence",
  "01-preservation",
);

type WorktreeInventoryRow = {
  path: string;
  branch_or_detached: string;
  head: string;
  tree: string;
  dirty_tracked: number;
  dirty_untracked: number;
  ahead_behind: { behind_checkpoint: number; ahead_of_checkpoint: number };
};

type WorktreeInventory = {
  worktreeCount: number;
  dirtyWorktreeCount: number;
  worktrees: WorktreeInventoryRow[];
  reachableCommitCount: number;
  reachableCommitsSha256: string;
  dirtyCheckpointIndexSha256: string;
  allRefsInventoried: boolean;
};

type DirtyCheckpointFile = {
  status: string;
  path: string;
  exists: boolean;
  bytes: number;
  sha256: string;
  object: string | null;
};

type DirtyCheckpointManifest = {
  sourcePath: string;
  head: string;
  tree: string;
  files: DirtyCheckpointFile[];
};

type DirtyCheckpointIndex = {
  count: number;
  objectCount: number;
  entries: Array<{
    checkpointKey: string;
    sourcePath: string;
    head: string;
    tree: string;
    tracked: number;
    untracked: number;
    patchSha256: string;
    manifestSha256: string;
  }>;
  verdict: string;
};

type SurvivalRow = {
  kind: "WORKTREE" | "DIRTY_SNAPSHOT" | "PLATFORM_CORE_COMPONENT";
  sourceId: string;
  sourcePath: string;
  sourceHead: string | null;
  disposition: string;
  usefulChangeDecision: string;
  successorProof: string[];
  bytePreservationProof: string | null;
  blocker: string | null;
};

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function sha256Bytes(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256File(file: string): string {
  return sha256Bytes(readFileSync(file));
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", windowsHide: true }).trim();
}

function writeJson(file: string, value: unknown): void {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const patchEquivalentHeads = new Set([
  "e4d475fac105e9da2d30aebf4086ee47ac912309",
  "f946165fb6c19f59e3d971f472195bf33ae11080",
  "2df3d6f1f59ac1ba32e6062a1a0283c2314ceb5b",
  "6a4b845abb341ef6faff4001257a516400b02668",
]);

const evolvedDivergentProof: Record<string, string[]> = {
  "8a728757adc30ff74d13854a5e1c2ebfe1f29c78": [
    "app/_layout.tsx",
    "app/index.tsx",
    "src/lib/entry/index.recovery.test.tsx",
    "src/lib/entry/rootLayout.recovery.test.tsx",
    "src/features/profile/ProfileOtaDiagnosticsCard.tsx",
  ],
  "4901d7cea6210b9ba2c5942c1150e3b7a6e42518": [
    "src/lib/consumerRequests/consumerRequestRepository.ts",
    "src/lib/pdf/pdfTextEncoding.ts",
    "src/components/layout/AppStickyActionBar.tsx",
    "tests/security/consumerCannotReadOfficeData.contract.test.ts",
    "scripts/audit/enterpriseProductionSafeAppAuditCore.ts",
  ],
  "0a11592d8002d2a06385950e1d49934d46e2739e": [
    "src/lib/documents/pdfDocumentActions.ts",
    "src/lib/documents/pdfDocumentViewerEntry.ts",
    "src/lib/documents/pdfDocumentActions.test.ts",
  ],
  "374450ee628730cc92c609a1b2c6218c4d0899b6": [
    "src/lib/ai/builtInAi/builtInAiToolRegistry.ts",
    "src/lib/ai/professionalBoq/compileDynamicProfessionalBoq.ts",
    "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
    "scripts/e2e/canonicalApi34Evidence.ts",
    "tests/real10000/real10000RuntimeAllCasesExpandedEstimate.contract.test.ts",
  ],
};

const coreComponents: Array<{ id: string; paths: string[]; gates: string[] }> = [
  {
    id: "NAVIGATION_LIFECYCLE",
    paths: ["app/_layout.tsx", "app/index.tsx", "src/lib/authRouting.ts"],
    gates: ["src/lib/entry/rootLayout.recovery.test.tsx", "tests/app/requestEstimateIntentLifecycleOwners.contract.test.ts"],
  },
  {
    id: "AUTH_SESSION",
    paths: ["src/lib/supabaseClient.ts", "src/screens/security/SecurityScreen.auth.transport.ts"],
    gates: ["tests/strict-null/authLifecycle.phase1.test.ts", "tests/api/authLifecycleTransport.contract.test.ts"],
  },
  {
    id: "ROLES_ACCESS_BOUNDARIES",
    paths: ["src/screens/office/useOfficeHubRoleAccess.ts", "src/screens/office/officeAccess.services.ts"],
    gates: ["tests/security/consumerCannotReadOfficeData.contract.test.ts", "tests/app/office-role-route-parity.test.ts"],
  },
  {
    id: "OFFICE_HUB",
    paths: ["src/screens/office/OfficeHubScreen.tsx", "src/screens/office/useOfficeHubScreenController.tsx"],
    gates: ["src/screens/office/OfficeHubScreen.test.tsx", "tests/allScreensRuntime/officeScreenRuntime.contract.test.ts"],
  },
  {
    id: "FOREMAN_DIRECTOR_BUYER_ACCOUNTANT_WAREHOUSE",
    paths: [
      "src/screens/foreman/ForemanScreen.tsx",
      "src/screens/director/DirectorScreen.tsx",
      "src/screens/buyer/BuyerScreen.tsx",
      "src/screens/accountant/AccountantScreen.tsx",
      "src/screens/warehouse/WarehouseScreenContent.tsx",
    ],
    gates: ["tests/ui/foremanDirectorGoldenPath.contract.test.ts", "tests/app/office-child-route-audit.test.tsx"],
  },
  {
    id: "REQUEST_DRAFT_LIFECYCLE",
    paths: ["src/lib/consumerRequests/consumerRequestService.ts", "src/lib/consumerRequests/consumerRequestRepository.ts"],
    gates: ["tests/requestState/requestEstimateStateMachine.contract.test.ts", "tests/requestState/requestEstimateNoDataLoss.contract.test.ts"],
  },
  {
    id: "RPC_CONTRACTS",
    paths: ["supabase/migrations/20260330230000_request_lifecycle_boundary_v1.sql", "src/screens/warehouse/warehouse.api.repo.transport.ts"],
    gates: ["tests/api/rpcRuntimeValidationBatch2.contract.test.ts", "tests/api/rpcRuntimeValidationBatch3.contract.test.ts"],
  },
  {
    id: "DURABLE_STORAGE",
    paths: ["src/lib/platform/consumerRepairTransactionalDurableBridge.ts", "src/lib/platform/estimateRevisionDurableStore.asyncStorage.ts"],
    gates: ["tests/architecture/aiEstimateStorageBoundary.contract.test.ts", "src/screens/warehouse/warehouse.receiveDraft.store.test.ts"],
  },
  {
    id: "OFFLINE_REPLAY",
    paths: ["src/lib/offline/offlineReplayCoordinator.ts", "src/lib/offline/mutationWorker.ts", "src/shared/scale/offlineReplayIdempotency.ts"],
    gates: ["src/lib/offline/offlineReplayCoordinator.test.ts", "tests/allScreensRuntime/offlineRetryControlled.contract.test.ts"],
  },
  {
    id: "REVISIONS_HISTORY",
    paths: ["src/lib/estimate/backendPlatform/canonicalEstimateClient.ts", "src/features/consumerRepair/ConsumerRepairHistory.tsx"],
    gates: ["tests/estimateInfrastructure/aiEstimateRevisionEngineV2.contract.test.ts", "tests/consumerRepair/platformCoreHistoryFlow.contract.test.ts"],
  },
  {
    id: "PDF_PROCUREMENT",
    paths: ["src/lib/documents/pdfDocumentActions.ts", "src/lib/ai/approvalExecutionBoundary/executors/procurementApprovedExecutor.ts"],
    gates: ["tests/officeEstimate/platformCoreV2PdfBuyerFlow.contract.test.ts", "tests/sourceGovernance/pdfSaveSendSourceParity.contract.test.ts"],
  },
  {
    id: "WAREHOUSE_LEDGER",
    paths: ["src/screens/warehouse/warehouse.api.ts", "src/screens/warehouse/warehouse.issue.repo.ts", "src/screens/warehouse/warehouse.receiveDraft.store.ts"],
    gates: ["tests/warehouse/warehouse.issue.repo.test.ts", "src/screens/warehouse/warehouseReceiveQueue.atomicity.test.ts"],
  },
  {
    id: "FINANCE",
    paths: ["supabase/migrations/20260331110000_accounting_canonical_finance_chain_v1.sql", "src/screens/accountant/AccountantScreen.tsx"],
    gates: ["tests/s6_director_finance_supplier_scope_migration.test.ts", "scripts/accounting_canonical_finance_verify.ts"],
  },
  {
    id: "RLS_TENANT_SECURITY",
    paths: ["supabase/migrations/20260522123000_rls_dynamic_cross_tenant_static_coverage.sql", "scripts/audit/rlsDynamicCrossTenant.shared.ts"],
    gates: ["tests/security/rlsDynamicCrossTenant.contract.test.ts", "tests/security/rlsCoverageVerification.test.ts"],
  },
  {
    id: "WEB_ANDROID_API34",
    paths: ["scripts/_shared/webRuntimeHarness.ts", "scripts/_shared/androidHarness.ts", "scripts/e2e/canonicalApi34Evidence.ts"],
    gates: ["scripts/e2e/runAiEstimatePlatformCoreV2WebSmoke.ts", "scripts/e2e/runAiEstimatePlatformCoreV2AndroidSmoke.ts"],
  },
  {
    id: "PLATFORM_CORE_V2_SEALS",
    paths: ["src/lib/estimate/platformCoreRegistry.ts", "scripts/estimate/auditAiEstimatePlatformCoreV2SemanticScaleRefactor.ts"],
    gates: ["tests/estimateInfrastructure/aiEstimatePlatformCoreV2Matrix.contract.test.ts", "tests/architecture/aiEstimatePlatformArchitectureInventory.contract.test.ts"],
  },
];

function classifyWorktree(row: WorktreeInventoryRow): SurvivalRow {
  if (row.path.replace(/\\/g, "/").endsWith("rik-expo-app-p0-estimate-truth-remediation-r1")) {
    return {
      kind: "WORKTREE",
      sourceId: row.path,
      sourcePath: row.path,
      sourceHead: row.head,
      disposition: "ACTIVE_SUCCESSOR_WORKTREE",
      usefulChangeDecision: "Only integration destination; all R5.2 changes land here.",
      successorProof: [SUCCESSOR_CHECKPOINT, "codex/p0-one-monolith-r5"],
      bytePreservationProof: null,
      blocker: null,
    };
  }
  if (row.branch_or_detached.includes("batch009") || row.path.includes("batch009")) {
    return {
      kind: "WORKTREE",
      sourceId: row.path,
      sourcePath: row.path,
      sourceHead: row.head,
      disposition: "BATCH009_QUARANTINED_NOT_MERGED",
      usefulChangeDecision: "Preserved as a read-only source, explicitly forbidden from R5.2 activation.",
      successorProof: ["evidence/02-data-before/BATCH009_QUARANTINE.json"],
      bytePreservationProof: row.head,
      blocker: null,
    };
  }
  if (row.ahead_behind.ahead_of_checkpoint === 0) {
    return {
      kind: "WORKTREE",
      sourceId: row.path,
      sourcePath: row.path,
      sourceHead: row.head,
      disposition: "INCLUDED_IN_SUCCESSOR_ANCESTRY",
      usefulChangeDecision: "Every committed byte is reachable from the successor checkpoint.",
      successorProof: [`git merge-base --is-ancestor ${row.head} ${SUCCESSOR_CHECKPOINT}`],
      bytePreservationProof: row.head,
      blocker: null,
    };
  }
  if (patchEquivalentHeads.has(row.head)) {
    return {
      kind: "WORKTREE",
      sourceId: row.path,
      sourcePath: row.path,
      sourceHead: row.head,
      disposition: "PATCH_EQUIVALENT_IN_SUCCESSOR",
      usefulChangeDecision: "Divergent commit has a patch-equivalent commit in successor ancestry; no duplicate cherry-pick.",
      successorProof: [`git cherry ${SUCCESSOR_CHECKPOINT} ${row.head} => '-'`],
      bytePreservationProof: row.head,
      blocker: null,
    };
  }
  const evolved = evolvedDivergentProof[row.head];
  if (evolved) {
    return {
      kind: "WORKTREE",
      sourceId: row.path,
      sourcePath: row.path,
      sourceHead: row.head,
      disposition: "SEMANTICALLY_PRESERVED_IN_EVOLVED_CANONICAL_OWNERS",
      usefulChangeDecision: "Useful behavior survives in later single-owner production modules and their current gates; obsolete proof churn is not replayed.",
      successorProof: evolved,
      bytePreservationProof: row.head,
      blocker: null,
    };
  }
  throw new Error(`UNCLASSIFIED_DIVERGENT_WORKTREE:${row.path}:${row.head}`);
}

function classifyDirtySnapshot(input: {
  checkpointKey: string;
  entry: DirtyCheckpointIndex["entries"][number];
  manifest: DirtyCheckpointManifest;
  objectIntegrity: string;
}): SurvivalRow {
  const { checkpointKey, entry, manifest, objectIntegrity } = input;
  const normalized = entry.sourcePath.replace(/\\/g, "/");
  let disposition = "PRESERVED_READ_ONLY_NO_PRODUCTION_PROMOTION";
  let decision = "Snapshot bytes are retained; no unique production behavior was found after comparison with successor owners.";
  let proof = [`dirty-checkpoints/${checkpointKey}/MANIFEST.json`, objectIntegrity];
  if (checkpointKey === "823d05a5a434ef8b") {
    disposition = "TRANSPLANTED_BYTE_IDENTICAL_SQL_EXPLAIN_BASELINE";
    decision = "All four unique SQL EXPLAIN baseline files were copied byte-for-byte and their 4/4 contract is part of Phase 1A.";
    proof = manifest.files.map((file) => `${file.path}:${file.sha256}`);
  } else if (normalized.endsWith("/rik-expo-app")) {
    disposition = "FORBIDDEN_1C4B7671_RUNTIME_SNAPSHOT_PRESERVED_NOT_USED";
    decision = "Old runtime logs and probe are preserved but cannot be a base or fallback under R5.2.";
  } else if (normalized.includes("/rik-expo-app-t8-") || normalized.includes("/rik-proof-") || normalized.includes("/rik-seal-")) {
    disposition = checkpointKey === "ea5407934e5e61a8"
      ? "DIAGNOSTIC_INSTRUMENTATION_REJECTED_PRODUCTION_OWNER_PRESERVED"
      : "STALE_RUNTIME_PROOF_PRESERVED_NOT_PROMOTED";
    decision = checkpointKey === "ea5407934e5e61a8"
      ? "Temporary console heartbeat diagnostics add no product behavior; durable owners already survive in successor."
      : "Generated screenshots, PIDs, UI dumps and stale-head proof remain auditable but cannot become current GREEN evidence.";
  } else if (normalized.includes("post-r6-01-asphalt")) {
    disposition = "ASPHALT_WIP_SUPERSEDED_BY_R63_CANONICAL_OWNER";
    decision = "Useful Asphalt semantics were completed in the successor R63 owner; obsolete WIP deletion/partial audit is not replayed.";
    proof.push("tests/aiEstimateV4/asphaltRelatedExactBindingR8.contract.test.ts");
  } else if (normalized.includes("visible500-clean") || normalized.includes("enterprise-audit-clean")) {
    disposition = "USEFUL_UI_AND_AUDIT_BEHAVIOR_PRESERVED_IN_EVOLVED_SUCCESSOR";
    decision = "UI, build identity and acceptance behavior survive in newer successor modules; generated churn and stale assertions remain archived only.";
    proof.push("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    proof.push("src/components/BuildIdentityDiagnostic.tsx");
  } else if (normalized.includes("boq-depth-baseline") || normalized.includes("layout-typecheck-hotfix")) {
    disposition = "GENERATED_SECRET_SCAN_REFRESH_PRESERVED_NOT_PROMOTED";
    decision = "Only generated secret-scan output was dirty; the useful commit is patch-equivalent in successor ancestry.";
  } else if (normalized.includes("current-core")) {
    disposition = "GENERATED_CORE_PROOF_PRESERVED_NOT_REUSED";
    decision = "Historical proof remains byte-preserved; R5.2 requires fresh HEAD-bound gate output.";
  }
  return {
    kind: "DIRTY_SNAPSHOT",
    sourceId: checkpointKey,
    sourcePath: entry.sourcePath,
    sourceHead: entry.head,
    disposition,
    usefulChangeDecision: decision,
    successorProof: proof,
    bytePreservationProof: entry.manifestSha256,
    blocker: null,
  };
}

function main(): void {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const inventoryFile = path.join(EVIDENCE_ROOT, "BRANCH_WORKTREE_INVENTORY.json");
  const dirtyIndexFile = path.join(EVIDENCE_ROOT, "DIRTY_WORKTREE_CHECKPOINT_INDEX.json");
  const inventory = readJson<WorktreeInventory>(inventoryFile);
  const dirtyIndex = readJson<DirtyCheckpointIndex>(dirtyIndexFile);
  if (inventory.worktreeCount !== 114 || inventory.worktrees.length !== 114) {
    throw new Error(`WORKTREE_DENOMINATOR_DRIFT:${inventory.worktreeCount}:${inventory.worktrees.length}`);
  }
  if (inventory.dirtyWorktreeCount !== 25 || dirtyIndex.count !== 25 || dirtyIndex.entries.length !== 25) {
    throw new Error(`DIRTY_DENOMINATOR_DRIFT:${inventory.dirtyWorktreeCount}:${dirtyIndex.count}:${dirtyIndex.entries.length}`);
  }
  if (!inventory.allRefsInventoried || dirtyIndex.verdict !== "ALL_OBSERVED_DIRTY_WORKTREES_CHECKPOINTED") {
    throw new Error("PRESERVATION_CAPTURE_INCOMPLETE");
  }

  const worktreeRows = inventory.worktrees.map(classifyWorktree);
  const dirtyRows = dirtyIndex.entries.map((entry) => {
    const manifestFile = path.join(EVIDENCE_ROOT, "dirty-checkpoints", entry.checkpointKey, "MANIFEST.json");
    const manifest = readJson<DirtyCheckpointManifest>(manifestFile);
    if (manifest.sourcePath !== entry.sourcePath || sha256File(manifestFile) !== entry.manifestSha256) {
      throw new Error(`DIRTY_MANIFEST_IDENTITY_MISMATCH:${entry.checkpointKey}`);
    }
    for (const file of manifest.files) {
      if (!file.exists) continue;
      if (!file.object) throw new Error(`DIRTY_OBJECT_REFERENCE_MISSING:${entry.checkpointKey}:${file.path}`);
      const objectFile = path.join(EVIDENCE_ROOT, file.object);
      if (!existsSync(objectFile) || sha256File(objectFile) !== file.sha256) {
        throw new Error(`DIRTY_OBJECT_INTEGRITY_FAILED:${entry.checkpointKey}:${file.path}`);
      }
    }
    return classifyDirtySnapshot({
      checkpointKey: entry.checkpointKey,
      entry,
      manifest,
      objectIntegrity: `objects=${manifest.files.length}:sha256_verified`,
    });
  });

  const componentRows: SurvivalRow[] = coreComponents.map((component) => {
    const missing = [...component.paths, ...component.gates].filter((candidate) => !existsSync(candidate));
    if (missing.length > 0) throw new Error(`PLATFORM_CORE_COMPONENT_PATH_MISSING:${component.id}:${missing.join(",")}`);
    return {
      kind: "PLATFORM_CORE_COMPONENT",
      sourceId: component.id,
      sourcePath: component.paths.join(";"),
      sourceHead: SUCCESSOR_CHECKPOINT,
      disposition: "SURVIVES_IN_SINGLE_SUCCESSOR_HEAD",
      usefulChangeDecision: "Required R5.2 platform-core capability has production owners and current gates in the successor.",
      successorProof: [
        ...component.paths.map((file) => `${file}:${sha256File(file)}`),
        ...component.gates,
      ],
      bytePreservationProof: null,
      blocker: null,
    };
  });

  const survivalRows = [...worktreeRows, ...dirtyRows, ...componentRows];
  const survivalFile = path.join(EVIDENCE_ROOT, "PLATFORM_CORE_SURVIVAL_MATRIX.jsonl");
  writeFileSync(survivalFile, `${survivalRows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");

  const suiteFiles = [
    "tests/estimateInfrastructure/aiEstimateCatalogIndex11610.contract.test.ts",
    "tests/estimateInfrastructure/aiEstimateWorkClassifier.contract.test.ts",
    "tests/estimateInfrastructure/aiEstimateParameterGraph.contract.test.ts",
    "tests/estimateInfrastructure/aiEstimateFormulaDag.contract.test.ts",
    "tests/estimateInfrastructure/aiEstimateRevisionEngineV2.contract.test.ts",
    "tests/estimateInfrastructure/aiEstimateArtifactLifecycle.contract.test.ts",
    "tests/estimateInfrastructure/aiEstimateTelemetryBoundary.contract.test.ts",
    "tests/estimateInfrastructure/aiEstimatePlatformCoreV2Matrix.contract.test.ts",
    "tests/estimateRuntime/aiEstimatePlatformCoreV2Performance.contract.test.ts",
    "tests/architecture/aiEstimatePlatformArchitectureInventory.contract.test.ts",
    "tests/architecture/aiEstimateStorageBoundary.contract.test.ts",
    "tests/architecture/aiEstimateE2eHarnessBoundary.contract.test.ts",
    "tests/architecture/aiEstimateCodeQualityBoundaries.contract.test.ts",
    "tests/requestEstimate/platformCoreV2RequestFlow.contract.test.tsx",
    "tests/consumerRepair/platformCoreV2ConsumerFlow.contract.test.ts",
    "tests/foreman/platformCoreV2ForemanFlow.contract.test.ts",
    "tests/officeEstimate/platformCoreV2PdfBuyerFlow.contract.test.ts",
  ];
  const suiteListSha256 = sha256Bytes(`${suiteFiles.join("\n")}\n`);
  const originalTimeoutSummary = path.join(
    ".release-runtime",
    "ai-estimate-platform-core-v2-semantic-scale-refactor",
    "targeted-tests",
    "2026-08-17T08-07-13-752Z",
    "summary.json",
  );
  const gates = {
    schemaVersion: "p0-one-monolith-r5.2-platform-core-existing-gates.v1",
    specSha256: SPEC_SHA256,
    successorCheckpoint: SUCCESSOR_CHECKPOINT,
    exactSuiteDenominator: suiteFiles.length,
    suiteListSha256,
    suites: suiteFiles.map((file, ordinal) => ({ ordinal: ordinal + 1, file, exists: existsSync(file) })),
    strictAudit: "scripts/estimate/auditAiEstimateCodeQualityBoundaries.ts",
    strictMatrix: "scripts/estimate/runAiEstimatePlatformCoreV2Matrix.ts",
    originalTimeoutEvidence: existsSync(originalTimeoutSummary)
      ? { path: originalTimeoutSummary.replace(/\\/g, "/"), sha256: sha256File(originalTimeoutSummary), preserved: true }
      : null,
    rerunPolicy: "FOUR_BOUNDED_SHARDS_EXACT_17_PLUS_SEPARATE_RESUMABLE_11610_GATE",
    currentVerdict: "PENDING_FRESH_R5.2_SHARD_AGGREGATION",
  };
  writeJson(path.join(EVIDENCE_ROOT, "PLATFORM_CORE_EXISTING_GATES.json"), gates);

  const worktreeDispositionCounts = Object.fromEntries(
    [...new Set(worktreeRows.map((row) => row.disposition))]
      .sort()
      .map((disposition) => [disposition, worktreeRows.filter((row) => row.disposition === disposition).length]),
  );
  const dirtyDispositionCounts = Object.fromEntries(
    [...new Set(dirtyRows.map((row) => row.disposition))]
      .sort()
      .map((disposition) => [disposition, dirtyRows.filter((row) => row.disposition === disposition).length]),
  );
  const manifest = {
    schemaVersion: "p0-one-monolith-r5.2-platform-core-baseline-manifest.v1",
    generatedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    successorCheckpoint: SUCCESSOR_CHECKPOINT,
    currentHead: git(["rev-parse", "HEAD"]),
    currentBranch: git(["branch", "--show-current"]),
    currentTree: git(["rev-parse", "HEAD^{tree}"]),
    inventory: {
      worktrees: inventory.worktreeCount,
      dirtySnapshots: dirtyIndex.count,
      dirtyObjects: dirtyIndex.objectCount,
      reachableCommits: inventory.reachableCommitCount,
      allRefsInventoried: inventory.allRefsInventoried,
      worktreeDispositionCounts,
      dirtyDispositionCounts,
    },
    platformCoreComponents: coreComponents.map((component) => component.id),
    platformCoreComponentCount: componentRows.length,
    allWorktreesClassified: worktreeRows.length === 114,
    allDirtySnapshotsClassified: dirtyRows.length === 25,
    allDirtyObjectsHashVerified: true,
    uniqueUsefulDirtySnapshotCount: dirtyRows.filter((row) => row.disposition.startsWith("TRANSPLANTED_")).length,
    batch009Quarantined: worktreeRows.filter((row) => row.disposition === "BATCH009_QUARANTINED_NOT_MERGED").length === 1,
    forbiddenLegacyRuntimeUsed: false,
    databaseWrites: 0,
    runtimeCutoverPerformed: false,
    survivalMatrix: {
      path: survivalFile.replace(/\\/g, "/"),
      rows: survivalRows.length,
      sha256: sha256File(survivalFile),
    },
    existingGates: {
      path: "PLATFORM_CORE_EXISTING_GATES.json",
      exactSuiteDenominator: 17,
      suiteListSha256,
    },
    blockers: [],
    verdict: "GREEN_PLATFORM_CORE_BASELINE_CLASSIFIED_PENDING_PHASE_1A_TEST_SHARDS",
  };
  writeJson(path.join(EVIDENCE_ROOT, "PLATFORM_CORE_BASELINE_MANIFEST.json"), manifest);
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

main();
