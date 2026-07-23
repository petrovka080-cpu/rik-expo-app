import { deterministicNormalizedSourceHash } from "./professionalOntologyContracts";
import type { MultiDomainReferencePassportV4, ReferenceFormulaNodeV4 } from "./multiDomainReferencePassportsV4";

export type ReferenceSourceClaimTypeV4 =
  | "WORK_IDENTITY" | "APPLICABILITY" | "QUANTITY_NORM" | "MATERIAL_CONSUMPTION"
  | "PRODUCTIVITY" | "EQUIPMENT" | "QUALITY_CONTROL" | "METHOD_OF_MEASUREMENT"
  | "ENGINEERING_FORMULA" | "MANUFACTURER_TDS" | "USER_PROJECT_INPUT";

export type ReferenceSourceBindingV4 = {
  sourceId: string;
  documentCode: string;
  title: string;
  edition: string;
  jurisdiction: "KG" | "RU" | "PROJECT" | "ENGINEERING";
  methodologyProfile: "LOCAL_METHOD" | "REFERENCE_METHOD" | "USER_INPUT" | "ENGINEERING_FORMULA";
  legalStatus: "REFERENCE_METHOD" | "USER_INPUT" | "ENGINEERING_FORMULA";
  url: string | null;
  page: string | null;
  table: string | null;
  position: string | null;
  supportedClaims: readonly ReferenceSourceClaimTypeV4[];
  applicability: string;
  limitations: string;
  retrievedAt: "2026-07-23";
  checksum: string;
};

type SourceSeed = Omit<ReferenceSourceBindingV4, "checksum" | "retrievedAt">;
const source = (seed: SourceSeed): ReferenceSourceBindingV4 => ({
  ...seed,
  retrievedAt: "2026-07-23",
  checksum: deterministicNormalizedSourceHash([seed]),
});

const ru = (
  sourceId: string, documentCode: string, title: string, url: string,
  claims: readonly ReferenceSourceClaimTypeV4[],
): ReferenceSourceBindingV4 => source({
  sourceId, documentCode, title, edition: "open published edition", jurisdiction: "RU",
  methodologyProfile: "REFERENCE_METHOD", legalStatus: "REFERENCE_METHOD", url,
  page: null, table: null, position: null, supportedClaims: claims,
  applicability: "Открытый иностранный reference method для идентичности и состава технологии.",
  limitations: "Не является обязательной нормой Кыргызской Республики; численные нормы не переносятся без отдельной derivation.",
});

const user = (sourceId: string, title: string, claim: ReferenceSourceClaimTypeV4): ReferenceSourceBindingV4 => source({
  sourceId, documentCode: "USER_OR_PROJECT_INPUT", title, edition: "revision-bound value",
  jurisdiction: "PROJECT", methodologyProfile: "USER_INPUT", legalStatus: "USER_INPUT", url: null,
  page: null, table: null, position: null, supportedClaims: [claim],
  applicability: "Значение явно вводится пользователем или берётся из выбранного проекта/системы.",
  limitations: "Не является нормативным default; silent default запрещён.",
});

export const MULTI_DOMAIN_REFERENCE_SOURCE_BINDINGS_V4: readonly ReferenceSourceBindingV4[] = [
  ru("ru_gesn_21", "ГЭСН 21", "Временные сборно-разборные здания и сооружения; положения по разборке", "https://minstroyrf.gov.ru/trades/dwd-gesn-2020.php?ID=20", ["WORK_IDENTITY", "APPLICABILITY"]),
  ru("ru_gesn_06", "ГЭСН 06", "Бетонные и железобетонные конструкции монолитные", "https://minstroyrf.gov.ru/docs/137985/", ["WORK_IDENTITY", "APPLICABILITY", "EQUIPMENT"]),
  ru("ru_gesn_08", "ГЭСН 08", "Конструкции из кирпича и блоков", "https://minstroyrf.gov.ru/trades/dwd-state-gesn.php?ID=7", ["WORK_IDENTITY", "APPLICABILITY", "METHOD_OF_MEASUREMENT"]),
  ru("ru_gesn_15", "ГЭСН 15", "Отделочные работы", "https://www.minstroyrf.gov.ru/docs/2923/", ["WORK_IDENTITY", "APPLICABILITY", "QUALITY_CONTROL"]),
  ru("ru_gesn_12", "ГЭСН 12", "Кровли", "https://minstroyrf.gov.ru/trades/tsenoobrazovanie/", ["WORK_IDENTITY", "APPLICABILITY", "QUALITY_CONTROL"]),
  ru("ru_gesn_16", "ГЭСН 16", "Трубопроводы внутренние", "https://minstroyrf.gov.ru/trades/tsenoobrazovanie/", ["WORK_IDENTITY", "APPLICABILITY", "QUALITY_CONTROL"]),
  ru("ru_gesn_23", "ГЭСН 23", "Канализация — наружные сети", "https://minstroyrf.gov.ru/trades/dwd-gesn-2020.php?ID=22", ["WORK_IDENTITY", "METHOD_OF_MEASUREMENT", "QUALITY_CONTROL"]),
  ru("ru_gesnm_08", "ГЭСНм 08", "Электротехнические установки", "https://minstroyrf.gov.ru/docs/138034/", ["WORK_IDENTITY", "APPLICABILITY", "QUALITY_CONTROL"]),
  ru("ru_gesnr_65", "ГЭСНр 65", "Внутренние санитарно-технические работы", "https://minstroyrf.gov.ru/trades/dwd-gesn-2020.php?ID=121", ["WORK_IDENTITY", "APPLICABILITY"]),
  ru("ru_gesn_27", "ГЭСН 27", "Автомобильные дороги", "https://minstroyrf.gov.ru/trades/dwd-gesn-2020.php?ID=26", ["WORK_IDENTITY", "APPLICABILITY", "EQUIPMENT", "QUALITY_CONTROL"]),
  source({
    sourceId: "engineering_geometry", documentCode: "DIMENSIONAL_ENGINEERING", title: "Проверяемая геометрическая формула",
    edition: "V4", jurisdiction: "ENGINEERING", methodologyProfile: "ENGINEERING_FORMULA",
    legalStatus: "ENGINEERING_FORMULA", url: null, page: null, table: null, position: null,
    supportedClaims: ["ENGINEERING_FORMULA"], applicability: "Длина, площадь, объём, масса и количество из явных входов.",
    limitations: "Не подтверждает технологические нормы расхода или производительность.",
  }),
  user("user_productivity", "Производительность выбранного способа разработки", "PRODUCTIVITY"),
  user("user_project_rate", "Проектный расход арматуры", "MATERIAL_CONSUMPTION"),
  user("user_material_rate", "Расход материала выбранного формата", "MATERIAL_CONSUMPTION"),
  user("manufacturer_or_user_rate", "Расход выбранной смеси по TDS либо явному вводу", "MATERIAL_CONSUMPTION"),
  user("user_system_factor", "Коэффициент запаса выбранной комплектной системы", "MATERIAL_CONSUMPTION"),
  user("user_project_spacing", "Проектный шаг креплений", "MATERIAL_CONSUMPTION"),
  user("user_equipment_selection", "Выбор отопительного прибора", "EQUIPMENT"),
  user("user_project_density", "Проектная плотность выбранной асфальтобетонной смеси", "MATERIAL_CONSUMPTION"),
] as const;

