import {
  buildProfessionalEstimateSnapshot,
  detectCrossDomainRowLeaks,
  resolveProfessionalWorkTemplate,
} from "../../src/lib/ai/professionalEstimateTemplates";
import { resolveConstructionWorkOntologyIntent } from "../workOntology/workOntologyTestHelpers";

describe("operation object carpet estimate isolation", () => {
  it("builds carpet snapshot from ukladka kovrolina without masonry leakage", () => {
    const intent = resolveConstructionWorkOntologyIntent("укладка ковролина 100 м2");
    expect(intent.selected_work_key).toBe("carpet_laying");
    expect(intent.category).toBe("flooring");

    const template = resolveProfessionalWorkTemplate(intent.selected_work_key!);
    expect(template?.canonical_work_key).toBe("carpet_laying");
    expect(template?.group_key).toBe("flooring");
    expect(template?.material_recipe_rows.every((row) => row.allowed_work_keys.includes("carpet_laying"))).toBe(true);
    expect(template?.material_recipe_rows.every((row) => row.source_policy === "work_specific_template")).toBe(true);

    const snapshot = buildProfessionalEstimateSnapshot({
      selected_work_key: intent.selected_work_key!,
      quantity: 100,
      unit: "m2",
      region: "KG_BISHKEK",
    });
    const rowText = snapshot.lines.map((line) => `${line.row_key} ${line.material_key ?? ""} ${line.row_domain}`).join("\n");

    expect(snapshot.group_key).toBe("flooring");
    expect(snapshot.lines.every((line) => line.row_domain === "flooring")).toBe(true);
    expect(rowText).not.toMatch(/brick|masonry|concrete|rebar|foundation/i);
    expect(detectCrossDomainRowLeaks({
      selected_work_key: "carpet_laying",
      expected_domain: "flooring",
      rows: snapshot.lines,
    })).toHaveLength(0);
  });
});
