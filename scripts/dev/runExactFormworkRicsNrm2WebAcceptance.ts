import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type BrowserContext, type Page, type Response } from "playwright";
import { Client } from "pg";

type Json = Record<string, any>;

const argValue = (name: string): string | null => {
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;
};

const PROFILE_ID = argValue("--profile") ?? "formwork-rics-nrm2";
const IS_NRMCA_STRIP_FOUNDATION = PROFILE_ID === "strip-foundation-nrmca-cip31";

const ORIGIN = "http://127.0.0.1:8081";
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = IS_NRMCA_STRIP_FOUNDATION
  ? "dda56d3e-39dc-543c-a3ee-4395a4c018b9"
  : "8791b75f-683f-5e72-a56a-54abc2f82379";
const SEARCH_RELEASE_ID = IS_NRMCA_STRIP_FOUNDATION
  ? "15bf6a55-fb0b-5c7b-b522-dc1e6fd6896e"
  : "320b582e-5a6d-5354-b3bf-f801e4490303";
const DEFINITION_ID = IS_NRMCA_STRIP_FOUNDATION
  ? "3afbb931-6432-5801-935a-1ba3d0290030"
  : "26c2fee8-1652-50f9-b271-6a2325c84e3c";
const CATALOG_ID = IS_NRMCA_STRIP_FOUNDATION
  ? "canonical-work:expanded:strip_foundation"
  : "canonical-work:base:concrete_foundation_interior_formwork_form_standard";
const ROW_ID = IS_NRMCA_STRIP_FOUNDATION
  ? "main_concrete"
  : "formwork:rics-nrm2:measured-contact-area:work";
const SOURCE_ID = IS_NRMCA_STRIP_FOUNDATION
  ? "src_professional_norm_pack_concrete_nrmca_cip31_selected_contingency_m3_m3_v1"
  : "src_professional_norm_pack_formwork_rics_nrm2_measured_contact_area_same_unit_routing_v1";
const NORM_ID = IS_NRMCA_STRIP_FOUNDATION
  ? "concrete_nrmca_cip31_selected_contingency_m3_m3_v1"
  : "formwork_rics_nrm2_measured_contact_area_same_unit_routing_v1";
const REINFORCEMENT_ROW_ID = "reinforcement";
const REINFORCEMENT_SOURCE_ID =
  "src_professional_norm_pack_reinforcement_project_bar_schedule_weight_same_unit_routing_v1";
const REINFORCEMENT_NORM_ID =
  "reinforcement_project_bar_schedule_weight_same_unit_routing_v1";
const REINFORCEMENT_PRODUCT_PROFILE_ID =
  "project-profile:approved-reinforcement-bar-schedule:fhwa-rics:v1";
const EXPECTED_TITLE = IS_NRMCA_STRIP_FOUNDATION
  ? "Бетонная смесь"
  : "Монтаж и демонтаж опалубки по измеренной площади контакта";
const EXPECTED_VISIBLE_TITLE = IS_NRMCA_STRIP_FOUNDATION
  ? "Бетонная смесь B25"
  : EXPECTED_TITLE;
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/exact-physical-norm-successors",
  IS_NRMCA_STRIP_FOUNDATION ? "web-strip-foundation-nrmca-cip31" : "web-formwork-rics-nrm2");
const OUTPUT = resolve(OUTPUT_ROOT, "acceptance.json");
const SEARCH_QUERY = IS_NRMCA_STRIP_FOUNDATION
  ? "Устройство монолитного железобетонного ленточного фундамента"
  : "Монтаж и демонтаж опалубки по измеренной площади контакта";
const FORMWORK_DETAILS = [
  "RICS NRM 2.",
  "Измеренная площадь контакта: 100 м2;",
  "ссылка на чертёж: FW-149-REV-A;",
  "тип элемента: WALL;",
  "размеры и количество граней: 50 m x 2 m x 1 measured face;",
  "отделка: PLAIN;",
  "класс геометрии: VERTICAL;",
  "сторона опалубки: SINGLE_SIDED;",
  "правило проёмов и пустот: PROJECT_RULE:no openings in measured scope;",
  "тип опалубки: REMOVABLE;",
  "правило измерения проекта: RICS_NRM2_WS11_CONFIRMED:FW-149-REV-A;",
  "сценарий приёмки: WEB-PREPARE-SAME-RELEASE-V1;",
  "согласование сметчика: EST-FW-149.",
];
const NRMCA_STRIP_FOUNDATION_DETAILS = [
  "по NRMCA CIP 31;",
  "длина самой ленты 40 м; ширина самой ленты 0,5 м; высота бетонной ленты 1,5 м;",
  "толщина бетонной подготовки 0,1 м; класс бетона B25; водонепроницаемость W6; морозостойкость F150; подвижность смеси P4;",
  "запас бетонной смеси 8%; масса арматуры 2,4 т; масса вязальной проволоки 28,8 кг; транспортная масса опалубки 12 т;",
  "placement method: pump; доставка бетонной смеси 18 км; доставка арматуры 18 км; доставка опалубки 18 км;",
  "земляные работы входят: да; объём разработки грунта 54 м3;",
  "подушка основания не входит; гидроизоляция не входит; обратная засыпка не входит; вывоз грунта не входит;",
  "Арматура по утверждённой ведомости стержней, FHWA-HIF-16-026 Table 3 и RICS NRM 2;",
  "масса по утверждённой ведомости стержней: 2400 кг;",
  "ссылка на ведомость стержней: BBS-S01-REV-D;",
  "конструктивный чертёж: STR-S01-REV-D;",
  "стандарт и класс арматуры: ASTM A615 Grade 60;",
  "обозначение размера стержня: No. 5; номинальный диаметр: 15,875 мм;",
  "форма стержня: BENT:shape-code-21;",
  "число стержней и длина резки: 160 bars x 9.75 m approved cut length;",
  "масса погонного метра: 1,552 кг/м;",
  "состав нахлёстов и аксессуаров: PROJECT_SCOPE:all BBS laps and hooks, chairs scheduled separately;",
  "запас изготовления: NONE:INCLUDED_IN_APPROVED_SCHEDULE;",
  "ограничения поставки: NONE:NO_AUTOMATIC_BUNDLE_ROUNDING;",
  "plan volume calculation reference: KJ-4 axes 1-8/A-D rev.5;",
  "mix design or project specification reference: KJ-4 note 7, mix card RM-25-114;",
  "mixture designation: B25 W6 F150 P4, RM-25-114;",
  "placement location: strip foundation axes 1-8/A-D, pour 1;",
  "contingency selection justification: complex formwork and pump remainder per method statement;",
  "delivery schedule and truck capacity: 4 trucks x 8 m3, final load confirmed before dispatch;",
  "producer order confirmation: RM-PRODUCER-2026-0912-17;",
  "estimator approval reference: EST-APPROVAL-2026-0912-04;",
  "согласование сметчика: EST-REBAR-REV-D;",
  "acceptance scenario: WEB-PREPARE-NRMCA-CIP31-V1.",
];
const SELECTED_DETAILS = IS_NRMCA_STRIP_FOUNDATION
  ? NRMCA_STRIP_FOUNDATION_DETAILS
  : FORMWORK_DETAILS;
