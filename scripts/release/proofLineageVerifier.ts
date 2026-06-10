import { spawnSync } from "node:child_process";

import { isAllowedProofArtifactPath, normalizeProofArtifactPath } from "./proofArtifactAllowlist";

export type ProofLineageInput = {
  wave: string;
  sourceCodeHead: string;
  currentHead: string;
  artifactPaths: string[];
  allowArtifactOnlySupersession: boolean;
};

export type ProofLineageResult = {
  valid: boolean;
  reason: string | null;
  sourceCodeHead: string;
  currentHead: string;
  changedFilesSinceSourceHead: string[];
  sourceChangesSinceProof: string[];
  artifactChangesSinceProof: string[];
  artifactOnlySupersession: boolean;
  fakeGreenClaimed: false;
};

function dedupeSorted(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeProofArtifactPath).filter(Boolean))).sort();
}

function isAllowedInputArtifactPath(filePath: string, artifactPaths: readonly string[]): boolean {
  const normalizedFile = normalizeProofArtifactPath(filePath);
  return artifactPaths.some((artifactPath) => {
    const normalizedArtifact = normalizeProofArtifactPath(artifactPath);
    if (!normalizedArtifact) return false;
    if (normalizedArtifact.endsWith("/")) return normalizedFile.startsWith(normalizedArtifact);
    return normalizedFile === normalizedArtifact;
  });
}

export function classifyProofLineageChangedFiles(params: {
  changedFiles: string[];
  artifactPaths?: string[];
}): {
  artifactChangesSinceProof: string[];
  sourceChangesSinceProof: string[];
} {
  const artifactPaths = params.artifactPaths ?? [];
  const changedFiles = dedupeSorted(params.changedFiles);
  const artifactChangesSinceProof = changedFiles.filter(
    (filePath) => isAllowedProofArtifactPath(filePath) || isAllowedInputArtifactPath(filePath, artifactPaths),
  );
  const sourceChangesSinceProof = changedFiles.filter((filePath) => !artifactChangesSinceProof.includes(filePath));

  return {
    artifactChangesSinceProof,
    sourceChangesSinceProof,
  };
}

function readChangedFilesSinceSourceHead(sourceCodeHead: string, currentHead: string): string[] {
  const result = spawnSync("git", ["diff", "--name-only", `${sourceCodeHead}..${currentHead}`], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    const message = result.stderr.trim() || `git diff failed for ${sourceCodeHead}..${currentHead}`;
    throw new Error(message);
  }

  return dedupeSorted(result.stdout.split(/\r?\n/));
}

export function verifyProofLineage(input: ProofLineageInput): ProofLineageResult {
  const sourceCodeHead = input.sourceCodeHead.trim();
  const currentHead = input.currentHead.trim();

  if (!sourceCodeHead || !currentHead) {
    return {
      valid: false,
      reason: "PROOF_LINEAGE_HEAD_MISSING",
      sourceCodeHead,
      currentHead,
      changedFilesSinceSourceHead: [],
      sourceChangesSinceProof: [],
      artifactChangesSinceProof: [],
      artifactOnlySupersession: false,
      fakeGreenClaimed: false,
    };
  }

  if (sourceCodeHead === currentHead) {
    return {
      valid: true,
      reason: null,
      sourceCodeHead,
      currentHead,
      changedFilesSinceSourceHead: [],
      sourceChangesSinceProof: [],
      artifactChangesSinceProof: [],
      artifactOnlySupersession: false,
      fakeGreenClaimed: false,
    };
  }

  let changedFilesSinceSourceHead: string[];
  try {
    changedFilesSinceSourceHead = readChangedFilesSinceSourceHead(sourceCodeHead, currentHead);
  } catch {
    return {
      valid: false,
      reason: "PROOF_LINEAGE_DIFF_UNAVAILABLE",
      sourceCodeHead,
      currentHead,
      changedFilesSinceSourceHead: [],
      sourceChangesSinceProof: [],
      artifactChangesSinceProof: [],
      artifactOnlySupersession: false,
      fakeGreenClaimed: false,
    };
  }

  const { artifactChangesSinceProof, sourceChangesSinceProof } = classifyProofLineageChangedFiles({
    changedFiles: changedFilesSinceSourceHead,
    artifactPaths: input.artifactPaths,
  });
  const artifactOnlySupersession =
    input.allowArtifactOnlySupersession &&
    changedFilesSinceSourceHead.length > 0 &&
    sourceChangesSinceProof.length === 0;

  return {
    valid: artifactOnlySupersession,
    reason: artifactOnlySupersession ? null : "SOURCE_CODE_CHANGED_AFTER_PROOF",
    sourceCodeHead,
    currentHead,
    changedFilesSinceSourceHead,
    sourceChangesSinceProof,
    artifactChangesSinceProof,
    artifactOnlySupersession,
    fakeGreenClaimed: false,
  };
}
