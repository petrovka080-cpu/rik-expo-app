import { consumerCanonicalMissingRequirements, type CanonicalParameterRequirementTables } from "../../src/lib/consumerRequests/consumerCanonicalParameterRequirements";
import type { ConsumerRepairDraftBundle, ConsumerRepairRequestItem } from "../../src/lib/consumerRequests/consumerRequestTypes";
import { compactConsumerRepairBundleForDurableStorage, decodeConsumerRepairBundleFromDurableStorage, encodeConsumerRepairBundleForDurableStorage } from "../../src/lib/platform/compactConsumerRepairDurableState";
import { consumerRepairRowHasSourceManagedQuantity, consumerRepairRowMissingRequirementLabels } from "../../src/features/consumerRepair/consumerRepairRowMetadata";
import { buildRequestEstimateSourceGates } from "../../src/features/consumerRepair/requestEstimateViewModel";

const reference = { contractVersion: "canonical-parameter-requirements/v1" as const,
  revisionId: "existing-revision", releaseId: "existing-release", parameterSchemaHash: "existing-schema" };
const tables: CanonicalParameterRequirementTables = { [reference.revisionId]: {
  ...reference, requirementsById: {
    productivity: { parameterId: "productivity", titleRu: "Производительность выбранной установки", unitId: "m_per_hour",
      valueSourceRole: "SELECTED_EQUIPMENT_PASSPORT", sourceConfirmationRequired: true, guideShortRu: "Полный исходный текст паспорта" },
    length: { parameterId: "length", titleRu: "Длина перехода", unitId: "m", sourceConfirmationRequired: false, guideShortRu: null },
  },
} };
function item(): ConsumerRepairRequestItem {
  return { id: "row", requestDraftId: "draft", itemType: "service", titleRu: "Продавливание", quantity: null, unit: "machine_hour",
    currency: "KGS", source: "reference_price_book", editableByConsumer: true, createdAt: "2026-10-04T00:00:00Z",
    sourceParameters: { canonicalPreliminaryNeed: true, canonicalBackendRevisionId: reference.revisionId,
      canonicalBackendReleaseId: reference.releaseId, canonicalParameterRequirementReference: reference,
      missingParameterIds: ["productivity", "length"], sourceManagedMissingParameterIds: ["productivity"],
      payable: false, canonicalNeedEvidenceReference: { originalHash: "preserved" } } };
}

it("cold replays the one shared table, exact row provenance and technical quantity guard", () => {
  const bundle = { draft: { id: "draft", status: "draft" }, items: [item()], media: [], pdfs: [], events: [], projectExecutionDrafts: [],
    canonicalParameterRequirementTables: tables } as unknown as ConsumerRepairDraftBundle;
  const restored = decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(
    encodeConsumerRepairBundleForDurableStorage(compactConsumerRepairBundleForDurableStorage(bundle)))))!;
  expect(restored.items[0]).toMatchObject(bundle.items[0]);
  expect(restored.items[0].sourceParameters).toEqual(bundle.items[0].sourceParameters);
  expect(restored.canonicalParameterRequirementTables).toEqual(tables);
  expect(consumerRepairRowMissingRequirementLabels(restored.items[0], restored.canonicalParameterRequirementTables))
    .toEqual(["Производительность выбранной установки", "Длина перехода"]);
  expect(consumerRepairRowHasSourceManagedQuantity(restored.items[0])).toBe(true);
  expect(buildRequestEstimateSourceGates(restored.items, restored.canonicalParameterRequirementTables))
    .toEqual([expect.objectContaining({ parameterId: "productivity", affectedPositionCount: 1,
      sourceRequirement: expect.stringContaining("паспорт") })]);
});

it("rejects a table from another release or schema without hiding questions or releasing the source guard", () => {
  for (const mismatch of [{ releaseId: "other" }, { parameterSchemaHash: "other" }]) {
    const wrongTables = { [reference.revisionId]: { ...tables[reference.revisionId], ...mismatch } };
    expect(consumerRepairRowMissingRequirementLabels(item(), wrongTables)).toEqual(["productivity", "length"]);
    expect(consumerRepairRowHasSourceManagedQuantity(item())).toBe(true);
    expect(buildRequestEstimateSourceGates([item()], wrongTables)).toEqual([expect.objectContaining({ parameterId: "productivity" })]);
  }
});

it("leaves legacy inline requirements and historical row bytes unchanged", () => {
  const legacy = { ...item(), sourceParameters: { canonicalPreliminaryNeed: true,
    missingParameterRequirements: [tables[reference.revisionId].requirementsById.productivity] } };
  const original = JSON.stringify(legacy);
  expect(consumerCanonicalMissingRequirements(legacy, tables)).toEqual(legacy.sourceParameters.missingParameterRequirements);
  expect(consumerRepairRowHasSourceManagedQuantity(legacy)).toBe(true);
  expect(JSON.stringify(legacy)).toBe(original);
  expect(consumerCanonicalMissingRequirements(item(), null)).toEqual([
    { parameterId: "productivity", titleRu: "productivity", sourceConfirmationRequired: true },
    { parameterId: "length", titleRu: "length", sourceConfirmationRequired: false },
  ]);
});
