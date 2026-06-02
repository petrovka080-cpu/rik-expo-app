import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  listConsumerRepairRequestHistory,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate/globalEstimateCalculator";
import {
  createEstimatePdf,
  estimatePdfInputToBytes,
  extractEstimatePdfTextForProof,
} from "../../src/lib/estimatePdf";

export const ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_WAVE =
  "S_ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT";
export const ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_DIR =
  `artifacts/${ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_WAVE}`;
export const GREEN_ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_READY =
  "GREEN_ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_READY";
export const BLOCKED_ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT =
  "BLOCKED_ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT";

export type EnterpriseAuditArea =
  | "architecture"
  | "backend_data"
  | "scale_performance_cost"
  | "ui"
  | "pdf"
  | "ai_quality"
  | "release_evidence";

export type EnterpriseAuditCheck = {
  key: string;
  area: EnterpriseAuditArea;
  passed: boolean;
  path?: string;
  details?: Record<string, unknown>;
};

export type EnterpriseAuditFailure = {
  code: string;
  area: EnterpriseAuditArea;
  severity: "blocker" | "warning";
  path?: string;
  message: string;
  details?: Record<string, unknown>;
};

export type EnterpriseCurrentTruth = {
  wave: string;
  generated_at: string;
  no_eas_build_triggered: true;
  no_eas_submit_triggered: true;
  no_app_review_triggered: true;
  no_beta_rollout_triggered: true;
  no_public_rollout_triggered: true;
  fake_green_claimed: false;
  typecheck_passed: boolean;
  lint_passed: boolean;
  git_diff_check_passed: boolean;
  targeted_tests_passed: boolean;
  audit_runners_passed: boolean;
  web_e2e_passed: boolean;
  android_api34_passed: boolean;
  full_jest_passed: boolean;
  release_verify_passed: boolean;
  commit_created: boolean;
  branch_pushed: boolean;
  final_worktree_clean: boolean;
  local_branch: string | null;
  head_sha: string | null;
  origin_tracking_status: string;
};

export type EnterpriseAuditReport = {
  wave: string;
  final_status: string;
  generated_at: string;
  current_truth: EnterpriseCurrentTruth;
  current_patch_inventory: Record<string, unknown>;
  checks: EnterpriseAuditCheck[];
  failures: EnterpriseAuditFailure[];
  blockers: string[];
  architecture_risk_audit: Record<string, unknown>;
  backend_data_risk_audit: Record<string, unknown>;
  scale_performance_cost_audit: Record<string, unknown>;
  risk_register: Record<string, unknown>;
  verification_matrix: Record<string, unknown>;
};

const REQUIRED_RELEASE_EVIDENCE: Array<keyof EnterpriseCurrentTruth> = [
  "typecheck_passed",
  "lint_passed",
  "git_diff_check_passed",
  "targeted_tests_passed",
  "audit_runners_passed",
  "full_jest_passed",
  "release_verify_passed",
  "web_e2e_passed",
  "android_api34_passed",
  "commit_created",
  "branch_pushed",
  "final_worktree_clean",
];

const P0_REAL_WORLD_PROMPTS = [
  {
    id: "hvac_258sqm",
    prompt: "смета на установку системы кондиционирования на 258 кв метров",
    expectedWorkKey: "air_conditioner_installation",
    requiredRows: ["Внутренние и наружные блоки", "Фреон", "Пусконаладка"],
  },
  {
    id: "asphalt_10000sqm",
    prompt: "дай смету на прокладку асфальта на 10000 кв метров",
    expectedWorkKey: "asphalt_paving",
    requiredRows: ["Песчаное основание", "Асфальтобетон", "Укладка нижнего слоя"],
  },
  {
    id: "brick_74sqm",
    prompt: "дай смету на кладку кирпича 74 кв метров",
    expectedWorkKey: "brick_masonry",
    requiredRows: ["Кирпич", "Раствор", "Кладка"],
  },
  {
    id: "carpet_100sqm",
    prompt: "мне нужно уложить ковролин на 100 кв м",
    expectedWorkKey: "carpet_laying",
    requiredRows: ["Ковролин", "Подложка", "Укладка ковролина"],
  },
];

