import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { recalculateEstimateDraftRevision } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { runEditableParamRevisionAcceptanceCorpus } from "../../scripts/estimate/editableParamRevisionAcceptanceCases";

function recalc(prompt: string, paramKey: string, rawValue: string) {
  const r1 = createEstimateDraftRevision({
    estimateDraftId: `accept-${paramKey}`,
    rawInput: prompt,
    createdAt: "2026-07-07T00:00:00.000Z",
  });
  const patch = parseUserParamPatch({
    revision: r1,
    operation: r1.params[paramKey] ? "update_param" : "add_param",
    paramKey,
    rawValue,
  });
  return {
    r1,
    ...recalculateEstimateDraftRevision(r1, patch, {
      createdAt: "2026-07-07T00:01:00.000Z",
      revisionIndex: 2,
    }),
  };
}

describe("editable param revision acceptance", () => {
  it("passes the production critical editable-param revision corpus", () => {
    const result = runEditableParamRevisionAcceptanceCorpus();

    expect(result.cases_run).toBe(400);
    expect(result.cases_passed).toBe(400);
    expect(result.template_lost_after_edit_count).toBe(0);
    expect(result.param_update_failures).toBe(0);
    expect(result.assumption_replacement_failures).toBe(0);
    expect(result.recalc_failures).toBe(0);
    expect(result.stale_pdf_failures).toBe(0);
    expect(result.stale_buyer_failures).toBe(0);
  }, 60000);

  it("recalculates gabion quantities and keeps selected template", () => {
    const { r1, revision: r2, diff } = recalc(
      "габион стена длина 150 метров высота 30 метров толщина 1 метр",
      "length_m",
      "100 м",
    );
    expect(r1.params.volume_m3.value).toBe(4500);
    expect(r2.params.volume_m3.value).toBe(3000);
    expect(r2.selectedTemplateId).toBe(r1.selectedTemplateId);
    expect(diff.changedRowsCount).toBeGreaterThan(0);
    expect(r2.trace.rows.some((row) => row.resultQuantity !== 0)).toBe(true);
  });

  it("recalculates ventilated facade area without stale artifacts", () => {
    const { r1, revision: r2, diff } = recalc(
      "вентфасад под ключ 1500 кв метров",
      "area_m2",
      "800 м2",
    );
    expect(r2.matchedFamily).toBe("ventilated_facade");
    expect(r2.params.area_m2.value).toBe(800);
    expect(r2.selectedTemplateId).toBe(r1.selectedTemplateId);
    expect(diff.changedRowsCount).toBeGreaterThan(0);
    expect(r2.artifacts.artifactsValidForRevisionId).toBeNull();
  });

  it("recalculates infrastructure families with line length edits", () => {
    const cases = [
      ["водоснабжение села 5 км труба ПЭ100 d110", "length_m", "3000 м"],
      ["дорога села 2 км ширина 7 м, полная дорожная одежда, щебень и асфальт", "length_m", "1000 м"],
      ["ЛЭП 10 кВ 2 км шаг опор 50 м", "length_m", "1000 м"],
      ["мост 30 м 2 полосы свайное основание", "length_m", "60 м"],
      ["тоннель 500 м сечением 40 м2", "length_m", "250 м"],
    ] as const;

    for (const [prompt, paramKey, rawValue] of cases) {
      const { r1, revision: r2, diff } = recalc(prompt, paramKey, rawValue);
      expect(r1.selectedTemplateId).toBeTruthy();
      expect(r2.selectedTemplateId).toBe(r1.selectedTemplateId);
      expect(diff.changedRowsCount).toBeGreaterThan(0);
      expect(r2.trace.selectedTemplateId).toBe(r2.selectedTemplateId);
    }
  });
});
