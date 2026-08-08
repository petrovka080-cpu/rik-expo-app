import { validateAiEstimateBuyerPackageParity } from "../../src/lib/estimate/artifacts/validateAiEstimateBuyerPackageParity";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import type { EstimateDraftRevision } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { buildConsumerRepairDraftFromExactRoadworksWaveARuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  ROADWORKS_WAVE_A_MIGRATION_VERSION,
  RoadworksWaveAProductionRegistry,
  buildRoadworksWaveAProductionDraft,
  getRoadworksWaveAParameterDefinitions,
  getRoadworksWaveAParameterKeys,
  roadworksWaveANaturalLanguageCases,
} from "../../src/lib/estimate/v4/roadworks";

function explicitOverrides(workId: string) {
  return Object.fromEntries(getRoadworksWaveAParameterKeys(workId).map((key) => [
    key,
    {
      value: DEFAULT_ROADWORKS_WAVE_A_INPUTS[key],
      source: "user_input" as const,
      sourceText: "all-35-contract",
      lastChangedAt: "2026-08-07T00:00:00.000Z",
    },
  ]));
}

function p0ParameterKeys(workId: string) {
  return getRoadworksWaveAParameterDefinitions(workId)
    .filter((definition) => definition.tier === "P0")
    .map((definition) => definition.key);
}

