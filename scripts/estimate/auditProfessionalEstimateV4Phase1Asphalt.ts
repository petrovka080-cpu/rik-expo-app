import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  GREEN_V4_PHASE1_ASPHALT_PROFESSIONAL_VERTICAL_SLICE_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_REVIEW_NO_RELEASE,
  auditAsphaltProfessionalEstimateV4,
  buildAsphaltRoadEngineerReviewPackageV4,
  compileAsphaltProfessionalEstimateV4,
} from "../../src/lib/estimate/v4/asphalt";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";

const COMPLETE_ACCEPTANCE_FIXTURE = {
  geometry_method: "direct_area",
  area_m2: 1000,
  purpose: "public_road",
  traffic_load_category: "medium",
  construction_mode: "repair",
  existing_pavement_condition: "repairable",
  milling_required: false,
  soil_condition: "unknown",
  base_condition: "project_confirmed",
  sand_layer_required: false,
  crushed_layers: [
    { position: 1, fraction: "40_70", thickness_mm: 180, compaction_factor: 1.18, waste_percent: 3 },
    { position: 2, fraction: "20_40", thickness_mm: 120, compaction_factor: 1.16, waste_percent: 3 },
  ],
  geotextile_required: false,
  asphalt_layers: [
    { position: 1, mixture_type: "coarse_lower", thickness_mm: 60, density_t_m3: 2.35, waste_percent: 2 },
    { position: 2, mixture_type: "dense_fine", thickness_mm: 40, density_t_m3: 2.35, waste_percent: 2 },
  ],
  emulsion_measurement_basis: "litre",
  emulsion_rate_l_m2: 0.3,
  curb_length_m: 0,
  drainage_type: "none",
  traffic_signs_count: 0,
  guardrail_length_m: 0,
  asphalt_plant_distance_km: 20,
  truck_payload_t: 15,
  region_city: "Бишкек",
  execution_season: "summer",
  laboratory_control: "project_program",
  laboratory_test_interval_m2_per_test: 500,
  road_worker_productivity_m2_per_man_hour: 12,
  grader_productivity_m2_per_machine_hour: 220,
  roller_productivity_m2_per_machine_hour: 150,
  paver_productivity_m2_per_machine_hour: 180,
};

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const generatedAt = new Date().toISOString();
const sourceSha = git("rev-parse", "HEAD");
const compilation = compileAsphaltProfessionalEstimateV4({
  raw_text: "Ремонт асфальтобетонного покрытия 1000 м², два слоя 60 и 40 мм, Бишкек, без фрезерования",
  parameter_overrides: COMPLETE_ACCEPTANCE_FIXTURE,
});
const audit = auditAsphaltProfessionalEstimateV4(compilation);
const reviewPackage = buildAsphaltRoadEngineerReviewPackageV4(compilation);
const evidenceRoot = path.resolve(
  process.cwd(),
  ".release-runtime",
  "ai-estimate-v4-phase1-asphalt",
  generatedAt.replace(/[:.]/g, "-"),
);
const summaryWithoutHash = {
  schema_version: "ProfessionalEstimateV4Phase1AsphaltAuditSummaryV1",
  generated_at: generatedAt,
  source_sha: sourceSha,
  branch: git("branch", "--show-current"),
  fixture_kind: "explicit_acceptance_fixture_not_business_default",
  audit,
  passport_revision_hash: compilation.passport.deterministic_hash,
  price_coverage: compilation.price_coverage,
  evidence_directory: path.relative(process.cwd(), evidenceRoot).replace(/\\/g, "/"),
  road_engineer_sign_off_required: true,
  release_authorized: false,
  other_works_migrated: 0,
};
const summary = {
  ...summaryWithoutHash,
  manifest_hash: estimateDeterministicHash(summaryWithoutHash),
};

if (process.argv.includes("--write-evidence")) {
  fs.mkdirSync(evidenceRoot, { recursive: true });
  writeJson(path.join(evidenceRoot, "summary.json"), summary);
  writeJson(path.join(evidenceRoot, "passport.json"), compilation.passport);
  writeJson(path.join(evidenceRoot, "compiled-boq.json"), compilation.compiled_rows);
  writeJson(path.join(evidenceRoot, "road-engineer-review-package.json"), reviewPackage);
}

console.log(JSON.stringify(summary, null, 2));

if (audit.final_status !== GREEN_V4_PHASE1_ASPHALT_PROFESSIONAL_VERTICAL_SLICE_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_REVIEW_NO_RELEASE) {
  process.exitCode = 1;
}
