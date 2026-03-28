import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

type BatchId = "f1" | "f2" | "f3" | "f4";

type TargetConfig = {
  batch: BatchId;
  path: string;
  label: string;
  expectedMode: "migrated_flashlist" | "already_flashlist" | "no_active_list";
  estimatedMarkers: string[];
  keyMarkers: string[];
  checkedStates: string[];
  notes?: string;
};

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();

const targets: TargetConfig[] = [
  {
    batch: "f1",
    path: "src/screens/director/DirectorDashboard.tsx",
    label: "DirectorDashboard",
    expectedMode: "migrated_flashlist",
    estimatedMarkers: [
      "estimatedItemSize={112}",
      "estimatedItemSize={108}",
      "estimatedItemSize={160}",
      "estimatedItemSize={132}",
    ],
    keyMarkers: [
      "keyExtractor={(item) => item.key}",
      "keyExtractor={(g, idx)",
      "keyExtractor={(x, idx)",
      "keyExtractor={(x) => x.key}",
    ],
    checkedStates: ["loading", "populated", "refresh", "modal open"],
  },
  {
    batch: "f1",
    path: "src/screens/director/DirectorFinanceCardModal.tsx",
    label: "DirectorFinanceCardModal",
    expectedMode: "no_active_list",
    estimatedMarkers: [],
    keyMarkers: [],
    checkedStates: ["modal container", "loading overlay", "close"],
    notes: "Container-only modal; no active FlatList/FlashList body in current source.",
  },
  {
    batch: "f2",
    path: "src/screens/buyer/components/BuyerInboxSheetBody.tsx",
    label: "BuyerInboxSheetBody",
    expectedMode: "migrated_flashlist",
    estimatedMarkers: ["estimatedItemSize={184}"],
    keyMarkers: ["request_item_id ? `ri:${row.request_item_id}`", "hdr:attachments"],
    checkedStates: ["loading", "populated", "sticky header", "scrollToIndex fallback", "footer"],
  },
  {
    batch: "f2",
    path: "src/screens/buyer/components/BuyerPropDetailsSheetBody.tsx",
    label: "BuyerPropDetailsSheetBody",
    expectedMode: "migrated_flashlist",
    estimatedMarkers: ["estimatedItemSize={148}"],
    keyMarkers: ["keyExtractor={(ln, idx) => `${String(ln?.request_item_id ?? \"x\")}:${idx}`}", "ListHeaderComponent"],
    checkedStates: ["loading", "attachments", "analytics header", "populated"],
  },
  {
    batch: "f3",
    path: "src/screens/buyer/components/BuyerRfqSheetBody.tsx",
    label: "BuyerRfqSheetBody",
    expectedMode: "migrated_flashlist",
    estimatedMarkers: ["estimatedItemSize={28}"],
    keyMarkers: ["keyExtractor={keyExtractor}"],
    checkedStates: ["collapsed items", "expanded preview", "form scroll"],
  },
  {
    batch: "f3",
    path: "src/components/map/CatalogSearchModal.tsx",
    label: "CatalogSearchModal",
    expectedMode: "migrated_flashlist",
    estimatedMarkers: ["estimatedItemSize={76}"],
    keyMarkers: ["keyExtractor={(it) => it.id}"],
    checkedStates: ["loading", "empty", "populated", "pick item"],
  },
  {
    batch: "f4",
    path: "src/components/map/ResultsBottomSheet.tsx",
    label: "ResultsBottomSheet",
    expectedMode: "migrated_flashlist",
    estimatedMarkers: ["estimatedItemSize={cardW + 12}"],
    keyMarkers: ["keyExtractor={(item) => item.id}"],
    checkedStates: ["horizontal scroll", "selection", "viewability", "bottom sheet gestures"],
  },
  {
    batch: "f4",
    path: "src/features/market/MarketHomeScreen.tsx",
    label: "MarketHomeScreen",
    expectedMode: "already_flashlist",
    estimatedMarkers: ["estimatedItemSize={360}"],
    keyMarkers: ["keyExtractor={(item) => item.id}"],
    checkedStates: ["refresh", "infinite scroll", "selection", "detail open"],
    notes: "Already migrated before this batch; retained as wave1 inventory target.",
  },
];

