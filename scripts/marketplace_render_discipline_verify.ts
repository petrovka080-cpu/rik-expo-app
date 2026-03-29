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

const runRipgrep = (pattern: string) => {
  try {
    return execFileSync(
      "rg",
      ["-n", pattern, "src", "-g", "*.ts", "-g", "*.tsx"],
      {
        cwd: projectRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
  } catch {
    return "";
  }
};

const buildListMetrics = (text: string) => ({
  importsFlashList: text.includes('import { FlashList }'),
  importsFlatList: text.includes("FlatList,") || text.includes(" FlatList ") || text.includes("import { FlatList"),
  usesFlashList: text.includes("<FlashList"),
  usesFlatList: text.includes("<FlatList"),
  hasEstimatedItemSize: text.includes("estimatedItemSize={"),
  hasDrawDistance: text.includes("drawDistance={"),
  hasItemType: text.includes("getItemType={() =>"),
});

const extractStoreFields = (text: string): string[] => {
  const match = text.match(/export type MarketUiStore = \{([\s\S]*?)\n\};/);
  if (!match) return [];
  const body = match[1];
  const fields = Array.from(body.matchAll(/^\s+([A-Za-z0-9_]+):/gm)).map((entry) => entry[1]);
  return Array.from(new Set(fields));
};

async function main() {
  const { loadAuctionSummaries } = await import("../src/features/auctions/auctions.data");
  const admin = createVerifierAdmin("marketplace-render-discipline-verify");

  const auctionsPath = "src/features/auctions/AuctionsScreen.tsx";
  const showcasePath = "src/features/supplierShowcase/SupplierShowcaseScreen.tsx";
  const storePath = "src/features/market/marketUi.store.ts";

  const beforeAuctions = buildListMetrics(readHeadVersion(auctionsPath));
  const beforeShowcase = buildListMetrics(readHeadVersion(showcasePath));
  const afterAuctions = buildListMetrics(readText(auctionsPath));
  const afterShowcase = buildListMetrics(readText(showcasePath));
  const storeText = readText(storePath);

  const activeAuctions = await loadAuctionSummaries("active");
  const closedAuctions = await loadAuctionSummaries("closed");
  const listingResult = await admin
    .from("market_listings")
    .select("id,user_id,company_id,status,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (listingResult.error) throw listingResult.error;

  const listings = Array.isArray(listingResult.data) ? listingResult.data : [];
  const listingCountByOwner = new Map<string, number>();
  listings.forEach((row) => {
    const ownerKey = String(row.company_id ?? row.user_id ?? "").trim();
    if (!ownerKey) return;
    listingCountByOwner.set(ownerKey, (listingCountByOwner.get(ownerKey) ?? 0) + 1);
  });
  const heaviestOwnerCount = Array.from(listingCountByOwner.values()).sort((left, right) => right - left)[0] ?? 0;

  const consumerHits = runRipgrep("useMarketUiStore|marketUi\\.store");
  const consumerFiles = Array.from(
    new Set(
      consumerHits
        .split(/\r?\n/)
        .map((line) => line.split(":")[0]?.trim().replace(/\\/g, "/"))
        .filter(Boolean)
        .filter((file) => !file.endsWith("marketUi.store.ts")),
    ),
  );

  const storeFields = extractStoreFields(storeText);
  const forbiddenTruthFields = ["listings", "rows", "payload", "summary", "data", "cards", "auctionsSummary"];
  const presentForbiddenFields = forbiddenTruthFields.filter((field) => storeFields.includes(field));

  const flashlistWave = {
    generatedAt: new Date().toISOString(),
    targetFiles: {
      auctions: {
        file: auctionsPath,
        before: beforeAuctions,
        after: afterAuctions,
      },
      supplierShowcase: {
        file: showcasePath,
        before: beforeShowcase,
        after: afterShowcase,
      },
    },
    status:
      beforeAuctions.usesFlatList &&
      beforeShowcase.usesFlatList &&
      afterAuctions.usesFlashList &&
      afterShowcase.usesFlashList &&
      afterAuctions.hasEstimatedItemSize &&
      afterShowcase.hasEstimatedItemSize &&
      afterAuctions.hasItemType &&
      afterShowcase.hasItemType
        ? "GREEN"
        : "NOT GREEN",
  };

  const storeBoundary = {
    generatedAt: new Date().toISOString(),
    storeFile: storePath,
    storeFields,
    uiOnlyCommentPresent: storeText.includes("UI-only orchestration store"),
    forbiddenTruthFields,
    presentForbiddenFields,
    consumerFiles,
    status:
      presentForbiddenFields.length === 0 &&
      consumerFiles.length === 1 &&
      consumerFiles[0] === "src/features/market/MarketHomeScreen.tsx"
        ? "GREEN"
        : "NOT GREEN",
  };

  const renderProof = {
    generatedAt: new Date().toISOString(),
    heavySections: [
      {
        screen: auctionsPath,
        activeRows: activeAuctions.length,
        closedRows: closedAuctions.length,
        renderDiscipline: afterAuctions.usesFlashList ? "flashlist" : "flatlist",
      },
      {
        screen: showcasePath,
        sampledListingRows: listings.length,
        heaviestOwnerCount,
        renderDiscipline: afterShowcase.usesFlashList ? "flashlist" : "flatlist",
      },
      {
        screen: "src/features/market/MarketHomeScreen.tsx",
        renderDiscipline: "flashlist",
        storeBoundary: storeBoundary.status,
      },
    ],
    status:
      flashlistWave.status === "GREEN" &&
      storeBoundary.status === "GREEN" &&
      afterAuctions.hasDrawDistance &&
      afterShowcase.hasDrawDistance
        ? "GREEN"
        : "NOT GREEN",
  };

  writeJson("artifacts/marketplace-flashlist-wave1.json", flashlistWave);
  writeJson("artifacts/marketplace-store-boundary-summary.json", storeBoundary);
  writeJson("artifacts/marketplace-render-proof.json", renderProof);

  console.log(JSON.stringify(renderProof, null, 2));
  if (renderProof.status !== "GREEN") process.exitCode = 1;
}

void main();
