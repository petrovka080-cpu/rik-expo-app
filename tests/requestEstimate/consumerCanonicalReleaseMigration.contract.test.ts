import {
  assertConsumerCanonicalChildRevision,
  consumerCanonicalMigrationUserParameters,
  consumerCanonicalInheritedRecalculationInputs,
  consumerCanonicalExplicitMigrationParameters,
  resolveConsumerCanonicalRecalculationCatalog,
} from "../../src/features/consumerRepair/consumerCanonicalReleaseMigration";
import {
  recalculateAndPersistConsumerCanonicalEstimate,
  recalculateConsumerCanonicalCatalogAddition,
  recalculateConsumerCanonicalCatalogSelection,
} from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { getCanonicalEstimateCatalogItem, getCanonicalEstimateRevision, getCanonicalEstimateRevisionHistory, getAllCanonicalEstimateRevisionRows, recalculateCanonicalEstimateAndLoad } from "../../src/lib/estimate/backendPlatform/canonicalEstimateClient";
import { canonicalEstimateRecalculateIdempotencyKey } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCommandIdentity";
import type { CanonicalEstimateCatalogItem, CanonicalEstimateRevisionView } from "../../src/lib/estimate/backendPlatform/contracts";

jest.mock("../../src/lib/estimate/backendPlatform/canonicalEstimateClient", () => ({
  getCanonicalEstimateCatalogItem: jest.fn(), getCanonicalEstimateRevision: jest.fn(),
  getAllCanonicalEstimateRevisionRows: jest.fn(), recalculateCanonicalEstimateAndLoad: jest.fn(),
  getCanonicalEstimateRevisionHistory: jest.fn(),
}));

const parentRelease = "11111111-1111-4111-8111-111111111111";
const targetRelease = "22222222-2222-4222-8222-222222222222";
const nextRelease = "33333333-3333-4333-8333-333333333333";
const revision = {
  revisionId: "44444444-4444-4444-8444-444444444444", releaseId: parentRelease,
  catalogId: "canonical-work:master:roof", organizationId: null,
  sourceRequestText: "Укладка мембраны на кровле 100 м²", primaryMeasureParameterId: "area_m2",
  parameters: { area_m2: "100", adhesive_kg_m2: "8" }, currencyCode: "KGS",
  userInputSnapshot: { area_m2: "100" },
  status: "ready", rowCount: 0, totals: {}, checksumSha256: "a".repeat(64), compilerVersion: "test-compiler", createdAt: "2026-10-06T00:00:00Z",
  amendmentContract: { rowOverrides: {}, customRows: [] },
} as unknown as CanonicalEstimateRevisionView;
const target: CanonicalEstimateCatalogItem = {
  catalogId: revision.catalogId, releaseId: targetRelease, workKey: "roof", namespace: "global", domain: "roof",
  titleRu: "Укладка кровли", definitionVersion: 2, applicability: {}, professionalMetadata: {},
  parameterSchema: [
    { parameterId: "area_m2", ordinal: 0, titleRu: "Площадь", valueType: "decimal", unitId: "m2", required: true, defaultValue: null, constraints: {}, valueSourceRole: "USER_MEASURED" },
    { parameterId: "adhesive_kg_m2", ordinal: 1, titleRu: "Расход клея", valueType: "decimal", unitId: "kg/m2", required: true, defaultValue: "1", constraints: {}, valueSourceRole: "MANUFACTURER_CONFIRMED" },
  ],
};
const oldCatalog = { ...target, releaseId: parentRelease, definitionVersion: 1 };
const migration = { contractVersion: "canonical_revision_release_migration.r2" as const, acknowledged: true as const, fromReleaseId: parentRelease, toReleaseId: targetRelease };
const picker = { catalogItemId: "material", rikCode: "material", name: "Мембрана", unit: "m2", unitPrice: 1, sourceId: "market", sourceLabel: "Каталог" };
const getCatalog = jest.mocked(getCanonicalEstimateCatalogItem);

beforeEach(() => {
  jest.resetAllMocks();
  getCatalog.mockImplementation(async (_id, _signal, releaseId) => releaseId ? oldCatalog : target);
  jest.mocked(getCanonicalEstimateRevision).mockResolvedValue(revision);
  jest.mocked(getCanonicalEstimateRevisionHistory).mockResolvedValue({ apiVersion: "canonical-estimate-r1" as never, revisions: [], nextCursor: null });
  jest.mocked(getAllCanonicalEstimateRevisionRows).mockResolvedValue([{ rowId: "membrane", unitId: "m2" }] as never);
});