type Dimension = Readonly<Record<"length" | "mass" | "time", number>>;
const scalar: Dimension = { length: 0, mass: 0, time: 0 };
const UNIT_DIMENSIONS: Readonly<Record<string, Dimension>> = {
  m: { length: 1, mass: 0, time: 0 }, mm: { length: 1, mass: 0, time: 0 },
  m2: { length: 2, mass: 0, time: 0 }, m3: { length: 3, mass: 0, time: 0 },
  kg: { length: 0, mass: 1, time: 0 }, t: { length: 0, mass: 1, time: 0 },
  "t/m3": { length: -3, mass: 1, time: 0 }, "kg/m3": { length: -3, mass: 1, time: 0 },
  "kg/m2/mm": { length: -3, mass: 1, time: 0 }, "m3/h": { length: 3, mass: 0, time: -1 },
  h: { length: 0, mass: 0, time: 1 }, ratio: scalar, "pcs/m3": { length: -3, mass: 0, time: 0 },
  "pcs/pcs": scalar, pcs: scalar, trip: scalar,
};

const combine = (left: Dimension, right: Dimension, sign: 1 | -1): Dimension => ({
  length: left.length + sign * right.length,
  mass: left.mass + sign * right.mass,
  time: left.time + sign * right.time,
});
const same = (left: Dimension, right: Dimension) =>
  left.length === right.length && left.mass === right.mass && left.time === right.time;

export function validateReferenceFormulaDimensionsV4(passport: MultiDomainReferencePassportV4): string[] {
  const errors: string[] = [];
  const units = new Map(passport.parameters.map((parameter) => [parameter.parameterId, parameter.unit]));
  for (const formula of passport.formulaGraph) {
    const inputUnits = formula.inputs.map((input) => units.get(input));
    if (inputUnits.some((unit) => !unit || !UNIT_DIMENSIONS[unit])) {
      errors.push(`UNSUPPORTED_INPUT_UNIT:${formula.formulaNodeId}`);
      continue;
    }
    const dimensions = inputUnits.map((unit) => UNIT_DIMENSIONS[unit!]);
    let actual = dimensions[0];
    if (formula.operation === "MULTIPLY") {
      actual = dimensions.slice(1).reduce((current, dimension) => combine(current, dimension, 1), dimensions[0]);
    } else if (formula.operation === "DIVIDE" || formula.operation === "CEIL_DIVIDE") {
      actual = combine(dimensions[0], dimensions[1], -1);
    }
    const expected = UNIT_DIMENSIONS[formula.outputUnit];
    if (!expected || !same(actual, expected)) errors.push(`DIMENSION_MISMATCH:${formula.formulaNodeId}`);
    units.set(formula.output, formula.outputUnit);
  }
  return errors;
}

export function validateReferenceSourceTraceabilityV4(passport: MultiDomainReferencePassportV4): string[] {
  const sources = new Map(MULTI_DOMAIN_REFERENCE_SOURCE_BINDINGS_V4.map((item) => [item.sourceId, item]));
  const errors: string[] = [];
  for (const sourceId of passport.sourceIds) if (!sources.has(sourceId)) errors.push(`MISSING_SOURCE:${sourceId}`);
  for (const row of passport.boq) {
    const binding = sources.get(row.sourceId);
    if (!binding) errors.push(`ROW_SOURCE_MISSING:${row.rowDefinitionId}:${row.sourceId}`);
    if (binding?.supportedClaims.includes("WORK_IDENTITY") && row.category === "materials" &&
      !binding.supportedClaims.includes("MATERIAL_CONSUMPTION")) {
      errors.push(`IDENTITY_SOURCE_USED_AS_CONSUMPTION:${row.rowDefinitionId}`);
    }
  }
  return errors;
}
