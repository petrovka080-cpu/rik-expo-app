import { validateAiEstimateBuyerPackageParity } from "../../src/lib/estimate/artifacts/validateAiEstimateBuyerPackageParity";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import type { EstimateDraftRevision } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { buildConsumerRepairDraftFromExactRoadworksWaveARuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  ROADWORKS_WAVE_A_MIGRATION_VERSION,
  RoadworksWaveAInventory,
  RoadworksWaveAProductionRegistry,
  buildRoadworksWaveAProductionRegistry,
  buildRoadworksWaveAProductionDraft,
  buildRoadworksWaveAProfessionalPassportV4,
  getRoadworksWaveAParameterDefinitions,
  getRoadworksWaveAParameterKeys,
  roadworksWaveANaturalLanguageCases,
  type RoadworksWaveAParameterKey,
} from "../../src/lib/estimate/v4/roadworks";

function requiredRoadworksWaveADefault(
  key: RoadworksWaveAParameterKey,
): string | number | boolean {
  const value = DEFAULT_ROADWORKS_WAVE_A_INPUTS[key];
  if (value === undefined) throw new Error(`ROADWORKS_WAVE_A_DEFAULT_MISSING:${key}`);
  return value;
}

function explicitOverrides(workId: string) {
  return Object.fromEntries(getRoadworksWaveAParameterKeys(workId).map((key) => [
    key,
    {
      value: requiredRoadworksWaveADefault(key),
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
  test("defers professional passport projections until their exact registration is used", () => {
    const builtWorkIds: string[] = [];
    const inventory = RoadworksWaveAInventory.slice(0, 2);
    const registry = buildRoadworksWaveAProductionRegistry(
      inventory,
      (workId) => {
        builtWorkIds.push(workId);
        return buildRoadworksWaveAProfessionalPassportV4(workId);
      },
    );

    expect(registry).toHaveLength(2);
    expect(builtWorkIds).toEqual([]);

    expect(registry[0].professionalPassport.passportId).toBeTruthy();
    expect(registry[0].formulaGraphId).toBeTruthy();
    expect(registry[0].normativeCompositionId).toBeTruthy();
    expect(registry[0].semanticFingerprint).toBeTruthy();
    expect(builtWorkIds).toEqual([registry[0].workId]);

    expect(registry[1].parameterSchema.length).toBeGreaterThan(0);
    expect(registry[1].parameterDefinitions.length).toBeGreaterThan(0);
    expect(builtWorkIds).toEqual([registry[0].workId]);
  });

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
        expect(Object.keys(snapshot ?? {}).every((key) => item.parameterSchema.includes(key as RoadworksWaveAParameterKey))).toBe(true);
        expect(Object.values(snapshot ?? {}).every((value) => value != null)).toBe(true);
        expect(snapshot?.area_m2).toBeGreaterThan(0);
        expect(result.canBuildPreliminaryEstimate).toBe(false);
        expect(result.draft?.items[0]?.sourceParameters?.domainResolutionReadiness).not.toBe("CALCULATION_READY");
        expect(result.draft?.items.some((row) => row.sourceParameters?.rowCode === `${item.workId}:applicability_blocker`)).toBe(false);
        expect(result.draft?.items.some((row) => /:mix$|:tack_coat$/u.test(String(row.sourceParameters?.rowCode)))).toBe(false);
        expect(result.draft?.items.every((row) => {
          const affectedBy = row.sourceParameters?.affectedBy;
          return !Array.isArray(affectedBy) || affectedBy.every((key) => key in (snapshot ?? {}));
        })).toBe(true);
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

  test("keeps fixture examples non-executable and preserves only lawful source-fixed values", () => {
    for (const item of RoadworksWaveAProductionRegistry) {
      const result = buildEstimateFromInlineWorkPrompt({
        rawInput: item.professionalNameRu,
        selectedWorkKey: item.workId,
        selectedTemplateId: item.templateId,
      });
      expect(result.draft?.selectedWork?.selectedWorkKey).toBe(item.workId);
      expect(result.canBuildPreliminaryEstimate).toBe(false);
      expect(result.blockingReason).toBe("NEEDS_REQUIRED_INPUTS");
      expect(result.draft?.items.length).toBeGreaterThan(0);
      expect(result.draft?.items[0]?.sourceParameters?.executableAsphaltProfile).toBe(false);
      expect(result.draft?.items[0]?.sourceParameters?.domainResolutionReadiness).toBe("NEEDS_REQUIRED_INPUTS");
      const metadata = result.draft?.items[0]?.sourceParameters?.roadworksWaveAParameterMetadata as
        | Record<string, Record<string, unknown>>
        | undefined;
      const snapshot = result.draft?.items[0]?.sourceParameters?.parameterSnapshot as
        | Record<string, unknown>
        | undefined;
      const sourceFixedKeys = item.parameterDefinitions
        .filter((definition) => definition.sourceFixedBinding)
        .map((definition) => definition.key);
      expect(Object.keys(snapshot ?? {})).toEqual(sourceFixedKeys);
      expect(result.draft?.items[0]?.sourceParameters?.unresolvedParameterKeys).toEqual(
        item.parameterSchema.filter((key) => !sourceFixedKeys.includes(key)),
      );
      expect(result.draft?.items[0]?.sourceParameters?.applicabilityBlockers).toEqual(expect.arrayContaining(
        item.parameterSchema
          .filter((key) => !sourceFixedKeys.includes(key))
          .map((key) => expect.stringMatching(`(?:required_input|normative_source)_missing:${key}`)),
      ));
      expect(Object.values(metadata ?? {}).every((raw) =>
        raw.defaultValue === null && raw.defaultSourceId === null &&
        raw.defaultSourceType === "NON_EXECUTABLE_REFERENCE_EXAMPLE"
      )).toBe(true);
      for (const key of sourceFixedKeys) {
        expect(metadata?.[key]).toMatchObject({
          valueAdmissionState: "CONFIRMED_SOURCE_FIXED",
          calculationAllowed: true,
          contractSourceConfirmed: true,
        });
      }
    }
  });

  test("keeps unresolved values editable and recalculates after explicit preliminary inputs", () => {
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
      const sourceFixedKeys = item.parameterDefinitions
        .filter((definition) => definition.sourceFixedBinding)
        .map((definition) => definition.key);
      const unresolvedKeys = p0Keys.filter((key) => !sourceFixedKeys.includes(key));
      expect(initial.revision.missingInputs.map((entry) => entry.key)).toEqual(unresolvedKeys);
      expect(missingCards.map((card) => card.key).sort()).toEqual(unresolvedKeys.slice().sort());
      expect(initial.revision.boq.rows.length).toBeGreaterThan(0);
      for (const key of unresolvedKeys) {
        expect(initial.revision.params[key]).toBeUndefined();
        expect(initial.revision.assumptions.find((assumption) => assumption.key === key)).toMatchObject({
          value: null,
          visibleToUser: true,
          replacedByUserInput: false,
        });
      }
      for (const key of sourceFixedKeys) {
        expect(initial.revision.params[key]).toMatchObject({
          value: DEFAULT_ROADWORKS_WAVE_A_INPUTS[key],
          source: "derived",
        });
      }

      const completed = runtime.applyParameterBatchOverride({
        revision: initial.revision,
        patches: unresolvedKeys.map((paramKey) => ({
          operation: "add_param" as const,
          paramKey,
          rawValue: String(DEFAULT_ROADWORKS_WAVE_A_INPUTS[paramKey]),
        })),
        createdAt: "2026-08-07T02:01:00.000Z",
        revisionIndex: 2,
      });
      expect(completed.revision.previousRevisionId).toBe(initial.revision.revisionId);
      expect(completed.revision.professionalWorkId).toBe(item.workId);
      expect(completed.revision.missingInputs.map((entry) => entry.key)).toEqual([]);
      expect(runtime.buildParameterPassport({ revision: completed.revision }).cards.filter((card) => card.missing)).toEqual([]);
      expect(completed.revision.boq.rows.length).toBeGreaterThan(1);
      for (const key of sourceFixedKeys) expect(completed.revision.params[key]?.source).toBe("derived");
      for (const key of unresolvedKeys) expect(completed.revision.params[key]?.source).toBe("user_input");
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

  test("does not infer 61.8 t or 150 l for 500 m2, but preserves the arithmetic for explicit preliminary inputs", () => {
    const item = RoadworksWaveAProductionRegistry.find((candidate) =>
      candidate.technologyFamily === "asphalt_surface_repair" && candidate.scopeProfile === "standard"
    );
    if (!item) throw new Error("ROADWORKS_REPAIR_STANDARD_FIXTURE_MISSING");
    const rawInput = "ремонт асфальтового покрытия в стандартной зоне 500 кв метров";
    const unresolved = buildEstimateFromInlineWorkPrompt({
      rawInput,
      selectedWorkKey: item.workId,
      selectedTemplateId: item.templateId,
    });
    const unresolvedRowIds = unresolved.draft?.items.map((row) => String(row.sourceParameters?.rowCode)) ?? [];
    expect(unresolved.canBuildPreliminaryEstimate).toBe(false);
    expect(unresolved.blockingReason).toBe("NEEDS_REQUIRED_INPUTS");
    expect(unresolvedRowIds).not.toEqual(expect.arrayContaining([
      `${item.workId}:mix`,
      `${item.workId}:tack_coat`,
      `${item.workId}:removed_asphalt_stream`,
    ]));
    expect(unresolved.draft?.items.some((row) => row.quantity === 61.8 || row.quantity === 150)).toBe(false);

    const explicit = buildEstimateFromInlineWorkPrompt({
      rawInput,
      selectedWorkKey: item.workId,
      selectedTemplateId: item.templateId,
      paramOverrides: {
        ...explicitOverrides(item.workId),
        area_m2: {
          value: 500,
          source: "user_input",
        },
      },
    });
    const byRowId = new Map(explicit.draft?.items.map((row) => [String(row.sourceParameters?.rowCode), row]));
    expect(byRowId.get(`${item.workId}:mix`)?.quantity).toBe(61.8);
    expect(byRowId.get(`${item.workId}:tack_coat`)?.quantity).toBe(150);
    expect(byRowId.get(`${item.workId}:removed_asphalt_stream`)?.quantity).toBe(60);
    expect(explicit.draft?.items.filter((row) => /асфальтобетонная смесь/iu.test(row.titleRu))).toHaveLength(1);
    expect(explicit.draft?.items.some((row) => /(?:песок|щебень|битум(?!ная эмульсия))/iu.test(row.titleRu))).toBe(false);
    expect(byRowId.get(`${item.workId}:mix`)?.sourceParameters).toMatchObject({
      executableAsphaltProfile: true,
      domainResolutionReadiness: "CALCULATION_READY",
    });
    const bindingSource = explicit.draft?.items.find((row) =>
      row.sourceParameters?.roadworksWaveAParameterMetadata
    )?.sourceParameters;
    expect(bindingSource).toMatchObject({
      contractSourcesComplete: true,
      calculationInputsComplete: true,
    });
    expect(byRowId.get(`${item.workId}:mix`)?.sourceParameters?.includedInProcurement).toBe(true);
    expect(byRowId.get(`${item.workId}:removed_asphalt_stream`)?.sourceParameters?.includedInProcurement).toBe(false);
  });
});