const PROMPT = [SEARCH_QUERY, ...SELECTED_DETAILS].join(" ");

const FORMWORK_FIXTURE: Readonly<Json> = Object.freeze({
  product_profile_id: "standard-profile:rics-nrm2:formwork-measured-contact-area:v1",
  measured_formwork_contact_area_m2: 100,
  project_drawing_reference: "FW-149-REV-A",
  element_type: "WALL",
  element_dimensions_and_face_count: "50 m x 2 m x 1 measured face",
  plain_or_special_finish: "PLAIN",
  vertical_battered_horizontal_or_curved_class: "VERTICAL",
  single_or_double_sided_scope: "SINGLE_SIDED",
  openings_voids_and_deduction_rule: "PROJECT_RULE:no openings in measured scope",
  permanent_or_removable_formwork: "REMOVABLE",
  project_measurement_rule_reference: "RICS_NRM2_WS11_CONFIRMED:FW-149-REV-A",
  estimator_approval_reference: "EST-FW-149",
});
const NRMCA_STRIP_FOUNDATION_FIXTURE: Readonly<Json> = Object.freeze({
  scope_variant: "full_reinforced_structure",
  total_axis_length_m: 40,
  strip_width_m: 0.5,
  strip_height_m: 1.5,
  preparation_included: true,
  preparation_thickness_m: 0.1,
  concrete_class: "B25",
  watertightness: "W6",
  frost_resistance: "F150",
  mobility: "P4",
  concrete_order_allowance_percent: 8,
  product_profile_id: "method-profile:nrmca-cip31:ready-mix-order:v1",
  plan_volume_calculation_reference: "KJ-4 axes 1-8/A-D rev.5",
  mix_design_or_project_specification_reference: "KJ-4 note 7, mix card RM-25-114",
  mixture_designation: "B25 W6 F150 P4, RM-25-114",
  placement_location: "strip foundation axes 1-8/A-D, pour 1",
  contingency_selection_justification: "complex formwork and pump remainder per method statement",
  delivery_schedule_and_truck_capacity: "4 trucks x 8 m3, final load confirmed before dispatch",
  producer_order_confirmation: "RM-PRODUCER-2026-0912-17",
  estimator_approval_reference: "EST-APPROVAL-2026-0912-04",
  reinforcement_mass_t: 2.4,
  reinforcement_product_profile_id: REINFORCEMENT_PRODUCT_PROFILE_ID,
  bar_bending_schedule_reference: "BBS-S01-REV-D",
  structural_drawing_and_revision_reference: "STR-S01-REV-D",
  bar_standard_and_grade: "ASTM A615 Grade 60",
  bar_size_designation: "No. 5",
  nominal_diameter_mm: 15.875,
  shape_straight_bent_curved_or_link: "BENT:shape-code-21",
  bar_count_and_cut_length_m: "160 bars x 9.75 m approved cut length",
  selected_standard_mass_kg_per_m: 1.552,
  laps_hooks_chairs_connectors_and_accessories_scope:
    "PROJECT_SCOPE:all BBS laps and hooks, chairs scheduled separately",
  fabrication_allowance_if_documented: "NONE:INCLUDED_IN_APPROVED_SCHEDULE",
  supplier_bundle_or_length_constraints: "NONE:NO_AUTOMATIC_BUNDLE_ROUNDING",
  reinforcement_estimator_approval_reference: "EST-REBAR-REV-D",
  binding_wire_mass_kg: 28.8,
  reinforcement_fabrication: "ready_cages",
  formwork_sides: 2,
  formwork_transport_mass_t: 12,
  concrete_supply: "ready_mix",
  placement_method: "pump",
  curing_method: "membrane",
  winter_mode: false,
  pump_productivity_m3_h: 45,
  delivery_separately_priced: true,
  concrete_delivery_distance_km: 18,
  reinforcement_delivery_distance_km: 18,
  formwork_delivery_distance_km: 18,
  groundworks_included: true,
  excavation_volume_m3: 54,
  excavator_productivity_m3_h: 30,
  foundation_bedding_included: false,
  waterproofing_included: false,
  backfill_included: false,
  soil_disposal_included: false,
});
const FIXTURE = IS_NRMCA_STRIP_FOUNDATION
  ? NRMCA_STRIP_FOUNDATION_FIXTURE
  : FORMWORK_FIXTURE;
