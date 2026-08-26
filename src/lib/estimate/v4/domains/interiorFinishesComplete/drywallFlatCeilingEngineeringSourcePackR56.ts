import { estimateDeterministicHash } from "../../../estimateDeterministicHash";
import type { DrywallArchitecturalElementProfessionalPackagePartsV4 } from "./drywallArchitecturalElementsContractV4";
import { DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6 } from "./drywallFlatCeilingExpectedScopeV6";

export const DRYWALL_FLAT_CEILING_ENGINEERING_SOURCE_PACK_VERSION_R56 =
  "drywall-flat-ceiling-engineering-source-pack:r5.6" as const;

export type DrywallFlatCeilingEngineeringSourceR56 = {
  sourceId: string;
  sourceKind: "PRIMARY_NORMATIVE" | "PRIMARY_RATEBOOK" | "PRIMARY_REGISTER" | "PROJECT_OR_MANUFACTURER";
  authorityRu: string;
  titleRu: string;
  officialUrl: string | null;
  exactLocatorRu: string;
  applicabilityRu: string;
  verifiedAt: "2026-08-21";
  verificationStatus: "OFFICIAL_PRIMARY_VERIFIED" | "PROJECT_INPUT_REQUIRED_FAIL_CLOSED";
};

export type DrywallFlatCeilingQuantitativeSourceBindingR56 = {
  parameterId: string;
  formulaConsumerIds: readonly string[];
  sourceIds: readonly string[];
  valueSourceRole:
    | "PROJECT_OR_SITE_MEASUREMENT"
    | "PROJECT_DESIGN"
    | "MANUFACTURER_SYSTEM_PASSPORT"
    | "VERIFIED_RATEBOOK_OR_PROJECT_CALCULATION"
    | "SUPPLIER_OR_CONTRACT_PRICE";
  hiddenDefault: false;
  missingValuePolicy: "FAIL_CLOSED";
};

export type DrywallFlatCeilingEngineeringSourcePackR56 = {
  schemaVersion: "DrywallFlatCeilingEngineeringSourcePackR56";
  packVersion: typeof DRYWALL_FLAT_CEILING_ENGINEERING_SOURCE_PACK_VERSION_R56;
  catalogId: string;
  jurisdiction: "KG";
  checkedAt: "2026-08-21";
  sources: readonly DrywallFlatCeilingEngineeringSourceR56[];
  quantitativeBindings: readonly DrywallFlatCeilingQuantitativeSourceBindingR56[];
  hiddenQuantitativeAssumptionCount: 0;
  unboundFormulaInputCount: 0;
  sourcePackHash: string;
};

const KG_SP_SOURCE: DrywallFlatCeilingEngineeringSourceR56 = Object.freeze({
  sourceId: "KG_SP_KR_65_101_2025",
  sourceKind: "PRIMARY_NORMATIVE",
  authorityRu: "Министерство строительства, архитектуры и ЖКХ Кыргызской Республики",
  titleRu: "СП КР 65-101:2025 «Изоляционные и отделочные покрытия»",
  officialUrl: "https://minstroy.gov.kg/ru/document/150/show",
  exactLocatorRu: "Правила производства и приемки отделочных работ; разделы по облицовкам листовыми материалами и контролю качества.",
  applicabilityRu: "Первичный источник для технологии выполнения, приемки и контроля плоского гипсокартонного потолка.",
  verifiedAt: "2026-08-21",
  verificationStatus: "OFFICIAL_PRIMARY_VERIFIED",
});

const KG_KRER_SOURCE: DrywallFlatCeilingEngineeringSourceR56 = Object.freeze({
  sourceId: "KG_KRER_10_05_011",
  sourceKind: "PRIMARY_RATEBOOK",
  authorityRu: "Министерство строительства, архитектуры и ЖКХ Кыргызской Республики",
  titleRu: "Сборник единичных расценок на строительные работы № 15 «Отделочные работы»",
  officialUrl: "https://minstroy.gov.kg/ru/kyzmat/431/show",
  exactLocatorRu: "Раздел 10, таблица 10-05-011, устройство подвесных потолков из гипсокартонных листов; измеритель 100 м².",
  applicabilityRu: "Источник состава и размерности базовой расценки; частичные операции и проектные варианты не наследуют ее ресурсы автоматически.",
  verifiedAt: "2026-08-21",
  verificationStatus: "OFFICIAL_PRIMARY_VERIFIED",
});

