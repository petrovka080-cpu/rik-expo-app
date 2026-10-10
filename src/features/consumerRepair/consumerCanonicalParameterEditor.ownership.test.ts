import type { CanonicalEstimateCatalogItem } from "../../lib/estimate/backendPlatform/contracts";
import { buildConsumerCanonicalPrecompileParameterSession, consumerCanonicalPrecompileParameterOverrides } from "./consumerCanonicalParameterEditor";
import { consumerCanonicalMigrationUserParameters } from "./consumerCanonicalReleaseMigration";
import { buildCanonicalParameterCards } from "../../lib/estimatePresentation/buildCanonicalParameterCards";

type Schema = CanonicalEstimateCatalogItem["parameterSchema"][number];
const guide: NonNullable<Schema["guide"]> = { guideKind: "PROJECT_DEFINED", guideValidationPolicy: "MANDATORY_BLOCK", sourceRole: "PROJECT_DOCUMENTATION",
  guideShortRu: "Укажите фактические условия объекта", guideVersion: "test-v1", applicability: "Actual project facts", verifiedAt: "2026-10-10",
  sourceDocument: "approved-project", sourceLocator: "Actual site and supply", sourceSnapshotHash: "a".repeat(64) };
const stock = { parameterId: "stock", semanticParameterKey: "work:stock", titleRu: "Пригодный запас", ordinal: 1,
  valueType: "integer", unitId: "pcs", required: true, defaultValue: null, constraints: { min: 0 },
  visibilityRole: "USER_INPUT", valueSourceRole: "PROJECT_SPECIFIC_INPUT", formulaConsumers: ["order"], resourceBranchConsumers: ["material"], guide } as Schema;
const reference = { ...stock, parameterId: "stock_reference", semanticParameterKey: "work:stock_reference", ordinal: 2,
  titleRu: "Расход и совместимость запаса по документу проекта", valueType: "text", unitId: null, required: false,
  valueSourceRole: "CONDITIONAL_PROJECT_FACT", formulaConsumers: [],
  constraints: { minLength: 1, maxLength: 1000, requiredWhen: { kind: "greater_than", parameterId: "stock", value: 0 } } } as Schema;
const catalog = (schema: Schema[]): CanonicalEstimateCatalogItem => ({ catalogId: "ownership-integration", releaseId: "release",
  namespace: "global", workKey: "ownership-integration", titleRu: "Установка материала", domain: "landscape", definitionVersion: 1,
  applicability: {}, professionalMetadata: {}, parameterSchema: schema });
const build = (schema: Schema[], parameters: Record<string, string | number> = {}, missingParameterIds: string[] = []) =>
  buildConsumerCanonicalPrecompileParameterSession({ catalog: catalog(schema), draftId: "ownership-regression", parameters, missingParameterIds,
    userExplicitParameterIds: Object.keys(parameters), textExtractedParameterIds: [] });

it("keeps a renamed project question reachable and inactive stock references hidden even with stale needs", () => {
  for (const titleRu of [reference.titleRu, "Нормальные условия запаса", "Количество: документ запаса", "Условие = запас пригоден"]) {
    const schema = [stock, { ...reference, titleRu }];
    expect(build(schema, { stock: 0 }, [reference.parameterId]).parameters.some(p => p.parameterId === reference.parameterId)).toBe(false);
    const positive = build(schema, { stock: 1 }, [reference.parameterId]);
    expect(positive.parameters.find(p => p.parameterId === reference.parameterId)).toMatchObject({ resourceSelectionInput: true });
    expect(positive.parameters.find(p => p.parameterId === reference.parameterId)?.label).toMatch(/[А-Яа-яЁё]/u);
    expect(positive.parameters.find(p => p.parameterId === reference.parameterId)?.label).not.toBe("");
    expect(consumerCanonicalPrecompileParameterOverrides({ session: positive, patches: [{ operation: "set_param", paramKey: reference.parameterId, rawValue: "Паспорт партии 17" }] as never }))
      .toEqual({ stock: 1, stock_reference: "Паспорт партии 17" });
  }
});

it("does not expose protected sources through active needs or a benign label and excludes them from migration", () => {
  const norm = { ...stock, parameterId: "labor_rate", semanticParameterKey: "work:labor_rate", titleRu: "Площадь объекта",
    valueSourceRole: "UNRESOLVED_APPLICATION_NORM", provenance: { consumer_input_role_v1: "OBJECT_FACT" } } as Schema;
  expect(build([stock, reference, norm], { stock: 1 }, [norm.parameterId]).parameters.some(p => p.parameterId === norm.parameterId)).toBe(false);
  expect(consumerCanonicalMigrationUserParameters(catalog([stock, reference, norm]), { stock: 1, stock_reference: "Паспорт партии 17", labor_rate: 8 }))
    .toEqual({ stock: 1, stock_reference: "Паспорт партии 17" });
});

it("retains a supplied optional project branch in actual cards and pending Apply without making it required", () => {
  const choice = { ...stock, parameterId: "mechanism_fulfillment", semanticParameterKey: "work:mechanism_fulfillment",
    titleRu: "Нормальные условия = свой или арендованный механизм", valueType: "enum", unitId: null, required: false,
    valueSourceRole: "CONDITIONAL_PROJECT_FACT", constraints: { values: ["own", "hired"] }, formulaConsumers: [] } as Schema;
  const saved = build([choice], { mechanism_fulfillment: "own" });
  expect(saved.parameters[0].requiredLevel).toBe("OPTIONAL");
  expect(buildCanonicalParameterCards({ session: saved, revision: null })).toEqual([expect.objectContaining({ key: choice.parameterId, value: "own" })]);
  expect(consumerCanonicalPrecompileParameterOverrides({ session: saved, patches: [] })).toEqual({ mechanism_fulfillment: "own" });
  expect(consumerCanonicalPrecompileParameterOverrides({ session: saved, patches: [{ operation: "set_param", paramKey: choice.parameterId, rawValue: "hired" }] as never }))
    .toEqual({ mechanism_fulfillment: "hired" });
  const legacyDocument = { ...choice, parameterId: "product_profile_id", semanticParameterKey: undefined, valueSourceRole: "PROJECT_SPECIFIC_INPUT", guide: undefined } as Schema;
  expect(build([legacyDocument]).parameters).toEqual([]);
});
