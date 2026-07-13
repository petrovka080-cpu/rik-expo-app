import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { recalculateEstimateDraftRevision } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { validateEstimateDraftRevision } from "../../src/lib/estimate/validateEstimateDraftRevision";

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
