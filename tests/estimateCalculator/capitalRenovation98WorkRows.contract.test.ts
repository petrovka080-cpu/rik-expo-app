import { calculateCapitalRenovationFromPrompt } from "../../src/features/estimates/calculator/families/capitalRenovationCalculator";
import { CAPITAL_RENOVATION_98_PROMPT } from "./capitalRenovationTestHelpers";

describe("capital renovation 98 work rows", () => {
  it("keeps engineering systems, doors and logistics as their own norm rows", () => {
    const estimate = calculateCapitalRenovationFromPrompt(CAPITAL_RENOVATION_98_PROMPT);
    expect(estimate).toBeTruthy();

    const quantities = new Map(estimate!.rows.map((row) => [row.code, row.quantity]));
    expect(quantities.get("capreno_electrical_install_work")).toBe(78);
    expect(quantities.get("capreno_electrical_cable_m")).toBe(546);
    expect(quantities.get("capreno_electrical_conduit_m")).toBe(468);
    expect(quantities.get("capreno_socket_boxes_pcs")).toBe(78);
    expect(quantities.get("capreno_electrical_panel_pcs")).toBe(1);
    expect(quantities.get("capreno_breakers_pcs")).toBe(18);
    expect(quantities.get("capreno_water_points_work")).toBe(14);
    expect(quantities.get("capreno_sewer_points_work")).toBe(8);
    expect(quantities.get("capreno_water_pipe_m")).toBe(91);
    expect(quantities.get("capreno_sewer_pipe_m")).toBe(44);
    expect(quantities.get("capreno_valves_pcs")).toBe(20);
    expect(quantities.get("capreno_doors_install_work")).toBe(6);
    expect(quantities.get("capreno_foam_cans")).toBe(6);
    expect(quantities.get("capreno_material_delivery_trips")).toBe(4);
    expect(estimate!.rows.map((row) => row.titleRu).join("\n")).not.toMatch(/Комплект расходных изделий|работы на объекте/i);
  });
});
