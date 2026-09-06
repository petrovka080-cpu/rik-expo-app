import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { recalculateEstimateDraftRevision } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { validateEstimateDraftRevision } from "../../src/lib/estimate/validateEstimateDraftRevision";
import { resolveRegisteredProfessionalEstimateSelectionV1 } from "../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1";
import {
  createRegisteredProfessionalDomainAuditRevision,
  recalculateRegisteredProfessionalDomainAuditRevision,
} from "../../scripts/estimate/registeredProfessionalDomainAuditAdapter";

describe("editable param 11610 readiness", () => {
  it("keeps every work passport editable via template-locked revision recalculation", () => {
    const ids = listProfessionalWorkPassportTemplateIds();
    let ready = 0;
    const blockers: string[] = [];

    for (const [index, templateId] of ids.entries()) {
      const passport = buildProfessionalWorkPassport(templateId);
      if (!passport) {
        blockers.push(`${templateId}:passport_missing`);
        continue;
      }
      const registeredSelection = resolveRegisteredProfessionalEstimateSelectionV1(templateId);
      if (registeredSelection) {
        try {
          const r1 = createRegisteredProfessionalDomainAuditRevision({
            templateId,
            estimateDraftId: `readiness-${index}`,
            // The registered catalog includes technologies whose formulas
            // genuinely require perimeter geometry (for example flat drywall
            // ceilings). Supply both exact dimensions; the backend must not
            // invent them from area alone.
            rawInput: `${registeredSelection.title_ru} площадь 100 м2 длина 10 м ширина 10 м`,
            createdAt: "2026-07-07T00:00:00.000Z",
            paramOverrides: registeredSelection.canonical_parameter_schema.definitions.some(
              (definition) => definition.parameterId === "normative_rate_code",
            ) ? {
              normative_rate_code: {
                value: "PROJECT-VERIFIED-EXACT-RATE-CODE",
                source: "user_input",
                sourceText: "readiness-fixture:project-confirmed-normative-rate",
                lastChangedAt: "2026-07-07T00:00:00.000Z",
              },
            } : undefined,
          });
          const candidate = r1.trace.params
            .filter((parameter) =>
              parameter.affectsRowIds.length > 0 &&
              typeof r1.params[parameter.key]?.value === "number"
            )
            .sort((left, right) => right.affectsRowIds.length - left.affectsRowIds.length)[0];
          if (!candidate) {
            blockers.push(`${templateId}:registered_editable_parameter_missing`);
            continue;
          }
          const before = Number(r1.params[candidate.key].value);
          const { revision: r2, diff } = recalculateRegisteredProfessionalDomainAuditRevision({
            previous: r1,
            operation: "update_param",
            paramKey: candidate.key,
            rawValue: String(before + 1),
            createdAt: "2026-07-07T00:01:00.000Z",
            revisionIndex: 2,
          });
          const validation = validateEstimateDraftRevision(r2);
          const r1Source = r1.boq.rows.find(
            (row) => row.sourceParameters?.professionalDomainFactoryV1 === true,
          )?.sourceParameters;
          const r2Source = r2.boq.rows.find(
            (row) => row.sourceParameters?.professionalDomainFactoryV1 === true,
          )?.sourceParameters;
          const expectedPassportId = r1Source?.professionalEstimatePassportId;
          const expectedWorkKey = r1Source?.workKey;
          const expectedCatalogId = r1Source?.catalogId;
          if (
            expectedPassportId === r1.selectedTemplateId &&
            expectedPassportId === r2.selectedTemplateId &&
            r1.resolvedIdentity?.passportId === expectedPassportId &&
            r2.resolvedIdentity?.passportId === expectedPassportId &&
            r1.resolvedIdentity?.requestedCatalogWorkId === expectedWorkKey &&
            r2.resolvedIdentity?.requestedCatalogWorkId === expectedWorkKey &&
            r1Source?.requestedCatalogWorkId === expectedWorkKey &&
            r2Source?.requestedCatalogWorkId === expectedWorkKey &&
            r2Source?.professionalEstimatePassportId === expectedPassportId &&
            r2Source?.catalogId === expectedCatalogId &&
            registeredSelection.catalog_id === expectedCatalogId &&
            (expectedCatalogId === expectedWorkKey || expectedCatalogId === `expanded-template:${expectedWorkKey}`) &&
            r2.previousRevisionId === r1.revisionId &&
            r2.params[candidate.key]?.value === before + 1 &&
            r2.params[candidate.key]?.source === "edited_by_user" &&
            r2.boq.rows.length > 0 &&
            diff.changedRowsCount > 0 &&
            validation.valid
          ) {
            ready += 1;
          } else {
            blockers.push(`${templateId}:${validation.failures.join("|") || "registered_editable_revision_failed"}`);
          }
        } catch (error) {
          blockers.push(`${templateId}:${error instanceof Error ? error.message : "registered_editable_revision_failed"}`);
        }
        continue;
      }
      const r1 = createEstimateDraftRevision({
        estimateDraftId: `readiness-${index}`,
        rawInput: `${passport.localizedNameRu} 100 м2`,
        selectedTemplateId: templateId,
        selectedTemplateName: passport.localizedNameRu,
        createdAt: "2026-07-07T00:00:00.000Z",
      });
      const patch = parseUserParamPatch({
        revision: r1,
        operation: r1.params.area_m2 ? "update_param" : "add_param",
        paramKey: "area_m2",
        rawValue: "80 м2",
      });
      const { revision: r2 } = recalculateEstimateDraftRevision(r1, patch, {
        createdAt: "2026-07-07T00:01:00.000Z",
        revisionIndex: 2,
      });
      const validation = validateEstimateDraftRevision(r2);
      if (
        r1.selectedTemplateId === templateId &&
        r2.selectedTemplateId === templateId &&
        r2.previousRevisionId === r1.revisionId &&
        r2.params.area_m2?.value === 80 &&
        r2.boq.rows.length > 0 &&
        validation.valid
      ) {
        ready += 1;
      } else {
        blockers.push(`${templateId}:${validation.failures.join("|") || "editable_revision_failed"}`);
      }
      if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
    }

    clearProfessionalWorkPassportBuildCaches();
    expect(ids).toHaveLength(11610);
    expect(blockers.slice(0, 10)).toEqual([]);
    expect(ready).toBe(11610);
  }, 180000);
});
