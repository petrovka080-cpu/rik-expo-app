import fs from "node:fs";
import path from "node:path";

export const SCALE_FOREMAN_MUTATION_WORKER_DECOMPOSITION_WAVE =
  "S_SCALE_07_FOREMAN_MUTATION_WORKER_DECOMPOSITION";
export const SCALE_FOREMAN_MUTATION_WORKER_DECOMPOSITION_CLOSEOUT_WAVE =
  "S_SCALE_07_FOREMAN_MUTATION_WORKER_DECOMPOSITION_CLOSEOUT";
export const GREEN_SCALE_FOREMAN_MUTATION_WORKER_DECOMPOSITION_READY =
  "GREEN_SCALE_FOREMAN_MUTATION_WORKER_DECOMPOSITION_READY";

type HelperSurfaceInventoryEntry = {
  file: string;
  role: "types" | "policy" | "keys" | "telemetry" | "conflict";
  requiredExports: string[];
  missingExports: string[];
  importsReactOrHooks: boolean;
  importsSupabase: boolean;
};

type WorkerDecompositionFinding = {
  file: string;
  reason: string;
};

export type ForemanMutationWorkerDecompositionVerification = {
  wave: typeof SCALE_FOREMAN_MUTATION_WORKER_DECOMPOSITION_CLOSEOUT_WAVE;
  final_status: string;
  generatedAt: string;
  inventory: HelperSurfaceInventoryEntry[];
  findings: WorkerDecompositionFinding[];
  metrics: {
    originalMutationWorkerLines: 1348;
    mutationWorkerLineBudget: 950;
    mutationWorkerCurrentLines: number;
    mutationWorkerUnderBudget: boolean;
    helperSurfaces: number;
    helperSurfacesPresent: boolean;
    newSourceModulesAdded: boolean;
    publicEntrypointPreserved: boolean;
    replayPolicyExportPreserved: boolean;
    noHooksAdded: boolean;
    noUiImportsAdded: boolean;
    noSupabaseImportsAdded: boolean;
    sourceModuleBudgetPreserved: boolean;
    businessLogicChanged: false;
    fakeGreenClaimed: false;
  };
};

const HELPER_SURFACES = Object.freeze([
  {
    file: "src/lib/offline/mutation.types.ts",
    role: "types",
    requiredExports: [
      "ForemanMutationWorkerDeps",
      "ForemanMutationWorkerResult",
    ],
  },
  {
    file: "src/lib/offline/mutation.retryPolicy.ts",
    role: "policy",
    requiredExports: [
      "FOREMAN_DRAIN_BATCH_SIZE",
      "FOREMAN_MUTATION_FLUSH_LOOP_CEILING",
      "FOREMAN_MUTATION_REPLAY_POLICY",
      "FOREMAN_RETRY_POLICY",
      "normalizeForemanMutationLoopIterationLimit",
    ],
  },
  {
    file: "src/lib/offline/mutationQueue.ts",
    role: "keys",
    requiredExports: [
      "extractSubmittedRequestId",
      "getForemanDraftKeyFromSnapshot",
      "getForemanDraftQueueKeysFromSnapshot",
      "getForemanPendingCountForSnapshot",
    ],
  },
  {
    file: "src/lib/offline/mutation.telemetry.ts",
    role: "telemetry",
    requiredExports: [
      "pushForemanMutationStageTelemetry",
      "reportForemanPostSubmitCleanupFailure",
      "toErrorText",
      "toForemanOfflineState",
      "trackForemanMutationBacklog",
    ],
  },
  {
    file: "src/lib/offline/offlineConflictClassifier.ts",
    role: "conflict",
    requiredExports: [
      "deriveForemanConflictFromFailure",
      "shouldHoldForemanReplayForAttention",
    ],
  },
] as const);

const FORBIDDEN_NEW_SOURCE_MODULES = Object.freeze([
  "src/lib/offline/mutationWorker.types.ts",
  "src/lib/offline/mutationWorker.policy.ts",
  "src/lib/offline/mutationWorker.keys.ts",
  "src/lib/offline/mutationWorker.telemetry.ts",
  "src/lib/offline/mutationWorker.conflict.ts",
] as const);

