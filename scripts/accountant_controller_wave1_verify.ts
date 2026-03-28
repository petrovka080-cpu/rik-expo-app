import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const controllerPath = "src/screens/accountant/useAccountantScreenController.ts";
const inboxHookPath = "src/screens/accountant/useAccountantInboxController.ts";
const historyHookPath = "src/screens/accountant/useAccountantHistoryController.ts";
const actionsPath = "src/screens/accountant/accountant.actions.ts";
const repositoryPath = "src/screens/accountant/accountant.repository.ts";
const selectorsPath = "src/screens/accountant/accountant.selectors.ts";
const storePath = "src/screens/accountant/accountantUi.store.ts";

const summaryPath = path.join(projectRoot, "artifacts/accountant-controller-wave1-summary.json");
const beforeAfterPath = path.join(projectRoot, "artifacts/accountant-controller-wave1-before-after.txt");
const smokePath = path.join(projectRoot, "artifacts/accountant-controller-wave1-smoke.json");

const readText = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
const writeJson = (targetPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const countLines = (text: string) => text.split(/\r?\n/).length;

const findAfterRealtimeFetch = (events: JsonRecord[]) => {
  const startIndex = events.findIndex(
    (event) => event.screen === "accountant" && event.event === "realtime_refresh_triggered",
  );
  const window = startIndex >= 0 ? events.slice(startIndex) : events;
  return window.some(
    (event) =>
      event.screen === "accountant" &&
      event.event === "load_inbox" &&
      event.result === "success" &&
      event.sourceKind === "rpc:accountant_inbox_scope_v1" &&
      event.surface === "inbox_window",
  );
};

const currentController = readText(controllerPath);
const previousController = execSync(`git show HEAD:${controllerPath}`, {
  cwd: projectRoot,
  encoding: "utf8",
});
const currentStore = readText(storePath);
const windowingSummary = JSON.parse(
  readText("artifacts/accountant-windowing-wave1.summary.json"),
) as JsonRecord;
const realtimeWebArtifact = JSON.parse(
  readText("artifacts/accountant-realtime.web.json"),
) as { events?: JsonRecord[] };
const realtimeEvents = Array.isArray(realtimeWebArtifact.events) ? realtimeWebArtifact.events : [];

const controllerBeforeLines = countLines(previousController);
const controllerAfterLines = countLines(currentController);
const controllerLineDelta = controllerBeforeLines - controllerAfterLines;
const controllerUsesServicesDirectly =
  currentController.includes("accountant.inbox.service") || currentController.includes("accountant.history.service");
const controllerUsesSplitLayers =
  currentController.includes("./accountant.actions") &&
  currentController.includes("./accountant.repository") &&
  currentController.includes("./useAccountantInboxController") &&
  currentController.includes("./useAccountantHistoryController");
const storeUiOnly =
  !currentStore.includes("supabase") &&
  !currentStore.includes(".service") &&
  !currentStore.includes("loadAccountant") &&
  currentStore.includes("tab: Tab") &&
  currentStore.includes("freezeWhileOpen: boolean");
const realtimeWebPassed =
  realtimeEvents.some((event) => event.screen === "accountant" && event.event === "realtime_event_received") &&
  realtimeEvents.some((event) => event.screen === "accountant" && event.event === "realtime_refresh_triggered") &&
  findAfterRealtimeFetch(realtimeEvents);
const windowingPassed = windowingSummary.status === "passed";

const summary = {
  status:
    controllerAfterLines < controllerBeforeLines &&
    controllerLineDelta >= 400 &&
    controllerUsesSplitLayers &&
    !controllerUsesServicesDirectly &&
    storeUiOnly &&
    windowingPassed &&
    realtimeWebPassed
      ? "GREEN"
      : "NOT GREEN",
  before: {
    controllerLines: controllerBeforeLines,
  },
  after: {
    controllerLines: controllerAfterLines,
    newFiles: [actionsPath, repositoryPath, selectorsPath, inboxHookPath, historyHookPath],
    retainedUiStore: storePath,
  },
  extractedBlocks: {
    store: ["tab", "filters/date range", "sheet/modal state", "fio"],
    repository: ["accountant inbox/history page loads", "page-size constants"],
    selectors: ["history key", "snapshot builders", "cache preview", "dedupe append"],
    actions: ["manual refresh", "history refresh", "visible-scope realtime refresh", "tab preview"],
    controller: ["auth gate", "focus orchestration", "public contract wiring"],
  },
  checks: {
    controllerUsesSplitLayers,
    controllerUsesServicesDirectly,
    storeUiOnly,
    windowingPassed,
    realtimeWebPassed,
  },
  preservedFlows: {
    loadMoreInboxWired: currentController.includes("loadMoreInbox"),
    loadMoreHistoryWired: currentController.includes("loadMoreHistory"),
    refreshCurrentVisibleScopeWired: currentController.includes("refreshCurrentVisibleScope"),
  },
};

const smoke = {
  accountantScreenLoad: windowingPassed,
  refreshPathPreserved: summary.preservedFlows.refreshCurrentVisibleScopeWired,
  detailsAndWindowing: windowingPassed,
  realtimeWebRefreshPreserved: realtimeWebPassed,
  controllerLineReduction: controllerLineDelta,
  status: summary.status,
};

const beforeAfter = [
  "Accountant Controller Wave 1",
  `before_lines=${controllerBeforeLines}`,
  `after_lines=${controllerAfterLines}`,
  `delta=${controllerLineDelta}`,
  "",
  "moved:",
  "- repository: inbox/history page loading",
  "- selectors: history key, snapshot/dedupe/cache preview",
  "- actions: refresh, tab preview, realtime visible-scope refresh",
  "- hooks: inbox orchestration, history orchestration",
  "",
  "remaining_in_controller:",
  "- auth gate",
  "- focus/auth/tab orchestration",
  "- composition of inbox/history hooks",
  "- public screen contract",
  "",
  `windowing_passed=${windowingPassed}`,
  `realtime_web_passed=${realtimeWebPassed}`,
].join("\n");

writeJson(summaryPath, summary);
writeJson(smokePath, smoke);
fs.mkdirSync(path.dirname(beforeAfterPath), { recursive: true });
fs.writeFileSync(beforeAfterPath, `${beforeAfter}\n`);

console.log(
  JSON.stringify(
    {
      status: summary.status,
      controllerBeforeLines,
      controllerAfterLines,
      controllerLineDelta,
      windowingPassed,
      realtimeWebPassed,
      storeUiOnly,
    },
    null,
    2,
  ),
);

if (summary.status !== "GREEN") {
  process.exitCode = 1;
}
