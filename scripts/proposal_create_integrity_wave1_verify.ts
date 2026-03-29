import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { classifyRpcCompatError } from "../src/lib/api/_core";

const root = process.cwd();
const artifactsDir = resolve(root, "artifacts");

const proposalsPath = "src/lib/api/proposals.ts";
const corePath = "src/lib/api/_core.ts";

const getHeadText = (filePath: string) => {
  try {
    return execFileSync("git", ["show", `HEAD:${filePath.replace(/\\/g, "/")}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
};

const extractProposalCreateBlock = (text: string) => {
  const start = text.indexOf("export async function proposalCreateFull()");
  const end = text.indexOf("export async function proposalCreate()");
  if (start < 0 || end < 0 || end <= start) return "";
  return text.slice(start, end);
};

const currentProposalText = readFileSync(resolve(root, proposalsPath), "utf8");
const currentCoreText = readFileSync(resolve(root, corePath), "utf8");
const headProposalText = getHeadText(proposalsPath);

const beforeBlock = extractProposalCreateBlock(headProposalText);
const afterBlock = extractProposalCreateBlock(currentProposalText);

const countSilentCatch = (text: string) => (text.match(/catch\s*\{\s*\}/g) ?? []).length;

const matrix = [
  {
    name: "missing_function",
    input: { message: "Could not find the function public.acc_add_payment_min(args) in the schema cache", code: "PGRST302" },
    expectedAllowNextVariant: true,
    expectedKind: "missing_function",
  },
  {
    name: "permission_denied",
    input: { message: "permission denied for function acc_add_payment_min", code: "42501" },
    expectedAllowNextVariant: false,
    expectedKind: "permission",
  },
  {
    name: "auth_error",
    input: { message: "JWT expired", code: "PGRST301" },
    expectedAllowNextVariant: false,
    expectedKind: "auth",
  },
  {
    name: "validation_error",
    input: { message: "null value in column violates not-null constraint", code: "23502" },
    expectedAllowNextVariant: false,
    expectedKind: "validation",
  },
  {
    name: "transient_transport",
    input: { message: "network timeout while calling RPC", code: "08006" },
    expectedAllowNextVariant: false,
    expectedKind: "transient",
  },
];

const matrixResults = matrix.map((entry) => {
  const decision = classifyRpcCompatError(entry.input);
  return {
    name: entry.name,
    decision,
    expectedAllowNextVariant: entry.expectedAllowNextVariant,
    expectedKind: entry.expectedKind,
    passed:
      decision.allowNextVariant === entry.expectedAllowNextVariant &&
      decision.kind === entry.expectedKind,
  };
});

const proposalCreateUsesCompatibilityGuard = afterBlock.includes("classifyRpcCompatError");
const proposalCreateUsesVerification = afterBlock.includes("verifyCreatedProposalMeta");
const proposalCreateNoSilentCatch = countSilentCatch(afterBlock) === 0;
const rpcCompatUsesClassifier =
  currentCoreText.includes("export function classifyRpcCompatError") &&
  currentCoreText.includes("const decision = classifyRpcCompatError(error);") &&
  currentCoreText.includes("throw error;") &&
  currentCoreText.includes("throw e;");

const status =
  proposalCreateUsesCompatibilityGuard &&
  proposalCreateUsesVerification &&
  proposalCreateNoSilentCatch &&
  rpcCompatUsesClassifier &&
  matrixResults.every((entry) => entry.passed)
    ? "GREEN"
    : "NOT_GREEN";

mkdirSync(artifactsDir, { recursive: true });

writeFileSync(
  join(artifactsDir, "proposal-create-fallback-matrix.json"),
  `${JSON.stringify(
    {
      status: matrixResults.every((entry) => entry.passed) ? "GREEN" : "NOT_GREEN",
      cases: matrixResults,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

writeFileSync(
  join(artifactsDir, "rpc-compat-semantics-summary.json"),
  `${JSON.stringify(
    {
      status: rpcCompatUsesClassifier ? "GREEN" : "NOT_GREEN",
      file: corePath,
      classifierExported: currentCoreText.includes("export function classifyRpcCompatError"),
      stopRulesPresent: rpcCompatUsesClassifier,
      casesPassed: matrixResults.filter((entry) => entry.passed).length,
      casesTotal: matrixResults.length,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

writeFileSync(
  join(artifactsDir, "proposal-create-integrity-summary.json"),
  `${JSON.stringify(
    {
      status,
      proposalCreate: {
        file: proposalsPath,
        beforeSilentCatchCount: countSilentCatch(beforeBlock),
        afterSilentCatchCount: countSilentCatch(afterBlock),
        compatibilityGuardPresent: proposalCreateUsesCompatibilityGuard,
        postCreateVerificationPresent: proposalCreateUsesVerification,
      },
      rpcCompat: {
        file: corePath,
        stopRulesPresent: rpcCompatUsesClassifier,
        matrixPassed: matrixResults.every((entry) => entry.passed),
      },
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      status,
      proposalCreateNoSilentCatch,
      proposalCreateUsesCompatibilityGuard,
      proposalCreateUsesVerification,
      rpcCompatUsesClassifier,
      matrixPassed: matrixResults.every((entry) => entry.passed),
    },
    null,
    2,
  ),
);