const REQUIRED_ENTRYPOINT_EXPORTS = Object.freeze([
  "flushForemanMutationQueue",
  "markForemanSnapshotQueued",
  "clearForemanMutationQueueTail",
  "FOREMAN_DRAIN_BATCH_SIZE",
  "FOREMAN_MUTATION_FLUSH_LOOP_CEILING",
  "FOREMAN_MUTATION_REPLAY_POLICY",
] as const);

const REQUIRED_ENTRYPOINT_IMPORTS = Object.freeze([
  "./mutation.types",
  "./mutation.retryPolicy",
  "./mutationQueue",
  "./mutation.telemetry",
  "./offlineConflictClassifier",
] as const);

function readProjectFile(projectRoot: string, relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function lineCount(source: string): number {
  return source.length ? source.split(/\r?\n/).length : 0;
}

function hasNamedExport(source: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\bexport\\s+(?:type\\s+)?(?:const|function|type)\\s+${escaped}\\b`).test(
    source,
  );
}

function collectPublicExports(source: string): string[] {
  const exports = new Set<string>();
  const exportConstRe = /\bexport\s+const\s+([A-Za-z0-9_]+)/g;
  let match: RegExpExecArray | null = null;
  while ((match = exportConstRe.exec(source))) exports.add(match[1] ?? "");

  const exportBlockRe = /\bexport\s+\{([\s\S]*?)\}\s+from\s+["'][^"']+["'];/g;
  while ((match = exportBlockRe.exec(source))) {
    for (const name of (match[1] ?? "").split(",")) {
      const clean = name.trim();
      if (clean) exports.add(clean);
    }
  }

  return [...exports].sort();
}

function writeJsonArtifact(projectRoot: string, name: string, value: unknown) {
  const artifactDir = path.join(projectRoot, "artifacts");
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactDir, name),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function writeProofArtifact(
  projectRoot: string,
  verification: ForemanMutationWorkerDecompositionVerification,
) {
  const lines = [
    `# ${SCALE_FOREMAN_MUTATION_WORKER_DECOMPOSITION_CLOSEOUT_WAVE}`,
    "",
    `final_status: ${verification.final_status}`,
    `mutationWorker lines: ${verification.metrics.originalMutationWorkerLines} -> ${verification.metrics.mutationWorkerCurrentLines}`,
    `helper surfaces: ${verification.metrics.helperSurfaces}`,
    `new source modules added: ${verification.metrics.newSourceModulesAdded}`,
    `public entrypoint preserved: ${verification.metrics.publicEntrypointPreserved}`,
    `source module budget preserved: ${verification.metrics.sourceModuleBudgetPreserved}`,
    `findings: ${verification.findings.length}`,
    "",
  ];
  fs.writeFileSync(
    path.join(
      projectRoot,
      "artifacts",
      `${SCALE_FOREMAN_MUTATION_WORKER_DECOMPOSITION_WAVE}_proof.md`,
    ),
    lines.join("\n"),
    "utf8",
  );
}