const KG_KRERR_SOURCE: DrywallFlatCeilingEngineeringSourceR56 = Object.freeze({
  sourceId: "kg_krerr_2015_application_guidance",
  sourceKind: "PRIMARY_RATEBOOK",
  authorityRu: "Министерство строительства, архитектуры и ЖКХ Кыргызской Республики",
  titleRu: "Указания по применению КРЕРр-2015",
  officialUrl: "https://minstroy.gov.kg/ru/kyzmat/358/show",
  exactLocatorRu: "Общие положения применения ремонтных расценок, правила учета транспорта и отходов; точный ремонтный состав задается дефектной ведомостью.",
  applicabilityRu: "Применяется только к операции REPAIR и не заменяет проектную дефектную ведомость.",
  verifiedAt: "2026-08-21",
  verificationStatus: "OFFICIAL_PRIMARY_VERIFIED",
});

const KG_SAFETY_SOURCE: DrywallFlatCeilingEngineeringSourceR56 = Object.freeze({
  sourceId: "KG_SN_KR_12_01_2018",
  sourceKind: "PRIMARY_NORMATIVE",
  authorityRu: "Министерство строительства, архитектуры и ЖКХ Кыргызской Республики",
  titleRu: "СН КР 12-01:2018 «Безопасность труда в строительстве»",
  officialUrl: "https://minstroy.gov.kg/kg/state_program/download-pdf/snkr12012018bezopasnosttrudavstroitelstve-6366853ed862b98c2.90721660.pdf",
  exactLocatorRu: "Раздел 6: организация производственных территорий, участков работ и рабочих мест; решения ПОС/ППР и безопасные рабочие зоны.",
  applicabilityRu: "Источник границ безопасной организации рабочего места и условного оборудования доступа; не является нормой скрытых человеко-часов.",
  verifiedAt: "2026-08-21",
  verificationStatus: "OFFICIAL_PRIMARY_VERIFIED",
});

const KG_MATERIAL_REGISTER_SOURCE: DrywallFlatCeilingEngineeringSourceR56 = Object.freeze({
  sourceId: "KG_DRYWALL_MATERIAL_CONFORMITY_ROUTE",
  sourceKind: "PRIMARY_REGISTER",
  authorityRu: "Министерство строительства, архитектуры и ЖКХ Кыргызской Республики",
  titleRu: "Реестр сертификатов соответствия на строительные материалы",
  officialUrl: "https://minstroy.gov.kg/ru/building/materials/sertificate",
  exactLocatorRu: "Действующий сертификат точной партии материала на дату закупки.",
  applicabilityRu: "Подтверждает допуск партии; тип листа, профиль, крепеж и нормы расхода берутся из совместимого системного паспорта и проектной спецификации.",
  verifiedAt: "2026-08-21",
  verificationStatus: "OFFICIAL_PRIMARY_VERIFIED",
});

const PROJECT_SYSTEM_SOURCE: DrywallFlatCeilingEngineeringSourceR56 = Object.freeze({
  sourceId: "PROJECT_DRYWALL_SYSTEM_PASSPORT_R56",
  sourceKind: "PROJECT_OR_MANUFACTURER",
  authorityRu: "Проектировщик и производитель выбранной комплектной системы",
  titleRu: "Проектная спецификация, рабочие чертежи, системный паспорт и TDS выбранных материалов",
  officialUrl: null,
  exactLocatorRu: "Идентификатор проектной ревизии, профиль системы, сертификат партии и лист TDS вводятся в параметрах сметы.",
  applicabilityRu: "Обязательный первичный источник проектных размеров, совместимости и спорных норм расхода; при отсутствии значения расчет закрывается с ошибкой.",
  verifiedAt: "2026-08-21",
  verificationStatus: "PROJECT_INPUT_REQUIRED_FAIL_CLOSED",
});

const PRICE_SOURCE: DrywallFlatCeilingEngineeringSourceR56 = Object.freeze({
  sourceId: "PROJECT_SUPPLIER_OR_CONTRACT_PRICE_R56",
  sourceKind: "PROJECT_OR_MANUFACTURER",
  authorityRu: "Заказчик, поставщик или договорный прайс-лист",
  titleRu: "Подтвержденная цена ресурса с датой и основанием",
  officialUrl: null,
  exactLocatorRu: "Параметры unit_price_*, price_basis_reference и price_basis_date.",
  applicabilityRu: "Цена не выводится из нормативного документа и не подставляется нулем; отсутствие цены остается видимым fail-closed состоянием.",
  verifiedAt: "2026-08-21",
  verificationStatus: "PROJECT_INPUT_REQUIRED_FAIL_CLOSED",
});

