import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { buildNormativeParameterCompletenessModel } from "../../src/lib/estimate/buildNormativeParameterCompletenessModel";
import {
  createRegisteredProfessionalDomainAuditRevision,
  recalculateRegisteredProfessionalDomainAuditRevision,
} from "../../scripts/estimate/registeredProfessionalDomainAuditAdapter";

export function expectProfessionalDomainVisibleBaselineJourney(input: {
  templateId: string;
  titleRu: string;
}): void {
  const initial = createRegisteredProfessionalDomainAuditRevision({
    estimateDraftId: `visible-baseline-${input.templateId}`,
    rawInput: `${input.titleRu} 84 m2`,
    templateId: input.templateId,
    createdAt: "2026-08-17T00:00:00.000Z",
  });

  expect(initial.estimateLevel).toBe("PRELIMINARY_QUANTITY_BOQ");
  expect(initial.status).toBe("draft_ready");
  expect(initial.boq.rows.length).toBeGreaterThan(0);
  expect(initial.workSpecificParameterSchemaId).toBeTruthy();
  expect(initial.legacyRowsCount).toBe(0);
  expect(initial.assumptions.length).toBeGreaterThan(0);
  expect(initial.assumptions.every((assumption) => assumption.visibleToUser)).toBe(true);
  expect(new Set(initial.assumptions.map((assumption) => assumption.key)).size).toBe(initial.assumptions.length);

  const schemaKeys = new Set(initial.workSpecificParameterSignature);
  const parameterKeys = Object.keys(initial.params);
  expect(parameterKeys.length).toBeGreaterThan(0);
  expect(new Set(parameterKeys).size).toBe(parameterKeys.length);
  expect(parameterKeys.every((key) => schemaKeys.has(key))).toBe(true);
  expect(parameterKeys.filter((key) => key.startsWith("unit_price_") || key.startsWith("price_basis_"))).toEqual([]);
  expect(initial.boq.rows.every((row) => row.unitPrice == null)).toBe(true);

  const source = initial.boq.rows.find(
    (row) => row.sourceParameters?.professionalDomainFactoryV1 === true,
  )?.sourceParameters;
  expect(source).toBeTruthy();
  expect(initial.selectedTemplateId).toBe(source?.professionalEstimatePassportId);
  expect(initial.resolvedIdentity?.passportId).toBe(source?.professionalEstimatePassportId);
  expect(initial.resolvedIdentity?.requestedCatalogWorkId).toBe(source?.requestedCatalogWorkId);
  expect(source?.requestedCatalogWorkId).toBe(source?.workKey);
  expect([source?.workKey, `expanded-template:${source?.workKey}`]).toContain(source?.catalogId);
  expect(source?.professionalDomainVisibleBaselineVersion).toBe("registered-professional-visible-baseline:v1");
  const metadata = source?.professionalDomainParameterMetadata as Record<string, Record<string, unknown>>;
  expect(parameterKeys.every((key) => metadata[key] != null)).toBe(true);

  const cards = buildAiEstimateParameterCards({ revision: initial, includeMissing: true });
  expect(new Set(cards.map((card) => card.key)).size).toBe(cards.length);
  expect(cards.every((card) => schemaKeys.has(card.key))).toBe(true);
  expect(cards.every((card) => !/[a-z]+_[a-z0-9_]+/i.test(card.labelRu))).toBe(true);
  for (const card of cards) {
    const canonicalUnit = initial.params[card.key]?.canonicalUnit;
    if (canonicalUnit) expect(card.unitRu.trim().length).toBeGreaterThan(0);
  }

  const area = initial.params.area_m2;
  if (area) {
    expect(area.value).toBe(84);
    expect(area.canonicalUnit).toBe("m2");
    expect(area.source).toBe("user_input");
    expect(initial.params.length_m).toBeUndefined();
    expect(initial.params.width_m).toBeUndefined();
  }

  const completeness = buildNormativeParameterCompletenessModel(initial);
  expect(completeness).not.toBeNull();
  expect(completeness?.passport.requirements.map((item) => item.key)).toEqual(
    initial.workSpecificParameterSignature,
  );

  const candidate = initial.trace.params
    .filter((parameter) => parameter.affectsRowIds.length > 0 &&
      typeof initial.params[parameter.key]?.value === "number" &&
      initial.params[parameter.key]?.source === "default_assumption")
    .sort((left, right) => right.affectsRowIds.length - left.affectsRowIds.length)[0];
  expect(candidate).toBeTruthy();
  expect(initial.assumptions.some((assumption) => assumption.key === candidate.key)).toBe(true);
  const before = Number(initial.params[candidate.key].value);
  const recalculated = recalculateRegisteredProfessionalDomainAuditRevision({
    previous: initial,
    operation: "update_param",
    paramKey: candidate.key,
    rawValue: String(before + 5),
    createdAt: "2026-08-17T00:01:00.000Z",
    revisionIndex: 2,
  });
  expect(recalculated.revision.revisionId).not.toBe(initial.revisionId);
  expect(recalculated.revision.params[candidate.key].source).toBe("edited_by_user");
  expect(recalculated.revision.params[candidate.key].value).toBe(before + 5);
  expect(recalculated.diff.changedRowsCount).toBeGreaterThan(0);
  expect(recalculated.revision.selectedTemplateId).toBe(initial.selectedTemplateId);
  expect(recalculated.revision.resolvedIdentity?.passportId).toBe(initial.resolvedIdentity?.passportId);
  expect(recalculated.revision.resolvedIdentity?.requestedCatalogWorkId)
    .toBe(initial.resolvedIdentity?.requestedCatalogWorkId);
  expect(recalculated.revision.assumptions
    .find((assumption) => assumption.key === candidate.key)?.replacedByUserInput).toBe(true);
}
