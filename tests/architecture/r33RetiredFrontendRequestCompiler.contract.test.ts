import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath: string) => fs.existsSync(path.join(root, relativePath));

const retiredFixture = "src/features/consumerRepair/requestEstimateLegacyTestActions.ts";
const retiredOrphanSuites = [
  "src/features/consumerRepair/consumerRepairAsphaltV4Phase1B.test.ts",
  "tests/aiEstimateV4/asphaltRelatedDemolitionD0D5.contract.test.ts",
  "tests/aiEstimateV4/roadFullRevisionDurableFailureRecoveryV4.contract.test.ts",
  "tests/aiEstimateV4/roadScopeConcurrencyV4.contract.test.ts",
  "tests/aiEstimateV4/roadScopeProductionIntegrationV4.contract.test.ts",
  "tests/performance/asphaltPdfPerformance.contract.test.ts",
  "tests/requestEstimate/asphalt35WebAndroidVisibleOutput.contract.test.ts",
  "tests/requestEstimate/canonicalElectricalParameterCore.contract.test.ts",
  "tests/requestEstimate/canonicalElectricalPerformance.contract.test.ts",
  "tests/requestEstimate/electricalNativeColdRestart.contract.test.ts",
  "tests/requestEstimate/electricalProductionRuntimeTruth.contract.test.ts",
  "tests/requestEstimate/electricalRevisionProjectionParity.contract.test.ts",
  "tests/requestEstimate/requestAutoPrepareSourceBackedStructuredEstimate.contract.test.ts",
  "tests/requestEstimate/structuredEstimateLegacySessionDoesNotBlockUi.contract.test.tsx",
] as const;

const canonicalSuccessorContracts = [
  "tests/estimateBackend/canonicalBackendR3.contract.test.ts",
  "tests/consumerRepair/platformCoreV2ConsumerFlow.contract.test.ts",
  "tests/consumerRepair/canonicalBackendArtifactParity.contract.test.ts",
  "tests/aiEstimateV4/asphalt35TypedBoq.contract.test.ts",
  "tests/aiEstimateV4/asphaltRevisionArtifactIdentityV5.contract.test.ts",
  "tests/estimateDomainFactory/electricalComplete.contract.test.ts",
  "tests/requestEstimate/canonicalElectricalParameterEditorUi.contract.test.tsx",
  "tests/requestEstimate/platformCoreV2RequestFlow.contract.test.tsx",
  "tests/officeEstimate/platformCoreV2PdfBuyerFlow.contract.test.ts",
] as const;

describe("R3.3 retired frontend request compiler", () => {
  it("removes the throwing compatibility fixture and every orphan suite that invoked it", () => {
    expect(exists(retiredFixture)).toBe(false);
    expect(retiredOrphanSuites.filter(exists)).toEqual([]);
  });

  it("keeps baseline compilation on the authenticated canonical backend client", () => {
    const container = read("src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx");
    const baseline = read("src/features/consumerRepair/consumerCanonicalBaselineCompile.ts");
    expect(container).toContain("compileConsumerCanonicalBaseline");
    expect(baseline).toContain("compileCanonicalEstimateAndLoad");
    expect(baseline).toContain("getCanonicalEstimateCatalogItem");
    expect(baseline).toContain("deliberately backend-only");
    expect(baseline).not.toContain("buildConsumerRepairSelectedWorkDraftBundle");
  });

  it("fails closed instead of compiling or recalculating a legacy request locally", () => {
    const service = read("src/lib/consumerRequests/consumerRequestService.ts");
    expect(service).toContain('canonicalBackendRequired("legacy_consumer_request_compile")');
    expect(service).toContain('canonicalBackendRequired("legacy_road_scope_compile")');
    expect(service).not.toContain("requestEstimateLegacyTestActions");
  });

  it("retains executable successors for compile, revision, UI, PDF, procurement and domain coverage", () => {
    expect(canonicalSuccessorContracts.filter((file) => !exists(file))).toEqual([]);
  });
});