function sourceRole(parameterId: string): DrywallFlatCeilingQuantitativeSourceBindingR56["valueSourceRole"] {
  if (parameterId.startsWith("unit_price_")) return "SUPPLIER_OR_CONTRACT_PRICE";
  if (/(?:productivity|waste_rate|normative_rate)/u.test(parameterId)) return "VERIFIED_RATEBOOK_OR_PROJECT_CALCULATION";
  if (/(?:rate_|fraction|profile|board|fastener|compound|putty|filler|insulation|certificate|passport)/u.test(parameterId)) {
    return "MANUFACTURER_SYSTEM_PASSPORT";
  }
  if (/(?:design|spacing|thickness|layer|load|revision|detail|record)/u.test(parameterId)) return "PROJECT_DESIGN";
  return "PROJECT_OR_SITE_MEASUREMENT";
}

function sourceIdsFor(
  parameterId: string,
  role: DrywallFlatCeilingQuantitativeSourceBindingR56["valueSourceRole"],
  repair: boolean,
): readonly string[] {
  const rateSource = repair ? KG_KRERR_SOURCE.sourceId : KG_KRER_SOURCE.sourceId;
  if (role === "SUPPLIER_OR_CONTRACT_PRICE") return [PRICE_SOURCE.sourceId];
  if (role === "MANUFACTURER_SYSTEM_PASSPORT") {
    return [PROJECT_SYSTEM_SOURCE.sourceId, KG_MATERIAL_REGISTER_SOURCE.sourceId, KG_SP_SOURCE.sourceId];
  }
  if (role === "VERIFIED_RATEBOOK_OR_PROJECT_CALCULATION") {
    return [rateSource, PROJECT_SYSTEM_SOURCE.sourceId, KG_SP_SOURCE.sourceId];
  }
  if (/(?:working_height|access|lift|work_zone)/u.test(parameterId)) {
    return [PROJECT_SYSTEM_SOURCE.sourceId, KG_SAFETY_SOURCE.sourceId];
  }
  return [PROJECT_SYSTEM_SOURCE.sourceId, KG_SP_SOURCE.sourceId];
}

export function buildDrywallFlatCeilingEngineeringSourcePackR56(
  catalogId: string,
  parts: DrywallArchitecturalElementProfessionalPackagePartsV4,
): DrywallFlatCeilingEngineeringSourcePackR56 {
  if (!(DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6 as readonly string[]).includes(catalogId)) {
    throw new Error(`BATCH003_R56_SOURCE_PACK_OUTSIDE_SCOPE:${catalogId}`);
  }
  const repair = parts.contract.operation === "REPAIR";
  const rows = parts.child_assemblies.flatMap((child) => child.rows);
  const formulaConsumers = new Map<string, Set<string>>();
  for (const row of rows) {
    for (const parameterId of row.formula.input_parameter_ids) {
      const consumers = formulaConsumers.get(parameterId) ?? new Set<string>();
      consumers.add(row.formula.formula_id);
      formulaConsumers.set(parameterId, consumers);
    }
    if (row.price_route_v3?.kind === "RUNTIME_VALIDATED_INPUT") {
      const parameterId = row.price_route_v3.unit_price_parameter_id;
      const consumers = formulaConsumers.get(parameterId) ?? new Set<string>();
      consumers.add(`price-route:${row.row_id}`);
      formulaConsumers.set(parameterId, consumers);
    }
  }
  const quantitativeBindings = [...formulaConsumers.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([parameterId, consumers]) => {
      const valueSourceRole = sourceRole(parameterId);
      return {
        parameterId,
        formulaConsumerIds: [...consumers].sort(),
        sourceIds: sourceIdsFor(parameterId, valueSourceRole, repair),
        valueSourceRole,
        hiddenDefault: false as const,
        missingValuePolicy: "FAIL_CLOSED" as const,
      };
    });
  const sources = [
    KG_SP_SOURCE,
    repair ? KG_KRERR_SOURCE : KG_KRER_SOURCE,
    KG_SAFETY_SOURCE,
    KG_MATERIAL_REGISTER_SOURCE,
    PROJECT_SYSTEM_SOURCE,
    PRICE_SOURCE,
  ];
  const withoutHash = {
    schemaVersion: "DrywallFlatCeilingEngineeringSourcePackR56" as const,
    packVersion: DRYWALL_FLAT_CEILING_ENGINEERING_SOURCE_PACK_VERSION_R56,
    catalogId,
    jurisdiction: "KG" as const,
    checkedAt: "2026-08-21" as const,
    sources,
    quantitativeBindings,
    hiddenQuantitativeAssumptionCount: 0 as const,
    unboundFormulaInputCount: 0 as const,
  };
  return { ...withoutHash, sourcePackHash: estimateDeterministicHash(withoutHash) };
}
