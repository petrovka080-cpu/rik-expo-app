import type { ProfessionalBoqRow } from "../professionalBoq";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";

export function validateNoUnitInheritanceBug(input: {
  primitive: WorldConstructionPrimitive;
  rows: readonly ProfessionalBoqRow[];
}): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  const units = new Set(input.rows.map((row) => row.unit));
  if (input.rows.length >= 8 && units.size === 1 && units.has(input.primitive.unit) && input.primitive.unit !== "set") {
    failures.push(`ALL_ROWS_INHERIT_PROMPT_UNIT:${input.primitive.unit}`);
  }
  for (const row of input.rows) {
    const text = `${row.code} ${row.nameRu}`.toLocaleLowerCase("ru-RU");
    if (/(delivery|mobilization|waste|logistics|доставка|мобилизац)/.test(text) && row.unit === "sq_m") {
      failures.push(`DELIVERY_ROW_PRICED_AS_AREA:${row.code}`);
    }
    if (row.sectionType === "equipment" && /(equipment|crane|lift|rig|tools|техник|кран|автовыш|буров)/.test(text) && row.unit === "sq_m") {
      failures.push(`EQUIPMENT_ROW_PRICED_AS_AREA:${row.code}`);
    }
    if (row.sectionType === "materials" && /(steel|beam|truss|column|metal|ферм|балк|колонн|металл)/.test(text) && row.unit === "sq_m") {
      failures.push(`STEEL_ROW_PRICED_AS_AREA:${row.code}`);
    }
    if (/(concrete|бетон)/.test(text) && row.sectionType === "materials" && row.unit === "sq_m") {
      failures.push(`CONCRETE_ROW_PRICED_AS_AREA:${row.code}`);
    }
  }
  return { passed: failures.length === 0, failures };
}
