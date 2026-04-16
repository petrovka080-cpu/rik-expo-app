import fs from "node:fs";
import path from "node:path";

import {
  resolveDirectorPdfRoleAccess,
} from "../src/lib/pdf/directorPdfAuth";
import {
  resolveForemanRequestPdfAccess,
  resolveWarehousePdfAccess,
} from "../src/lib/pdf/rolePdfAuth";

const artifactPath = path.join(process.cwd(), "artifacts/S2_runtime_attack_matrix.json");
const proofPath = path.join(process.cwd(), "artifacts/S2_runtime_proof.md");
const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416183000_s2_canonical_role_truth.sql",
);

const migration = fs.readFileSync(migrationPath, "utf8");

const checks = [
  {
    id: "S2-A-001",
    scenario: "buyer publish under conflicting role sources",
    verifier: "local SQL contract proof",
    expected: "membership-first helper exists and blocks lower fallback override",
    passed:
      migration.includes("public.app_actor_role_context_v1(array['buyer'])")
      && migration.includes("source_role_forbidden")
      && migration.indexOf("from public.company_members cm") < migration.indexOf("from public.profiles p")
      && migration.indexOf("from public.profiles p") < migration.indexOf("auth.jwt() -> 'app_metadata' ->> 'role'")
      && migration.indexOf("auth.jwt() -> 'app_metadata' ->> 'role'") < migration.indexOf("public.get_my_role()"),
  },
  {
    id: "S2-A-002",
    scenario: "foreign company resource access denial",
    verifier: "resolveForemanRequestPdfAccess",
    expected: "wrong-company director cannot access foreman request PDF",
    passed: !resolveForemanRequestPdfAccess({
      authUid: "director-1",
      requestFound: true,
      requestCreatedBy: "foreman-1",
      actorMembershipRows: [{ company_id: "company-b", role: "director" }],
      creatorCompanyIds: ["company-a"],
    }).allowed,
  },
  {
    id: "S2-A-003",
    scenario: "signed URL issuance denial for unauthorized actor",
    verifier: "resolveWarehousePdfAccess",
    expected: "non-warehouse/non-director does not pass generated PDF policy",
    passed: !resolveWarehousePdfAccess({
      membershipRows: [{ company_id: "company-a", role: "buyer" }],
    }).allowed,
  },
  {
    id: "S2-A-004",
    scenario: "same-company allowed PDF/doc access",
    verifier: "resolveForemanRequestPdfAccess + resolveWarehousePdfAccess",
    expected: "foreman owner and warehouse member pass policy",
    passed:
      resolveForemanRequestPdfAccess({
        authUid: "foreman-1",
        requestFound: true,
        requestCreatedBy: "foreman-1",
        actorMembershipRows: [{ company_id: "company-a", role: "foreman" }],
        creatorCompanyIds: ["company-a"],
      }).allowed
      && resolveWarehousePdfAccess({
        membershipRows: [{ company_id: "company-a", role: "warehouse" }],
      }).allowed,
  },
  {
    id: "S2-A-005",
    scenario: "director PDF role source parity",
    verifier: "resolveDirectorPdfRoleAccess",
    expected: "director membership wins before lower role sources",
    passed: resolveDirectorPdfRoleAccess({
      user: { app_metadata: { role: "buyer" } },
      rpcRole: "contractor",
      companyMemberRoles: ["director"],
    }).source === "company_members",
  },
];

const matrix = checks.map((check) => ({
  id: check.id,
  scenario: check.scenario,
  verifier: check.verifier,
  expected: check.expected,
  status: check.passed ? "passed" : "failed",
}));

fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(artifactPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");

const failed = checks.filter((check) => !check.passed);
const status = failed.length === 0 ? "GREEN" : "NOT_GREEN";
fs.writeFileSync(
  proofPath,
  [
    "# S2 Runtime Proof",
    "",
    `Status: ${status}`,
    "",
    "Verifier: `npx tsx scripts/s2_security_runtime_verify.ts`",
    "",
    "This verifier exercises the local attack-style policy contracts for S2. Remote production migration and live signed-URL issuance still require deployment proof before release GREEN.",
    "",
    "## Results",
    "",
    ...matrix.map((row) => `- ${row.id}: ${row.status} - ${row.scenario}`),
    "",
  ].join("\n"),
  "utf8",
);

if (failed.length > 0) {
  throw new Error(`S2 security runtime verifier failed: ${failed.map((check) => check.id).join(", ")}`);
}
