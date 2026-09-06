import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const evaluator = read("src/lib/estimate/backendPlatform/estimateAdmissionR3.ts");
const localRuntime = read("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts");
const productionEdge = read("supabase/functions/canonical-estimate/index.ts");
const migration = read("supabase/migrations/20260819090000_estimate_admission_r3.sql");
const incident = JSON.parse(read(
  ".release-runtime/real-professional-estimates-r3/evidence/00-baseline/ANCHOR_GROUP_21879F3C_INCIDENT.json",
));

describe("MASTER R3 BATCH-001..008 fail-closed estimate admission", () => {
  it("has one R3 evaluator contract for every required ingress", () => {
    expect(evaluator).toContain("export function evaluateEstimateAdmission");
    expect(evaluator).toContain('ESTIMATE_ADMISSION_CONTRACT_VERSION = "estimate-admission-r3"');
    for (const ingress of [
      "search_selectable",
      "direct_catalog_compile",
      "ai_selected_work",
      "default_estimate",
      "parameter_recalculation",
      "add_material_child_revision",
      "confirm",
      "pdf_artifact_create",
      "procurement_artifact_create",
      "revision_replay_migration",
      "catalog_read",
      "revision_read",
      "artifact_read",
    ]) expect(evaluator).toContain(`\"${ingress}\"`);
  });

  it("binds prepared admission to a complete server-side capability", () => {
    expect(localRuntime).toContain("CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ID");
    expect(localRuntime).toContain("CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ENVIRONMENT");
    expect(localRuntime).toContain("CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_ID");
    expect(localRuntime).toContain("CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID");
    expect(localRuntime).toContain("CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID");
    expect(localRuntime).toContain("CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT");
    expect(localRuntime).toContain("CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE");
    expect(localRuntime).toContain("CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD");
    expect(localRuntime).toContain("CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE");
    expect(localRuntime).toContain("evaluateEstimateAdmission({");
    expect(localRuntime).toContain("PREPARED_RELEASE_USER_RUNTIME_BLOCKED");
  });

  it("keeps local artifact retries idempotent across admission evaluation times", () => {
    const artifactOwner = localRuntime.slice(
      localRuntime.indexOf("async function createArtifactJob("),
      localRuntime.indexOf("type DrainState ="),
    );

    expect(artifactOwner).toContain("persistedAdmissionDecision(contentAdmission.decision)");
    expect(artifactOwner).not.toContain("decision: contentAdmission.decision,");
  });

  it("relaunches the shared artifact browser after a renderer disconnect", () => {
    expect(localRuntime).toContain("artifactBrowserInstance?.isConnected()");
    expect(localRuntime).toContain('browser.once("disconnected"');
    expect(localRuntime).toContain("async function newArtifactPage(");
    expect(localRuntime).toContain('code: "ARTIFACT_BROWSER_DISCONNECTED"');
    expect(localRuntime).toContain('code === "ARTIFACT_BROWSER_DISCONNECTED"');
    expect(localRuntime).not.toContain("const page = await browser.newPage(");
  });

  it("uses the same evaluator in the production edge and all mutation routes", () => {
    expect(productionEdge).toContain("evaluateEstimateAdmission({");
    expect(productionEdge).toContain('operation === "compile" ? "direct_catalog_compile" : "parameter_recalculation"');
    expect(productionEdge).toContain('assertProductionAdmission(requester, catalogId, "revision_replay_migration")');
    expect(productionEdge).toContain('kind === "procurement" ? "procurement_artifact_create" : "pdf_artifact_create"');
    expect(productionEdge).toContain('productionAdmissionDecisions(requester, uniqueIds, "search_selectable")');
    expect(productionEdge).toContain('assertProductionAdmission(requester, catalogId, "catalog_read")');
  });

  it("fails closed in PostgreSQL even when a client calls an RPC directly", () => {
    expect(migration).toContain("default 'QUARANTINED'");
    expect(migration).toContain("default 'RED'");
    expect(migration).toContain("estimate_compile_job_admission_r3_trg");
    expect(migration).toContain("ESTIMATE_ADMISSION_R3_PRODUCTION_CONTENT_BLOCKED");
    expect(migration).toContain("ESTIMATE_ADMISSION_R3_CANDIDATE_CAPABILITY_INVALID");
    expect(migration).toContain("document.definition_version_id=v_definition.id");
  });

  it("preserves the exact 33/317/350 incident as immutable legacy evidence", () => {
    expect(incident.masterSpec).toMatchObject({
      sha256: "af1ecdcba601536fb5e5bc8d81814eed34f302677ec1270dc3e172069989b29b",
      lineCount: 2_476,
    });
    expect(incident.incident).toMatchObject({
      logicalStatus: "LEGACY_CONTENT_QUARANTINED",
      reason: "CARTESIAN_GENERIC_RESOURCE_EXPANSION",
      immutable: true,
      legacyReadOnly: true,
      newCompileAllowed: false,
      recalculateAllowed: false,
      confirmAllowed: false,
      newPdfAllowed: false,
      newProcurementAllowed: false,
    });
    expect(incident.incident.revision).toMatchObject({
      id: "21879f3c-78fe-45ef-8596-446c2cf61260",
      release_id: "4c5affaf-5f63-5d04-b036-875c684f8c45",
      catalog_id: "concrete_foundation_interior_anchor_group_pour_high_load",
      row_count: 350,
      user_input_parameter_count: 0,
    });
    expect(incident.incident.decomposition).toMatchObject({
      materials: 33,
      displayed_as_works: 317,
      total_rows: 350,
    });
  });
});