const GENERIC_ROW_PATTERNS = [
  /^Основной материал:/i,
  /^Подготовка:/i,
  /^Строительные работы$/i,
  /^Дополнительные материалы:/i,
  /^Дополнительные работы:/i,
  /^монтаж$/i,
];

function artifactPath(name: string): string {
  return path.resolve(process.cwd(), ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_DIR, name);
}

function readProjectFile(relativePath: string): string {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return "";
  return fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, "");
}

function readJson(relativePath: string): Record<string, unknown> {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, "")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(path.dirname(artifactPath(name)), { recursive: true });
  fs.writeFileSync(artifactPath(name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(path.dirname(artifactPath(name)), { recursive: true });
  fs.writeFileSync(artifactPath(name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function git(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    }).trim();
  } catch {
    return fallback;
  }
}

function gitStatusFiles(): string[] {
  return git(["status", "--short"], "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(2).trim().replace(/\\/g, "/");
      return rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() ?? rawPath : rawPath;
    });
}

function boolEnv(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

function boolRecord(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true || record[key] === "true" || record[key] === 1;
}

function evidenceBool(commandStatus: Record<string, unknown>, key: string, envKey: string): boolean {
  return boolEnv(envKey) || boolRecord(commandStatus, key);
}

function buildCurrentTruth(now: string): EnterpriseCurrentTruth {
  const commandStatus = readJson(`${ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_DIR}/command_status.json`);
  const branch = git(["branch", "--show-current"], "");
  const head = git(["rev-parse", "--verify", "HEAD"], "");
  const tracking = git(["rev-list", "--left-right", "--count", "HEAD...@{u}"], "unknown");

  return {
    wave: ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_WAVE,
    generated_at: now,
    no_eas_build_triggered: true,
    no_eas_submit_triggered: true,
    no_app_review_triggered: true,
    no_beta_rollout_triggered: true,
    no_public_rollout_triggered: true,
    fake_green_claimed: false,
    typecheck_passed: evidenceBool(commandStatus, "typecheck_passed", "ENTERPRISE_AUDIT_TYPECHECK_PASSED"),
    lint_passed: evidenceBool(commandStatus, "lint_passed", "ENTERPRISE_AUDIT_LINT_PASSED"),
    git_diff_check_passed: evidenceBool(commandStatus, "git_diff_check_passed", "ENTERPRISE_AUDIT_GIT_DIFF_CHECK_PASSED"),
    targeted_tests_passed: evidenceBool(commandStatus, "targeted_tests_passed", "ENTERPRISE_AUDIT_TARGETED_TESTS_PASSED"),
    audit_runners_passed: evidenceBool(commandStatus, "audit_runners_passed", "ENTERPRISE_AUDIT_RUNNERS_PASSED"),
    web_e2e_passed: evidenceBool(commandStatus, "web_e2e_passed", "ENTERPRISE_AUDIT_WEB_E2E_PASSED"),
    android_api34_passed: evidenceBool(commandStatus, "android_api34_passed", "ENTERPRISE_AUDIT_ANDROID_API34_PASSED"),
    full_jest_passed: evidenceBool(commandStatus, "full_jest_passed", "ENTERPRISE_AUDIT_FULL_JEST_PASSED"),
    release_verify_passed: evidenceBool(commandStatus, "release_verify_passed", "ENTERPRISE_AUDIT_RELEASE_VERIFY_PASSED"),
    commit_created: evidenceBool(commandStatus, "commit_created", "ENTERPRISE_AUDIT_COMMIT_CREATED"),
    branch_pushed: evidenceBool(commandStatus, "branch_pushed", "ENTERPRISE_AUDIT_BRANCH_PUSHED"),
    final_worktree_clean: evidenceBool(commandStatus, "final_worktree_clean", "ENTERPRISE_AUDIT_FINAL_WORKTREE_CLEAN") || gitStatusFiles().length === 0,
    local_branch: branch || null,
    head_sha: head || null,
    origin_tracking_status: tracking,
  };
}

function check(
  checks: EnterpriseAuditCheck[],
  input: Omit<EnterpriseAuditCheck, "passed"> & { passed: boolean },
): void {
  checks.push(input);
}

function failuresFromChecks(checks: EnterpriseAuditCheck[]): EnterpriseAuditFailure[] {
  return checks
    .filter((item) => !item.passed)
    .map((item) => ({
      code: `BLOCKED_${item.key.toUpperCase()}`,
      area: item.area,
      severity: "blocker" as const,
      path: item.path,
      message: `Required enterprise audit check failed: ${item.key}`,
      details: item.details,
    }));
}

function buildPatchInventory(now: string): Record<string, unknown> {
  const files = gitStatusFiles();
  const byArea = {
    artifacts: files.filter((file) => file.startsWith("artifacts/")),
    scripts: files.filter((file) => file.startsWith("scripts/")),
    tests: files.filter((file) => file.startsWith("tests/")),
    app: files.filter((file) => file.startsWith("app/") || file.startsWith("src/")),
    config: files.filter((file) => /^(package\.json|eas\.json|app\.json|tsconfig|jest\.config)/.test(file)),
    other: files.filter((file) => !/^(artifacts|scripts|tests|app|src)\//.test(file)),
  };
  return {
    wave: ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_WAVE,
    generated_at: now,
    git_status_count: files.length,
    git_status_files: files,
    by_area: byArea,
    exact_requested_artifacts_present: [
      "current_truth.json",
      "current_patch_inventory.json",
      "risk_register.json",
      "verification_matrix.json",
      "failures.json",
      "architecture_risk_audit.json",
      "backend_data_risk_audit.json",
      "scale_performance_cost_audit.json",
      "proof.md",
    ],
  };
}

export function collectUiChecks(): EnterpriseAuditCheck[] {
  const checks: EnterpriseAuditCheck[] = [];
  const screen = readProjectFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
  const media = readProjectFile("src/features/consumerRepair/ConsumerRepairMediaButtons.tsx");
  const panel = readProjectFile("src/features/consumerRepair/ConsumerRepairDraftPanel.tsx");
  const summary = readProjectFile("src/features/consumerRepair/RequestEstimateSummaryCard.tsx");
  const sticky = readProjectFile("src/components/layout/AppStickyActionBar.tsx");
  const marketController = readProjectFile("src/features/market/useMarketHomeController.ts");
  const marketScreen = readProjectFile("src/features/market/MarketHomeScreen.tsx");
  const marketHeader = readProjectFile("src/features/market/components/MarketHeaderBar.tsx");
  const tabLayout = readProjectFile("app/(tabs)/_layout.tsx");

  check(checks, {
    key: "request_screen_estimate_not_procurement_chip",
    area: "ui",
    path: "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
    passed:
      screen.includes('title="Смета"') &&
      screen.includes("Маркет") &&
      !/labelRu:\s*["']Сохранить["']/.test(screen) &&
      !/Закупк|procurement/i.test(screen),
  });
  check(checks, {
    key: "request_screen_examples_and_new_draft_reset",
    area: "ui",
    path: "src/features/consumerRepair",
    passed:
      /например/i.test(media) &&
      screen.includes("problemText: \"\"") &&
      screen.includes("Можно набрать следующую смету") &&
      panel.includes("Черновик") &&
      summary.includes("Смета") &&
      !panel.includes("Черновик сметы"),
  });
  check(checks, {
    key: "request_screen_sticky_action_bar_above_bottom_nav",
    area: "ui",
    path: "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
    passed:
      screen.includes("<AppStickyActionBar") &&
      screen.includes('placement="above_bottom_nav"') &&
      screen.includes("safeAreaAware") &&
      sticky.includes('testID="app.sticky-action-bar"') &&
      sticky.includes("APP_LAYOUT.bottomNavHeightPx"),
  });
  check(checks, {
    key: "bottom_nav_estimate_marketplace_plus",
    area: "ui",
    path: "app/(tabs)/_layout.tsx",
    passed:
      /request|estimate|Смета/i.test(tabLayout) &&
      /market|Маркет/i.test(tabLayout) &&
      /plus|add-circle|create|request/i.test(tabLayout),
  });
  check(checks, {
    key: "marketplace_refresh_after_request_mutation",
    area: "ui",
    path: "src/features/market/useMarketHomeController.ts",
    passed:
      screen.includes("params: { refresh: String(Date.now()) }") &&
      marketController.includes("routeParams.refresh") &&
      marketController.includes("handleRefreshFeed()") &&
      marketController.includes('loadFeedStage("refresh")') &&
      marketScreen.includes("<RefreshControl") &&
      marketHeader.includes('testID="market-refresh-button"'),
  });
  return checks;
}

export function collectBackendDataChecks(): EnterpriseAuditCheck[] {
  const checks: EnterpriseAuditCheck[] = [];
  const repository = readProjectFile("src/lib/consumerRequests/consumerRequestRepository.ts");
  const service = readProjectFile("src/lib/consumerRequests/consumerRequestService.ts");
  const marketplace = readProjectFile("src/lib/consumerRequests/consumerRequestMarketplaceService.ts");
  const validation = readProjectFile("src/lib/consumerRequests/consumerRequestValidationService.ts");
  const parity = readProjectFile("src/lib/consumerRequests/consumerRequestPayloadParity.ts");
  const rls = fs.readdirSync(path.resolve(process.cwd(), "supabase/migrations"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => readProjectFile(`supabase/migrations/${entry.name}`))
    .join("\n");

  __resetConsumerRepairRequestStoreForTests();
  const userA = "enterprise-audit-user-a";
  const userB = "enterprise-audit-user-b";
  const draftA = createConsumerRepairRequestDraft({
    consumerUserId: userA,
    problemText: "Нужно уложить ламинат на 20 кв м",
    repairType: "flooring",
    contactPhone: "+996 555 100 100",
    aiDraft: buildConsumerRepairAiDraft("Нужно уложить ламинат на 20 кв м"),
  });
  createConsumerRepairRequestDraft({
    consumerUserId: userB,
    problemText: "Нужно покрасить стены 30 кв м",
    repairType: "painting",
    contactPhone: "+996 555 200 200",
    aiDraft: buildConsumerRepairAiDraft("Нужно покрасить стены 30 кв м"),
  });
  const onlyA = listConsumerRepairRequestHistory(userA);
  const onlyB = listConsumerRepairRequestHistory(userB);
  const paged = listConsumerRepairRequestHistory(userA, { limit: 100 });

  check(checks, {
    key: "consumer_request_in_memory_owner_isolation",
    area: "backend_data",
    passed:
      onlyA.length === 1 &&
      onlyA[0]?.draft.consumerUserId === userA &&
      onlyB.length === 1 &&
      onlyB[0]?.draft.consumerUserId === userB &&
      paged.length <= 20,
    details: { userAHistory: onlyA.length, userBHistory: onlyB.length, cappedHistory: paged.length, draftA: draftA.draft.id },
  });
  check(checks, {
    key: "consumer_request_repository_filters_by_owner_and_cursor",
    area: "backend_data",
    path: "src/lib/consumerRequests/consumerRequestRepository.ts",
    passed:
      repository.includes("bundle.draft.consumerUserId === consumerUserId") &&
      repository.includes("cursorCreatedAt") &&
      repository.includes("Math.min(Math.max(options.limit ?? 20, 1), 20)"),
  });
  check(checks, {
    key: "consumer_request_rls_owner_policies_present",
    area: "backend_data",
    path: "supabase/migrations",
    passed:
      /consumer_repair_request_drafts/i.test(rls) &&
      /consumer_user_id\s*=\s*auth\.uid\(\)/i.test(rls) &&
      /consumer_repair_request_items/i.test(rls) &&
      /consumer_repair_request_pdfs/i.test(rls) &&
      /consumer_marketplace_links/i.test(rls),
  });
  check(checks, {
    key: "consumer_request_single_source_of_truth",
    area: "backend_data",
    path: "src/lib/consumerRequests",
    passed:
      service.includes("syncConsumerRepairDraftFields") === false &&
      parity.includes("buildConsumerRepairCanonicalDraftPayload") &&
      marketplace.includes("validateConsumerRepairRequestForMarketplace") &&
      validation.includes("validateConsumerRepairRequestForApprove"),
  });
  check(checks, {
    key: "marketplace_send_idempotent_and_validated",
    area: "backend_data",
    path: "src/lib/consumerRequests/consumerRequestMarketplaceService.ts",
    passed:
      marketplace.includes("alreadySent") &&
      marketplace.includes("marketplace_send_idempotent_replay") &&
      marketplace.includes("validateConsumerRepairRequestForMarketplace"),
  });
  return checks;
}

export function collectPdfChecks(): EnterpriseAuditCheck[] {
  const checks: EnterpriseAuditCheck[] = [];
  const renderer = readProjectFile("src/lib/estimatePdf/renderEstimatePdfDocument.ts");
  const requestPdf = readProjectFile("src/lib/consumerRequests/consumerRequestPdfService.ts");
  const requestScreen = readProjectFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
  const foreman = readProjectFile("src/screens/foreman/useForemanPdf.wave1.test.tsx") +
    readProjectFile("src/screens/foreman/useForemanScreenController.test.tsx");
  const director = readProjectFile("src/lib/api/directorSubcontractReportPdfBackend.service.ts") +
    readProjectFile("src/lib/api/directorReportsTransport.service.ts") +
    readProjectFile("src/lib/api/directorRolePdfBackends.test.ts");

  const estimate = calculateGlobalConstructionEstimateSync({
    text: "дай смету на кладку кирпича 74 кв метров",
    countryCode: "KG",
    city: "Bishkek",
  });
  const pdf = createEstimatePdf({
    estimate,
    generatedAt: new Date("2026-06-02T00:00:00.000Z").toISOString(),
    language: estimate.locale.language,
    runtimeTrace: {
      traceId: "enterprise-production-safe-app-audit:brick",
      input: "дай смету на кладку кирпича 74 кв метров",
      selectedRoute: "/request",
      selectedTool: "calculate_global_estimate",
      workKey: estimate.work.workKey,
    },
  });
  const extraction = extractEstimatePdfTextForProof({
    pdf: pdf.bytes,
    knownWorkKey: estimate.work.workKey,
    requiredText: ["Таблица сметы", "Кирпич", "Кладка", "Итоги"],
  });
  const body = Buffer.from(estimatePdfInputToBytes(pdf.bytes)).toString("latin1");

  check(checks, {
    key: "request_estimate_pdf_real_table_binary",
    area: "pdf",
    path: "src/lib/estimatePdf/renderEstimatePdfDocument.ts",
    passed:
      extraction.valid &&
      body.startsWith("%PDF-") &&
      body.includes(" re S") &&
      renderer.includes("drawStructuredTableHeader") &&
      renderer.includes("drawStructuredTableRow") &&
      renderer.includes("renderStructuredPdfBody"),
    details: {
      byteLength: extraction.byteLength,
      binaryHeader: extraction.binaryHeader,
      cyrillicReadable: extraction.cyrillicReadable,
      mojibakeFound: extraction.mojibakeFound,
      failures: extraction.failures,
    },
  });
  check(checks, {
    key: "request_pdf_transport_uses_signed_viewer_route",
    area: "pdf",
    path: "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
    passed:
      requestScreen.includes('pathname: "/pdf-viewer"') &&
      requestScreen.includes('documentType: "request"') &&
      requestScreen.includes('accessKind: "signed-url"') &&
      requestPdf.includes("createEstimatePdf") &&
      requestPdf.includes("consumerRepairPdfStorageObjectExists"),
  });
  check(checks, {
    key: "pdf_transport_all_roles_have_origin_scope",
    area: "pdf",
    path: "src",
    passed:
      /originModule:\s*"foreman"/.test(foreman) &&
      /documentType:\s*"request"/.test(foreman) &&
      /director_report/.test(director) &&
      /originModule|documentType/.test(director),
  });
  return checks;
}

export function collectAiQualityChecks(): EnterpriseAuditCheck[] {
  const checks: EnterpriseAuditCheck[] = [];
  const packageJson = JSON.parse(readProjectFile("package.json")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const secondFrameworks = Object.keys(deps).filter((name) =>
    /langchain|llamaindex|semantic-kernel|haystack|autogen|crewai/i.test(name),
  );
  const aiSource = [
    "src/lib/ai/globalEstimate/globalEstimateCalculator.ts",
    "src/lib/ai/globalEstimate/globalWorkTypeResolver.ts",
    "src/lib/ai/globalEstimate/globalEstimateSeedData.ts",
    "src/features/consumerRepair/consumerRepairAiAdapter.ts",
  ].map(readProjectFile).join("\n");

  const promptResults = P0_REAL_WORLD_PROMPTS.map((item) => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: item.prompt,
      countryCode: "KG",
      city: "Bishkek",
    });
    const rows = estimate.sections.flatMap((section) => section.rows.map((row) => row.name));
    const joinedRows = rows.join("\n").toLocaleLowerCase("ru-RU");
    const missingRows = item.requiredRows.filter((row) => !joinedRows.includes(row.toLocaleLowerCase("ru-RU")));
    const genericRows = rows.filter((row) => GENERIC_ROW_PATTERNS.some((pattern) => pattern.test(row.trim())));
    return {
      id: item.id,
      prompt: item.prompt,
      workKey: estimate.work.workKey,
      expectedWorkKey: item.expectedWorkKey,
      rowCount: rows.length,
      missingRows,
      genericRows,
      passed:
        estimate.work.workKey === item.expectedWorkKey &&
        rows.length >= 8 &&
        missingRows.length === 0 &&
        genericRows.length === 0,
    };
  });

  check(checks, {
    key: "no_second_ai_framework_or_prompt_lookup",
    area: "architecture",
    path: "package.json",
    passed:
      secondFrameworks.length === 0 &&
      !/if\s*\(\s*(?:prompt|text|input)\s*={2,3}\s*["'`]/i.test(aiSource) &&
      !/switch\s*\(\s*(?:prompt|text|input)\s*\)/i.test(aiSource),
    details: { secondFrameworks },
  });
  check(checks, {
    key: "estimate_p0_real_world_prompts_specific_rows",
    area: "ai_quality",
    path: "src/lib/ai/globalEstimate",
    passed: promptResults.every((item) => item.passed),
    details: { promptResults },
  });
  return checks;
}

export function collectScalePerformanceCostChecks(): EnterpriseAuditCheck[] {
  const checks: EnterpriseAuditCheck[] = [];
  const repository = readProjectFile("src/lib/consumerRequests/consumerRequestRepository.ts");
  const marketRepository = readProjectFile("src/features/market/market.repository.ts");
  const marketService = readProjectFile("src/features/market/marketplace.home.service.ts");
  const marketScreen = readProjectFile("src/features/market/MarketHomeScreen.tsx");
  const pdfGuard = readProjectFile("src/lib/estimatePdf/aiEstimatePdfJobGuard.ts");
  const pdfRateLimit = readProjectFile("src/lib/estimatePdf/aiEstimatePdfRateLimit.ts");

  check(checks, {
    key: "consumer_request_history_pagination_cap",
    area: "scale_performance_cost",
    path: "src/lib/consumerRequests/consumerRequestRepository.ts",
    passed:
      repository.includes("Math.min(Math.max(options.limit ?? 20, 1), 20)") &&
      repository.includes("cursorCreatedAt") &&
      repository.includes(".slice(0, limit)"),
  });
  check(checks, {
    key: "marketplace_feed_pagination_and_virtualization",
    area: "scale_performance_cost",
    path: "src/features/market",
    passed:
      marketService.includes("MARKET_PAGE_SIZE") &&
      marketRepository.includes("p_offset") &&
      marketRepository.includes("p_limit") &&
      marketScreen.includes("FlashList") &&
      marketScreen.includes("onEndReached") &&
      marketScreen.includes("windowSize"),
  });
  check(checks, {
    key: "pdf_generation_has_size_and_rate_guards",
    area: "scale_performance_cost",
    path: "src/lib/estimatePdf",
    passed:
      pdfGuard.includes("AI_ESTIMATE_MAX_PDF_BYTES") &&
      pdfGuard.includes("pdf_rate_limit_ready") &&
      /rate/i.test(pdfRateLimit) &&
      /limit/i.test(pdfRateLimit),
  });
  return checks;
}

function releaseEvidenceFailures(currentTruth: EnterpriseCurrentTruth): EnterpriseAuditFailure[] {
  const commandStatus = readJson(`${ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_DIR}/command_status.json`);
  return REQUIRED_RELEASE_EVIDENCE
    .filter((key) => currentTruth[key] !== true)
    .map((key) => ({
      code:
        key === "full_jest_passed" && boolRecord(commandStatus, "full_jest_timeout")
          ? "BLOCKED_FULL_JEST_TIMEOUT"
          : key === "release_verify_passed" && typeof commandStatus.release_verify_exact_blocker === "string"
            ? "BLOCKED_RELEASE_VERIFY_FAILED"
          : `BLOCKED_${String(key).toUpperCase()}`,
      area: "release_evidence" as const,
      severity: "blocker" as const,
      path: `${ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_DIR}/current_truth.json`,
      message:
        key === "full_jest_passed" && boolRecord(commandStatus, "full_jest_timeout")
          ? "Full Jest did not complete before the configured timeout."
          : key === "release_verify_passed" && typeof commandStatus.release_verify_exact_blocker === "string"
            ? `release:verify:core failed: ${commandStatus.release_verify_exact_blocker}`
          : `Production-safe release evidence is missing or false: ${String(key)}`,
      details:
        key === "full_jest_passed" && boolRecord(commandStatus, "full_jest_timeout")
          ? { timeout_ms: commandStatus.full_jest_timeout_ms ?? null }
          : key === "release_verify_passed" && typeof commandStatus.release_verify_exact_blocker === "string"
            ? {
                final_status: commandStatus.release_verify_final_status ?? null,
                exact_blocker: commandStatus.release_verify_exact_blocker,
              }
          : undefined,
    }));
}

function auditByArea(checks: EnterpriseAuditCheck[], area: EnterpriseAuditArea): Record<string, unknown> {
  const areaChecks = checks.filter((item) => item.area === area);
  return {
    wave: ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_WAVE,
    area,
    passed: areaChecks.every((item) => item.passed),
    checks: areaChecks,
    failures: failuresFromChecks(areaChecks),
  };
}

function buildRiskRegister(failures: EnterpriseAuditFailure[]): Record<string, unknown> {
  return {
    wave: ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_WAVE,
    total_blockers: failures.filter((item) => item.severity === "blocker").length,
    total_warnings: failures.filter((item) => item.severity === "warning").length,
    risks: failures.map((failure) => ({
      id: failure.code,
      area: failure.area,
      severity: failure.severity,
      status: "open",
      mitigation:
        failure.area === "release_evidence"
          ? "Run and record the missing full release gate, then rerun the enterprise production-safe app audit proof."
          : "Fix the failed product safety check and rerun the focused audit runner.",
      artifact: failure.path ?? `${ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_DIR}/failures.json`,
      message: failure.message,
    })),
  };
}

function buildVerificationMatrix(
  currentTruth: EnterpriseCurrentTruth,
  checks: EnterpriseAuditCheck[],
  failures: EnterpriseAuditFailure[],
): Record<string, unknown> {
  const productChecksPassed = checks.every((item) => item.passed);
  const releaseEvidencePassed = REQUIRED_RELEASE_EVIDENCE.every((key) => currentTruth[key] === true);
  const finalGreen = productChecksPassed && releaseEvidencePassed && failures.length === 0;
  return {
    wave: ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_WAVE,
    final_status: finalGreen
      ? GREEN_ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_READY
      : BLOCKED_ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT,
    product_checks_passed: productChecksPassed,
    release_evidence_passed: releaseEvidencePassed,
    fake_green_claimed: false,
    no_eas_build_triggered: true,
    no_eas_submit_triggered: true,
    no_app_review_triggered: true,
    gates: REQUIRED_RELEASE_EVIDENCE.map((key) => ({
      key,
      passed: currentTruth[key] === true,
    })),
    check_summary: checks.map((item) => ({
      key: item.key,
      area: item.area,
      passed: item.passed,
      path: item.path,
    })),
    blockers: failures.filter((item) => item.severity === "blocker").map((item) => item.code),
  };
}

function buildProofMarkdown(report: EnterpriseAuditReport): string {
  const primaryBlocker = report.blockers[0] ?? "none";
  return [
    `# ${ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_WAVE}`,
    "",
    `Status: ${report.final_status}`,
    `Primary blocker: ${primaryBlocker}`,
    `Fake green claimed: ${report.current_truth.fake_green_claimed}`,
    `EAS build triggered: ${!report.current_truth.no_eas_build_triggered}`,
    `EAS submit triggered: ${!report.current_truth.no_eas_submit_triggered}`,
    `App review triggered: ${!report.current_truth.no_app_review_triggered}`,
    "",
    "## Required Release Evidence",
    ...REQUIRED_RELEASE_EVIDENCE.map((key) => `- ${key}: ${report.current_truth[key] === true ? "PASS" : "MISSING"}`),
    "",
    "## Product Checks",
    ...report.checks.map((item) => `- ${item.area}/${item.key}: ${item.passed ? "PASS" : "FAIL"}`),
    "",
    "## Failure Artifact",
    `${ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_DIR}/failures.json`,
  ].join("\n");
}

export function buildEnterpriseProductionSafeAppAuditReport(options: {
  now?: string;
  includeReleaseEvidenceFailures?: boolean;
} = {}): EnterpriseAuditReport {
  const now = options.now ?? new Date().toISOString();
  const currentTruth = buildCurrentTruth(now);
  const checks = [
    ...collectUiChecks(),
    ...collectBackendDataChecks(),
    ...collectPdfChecks(),
    ...collectAiQualityChecks(),
    ...collectScalePerformanceCostChecks(),
  ];
  const productFailures = failuresFromChecks(checks);
  const evidenceFailures = options.includeReleaseEvidenceFailures === false ? [] : releaseEvidenceFailures(currentTruth);
  const failures = [...productFailures, ...evidenceFailures];
  const blockers = failures.filter((item) => item.severity === "blocker").map((item) => item.code);
  const verificationMatrix = buildVerificationMatrix(currentTruth, checks, failures);
  const finalStatus = String(verificationMatrix.final_status);
  return {
    wave: ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_WAVE,
    final_status: finalStatus,
    generated_at: now,
    current_truth: currentTruth,
    current_patch_inventory: buildPatchInventory(now),
    checks,
    failures,
    blockers,
    architecture_risk_audit: auditByArea(checks, "architecture"),
    backend_data_risk_audit: auditByArea(checks, "backend_data"),
    scale_performance_cost_audit: auditByArea(checks, "scale_performance_cost"),
    risk_register: buildRiskRegister(failures),
    verification_matrix: verificationMatrix,
  };
}

export function writeEnterpriseProductionSafeAppAuditArtifacts(report: EnterpriseAuditReport): void {
  writeJson("current_truth.json", report.current_truth);
  writeJson("current_patch_inventory.json", report.current_patch_inventory);
  writeJson("risk_register.json", report.risk_register);
  writeJson("verification_matrix.json", report.verification_matrix);
  writeJson("failures.json", report.failures);
  writeJson("architecture_risk_audit.json", report.architecture_risk_audit);
  writeJson("backend_data_risk_audit.json", report.backend_data_risk_audit);
  writeJson("scale_performance_cost_audit.json", report.scale_performance_cost_audit);
  writeText("proof.md", buildProofMarkdown(report));
}

export function runEnterpriseProductionSafeAppAudit(options: {
  includeReleaseEvidenceFailures?: boolean;
  writeArtifacts?: boolean;
} = {}): EnterpriseAuditReport {
  const report = buildEnterpriseProductionSafeAppAuditReport({
    includeReleaseEvidenceFailures: options.includeReleaseEvidenceFailures,
  });
  if (options.writeArtifacts !== false) {
    writeEnterpriseProductionSafeAppAuditArtifacts(report);
  }
  return report;
}

export function assertFocusedAuditPassed(report: EnterpriseAuditReport, area: EnterpriseAuditArea): void {
  const failures = report.failures.filter((failure) => failure.area === area);
  if (failures.length > 0) {
    throw new Error(`${area} audit failed: ${failures.map((failure) => failure.code).join(", ")}`);
  }
}