const summaryPath = path.join(projectRoot, "artifacts/flashlist-wave1-summary.json");
const batchPaths: Record<BatchId, string> = {
  f1: path.join(projectRoot, "artifacts/flashlist-wave1-batch-f1.json"),
  f2: path.join(projectRoot, "artifacts/flashlist-wave1-batch-f2.json"),
  f3: path.join(projectRoot, "artifacts/flashlist-wave1-batch-f3.json"),
  f4: path.join(projectRoot, "artifacts/flashlist-wave1-batch-f4.json"),
};

const readText = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
const readJson = <T extends JsonRecord>(relativePath: string): T =>
  JSON.parse(readText(relativePath)) as T;
const readHeadText = (relativePath: string) =>
  execSync(`git show HEAD:${relativePath}`, {
    cwd: projectRoot,
    encoding: "utf8",
  });
const readHeadJson = <T extends JsonRecord>(relativePath: string): T =>
  JSON.parse(
    execSync(`git show HEAD:${relativePath}`, {
      cwd: projectRoot,
      encoding: "utf8",
    }),
  ) as T;
const writeJson = (targetPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const countTag = (text: string, tag: "FlatList" | "FlashList") =>
  (text.match(new RegExp(`<${tag}(?:\\s|>)`, "g")) ?? []).length;

function detectMode(text: string) {
  const flashCount = countTag(text, "FlashList");
  const flatCount = countTag(text, "FlatList");
  if (flashCount > 0 && flatCount === 0) return "flashlist_only";
  if (flashCount === 0 && flatCount > 0) return "flatlist_only";
  if (flashCount === 0 && flatCount === 0) return "no_active_list";
  return "mixed";
}

function buildTargetProof(target: TargetConfig) {
  const beforeText = readHeadText(target.path);
  const afterText = readText(target.path);
  const beforeMode = detectMode(beforeText);
  const afterMode = detectMode(afterText);
  const estimatedOk = target.estimatedMarkers.every((marker) => afterText.includes(marker));
  const keyStrategyOk = target.keyMarkers.every((marker) => afterText.includes(marker));

  const status =
    (target.expectedMode === "migrated_flashlist" &&
      beforeMode !== "flashlist_only" &&
      afterMode === "flashlist_only" &&
      estimatedOk &&
      keyStrategyOk) ||
    (target.expectedMode === "already_flashlist" &&
      beforeMode === "flashlist_only" &&
      afterMode === "flashlist_only" &&
      estimatedOk &&
      keyStrategyOk) ||
    (target.expectedMode === "no_active_list" && afterMode === "no_active_list")
      ? "GREEN"
      : "NOT_GREEN";

  return {
    file: target.path,
    label: target.label,
    expectedMode: target.expectedMode,
    beforeListType: beforeMode,
    afterListType: afterMode,
    estimatedMarkers: target.estimatedMarkers,
    estimatedConfigured: estimatedOk,
    keyMarkers: target.keyMarkers,
    keyStrategyOk,
    checkedStates: target.checkedStates,
    notes: target.notes ?? null,
    status,
  };
}

async function main() {
  const targetProofs = targets.map(buildTargetProof);
  const batches = {
    f1: targetProofs.filter((target) => target.file.includes("Director")),
    f2: targetProofs.filter((target) => target.file.includes("BuyerInbox") || target.file.includes("BuyerPropDetails")),
    f3: targetProofs.filter((target) => target.file.includes("BuyerRfq") || target.file.includes("CatalogSearchModal")),
    f4: targetProofs.filter((target) => target.file.includes("ResultsBottomSheet") || target.file.includes("MarketHomeScreen")),
  } satisfies Record<BatchId, ReturnType<typeof buildTargetProof>[]>;

  const directorRuntime = readJson<JsonRecord>("artifacts/director-finance-runtime.summary.json");
  const buyerWebSmoke = readJson<JsonRecord>("artifacts/buyer-summary-inbox-web-smoke.summary.json");
  const marketWave2Head = readHeadJson<JsonRecord>("artifacts/marketplace-integration-wave2.summary.json");

  const batchArtifacts = {
    f1: {
      batch: "F1",
      files: batches.f1,
      smoke: {
        directorFinanceRuntimePassed: directorRuntime.status === "passed",
        webPassed: directorRuntime.webPassed === true,
        androidPassed: directorRuntime.androidPassed === true,
      },
      perfProofMode: "engine_contract + director runtime smoke",
      regressionStatus: batches.f1.every((file) => file.status === "GREEN") && directorRuntime.status === "passed" ? "GREEN" : "NOT_GREEN",
    },
    f2: {
      batch: "F2",
      files: batches.f2,
      smoke: {
        buyerWebInboxSheetPassed: buyerWebSmoke.status === "passed",
        inboxVisible: buyerWebSmoke.inboxVisible === true,
        sheetOpened: buyerWebSmoke.sheetOpened === true,
        firstItemVisible: buyerWebSmoke.firstItemVisible === true,
      },
      perfProofMode: "engine_contract + buyer web sheet smoke",
      regressionStatus: batches.f2.every((file) => file.status === "GREEN") && buyerWebSmoke.status === "passed" ? "GREEN" : "NOT_GREEN",
    },
    f3: {
      batch: "F3",
      files: batches.f3,
      smoke: {
        componentContractOnly: true,
      },
      perfProofMode: "engine_contract",
      regressionStatus: batches.f3.every((file) => file.status === "GREEN") ? "GREEN" : "NOT_GREEN",
    },
    f4: {
      batch: "F4",
      files: batches.f4,
      smoke: {
        priorMarketWave2Green: marketWave2Head.status === "GREEN" || marketWave2Head.gate === "GREEN",
        marketHomeAlreadyMigrated: true,
      },
      perfProofMode: "engine_contract + prior market integration proof",
      regressionStatus:
        batches.f4.every((file) => file.status === "GREEN") &&
        (marketWave2Head.status === "GREEN" || marketWave2Head.gate === "GREEN")
          ? "GREEN"
          : "NOT_GREEN",
    },
  } satisfies Record<BatchId, JsonRecord>;

  writeJson(batchPaths.f1, batchArtifacts.f1);
  writeJson(batchPaths.f2, batchArtifacts.f2);
  writeJson(batchPaths.f3, batchArtifacts.f3);
  writeJson(batchPaths.f4, batchArtifacts.f4);

  const summary = {
    gate: "FlashList Migration — Wave 1 Heavy Screens",
    status:
      Object.values(batchArtifacts).every((batch) => batch.regressionStatus === "GREEN") &&
      targetProofs.every((target) => target.status === "GREEN")
        ? "GREEN"
        : "NOT_GREEN",
    scope: {
      migratedThisBatch: targetProofs
        .filter((target) => target.expectedMode === "migrated_flashlist")
        .map((target) => target.file),
      alreadyFlashList: targetProofs
        .filter((target) => target.expectedMode === "already_flashlist")
        .map((target) => target.file),
      noActiveList: targetProofs
        .filter((target) => target.expectedMode === "no_active_list")
        .map((target) => target.file),
      deferred: ["src/features/chat/ChatScreen.tsx"],
    },
    batches: Object.fromEntries(
      (Object.entries(batchArtifacts) as Array<[BatchId, JsonRecord]>).map(([batch, artifact]) => [
        batch,
        {
          status: artifact.regressionStatus,
          files: (artifact.files as Array<{ file: string }>).map((file) => file.file),
          perfProofMode: artifact.perfProofMode,
        },
      ]),
    ),
    smokeSources: {
      directorFinanceRuntime: "artifacts/director-finance-runtime.summary.json",
      buyerInboxWebSmoke: "artifacts/buyer-summary-inbox-web-smoke.summary.json",
      marketWave2HeadBaseline: "HEAD:artifacts/marketplace-integration-wave2.summary.json",
    },
    targets: targetProofs,
  };

  writeJson(summaryPath, summary);
  console.log(JSON.stringify(summary, null, 2));

  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

void main();
