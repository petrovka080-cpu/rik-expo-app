import type { ProfessionalBoqResult, ProfessionalBoqRow } from "./professionalBoqTypes";

const forbidden = [
  /^Строительные работы$/i,
  /^Общие работы$/i,
  /^Прочие работы$/i,
  /^Ремонтные работы$/i,
  /^Ремонтные работы после согласования$/i,
  /^Материалы по согласованию$/i,
  /^Работы по согласованию$/i,
  /^Локальные строительные работы$/i,
  /^Осмотр$/i,
];

export function isGenericBoqRow(row: Pick<ProfessionalBoqRow, "nameRu">): boolean {
  return forbidden.some((pattern) => pattern.test(row.nameRu.trim()));
}

export function validateNoGenericRows(result: ProfessionalBoqResult): { passed: boolean; failures: string[] } {
  const failures = result.sections.flatMap((section) =>
    section.rows.filter(isGenericBoqRow).map((row) => `generic_row:${section.type}:${row.code}:${row.nameRu}`),
  );
  return { passed: failures.length === 0, failures };
}
