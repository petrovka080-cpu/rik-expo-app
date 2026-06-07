import fs from "node:fs";
import path from "node:path";

import { buildEnterpriseVisible1000StructuredEstimateRealInputAcceptanceArtifacts } from "../../scripts/e2e/runEnterpriseVisible1000StructuredEstimateRealInputAcceptance";

export type EnterpriseVisible1000Artifacts = ReturnType<
  typeof buildEnterpriseVisible1000StructuredEstimateRealInputAcceptanceArtifacts
>;

const ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_ENTERPRISE_VISIBLE_1000_STRUCTURED_ESTIMATE_REAL_INPUT_ACCEPTANCE",
);
const GREEN = "GREEN_ENTERPRISE_VISIBLE_1000_STRUCTURED_ESTIMATE_REAL_INPUT_ACCEPTANCE_READY";

let cached: EnterpriseVisible1000Artifacts | null = null;

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, name), "utf8")) as T;
}

function readJsonOr<T>(name: string, fallback: T): T {
  const filePath = path.join(ARTIFACT_DIR, name);
  return fs.existsSync(filePath) ? readJson<T>(name) : fallback;
}

function readExistingArtifacts(): EnterpriseVisible1000Artifacts | null {
  const matrixPath = path.join(ARTIFACT_DIR, "matrix.json");
  if (!fs.existsSync(matrixPath)) return null;
  const matrix = readJson<EnterpriseVisible1000Artifacts["matrix"]>("matrix.json");
  if (matrix.final_status !== GREEN) return null;
  return {
    matrix,
    previous: readJson<EnterpriseVisible1000Artifacts["previous"]>("previous_green.json"),
    manifest: readJson<EnterpriseVisible1000Artifacts["manifest"]>("manifest.json"),
    visiblePolicy: readJson<EnterpriseVisible1000Artifacts["visiblePolicy"]>("visible_policy_scan.json"),
    uiPdfParity: readJson<EnterpriseVisible1000Artifacts["uiPdfParity"]>("ui_pdf_request_foreman_parity.json"),
    commitPush: readJsonOr<EnterpriseVisible1000Artifacts["commitPush"]>("git_commit_push.json", {
      branch: "",
      head_sha: "",
      commit_created: false,
      branch_pushed: false,
      final_worktree_clean: false,
      fake_green_claimed: false,
    }),
    failures: readJson<EnterpriseVisible1000Artifacts["failures"]>("failures.json"),
    fake_green_claimed: false,
  };
}

export function getEnterpriseVisible1000Artifacts(): EnterpriseVisible1000Artifacts {
  cached ??= readExistingArtifacts() ?? buildEnterpriseVisible1000StructuredEstimateRealInputAcceptanceArtifacts();
  return cached;
}

export function readEnterpriseVisible1000StructuredCases() {
  getEnterpriseVisible1000Artifacts();
  return readJson<Array<Record<string, unknown>>>("structured_cases.json");
}

export function readEnterpriseVisible1000ProductCases() {
  getEnterpriseVisible1000Artifacts();
  return readJson<Array<Record<string, unknown>>>("product_cases.json");
}

export function readEnterpriseVisible1000PdfActionCases() {
  getEnterpriseVisible1000Artifacts();
  return readJson<Array<Record<string, unknown>>>("pdf_action_cases.json");
}