const PRIMARY_MEASURE_PARAMETER_ID = IS_NRMCA_STRIP_FOUNDATION
  ? "total_axis_length_m"
  : "measured_formwork_contact_area_m2";
const ORIGINAL_PRIMARY_VALUE = IS_NRMCA_STRIP_FOUNDATION ? 40 : 100;
const SENSITIVITY_PRIMARY_VALUE = IS_NRMCA_STRIP_FOUNDATION ? 80 : 120;
const ORIGINAL_TARGET_QUANTITY = IS_NRMCA_STRIP_FOUNDATION ? 32.4 : 100;
const SENSITIVITY_TARGET_QUANTITY = IS_NRMCA_STRIP_FOUNDATION ? 64.8 : 120;
const TARGET_UNIT_ID = IS_NRMCA_STRIP_FOUNDATION ? "m3" : "m2";
const SEARCH_VISIBLE_NEEDLE = IS_NRMCA_STRIP_FOUNDATION ? "ленточн" : "опалубк";
const SCENARIO_LABEL = IS_NRMCA_STRIP_FOUNDATION ? "40m-to-80m" : "100m2-to-120m2";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`EXACT_FORMWORK_WEB:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function progress(stage: string, details: Json = {}): void {
  process.stdout.write(`${JSON.stringify({ progress: "EXACT_FORMWORK_WEB", stage, ...details })}\n`);
}

async function closePageBounded(page: Page): Promise<void> {
  await Promise.race([
    page.close().catch(() => undefined),
    new Promise<void>((accept) => setTimeout(accept, 5_000)),
  ]);
}

async function json(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

async function loginConsumer(): Promise<{ authorization: string; userId: string }> {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  invariant(credentials.provider_url === PROVIDER, "PROVIDER_IDENTITY_RED");
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.email && consumer?.password && credentials.publishable_key,
    "CONSUMER_CREDENTIALS_MISSING");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  invariant(response.ok && body?.access_token, `CONSUMER_LOGIN_HTTP_${response.status}`);
  return { authorization: `Bearer ${body.access_token}`, userId: String(consumer.user_id) };
}

async function api(authorization: string, path: string, expectedStatus = 200): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.status === expectedStatus,
    `API_${response.status}_EXPECTED_${expectedStatus}:${path}:${String(body.error?.code ?? "")}`);
  return body;
}

async function apiPost(
  authorization: string,
  path: string,
  body: Json,
  expectedStatus = 202,
): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const responseBody = await response.json().catch(() => ({})) as Json;
  invariant(response.status === expectedStatus,
    `API_POST_${response.status}_EXPECTED_${expectedStatus}:${path}:${String(responseBody.error?.code ?? "")}:${String(responseBody.error?.message ?? "")}`);
  return responseBody;
}

async function waitForJob(authorization: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (["succeeded", "failed", "cancelled"].includes(String(job.status))) return job;
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`EXACT_FORMWORK_WEB:JOB_TIMEOUT:${jobId}`);
}

async function waitForSuccessfulRevision(authorization: string, accepted: Json): Promise<Json> {
  const job = await waitForJob(authorization, String(accepted.jobId ?? ""));
  invariant(job.status === "succeeded" && job.resultRevisionId,
    `JOB_${String(job.status)}:${String(job.errorCode ?? "UNKNOWN")}`);
  return api(authorization, `revisions/${job.resultRevisionId}`);
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const result = await api(authorization, `revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(result.rows) ? result.rows : []));
    cursor = String(result.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function enterConsumer(page: Page): Promise<void> {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) return;
    const ownerLogin = page.getByTestId("local-developer-director-login");
    if (await ownerLogin.isVisible().catch(() => false)
      && await ownerLogin.isEnabled().catch(() => false)) {
      await ownerLogin.click({ timeout: 2_000 }).catch(() => undefined);
    } else {
      const login = page.getByTestId("auth.login.local-consumer")
        .or(page.getByTestId("protected-identity-local-consumer-login")).first();
      if (await login.isVisible().catch(() => false) && await login.isEnabled().catch(() => false)) {
        await login.click({ timeout: 2_000 }).catch(() => undefined);
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error("EXACT_FORMWORK_WEB:CONSUMER_ROUTE_NOT_READY");
}

async function openRevision(page: Page, revisionId: string): Promise<void> {
  await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(revisionId)}`, {
    waitUntil: "commit",
    timeout: 180_000,
  });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await enterConsumer(page);
  await page.getByTestId("request-estimate-items-total-count").waitFor({ state: "visible", timeout: 90_000 });
}

function preliminaryNeeds(revision: Json): Json[] {
  return Array.isArray(revision.preliminaryNeeds) ? revision.preliminaryNeeds : [];
}

function assertExactRevision(revision: Json, rows: Json[], expectedQuantity: number): Json {
  invariant(revision.releaseId === RELEASE_ID, "REVISION_RELEASE_DRIFT");
  invariant(revision.catalogId === CATALOG_ID, "REVISION_CATALOG_DRIFT");
  invariant(revision.definitionVersionId === DEFINITION_ID, "REVISION_DEFINITION_DRIFT");
  invariant(preliminaryNeeds(revision).length === 0, "REVISION_REMAINS_PRELIMINARY");
  invariant(rows.length === Number(revision.rowCount)
    && (IS_NRMCA_STRIP_FOUNDATION ? rows.length > 1 : rows.length === 1),
  "REVISION_ROW_DENOMINATOR_RED");
  const row = rows.find((candidate) => candidate.rowId === ROW_ID);
  invariant(row != null, "TARGET_ROW_MISSING");
  invariant(row.rowId === ROW_ID && String(row.titleRu).includes(EXPECTED_TITLE), "ROW_IDENTITY_RED");
  invariant(Number(row.quantity) === expectedQuantity && row.unitId === TARGET_UNIT_ID,
    "ROW_QUANTITY_OR_UNIT_RED");
  invariant(row.unitPrice == null && row.amount == null, "UNKNOWN_PRICE_WAS_ZEROED");
  invariant(IS_NRMCA_STRIP_FOUNDATION
    ? row.procurementEligible === true && row.includedInProcurement === true
    : row.procurementEligible === false && row.includedInProcurement === false,
  "TARGET_ROW_PROCUREMENT_TRUTH_RED");
  invariant(row.includedInEstimate === true, "EXACT_ROW_EXCLUDED");
  const trace = Array.isArray(row.normativeTrace)
    ? row.normativeTrace.find((candidate: Json) => candidate.source_id === SOURCE_ID
      && candidate.norm_id === NORM_ID)
    : null;
  invariant(trace?.source_id === SOURCE_ID && trace?.norm_id === NORM_ID,
    "NORMALIZED_SOURCE_IDENTITY_RED");
  const binding = row.calculationTrace?.resourceGraph?.professionalPhysicalNormBindingV1;
  invariant(binding?.product_profile_id === FIXTURE.product_profile_id,
    "PHYSICAL_BINDING_MISSING");
  invariant(Number(revision.totals?.unpricedRowCount) > 0
    && Number(revision.totals?.pricedRowCount) === 0,
  "UNKNOWN_PRICE_TOTALS_RED");
  return row;
}

function assertExactReinforcement(rows: Json[]): Json | null {
  if (!IS_NRMCA_STRIP_FOUNDATION) return null;
  const row = rows.find((candidate) => candidate.rowId === REINFORCEMENT_ROW_ID);
  invariant(row != null && String(row.titleRu).includes("Арматурная сталь"),
    "REINFORCEMENT_ROW_IDENTITY_RED");
  invariant(Number(row.quantity) === 2.4 && row.unitId === "t",
    "REINFORCEMENT_QUANTITY_OR_UNIT_RED");
  invariant(row.unitPrice == null && row.amount == null, "REINFORCEMENT_UNKNOWN_PRICE_WAS_ZEROED");
  invariant(row.procurementEligible === true && row.includedInProcurement === true
    && row.includedInEstimate === true, "REINFORCEMENT_PROCUREMENT_TRUTH_RED");
  const traceRows = Array.isArray(row.normativeTrace) ? row.normativeTrace as Json[] : [];
  const trace = traceRows.find((candidate: Json) => candidate.source_id === REINFORCEMENT_SOURCE_ID
    && candidate.norm_id === REINFORCEMENT_NORM_ID);
  invariant(trace?.source_id === REINFORCEMENT_SOURCE_ID
    && trace?.norm_id === REINFORCEMENT_NORM_ID,
  "REINFORCEMENT_NORMALIZED_SOURCE_IDENTITY_RED");
  invariant(!traceRows.some((candidate: Json) => candidate.source_id
    === "src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1"),
  "REINFORCEMENT_LEGACY_KG_PER_M3_SOURCE_VISIBLE");
  const binding = row.calculationTrace?.resourceGraph?.professionalPhysicalNormBindingV1;
  invariant(binding?.product_profile_id === REINFORCEMENT_PRODUCT_PROFILE_ID
    && binding?.activation?.parameter_id === "reinforcement_product_profile_id"
    && binding?.parameter_projection_v1?.formulas?.approved_reinforcement_schedule_weight_kg
      === "reinforcement_mass_t * 1000",
  "REINFORCEMENT_PHYSICAL_BINDING_MISSING");
  return row;
}

async function ensureFullRevision(authorization: string, revision: Json): Promise<Json> {
  void authorization;
  invariant(preliminaryNeeds(revision).length === 0, "WEB_PREPARE_REMAINS_PRELIMINARY");
  const mismatches = Object.entries(FIXTURE)
    .filter(([key, value]) => typeof value === "number"
      ? Number(revision.parameters?.[key]) !== value
      : revision.parameters?.[key] !== value)
    .map(([key]) => key);
  invariant(mismatches.length === 0,
    `WEB_PREPARE_DID_NOT_CREATE_FULL_EXACT_REVISION:${mismatches.join(",")}`);
  return revision;
}

async function buildArtifact(
  authorization: string,
  revision: Json,
  kind: "pdf" | "procurement",
): Promise<Json> {
  const documentProfile = kind === "pdf" ? "professional_v1" : null;
  const accepted = await apiPost(authorization, `revisions/${revision.revisionId}/artifacts/${kind}`, {
    idempotencyKey: `exact-formwork-${kind}-${revision.revisionId}`,
    ...(documentProfile ? { documentProfile } : {}),
  });
  if (accepted.jobId) {
    const job = await waitForJob(authorization, String(accepted.jobId));
    invariant(job.status === "succeeded",
      `ARTIFACT_${kind}_JOB_${String(job.status)}:${String(job.errorCode ?? "")}`);
  } else {
    invariant(accepted.created === false && accepted.artifactId,
      `ARTIFACT_${kind}_IDEMPOTENT_REPLAY_RED`);
  }
  const suffix = documentProfile ? `?documentProfile=${documentProfile}` : "";
  const artifact = await api(authorization,
    `revisions/${revision.revisionId}/artifacts/${kind}${suffix}`);
  invariant(artifact.status === "ready" && artifact.revisionId === revision.revisionId
    && artifact.releaseId === RELEASE_ID, `ARTIFACT_${kind}_IDENTITY_RED`);
  invariant(artifact.signedUrl && Number(artifact.byteSize) > 0 && /^[0-9a-f]{64}$/u.test(artifact.sha256),
    `ARTIFACT_${kind}_FILE_IDENTITY_RED`);
  const fileResponse = await fetch(artifact.signedUrl, { signal: AbortSignal.timeout(120_000) });
  const bytes = Buffer.from(await fileResponse.arrayBuffer());
  invariant(fileResponse.ok && bytes.byteLength === Number(artifact.byteSize)
    && sha256(bytes) === artifact.sha256, `ARTIFACT_${kind}_DOWNLOAD_PARITY_RED`);
  return { ...artifact, downloadedByteSize: bytes.byteLength, downloadedSha256: sha256(bytes) };
}

async function databaseProof(revisionIds: string[], negativeJobIds: string[]): Promise<Json> {
  const client = new Client({ connectionString: DATABASE_URL, application_name: "exact-formwork-web-proof" });
  await client.connect();
  try {
    const revisions = (await client.query(`select id::text,parent_revision_id::text,release_id::text,
        definition_version_id::text,catalog_id,revision_number,row_count,totals,checksum_sha256
      from public.estimate_revision where id=any($1::uuid[]) order by revision_number`, [revisionIds])).rows;
    const rows = (await client.query(`select revision_id::text,row_id,title_ru,unit_id,quantity,unit_price,amount,
        procurement_eligible,included_in_estimate,included_in_procurement,normative_trace,calculation_trace
      from public.estimate_revision_row where revision_id=any($1::uuid[]) order by revision_id,ordinal`,
    [revisionIds])).rows;
    const negativeJobs = (await client.query(`select id::text,status,error_code,result_revision_id::text
      from public.estimate_compile_job where id=any($1::uuid[]) order by created_at`, [negativeJobIds])).rows;
    const release = (await client.query(`select id::text,status,activated_at from public.estimate_definition_release
      where id=$1`, [RELEASE_ID])).rows[0];
    const search = (await client.query(`select id::text,status,activated_at from public.estimate_search_index_release
      where id=$1`, [SEARCH_RELEASE_ID])).rows[0];
    invariant(revisions.length === revisionIds.length
      && revisionIds.every((revisionId) => rows.some((row) => row.revision_id === revisionId)),
    "DATABASE_REVISION_PARITY_RED");
    invariant(negativeJobs.length === negativeJobIds.length
      && negativeJobs.every((job) => job.status === "failed" && job.result_revision_id == null),
    "DATABASE_NEGATIVE_JOB_PARITY_RED");
    invariant(release.status === "prepared" && release.activated_at == null
      && search.status === "draft" && search.activated_at == null, "CANDIDATE_ACTIVATION_DRIFT");
    return { revisions, rows, negativeJobs, release, search };
  } finally {
    await client.end();
  }
}

async function openColdRevision(context: BrowserContext, revision: Json, screenshot: string): Promise<Json> {
  const page = await context.newPage();
  try {
    await openRevision(page, revision.revisionId);
    await page.locator('[data-testid^="consumer-repair-item-title-"]')
      .filter({ hasText: EXPECTED_VISIBLE_TITLE }).waitFor({ state: "visible", timeout: 90_000 });
    const body = await page.locator("body").innerText();
    const expectedQuantityText = String(SENSITIVITY_TARGET_QUANTITY);
    invariant(body.includes(expectedQuantityText)
      || body.includes(expectedQuantityText.replace(".", ",")), "COLD_REOPEN_QUANTITY_RED");
    if (!IS_NRMCA_STRIP_FOUNDATION) {
      invariant(!body.includes("2.4"), "COLD_REOPEN_OLD_FACTOR_RED");
    }
    await page.screenshot({ path: screenshot, fullPage: true });
    return {
      revisionId: revision.revisionId,
      revisionNumber: revision.revisionNumber,
      rowTitleVisible: true,
      expectedQuantity: SENSITIVITY_TARGET_QUANTITY,
      expectedQuantityVisible: true,
      oldFactorVisible: IS_NRMCA_STRIP_FOUNDATION ? null : false,
      screenshot,
    };
  } finally {
    await page.close();
  }
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const { authorization: apiAuthorization, userId } = await loginConsumer();
  const manifest = await api(apiAuthorization, "runtime-manifest");
  invariant(manifest.runtimeRole === "FULL_CANONICAL_ESTIMATE_BACKEND"
    && manifest.compatibilityTuple?.definitionReleaseId === RELEASE_ID
    && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
    && Number(manifest.activeCompileJobCount) === 0, "RUNTIME_TUPLE_RED");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  let authorization = "";
  const backendRequests: Json[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(`${BACKEND}/`)) return;
    const header = request.headers().authorization ?? "";
    if (header.startsWith("Bearer ")) authorization = header;
  });
  page.on("response", (response) => {
    if (!response.url().startsWith(`${BACKEND}/`)) return;
    backendRequests.push({ method: response.request().method(), path: new URL(response.url()).pathname,
      status: response.status(), requestId: response.headers()["x-request-id"] ?? null });
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 1_000));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => requestFailures.push(
    `${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText ?? ""}`,
  ));

  let initialRevision: Json;
  let fullRevision: Json;
  let sensitivityRevision: Json;
  let originalRow: Json;
  let sensitivityRow: Json;
  let originalReinforcementRow: Json | null = null;
  let sensitivityReinforcementRow: Json | null = null;
  let searchEvidence: Json;
  let compileIngress: Json;
  try {
    await page.goto(`${ORIGIN}/request?exactNormProfile=${encodeURIComponent(PROFILE_ID)}&run=${Date.now()}`,
      { waitUntil: "commit", timeout: 180_000 });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await enterConsumer(page);
    progress("CONSUMER_READY");
    const input = page.getByTestId("consumer-repair-problem-input");
    const searchPromise = page.waitForResponse((response) => response.url().startsWith(`${BACKEND}/search/catalog?`)
      && response.status() === 200, { timeout: 120_000 });
    const [searchResponse] = await Promise.all([searchPromise, input.fill(SEARCH_QUERY)]);
    const search = await json(searchResponse);
    invariant(search.searchIndexReleaseId === SEARCH_RELEASE_ID, "SEARCH_RELEASE_DRIFT");
    const items = Array.isArray(search.items) ? search.items as Json[] : [];
    const selectedIndex = items.findIndex((item) => item.catalogId === CATALOG_ID);
    invariant(selectedIndex >= 0, "EXACT_WORK_NOT_FOUND_BY_PROFESSIONAL_NAME");
    progress("SEARCH_READY", { selectedIndex, itemCount: items.length });
    const suggestion = page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`);
    await suggestion.waitFor({ state: "visible", timeout: 120_000 });
    const selectedWorkText = (await suggestion.innerText()).trim();
    invariant(selectedWorkText.toLocaleLowerCase("ru-RU").includes(SEARCH_VISIBLE_NEEDLE),
      "SEARCH_VISIBLE_TITLE_RED");
    await suggestion.click();
    const selectedPrefix = await input.inputValue();
    invariant(selectedPrefix.toLocaleLowerCase("ru-RU").includes(SEARCH_VISIBLE_NEEDLE),
      "SELECTED_PREFIX_RED");
    await input.fill(`${selectedPrefix}${SELECTED_DETAILS.join(" ")}`);
    progress("WORK_SELECTED", { selectedWorkText });
    invariant(authorization.startsWith("Bearer "), "BROWSER_AUTHORIZATION_MISSING");
    const historyBefore = await api(authorization, `revisions?catalogId=${encodeURIComponent(CATALOG_ID)}&limit=100`);
    const beforeRows = Array.isArray(historyBefore.revisions) ? historyBefore.revisions as Json[] : [];
    const prepareButton = page.getByTestId("consumer-repair-prepare-draft");
    const prepareState = {
      visible: await prepareButton.isVisible().catch(() => false),
      enabled: await prepareButton.isEnabled().catch(() => false),
      label: await prepareButton.innerText().catch(() => ""),
    };
    invariant(prepareState.visible && prepareState.enabled, "WEB_PREPARE_BUTTON_NOT_READY");
    const compilePromise = page.waitForResponse((response) => response.url().endsWith("/jobs/compile")
      && response.request().method() === "POST", { timeout: 30_000 });
    await prepareButton.click();
    let compileResponse: Response;
    try {
      compileResponse = await compilePromise;
    } catch (error) {
      const diagnostic = {
        capturedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        url: page.url(),
        inputValue: await input.inputValue().catch(() => ""),
        prepareStateAfterClick: {
          visible: await prepareButton.isVisible().catch(() => false),
          enabled: await prepareButton.isEnabled().catch(() => false),
          label: await prepareButton.innerText().catch(() => ""),
        },
        statusMessages: await page.locator('[data-testid*="status"], [role="alert"]')
          .allInnerTexts().catch(() => []),
        bodyText: (await page.locator("body").innerText().catch(() => "")).slice(0, 20_000),
        backendRequests,
        consoleErrors,
        pageErrors,
        requestFailures,
      };
      const diagnosticPath = resolve(OUTPUT_ROOT, "prepare-button-diagnostic.json");
      atomicJson(diagnosticPath, diagnostic);
      await page.screenshot({ path: resolve(OUTPUT_ROOT, "prepare-button-diagnostic.png"), fullPage: true });
      throw new Error(`EXACT_FORMWORK_WEB:WEB_PREPARE_NO_COMPILE_POST:${diagnosticPath}`);
    }
    const compileBody = await json(compileResponse);
    invariant(compileResponse.status() === 202,
      `WEB_COMPILE_HTTP_${compileResponse.status()}:${String(compileBody.error?.code ?? "")}`);
    compileIngress = {
      kind: "WEB_PREPARE_BUTTON",
      prepareState,
    };
    progress("COMPILE_ACCEPTED");
    initialRevision = await waitForSuccessfulRevision(authorization, compileBody);
    fullRevision = await ensureFullRevision(authorization, initialRevision);
    const fullRows = await allRows(authorization, fullRevision.revisionId);
    originalRow = assertExactRevision(fullRevision, fullRows, ORIGINAL_TARGET_QUANTITY);
    originalReinforcementRow = assertExactReinforcement(fullRows);
    progress("FULL_ORIGINAL_GREEN", { revisionId: fullRevision.revisionId,
      primaryValue: ORIGINAL_PRIMARY_VALUE, targetQuantity: ORIGINAL_TARGET_QUANTITY });
    await openRevision(page, fullRevision.revisionId);
    await page.locator('[data-testid^="consumer-repair-item-title-"]')
      .filter({ hasText: EXPECTED_VISIBLE_TITLE }).waitFor({ state: "visible", timeout: 90_000 });
    const originalScreenshot = resolve(OUTPUT_ROOT, `01_full_${ORIGINAL_PRIMARY_VALUE}.png`);
    await page.screenshot({ path: originalScreenshot, fullPage: true });

    const areaChip = page.getByTestId(`editable-param-chip-${PRIMARY_MEASURE_PARAMETER_ID}`);
    if (!await areaChip.isVisible().catch(() => false)) {
      const toggle = page.getByTestId("request-estimate-parameters-toggle");
      if (await toggle.isVisible().catch(() => false)) await toggle.click();
      const showMore = page.getByTestId("request-estimate-show-more-parameters");
      if (await showMore.isVisible().catch(() => false)) await showMore.click();
    }
    await areaChip.waitFor({ state: "visible", timeout: 60_000 });
    const areaInput = areaChip.getByTestId("editable-param-popover-input");
    await areaInput.fill(String(SENSITIVITY_PRIMARY_VALUE));
    await page.getByTestId("editable-param-batch-bar").waitFor({ state: "visible", timeout: 30_000 });
    const recalculatePromise = page.waitForResponse((response) => response.url().endsWith("/jobs/recalculate")
      && response.request().method() === "POST", { timeout: 60_000 });
    const [recalculateResponse] = await Promise.all([
      recalculatePromise,
      page.getByTestId("editable-param-batch-apply").click(),
    ]);
    const recalculateAccepted = await json(recalculateResponse);
    invariant(recalculateResponse.status() === 202, `SENSITIVITY_HTTP_${recalculateResponse.status()}`);
    sensitivityRevision = await waitForSuccessfulRevision(authorization, recalculateAccepted);
    invariant(sensitivityRevision.parentRevisionId === fullRevision.revisionId, "SENSITIVITY_PARENT_DRIFT");
    const sensitivityRows = await allRows(authorization, sensitivityRevision.revisionId);
    sensitivityRow = assertExactRevision(sensitivityRevision, sensitivityRows, SENSITIVITY_TARGET_QUANTITY);
    sensitivityReinforcementRow = assertExactReinforcement(sensitivityRows);
    progress("SENSITIVITY_GREEN", { revisionId: sensitivityRevision.revisionId,
      primaryValue: SENSITIVITY_PRIMARY_VALUE, targetQuantity: SENSITIVITY_TARGET_QUANTITY });
    await openRevision(page, sensitivityRevision.revisionId);
    const sensitivityScreenshot = resolve(OUTPUT_ROOT, `02_sensitivity_${SENSITIVITY_PRIMARY_VALUE}.png`);
    await page.screenshot({ path: sensitivityScreenshot, fullPage: true });

    const historyAfter = await api(authorization, `revisions?catalogId=${encodeURIComponent(CATALOG_ID)}&limit=100`);
    const afterRows = Array.isArray(historyAfter.revisions) ? historyAfter.revisions as Json[] : [];
    invariant(initialRevision.revisionId === fullRevision.revisionId,
      "WEB_PREPARE_REQUIRED_HIDDEN_API_RECALCULATION");
    const expectedNewRevisionCount = 2;
    invariant(afterRows.length === beforeRows.length + expectedNewRevisionCount,
      `HISTORY_DELTA_${afterRows.length - beforeRows.length}_EXPECTED_${expectedNewRevisionCount}`);
    invariant(afterRows.some((entry) => entry.revisionId === fullRevision.revisionId)
      && afterRows.some((entry) => entry.revisionId === sensitivityRevision.revisionId),
    "HISTORY_REVISION_MISSING");
    searchEvidence = { selectedIndex, selectedWorkText, before: beforeRows.length, after: afterRows.length,
      delta: afterRows.length - beforeRows.length, initialWasFull: initialRevision.revisionId === fullRevision.revisionId,
      originalScreenshot, sensitivityScreenshot, compileIngress };
  } finally {
    await closePageBounded(page);
  }

  const activeAuthorization = authorization || apiAuthorization;
  const negativeScenarios = IS_NRMCA_STRIP_FOUNDATION
    ? [
      { scenarioId: "cip31-two-percent", parameters: {
        ...sensitivityRevision!.parameters, concrete_order_allowance_percent: 2,
      } },
      { scenarioId: "rebar-invalid-shape", parameters: {
        ...sensitivityRevision!.parameters, shape_straight_bent_curved_or_link: "ASSUMED",
      } },
    ]
    : [{ scenarioId: "unconfirmed-measurement", parameters: {
      ...sensitivityRevision!.parameters, project_measurement_rule_reference: "UNCONFIRMED",
    } }];
  const negativeJobs: Json[] = [];
  for (const scenario of negativeScenarios) {
    const negativeAccepted = await apiPost(activeAuthorization, "jobs/recalculate", {
      idempotencyKey: `exact-${PROFILE_ID}-negative-${scenario.scenarioId}-${sensitivityRevision!.revisionId}`,
      catalogId: CATALOG_ID,
      parentRevisionId: sensitivityRevision!.revisionId,
      sourceRequestText: sensitivityRevision!.sourceRequestText,
      primaryMeasureParameterId: PRIMARY_MEASURE_PARAMETER_ID,
      parameters: scenario.parameters,
      currencyCode: sensitivityRevision!.currencyCode,
      rowOverrides: sensitivityRevision!.amendmentContract?.rowOverrides ?? {},
      customRows: sensitivityRevision!.amendmentContract?.customRows ?? [],
    });
    const negativeJob = await waitForJob(activeAuthorization, String(negativeAccepted.jobId ?? ""));
    invariant(negativeJob.status === "failed" && !negativeJob.resultRevisionId,
      `NEGATIVE_NOT_BLOCKED:${scenario.scenarioId}:${String(negativeJob.status)}:${String(negativeJob.errorCode ?? "")}`);
    negativeJobs.push({ ...negativeJob, scenarioId: scenario.scenarioId });
    progress("NEGATIVE_BLOCKED", { scenarioId: scenario.scenarioId, errorCode: negativeJob.errorCode });
  }

  const [pdf, procurement] = await Promise.all([
    buildArtifact(activeAuthorization, sensitivityRevision!, "pdf"),
    buildArtifact(activeAuthorization, sensitivityRevision!, "procurement"),
  ]);
  const sensitivityRowCount = Number(sensitivityRevision!.rowCount);
  invariant(Number(pdf.metadata?.sourceRowCount) === sensitivityRowCount
    && Number(pdf.metadata?.projectedRowCount) === sensitivityRowCount
    && pdf.metadata?.grandTotalStatus === "PARTIAL_NEEDS_PRICE", "PDF_UNKNOWN_PRICE_TRUTH_RED");
  const expectedProcurementTruth = IS_NRMCA_STRIP_FOUNDATION
    ? Number(procurement.metadata?.selectedProcurementRowCount) > 0
      && Number(procurement.metadata?.projectedRowCount)
        === Number(procurement.metadata?.selectedProcurementRowCount)
    : Number(procurement.metadata?.selectedProcurementRowCount) === 0
      && Number(procurement.metadata?.projectedRowCount) === 0;
  invariant(Number(procurement.metadata?.sourceRowCount) === sensitivityRowCount
    && expectedProcurementTruth, "PROCUREMENT_ROW_TRUTH_RED");
  progress("ARTIFACTS_GREEN", { pdfBytes: pdf.byteSize,
    procurementRows: procurement.metadata?.selectedProcurementRowCount });

  const coldContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const cold = await openColdRevision(coldContext, sensitivityRevision!,
    resolve(OUTPUT_ROOT, `03_cold_reopen_${SENSITIVITY_PRIMARY_VALUE}.png`));
  await coldContext.close();
  await browser.close();

  const database = await databaseProof(
    [...new Set([initialRevision!.revisionId, fullRevision!.revisionId, sensitivityRevision!.revisionId])],
    negativeJobs.map((job) => String(job.jobId)),
  );
  invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);
  const unexpectedFailures = requestFailures.filter((failure) => !failure.includes("ERR_ABORTED"));
  invariant(unexpectedFailures.length === 0, `REQUEST_FAILURES:${unexpectedFailures.join("|")}`);

  const body = {
    schemaVersion: IS_NRMCA_STRIP_FOUNDATION
      ? "rik-expo-app.r4-a13-6.strip-foundation-nrmca-cip31-rebar-schedule.web-acceptance.v2"
      : "rik-expo-app.r4-a13-6.formwork-rics-nrm2.web-acceptance.v1",
    capturedAt: new Date().toISOString(),
    status: IS_NRMCA_STRIP_FOUNDATION
      ? "GREEN_EXACT_STRIP_FOUNDATION_NRMCA_CIP31_REBAR_SCHEDULE_WEB_BACKEND_PDF_PROCUREMENT_HISTORY"
      : "GREEN_EXACT_FORMWORK_RICS_NRM2_WEB_BACKEND_PDF_PROCUREMENT_HISTORY",
    runtime: {
      definitionReleaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      definitionVersionId: DEFINITION_ID,
      sourceHead: manifest.compatibilityTuple?.sourceHead,
      sourceTree: manifest.compatibilityTuple?.sourceTree,
      activeCompileJobsAtStart: manifest.activeCompileJobCount,
    },
    principal: { userId, realLocalProviderSession: true, tokensPersisted: false },
    search: searchEvidence!,
    promptSha256: sha256(PROMPT),
    scenarioOriginal: { label: SCENARIO_LABEL, primaryMeasureParameterId: PRIMARY_MEASURE_PARAMETER_ID,
      primaryValue: ORIGINAL_PRIMARY_VALUE, targetQuantity: ORIGINAL_TARGET_QUANTITY,
      revisionId: fullRevision!.revisionId, revisionNumber: fullRevision!.revisionNumber,
      row: originalRow!, reinforcementRow: originalReinforcementRow },
    sensitivity: { primaryValue: SENSITIVITY_PRIMARY_VALUE,
      targetQuantity: SENSITIVITY_TARGET_QUANTITY, revisionId: sensitivityRevision!.revisionId,
      parentRevisionId: sensitivityRevision!.parentRevisionId,
      revisionNumber: sensitivityRevision!.revisionNumber, row: sensitivityRow!,
      reinforcementRow: sensitivityReinforcementRow },
    negative: negativeJobs.map((job) => ({ scenarioId: job.scenarioId, jobId: job.jobId,
      status: job.status, errorCode: job.errorCode, resultRevisionId: job.resultRevisionId ?? null })),
    historyColdReopen: cold,
    documents: {
      pdf: { artifactId: pdf.artifactId, revisionId: pdf.revisionId, byteSize: pdf.byteSize,
        sha256: pdf.sha256, pageCount: pdf.metadata?.pageCount,
        grandTotalStatus: pdf.metadata?.grandTotalStatus, downloadParity: true },
      procurement: { artifactId: procurement.artifactId, revisionId: procurement.revisionId,
        byteSize: procurement.byteSize, sha256: procurement.sha256,
        selectedProcurementRowCount: procurement.metadata?.selectedProcurementRowCount, downloadParity: true },
    },
    database,
    diagnostics: { backendRequests, consoleErrors, pageErrors, requestFailures, unexpectedFailures },
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  atomicJson(OUTPUT, { ...body, receiptSha256: sha256(JSON.stringify(body)) });
  process.stdout.write(`${JSON.stringify({ status: body.status, receipt: OUTPUT,
    revisionId: sensitivityRevision!.revisionId, pdfSha256: pdf.sha256,
    procurementRows: procurement.metadata?.selectedProcurementRowCount,
    productionAccessed: false })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
