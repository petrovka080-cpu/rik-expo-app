import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

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

type VerifierAuctionRow = {
  id: string;
  source: "tender";
  title: string;
  subtitle: string;
  city: string | null;
  status: string | null;
  deadlineAt: string | null;
  createdAt: string | null;
  note: string | null;
  contactPhone: string | null;
  contactWhatsApp: string | null;
  contactEmail: string | null;
  itemsCount: number;
  itemsPreview: string[];
};

const buildRow = (id: string, status: string, createdAt: string): VerifierAuctionRow => ({
  id,
  source: "tender",
  title: `Auction ${id}`,
  subtitle: "summary",
  city: null,
  status,
  deadlineAt: null,
  createdAt,
  note: null,
  contactPhone: null,
  contactWhatsApp: null,
  contactEmail: null,
  itemsCount: 0,
  itemsPreview: [],
});

async function main() {
  const auctionsModule = await import("../src/features/market/marketplace.auctions.service");
  const routesModule = await import("../src/features/market/market.routes");
  const {
    buildMarketplaceAuctionSummary,
    buildMarketplaceAuctionSummaryFailure,
    loadMarketplaceAuctionSummary,
  } = auctionsModule;
  const { MARKET_AUCTIONS_ROUTE } = routesModule;

  const screenPath = "src/features/market/MarketHomeScreen.tsx";
  const cardPath = "src/features/market/components/MarketTenderBanner.tsx";
  const servicePath = "src/features/market/marketplace.auctions.service.ts";
  const routesPath = "src/features/market/market.routes.ts";

  const screenText = readText(screenPath);
  const cardText = readText(cardPath);
  const serviceText = readText(servicePath);
  const routesText = readText(routesPath);

  const syntheticReady = buildMarketplaceAuctionSummary([
    buildRow("published-1", "published", "2026-03-29T06:00:00.000Z"),
    buildRow("draft-1", "draft", "2026-03-29T06:05:00.000Z"),
    buildRow("published-2", "published", "2026-03-29T06:10:00.000Z"),
  ]);
  const syntheticEmpty = buildMarketplaceAuctionSummary([]);
  const syntheticFailure = buildMarketplaceAuctionSummaryFailure("error", "summary unavailable");

  const contract = {
    generatedAt: new Date().toISOString(),
    canonicalType: {
      activeCount: "number",
      pendingCount: "number",
      hasVisibleAuctions: "boolean",
      primaryCtaRoute: "Href:/auctions",
      updatedAt: "string|null",
      state: ["ready", "empty", "error", "degraded"],
      sourceKind: "canonical:auctions.summary",
    },
    routeContract: {
      auctionsRoute: MARKET_AUCTIONS_ROUTE,
      marketUsesCanonicalAuctionRoute: routesText.includes('export const MARKET_AUCTIONS_ROUTE = "/auctions"'),
    },
    structural: {
      serviceExportsCanonicalLoader: serviceText.includes("export async function loadMarketplaceAuctionSummary("),
      serviceUsesCanonicalAuctionsLoader: serviceText.includes("await loadAuctionSummaries(\"active\")"),
      screenUsesSummaryBoundary: screenText.includes("loadMarketplaceAuctionSummary"),
      screenAvoidsAuctionRowsDirectly: !screenText.includes("loadAuctionSummaries"),
      screenUsesRouteContract: screenText.includes("primaryCtaRoute") && screenText.includes("MARKET_AUCTIONS_ROUTE"),
      cardUsesStatefulSummary: cardText.includes("summary.state === \"ready\"") && cardText.includes("summary.state === \"empty\""),
      placeholderRemoved:
        !screenText.includes("comingSoon") &&
        !cardText.includes("comingSoon") &&
        !cardText.includes("Торги ERP скоро"),
    },
  };

  const liveSummary = await loadMarketplaceAuctionSummary();
  const smoke = {
    generatedAt: new Date().toISOString(),
    syntheticReady: {
      state: syntheticReady.state,
      activeCount: syntheticReady.activeCount,
      pendingCount: syntheticReady.pendingCount,
      hasVisibleAuctions: syntheticReady.hasVisibleAuctions,
      route: syntheticReady.primaryCtaRoute,
    },
    syntheticEmpty: {
      state: syntheticEmpty.state,
      activeCount: syntheticEmpty.activeCount,
      pendingCount: syntheticEmpty.pendingCount,
      hasVisibleAuctions: syntheticEmpty.hasVisibleAuctions,
      route: syntheticEmpty.primaryCtaRoute,
    },
    syntheticFailure: {
      state: syntheticFailure.state,
      message: syntheticFailure.message,
      route: syntheticFailure.primaryCtaRoute,
    },
    liveSummary,
    status:
      liveSummary.primaryCtaRoute === MARKET_AUCTIONS_ROUTE &&
      ["ready", "empty", "error", "degraded"].includes(liveSummary.state) &&
      syntheticReady.state === "ready" &&
      syntheticReady.activeCount === 2 &&
      syntheticReady.pendingCount === 1 &&
      syntheticReady.hasVisibleAuctions === true &&
      syntheticEmpty.state === "empty" &&
      syntheticEmpty.hasVisibleAuctions === false &&
      syntheticFailure.state === "error"
        ? "GREEN"
        : "NOT GREEN",
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    status:
      Object.values(contract.structural).every(Boolean) && smoke.status === "GREEN" ? "GREEN" : "NOT GREEN",
    liveState: liveSummary.state,
    liveActiveCount: liveSummary.activeCount,
    livePendingCount: liveSummary.pendingCount,
    liveRoute: liveSummary.primaryCtaRoute,
  };

  writeJson("artifacts/marketplace-auctions-contract.json", contract);
  writeJson("artifacts/marketplace-auctions-smoke.json", smoke);
  writeJson("artifacts/marketplace-auctions-integration-summary.json", summary);

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "GREEN") process.exitCode = 1;
}

void main();
