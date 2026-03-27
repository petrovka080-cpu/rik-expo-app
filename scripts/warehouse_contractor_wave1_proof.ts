import fs from "node:fs/promises";

type ProofResult = {
  warehouse: {
    store_present: boolean;
    store_adopted: boolean;
    flashlist_migrated: boolean;
    timer_debt_removed: boolean;
    residual_flatlist_files: string[];
    residual_timer_files: string[];
  };
  contractor: {
    store_present: boolean;
    store_adopted: boolean;
    flashlist_migrated: boolean;
    timer_debt_removed: boolean;
    ui_as_any_removed: boolean;
    residual_flatlist_files: string[];
    residual_timer_files: string[];
  };
};

const ARTIFACT_BASE = "artifacts/warehouse-contractor-wave1-proof";

const warehouseStoreFile = "src/screens/warehouse/warehouseUi.store.ts";
const contractorStoreFile = "src/screens/contractor/contractorUi.store.ts";

const warehouseStoreConsumers = [
  "src/screens/warehouse/hooks/useWarehouseScreenData.ts",
  "src/screens/warehouse/hooks/useWarehouseModals.ts",
  "src/screens/warehouse/warehouse.scope.ts",
  "src/screens/warehouse/warehouse.recipient.ts",
  "src/screens/warehouse/hooks/useWarehouseIncomingItemsModal.ts",
  "src/screens/warehouse/hooks/useWarehousemanFio.ts",
];

const contractorStoreConsumers = [
  "src/screens/contractor/hooks/useContractorScreenState.ts",
];

const warehouseListFiles = [
  "src/screens/warehouse/components/WarehouseStockTab.tsx",
  "src/screens/warehouse/components/WarehouseIssueTab.tsx",
  "src/screens/warehouse/components/WarehouseIncomingTab.tsx",
  "src/screens/warehouse/components/WarehouseReportsTab.tsx",
  "src/screens/warehouse/components/ReqIssueModal.tsx",
  "src/screens/warehouse/components/IncomingItemsSheet.tsx",
  "src/screens/warehouse/components/IncomingDetailsSheet.tsx",
  "src/screens/warehouse/components/IssueDetailsSheet.tsx",
  "src/screens/warehouse/components/PickOptionSheet.tsx",
  "src/screens/warehouse/components/WarehouseRecipientModal.tsx",
];

const contractorListFiles = [
  "src/screens/contractor/components/ContractorSubcontractsList.tsx",
  "src/screens/contractor/components/ContractorOtherWorksList.tsx",
  "src/screens/contractor/components/ActBuilderModal.tsx",
  "src/screens/contractor/components/EstimateMaterialsModal.tsx",
  "src/screens/contractor/components/WorkStagePickerModal.tsx",
];

const warehouseTimerFiles = [
  "src/screens/warehouse/hooks/useWarehouseExpenseRealtime.ts",
  "src/screens/warehouse/hooks/useDebouncedValue.ts",
  "src/screens/warehouse/warehouse.incoming.repo.ts",
  "src/screens/warehouse/warehouse.utils.ts",
];

const contractorTimerFiles = [
  "src/screens/contractor/contractor.workSearchController.ts",
  "src/screens/contractor/contractor.issuedRefreshLifecycle.ts",
  "src/screens/contractor/contractor.utils.ts",
];

async function readFile(path: string) {
  return await fs.readFile(path, "utf8");
}

async function fileContains(path: string, text: string) {
  return (await readFile(path)).includes(text);
}

async function allContain(paths: string[], text: string) {
  const values = await Promise.all(paths.map((path) => fileContains(path, text)));
  return values.every(Boolean);
}

async function findResidual(paths: string[], pattern: string) {
  const matches = await Promise.all(
    paths.map(async (path) => {
      const contents = await readFile(path);
      return contents.includes(pattern) ? path : null;
    }),
  );
  return matches.filter((path): path is string => Boolean(path));
}

async function verifyFlashList(paths: string[]) {
  const values = await Promise.all(
    paths.map(async (path) => {
      const contents = await readFile(path);
      return contents.includes("FlashList") && !contents.includes("FlatList");
    }),
  );
  return values.every(Boolean);
}

async function main() {
  const warehouseResidualFlatList = await findResidual(warehouseListFiles, "FlatList");
  const contractorResidualFlatList = await findResidual(contractorListFiles, "FlatList");
  const warehouseResidualTimer = [
    ...(await findResidual(warehouseTimerFiles, "setTimeout(")),
    ...(await findResidual(warehouseTimerFiles, "setInterval(")),
  ];
  const contractorResidualTimer = [
    ...(await findResidual(contractorTimerFiles, "setTimeout(")),
    ...(await findResidual(contractorTimerFiles, "setInterval(")),
  ];

  const result: ProofResult = {
    warehouse: {
      store_present: await fileContains(warehouseStoreFile, "useWarehouseUiStore"),
      store_adopted: await allContain(warehouseStoreConsumers, "useWarehouseUiStore"),
      flashlist_migrated: await verifyFlashList(warehouseListFiles),
      timer_debt_removed: warehouseResidualTimer.length === 0,
      residual_flatlist_files: warehouseResidualFlatList,
      residual_timer_files: warehouseResidualTimer,
    },
    contractor: {
      store_present: await fileContains(contractorStoreFile, "useContractorUiStore"),
      store_adopted: await allContain(contractorStoreConsumers, "useContractorUiStore"),
      flashlist_migrated: await verifyFlashList(contractorListFiles),
      timer_debt_removed: contractorResidualTimer.length === 0,
      ui_as_any_removed: !(await fileContains("src/screens/contractor/hooks/useContractorActBuilderOpen.ts", "as any")),
      residual_flatlist_files: contractorResidualFlatList,
      residual_timer_files: contractorResidualTimer,
    },
  };

  const summary = {
    status:
      result.warehouse.store_present &&
      result.warehouse.store_adopted &&
      result.warehouse.flashlist_migrated &&
      result.warehouse.timer_debt_removed &&
      result.contractor.store_present &&
      result.contractor.store_adopted &&
      result.contractor.flashlist_migrated &&
      result.contractor.timer_debt_removed &&
      result.contractor.ui_as_any_removed
        ? "passed"
        : "failed",
    ...result,
  };

  await fs.writeFile(`${ARTIFACT_BASE}.json`, JSON.stringify(result, null, 2));
  await fs.writeFile(`${ARTIFACT_BASE}.summary.json`, JSON.stringify(summary, null, 2));

  console.log(JSON.stringify(summary, null, 2));
}

void main();
