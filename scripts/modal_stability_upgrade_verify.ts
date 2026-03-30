import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const summaryOutPath = path.join(projectRoot, "artifacts/modal-stability-upgrade-summary.json");
const smokeOutPath = path.join(projectRoot, "artifacts/modal-regression-smoke.json");

const readJson = (relativePath: string): JsonRecord | null => {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as JsonRecord;
};

const readText = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const isPrerelease = (value: string) => /-(?:alpha|beta|rc|next)\.?/i.test(value);

const getNestedRecord = (value: unknown): JsonRecord | null => {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
};

const getBooleanField = (value: unknown, field: string) => {
  const record = getNestedRecord(value);
  return record?.[field] === true;
};

const hasScenarioPassed = (artifact: JsonRecord | null, scenarioName: string) =>
  Array.isArray(artifact?.scenarios) &&
  (artifact?.scenarios as Array<Record<string, unknown>>).some(
    (scenario) => scenario.name === scenarioName && scenario.passed === true,
  );

const hasPassedTestFile = (artifact: JsonRecord | null, fileSuffix: string) =>
  Array.isArray(artifact?.testResults) &&
  (artifact?.testResults as Array<Record<string, unknown>>).some(
    (entry) =>
      String(entry.name ?? "").replace(/\\/g, "/").endsWith(fileSuffix) &&
      entry.status === "passed",
  );

const getPreviousPackageJson = (): JsonRecord | null => {
  try {
    const output = execSync("git show HEAD:package.json", {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    return JSON.parse(output) as JsonRecord;
  } catch {
    return null;
  }
};

const currentPackageJson = JSON.parse(readText("package.json")) as JsonRecord;
const previousPackageJson = getPreviousPackageJson();
const currentDeps = (currentPackageJson.dependencies ?? {}) as Record<string, string>;
const previousDeps = ((previousPackageJson?.dependencies ?? {}) as Record<string, string>) ?? {};

const beforeVersion = String(previousDeps["react-native-modal"] ?? "");
const afterVersion = String(currentDeps["react-native-modal"] ?? "");
const normalizedAfterVersion = afterVersion.replace(/^[~^]/, "");
const normalizedBeforeVersion = beforeVersion.replace(/^[~^]/, "");

const modalUsage = [
  "src/screens/foreman/ForemanDraftModal.tsx",
  "src/screens/foreman/ForemanHistoryModal.tsx",
  "src/screens/foreman/ForemanSubcontractHistoryModal.tsx",
  "src/screens/warehouse/components/WarehouseSheet.tsx",
  "src/screens/warehouse/components/ReqIssueModal.tsx",
  "src/screens/warehouse/components/PickOptionSheet.tsx",
];

const modalSourceChecks = modalUsage.map((relativePath) => {
  const source = readText(relativePath);
  return {
    relativePath,
    importsRnModal: source.includes('from "react-native-modal"'),
    hasNoTimerHack: !/setTimeout\s*\(|sleep\s*\(/.test(source),
    hasBackdropHandler: /onBackdropPress=/.test(source),
    hasBackButtonHandler: /onBackButtonPress=/.test(source),
  };
});

const accountantSmoke = readJson("artifacts/accountant-payment-form-smoke.json");
const modalRoleJest = readJson("artifacts/modal-role-regression-jest.json");

const foremanChecks = {
  contractTestPassed: hasPassedTestFile(
    modalRoleJest,
    "src/screens/foreman/ForemanModal.stability.test.tsx",
  ),
};

const buyerChecks = {
  contractTestPassed: hasPassedTestFile(
    modalRoleJest,
    "src/screens/buyer/components/BuyerSheetShell.test.tsx",
  ),
};

const accountantChecks = {
  contractTestPassed: hasPassedTestFile(
    modalRoleJest,
    "src/screens/accountant/components/CardModal.test.tsx",
  ),
  openLoadReady:
    hasScenarioPassed(accountantSmoke, "open_load_ready"),
  closeImmediately: hasScenarioPassed(accountantSmoke, "close_immediately_no_stale_set_state"),
};

const directorChecks = {
  financeContractTestPassed: hasPassedTestFile(
    modalRoleJest,
    "src/screens/director/DirectorFinanceCardModal.test.tsx",
  ),
};

const modalContractChecks = {
  foreman: foremanChecks.contractTestPassed,
  buyer: buyerChecks.contractTestPassed,
  accountant: accountantChecks.contractTestPassed,
  director: directorChecks.financeContractTestPassed,
  warehouse: hasPassedTestFile(modalRoleJest, "src/screens/warehouse/components/WarehouseSheet.test.tsx"),
  jestSuccess:
    modalRoleJest?.success === true &&
    Number(modalRoleJest?.numFailedTests ?? 0) === 0,
};

const allModalSourceChecksOk = modalSourceChecks.every(
  (entry) =>
    entry.importsRnModal &&
    entry.hasNoTimerHack &&
    entry.hasBackdropHandler &&
    entry.hasBackButtonHandler,
);

const versionGateOk =
  Boolean(afterVersion) &&
  !isPrerelease(normalizedAfterVersion) &&
  Boolean(beforeVersion) &&
  isPrerelease(normalizedBeforeVersion);

const smokeGateOk =
  modalContractChecks.foreman &&
  modalContractChecks.buyer &&
  accountantChecks.contractTestPassed &&
  accountantChecks.openLoadReady &&
  accountantChecks.closeImmediately &&
  directorChecks.financeContractTestPassed &&
  modalContractChecks.warehouse &&
  modalContractChecks.jestSuccess;

const status = versionGateOk && allModalSourceChecksOk && smokeGateOk ? "passed" : "failed";

const summary = {
  status,
  gate: status === "passed" ? "GREEN" : "NOT_GREEN",
  generatedAt: new Date().toISOString(),
  dependency: {
    name: "react-native-modal",
    beforeVersion,
    afterVersion,
    rcRemoved: versionGateOk,
  },
  modalSourceChecks,
  flowChecks: {
    foreman: foremanChecks,
    buyer: buyerChecks,
    accountant: accountantChecks,
    director: directorChecks,
  },
  modalContractChecks,
};

const smoke = {
  status,
  gate: summary.gate,
  flows: {
    modalRoleJest,
    accountant: accountantSmoke,
  },
};

writeJson(summaryOutPath, summary);
writeJson(smokeOutPath, smoke);

if (status !== "passed") {
  throw new Error("modal stability upgrade verify failed");
}
