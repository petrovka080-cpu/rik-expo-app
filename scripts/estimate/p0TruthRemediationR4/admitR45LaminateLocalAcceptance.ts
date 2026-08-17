import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

import { compileFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";

const DATABASE_URL = process.env.R45_FULL_ACCEPTANCE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/p0_r45_acceptance_full_20260817";
const CATALOG_ID = "flooring_interior_laminate_install_large_area";
const TITLE_RU = "Монтаж ламината на большой площади";
const VERIFIED_AT = "2026-08-17";
const OUTPUT = resolve(process.env.R45_LAMINATE_ADMISSION_OUTPUT
  ?? ".release-runtime/p0-estimate-truth-remediation-r4/evidence/13-web/LOCAL_8081_LAMINATE_CANONICAL_ADMISSION.json");

type JsonRecord = Record<string, unknown>;

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

const SOURCES = {
  eggerFaq: {
    sourceKey: "EGGER_FLOORING_FAQ_CURRENT_2026",
    titleRu: "EGGER: вопросы и ответы о напольных покрытиях",
    authority: "EGGER Holzwerkstoffe",
    officialUrl: "https://www.egger.com/en/flooring/service-and-information/faqs?country=AM",
    locatorKey: "offcut-5-percent-and-accessories",
    locator: {
      section: "How much offcut should be planned for? / What accessories are required?",
      factRu: "Для стандартного прямоугольного помещения рекомендовано 5 % подрезки; указаны влагозащитная плёнка и подложка.",
      verifiedAt: VERIFIED_AT,
    },
  },
  pergoInstall: {
    sourceKey: "PERGO_LAMINATE_INSTALLATION_GUIDE_07_2026",
    titleRu: "Pergo: руководство по монтажу ламинированного пола",
    authority: "Unilin / Pergo",
    officialUrl: "https://int.pergo.com/-/media/imported%20assets/flooring/2/2/d/pginstallationlmpenpdf293245.ashx?filename=Installation+Guide+Pergo+-+LMP.pdf&rev=3824980a19d542cd9231cfaedfcadabf&type=original",
    locatorKey: "installation-underlay-vapour-barrier-version-07-2026",
    locator: {
      version: "07.2026",
      section: "Preparation and installation",
      factRu: "Подложка укладывается по системе производителя; соседние полотна соединяются лентой для сохранения пароизоляции.",
      verifiedAt: VERIFIED_AT,
    },
  },
  eplfFaq: {
    sourceKey: "EPLF_LAMINATE_FAQ_CURRENT_2026",
    titleRu: "EPLF: профессиональные требования к укладке ламината",
    authority: "Association of the European Producers of Laminate Flooring",
    officialUrl: "https://eplf.com/en/laminate/faq",
    locatorKey: "underlay-vapour-barrier-expansion-joints",
    locator: {
      section: "Laying laminate / underlay / vapour barrier",
      factRu: "Основание должно быть ровным и сухим; для стяжки нужна пароизоляция; при размере поля более 8–10 м требуется деформационный шов.",
      verifiedAt: VERIFIED_AT,
    },
  },
} as const;

type SourceName = keyof typeof SOURCES;

function guide(input: {
  shortRu: string;
  kind: string;
  sourceRole: string;
  source: SourceName;
  applicability: string;
  extra?: JsonRecord;
}) {
  const source = SOURCES[input.source];
  return {
    guide_short_ru: input.shortRu,
    guide_kind: input.kind,
    guide_validation_policy: "INFORMATION_ONLY",
    source_role: input.sourceRole,
    source_document: source.titleRu,
    source_edition_status: input.source === "pergoInstall" ? "07.2026" : "CURRENT_VERIFIED_2026-08-17",
    source_locator: `${source.officialUrl}#${source.locatorKey}`,
    guide_version: "r4.5-laminate-local-acceptance.v1",
    source_snapshot_hash: sha256({ url: source.officialUrl, locator: source.locator }),
    applicability: input.applicability,
    verified_at: VERIFIED_AT,
    ...(input.extra ?? {}),
  };
}

const PARAMETERS = [
  {
    parameterId: "area_m2", ordinal: 0, valueType: "decimal", unitId: "m2",
    titleRu: "Площадь покрытия", required: true, defaultValue: "1", constraints: { min: 0.01, max: 10_000_000 },
    truth: {
      semantic_parameter_key: "floor_covering_area_m2", visibility_role: "USER_INPUT",
      description_ru: "Чистая площадь пола по обмеру; исходная смета строится на 1 м², пока пользователь не ввёл объём.",
      default_policy: "BASELINE_ONE_UNIT", value_source_role: "USER_MEASURED",
      guide: guide({
        shortRu: "Норма: 1 м² для исходной сметы; введите фактическую площадь",
        kind: "MEASUREMENT_RULE", sourceRole: "USER_MEASURED", source: "eggerFaq",
        applicability: "Чистая площадь пола до добавления подрезки.",
        extra: { guide_target: "1", canonical_unit: "m2", display_unit: "м²", precision: 2, step: "0.01" },
      }),
      formula_consumers: ["laminate_order_area_m2", "floor_area_m2", "vapour_film_order_area_m2"],
      resource_branch_consumers: [], validation_rules: ["value > 0"], conflicts_with: [],
      provenance: { owner: "backend", contract: "R4.5" },
    },
  },
  {
    parameterId: "laminate_waste_percent", ordinal: 1, valueType: "decimal", unitId: "percent",
    titleRu: "Запас ламината на подрезку", required: true, defaultValue: "5", constraints: { min: 0, max: 25 },
    truth: {
      semantic_parameter_key: "laminate_offcut_percent", visibility_role: "USER_INPUT",
      description_ru: "Закупочный запас ламината; не является дополнительной площадью работ.",
      default_policy: "MANUFACTURER_BASELINE", value_source_role: "MANUFACTURER_CONFIRMED",
      guide: guide({
        shortRu: "Норма: 5 % для обычной укладки в прямоугольном помещении",
        kind: "MANUFACTURER_RANGE", sourceRole: "MANUFACTURER_CONFIRMED", source: "eggerFaq",
        applicability: "Обычная прямая укладка в квадратном или прямоугольном помещении; сложная раскладка требует уточнения.",
        extra: { guide_min: "5", guide_target: "5", canonical_unit: "percent", display_unit: "%", precision: 1, step: "0.5" },
      }),
      formula_consumers: ["laminate_order_area_m2"], resource_branch_consumers: [],
      validation_rules: ["0 <= value <= 25"], conflicts_with: [], provenance: { owner: "backend", contract: "R4.5" },
    },
  },
  {
    parameterId: "underlay_system", ordinal: 2, valueType: "enum", unitId: null,
    titleRu: "Система подложки", required: true, defaultValue: "combined_vapour_barrier",
    constraints: { values: ["combined_vapour_barrier", "separate_underlay"] },
    truth: {
      semantic_parameter_key: "laminate_underlay_system", visibility_role: "USER_INPUT",
      description_ru: "Выбор между комбинированной подложкой с пароизоляцией и раздельными слоями.",
      default_policy: "DISCLOSED_SYSTEM_ASSUMPTION", value_source_role: "MANUFACTURER_CONFIRMED",
      guide: guide({
        shortRu: "Норма: подложка 2-в-1 с пароизоляцией; уточните систему производителя",
        kind: "ENUM_DECISION_RULE", sourceRole: "MANUFACTURER_CONFIRMED", source: "pergoInstall",
        applicability: "Плавающая укладка ламината на подготовленное основание.",
        extra: { guide_options: [
          { value: "combined_vapour_barrier", ruleRu: "Подложка со встроенной пароизоляцией" },
          { value: "separate_underlay", ruleRu: "Отдельная подложка; пароизоляция определяется основанием" },
        ] },
      }),
      formula_consumers: ["floor_area_m2"],
      resource_branch_consumers: ["underlay_combined", "underlay_separate", "vapour_barrier_film"],
      validation_rules: ["enum"], conflicts_with: [], provenance: { owner: "backend", contract: "R4.5" },
    },
  },
  {
    parameterId: "moisture_barrier_required", ordinal: 3, valueType: "boolean", unitId: null,
    titleRu: "Нужна отдельная пароизоляция", required: true, defaultValue: true, constraints: {},
    truth: {
      semantic_parameter_key: "separate_vapour_barrier_required", visibility_role: "USER_INPUT",
      description_ru: "Влияет только на отдельную PE-плёнку; встроенная пароизоляция комбинированной подложки не дублируется.",
      default_policy: "CONSERVATIVE_MINERAL_SUBFLOOR_ASSUMPTION", value_source_role: "MANUFACTURER_CONFIRMED",
      guide: guide({
        shortRu: "Норма: да для стяжки/минерального основания; нет при подтверждённой иной системе",
        kind: "ENUM_DECISION_RULE", sourceRole: "MANUFACTURER_CONFIRMED", source: "eplfFaq",
        applicability: "Для раздельной подложки; при системе 2-в-1 отдельная плёнка не добавляется.",
      }),
      formula_consumers: ["vapour_film_order_area_m2"], resource_branch_consumers: ["vapour_barrier_film"],
      validation_rules: ["boolean"], conflicts_with: [], provenance: { owner: "backend", contract: "R4.5" },
    },
  },
  {
    parameterId: "expansion_joint_length_m", ordinal: 4, valueType: "decimal", unitId: "m",
    titleRu: "Длина деформационных швов", required: true, defaultValue: "0", constraints: { min: 0, max: 1_000_000 },
    truth: {
      semantic_parameter_key: "laminate_expansion_joint_length_m", visibility_role: "USER_INPUT",
      description_ru: "Длина профилей определяется планом раскладки; площадь сама по себе не позволяет её вычислить.",
      default_policy: "ZERO_UNTIL_LAYOUT_MEASURED", value_source_role: "PROJECT_DOCUMENTATION",
      guide: guide({
        shortRu: "Норма: проверить швы при пролёте более 8–10 м; длина — по раскладке",
        kind: "NORMATIVE_RANGE", sourceRole: "PROJECT_DOCUMENTATION", source: "eplfFaq",
        applicability: "Непрерывное поле ламината; дверные проёмы и сложная геометрия проверяются отдельно.",
        extra: { guide_min: "8", guide_max: "10", canonical_unit: "m", display_unit: "м", precision: 2, step: "0.01" },
      }),
      formula_consumers: ["expansion_joint_length_m"], resource_branch_consumers: ["expansion_joint_profile"],
      validation_rules: ["value >= 0"], conflicts_with: [], provenance: { owner: "backend", contract: "R4.5" },
    },
  },
] as const;

const FORMULAS = [
  { formulaId: "laminate_order_area_m2", outputUnitId: "m2", expression: "area_m2 * (1 + laminate_waste_percent / 100)" },
  { formulaId: "floor_area_m2", outputUnitId: "m2", expression: "area_m2" },
  { formulaId: "vapour_film_order_area_m2", outputUnitId: "m2", expression: "area_m2 * 1.1" },
  { formulaId: "expansion_joint_length_m", outputUnitId: "m", expression: "expansion_joint_length_m" },
] as const;

const literalInclusion = { kind: "literal", value: true };
const equals = (parameterId: string, value: unknown) => ({ kind: "equals", parameterId, value });
const and = (...operands: JsonRecord[]) => ({ kind: "and", operands });

const RESOURCES = [
  {
    rowId: "laminate_covering", ordinal: 0, section: "Материалы", category: "materials", rowType: "material",
    titleRu: "Ламинированное напольное покрытие; класс, декор и формат — по выбору заказчика",
    unitId: "m2", formulaId: "laminate_order_area_m2", inclusionAst: literalInclusion,
    semanticOwner: "flooring.laminate.material.covering", costOwnerId: "flooring.laminate.covering.m2", procurementEligible: true,
    sourceNames: ["eggerFaq", "pergoInstall"] as SourceName[],
    formulaRu: "Площадь × (1 + запас на подрезку / 100)",
    specificationStatus: "PROJECT_CONFIRMATION_REQUIRED",
  },
  {
    rowId: "underlay_combined", ordinal: 1, section: "Материалы", category: "materials", rowType: "material",
    titleRu: "Подложка 2-в-1 для ламината со встроенной пароизоляцией; тип и толщина — по системе производителя",
    unitId: "m2", formulaId: "floor_area_m2", inclusionAst: equals("underlay_system", "combined_vapour_barrier"),
    semanticOwner: "flooring.laminate.material.underlay_combined", costOwnerId: "flooring.laminate.underlay_combined.m2", procurementEligible: true,
    sourceNames: ["pergoInstall", "eplfFaq"] as SourceName[], formulaRu: "Площадь пола", specificationStatus: "MANUFACTURER_SYSTEM_REQUIRED",
  },
  {
    rowId: "underlay_separate", ordinal: 2, section: "Материалы", category: "materials", rowType: "material",
    titleRu: "Подложка под ламинат; тип и толщина — по системе производителя",
    unitId: "m2", formulaId: "floor_area_m2", inclusionAst: equals("underlay_system", "separate_underlay"),
    semanticOwner: "flooring.laminate.material.underlay_separate", costOwnerId: "flooring.laminate.underlay_separate.m2", procurementEligible: true,
    sourceNames: ["pergoInstall", "eplfFaq"] as SourceName[], formulaRu: "Площадь пола", specificationStatus: "MANUFACTURER_SYSTEM_REQUIRED",
  },
  {
    rowId: "vapour_barrier_film", ordinal: 3, section: "Материалы", category: "materials", rowType: "material",
    titleRu: "Пароизоляционная PE-плёнка SD > 75 м",
    unitId: "m2", formulaId: "vapour_film_order_area_m2",
    inclusionAst: and(equals("underlay_system", "separate_underlay"), equals("moisture_barrier_required", true)),
    semanticOwner: "flooring.laminate.material.vapour_barrier", costOwnerId: "flooring.laminate.vapour_barrier.m2", procurementEligible: true,
    sourceNames: ["eggerFaq", "eplfFaq"] as SourceName[],
    formulaRu: "Площадь × 1,10; 10 % — раскрытое предварительное допущение на нахлёсты и подрезку",
    specificationStatus: "SOURCE_CONFIRMED_SD_PROJECT_THICKNESS_REQUIRED",
  },
  {
    rowId: "expansion_joint_profile", ordinal: 4, section: "Материалы", category: "materials", rowType: "material",
    titleRu: "Профиль деформационного шва для ламината; типоразмер — по раскладке",
    unitId: "m", formulaId: "expansion_joint_length_m",
    inclusionAst: { kind: "greater_than", parameterId: "expansion_joint_length_m", value: 0 },
    semanticOwner: "flooring.laminate.material.expansion_joint_profile", costOwnerId: "flooring.laminate.expansion_joint_profile.m", procurementEligible: true,
    sourceNames: ["eplfFaq"] as SourceName[], formulaRu: "Измеренная длина швов по плану раскладки", specificationStatus: "PROJECT_LAYOUT_REQUIRED",
  },
  {
    rowId: "floating_laminate_installation", ordinal: 5, section: "Работы", category: "labor", rowType: "labor",
    titleRu: "Монтаж плавающего ламинированного покрытия с подложкой, раскроем и технологическими зазорами",
    unitId: "m2", formulaId: "floor_area_m2", inclusionAst: literalInclusion,
    semanticOwner: "flooring.laminate.labor.floating_installation", costOwnerId: "flooring.laminate.installation.m2", procurementEligible: false,
    sourceNames: ["pergoInstall", "eplfFaq"] as SourceName[], formulaRu: "Площадь пола; запас материала не увеличивает объём работ",
    specificationStatus: "SOURCE_SCOPE_CONFIRMED",
  },
] as const;

async function main(): Promise<void> {
  const parsed = new URL(DATABASE_URL);
  if (!(["127.0.0.1", "localhost"].includes(parsed.hostname)
    && parsed.port === "55432"
    && parsed.pathname === "/p0_r45_acceptance_full_20260817")) {
    throw new Error("R45_LAMINATE_LOCAL_ACCEPTANCE_DATABASE_GUARD_REJECTED");
  }

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r45-laminate-local-acceptance" });
  await client.connect();
  const startedAt = new Date().toISOString();
  try {
    await client.query("begin isolation level serializable");
    const release = (await client.query(`
      select * from public.estimate_definition_release where status='active' for share
    `)).rows[0];
    const searchRelease = (await client.query(`
      select * from public.estimate_search_index_release where status='active' for update
    `)).rows[0];
    if (!release?.id || !searchRelease?.id) throw new Error("R45_ACTIVE_RELEASES_MISSING");

    const existing = (await client.query(`
      select v.id,v.source_metadata from public.estimate_definition_version v
      where v.release_id=$1 and v.catalog_id=$2
    `, [release.id, CATALOG_ID])).rows[0];
    if (existing) {
      if (existing.source_metadata?.localAcceptanceContract !== "r4.5-laminate.v1") {
        throw new Error("R45_LAMINATE_DEFINITION_CONFLICT");
      }
      await client.query("rollback");
      process.stdout.write(`${JSON.stringify({ status: "ALREADY_ADMITTED", catalogId: CATALOG_ID, releaseId: release.id }, null, 2)}\n`);
      return;
    }

    await client.query(`
      insert into public.estimate_work_identity (
        catalog_id,namespace,domain,source_identity,work_key,title_ru,denominator_eligible,canonical_owner
      ) values ($1,'global','flooring',$2,$1,$3,true,'backend')
      on conflict (catalog_id) do nothing
    `, [CATALOG_ID, `r45-search:${CATALOG_ID}`, TITLE_RU]);
    const identity = (await client.query("select * from public.estimate_work_identity where catalog_id=$1", [CATALOG_ID])).rows[0];
    if (!identity || identity.work_key !== CATALOG_ID || identity.title_ru !== TITLE_RU) {
      throw new Error("R45_LAMINATE_IDENTITY_CONFLICT");
    }

    const passport = {
      contractVersion: "canonical-estimate-passport.r4.5",
      professionalNameRu: TITLE_RU,
      calculationOwner: "backend",
      baselineUnit: "m2",
      baselineWithoutUserInput: true,
      pricePolicy: "PRICE_REQUIRED",
      scope: {
        included: ["поставка ламината", "подложка", "пароизоляция по выбранной системе", "плавающий монтаж с раскроем и зазорами"],
        excluded: ["выравнивание или ремонт основания", "демонтаж старого покрытия", "плинтусы", "доставка", "длина деформационных профилей без плана раскладки"],
      },
      assumptions: [
        "До ввода площади расчёт ведётся на 1 м².",
        "Запас ламината 5 % применим к обычному прямоугольному помещению.",
        "По умолчанию выбрана подложка 2-в-1 со встроенной пароизоляцией; отдельная плёнка не дублируется.",
        "Цены отсутствуют и должны быть подтверждены; полный итог не сформирован.",
      ],
    };
    const applicability = {
      installationMethod: "floating_click",
      substrateState: "prepared_level_clean_dry",
      geometryRule: "expansion joints require layout when continuous run exceeds manufacturer/EPLF limit",
      baselineQuantity: { value: 1, unit: "m2" },
    };
    const sourceMetadata = {
      truth_contract_version: "R3",
      localAcceptanceContract: "r4.5-laminate.v1",
      localAcceptanceOnly: true,
      productionActivationAuthorized: false,
      verifiedAt: VERIFIED_AT,
      sources: Object.values(SOURCES).map((source) => ({
        sourceKey: source.sourceKey, titleRu: source.titleRu, authority: source.authority,
        officialUrl: source.officialUrl, locator: source.locator,
      })),
      pricePolicy: "PRICE_REQUIRED",
    };
    const definitionId = randomUUID();
    await client.query(`
      insert into public.estimate_definition_version (
        id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata
      ) values ($1,$2,$3,1,$4::jsonb,$5::jsonb,$6,$7::jsonb)
    `, [definitionId, release.id, CATALOG_ID, JSON.stringify(passport), JSON.stringify(applicability),
      sha256({ passport, applicability, sourceMetadata }), JSON.stringify(sourceMetadata)]);

    for (const parameter of PARAMETERS) {
      await client.query(`
        insert into public.estimate_parameter_definition (
          definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,default_value,constraints_json,truth_metadata
        ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb)
      `, [definitionId, parameter.parameterId, parameter.ordinal, parameter.valueType, parameter.unitId,
        parameter.titleRu, parameter.required, JSON.stringify(parameter.defaultValue),
        JSON.stringify(parameter.constraints), JSON.stringify(parameter.truth)]);
    }

    for (const formula of FORMULAS) {
      const compiled = compileFormulaGraph(formula.expression);
      await client.query(`
        insert into public.estimate_formula_graph (
          definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
        ) values ($1,$2,$3,$4,$5::jsonb,$6,$7)
      `, [definitionId, formula.formulaId, formula.outputUnitId, compiled.source,
        JSON.stringify(compiled.ast), compiled.inputParameterIds, sha256(compiled.ast)]);
    }

    const resourceIds = new Map<string, string>();
    for (const resource of RESOURCES) {
      const id = randomUUID();
      const normativeTrace = resource.sourceNames.map((name) => {
        const source = SOURCES[name];
        return {
          source_id: source.sourceKey,
          authority: source.authority,
          document_code: source.titleRu,
          official_url: source.officialUrl,
          locator: source.locator,
          applicability: CATALOG_ID,
          verified_at: VERIFIED_AT,
        };
      });
      const resourceGraph = {
        contractVersion: "resource-graph.r4.5",
        semanticOwner: resource.semanticOwner,
        formulaId: resource.formulaId,
        formulaRu: resource.formulaRu,
        specificationStatus: resource.specificationStatus,
        priceState: "PRICE_REQUIRED",
        physicalRowType: resource.rowType,
      };
      const resourceSource = {
        truth_contract_version: "R3",
        local_acceptance_only: true,
        priceState: "PRICE_REQUIRED",
        priceRoute: { kind: "manual_supplier_confirmation", currency: "KGS" },
        normativeTrace,
      };
      const rowProjection = {
        catalogId: CATALOG_ID, rowId: resource.rowId, ordinal: resource.ordinal,
        section: resource.section, category: resource.category, titleRu: resource.titleRu,
        rowType: resource.rowType, unitId: resource.unitId, formulaId: resource.formulaId,
        inclusionAst: resource.inclusionAst, resourceGraph, semanticOwner: resource.semanticOwner,
        costOwnerId: resource.costOwnerId, procurementEligible: resource.procurementEligible,
        sourceMetadata: resourceSource,
      };
      await client.query(`
        insert into public.estimate_resource_spec (
          id,definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,formula_id,
          inclusion_ast,resource_graph,semantic_owner,cost_owner_id,procurement_eligible,source_metadata,row_sha256
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16::jsonb,$17)
      `, [id, definitionId, resource.rowId, resource.ordinal, resource.section, resource.category,
        resource.titleRu, resource.rowType, resource.unitId, resource.formulaId,
        JSON.stringify(resource.inclusionAst), JSON.stringify(resourceGraph), resource.semanticOwner,
        resource.costOwnerId, resource.procurementEligible, JSON.stringify(resourceSource), sha256(rowProjection)]);
      resourceIds.set(resource.rowId, id);

      const route = (await client.query(`
        insert into public.estimate_price_route (route_key,currency_code,region_code,priority,source_kind,metadata,active)
        values ($1,'KGS','KG',100,'manual',$2::jsonb,true)
        on conflict (route_key) do nothing
        returning id
      `, [`canonical-resource:${id}`, JSON.stringify({ priceState: "PRICE_REQUIRED", costOwnerId: resource.costOwnerId })])).rows[0]
        ?? (await client.query("select id from public.estimate_price_route where route_key=$1", [`canonical-resource:${id}`])).rows[0];
      await client.query(`
        insert into public.estimate_resource_price_route_binding (resource_spec_id,route_id,price_key,priority)
        values ($1,$2,$3,100)
      `, [id, route.id, resource.costOwnerId]);
    }

    const locatorIds = new Map<SourceName, string>();
    for (const [name, source] of Object.entries(SOURCES) as Array<[SourceName, typeof SOURCES[SourceName]]>) {
      await client.query(`
        insert into public.estimate_normative_source (source_key,title_ru,authority,official_url,metadata)
        values ($1,$2,$3,$4,$5::jsonb) on conflict (source_key) do nothing
      `, [source.sourceKey, source.titleRu, source.authority, source.officialUrl,
        JSON.stringify({ verifiedAt: VERIFIED_AT, sourceRole: "OFFICIAL_PRIMARY_SOURCE" })]);
      const sourceId = (await client.query("select id from public.estimate_normative_source where source_key=$1", [source.sourceKey])).rows[0]?.id;
      if (!sourceId) throw new Error(`R45_NORMATIVE_SOURCE_INSERT_FAILED:${name}`);
      await client.query(`
        insert into public.estimate_normative_locator (source_id,locator_key,locator,excerpt_sha256)
        values ($1,$2,$3::jsonb,$4) on conflict (source_id,locator_key) do nothing
      `, [sourceId, source.locatorKey, JSON.stringify(source.locator), sha256(source.locator)]);
      const locatorId = (await client.query(`
        select id from public.estimate_normative_locator where source_id=$1 and locator_key=$2
      `, [sourceId, source.locatorKey])).rows[0]?.id;
      if (!locatorId) throw new Error(`R45_NORMATIVE_LOCATOR_INSERT_FAILED:${name}`);
      locatorIds.set(name, locatorId);
    }

    for (const resource of RESOURCES) {
      for (const name of resource.sourceNames) {
        await client.query(`
          insert into public.estimate_work_normative_binding (
            definition_version_id,resource_spec_id,locator_id,applicability
          ) values ($1,$2,$3,$4::jsonb)
        `, [definitionId, resourceIds.get(resource.rowId), locatorIds.get(name),
          JSON.stringify({ catalogId: CATALOG_ID, rowId: resource.rowId })]);
      }
    }

    const searchDocumentHash = sha256({
      catalogId: CATALOG_ID, publicationState: "ADMITTED_BACKEND", definitionReleaseId: release.id,
      parameterIds: PARAMETERS.map((parameter) => parameter.parameterId), definitionSha256: sha256({ passport, applicability, sourceMetadata }),
    });
    const updatedSearch = await client.query(`
      update public.estimate_search_document
      set publication_state='ADMITTED_BACKEND', definition_release_id=$3,
          required_inputs_count=0,
          key_distinguishing_parameters=$4::jsonb,
          clarification_fields=$5::jsonb,
          included_boundaries=$6::jsonb,
          excluded_boundaries=$7::jsonb,
          source_provenance=source_provenance || $8::jsonb,
          document_sha256=$9
      where search_release_id=$1 and catalog_id=$2
      returning catalog_id
    `, [searchRelease.id, CATALOG_ID, release.id,
      JSON.stringify(["площадь", "запас на подрезку", "система подложки", "пароизоляция", "длина деформационных швов"]),
      JSON.stringify(["класс/декор/формат ламината", "тип основания", "план раскладки и длина швов"]),
      JSON.stringify(passport.scope.included), JSON.stringify(passport.scope.excluded),
      JSON.stringify({ r45LocalAcceptance: { contract: "r4.5-laminate.v1", verifiedAt: VERIFIED_AT, productionActivationAuthorized: false } }),
      searchDocumentHash]);
    if (updatedSearch.rowCount !== 1) throw new Error("R45_LAMINATE_SEARCH_DOCUMENT_MISSING");

    const snapshot = (await client.query(`
      select encode(extensions.digest(convert_to(string_agg(
        catalog_id || ':' || document_sha256, E'\n' order by catalog_id
      ),'UTF8'),'sha256'),'hex') snapshot_sha256
      from public.estimate_search_document where search_release_id=$1
    `, [searchRelease.id])).rows[0]?.snapshot_sha256;
    if (!snapshot) throw new Error("R45_SEARCH_SNAPSHOT_HASH_FAILED");
    await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2 where id=$1`, [searchRelease.id, snapshot]);

    const counts = (await client.query(`
      select
        (select count(*)::integer from public.estimate_parameter_definition where definition_version_id=$1) parameters,
        (select count(*)::integer from public.estimate_formula_graph where definition_version_id=$1) formulas,
        (select count(*)::integer from public.estimate_resource_spec where definition_version_id=$1) resources,
        (select count(*)::integer from public.estimate_work_normative_binding where definition_version_id=$1) normative_bindings,
        (select count(*)::integer from public.estimate_resource_price_route_binding b join public.estimate_resource_spec s on s.id=b.resource_spec_id where s.definition_version_id=$1) price_routes
    `, [definitionId])).rows[0];
    await client.query("commit");

    const evidence = {
      schemaVersion: "p0-estimate-truth-remediation-r4.5-laminate-local-acceptance.v1",
      status: "GREEN_LOCAL_ACCEPTANCE_NOT_PRODUCTION",
      startedAt,
      completedAt: new Date().toISOString(),
      databaseName: parsed.pathname.slice(1),
      catalogId: CATALOG_ID,
      titleRu: TITLE_RU,
      definitionReleaseId: release.id,
      searchReleaseId: searchRelease.id,
      searchSnapshotSha256: snapshot,
      counts: Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Number(value)])),
      pricePolicy: "PRICE_REQUIRED",
      baselineAssumptions: passport.assumptions,
      sources: Object.values(SOURCES).map((source) => ({
        sourceKey: source.sourceKey, authority: source.authority, officialUrl: source.officialUrl,
        locatorKey: source.locatorKey, locatorSha256: sha256(source.locator),
      })),
      productionActivationAuthorized: false,
    };
    mkdirSync(dirname(OUTPUT), { recursive: true });
    writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
