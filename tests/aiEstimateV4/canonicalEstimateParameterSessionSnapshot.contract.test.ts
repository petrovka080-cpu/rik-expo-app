import {
  assertCanonicalEstimateParameterSessionSnapshotIdentity,
  projectCanonicalEstimateParameterSessionSnapshot,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSessionSnapshot";
import {
  ESTIMATE_PLATFORM_API_VERSION,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateRevisionView,
} from "../../src/lib/estimate/backendPlatform/contracts";
import { buildConsumerCanonicalParameterSession } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { consumerRepairCanonicalEstimateBlocksApproval, consumerRepairCanonicalMissingParameterCount } from "../../src/features/consumerRepair/consumerRepairCanonicalEstimateReadiness";

const catalog: CanonicalEstimateCatalogItem = {
  catalogId: "catalog", releaseId: "release", namespace: "global", domain: "test", workKey: "test",
  titleRu: "Тест", definitionVersion: 2, applicability: {}, professionalMetadata: {},
  parameterSchema: [{ parameterId: "actual", ordinal: 0, valueType: "decimal", unitId: "m", titleRu: "Факт",
    required: true, defaultValue: null, constraints: { min: 0 }, visibilityRole: "USER_INPUT",
    valueSourceRole: "CONDITIONAL_PROJECT_FACT", resourceBranchConsumers: ["resource"],
    formulaConsumers: ["formula"], provenance: { source: "TEST" } }],
};
const parent: CanonicalEstimateRevisionView = {
  apiVersion: ESTIMATE_PLATFORM_API_VERSION, revisionId: "parent", parentRevisionId: null,
  releaseId: "prior-release", catalogId: "catalog", revisionNumber: 1, status: "ready", currencyCode: "KGS",
  parameters: { actual: "10" }, amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null },
  totals: {}, rowCount: 1, checksumSha256: "a".repeat(64), compilerVersion: "compiler", createdAt: "2026-10-03",
};
const child: CanonicalEstimateRevisionView = {
  ...parent, revisionId: "child", parentRevisionId: "parent", releaseId: "release",
  definitionVersionId: "definition", definitionVersion: 2, parameters: { actual: "12" },
};
const input = () => ({ requestedRevisionId: "child", definitionVersionId: "definition", revision: child, parent, catalog });

describe("parameter session transport projection", () => {
  it("carries withdrawal into the editor without inventing another required parameter", () => {
    const reason = "Паспорт не соответствует выбранной технологии.";
    const snapshot = projectCanonicalEstimateParameterSessionSnapshot({ ...input(), revision: { ...child, contentWithdrawalReasonRu: reason } });
    const session = buildConsumerCanonicalParameterSession({ ...snapshot, draftId: "draft" });
    expect(snapshot.revision.contentWithdrawalReasonRu).toBe(reason);
    expect(session.contentWithdrawalReasonRu).toBe(reason);
    expect(consumerRepairCanonicalMissingParameterCount(session)).toBe(0);
    expect(consumerRepairCanonicalEstimateBlocksApproval(session)).toBe(true);
    expect(session.parameters.map(p => p.parameterId)).toEqual(["actual"]);
    expect(child).not.toHaveProperty("contentWithdrawalReasonRu");
  });

  it("preserves all schema ownership/constraints and parent inputs across a legitimate release migration", () => {
    const snapshot = projectCanonicalEstimateParameterSessionSnapshot(input());
    expect(snapshot.catalog).toBe(catalog);
    expect(snapshot.parent).toEqual({ revisionId: "parent", releaseId: "prior-release", catalogId: "catalog", parameters: parent.parameters });
    expect(snapshot.revision.parameters).toBe(child.parameters);
    expect(snapshot.revision).not.toHaveProperty("amendmentContract");
    expect(snapshot.parent).not.toHaveProperty("totals");
    expect(() => assertCanonicalEstimateParameterSessionSnapshotIdentity(snapshot, "child")).not.toThrow();
  });

  it.each([
    ["requested revision", () => ({ ...input(), requestedRevisionId: "other" })],
    ["catalog", () => ({ ...input(), catalog: { ...catalog, catalogId: "other" } })],
    ["release", () => ({ ...input(), catalog: { ...catalog, releaseId: "other" } })],
    ["definition ID", () => ({ ...input(), definitionVersionId: "other" })],
    ["definition version", () => ({ ...input(), catalog: { ...catalog, definitionVersion: 3 } })],
    ["missing parent", () => ({ ...input(), parent: null })],
    ["different parent", () => ({ ...input(), parent: { ...parent, revisionId: "other" } })],
    ["parent catalog", () => ({ ...input(), parent: { ...parent, catalogId: "other" } })],
    ["unexpected parent", () => ({ ...input(), revision: { ...child, parentRevisionId: null } })],
  ] as const)("rejects mismatched %s before exposing editable parameters", (_label, makeInput) => {
    expect(() => projectCanonicalEstimateParameterSessionSnapshot(makeInput()))
      .toThrow(expect.objectContaining({ code: "PARAMETER_SESSION_IDENTITY_MISMATCH" }));
  });
});