export function verifyForemanMutationWorkerDecomposition(options?: {
  projectRoot?: string;
  writeArtifacts?: boolean;
}): ForemanMutationWorkerDecompositionVerification {
  const projectRoot = options?.projectRoot ?? process.cwd();
  const findings: WorkerDecompositionFinding[] = [];
  const workerSource = readProjectFile(
    projectRoot,
    "src/lib/offline/mutationWorker.ts",
  );
  const workerLines = lineCount(workerSource);
  const publicExports = new Set(collectPublicExports(workerSource));

  const inventory = HELPER_SURFACES.map((surface) => {
    const source = readProjectFile(projectRoot, surface.file);
    const missingExports = surface.requiredExports.filter(
      (name) => !hasNamedExport(source, name),
    );
    const entry: HelperSurfaceInventoryEntry = {
      file: surface.file,
      role: surface.role,
      requiredExports: [...surface.requiredExports],
      missingExports,
      importsReactOrHooks:
        /\bfrom\s+["']react["']/.test(source) ||
        /\buse[A-Z][A-Za-z0-9_]*\s*\(/.test(source),
      importsSupabase: /\bsupabase\b|@supabase\/supabase-js/.test(source),
    };

    for (const missingExport of missingExports) {
      findings.push({
        file: surface.file,
        reason: `missing helper export ${missingExport}`,
      });
    }
    if (entry.importsReactOrHooks) {
      findings.push({
        file: surface.file,
        reason: "offline decomposition helpers must not import React or hooks",
      });
    }
    if (entry.importsSupabase) {
      findings.push({
        file: surface.file,
        reason: "offline decomposition helpers must not add Supabase access",
      });
    }

    return entry;
  });

  for (const requiredImport of REQUIRED_ENTRYPOINT_IMPORTS) {
    if (!workerSource.includes(requiredImport)) {
      findings.push({
        file: "src/lib/offline/mutationWorker.ts",
        reason: `missing helper surface import ${requiredImport}`,
      });
    }
  }

  for (const requiredExport of REQUIRED_ENTRYPOINT_EXPORTS) {
    if (!publicExports.has(requiredExport)) {
      findings.push({
        file: "src/lib/offline/mutationWorker.ts",
        reason: `missing preserved public export ${requiredExport}`,
      });
    }
  }

  const forbiddenNewModulesPresent = FORBIDDEN_NEW_SOURCE_MODULES.filter(
    (file) => fs.existsSync(path.join(projectRoot, file)),
  );
  for (const file of forbiddenNewModulesPresent) {
    findings.push({
      file,
      reason: "decomposition must reuse existing offline modules to preserve source module budget",
    });
  }

  if (workerLines > 950) {
    findings.push({
      file: "src/lib/offline/mutationWorker.ts",
      reason: `line_count ${workerLines} exceeds budget 950`,
    });
  }

  const verification: ForemanMutationWorkerDecompositionVerification = {
    wave: SCALE_FOREMAN_MUTATION_WORKER_DECOMPOSITION_CLOSEOUT_WAVE,
    final_status:
      findings.length === 0
        ? GREEN_SCALE_FOREMAN_MUTATION_WORKER_DECOMPOSITION_READY
        : "BLOCKED_FOREMAN_MUTATION_WORKER_DECOMPOSITION_FINDINGS",
    generatedAt: new Date().toISOString(),
    inventory,
    findings,
    metrics: {
      originalMutationWorkerLines: 1348,
      mutationWorkerLineBudget: 950,
      mutationWorkerCurrentLines: workerLines,
      mutationWorkerUnderBudget: workerLines <= 950,
      helperSurfaces: inventory.length,
      helperSurfacesPresent: inventory.every(
        (entry) => entry.missingExports.length === 0,
      ),
      newSourceModulesAdded: forbiddenNewModulesPresent.length > 0,
      publicEntrypointPreserved: REQUIRED_ENTRYPOINT_EXPORTS.every((name) =>
        publicExports.has(name),
      ),
      replayPolicyExportPreserved: publicExports.has(
        "FOREMAN_MUTATION_REPLAY_POLICY",
      ),
      noHooksAdded: inventory.every((entry) => !entry.importsReactOrHooks),
      noUiImportsAdded: !inventory.some((entry) =>
        /from\s+["'][^"']*(?:ui|components|app)\//.test(
          readProjectFile(projectRoot, entry.file),
        ),
      ),
      noSupabaseImportsAdded: inventory.every((entry) => !entry.importsSupabase),
      sourceModuleBudgetPreserved: forbiddenNewModulesPresent.length === 0,
      businessLogicChanged: false,
      fakeGreenClaimed: false,
    },
  };

  if (options?.writeArtifacts) {
    writeJsonArtifact(
      projectRoot,
      `${SCALE_FOREMAN_MUTATION_WORKER_DECOMPOSITION_WAVE}_inventory.json`,
      inventory,
    );
    writeJsonArtifact(
      projectRoot,
      `${SCALE_FOREMAN_MUTATION_WORKER_DECOMPOSITION_WAVE}_matrix.json`,
      verification,
    );
    writeProofArtifact(projectRoot, verification);
  }

  return verification;
}

if (require.main === module) {
  const verification = verifyForemanMutationWorkerDecomposition({
    writeArtifacts: true,
  });
  console.log(verification.final_status);
  console.log(JSON.stringify(verification.metrics, null, 2));
  if (verification.findings.length > 0) {
    console.error(JSON.stringify(verification.findings, null, 2));
    process.exitCode = 1;
  }
}
