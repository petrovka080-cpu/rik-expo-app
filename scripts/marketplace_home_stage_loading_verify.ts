import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { config as loadDotenv } from "dotenv";
import { createVerifierAdmin } from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();

for (const file of [".env.local", ".env"]) {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) loadDotenv({ path: fullPath, override: false });
}

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const readText = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
const admin = createVerifierAdmin("marketplace-home-stage-loading-verify");

const readHeadVersion = (relativePath: string) => {
  try {
    return execFileSync("git", ["show", `HEAD:${relativePath}`], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
};

const buildMetrics = (screenText: string, serviceText: string) => ({
  hasGlobalBlockingGate: screenText.includes("if (loading)") || screenText.includes("setLoading(true)"),
  screenOwnsAuctionsFetch: screenText.includes("loadMarketplaceAuctionSummary"),
  screenOwnsFeedFetch: screenText.includes("loadMarketHomePage"),
  screenOwnsCapabilitiesFetch: screenText.includes("loadMarketRoleCapabilities"),
  screenOwnsPromiseAll: screenText.includes("Promise.all(["),
  usesStage1Service: screenText.includes("loadMarketplaceHomeStage1"),
  usesFeedStageService: screenText.includes("loadMarketplaceHomeFeedStage"),
  feedPhaseState: screenText.includes('type FeedPhase = "loading" | "ready" | "empty" | "error"'),
  stagedPlaceholder: screenText.includes('feedPhase === "loading"'),
  serviceExportsStage1: serviceText.includes("export async function loadMarketplaceHomeStage1("),
  serviceExportsFeedStage: serviceText.includes("export async function loadMarketplaceHomeFeedStage("),
});

async function main() {
  const { loadAuctionSummaries } = await import("../src/features/auctions/auctions.data");
  const screenPath = "src/features/market/MarketHomeScreen.tsx";
  const servicePath = "src/features/market/marketplace.home.service.ts";

  const beforeScreen = readHeadVersion(screenPath);
  const beforeService = readHeadVersion(servicePath);
  const afterScreen = readText(screenPath);
  const afterService = readText(servicePath);

  const before = buildMetrics(beforeScreen, beforeService);
  const after = buildMetrics(afterScreen, afterService);

  const stage1Start = Date.now();
  const stage1Promise = loadAuctionSummaries("active").then((rows) => ({
    state: "ready" as const,
    auctionsState: rows.length > 0 ? ("ready" as const) : ("empty" as const),
    activeCount: rows.filter((row) => {
      const normalized = String(row.status ?? "").trim().toLowerCase();
      return normalized !== "draft" && normalized !== "pending";
    }).length,
    pendingCount: rows.filter((row) => {
      const normalized = String(row.status ?? "").trim().toLowerCase();
      return normalized === "draft" || normalized === "pending";
    }).length,
  }));
  const feedStart = Date.now();
  const feedPromise = admin.rpc("marketplace_items_scope_page_v1", {
    p_offset: 0,
    p_limit: 24,
    p_side: null,
    p_kind: null,
  });

  const [stage1Result, feedResult] = await Promise.allSettled([stage1Promise, feedPromise]);
  const stage1DurationMs = Date.now() - stage1Start;
  const feedDurationMs = Date.now() - feedStart;

  const smoke = {
    generatedAt: new Date().toISOString(),
    stage1:
      stage1Result.status === "fulfilled"
        ? {
            status: "fulfilled",
            state: stage1Result.value.state,
            auctionsState: stage1Result.value.auctionsState,
            activeCount: stage1Result.value.activeCount,
            pendingCount: stage1Result.value.pendingCount,
            durationMs: stage1DurationMs,
          }
        : {
            status: "rejected",
            message: stage1Result.reason instanceof Error ? stage1Result.reason.message : String(stage1Result.reason ?? "unknown"),
            durationMs: stage1DurationMs,
          },
    feed:
      feedResult.status === "fulfilled" && !feedResult.value.error
        ? {
            status: "fulfilled",
            rowCount: Array.isArray(feedResult.value.data) ? feedResult.value.data.length : 0,
            totalCount:
              Array.isArray(feedResult.value.data) && feedResult.value.data.length > 0
                ? Number((feedResult.value.data[0] as { total_count?: number | null }).total_count ?? 0)
                : 0,
            hasMore:
              Array.isArray(feedResult.value.data) &&
              feedResult.value.data.length > 0 &&
              Number((feedResult.value.data[0] as { total_count?: number | null }).total_count ?? 0) >
                feedResult.value.data.length,
            phase:
              Array.isArray(feedResult.value.data) && feedResult.value.data.length > 0 ? "ready" : "empty",
            durationMs: feedDurationMs,
          }
        : {
            status: "rejected",
            message:
              feedResult.status === "fulfilled"
                ? feedResult.value.error?.message ?? "unknown"
                : feedResult.reason instanceof Error
                  ? feedResult.reason.message
                  : String(feedResult.reason ?? "unknown"),
            durationMs: feedDurationMs,
          },
  };

  const baseline = {
    generatedAt: new Date().toISOString(),
    before,
    interpretation: {
      blockingShellBefore:
        before.hasGlobalBlockingGate &&
        before.screenOwnsAuctionsFetch &&
        before.screenOwnsFeedFetch &&
        before.screenOwnsCapabilitiesFetch,
      screenOwnedGlueBefore:
        before.screenOwnsPromiseAll &&
        before.screenOwnsFeedFetch &&
        before.screenOwnsCapabilitiesFetch,
    },
  };

  const beforeAfter = {
    generatedAt: new Date().toISOString(),
    before,
    after,
    improvements: {
      removedGlobalBlockingGate: before.hasGlobalBlockingGate && !after.hasGlobalBlockingGate,
      movedFeedFetchOutOfScreen: before.screenOwnsFeedFetch && !after.screenOwnsFeedFetch,
      movedCapabilitiesOutOfScreen: before.screenOwnsCapabilitiesFetch && !after.screenOwnsCapabilitiesFetch,
      movedAuctionsFetchOutOfScreen: before.screenOwnsAuctionsFetch && !after.screenOwnsAuctionsFetch,
      introducedStageServices:
        after.usesStage1Service &&
        after.usesFeedStageService &&
        after.serviceExportsStage1 &&
        after.serviceExportsFeedStage,
      introducedFeedPhaseStates: after.feedPhaseState && after.stagedPlaceholder,
    },
  };

  const currentDiscipline = {
    stageServices:
      after.usesStage1Service &&
      after.usesFeedStageService &&
      after.serviceExportsStage1 &&
      after.serviceExportsFeedStage,
    nonBlockingShell: !after.hasGlobalBlockingGate,
    screenDoesNotOwnFeedFetch: !after.screenOwnsFeedFetch,
    screenDoesNotOwnCapabilitiesFetch: !after.screenOwnsCapabilitiesFetch,
    screenDoesNotOwnAuctionsFetch: !after.screenOwnsAuctionsFetch,
    stagedFeedStates: after.feedPhaseState && after.stagedPlaceholder,
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    status:
      Object.values(currentDiscipline).every(Boolean) &&
      stage1Result.status === "fulfilled" &&
      feedResult.status === "fulfilled" &&
      !feedResult.value.error
        ? "GREEN"
        : "NOT GREEN",
    stage1Status: smoke.stage1.status,
    feedStatus: smoke.feed.status,
    stage1DurationMs,
    feedDurationMs,
  };

  writeJson("artifacts/marketplace-load-baseline.json", baseline);
  writeJson("artifacts/marketplace-load-before-after.json", {
    ...beforeAfter,
    currentDiscipline,
  });
  writeJson("artifacts/marketplace-home-smoke.json", smoke);
  writeJson("artifacts/marketplace-stage-loading-summary.json", summary);

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "GREEN") process.exitCode = 1;
}

void main();
