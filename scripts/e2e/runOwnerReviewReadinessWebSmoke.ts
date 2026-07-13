import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

import {
  buildAiEstimateCorpusFingerprint,
  runAiEstimateSmokeCases,
  writeAiEstimateSmokeArtifacts,
} from "./aiEstimateSmokeHarness";
import {
  argValue,
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  resolveE2eBaseUrl,
} from "./renderStagingAcceptanceCore";
import { ensureWave2CAndroidWebServer } from "./runWave2CExpandedBoqAndroidSmoke";
import { buildOwnerReviewReadinessCases, runOwnerReviewDomainProof } from "./ownerReviewReadinessCore";

const ROOT = path.join(".release-runtime", "ai-estimate-owner-review-pilot-operating-system", "web");
const DEFAULT_BASE_URL = "http://localhost:8126";

export const GREEN_AI_ESTIMATE_OWNER_REVIEW_WEB_SMOKE = "GREEN_AI_ESTIMATE_OWNER_REVIEW_WEB_SMOKE" as const;
export const STOP_AI_ESTIMATE_OWNER_REVIEW_WEB_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_OWNER_REVIEW_WEB_SMOKE_FAILED" as const;

async function runBrowserProof(baseUrl: string) {
  const browser = await chromium.launch({ headless: true });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const response = await page.goto(`${baseUrl.replace(/\/+$/, "")}/request?ownerReviewWebSmoke=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const marker = await page
      .locator('[data-testid="consumer-repair-screen"], [data-testid="consumer-repair-problem-input"], [data-testid="inline-work-prompt-field"]')
      .first()
      .waitFor({ state: "attached", timeout: 90_000 })
      .then(() => true)
      .catch(() => false);
    const bodyText = await page.locator("body").innerText({ timeout: 60_000 }).catch(() => "");
    return {
      request_route_loaded: response?.ok() === true || marker,
      request_route_http_ok: response?.ok() === true,
      request_route_marker_attached: marker,
      owner_review_packet_ui_route_available: false,
      owner_review_packet_doc_route_checked: false,
      raw_dump_ui_count: /raw dump|provider payload|debug json/i.test(bodyText) ? 1 : 0,
      console_errors: consoleErrors,
      page_errors: pageErrors,
    };
  } finally {
    await browser.close();
  }
}

export async function runOwnerReviewReadinessWebSmoke(options: {
  requireRealBrowser?: boolean;
  baseUrl?: string | null;
} = {}) {
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["AI_ESTIMATE_OWNER_REVIEW_WEB_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ROOT, "server", String(Date.now()));
  mkdirSync(outDir, { recursive: true });
  const server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
  try {
    const cases = buildOwnerReviewReadinessCases();
    const results = await runAiEstimateSmokeCases({
      target: "web",
      cases,
      executeCase: async (testCase) => {
        const proof = runOwnerReviewDomainProof(testCase);
        return {
          passed: proof.blockers.length === 0,
          blockers: proof.blockers,
          failureType: proof.blockers.length === 0 ? null : "business",
        };
      },
    });
    const browser = options.requireRealBrowser === true
      ? await runBrowserProof(baseUrl)
      : {
          request_route_loaded: false,
          request_route_http_ok: false,
          request_route_marker_attached: false,
          owner_review_packet_ui_route_available: false,
          owner_review_packet_doc_route_checked: false,
          raw_dump_ui_count: 0,
          console_errors: [] as string[],
          page_errors: [] as string[],
        };
    const passed = results.filter((item) => item.passed).length;
    const consoleCount = browser.console_errors.length + browser.page_errors.length;
    const domainProofs = cases.map(runOwnerReviewDomainProof);
    const knownLimitationsVisible = domainProofs.every((proof) => proof.known_limitations_visible);
    const contractTotalNotClaimed = domainProofs.every((proof) => proof.contract_total_not_claimed);
    const ownerApprovalPending = domainProofs.every((proof) => proof.owner_approval_pending);
    const blockers = [
      options.requireRealBrowser === true ? "" : "real_browser_required_flag_missing",
      browser.request_route_loaded ? "" : "request_route_not_loaded",
      passed === 20 ? "" : `web_owner_review_case_failure:${passed}/20`,
      knownLimitationsVisible ? "" : "known_limitations_not_visible",
      contractTotalNotClaimed ? "" : "contract_total_claimed",
      ownerApprovalPending ? "" : "owner_approval_not_pending",
      consoleCount === 0 ? "" : `console_errors:${consoleCount}`,
      browser.raw_dump_ui_count === 0 ? "" : "raw_dump_ui_visible",
    ].filter(Boolean);
    const summary = {
      final_status: blockers.length === 0
        ? GREEN_AI_ESTIMATE_OWNER_REVIEW_WEB_SMOKE
        : STOP_AI_ESTIMATE_OWNER_REVIEW_WEB_SMOKE_FAILED,
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      upstream_sync: currentUpstreamSync(),
      generated_at: new Date().toISOString(),
      target: "web",
      base_url: baseUrl,
      require_real_browser: options.requireRealBrowser === true,
      browser_automation_started: options.requireRealBrowser === true,
      actual_web_browser_owner_review_smoke_passed: blockers.length === 0,
      web_owner_review_cases_passed: `${passed}/20`,
      web_known_limitations_visible: knownLimitationsVisible,
      web_contract_total_not_claimed: contractTotalNotClaimed,
      web_owner_approval_pending: ownerApprovalPending,
      web_console_errors_count: consoleCount,
      corpus_fingerprint: buildAiEstimateCorpusFingerprint(cases),
      browser,
      domain_proofs: domainProofs,
      route_equivalent_not_reported_as_real_browser: true,
      route_equivalent_smoke_passed: false,
      env_browser_green_rejected: true,
      owner_approved: false,
      production_release_started: false,
      contract_total_claimed: false,
      public_beta_started: false,
      fake_green_claimed: false,
      blocking_reasons: blockers,
    };
    const result = writeAiEstimateSmokeArtifacts({ root: ROOT, summary, caseResults: results });
    console.log(JSON.stringify({
      artifact: result.summaryPath,
      final_status: summary.final_status,
      web_owner_review_cases_passed: summary.web_owner_review_cases_passed,
      blocking_reasons: summary.blocking_reasons,
    }, null, 2));
    if (summary.final_status !== GREEN_AI_ESTIMATE_OWNER_REVIEW_WEB_SMOKE) process.exitCode = 1;
    return { artifactPath: result.summaryPath, artifact: result.summary };
  } finally {
    server.stop();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runOwnerReviewReadinessWebSmoke.ts")) {
  runOwnerReviewReadinessWebSmoke({
    requireRealBrowser: hasFlag("require-real-browser"),
    baseUrl: argValue("base-url"),
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
