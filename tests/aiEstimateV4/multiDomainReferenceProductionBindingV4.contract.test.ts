import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { MULTI_DOMAIN_REFERENCE_PASSPORTS_V4 } from "../../src/lib/estimate/v4/multiDomainReferencePassportsV4";
import { MULTI_DOMAIN_REFERENCE_NLP_PROMPTS_V4 } from "../../src/lib/estimate/v4/multiDomainReferenceNlpV4";
import { MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4 } from "../fixtures/multiDomainReferenceGoldensV4";
import { ASPHALT_V4_RUNTIME_TEMPLATE_ID } from "../../src/lib/estimate/v4/asphalt";
import { applyAiEstimateParameterOverride } from "../../src/lib/estimate/applyAiEstimateParameterOverrides";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";

describe("multi-domain reference production binding V4", () => {
  test("ordinary owner prompt stays on strip-foundation clarification and never enters the high-rise calculator", () => {
    const prompt = "устройство ленточного фундамента 100 метров длина и 20 метров ширина";
    const result = buildEstimateFromInlineWorkPrompt({ rawInput: prompt, currency: "KGS" });
    expect(result.draft?.titleRu).toBe("Устройство монолитного железобетонного ленточного фундамента");
    expect(result.draft?.selectedWork).toMatchObject({
      selectedCatalogWorkId: "canonical-work:expanded:strip_foundation",
      selectedWorkKey: "strip_foundation",
    });
    expect(result.draft?.missingData).toEqual(expect.arrayContaining([
      "Подтвердите общую длину фундаментных лент по осям.",
      "Укажите ширину и высоту сечения фундаментной ленты.",
      "Выберите полный конструктив или только укладку бетонной смеси.",
      "Подтвердите применимость земляных работ, подготовки, гидроизоляции и обратной засыпки.",
      "Укажите проектную массу арматуры и требуемые характеристики бетона для полного конструктива.",
    ]));
    const serialized = JSON.stringify(result.draft).toLocaleLowerCase("ru-RU");
    expect(serialized).not.toMatch(/12\s*000|12\s+этаж|несущий каркас|ограждающие конструкции|фасад/iu);
    expect(result.canBuildPreliminaryEstimate).toBe(false);
    expect(result.pdfMappingValid).toBe(false);
    expect(result.buyerHandoffMappingValid).toBe(false);
    expect(result.blockingReason).toBe("canonical_backend_handoff_required");
    expect(result.draft?.items).toEqual([
      expect.objectContaining({
        templateId: "strip_foundation_preliminary_boq_expanded_complex_v1",
        sourceParameters: expect.objectContaining({
          canonicalBackendHandoffRequired: true,
          p0GateOnly: true,
          source_length_mention_m: 100,
          source_width_mention_m: 20,
          total_axis_length_m: null,
          strip_width_m: null,
          strip_height_m: null,
        }),
      }),
    ]);

    const revision = createEstimateDraftRevision({
      rawInput: prompt,
      currency: "KGS",
      createdAt: "2026-09-06T00:00:00.000Z",
    });
    expect(revision.selectedTemplateId).toBe("strip_foundation_preliminary_boq_expanded_complex_v1");
    expect(revision.matchedFamily).toBe("strip_foundation");
    expect(revision.estimateLevel).toBe("NEEDS_INPUT");
    expect(revision.missingInputs.map((item) => item.key)).toEqual(expect.arrayContaining([
      "total_axis_length_m", "strip_width_m", "strip_height_m",
    ]));
    expect(revision.missingInputs.map((item) => item.key)).not.toEqual(expect.arrayContaining([
      "area_m2", "length_m", "width_m", "floors", "structural_concrete_m3",
    ]));
    expect(revision.status).toBe("needs_more_params_but_preliminary_available");
  });

  test.each(MULTI_DOMAIN_REFERENCE_PASSPORTS_V4)(
    "$catalogWorkId enters the production prompt builder and revision flow",
    (passport) => {
      const prompt = MULTI_DOMAIN_REFERENCE_NLP_PROMPTS_V4.find((item) =>
        item.catalogWorkId === passport.catalogWorkId && item.variant === "professional")!;
      const fixture = MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4.find((item) =>
        item.catalogWorkId === passport.catalogWorkId && item.scenario === "normal")!;
      const paramOverrides = Object.fromEntries(Object.entries(fixture.inputs).map(([key, value]) => [
        key,
        { value, source: "user_input" as const, lastChangedAt: "2026-07-23T00:00:00.000Z" },
      ]));
      const result = buildEstimateFromInlineWorkPrompt({
        rawInput: prompt.text,
        paramOverrides,
        currency: "KGS",
      });
      if (passport.catalogWorkId === "strip_foundation") {
        expect(result).toMatchObject({
          canBuildPreliminaryEstimate: false,
          blockingReason: "canonical_backend_handoff_required",
          pdfMappingValid: false,
          buyerHandoffMappingValid: false,
        });
        expect(result.draft?.items).toEqual([
          expect.objectContaining({
            templateId: "strip_foundation_preliminary_boq_expanded_complex_v1",
            sourceParameters: expect.objectContaining({
              canonicalBackendHandoffRequired: true,
              p0GateOnly: true,
            }),
          }),
        ]);
        const revision = createEstimateDraftRevision({
          rawInput: prompt.text,
          paramOverrides,
          currency: "KGS",
          createdAt: "2026-07-23T00:00:00.000Z",
        });
        expect(revision).toMatchObject({
          selectedTemplateId: "strip_foundation_preliminary_boq_expanded_complex_v1",
          matchedFamily: "strip_foundation",
          estimateLevel: "NEEDS_INPUT",
        });
        return;
      }
      expect(result.canBuildPreliminaryEstimate).toBe(true);
      if (passport.catalogWorkId !== "asphalt_pavement") {
        expect(result.draft?.selectedWork?.selectedWorkKey).toBe(passport.catalogWorkId);
        expect(result.draft?.items.length).toBe(passport.boq.length);
        expect(result.draft?.items.every((item) =>
          item.sourceParameters?.professionalEstimatePassportId === passport.professionalEstimatePassportId &&
          item.sourceParameters?.formulaGraphVersion === passport.formulaGraphVersion)).toBe(true);
      }
      const revision = createEstimateDraftRevision({
        rawInput: prompt.text,
        paramOverrides,
        currency: "KGS",
        createdAt: "2026-07-23T00:00:00.000Z",
      });
      expect(revision.selectedTemplateId).toBe(
        passport.catalogWorkId === "asphalt_pavement"
          ? ASPHALT_V4_RUNTIME_TEMPLATE_ID
          : passport.professionalEstimatePassportId,
      );
      if (passport.catalogWorkId !== "asphalt_pavement") {
        expect(revision.matchedFamily).toBe(passport.catalogWorkId);
        expect(revision.boq.rows).toHaveLength(passport.boq.length);
        const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });
        expect(cards.map((card) => card.key)).toEqual(expect.arrayContaining(
          passport.parameters.map((parameter) => parameter.parameterId),
        ));
        const editedParameter = passport.parameters.find((parameter) => parameter.requiredLevel === "P0")!;
        const previousRows = revision.boq.rows.map((row) => ({ rowId: row.rowId, quantity: row.quantity }));
        const edited = applyAiEstimateParameterOverride({
          revision,
          operation: "update_param",
          paramKey: editedParameter.parameterId,
          rawValue: String(fixture.inputs[editedParameter.parameterId] * 2),
          createdAt: "2026-07-23T00:01:00.000Z",
          revisionIndex: 2,
        });
        expect(edited.revision.previousRevisionId).toBe(revision.revisionId);
        expect(edited.revision.revisionId).not.toBe(revision.revisionId);
        expect(edited.diff.changedRows.length).toBeGreaterThan(0);
        expect(revision.boq.rows.map((row) => ({ rowId: row.rowId, quantity: row.quantity }))).toEqual(previousRows);
        const runtime = createAiEstimateRuntime();
        const pdf = runtime.buildPdfSnapshot({ revision });
        const buyer = runtime.buildBuyerPackage({ revision, snapshot: pdf.snapshot });
        expect(pdf.pdf.rowsEqualLatestRevision).toBe(true);
        expect(pdf.pdf.body).not.toMatch(/\b(?:undefined|NaN)\b/u);
        expect(buyer.buyerPackage.revisionId).toBe(revision.revisionId);
        expect(new Set(buyer.buyerPackage.items.map((item) => item.rowId)).size)
          .toBe(buyer.buyerPackage.items.length);
      }
    },
  );

  test.each(MULTI_DOMAIN_REFERENCE_PASSPORTS_V4)(
    "$catalogWorkId exposes a P0 gate without hidden required defaults",
    (passport) => {
      const prompt = MULTI_DOMAIN_REFERENCE_NLP_PROMPTS_V4.find((item) =>
        item.catalogWorkId === passport.catalogWorkId && item.variant === "professional")!;
      const result = buildEstimateFromInlineWorkPrompt({ rawInput: prompt.text, currency: "KGS" });
      if (passport.catalogWorkId === "strip_foundation") {
        expect(result.blockingReason).toBe("canonical_backend_handoff_required");
        expect(result.draft?.items[0]?.sourceParameters?.canonicalBackendHandoffRequired).toBe(true);
        return;
      }
      if (passport.catalogWorkId === "asphalt_pavement") {
        expect(result.v4ClarificationExperience).not.toBeNull();
        return;
      }
      expect(result.draft?.selectedWork?.selectedWorkKey).toBe(passport.catalogWorkId);
      expect(result.draft?.missingData.length).toBe(
        passport.parameters.filter((parameter) => parameter.requiredLevel === "P0").length,
      );
      expect(result.draft?.items).toHaveLength(1);
      expect(result.draft?.items[0].sourceParameters?.p0GateOnly).toBe(true);
      const revision = createEstimateDraftRevision({
        rawInput: prompt.text,
        currency: "KGS",
        createdAt: "2026-07-23T00:00:00.000Z",
      });
      expect(revision.missingInputs.map((item) => item.key)).toEqual(expect.arrayContaining(
        passport.parameters
          .filter((parameter) => parameter.requiredLevel === "P0")
          .map((parameter) => parameter.parameterId),
      ));
    },
  );
});