describe("consumer exact release migration", () => {
  it("carries the unchanged stored excluded machine through parameter migration with exact exclusion proof", async () => {
    const rowOverrides = { membrane: { includedInEstimate: false, includedInProcurement: false, provenance: { kind: "manual" as const } } };
    const excluded = { ...revision, amendmentContract: { ...revision.amendmentContract, rowOverrides } };
    getCatalog.mockImplementation(async (_id, _signal, releaseId) => ({ ...(releaseId ? oldCatalog : target), manualExclusionMigrationBindings: { membrane: "d".repeat(64) } }));
    jest.mocked(getCanonicalEstimateRevision).mockResolvedValue(excluded);
    jest.mocked(recalculateCanonicalEstimateAndLoad).mockRejectedValue(new Error("backend reached"));
    const before = JSON.stringify(excluded), confirm = jest.fn().mockResolvedValue(true);
    await expect(recalculateAndPersistConsumerCanonicalEstimate({ revisionId: excluded.revisionId, draftId: "draft", problemText: excluded.sourceRequestText!,
      patches: [{ operation: "update_param", paramKey: "area_m2", rawValue: "100.0" }], confirmReleaseMigration: confirm, persist: jest.fn() })).rejects.toThrow("backend reached");
    expect(confirm).toHaveBeenCalled();
    expect(jest.mocked(recalculateCanonicalEstimateAndLoad).mock.calls[0][0].request).toMatchObject({ rowOverrides, releaseMigration: migration });
    expect(JSON.stringify(excluded)).toBe(before);
  });
  it("carries only proved unchanged stored prices through parameter migration after exact consent", async () => {
    const rowOverrides = { membrane: { unitPrice: 75, provenance: { kind: "manual" as const, reason: "approved" } } };
    const priced = { ...revision, amendmentContract: { ...revision.amendmentContract, rowOverrides } };
    const manualPriceMigrationBindings = { membrane: "b".repeat(64) };
    getCatalog.mockImplementation(async (_id, _signal, releaseId) => ({ ...(releaseId ? oldCatalog : target), manualPriceMigrationBindings }));
    jest.mocked(getCanonicalEstimateRevision).mockResolvedValue(priced);
    jest.mocked(recalculateCanonicalEstimateAndLoad).mockRejectedValue(new Error("backend reached"));
    const confirm = jest.fn().mockResolvedValue(true), persist = jest.fn(), before = JSON.stringify(priced);
    await expect(recalculateAndPersistConsumerCanonicalEstimate({revisionId:priced.revisionId,draftId:"draft",problemText:priced.sourceRequestText!,patches:[{operation:"update_param",paramKey:"area_m2",rawValue:"101"}],confirmReleaseMigration:confirm,persist})).rejects.toThrow("backend reached");
    expect(confirm).toHaveBeenCalled();
    expect(jest.mocked(recalculateCanonicalEstimateAndLoad).mock.calls[0][0].request).toMatchObject({rowOverrides,releaseMigration:migration});
    expect(JSON.stringify(priced)).toBe(before);expect(persist).not.toHaveBeenCalled();
  });

  it.each([undefined, "c".repeat(64)])("blocks a stored price without matching source proof (%s)", async token => {
    const priced = {...revision,amendmentContract:{...revision.amendmentContract,rowOverrides:{membrane:{unitPrice:75,provenance:{kind:"manual" as const}}}}};
    getCatalog.mockImplementation(async (_id,_signal,releaseId)=>({... (releaseId ? oldCatalog : target),manualPriceMigrationBindings:releaseId?{membrane:"b".repeat(64)}:token?{membrane:token}:undefined}));
    const confirm=jest.fn().mockResolvedValue(true);
    await expect(resolveConsumerCanonicalRecalculationCatalog({revision:priced,confirmReleaseMigration:confirm})).rejects.toMatchObject({code:"RELEASE_MIGRATION_ROW_BINDING_REVIEW_REQUIRED"});
    expect(confirm).not.toHaveBeenCalled();expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled();
  });
  it("uses the current schema after explicit exact consent and leaves the parent unchanged", async () => {
    const before = JSON.stringify(revision);
    const confirm = jest.fn().mockResolvedValue(true);
    const result = await resolveConsumerCanonicalRecalculationCatalog({ revision, confirmReleaseMigration: confirm });
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ revisionId: revision.revisionId, fromReleaseId: parentRelease, toReleaseId: targetRelease }));
    expect(result).toEqual({ catalog: target, releaseMigration: migration });
    expect(JSON.stringify(revision)).toBe(before);
  });

  it("keeps same-release Apply free of migration consent", async () => {
    getCatalog.mockResolvedValue(oldCatalog);
    const confirm = jest.fn();
    expect(await resolveConsumerCanonicalRecalculationCatalog({ revision, confirmReleaseMigration: confirm })).toEqual({ catalog: oldCatalog, releaseMigration: undefined });
    expect(confirm).not.toHaveBeenCalled();
  });

  const counterCatalogs = () => {
    const counter = { ...target.parameterSchema[0], parameterId: "fastener_count", titleRu: "Количество креплений", unitId: "piece", semanticParameterKey: "roof:fastener-count", constraints: { min: 1 } };
    return {
      source: { ...oldCatalog, parameterSchema: [...oldCatalog.parameterSchema, counter] },
      destination: { ...target, parameterSchema: [...target.parameterSchema, { ...counter, valueType: "integer" as const }] },
    };
  };

  it("allows same-meaning decimal-to-integer tightening after exact consent and submits the integer unchanged", async () => {
    const { source, destination } = counterCatalogs();
    getCatalog.mockImplementation(async (_id, _signal, releaseId) => releaseId ? source : destination);
    jest.mocked(recalculateCanonicalEstimateAndLoad).mockRejectedValue(new Error("backend reached"));
    const persist = jest.fn();
    const before = JSON.stringify(revision);
    await expect(recalculateAndPersistConsumerCanonicalEstimate({ revisionId: revision.revisionId, draftId: "draft", problemText: revision.sourceRequestText!,
      patches: [{ operation: "update_param", paramKey: "fastener_count", rawValue: "12" }], confirmReleaseMigration: async () => true, persist })).rejects.toThrow("backend reached");
    expect(jest.mocked(recalculateCanonicalEstimateAndLoad).mock.calls[0][0].request).toMatchObject({ releaseMigration: migration, parameters: { fastener_count: "12" } });
    expect(JSON.stringify(revision)).toBe(before);
    expect(persist).not.toHaveBeenCalled();
  });

  it("rejects a fractional tightened fact with its Russian title and keeps the input and parent without a job", async () => {
    const { source, destination } = counterCatalogs();
    getCatalog.mockImplementation(async (_id, _signal, releaseId) => releaseId ? source : destination);
    const persist = jest.fn();
    const patches = [{ operation: "update_param" as const, paramKey: "fastener_count", rawValue: "12.5" }];
    const before = JSON.stringify(revision), entered = JSON.stringify(patches);
    const attempt = recalculateAndPersistConsumerCanonicalEstimate({ revisionId: revision.revisionId, draftId: "draft", problemText: revision.sourceRequestText!,patches,confirmReleaseMigration: async () => true,persist });
    await expect(attempt).rejects.toMatchObject({ code: "INVALID_PARAMETER_INPUT", message: "Параметры не сохранены: «Количество креплений»: введите целое число без дробной части." });
    expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled();expect(persist).not.toHaveBeenCalled();
    expect(JSON.stringify(patches)).toBe(entered);expect(JSON.stringify(revision)).toBe(before);
  });

  it.each(["unit", "meaning", "loosening"])("does not treat %s changes as integer tightening", async change => {
    const { source, destination } = counterCatalogs();
    if (change === "unit") destination.parameterSchema[2].unitId = "m2";
    if (change === "meaning") destination.parameterSchema[2].semanticParameterKey = "other-count";
    if (change === "loosening") { source.parameterSchema[2].valueType = "integer"; destination.parameterSchema[2] = { ...destination.parameterSchema[2], valueType: "decimal" }; }
    getCatalog.mockImplementation(async (_id, _signal, releaseId) => releaseId ? source : destination);
    const confirm = jest.fn().mockResolvedValue(true);
    await expect(resolveConsumerCanonicalRecalculationCatalog({ revision,parameterPatchKeys:["fastener_count"],confirmReleaseMigration:confirm })).rejects.toMatchObject({ code: "RELEASE_MIGRATION_PARAMETER_BINDING_REVIEW_REQUIRED" });
    expect(confirm).not.toHaveBeenCalled();expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled();
  });

  it.each([false, undefined])("does not submit or persist without consent (%s)", async (consent) => {
    const persist = jest.fn();
    await expect(recalculateAndPersistConsumerCanonicalEstimate({ revisionId: revision.revisionId, draftId: "draft", problemText: revision.sourceRequestText!, patches: [{ operation: "update_param", paramKey: "area_m2", rawValue: "101" }], persist, confirmReleaseMigration: consent === undefined ? undefined : async () => consent })).rejects.toMatchObject({ code: "RELEASE_MIGRATION_NOT_ACKNOWLEDGED" });
    expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("rejects a target changed while the user reviewed the notice", async () => {
    getCatalog.mockResolvedValueOnce(target).mockResolvedValueOnce(oldCatalog).mockResolvedValueOnce({ ...target, releaseId: nextRelease });
    await expect(resolveConsumerCanonicalRecalculationCatalog({ revision, confirmReleaseMigration: async () => true })).rejects.toMatchObject({ code: "RELEASE_MIGRATION_TARGET_CHANGED" });
    expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled();
  });

  it("rejects another catalog and a changed workspace before submitting", async () => {
    getCatalog.mockResolvedValueOnce({ ...target, catalogId: "another" });
    await expect(resolveConsumerCanonicalRecalculationCatalog({ revision })).rejects.toMatchObject({ code: "REVISION_CATALOG_MISMATCH" });
    let current = true;
    await expect(resolveConsumerCanonicalRecalculationCatalog({ revision, confirmReleaseMigration: async () => { current = false; return true; }, assertMutationSource: () => { if (!current) throw new Error("workspace changed"); } })).rejects.toThrow("workspace changed");
    expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled();
  });

  it("carries object facts but lets the target own its new norm and defaults", () => {
    expect(consumerCanonicalMigrationUserParameters(target, { ...revision.parameters, deleted_field: 99 })).toEqual({ area_m2: "100" });
  });

  it("preserves explicit project service quantities when the short form stops asking for them", () => {
    const crew = { ...target.parameterSchema[0], parameterId: "g6_waste_crew_hours", titleRu: "Труд исполнителя, человеко-часы",
      unitId: "man_h", visibilityRole: "USER_INPUT" as const, valueSourceRole: "CONDITIONAL_PROJECT_FACT" as const,
      requiredWhen: { parameterId: "waste_required", equals: true }, formulaConsumers: ["waste_crew"],
      guide: { guideKind: "PROJECT_DEFINED", guideValidationPolicy: "MANDATORY_BLOCK" } as never,
      provenance: { consumer_input_role_v1: "APPLICATION_TECHNICAL" } };
    const fuel = { ...crew, parameterId: "g6_waste_fuel_l", titleRu: "Топливо по программе исполнителя", unitId: "l" };
    const norm = { ...target.parameterSchema[1], provenance: crew.provenance };
    const derived = { ...crew, parameterId: "calculated_hours", valueSourceRole: "BACKEND_DERIVED" as const };
    const catalog = { ...target, parameterSchema: [target.parameterSchema[0], crew, fuel, norm, derived] };
    const parent = { ...revision, parameters: { ...revision.parameters, g6_waste_crew_hours: 9, g6_waste_fuel_l: 99 },
      userInputSnapshot: { area_m2: "100", g6_waste_crew_hours: 2, g6_waste_fuel_l: 15, adhesive_kg_m2: 8, calculated_hours: 99 } };
    const before = JSON.stringify(parent);
    const supplied = consumerCanonicalInheritedRecalculationInputs(parent, catalog);
    expect(supplied).toEqual({ area_m2: "100", g6_waste_crew_hours: 2, g6_waste_fuel_l: 15 });
    expect(consumerCanonicalExplicitMigrationParameters(catalog, { ...supplied, adhesive_kg_m2: 1 }, supplied)).toEqual(supplied);
    expect(consumerCanonicalInheritedRecalculationInputs({ ...parent, userInputSnapshot: { area_m2: "100" } }, catalog))
      .toEqual({ area_m2: "100" });
    expect(JSON.stringify(parent)).toBe(before);
  });

  it("does not turn inherited assumptions or validation defaults into user facts", () => {
    const profile = { ...target.parameterSchema[0], parameterId: "joint_count", titleRu: "Число стыков", defaultValue: 3, valueSourceRole: "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" as const, visibilityRole: "USER_INPUT" as const, formulaConsumers: ["joint-formula"] };
    const catalog = { ...target, parameterSchema: [...target.parameterSchema, profile] };
    const parent = { ...revision, parameters: { ...revision.parameters, joint_count: 8 } };
    const supplied = consumerCanonicalInheritedRecalculationInputs(parent, catalog);
    expect(supplied).toEqual({ area_m2: "100" });
    expect(consumerCanonicalExplicitMigrationParameters(catalog, { area_m2: "101", joint_count: 3, adhesive_kg_m2: 1 }, { ...supplied, area_m2: "101" })).toEqual({ area_m2: "101" });
    expect(consumerCanonicalInheritedRecalculationInputs({ ...parent, userInputSnapshot: { area_m2: "100", joint_count: 12 } }, catalog).joint_count).toBe(12);
  });

  it.each(["unit", "meaning", "legacy", "overrides", "custom"])("stops ambiguous migration (%s) before a job is sent", async (kind) => {
    let parent = revision;
    let catalog = target;
    if (kind === "unit") catalog = { ...target, parameterSchema: [{ ...target.parameterSchema[0], unitId: "m" }, target.parameterSchema[1]] };
    if (kind === "meaning") catalog = { ...target, parameterSchema: [{ ...target.parameterSchema[0], semanticParameterKey: "other" }, target.parameterSchema[1]] };
    if (kind === "legacy") parent = { ...revision, userInputSnapshot: null };
    if (kind === "overrides") parent = { ...revision, amendmentContract: { ...revision.amendmentContract, rowOverrides: { membrane: { quantity: 12, provenance: { kind: "manual", reason: "site" } } } } };
    if (kind === "custom") parent = { ...revision, amendmentContract: { ...revision.amendmentContract, customRows: [{ clientRowId: "custom" } as never] } };
    getCatalog.mockImplementation(async (_id, _signal, releaseId) => releaseId ? oldCatalog : catalog);
    await expect(resolveConsumerCanonicalRecalculationCatalog({ revision: parent, confirmReleaseMigration: async () => true })).rejects.toBeDefined();
    expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled();
  });

  it("checks a newly filled optional patch even when it was absent from the saved snapshot", async () => {
    const optional = { ...target.parameterSchema[0], parameterId: "cleaned_area", titleRu: "Обрабатываемая площадь", required: false };
    const parentCatalog = { ...oldCatalog, parameterSchema: [...oldCatalog.parameterSchema, optional] };
    const newCatalog = { ...target, parameterSchema: [...target.parameterSchema, { ...optional, unitId: "m" }] };
    getCatalog.mockImplementation(async (_id, _signal, releaseId) => releaseId ? parentCatalog : newCatalog);
    const persist = jest.fn();
    await expect(recalculateAndPersistConsumerCanonicalEstimate({ revisionId: revision.revisionId, draftId: "draft", problemText: revision.sourceRequestText!, patches: [{ operation: "update_param", paramKey: "cleaned_area", rawValue: "20" }], confirmReleaseMigration: async () => true, persist })).rejects.toMatchObject({ code: "RELEASE_MIGRATION_PARAMETER_BINDING_REVIEW_REQUIRED" });
    expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it.each(["parent", "release", "catalog", "tenant"])("rejects wrong child %s identity", (field) => {
    const child = { ...revision, parentRevisionId: revision.revisionId, releaseId: targetRelease };
    if (field === "parent") child.parentRevisionId = "another";
    if (field === "release") child.releaseId = parentRelease;
    if (field === "catalog") child.catalogId = "another";
    if (field === "tenant") child.organizationId = "another";
    expect(() => assertConsumerCanonicalChildRevision({ parent: revision, catalog: target, child })).toThrow();
  });

  it("binds retries to the consented target release", () => {
    const command = { parentRevisionId: revision.revisionId, parameters: { area_m2: 101 }, rowOverrides: {}, customRows: [] };
    const first = canonicalEstimateRecalculateIdempotencyKey({ ...command, releaseMigration: migration });
    expect(canonicalEstimateRecalculateIdempotencyKey({ ...command, releaseMigration: migration })).toBe(first);
    expect(canonicalEstimateRecalculateIdempotencyKey({ ...command, releaseMigration: { ...migration, toReleaseId: nextRelease } })).not.toBe(first);
    expect(canonicalEstimateRecalculateIdempotencyKey(command)).not.toBe(first);
  });

  it("sends the exact contract and preserves the parent on backend failure", async () => {
    jest.mocked(recalculateCanonicalEstimateAndLoad).mockRejectedValue(new Error("backend failed"));
    const persist = jest.fn();
    const shared = { revisionId: revision.revisionId, problemText: revision.sourceRequestText!, confirmReleaseMigration: async () => true };
    const attempt = recalculateAndPersistConsumerCanonicalEstimate({ ...shared, draftId: "draft", patches: [{ operation: "update_param", paramKey: "area_m2", rawValue: "101" }], persist });
    await expect(attempt).rejects.toThrow("backend failed");
    const request = jest.mocked(recalculateCanonicalEstimateAndLoad).mock.calls[0][0].request;
    expect(request).toMatchObject({ parentRevisionId: revision.revisionId, organizationId: null, releaseMigration: migration });
    expect(request.parameters.adhesive_kg_m2).toBeUndefined();
    expect(request.parameters.area_m2).toBe("101");
    expect(persist).not.toHaveBeenCalled();
    expect(revision.parameters.area_m2).toBe("100");
  });

  it.each(["selection", "addition"])("keeps %s on the common release guard until the exact row binding is known", async (action) => {
    const shared = { revisionId: revision.revisionId, problemText: revision.sourceRequestText!, catalogItem: picker, confirmReleaseMigration: async () => true };
    await expect(action === "selection" ? recalculateConsumerCanonicalCatalogSelection({ ...shared, rowId: "membrane" }) : recalculateConsumerCanonicalCatalogAddition(shared)).rejects.toMatchObject({ code: "RELEASE_MIGRATION_ROW_BINDING_REVIEW_REQUIRED" });
    expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled();
    getCatalog.mockResolvedValue(oldCatalog);
    jest.mocked(recalculateCanonicalEstimateAndLoad).mockRejectedValue(new Error("backend failed"));
    await expect(action === "selection" ? recalculateConsumerCanonicalCatalogSelection({ ...shared, rowId: "membrane" }) : recalculateConsumerCanonicalCatalogAddition(shared)).rejects.toThrow("backend failed");
    expect(jest.mocked(recalculateCanonicalEstimateAndLoad).mock.calls[0][0].request.releaseMigration).toBeUndefined();
  });

  it("opens an already saved migration child after a lost response instead of writing a second child", async () => {
    const child = { ...revision, revisionId: "55555555-5555-4555-8555-555555555555", parentRevisionId: revision.revisionId, releaseId: targetRelease,
      parameters: { area_m2: "101", adhesive_kg_m2: "1" }, userInputSnapshot: { area_m2: "101" }, primaryMeasureValue: "101", primaryMeasureUnitId: "m2" };
    jest.mocked(getCanonicalEstimateRevisionHistory).mockResolvedValue({ apiVersion: "canonical-estimate-r1" as never, revisions: [child], nextCursor: null });
    jest.mocked(getCanonicalEstimateRevision).mockImplementation(async id => id === child.revisionId ? child : revision);
    jest.mocked(getAllCanonicalEstimateRevisionRows).mockResolvedValue([]);
    const confirm = jest.fn().mockResolvedValue(true);
    const persist = jest.fn().mockResolvedValue({ draft: { id: "draft" } });
    const result = await recalculateAndPersistConsumerCanonicalEstimate({ revisionId: revision.revisionId, draftId: "draft", problemText: revision.sourceRequestText!, patches: [{ operation: "update_param", paramKey: "area_m2", rawValue: "102" }], confirmReleaseMigration: confirm, persist });
    expect(result.recovered).toBe(true);
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ recoveredRevisionId: child.revisionId }));
    expect(recalculateCanonicalEstimateAndLoad).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(result.session.revisionId).toBe(child.revisionId);
    expect(child.parameters.area_m2).toBe("101");
    expect(revision.parameters.area_m2).toBe("100");
  });
});
