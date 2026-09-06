import { execFileSync } from "child_process";

const PREDECESSOR = "3bae74556b5bab15ecdaa69737f80218b867d0e0";
const BATCH001_SCOPE_HEAD = "f7c9c328e1f02fc38e29088526764f68714b7fe9";

describe("BATCH001 R2 outside-scope mutation guard", () => {
  test("limits tracked production changes to the canonical estimate runtime and exact interior domain", () => {
    const changed = execFileSync("git", ["diff", "--name-only", PREDECESSOR, BATCH001_SCOPE_HEAD, "--", "src"], {
      encoding: "utf8",
    }).trim().split(/\r?\n/).filter(Boolean);
    const allowed = [
      "src/lib/estimate/buildAiEstimateParameterCards.ts",
      "src/lib/estimate/createEstimateDraftRevision.ts",
      "src/lib/estimate/recalculateEstimateDraftRevision.ts",
      "src/lib/estimate/runtime/createAiEstimateRuntime.ts",
      "src/lib/estimate/v4/domainFactory/constructionNormativeRegistryV1.ts",
      "src/lib/estimate/v4/domainFactory/professionalEstimateDomainFactoryV1.ts",
      "src/lib/estimate/v4/domains/interiorFinishesComplete/",
      "src/lib/estimate/v4/professionalProjectAssemblyV4.ts",
    ];
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.filter((file) => !allowed.some((prefix) => file === prefix || file.startsWith(prefix)))).toEqual([]);
  });
});