describe("RoadworksWaveAProductionBindingContract", () => {
  test("owns all 35 registrations without legacy or generic owners", () => {
    expect(RoadworksWaveAProductionRegistry).toHaveLength(35);
    expect(new Set(RoadworksWaveAProductionRegistry.map((item) => item.workId)).size).toBe(35);
    for (const item of RoadworksWaveAProductionRegistry) {
      expect(item.passport.requestedCatalogWorkId).toBe(item.workId);
      expect(item.passport.canonicalWorkId).toBe(item.canonicalWorkId);
      expect(item.parameterSchema.length).toBeGreaterThan(0);
      expect(item.overlayId).toBe(`${item.workId}:overlay:v4.3`);
      expect(item.migrationVersion).toBe(ROADWORKS_WAVE_A_MIGRATION_VERSION);
      expect(item.technologyFamily).not.toMatch(/^(roadworks|asphalt)$/);
    }
  });

  test("selected catalog work keeps the same canonical ID for all 35 works", () => {
    for (const item of RoadworksWaveAProductionRegistry) {
      const result = buildEstimateFromInlineWorkPrompt({
        rawInput: `${item.professionalNameRu} 120 м2 толщина 50 мм`,
        selectedWorkKey: item.workId,
        selectedTemplateId: item.templateId,
        paramOverrides: explicitOverrides(item.workId),
      });
      expect(result.draft?.selectedWork?.selectedWorkKey).toBe(item.workId);
      expect(result.draft?.repairType).toBe(item.workId);
      expect(result.draft?.items.length).toBeGreaterThan(0);
      expect(result.draft?.items.every((row) =>
        row.sourceParameters?.requestedCatalogWorkId === item.workId &&
        row.sourceParameters?.canonicalWorkId === item.canonicalWorkId &&
        row.sourceParameters?.professionalEstimatePassportId === item.professionalPassport.passportId &&
        row.sourceParameters?.calculationProfileId === item.calculationProfileId &&
        row.sourceParameters?.formulaGraphId === item.formulaGraphId &&
        row.sourceParameters?.normativeCompositionId === item.normativeCompositionId &&
        row.sourceParameters?.semanticFingerprint === item.semanticFingerprint &&
        row.sourceParameters?.migrationVersion === ROADWORKS_WAVE_A_MIGRATION_VERSION
      )).toBe(true);
      expect(result.draft?.items.some((row) => row.sourceParameters?.asphaltV4 === true)).toBe(false);
      expect(result.draft?.items.every((row) =>
        Array.isArray(row.sourceParameters?.professionalBoqDefaultAssumptionsRu) &&
        row.sourceParameters.professionalBoqDefaultAssumptionsRu.length === 0 &&
        row.sourceParameters?.professionalBoqDefaultsApplied === false
      )).toBe(true);
    }
  });

  test("exact prebuilt runtime keeps canonical revision parity for all 35 works", () => {
    let exactParity = 0;
    let genericReferenceParity = 0;
    for (const [index, item] of RoadworksWaveAProductionRegistry.entries()) {
      const input = {
        estimateDraftId: `wave-a-fast-path-${index}`,
        rawInput: `${item.professionalNameRu} 120 м2 толщина 50 мм`,
        selectedWorkKey: item.workId,
        selectedTemplateId: item.templateId,
        selectedTemplateName: item.professionalNameRu,
        currency: "KGS",
        paramOverrides: explicitOverrides(item.workId),
        createdAt: "2026-08-08T12:00:00.000Z",
      };
      const exact = buildRoadworksWaveAProductionDraft(input);
      expect(exact?.registration.workId).toBe(item.workId);
      const fastDraft = exact
        ? buildConsumerRepairDraftFromExactRoadworksWaveARuntime(input, exact.draft)
        : null;
      const fastRevision = fastDraft?.runtimeEstimateDraftRevision;

      expect(fastRevision).toBeDefined();
      expect(fastRevision?.resolvedIdentity).toMatchObject({
        requestedCatalogWorkId: item.workId,
        passportId: item.professionalPassport.passportId,
        calculationProfileId: item.calculationProfileId,
        canonicalModelId: item.canonicalModelId,
        selectedScope: item.scopeProfile,
        formulaGraphVersion: item.formulaGraphId,
        normativeCompositionId: item.normativeCompositionId,
        semanticFingerprint: item.semanticFingerprint,
        projectionOwner: "estimate_draft_revision",
      });
      expect(fastRevision?.professionalWorkId).toBe(item.workId);
      expect(fastRevision?.boq.rows).toHaveLength(exact?.draft.items.length ?? 0);
      for (const [rowIndex, row] of (fastRevision?.boq.rows ?? []).entries()) {
        const source = exact?.draft.items[rowIndex];
        expect(row).toMatchObject({
          rowId: source?.sourceParameters?.rowCode,
          titleRu: source?.titleRu,
          quantity: source?.quantity,
          unit: source?.unit,
          formulaId: source?.formulaId,
          sourceParameters: source?.sourceParameters,
        });
      }
      expect(fastDraft?.selectedWork?.selectedWorkKey).toBe(item.workId);
      if (index === 0) {
        const genericRevision = createAiEstimateRuntime().createDraft(input).revision;
        expect(fastRevision?.resolvedIdentity).toEqual(genericRevision.resolvedIdentity);
        expect(fastRevision?.params).toEqual(genericRevision.params);
        expect(fastRevision?.missingInputs).toEqual(genericRevision.missingInputs);
        expect(fastRevision?.boq).toEqual(genericRevision.boq);
        genericReferenceParity += 1;
      }
      exactParity += 1;
    }
    expect(exactParity).toBe(35);
    expect(genericReferenceParity).toBe(1);
  });

  test("routes the existing 105 natural-language cases through the production resolver", () => {
    let resolved = 0;
    for (const item of RoadworksWaveAProductionRegistry) {
      for (const rawInput of roadworksWaveANaturalLanguageCases(item)) {
        const result = buildEstimateFromInlineWorkPrompt({ rawInput });
        expect(result.draft?.selectedWork?.selectedWorkKey).toBe(item.workId);
        expect(result.draft?.selectedWork?.selectedWorkRawInput).toBe(rawInput);
        expect(result.draft?.items[0]?.sourceParameters?.scopeProfile).toBe(item.scopeProfile);
        const snapshot = result.draft?.items[0]?.sourceParameters?.parameterSnapshot as
          | Record<string, unknown>
          | undefined;
        expect(Object.keys(snapshot ?? {})).toEqual(item.parameterSchema);
        expect(Object.values(snapshot ?? {}).every((value) => value != null)).toBe(true);
        resolved += 1;
      }
    }
    expect(resolved).toBe(105);
  });

  test("preserves canonical revision through serialization, PDF and procurement for all 35", () => {
    let durable = 0;
    let pdfParity = 0;
    let procurementParity = 0;
    for (const [index, item] of RoadworksWaveAProductionRegistry.entries()) {
      const runtime = createAiEstimateRuntime();
      const created = runtime.createDraft({
        estimateDraftId: `wave-a-production-${index}`,
        rawInput: `${item.professionalNameRu} 240 м2 толщина 60 мм`,
        selectedTemplateId: item.templateId,
        selectedWorkKey: item.workId,
        paramOverrides: explicitOverrides(item.workId),
        createdAt: "2026-07-23T00:00:00.000Z",
      });
      expect(created.revision.matchedFamily).toBe(item.workId);
      expect(created.revision.roadScopeBinding).toBeNull();
      expect(created.revision.resolvedIdentity).toMatchObject({
        requestedCatalogWorkId: item.workId,
        passportId: item.professionalPassport.passportId,
        calculationProfileId: item.calculationProfileId,
        canonicalModelId: item.canonicalModelId,
        selectedScope: item.scopeProfile,
        formulaGraphVersion: item.formulaGraphId,
        normativeCompositionId: item.normativeCompositionId,
        semanticFingerprint: item.semanticFingerprint,
        projectionOwner: "estimate_draft_revision",
      });
      expect(created.revision.boq.rows.length).toBeGreaterThan(0);
      expect(created.revision.boq.rows.every((row) => row.rowId.startsWith(`${item.workId}:`))).toBe(true);

      const reopened = JSON.parse(JSON.stringify(created.revision)) as EstimateDraftRevision;
      expect(reopened.selectedTemplateId).toBe(created.revision.selectedTemplateId);
      expect(reopened.matchedFamily).toBe(item.workId);
      expect(reopened.boq).toEqual(created.revision.boq);
      expect(reopened.params).toEqual(created.revision.params);
      durable += 1;

      const pdf = runtime.buildPdfSnapshot({ revision: reopened });
      expect(pdf.snapshot.rows).toEqual(reopened.boq.rows);
      expect(pdf.pdf.rowsHash).toBe(pdf.snapshot.rowsHash);
      expect(pdf.pdf.revisionId).toBe(reopened.revisionId);
      pdfParity += 1;

      const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
      const expectedIds = reopened.boq.rows
        .filter((row) => row.includedInProcurement && !["work", "labor", "document", "other"].includes(row.rowType))
        .map((row) => row.rowId)
        .sort();
      expect(buyer.buyerPackage.items.map((row) => row.rowId).sort()).toEqual(expectedIds);
      expect(validateAiEstimateBuyerPackageParity({
        snapshot: buyer.snapshot,
        buyerPackage: buyer.buyerPackage,
      })).toBe(true);
      procurementParity += 1;
    }
    expect(durable).toBe(35);
    expect(pdfParity).toBe(35);
    expect(procurementParity).toBe(35);
  });

  test("recalculates all 35 work keys as new immutable revisions and invalidates old artifacts", () => {
    let parameterEdits = 0;
    for (const [index, item] of RoadworksWaveAProductionRegistry.entries()) {
      const runtime = createAiEstimateRuntime();
      const initial = runtime.createDraft({
        estimateDraftId: `wave-a-revision-${index}`,
        rawInput: `${item.professionalNameRu} 100 м2 толщина 50 мм`,
        selectedTemplateId: item.templateId,
        selectedWorkKey: item.workId,
        paramOverrides: explicitOverrides(item.workId),
        createdAt: "2026-07-23T01:00:00.000Z",
      });
      const withPdf = runtime.buildPdfSnapshot({ revision: initial.revision });
      const immutablePrevious = JSON.stringify(withPdf.revision);
      const beforeById = new Map(withPdf.revision.boq.rows.map((row) => [row.rowId, row.quantity]));
      const affectedByArea = new Set(
        withPdf.revision.trace.params.find((param) => param.key === "area_m2")?.affectsRowIds ?? [],
      );
      expect(affectedByArea.size).toBeGreaterThan(0);
      const changed = runtime.applyParameterOverride({
        revision: withPdf.revision,
        operation: "update_param",
        paramKey: "area_m2",
        rawValue: "200",
        createdAt: "2026-07-23T01:01:00.000Z",
        revisionIndex: 2,
      });
      expect(changed.revision.previousRevisionId).toBe(initial.revision.revisionId);
      expect(changed.revision.matchedFamily).toBe(item.workId);
      expect(changed.revision.selectedTemplateId).toBe(item.templateId);
      expect(changed.revision.artifacts.pdfArtifactId).toBeNull();
      expect(changed.revision.artifacts.buyerHandoffId).toBeNull();
      expect(changed.diff.changedRowsCount).toBeGreaterThan(0);
      expect(changed.diff.changedRows.every((row) => affectedByArea.has(row.rowId))).toBe(true);
      expect(changed.revision.boq.rows
        .filter((row) => !affectedByArea.has(row.rowId))
        .every((row) => beforeById.get(row.rowId) === row.quantity)).toBe(true);
      expect(changed.revision.boq.rows.map((row) => row.rowId)).toEqual(withPdf.revision.boq.rows.map((row) => row.rowId));
      expect(changed.revision.boq.rows.every((row) => row.rowId.startsWith(`${item.workId}:`))).toBe(true);
      expect(JSON.stringify(withPdf.revision)).toBe(immutablePrevious);

      const changedPdf = runtime.buildPdfSnapshot({ revision: changed.revision });
      expect(changedPdf.pdf.revisionId).toBe(changed.revision.revisionId);
      expect(changedPdf.pdf.rowsHash).toBe(changedPdf.snapshot.rowsHash);
      const changedBuyer = runtime.buildBuyerPackage({ revision: changedPdf.revision, snapshot: changedPdf.snapshot });
      expect(validateAiEstimateBuyerPackageParity({
        snapshot: changedBuyer.snapshot,
        buyerPackage: changedBuyer.buyerPackage,
      })).toBe(true);
      parameterEdits += 1;
    }
    expect(parameterEdits).toBe(35);
  });

  test("keeps every exact request conditional until its P0 and applicability inputs are explicit", () => {
    for (const item of RoadworksWaveAProductionRegistry) {
      const result = buildEstimateFromInlineWorkPrompt({
        rawInput: item.professionalNameRu,
        selectedWorkKey: item.workId,
        selectedTemplateId: item.templateId,
      });
      expect(result.draft?.selectedWork?.selectedWorkKey).toBe(item.workId);
      expect(result.draft?.items).toHaveLength(1);
      expect(result.draft?.items[0]).toMatchObject({
        category: "document",
        unitPrice: null,
        priceStatus: "PRICE_MISSING",
      });
      expect(result.draft?.items[0]?.sourceParameters?.executableAsphaltProfile).toBe(false);
      expect(result.draft?.items[0]?.sourceParameters?.domainResolutionReadiness).toBe("NEEDS_REQUIRED_INPUTS");
      expect(result.draft?.items[0]?.sourceParameters?.includedInProcurement).toBe(false);
      expect(result.draft?.items[0]?.sourceParameters?.assumptionKeys).toEqual(item.parameterSchema);
    }
  });

  test("asks only exact P0 inputs and auto-composes all 35 with versioned P1/P2 defaults", () => {
    let composed = 0;
    for (const [index, item] of RoadworksWaveAProductionRegistry.entries()) {
      const runtime = createAiEstimateRuntime();
      const initial = runtime.createDraft({
        estimateDraftId: `wave-a-ui-p0-${index}`,
        rawInput: item.professionalNameRu,
        selectedTemplateId: item.templateId,
        selectedWorkKey: item.workId,
        createdAt: "2026-08-07T02:00:00.000Z",
      });
      const passport = runtime.buildParameterPassport({ revision: initial.revision });
      const missingCards = passport.cards.filter((card) => card.missing);
      expect(initial.revision.professionalWorkId).toBe(item.workId);
      expect(initial.revision.workSpecificParameterSchemaId).toBe(item.parameterSchemaId);
      expect(initial.revision.workSpecificParameterSignature).toEqual(item.parameterSchema);
      const p0Keys = p0ParameterKeys(item.workId);
      const assumedDefaultKeys = item.parameterDefinitions
        .filter((definition) => definition.tier !== "P0")
        .map((definition) => definition.key);
      expect(initial.revision.missingInputs.map((input) => input.key).sort()).toEqual([...p0Keys].sort());
      expect(missingCards.map((card) => card.key).sort()).toEqual([...p0Keys].sort());
      expect(missingCards.every((card) => card.requiredFor === "contract_ready")).toBe(true);
      expect(missingCards.every((card) => !/[a-z]+_[a-z0-9_]+/i.test(card.labelRu))).toBe(true);
      for (const key of assumedDefaultKeys) {
        expect(initial.revision.params[key]).toMatchObject({
          value: DEFAULT_ROADWORKS_WAVE_A_INPUTS[key],
          source: "default_assumption",
        });
      }

      const completed = runtime.applyParameterBatchOverride({
        revision: initial.revision,
        patches: p0Keys.map((paramKey) => ({
          operation: "replace_assumption" as const,
          paramKey,
          rawValue: String(DEFAULT_ROADWORKS_WAVE_A_INPUTS[paramKey]),
        })),
        createdAt: "2026-08-07T02:01:00.000Z",
        revisionIndex: 2,
      });
      expect(completed.revision.previousRevisionId).toBe(initial.revision.revisionId);
      expect(completed.revision.professionalWorkId).toBe(item.workId);
      expect(completed.revision.missingInputs).toEqual([]);
      expect(runtime.buildParameterPassport({ revision: completed.revision }).cards.filter((card) => card.missing)).toEqual([]);
      expect(completed.revision.boq.rows.length).toBeGreaterThan(1);
      for (const key of assumedDefaultKeys) {
        expect(completed.revision.params[key]?.source).toBe("default_assumption");
      }
      expect(completed.revision.boq.rows.every((row) =>
        row.sourceParameters?.selectedWorkId === item.workId &&
        row.sourceParameters?.executableAsphaltProfile === true &&
        row.sourceParameters?.domainResolutionReadiness === "CALCULATION_READY"
      )).toBe(true);
      expect(typeof completed.revision.params.drainage_outfall_confirmed?.value === "boolean" ||
        completed.revision.params.drainage_outfall_confirmed == null).toBe(true);
      expect(typeof completed.revision.params.base_dry_and_accepted?.value === "boolean" ||
        completed.revision.params.base_dry_and_accepted == null).toBe(true);
      composed += 1;
    }
    expect(composed).toBe(35);
  });
});
