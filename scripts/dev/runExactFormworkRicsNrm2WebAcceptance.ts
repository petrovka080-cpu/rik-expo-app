import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type BrowserContext, type Page, type Response } from "playwright";
import { Client } from "pg";
import {
  FORMWORK_FRAMI_XLIFE_EXACT_INPUT,
  FORMWORK_FRAMI_XLIFE_SENSITIVITY_INPUT,
} from "../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1";
import {
  MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
} from "../../src/lib/estimate/v4/masonryBrickWallBiaTn10R1";

type Json = Record<string, any>;

const argValue = (name: string): string | null => {
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;
};

const PROFILE_ID = argValue("--profile") ?? "formwork-rics-nrm2";
const IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE =
  PROFILE_ID === "formwork-frami-xlife-pile-cap-wet-zone";
const IS_NRMCA_STRIP_FOUNDATION = PROFILE_ID === "strip-foundation-nrmca-cip31";
const IS_BIA_TN10_MASONRY = PROFILE_ID === "bia-tn10-masonry";
const IS_RICS_NRM2_WET_ZONE = PROFILE_ID === "formwork-rics-nrm2-wet-zone";
const IS_RICS_NRM2_STRIP_FOUNDATION_WET_ZONE =
  PROFILE_ID === "formwork-rics-nrm2-strip-foundation-wet-zone";
const IS_RICS_NRM2_SLAB_FOUNDATION_WET_ZONE =
  PROFILE_ID === "formwork-rics-nrm2-slab-foundation-wet-zone";
const IS_RICS_NRM2_PILE_CAP_WET_ZONE =
  PROFILE_ID === "formwork-rics-nrm2-pile-cap-wet-zone";
const IS_RICS_NRM2_FORMWORK = PROFILE_ID.startsWith("formwork-rics-nrm2");

const ORIGIN = "http://127.0.0.1:8081";
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = argValue("--release-id") ?? (IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? "50739ecf-b47f-5294-96d8-503c00d92200"
  : IS_BIA_TN10_MASONRY
  ? "714aadc0-a593-5759-8a12-1973ce14481e"
  : IS_NRMCA_STRIP_FOUNDATION
    ? "dda56d3e-39dc-543c-a3ee-4395a4c018b9"
    : IS_RICS_NRM2_WET_ZONE
      ? "d4f46211-551f-5d3b-a98d-9c359c9f2443"
      : IS_RICS_NRM2_STRIP_FOUNDATION_WET_ZONE
        ? "a15d0987-4289-5ba6-8780-d7c1b0e7d639"
        : IS_RICS_NRM2_SLAB_FOUNDATION_WET_ZONE
          ? "cdda031e-ac2e-55c2-b2d9-7c3ea8185d74"
          : IS_RICS_NRM2_PILE_CAP_WET_ZONE
            ? "cf7f3504-3b30-5cc9-9230-114b409f9ddb"
          : "01f008d7-e290-5237-bf6b-c71c829c04d2");
const SEARCH_RELEASE_ID = argValue("--search-release-id") ?? (IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? "bab13b8a-90f4-5236-bf90-03a631793994"
  : IS_BIA_TN10_MASONRY
  ? "cfb134c3-97e8-50e9-8e72-92905303ee38"
  : IS_NRMCA_STRIP_FOUNDATION
    ? "15bf6a55-fb0b-5c7b-b522-dc1e6fd6896e"
    : IS_RICS_NRM2_WET_ZONE
      ? "1251ce4e-d68b-506e-9021-2ec392d3a3c6"
      : IS_RICS_NRM2_STRIP_FOUNDATION_WET_ZONE
        ? "f99c72c6-9098-560a-a96e-4de76e066ece"
        : IS_RICS_NRM2_SLAB_FOUNDATION_WET_ZONE
          ? "3deb0263-cf34-54ec-8953-a71be36ebd76"
          : IS_RICS_NRM2_PILE_CAP_WET_ZONE
            ? "16217704-4a47-5138-a19b-dae1e8301e82"
          : "db513288-1307-5cd8-9bbe-e625f2841074");
const DEFINITION_ID = argValue("--definition-id") ?? (IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? "f9f9c447-502c-5a15-84b5-4a4d40351ae2"
  : IS_BIA_TN10_MASONRY
  ? "ec84af28-ca27-5c26-a5a6-2d63106a1b25"
  : IS_NRMCA_STRIP_FOUNDATION
    ? "3afbb931-6432-5801-935a-1ba3d0290030"
    : IS_RICS_NRM2_WET_ZONE
      ? "ef2c2f51-b116-537f-8c20-60f891e5c932"
      : IS_RICS_NRM2_STRIP_FOUNDATION_WET_ZONE
        ? "515f8c9d-adf2-5f18-b27f-64f098320a00"
        : IS_RICS_NRM2_SLAB_FOUNDATION_WET_ZONE
          ? "868f131c-fac8-5262-bd30-ad3aa300d27e"
          : IS_RICS_NRM2_PILE_CAP_WET_ZONE
            ? "1bc4c42c-dd69-5534-af66-7f9e2e300830"
          : "3359e9e8-60a4-5fe9-90be-4c2fc73e08bd");
const CATALOG_ID = argValue("--catalog-id") ?? (IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? "canonical-work:base:concrete_foundation_interior_pile_cap_form_wet_zone"
  : IS_BIA_TN10_MASONRY
  ? "canonical-work:base:masonry_interior_brick_wall_lay_standard"
  : IS_NRMCA_STRIP_FOUNDATION
    ? "canonical-work:expanded:strip_foundation"
    : IS_RICS_NRM2_WET_ZONE
      ? "canonical-work:base:concrete_foundation_interior_formwork_form_wet_zone"
      : IS_RICS_NRM2_STRIP_FOUNDATION_WET_ZONE
        ? "canonical-work:base:concrete_foundation_interior_strip_foundation_form_wet_zone"
        : IS_RICS_NRM2_SLAB_FOUNDATION_WET_ZONE
          ? "canonical-work:base:concrete_foundation_interior_slab_foundation_form_wet_zone"
          : IS_RICS_NRM2_PILE_CAP_WET_ZONE
            ? "canonical-work:base:concrete_foundation_interior_pile_cap_form_wet_zone"
          : "canonical-work:base:concrete_foundation_interior_formwork_form_standard");
const ROW_ID = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? "equipment:formwork:frami-xlife-panels-rental"
  : IS_BIA_TN10_MASONRY
  ? "material:bia-tn10:fired-clay-brick"
  : IS_NRMCA_STRIP_FOUNDATION
    ? "main_concrete"
    : "formwork:rics-nrm2:measured-contact-area:work";
const SOURCE_ID = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? "src_manufacturer_doka_frami_xlife_foundation_999810202_2023_11"
  : IS_BIA_TN10_MASONRY
  ? "src_professional_norm_pack_masonry_bia_tn10_selected_brick_mortar_table_routing_v1"
  : IS_NRMCA_STRIP_FOUNDATION
    ? "src_professional_norm_pack_concrete_nrmca_cip31_selected_contingency_m3_m3_v1"
    : "src_professional_norm_pack_formwork_rics_nrm2_measured_contact_area_same_unit_routing_v1";
const NORM_ID = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? null
  : IS_BIA_TN10_MASONRY
  ? "masonry_bia_tn10_selected_brick_mortar_table_routing_v1"
  : IS_NRMCA_STRIP_FOUNDATION
    ? "concrete_nrmca_cip31_selected_contingency_m3_m3_v1"
    : "formwork_rics_nrm2_measured_contact_area_same_unit_routing_v1";
const REINFORCEMENT_ROW_ID = "reinforcement";
const REINFORCEMENT_SOURCE_ID =
  "src_professional_norm_pack_reinforcement_project_bar_schedule_weight_same_unit_routing_v1";
const REINFORCEMENT_NORM_ID =
  "reinforcement_project_bar_schedule_weight_same_unit_routing_v1";
const REINFORCEMENT_PRODUCT_PROFILE_ID =
  "project-profile:approved-reinforcement-bar-schedule:fhwa-rics:v1";
const FORMWORK_FULL_SCOPE_GAP_ROW_ID = "formwork:scope:full-composition:preliminary";
const FORMWORK_FULL_SCOPE_PARAMETER_ID = "full_formwork_scope_source_set_id";
const FORMWORK_FULL_SCOPE_GAP_TITLE_RU =
  "Полный технологический состав опалубки не определён: требуются применимые источники материалов, труда, аренды и доставки";
const EXPECTED_TITLE = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? "Щиты рамной опалубки Doka Frami Xlife"
  : IS_BIA_TN10_MASONRY
  ? "Обожжённый глиняный кирпич"
  : IS_NRMCA_STRIP_FOUNDATION
    ? "Бетонная смесь"
    : "Измерение площади контакта опалубки по RICS NRM 2 (не полный состав работ)";
const EXPECTED_VISIBLE_TITLE = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? EXPECTED_TITLE
  : IS_BIA_TN10_MASONRY
  ? "Обожжённый глиняный кирпич"
  : IS_NRMCA_STRIP_FOUNDATION
    ? "Бетонная смесь B25"
    : EXPECTED_TITLE;
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const OUTPUT_ROOT = argValue("--output-root") ? resolve(argValue("--output-root")!) : resolve(".release-runtime/r4a13-6/exact-physical-norm-successors",
  IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
    ? "web-formwork-frami-xlife-pile-cap-wet-zone-full"
    : IS_BIA_TN10_MASONRY
    ? "web-bia-tn10-masonry-full-family"
    : IS_NRMCA_STRIP_FOUNDATION
      ? "web-strip-foundation-nrmca-cip31"
      : IS_RICS_NRM2_WET_ZONE
        ? "web-formwork-rics-nrm2-wet-zone"
        : IS_RICS_NRM2_STRIP_FOUNDATION_WET_ZONE
          ? "web-formwork-rics-nrm2-strip-foundation-wet-zone"
          : IS_RICS_NRM2_SLAB_FOUNDATION_WET_ZONE
            ? "web-formwork-rics-nrm2-slab-foundation-wet-zone"
            : IS_RICS_NRM2_PILE_CAP_WET_ZONE
              ? "web-formwork-rics-nrm2-pile-cap-wet-zone-measurement-only-v3"
            : "web-formwork-rics-nrm2-measurement-only-v3");
const OUTPUT = resolve(OUTPUT_ROOT, "acceptance.json");
const SEARCH_QUERY = argValue("--search-query") ?? (IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? "полный комплект опалубки ростверка во влажной зоне Doka Frami Xlife"
  : IS_RICS_NRM2_PILE_CAP_WET_ZONE
  ? "устройство опалубки свайного ростверка во влажной зоне"
  : IS_RICS_NRM2_SLAB_FOUNDATION_WET_ZONE
  ? "устройство опалубки плитного фундамента во влажной зоне"
  : IS_RICS_NRM2_STRIP_FOUNDATION_WET_ZONE
    ? "устройство опалубки ленточного фундамента во влажной зоне"
  : IS_RICS_NRM2_WET_ZONE
    ? "устройство опалубки во влажной зоне"
  : IS_BIA_TN10_MASONRY
  ? "Кладка стены из обожжённого глиняного кирпича"
  : IS_NRMCA_STRIP_FOUNDATION
    ? "Устройство монолитного железобетонного ленточного фундамента"
    : "Монтаж и демонтаж опалубки по измеренной площади контакта");
const FORMWORK_DETAILS = [
  "RICS NRM 2.",
  "Измеренная площадь контакта: 100 м2;",
  "ссылка на чертёж: FW-149-REV-A;",
  "тип элемента: WALL;",
  "размеры и количество граней: 50 m x 2 m x 1 measured face;",
  "отделка: PLAIN;",
  "класс геометрии: VERTICAL;",
  "сторона опалубки: SINGLE_SIDED;",
  "правило проёмов и пустот: PROJECT_RULE:no openings in measured scope;",
  "тип опалубки: REMOVABLE;",
  "правило измерения проекта: RICS_NRM2_WS11_CONFIRMED:FW-149-REV-A;",
  "сценарий приёмки: WEB-PREPARE-SAME-RELEASE-V1;",
  "согласование сметчика: EST-FW-149.",
];
const STRIP_FOUNDATION_FORMWORK_DETAILS = [
  "RICS NRM 2.",
  "Измеренная площадь контакта: 100 м2;",
  "ссылка на чертёж: SF-FW-149-REV-A;",
  "тип элемента: STRIP_FOUNDATION;",
  "размеры и количество граней: 50 m x 1 m x 2 measured faces;",
  "отделка: PLAIN;",
  "класс геометрии: VERTICAL;",
  "сторона опалубки: DOUBLE_SIDED;",
  "правило проёмов и пустот: PROJECT_RULE:no openings in measured scope;",
  "тип опалубки: REMOVABLE;",
  "правило измерения проекта: RICS_NRM2_WS11_CONFIRMED:SF-FW-149-REV-A;",
  "сценарий приёмки: WEB-PREPARE-STRIP-FORMWORK-SAME-RELEASE-V1;",
  "согласование сметчика: EST-SF-FW-149.",
];
const SLAB_FOUNDATION_FORMWORK_DETAILS = [
  "RICS NRM 2.",
  "Измеренная площадь контакта: 100 м2;",
  "ссылка на чертёж: SLAB-FW-149-REV-A;",
  "тип элемента: SLAB_FOUNDATION;",
  "размеры и количество граней: PROJECT_MEASURED_CONTACT_AREA:100 m2 formed slab edges;",
  "отделка: PLAIN;",
  "класс геометрии: VERTICAL;",
  "сторона опалубки: SINGLE_SIDED;",
  "правило проёмов и пустот: PROJECT_RULE:no openings in measured scope;",
  "тип опалубки: REMOVABLE;",
  "правило измерения проекта: RICS_NRM2_WS11_CONFIRMED:SLAB-FW-149-REV-A;",
  "сценарий приёмки: WEB-PREPARE-SLAB-FORMWORK-SAME-RELEASE-V1;",
  "согласование сметчика: EST-SLAB-FW-149.",
];
const PILE_CAP_FORMWORK_DETAILS = [
  "RICS NRM 2.",
  "Измеренная площадь контакта: 100 м2;",
  "ссылка на чертёж: PC-FW-149-REV-A;",
  "тип элемента: PILE_CAP;",
  "размеры и количество граней: PROJECT_MEASURED_CONTACT_AREA:100 m2 all formed pile-cap faces;",
  "отделка: PLAIN;",
  "класс геометрии: VERTICAL;",
  "сторона опалубки: DOUBLE_SIDED;",
  "правило проёмов и пустот: PROJECT_RULE:no openings in measured scope;",
  "тип опалубки: REMOVABLE;",
  "правило измерения проекта: RICS_NRM2_WS11_CONFIRMED:PC-FW-149-REV-A;",
  "сценарий приёмки: WEB-PREPARE-PILE-CAP-FORMWORK-SAME-RELEASE-V1;",
  "согласование сметчика: EST-PC-FW-149.",
];
const FRAMI_XLIFE_PILE_CAP_DETAILS = [
  "Опалубка Doka Frami Xlife по RICS NRM 2",
  `измеренная площадь контакта: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.measured_formwork_contact_area_m2} м²`,
  `ссылка на чертёж: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.project_drawing_reference}`,
  `тип элемента: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.element_type}`,
  `размеры и количество граней: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.element_dimensions_and_face_count}`,
  `отделка: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.plain_or_special_finish}`,
  `класс геометрии: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.vertical_battered_horizontal_or_curved_class}`,
  `стороны опалубки: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.single_or_double_sided_scope}`,
  `правило проёмов и пустот: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.openings_voids_and_deduction_rule}`,
  `тип опалубки: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.permanent_or_removable_formwork}`,
  `правило измерения проекта: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.project_measurement_rule_reference}`,
  `согласование сметчика: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.estimator_approval_reference}`,
  `утверждённая раскладка щитов и комплектующих: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.project_formwork_layout_reference}`,
  `согласование раскладки инженером: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.system_engineer_approval_reference}`,
  `толщина бетонируемого элемента: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.foundation_wall_thickness_cm} см`,
  `точный тип и размер щита Frami Xlife: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.panel_specification}`,
  `точный тип углового элемента Frami Xlife: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.corner_element_specification}`,
  `точный тип соединителя щитов Frami: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.panel_connector_specification}`,
  `щиты Frami Xlife по проектной ведомости: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.frami_xlife_panel_count} шт`,
  `угловые элементы Frami Xlife по проектной ведомости: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.frami_xlife_corner_element_count} шт`,
  `соединители щитов Frami по проектной ведомости: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.frami_clamp_count} шт`,
  `плоские стяжки Frami 10–80 см по проектной ведомости: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.flat_tie_rod_10_80_count} шт`,
  `зажимы плоских стяжек Frami по проектной ведомости: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.flat_tie_rod_clip_count} шт`,
  `фундаментные зажимы Frami по проектной ведомости: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.foundation_clamp_count} шт`,
  `подкосы для выверки 260 по проектной ведомости: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.plumbing_strut_260_count} шт`,
  `перфорированная лента 50×2 мм по проектной ведомости: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.perforated_tape_50x2_length_m} м`,
  `точный тип ленты для герметизации стыков: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.joint_sealing_tape_specification}`,
  `лента для герметизации стыков по проектной ведомости: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.joint_sealing_tape_length_m} м`,
  `точный разделительный состав для щитов: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.form_release_agent_specification}`,
  `разделительный состав по проектной ведомости: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.form_release_agent_l} л`,
  `приёмка, сортировка и перемещение комплекта: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.formwork_handling_worker_h} чел·ч`,
  `сборка, установка и выверка опалубки: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.assembly_alignment_worker_h} чел·ч`,
  `распалубка, очистка и подготовка к возврату: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.stripping_cleaning_worker_h} чел·ч`,
  `проверка раскладки и ведомости инженером: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.layout_review_document_count} документ`,
  `работа крана на подачу и перестановку: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.crane_hours} маш·ч`,
  `масса отправляемого комплекта: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.shipping_mass_t} т`,
  `расстояние доставки на объект: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.outbound_distance_km} км`,
  `расстояние возврата арендного комплекта: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.return_distance_km} км`,
  `срок аренды возвратного комплекта: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.rental_duration_days} суток`,
  `число этапов установки и перестановки: ${FORMWORK_FRAMI_XLIFE_EXACT_INPUT.project_stage_count} этапа`,
  "способ обеспечения возвратного комплекта: аренда с возвратом",
  "способ обеспечения расходных материалов: покупка для проекта",
  "способ привлечения рабочих: отдельная работа подрядчика",
  "способ обеспечения крана: отдельная аренда",
  "способ учёта доставки и возврата: доставка и возврат отдельными рейсами",
  "отдельная рабочая площадка: не требуется для фундамента на уровне земли",
  "отдельная поддерживающая конструкция: не требуется для двухсторонней стяжной опалубки",
  "компенсационная вставка: не требуется: утверждённая раскладка без зазоров",
  "отдельный арендный депозит: не предусмотрен предложением поставщика",
  "отдельная сервисная плата за обслуживание: не предусмотрена: включена в условия возврата",
];
const NRMCA_STRIP_FOUNDATION_DETAILS = [
  "по NRMCA CIP 31;",
  "длина самой ленты 40 м; ширина самой ленты 0,5 м; высота бетонной ленты 1,5 м;",
  "толщина бетонной подготовки 0,1 м; класс бетона B25; водонепроницаемость W6; морозостойкость F150; подвижность смеси P4;",
  "запас бетонной смеси 8%; масса арматуры 2,4 т; масса вязальной проволоки 28,8 кг; транспортная масса опалубки 12 т;",
  "placement method: pump; доставка бетонной смеси 18 км; доставка арматуры 18 км; доставка опалубки 18 км;",
  "земляные работы входят: да; объём разработки грунта 54 м3;",
  "подушка основания не входит; гидроизоляция не входит; обратная засыпка не входит; вывоз грунта не входит;",
  "Арматура по утверждённой ведомости стержней, FHWA-HIF-16-026 Table 3 и RICS NRM 2;",
  "масса по утверждённой ведомости стержней: 2400 кг;",
  "ссылка на ведомость стержней: BBS-S01-REV-D;",
  "конструктивный чертёж: STR-S01-REV-D;",
  "стандарт и класс арматуры: ASTM A615 Grade 60;",
  "обозначение размера стержня: No. 5; номинальный диаметр: 15,875 мм;",
  "форма стержня: BENT:shape-code-21;",
  "число стержней и длина резки: 160 bars x 9.75 m approved cut length;",
  "масса погонного метра: 1,552 кг/м;",
  "состав нахлёстов и аксессуаров: PROJECT_SCOPE:all BBS laps and hooks, chairs scheduled separately;",
  "запас изготовления: NONE:INCLUDED_IN_APPROVED_SCHEDULE;",
  "ограничения поставки: NONE:NO_AUTOMATIC_BUNDLE_ROUNDING;",
  "plan volume calculation reference: KJ-4 axes 1-8/A-D rev.5;",
  "mix design or project specification reference: KJ-4 note 7, mix card RM-25-114;",
  "mixture designation: B25 W6 F150 P4, RM-25-114;",
  "placement location: strip foundation axes 1-8/A-D, pour 1;",
  "contingency selection justification: complex formwork and pump remainder per method statement;",
  "delivery schedule and truck capacity: 4 trucks x 8 m3, final load confirmed before dispatch;",
  "producer order confirmation: RM-PRODUCER-2026-0912-17;",
  "estimator approval reference: EST-APPROVAL-2026-0912-04;",
  "согласование сметчика: EST-REBAR-REV-D;",
  "acceptance scenario: WEB-PREPARE-NRMCA-CIP31-V1.",
];
const BIA_TN10_MASONRY_DETAILS = [
  "BIA TN 10 Table 4;",
  "net brick wall area: 90 m2;",
  "gross wall area and opening deductions: GROSS_M2=100,OPENINGS_M2=10,NET_M2=90;",
  "fired clay brick confirmed: true;",
  "brick manufacturer and designation: Acme Brick Modular A-101;",
  "specified and nominal dimensions: specified 194x92x57 mm, nominal 200x100x67 mm;",
  "joint width: 10 mm;",
  "wall thickness and wythe configuration: WYTHE:single 100 mm veneer;",
  "bond pattern: RUNNING_BOND;",
  "selected BIA TN10 Table 4 row: BIA_TN10_TABLE4:modular-single-wythe-running-bond-10mm;",
  "selected brick quantity per m2: 60;",
  "selected mortar quantity per m2: 0.02;",
  "applicable bond correction factors: BRICK_FACTOR=1.05,MORTAR_FACTOR=1.10;",
  "selected project breakage and waste allowances: BRICK_PERCENT=3,MORTAR_PERCENT=5;",
  "supplier package quantities: BRICK_PIECES=500,MORTAR_M3=0.25;",
  "project approval reference: A-E-EST-BRICK-REV-C;",
  "project scope and applicability reference: BIA-WALL-SCOPE-001-REV-D;",
  "wall layout length: 40 m; wall height: 2.5 m;",
  "wall connectors applicable: true; wall connector quantity: 80;",
  "wall connector designation: galvanized connector BIA-WALL-LC-001;",
  "lintels applicable: true; lintel total length: 12 m; lintel designation: precast lintel BIA-WALL-LC-001;",
  "dpc applicable: false; dpc area: 0 m2; dpc product designation: not applicable on prepared slab;",
  "masonry reinforcement applicable: false; masonry reinforcement mass: 0 kg;",
  "masonry reinforcement designation: not applicable by BIA-WALL-SCOPE-001;",
  "brick cutting length: 20 m; masonry saw machine hours: 8;",
  "masonry saw designation: wet masonry saw 350 mm; material handling machine hours: 6;",
  "material handler designation: 2.5 t forklift; work platform applicable: false;",
  "work platform rental days: 0; work platform designation: not applicable at 2.5 m wall height;",
  "engineering inspection applicable: true; engineering inspection hours: 4;",
  "brick unit mass: 2.2 kg; brick delivery distance: 25 km; brick delivery separately priced: true;",
  "mortar density: 2000 kg/m3; mortar delivery distance: 20 km; mortar delivery separately priced: true;",
  "waste haul applicable: true; masonry waste mass: 0.5 t; waste haul distance: 15 km;",
  "lintel and connector schedule reference: BIA-WALL-LC-001-REV-B;",
  "equipment schedule reference: BIA-WALL-EQ-001-REV-A; logistics plan reference: BIA-WALL-LOG-001-REV-A;",
  "quality plan reference: BIA-WALL-QA-001-REV-C",
];
const SELECTED_DETAILS = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? FRAMI_XLIFE_PILE_CAP_DETAILS
  : IS_BIA_TN10_MASONRY
  ? BIA_TN10_MASONRY_DETAILS
  : IS_NRMCA_STRIP_FOUNDATION
    ? NRMCA_STRIP_FOUNDATION_DETAILS
    : IS_RICS_NRM2_STRIP_FOUNDATION_WET_ZONE
      ? STRIP_FOUNDATION_FORMWORK_DETAILS
      : IS_RICS_NRM2_SLAB_FOUNDATION_WET_ZONE
        ? SLAB_FOUNDATION_FORMWORK_DETAILS
        : IS_RICS_NRM2_PILE_CAP_WET_ZONE
          ? PILE_CAP_FORMWORK_DETAILS
        : FORMWORK_DETAILS;
const SELECTED_DETAILS_SEPARATOR = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE ? "\n" : " ";
const PROMPT = [SEARCH_QUERY, ...SELECTED_DETAILS].join(SELECTED_DETAILS_SEPARATOR);

const FORMWORK_FIXTURE: Readonly<Json> = Object.freeze({
  product_profile_id: "standard-profile:rics-nrm2:formwork-measured-contact-area:v1",
  measured_formwork_contact_area_m2: 100,
  project_drawing_reference: "FW-149-REV-A",
  element_type: "WALL",
  element_dimensions_and_face_count: "50 m x 2 m x 1 measured face",
  plain_or_special_finish: "PLAIN",
  vertical_battered_horizontal_or_curved_class: "VERTICAL",
  single_or_double_sided_scope: "SINGLE_SIDED",
  openings_voids_and_deduction_rule: "PROJECT_RULE:no openings in measured scope",
  permanent_or_removable_formwork: "REMOVABLE",
  project_measurement_rule_reference: "RICS_NRM2_WS11_CONFIRMED:FW-149-REV-A",
  estimator_approval_reference: "EST-FW-149.",
});
const STRIP_FOUNDATION_FORMWORK_FIXTURE: Readonly<Json> = Object.freeze({
  product_profile_id: "standard-profile:rics-nrm2:formwork-measured-contact-area:v1",
  measured_formwork_contact_area_m2: 100,
  project_drawing_reference: "SF-FW-149-REV-A",
  element_type: "STRIP_FOUNDATION",
  element_dimensions_and_face_count: "50 m x 1 m x 2 measured faces",
  plain_or_special_finish: "PLAIN",
  vertical_battered_horizontal_or_curved_class: "VERTICAL",
  single_or_double_sided_scope: "DOUBLE_SIDED",
  openings_voids_and_deduction_rule: "PROJECT_RULE:no openings in measured scope",
  permanent_or_removable_formwork: "REMOVABLE",
  project_measurement_rule_reference: "RICS_NRM2_WS11_CONFIRMED:SF-FW-149-REV-A",
  estimator_approval_reference: "EST-SF-FW-149.",
});
const SLAB_FOUNDATION_FORMWORK_FIXTURE: Readonly<Json> = Object.freeze({
  product_profile_id: "standard-profile:rics-nrm2:formwork-measured-contact-area:v1",
  measured_formwork_contact_area_m2: 100,
  project_drawing_reference: "SLAB-FW-149-REV-A",
  element_type: "SLAB_FOUNDATION",
  element_dimensions_and_face_count: "PROJECT_MEASURED_CONTACT_AREA:100 m2 formed slab edges",
  plain_or_special_finish: "PLAIN",
  vertical_battered_horizontal_or_curved_class: "VERTICAL",
  single_or_double_sided_scope: "SINGLE_SIDED",
  openings_voids_and_deduction_rule: "PROJECT_RULE:no openings in measured scope",
  permanent_or_removable_formwork: "REMOVABLE",
  project_measurement_rule_reference: "RICS_NRM2_WS11_CONFIRMED:SLAB-FW-149-REV-A",
  estimator_approval_reference: "EST-SLAB-FW-149.",
});
const PILE_CAP_FORMWORK_FIXTURE: Readonly<Json> = Object.freeze({
  product_profile_id: "standard-profile:rics-nrm2:formwork-measured-contact-area:v1",
  measured_formwork_contact_area_m2: 100,
  project_drawing_reference: "PC-FW-149-REV-A",
  element_type: "PILE_CAP",
  element_dimensions_and_face_count: "PROJECT_MEASURED_CONTACT_AREA:100 m2 all formed pile-cap faces",
  plain_or_special_finish: "PLAIN",
  vertical_battered_horizontal_or_curved_class: "VERTICAL",
  single_or_double_sided_scope: "DOUBLE_SIDED",
  openings_voids_and_deduction_rule: "PROJECT_RULE:no openings in measured scope",
  permanent_or_removable_formwork: "REMOVABLE",
  project_measurement_rule_reference: "RICS_NRM2_WS11_CONFIRMED:PC-FW-149-REV-A",
  estimator_approval_reference: "EST-PC-FW-149.",
});
const NRMCA_STRIP_FOUNDATION_FIXTURE: Readonly<Json> = Object.freeze({
  scope_variant: "full_reinforced_structure",
  total_axis_length_m: 40,
  strip_width_m: 0.5,
  strip_height_m: 1.5,
  preparation_included: true,
  preparation_thickness_m: 0.1,
  concrete_class: "B25",
  watertightness: "W6",
  frost_resistance: "F150",
  mobility: "P4",
  concrete_order_allowance_percent: 8,
  product_profile_id: "method-profile:nrmca-cip31:ready-mix-order:v1",
  plan_volume_calculation_reference: "KJ-4 axes 1-8/A-D rev.5",
  mix_design_or_project_specification_reference: "KJ-4 note 7, mix card RM-25-114",
  mixture_designation: "B25 W6 F150 P4, RM-25-114",
  placement_location: "strip foundation axes 1-8/A-D, pour 1",
  contingency_selection_justification: "complex formwork and pump remainder per method statement",
  delivery_schedule_and_truck_capacity: "4 trucks x 8 m3, final load confirmed before dispatch",
  producer_order_confirmation: "RM-PRODUCER-2026-0912-17",
  estimator_approval_reference: "EST-APPROVAL-2026-0912-04",
  reinforcement_mass_t: 2.4,
  reinforcement_product_profile_id: REINFORCEMENT_PRODUCT_PROFILE_ID,
  bar_bending_schedule_reference: "BBS-S01-REV-D",
  structural_drawing_and_revision_reference: "STR-S01-REV-D",
  bar_standard_and_grade: "ASTM A615 Grade 60",
  bar_size_designation: "No. 5",
  nominal_diameter_mm: 15.875,
  shape_straight_bent_curved_or_link: "BENT:shape-code-21",
  bar_count_and_cut_length_m: "160 bars x 9.75 m approved cut length",
  selected_standard_mass_kg_per_m: 1.552,
  laps_hooks_chairs_connectors_and_accessories_scope:
    "PROJECT_SCOPE:all BBS laps and hooks, chairs scheduled separately",
  fabrication_allowance_if_documented: "NONE:INCLUDED_IN_APPROVED_SCHEDULE",
  supplier_bundle_or_length_constraints: "NONE:NO_AUTOMATIC_BUNDLE_ROUNDING",
  reinforcement_estimator_approval_reference: "EST-REBAR-REV-D",
  binding_wire_mass_kg: 28.8,
  reinforcement_fabrication: "ready_cages",
  formwork_sides: 2,
  formwork_transport_mass_t: 12,
  concrete_supply: "ready_mix",
  placement_method: "pump",
  curing_method: "membrane",
  winter_mode: false,
  pump_productivity_m3_h: 45,
  delivery_separately_priced: true,
  concrete_delivery_distance_km: 18,
  reinforcement_delivery_distance_km: 18,
  formwork_delivery_distance_km: 18,
  groundworks_included: true,
  excavation_volume_m3: 54,
  excavator_productivity_m3_h: 30,
  foundation_bedding_included: false,
  waterproofing_included: false,
  backfill_included: false,
  soil_disposal_included: false,
});
const BIA_TN10_MASONRY_FIXTURE: Readonly<Json> = Object.freeze({
  ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
  gross_wall_area_and_opening_deductions: "GROSS_M2=100,OPENINGS_M2=10,NET_M2=90",
  specified_and_nominal_dimensions: "specified 194x92x57 mm, nominal 200x100x67 mm",
  wall_thickness_and_wythe_configuration: "WYTHE:single 100 mm veneer",
  applicable_bond_correction_factors: "BRICK_FACTOR=1.05,MORTAR_FACTOR=1.10",
  selected_project_breakage_and_waste_allowances: "BRICK_PERCENT=3,MORTAR_PERCENT=5",
  supplier_package_quantities: "BRICK_PIECES=500,MORTAR_M3=0.25",
  wall_connector_designation: "galvanized connector BIA-WALL-LC-001",
  lintel_designation: "precast lintel BIA-WALL-LC-001",
  dpc_product_designation: "not applicable on prepared slab",
  masonry_reinforcement_designation: "not applicable by BIA-WALL-SCOPE-001",
  masonry_saw_designation: "wet masonry saw 350 mm",
  material_handler_designation: "2.5 t forklift",
  work_platform_designation: "not applicable at 2.5 m wall height",
});
const FIXTURE = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? FORMWORK_FRAMI_XLIFE_EXACT_INPUT
  : IS_BIA_TN10_MASONRY
  ? BIA_TN10_MASONRY_FIXTURE
  : IS_NRMCA_STRIP_FOUNDATION
    ? NRMCA_STRIP_FOUNDATION_FIXTURE
    : IS_RICS_NRM2_STRIP_FOUNDATION_WET_ZONE
      ? STRIP_FOUNDATION_FORMWORK_FIXTURE
      : IS_RICS_NRM2_SLAB_FOUNDATION_WET_ZONE
        ? SLAB_FOUNDATION_FORMWORK_FIXTURE
        : IS_RICS_NRM2_PILE_CAP_WET_ZONE
          ? PILE_CAP_FORMWORK_FIXTURE
        : FORMWORK_FIXTURE;
const PRIMARY_MEASURE_PARAMETER_ID = IS_BIA_TN10_MASONRY
  ? "measured_net_brick_wall_area_m2"
  : IS_NRMCA_STRIP_FOUNDATION
    ? "total_axis_length_m"
    : "measured_formwork_contact_area_m2";
const ORIGINAL_PRIMARY_VALUE = IS_BIA_TN10_MASONRY ? 90 : IS_NRMCA_STRIP_FOUNDATION ? 40 : 100;
const SENSITIVITY_PRIMARY_VALUE = IS_BIA_TN10_MASONRY ? 100 : IS_NRMCA_STRIP_FOUNDATION ? 80 : 120;
const ORIGINAL_TARGET_QUANTITY = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? 336
  : IS_BIA_TN10_MASONRY ? 5_670 : IS_NRMCA_STRIP_FOUNDATION ? 32.4 : 100;
const SENSITIVITY_TARGET_QUANTITY = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? 392
  : IS_BIA_TN10_MASONRY ? 6_300 : IS_NRMCA_STRIP_FOUNDATION ? 64.8 : 120;
const TARGET_UNIT_ID = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? "piece_day"
  : IS_BIA_TN10_MASONRY ? "piece" : IS_NRMCA_STRIP_FOUNDATION ? "m3" : "m2";
const SEARCH_VISIBLE_NEEDLE = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? "frami xlife"
  : IS_BIA_TN10_MASONRY ? "кирпич" : IS_NRMCA_STRIP_FOUNDATION ? "ленточн" : "опалубк";
const SCENARIO_LABEL = IS_BIA_TN10_MASONRY ? "90m2-to-100m2" : IS_NRMCA_STRIP_FOUNDATION ? "40m-to-80m" : "100m2-to-120m2";
const FRAMI_SENSITIVITY_PATCH: Readonly<Json> = Object.freeze(Object.fromEntries(
  Object.entries(FORMWORK_FRAMI_XLIFE_SENSITIVITY_INPUT).filter(([parameterId, value]) => (
    typeof value === "number" && FORMWORK_FRAMI_XLIFE_EXACT_INPUT[parameterId] !== value
  )),
));
const FRAMI_UI_SENSITIVITY_INPUT: Readonly<Json> = Object.freeze({
  ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT,
  ...FRAMI_SENSITIVITY_PATCH,
});
const FRAMI_DURATION_INPUT: Readonly<Json> = Object.freeze({
  ...FRAMI_UI_SENSITIVITY_INPUT,
  rental_duration_days: 21,
});
const ACCEPTED_TARGET_QUANTITY = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
  ? 588
  : SENSITIVITY_TARGET_QUANTITY;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`EXACT_FORMWORK_WEB:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function progress(stage: string, details: Json = {}): void {
  process.stdout.write(`${JSON.stringify({ progress: "EXACT_FORMWORK_WEB", stage, ...details })}\n`);
}

async function closePageBounded(page: Page): Promise<void> {
  await Promise.race([
    page.close().catch(() => undefined),
    new Promise<void>((accept) => setTimeout(accept, 5_000)),
  ]);
}

async function json(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

async function loginConsumer(): Promise<{ authorization: string; userId: string }> {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  invariant(credentials.provider_url === PROVIDER, "PROVIDER_IDENTITY_RED");
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.email && consumer?.password && credentials.publishable_key,
    "CONSUMER_CREDENTIALS_MISSING");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  invariant(response.ok && body?.access_token, `CONSUMER_LOGIN_HTTP_${response.status}`);
  return { authorization: `Bearer ${body.access_token}`, userId: String(consumer.user_id) };
}

async function api(authorization: string, path: string, expectedStatus = 200): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.status === expectedStatus,
    `API_${response.status}_EXPECTED_${expectedStatus}:${path}:${String(body.error?.code ?? "")}`);
  return body;
}

async function apiPost(
  authorization: string,
  path: string,
  body: Json,
  expectedStatus = 202,
): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const responseBody = await response.json().catch(() => ({})) as Json;
  invariant(response.status === expectedStatus,
    `API_POST_${response.status}_EXPECTED_${expectedStatus}:${path}:${String(responseBody.error?.code ?? "")}:${String(responseBody.error?.message ?? "")}`);
  return responseBody;
}

async function waitForJob(authorization: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (["succeeded", "failed", "cancelled"].includes(String(job.status))) return job;
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`EXACT_FORMWORK_WEB:JOB_TIMEOUT:${jobId}`);
}

async function waitForSuccessfulRevision(authorization: string, accepted: Json): Promise<Json> {
  const job = await waitForJob(authorization, String(accepted.jobId ?? ""));
  invariant(job.status === "succeeded" && job.resultRevisionId,
    `JOB_${String(job.status)}:${String(job.errorCode ?? "UNKNOWN")}`);
  return api(authorization, `revisions/${job.resultRevisionId}`);
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const result = await api(authorization, `revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(result.rows) ? result.rows : []));
    cursor = String(result.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function enterConsumer(page: Page): Promise<void> {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const consumerInput = page.getByTestId("consumer-repair-problem-input");
    if (await consumerInput.isVisible().catch(() => false)
      && await consumerInput.isEditable().catch(() => false)) return;
    const ownerLogin = page.getByTestId("local-developer-director-login");
    if (await ownerLogin.isVisible().catch(() => false)
      && await ownerLogin.isEnabled().catch(() => false)) {
      await ownerLogin.click({ timeout: 2_000 }).catch(() => undefined);
    } else {
      const login = page.getByTestId("auth.login.local-consumer")
        .or(page.getByTestId("protected-identity-local-consumer-login")).first();
      if (await login.isVisible().catch(() => false) && await login.isEnabled().catch(() => false)) {
        await login.click({ timeout: 2_000 }).catch(() => undefined);
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error("EXACT_FORMWORK_WEB:CONSUMER_ROUTE_NOT_READY");
}

async function openRevision(page: Page, revisionId: string): Promise<void> {
  await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(revisionId)}`, {
    waitUntil: "commit",
    timeout: 180_000,
  });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await enterConsumer(page);
  await page.getByTestId("request-estimate-items-total-count").waitFor({ state: "visible", timeout: 90_000 });
}

async function expandFilledParameters(page: Page): Promise<void> {
  const toggle = page.getByTestId("request-estimate-filled-parameters-toggle");
  if (!await toggle.isVisible().catch(() => false)) return;
  const label = await toggle.innerText().catch(() => "");
  if (label.includes("Показать ещё")) await toggle.click();
}

function preliminaryNeeds(revision: Json): Json[] {
  return Array.isArray(revision.preliminaryNeeds) ? revision.preliminaryNeeds : [];
}

function assertPreliminaryScopeTruth(revision: Json, expectedQuantity: number): Json | null {
  const needs = preliminaryNeeds(revision);
  if (!IS_RICS_NRM2_FORMWORK) {
    invariant(needs.length === 0, "REVISION_REMAINS_PRELIMINARY");
    return null;
  }
  invariant(needs.length === 1, `FORMWORK_SCOPE_GAP_COUNT_${needs.length}_EXPECTED_1`);
  const need = needs[0]!;
  invariant(need.rowId === FORMWORK_FULL_SCOPE_GAP_ROW_ID
    && need.titleRu === FORMWORK_FULL_SCOPE_GAP_TITLE_RU
    && need.needState === "CONDITION_REQUIRED"
    && JSON.stringify(need.missingParameterIds) === JSON.stringify([FORMWORK_FULL_SCOPE_PARAMETER_ID])
    && Number(need.quantity) === expectedQuantity
    && need.unitId === "m2"
    && need.unitPrice == null
    && need.selected === true
    && need.procurementEligible === false
    && /^[0-9a-f]{64}$/u.test(String(need.needSha256 ?? "")),
  `FORMWORK_SCOPE_GAP_TRUTH_RED:${JSON.stringify(need)}`);
  return need;
}

async function assertPreliminaryScopeVisible(page: Page): Promise<void> {
  if (!IS_RICS_NRM2_FORMWORK) return;
  await page.locator('[data-testid^="consumer-repair-item-title-"]')
    .filter({ hasText: FORMWORK_FULL_SCOPE_GAP_TITLE_RU })
    .waitFor({ state: "visible", timeout: 90_000 });
  const body = await page.locator("body").innerText();
  invariant(body.includes(FORMWORK_FULL_SCOPE_GAP_TITLE_RU), "FORMWORK_SCOPE_GAP_NOT_VISIBLE");
}

function assertExactRevision(revision: Json, rows: Json[], expectedQuantity: number): Json {
  invariant(revision.releaseId === RELEASE_ID, "REVISION_RELEASE_DRIFT");
  invariant(revision.catalogId === CATALOG_ID, "REVISION_CATALOG_DRIFT");
  invariant(revision.definitionVersionId === DEFINITION_ID, "REVISION_DEFINITION_DRIFT");
  assertPreliminaryScopeTruth(revision, expectedQuantity);
  invariant(rows.length === Number(revision.rowCount)
    && (IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
      ? rows.length === 24
      : IS_BIA_TN10_MASONRY ? rows.length === 18 : IS_NRMCA_STRIP_FOUNDATION ? rows.length > 1 : rows.length === 1),
  "REVISION_ROW_DENOMINATOR_RED");
  const row = rows.find((candidate) => candidate.rowId === ROW_ID);
  invariant(row != null, "TARGET_ROW_MISSING");
  invariant(row.rowId === ROW_ID && String(row.titleRu).includes(EXPECTED_TITLE), "ROW_IDENTITY_RED");
  invariant(Number(row.quantity) === expectedQuantity && row.unitId === TARGET_UNIT_ID,
    "ROW_QUANTITY_OR_UNIT_RED");
  invariant(row.unitPrice == null && row.amount == null, "UNKNOWN_PRICE_WAS_ZEROED");
  invariant(IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE || IS_NRMCA_STRIP_FOUNDATION || IS_BIA_TN10_MASONRY
    ? row.procurementEligible === true && row.includedInProcurement === true
    : row.procurementEligible === false && row.includedInProcurement === false,
  "TARGET_ROW_PROCUREMENT_TRUTH_RED");
  invariant(row.includedInEstimate === true, "EXACT_ROW_EXCLUDED");
  const trace = Array.isArray(row.normativeTrace)
    ? row.normativeTrace.find((candidate: Json) => candidate.source_id === SOURCE_ID
      && (NORM_ID == null || candidate.norm_id === NORM_ID))
    : null;
  invariant(trace?.source_id === SOURCE_ID && (NORM_ID == null || trace?.norm_id === NORM_ID),
    "NORMALIZED_SOURCE_IDENTITY_RED");
  const resourceGraph = row.calculationTrace?.resourceGraph;
  if (IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE) {
    invariant(resourceGraph?.contract === "formwork-frami-xlife-project-kit-r1"
      && resourceGraph?.quantitySource === "APPROVED_PROJECT_SCHEDULE_DIRECT"
      && resourceGraph?.returnable === true
      && resourceGraph?.universalAreaRateApplied === false
      && resourceGraph?.universalTurnoverFactorApplied === false,
    "FRAMI_PROJECT_SCHEDULE_BINDING_MISSING");
    const expected = expectedQuantity === ORIGINAL_TARGET_QUANTITY
      ? {
        "information:formwork:measured-contact-area": 100,
        "material:formwork:perforated-tape-50x2": 50,
        "work:formwork:assemble-install-align": 72,
        "equipment:formwork:crane-handling": 6,
        "delivery:formwork:outbound-kit": 60,
        "delivery:formwork:return-kit": 60,
      }
      : {
        "information:formwork:measured-contact-area": 120,
        "material:formwork:perforated-tape-50x2": 60,
        "work:formwork:assemble-install-align": 86,
        "equipment:formwork:crane-handling": 7.2,
        "delivery:formwork:outbound-kit": 70,
        "delivery:formwork:return-kit": 70,
      };
    for (const [rowId, quantity] of Object.entries(expected)) {
      const exact = rows.find((candidate) => candidate.rowId === rowId);
      invariant(exact != null && Number(exact.quantity) === quantity,
        `FRAMI_COMPOSITION_QUANTITY_RED:${rowId}`);
    }
    invariant(rows.filter((candidate) => candidate.includedInEstimate).length === 17
      && rows.filter((candidate) => candidate.includedInProcurement).length === 14
      && rows.every((candidate) => candidate.unitPrice == null && candidate.amount == null),
    "FRAMI_COMPLETE_COMPOSITION_TRUTH_RED");
  } else {
    const binding = resourceGraph?.professionalPhysicalNormBindingV1;
    invariant(binding?.product_profile_id === FIXTURE.product_profile_id,
      "PHYSICAL_BINDING_MISSING");
  }
  if (IS_BIA_TN10_MASONRY) {
    const wallAreaM2 = expectedQuantity === ORIGINAL_TARGET_QUANTITY
      ? ORIGINAL_PRIMARY_VALUE
      : SENSITIVITY_PRIMARY_VALUE;
    const expectedMortarQuantity = wallAreaM2 === ORIGINAL_PRIMARY_VALUE ? 1.98 : 2.2;
    const mortar = rows.find((candidate) => candidate.rowId === "material:bia-tn10:masonry-mortar");
    invariant(mortar != null
      && String(mortar.titleRu).includes("Кладочный раствор по выбранной строке BIA TN 10 Table 4")
      && Number(mortar.quantity) === expectedMortarQuantity
      && mortar.unitId === "m3"
      && mortar.procurementEligible === true
      && mortar.includedInEstimate === true
      && mortar.includedInProcurement === true,
    "MASONRY_MORTAR_ROW_TRUTH_RED");
    const mortarTrace = Array.isArray(mortar.normativeTrace)
      ? mortar.normativeTrace.find((candidate: Json) => candidate.source_id === SOURCE_ID
        && candidate.norm_id === NORM_ID)
      : null;
    const mortarBinding = mortar.calculationTrace?.resourceGraph?.professionalPhysicalNormBindingV1;
    invariant(mortarTrace != null && mortarBinding?.product_profile_id === FIXTURE.product_profile_id,
      "MASONRY_MORTAR_NORMATIVE_BINDING_RED");
    const expectedWorkRows = [
      ["work:bia-tn10:brick-wall-laying", "Кладка стены из обожжённого глиняного кирпича"],
      ["work:bia-tn10:joint-and-geometry-control", "Контроль геометрии стены"],
      ["work:bia-tn10:cleaning-and-handover", "Очистка кладки"],
    ];
    for (const [rowId, title] of expectedWorkRows) {
      const work = rows.find((candidate) => candidate.rowId === rowId);
      invariant(work != null && String(work.titleRu).includes(title)
        && Number(work.quantity) === wallAreaM2 && work.unitId === "m2"
        && work.procurementEligible === false && work.includedInEstimate === true
        && work.includedInProcurement === false
        && Array.isArray(work.normativeTrace) && work.normativeTrace.length === 0,
      `MASONRY_WORK_ROW_TRUTH_RED:${rowId}`);
    }
    const exactQuantities = {
      "material:bia-tn10:wall-connectors": 80,
      "material:bia-tn10:opening-lintels": 12,
      "work:bia-tn10:wall-setting-out": wallAreaM2 === 90 ? 40 : 44,
      "work:bia-tn10:gross-wall-geometry-check": wallAreaM2 === 90 ? 100 : 110,
      "work:bia-tn10:brick-cutting-and-fitting": 20,
      "equipment:bia-tn10:masonry-saw": 8,
      "equipment:bia-tn10:material-handler": 6,
      "service:bia-tn10:engineering-inspection": 4,
      "delivery:bia-tn10:fired-clay-brick": wallAreaM2 === 90 ? 330 : 357.5,
      "delivery:bia-tn10:masonry-mortar": wallAreaM2 === 90 ? 90 : 100,
      "delivery:bia-tn10:masonry-waste-haul": 7.5,
    } as const;
    for (const [rowId, quantity] of Object.entries(exactQuantities)) {
      const exact = rows.find((candidate) => candidate.rowId === rowId);
      invariant(exact != null && Number(exact.quantity) === quantity && exact.includedInEstimate === true,
        `MASONRY_FULL_SCOPE_QUANTITY_RED:${rowId}`);
    }
    invariant(rows.filter((candidate) => candidate.category === "material").length === 4
      && rows.filter((candidate) => candidate.category === "construction_work").length === 8
      && rows.filter((candidate) => candidate.category === "equipment").length === 2
      && rows.filter((candidate) => candidate.category === "service").length === 1
      && rows.filter((candidate) => candidate.category === "delivery").length === 3
      && rows.filter((candidate) => candidate.includedInProcurement).length === 10
      && !rows.some((candidate) => candidate.rowId === "material:bia-tn10:dpc-membrane")
      && !rows.some((candidate) => candidate.rowId === "material:bia-tn10:masonry-reinforcement")
      && !rows.some((candidate) => candidate.rowId === "equipment:bia-tn10:work-platform")
      && rows.every((candidate) => candidate.unitPrice == null && candidate.amount == null),
    "MASONRY_FULL_APPLICABLE_COMPOSITION_RED");
  }
  invariant(Number(revision.totals?.unpricedRowCount) > 0
    && Number(revision.totals?.pricedRowCount) === 0,
  "UNKNOWN_PRICE_TOTALS_RED");
  if (IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE) {
    invariant(Number(revision.totals?.includedRowCount) === 17
      && Number(revision.totals?.excludedRowCount) === 7
      && Number(revision.totals?.unpricedRowCount) === 17,
    "FRAMI_TOTALS_DENOMINATOR_RED");
  }
  return row;
}

function assertExactReinforcement(rows: Json[]): Json | null {
  if (!IS_NRMCA_STRIP_FOUNDATION) return null;
  const row = rows.find((candidate) => candidate.rowId === REINFORCEMENT_ROW_ID);
  invariant(row != null && String(row.titleRu).includes("Арматурная сталь"),
    "REINFORCEMENT_ROW_IDENTITY_RED");
  invariant(Number(row.quantity) === 2.4 && row.unitId === "t",
    "REINFORCEMENT_QUANTITY_OR_UNIT_RED");
  invariant(row.unitPrice == null && row.amount == null, "REINFORCEMENT_UNKNOWN_PRICE_WAS_ZEROED");
  invariant(row.procurementEligible === true && row.includedInProcurement === true
    && row.includedInEstimate === true, "REINFORCEMENT_PROCUREMENT_TRUTH_RED");
  const traceRows = Array.isArray(row.normativeTrace) ? row.normativeTrace as Json[] : [];
  const trace = traceRows.find((candidate: Json) => candidate.source_id === REINFORCEMENT_SOURCE_ID
    && candidate.norm_id === REINFORCEMENT_NORM_ID);
  invariant(trace?.source_id === REINFORCEMENT_SOURCE_ID
    && trace?.norm_id === REINFORCEMENT_NORM_ID,
  "REINFORCEMENT_NORMALIZED_SOURCE_IDENTITY_RED");
  invariant(!traceRows.some((candidate: Json) => candidate.source_id
    === "src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1"),
  "REINFORCEMENT_LEGACY_KG_PER_M3_SOURCE_VISIBLE");
  const binding = row.calculationTrace?.resourceGraph?.professionalPhysicalNormBindingV1;
  invariant(binding?.product_profile_id === REINFORCEMENT_PRODUCT_PROFILE_ID
    && binding?.activation?.parameter_id === "reinforcement_product_profile_id"
    && binding?.parameter_projection_v1?.formulas?.approved_reinforcement_schedule_weight_kg
      === "reinforcement_mass_t * 1000",
  "REINFORCEMENT_PHYSICAL_BINDING_MISSING");
  return row;
}

async function ensurePreparedRevision(authorization: string, revision: Json): Promise<Json> {
  void authorization;
  assertPreliminaryScopeTruth(revision, ORIGINAL_TARGET_QUANTITY);
  const mismatches = Object.entries(FIXTURE)
    .filter(([key, value]) => typeof value === "number"
      ? Number(revision.parameters?.[key]) !== value
      : revision.parameters?.[key] !== value)
    .map(([key]) => key);
  invariant(mismatches.length === 0,
    `WEB_PREPARE_DID_NOT_CREATE_EXPECTED_EXACT_REVISION:${mismatches.join(",")}`);
  return revision;
}

async function buildArtifact(
  authorization: string,
  revision: Json,
  kind: "pdf" | "procurement",
): Promise<Json> {
  const documentProfile = kind === "pdf" ? "professional_v1" : null;
  const accepted = await apiPost(authorization, `revisions/${revision.revisionId}/artifacts/${kind}`, {
    idempotencyKey: `exact-formwork-${kind}-${revision.revisionId}`,
    ...(documentProfile ? { documentProfile } : {}),
  });
  if (accepted.jobId) {
    const job = await waitForJob(authorization, String(accepted.jobId));
    invariant(job.status === "succeeded",
      `ARTIFACT_${kind}_JOB_${String(job.status)}:${String(job.errorCode ?? "")}`);
  } else {
    invariant(accepted.created === false && accepted.artifactId,
      `ARTIFACT_${kind}_IDEMPOTENT_REPLAY_RED`);
  }
  const suffix = documentProfile ? `?documentProfile=${documentProfile}` : "";
  const artifact = await api(authorization,
    `revisions/${revision.revisionId}/artifacts/${kind}${suffix}`);
  invariant(artifact.status === "ready" && artifact.revisionId === revision.revisionId
    && artifact.releaseId === RELEASE_ID, `ARTIFACT_${kind}_IDENTITY_RED`);
  invariant(artifact.signedUrl && Number(artifact.byteSize) > 0 && /^[0-9a-f]{64}$/u.test(artifact.sha256),
    `ARTIFACT_${kind}_FILE_IDENTITY_RED`);
  const fileResponse = await fetch(artifact.signedUrl, { signal: AbortSignal.timeout(120_000) });
  const bytes = Buffer.from(await fileResponse.arrayBuffer());
  invariant(fileResponse.ok && bytes.byteLength === Number(artifact.byteSize)
    && sha256(bytes) === artifact.sha256, `ARTIFACT_${kind}_DOWNLOAD_PARITY_RED`);
  const projection = kind === "procurement"
    ? JSON.parse(bytes.toString("utf8")) as Json
    : null;
  return { ...artifact, downloadedByteSize: bytes.byteLength, downloadedSha256: sha256(bytes), projection };
}

async function databaseProof(revisionIds: string[], negativeJobIds: string[]): Promise<Json> {
  const client = new Client({ connectionString: DATABASE_URL, application_name: "exact-formwork-web-proof" });
  await client.connect();
  try {
    const revisions = (await client.query(`select id::text,parent_revision_id::text,release_id::text,
        definition_version_id::text,catalog_id,revision_number,row_count,totals,checksum_sha256,
        amendment_contract#>'{parameterSources,preliminaryNeeds}' preliminary_needs
      from public.estimate_revision where id=any($1::uuid[]) order by revision_number`, [revisionIds])).rows;
    const rows = (await client.query(`select revision_id::text,row_id,title_ru,unit_id,quantity,unit_price,amount,
        procurement_eligible,included_in_estimate,included_in_procurement,normative_trace,calculation_trace
      from public.estimate_revision_row where revision_id=any($1::uuid[]) order by revision_id,ordinal`,
    [revisionIds])).rows;
    const negativeJobs = (await client.query(`select id::text,status,error_code,result_revision_id::text
      from public.estimate_compile_job where id=any($1::uuid[]) order by created_at`, [negativeJobIds])).rows;
    const release = (await client.query(`select id::text,status,activated_at from public.estimate_definition_release
      where id=$1`, [RELEASE_ID])).rows[0];
    const search = (await client.query(`select id::text,status,activated_at from public.estimate_search_index_release
      where id=$1`, [SEARCH_RELEASE_ID])).rows[0];
    invariant(revisions.length === revisionIds.length
      && revisionIds.every((revisionId) => rows.some((row) => row.revision_id === revisionId)),
    "DATABASE_REVISION_PARITY_RED");
    if (IS_RICS_NRM2_FORMWORK) {
      invariant(revisions.every((revision) => Array.isArray(revision.preliminary_needs)
        && revision.preliminary_needs.length === 1
        && revision.preliminary_needs[0]?.row_id === FORMWORK_FULL_SCOPE_GAP_ROW_ID
        && revision.preliminary_needs[0]?.need_state === "CONDITION_REQUIRED"
        && JSON.stringify(revision.preliminary_needs[0]?.missing_parameter_ids)
          === JSON.stringify([FORMWORK_FULL_SCOPE_PARAMETER_ID]))
        && !rows.some((row) => row.row_id === FORMWORK_FULL_SCOPE_GAP_ROW_ID),
      "DATABASE_PRELIMINARY_SCOPE_PARITY_RED");
    }
    invariant(negativeJobs.length === negativeJobIds.length
      && negativeJobs.every((job) => job.status === "failed" && job.result_revision_id == null),
    "DATABASE_NEGATIVE_JOB_PARITY_RED");
    invariant(release.status === "prepared" && release.activated_at == null
      && search.status === "draft" && search.activated_at == null, "CANDIDATE_ACTIVATION_DRIFT");
    return { revisions, rows, negativeJobs, release, search };
  } finally {
    await client.end();
  }
}

async function openColdRevision(context: BrowserContext, revision: Json, screenshot: string): Promise<Json> {
  const page = await context.newPage();
  try {
    await openRevision(page, revision.revisionId);
    await page.locator('[data-testid^="consumer-repair-item-title-"]')
      .filter({ hasText: EXPECTED_VISIBLE_TITLE }).waitFor({ state: "visible", timeout: 90_000 });
    await assertPreliminaryScopeVisible(page);
    const body = await page.locator("body").innerText();
    const expectedQuantityText = String(ACCEPTED_TARGET_QUANTITY);
    invariant(body.includes(expectedQuantityText)
      || body.includes(expectedQuantityText.replace(".", ",")), "COLD_REOPEN_QUANTITY_RED");
    if (IS_BIA_TN10_MASONRY) {
      const mortarQuantityText = String(SENSITIVITY_PRIMARY_VALUE === 100 ? 2.2 : 1.98);
      invariant(body.includes(mortarQuantityText) || body.includes(mortarQuantityText.replace(".", ",")),
        "COLD_REOPEN_MORTAR_QUANTITY_RED");
      invariant(body.includes("Контроль геометрии стены") && body.includes("Очистка кладки"),
        "COLD_REOPEN_COMPLETE_MASONRY_ESTIMATE_RED");
      const positionsPanel = page.getByTestId("request-estimate-positions-panel");
      const positionsToggle = page.getByTestId("request-estimate-positions-toggle");
      if (!await positionsPanel.isVisible().catch(() => false)) await positionsToggle.click();
      await positionsPanel.waitFor({ state: "visible", timeout: 60_000 });
      const expandedBody = await page.locator("body").innerText();
      invariant(expandedBody.includes("Машина для мокрой резки обожжённого глиняного кирпича")
        && expandedBody.includes("Инженерная приёмка геометрии, швов и перевязки кирпичной кладки")
        && expandedBody.includes("Доставка выбранного обожжённого глиняного кирпича на объект")
        && expandedBody.includes("Вывоз отходов резки и боя кирпичной кладки"),
      "COLD_REOPEN_FULL_MASONRY_EQUIPMENT_SERVICE_LOGISTICS_RED");
    } else if (IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE) {
      const positionsPanel = page.getByTestId("request-estimate-positions-panel");
      const positionsToggle = page.getByTestId("request-estimate-positions-toggle");
      if (!await positionsPanel.isVisible().catch(() => false)
        && (await positionsToggle.innerText().catch(() => "")).includes("Показать позиции")) {
        await positionsToggle.click();
      }
      await positionsPanel.waitFor({ state: "visible", timeout: 60_000 });
      const expandedBody = await page.locator("body").innerText();
      invariant(expandedBody.includes("Перфорированная лента Frami 50×2 мм")
        && expandedBody.includes("Сборка, установка, крепление и выверка опалубки")
        && expandedBody.includes("Доставка комплекта опалубки на объект")
        && expandedBody.includes("Возврат арендного комплекта опалубки поставщику"),
      "COLD_REOPEN_COMPLETE_FRAMI_ESTIMATE_RED");
    } else if (!IS_NRMCA_STRIP_FOUNDATION) {
      invariant(!body.includes("2.4"), "COLD_REOPEN_OLD_FACTOR_RED");
    }
    await page.screenshot({ path: screenshot, fullPage: true });
    return {
      revisionId: revision.revisionId,
      revisionNumber: revision.revisionNumber,
      rowTitleVisible: true,
      expectedQuantity: ACCEPTED_TARGET_QUANTITY,
      expectedQuantityVisible: true,
      oldFactorVisible: IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
        || IS_NRMCA_STRIP_FOUNDATION || IS_BIA_TN10_MASONRY ? null : false,
      preliminaryScopeGapVisible: IS_RICS_NRM2_FORMWORK ? true : null,
      screenshot,
    };
  } finally {
    await page.close();
  }
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const { authorization: apiAuthorization, userId } = await loginConsumer();
  const manifest = await api(apiAuthorization, "runtime-manifest");
  invariant(manifest.runtimeRole === "FULL_CANONICAL_ESTIMATE_BACKEND"
    && manifest.compatibilityTuple?.definitionReleaseId === RELEASE_ID
    && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
    && Number(manifest.activeCompileJobCount) === 0, "RUNTIME_TUPLE_RED");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  let authorization = "";
  const backendRequests: Json[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(`${BACKEND}/`)) return;
    const header = request.headers().authorization ?? "";
    if (header.startsWith("Bearer ")) authorization = header;
  });
  page.on("response", (response) => {
    if (!response.url().startsWith(`${BACKEND}/`)) return;
    backendRequests.push({ method: response.request().method(), path: new URL(response.url()).pathname,
      status: response.status(), requestId: response.headers()["x-request-id"] ?? null });
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 1_000));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => requestFailures.push(
    `${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText ?? ""}`,
  ));

  let initialRevision: Json;
  let preparedRevision: Json;
  let sensitivityRevision: Json;
  let durationRevision: Json | null = null;
  let originalRow: Json;
  let sensitivityRow: Json;
  let durationRow: Json | null = null;
  let originalReinforcementRow: Json | null = null;
  let sensitivityReinforcementRow: Json | null = null;
  let searchEvidence: Json;
  let compileIngress: Json;
  try {
    await page.goto(`${ORIGIN}/request?exactNormProfile=${encodeURIComponent(PROFILE_ID)}&run=${Date.now()}`,
      { waitUntil: "commit", timeout: 180_000 });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await enterConsumer(page);
    progress("CONSUMER_READY");
    const input = page.getByTestId("consumer-repair-problem-input");
    invariant(await input.isEditable().catch(() => false), "CONSUMER_SEARCH_INPUT_NOT_EDITABLE");
    await input.fill("");
    const searchPromise = page.waitForResponse((response) => {
      const responseUrl = new URL(response.url());
      return responseUrl.origin === BACKEND
        && responseUrl.pathname === "/search/catalog"
        && responseUrl.searchParams.get("query") === SEARCH_QUERY
        && response.status() === 200;
    }, { timeout: 120_000 });
    const [searchResponse] = await Promise.all([searchPromise, input.fill(SEARCH_QUERY)]);
    const search = await json(searchResponse);
    invariant(search.searchIndexReleaseId === SEARCH_RELEASE_ID, "SEARCH_RELEASE_DRIFT");
    const items = Array.isArray(search.items) ? search.items as Json[] : [];
    const selectedIndex = items.findIndex((item) => item.catalogId === CATALOG_ID);
    invariant(selectedIndex >= 0, "EXACT_WORK_NOT_FOUND_BY_PROFESSIONAL_NAME");
    progress("SEARCH_READY", { selectedIndex, itemCount: items.length });
    const suggestion = page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`);
    await suggestion.waitFor({ state: "visible", timeout: 120_000 });
    const selectedWorkText = (await suggestion.innerText()).trim();
    invariant(selectedWorkText.toLocaleLowerCase("ru-RU").includes(SEARCH_VISIBLE_NEEDLE),
      "SEARCH_VISIBLE_TITLE_RED");
    if (IS_RICS_NRM2_FORMWORK) {
      invariant(selectedWorkText.includes("(не полный состав работ)")
        && !selectedWorkText.includes("Монтаж и демонтаж опалубки"),
      "SEARCH_MEASUREMENT_ONLY_SCOPE_RED");
    }
    await suggestion.click();
    const selectedPrefix = await input.inputValue();
    invariant(selectedPrefix.toLocaleLowerCase("ru-RU").includes(SEARCH_VISIBLE_NEEDLE),
      "SELECTED_PREFIX_RED");
    await input.fill(`${selectedPrefix}${SELECTED_DETAILS_SEPARATOR}${SELECTED_DETAILS.join(SELECTED_DETAILS_SEPARATOR)}`);
    progress("WORK_SELECTED", { selectedWorkText });
    invariant(authorization.startsWith("Bearer "), "BROWSER_AUTHORIZATION_MISSING");
    const historyBefore = await api(authorization, `revisions?catalogId=${encodeURIComponent(CATALOG_ID)}&limit=100`);
    const beforeRows = Array.isArray(historyBefore.revisions) ? historyBefore.revisions as Json[] : [];
    const prepareButton = page.getByTestId("consumer-repair-prepare-draft");
    const prepareState = {
      visible: await prepareButton.isVisible().catch(() => false),
      enabled: await prepareButton.isEnabled().catch(() => false),
      label: await prepareButton.innerText().catch(() => ""),
    };
    invariant(prepareState.visible && prepareState.enabled, "WEB_PREPARE_BUTTON_NOT_READY");
    const compilePromise = page.waitForResponse((response) => response.url().endsWith("/jobs/compile")
      && response.request().method() === "POST", { timeout: 30_000 });
    await prepareButton.click();
    let compileResponse: Response;
    try {
      compileResponse = await compilePromise;
    } catch (error) {
      const diagnostic = {
        capturedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        url: page.url(),
        inputValue: await input.inputValue().catch(() => ""),
        prepareStateAfterClick: {
          visible: await prepareButton.isVisible().catch(() => false),
          enabled: await prepareButton.isEnabled().catch(() => false),
          label: await prepareButton.innerText().catch(() => ""),
        },
        statusMessages: await page.locator('[data-testid*="status"], [role="alert"]')
          .allInnerTexts().catch(() => []),
        bodyText: (await page.locator("body").innerText().catch(() => "")).slice(0, 20_000),
        backendRequests,
        consoleErrors,
        pageErrors,
        requestFailures,
      };
      const diagnosticPath = resolve(OUTPUT_ROOT, "prepare-button-diagnostic.json");
      atomicJson(diagnosticPath, diagnostic);
      await page.screenshot({ path: resolve(OUTPUT_ROOT, "prepare-button-diagnostic.png"), fullPage: true });
      throw new Error(`EXACT_FORMWORK_WEB:WEB_PREPARE_NO_COMPILE_POST:${diagnosticPath}`);
    }
    const compileBody = await json(compileResponse);
    invariant(compileResponse.status() === 202,
      `WEB_COMPILE_HTTP_${compileResponse.status()}:${String(compileBody.error?.code ?? "")}`);
    compileIngress = {
      kind: "WEB_PREPARE_BUTTON",
      prepareState,
    };
    progress("COMPILE_ACCEPTED");
    initialRevision = await waitForSuccessfulRevision(authorization, compileBody);
    preparedRevision = await ensurePreparedRevision(authorization, initialRevision);
    const preparedRows = await allRows(authorization, preparedRevision.revisionId);
    originalRow = assertExactRevision(preparedRevision, preparedRows, ORIGINAL_TARGET_QUANTITY);
    originalReinforcementRow = assertExactReinforcement(preparedRows);
    progress(IS_RICS_NRM2_FORMWORK ? "MEASUREMENT_ONLY_PRELIMINARY_ORIGINAL_GREEN" : "FULL_ORIGINAL_GREEN",
      { revisionId: preparedRevision.revisionId,
      primaryValue: ORIGINAL_PRIMARY_VALUE, targetQuantity: ORIGINAL_TARGET_QUANTITY });
    await openRevision(page, preparedRevision.revisionId);
    await page.locator('[data-testid^="consumer-repair-item-title-"]')
      .filter({ hasText: EXPECTED_VISIBLE_TITLE }).waitFor({ state: "visible", timeout: 90_000 });
    await assertPreliminaryScopeVisible(page);
    const originalScreenshot = resolve(OUTPUT_ROOT,
      `${IS_RICS_NRM2_FORMWORK ? "01_preliminary" : "01_full"}_${ORIGINAL_PRIMARY_VALUE}.png`);
    await page.screenshot({ path: originalScreenshot, fullPage: true });

    const areaChip = page.getByTestId(`editable-param-chip-${PRIMARY_MEASURE_PARAMETER_ID}`);
    if (!await areaChip.isVisible().catch(() => false)) {
      const toggle = page.getByTestId("request-estimate-parameters-toggle");
      if (await toggle.isVisible().catch(() => false)) await toggle.click();
      const showMore = page.getByTestId("request-estimate-show-more-parameters");
      if (await showMore.isVisible().catch(() => false)) await showMore.click();
    }
    await areaChip.waitFor({ state: "visible", timeout: 60_000 });
    if (IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE) {
      await expandFilledParameters(page);
    }
    const areaInput = areaChip.getByTestId("editable-param-popover-input");
    await areaInput.fill(String(SENSITIVITY_PRIMARY_VALUE));
    if (IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE) {
      for (const [parameterId, value] of Object.entries(FRAMI_SENSITIVITY_PATCH)) {
        if (parameterId === PRIMARY_MEASURE_PARAMETER_ID) continue;
        const chip = page.getByTestId(`editable-param-chip-${parameterId}`);
        if (!await chip.isVisible().catch(() => false)) await expandFilledParameters(page);
        await chip.waitFor({ state: "visible", timeout: 60_000 });
        await chip.getByTestId("editable-param-popover-input").fill(String(value));
      }
    } else if (IS_BIA_TN10_MASONRY) {
      for (const [parameterId, value] of [
        ["wall_layout_length_m", "44"],
        ["gross_wall_area_and_opening_deductions", "GROSS_M2=110,OPENINGS_M2=10,NET_M2=100"],
      ] as const) {
        const chip = page.getByTestId(`editable-param-chip-${parameterId}`);
        if (!await chip.isVisible().catch(() => false)) await expandFilledParameters(page);
        await chip.waitFor({ state: "visible", timeout: 60_000 });
        await chip.getByTestId("editable-param-popover-input").fill(value);
      }
    }
    await page.getByTestId("editable-param-batch-bar").waitFor({ state: "visible", timeout: 30_000 });
    const recalculatePromise = page.waitForResponse((response) => response.url().endsWith("/jobs/recalculate")
      && response.request().method() === "POST", { timeout: 60_000 });
    const [recalculateResponse] = await Promise.all([
      recalculatePromise,
      page.getByTestId("editable-param-batch-apply").click(),
    ]);
    const recalculateAccepted = await json(recalculateResponse);
    invariant(recalculateResponse.status() === 202, `SENSITIVITY_HTTP_${recalculateResponse.status()}`);
    sensitivityRevision = await waitForSuccessfulRevision(authorization, recalculateAccepted);
    invariant(sensitivityRevision.parentRevisionId === preparedRevision.revisionId, "SENSITIVITY_PARENT_DRIFT");
    if (IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE) {
      const mismatches = Object.entries(FRAMI_UI_SENSITIVITY_INPUT)
        .filter(([parameterId, value]) => typeof value === "number"
          ? Number(sensitivityRevision.parameters?.[parameterId]) !== value
          : sensitivityRevision.parameters?.[parameterId] !== value)
        .map(([parameterId]) => parameterId);
      invariant(mismatches.length === 0,
        `FRAMI_SENSITIVITY_PARAMETER_DRIFT:${mismatches.join(",")}`);
    } else if (IS_BIA_TN10_MASONRY) {
      invariant(Number(sensitivityRevision.parameters?.measured_net_brick_wall_area_m2) === 100
        && Number(sensitivityRevision.parameters?.wall_layout_length_m) === 44
        && sensitivityRevision.parameters?.gross_wall_area_and_opening_deductions
          === "GROSS_M2=110,OPENINGS_M2=10,NET_M2=100",
      "MASONRY_SENSITIVITY_PARAMETER_DRIFT");
    }
    const sensitivityRows = await allRows(authorization, sensitivityRevision.revisionId);
    sensitivityRow = assertExactRevision(sensitivityRevision, sensitivityRows, SENSITIVITY_TARGET_QUANTITY);
    sensitivityReinforcementRow = assertExactReinforcement(sensitivityRows);
    progress("SENSITIVITY_GREEN", { revisionId: sensitivityRevision.revisionId,
      primaryValue: SENSITIVITY_PRIMARY_VALUE, targetQuantity: SENSITIVITY_TARGET_QUANTITY });
    await openRevision(page, sensitivityRevision.revisionId);
    await assertPreliminaryScopeVisible(page);
    const sensitivityScreenshot = resolve(OUTPUT_ROOT, `02_sensitivity_${SENSITIVITY_PRIMARY_VALUE}.png`);
    await page.screenshot({ path: sensitivityScreenshot, fullPage: true });

    let durationScreenshot: string | null = null;
    if (IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE) {
      const rentalChip = page.getByTestId("editable-param-chip-rental_duration_days");
      if (!await rentalChip.isVisible().catch(() => false)) {
        const toggle = page.getByTestId("request-estimate-parameters-toggle");
        if (await toggle.isVisible().catch(() => false)) await toggle.click();
      }
      await expandFilledParameters(page);
      await rentalChip.waitFor({ state: "visible", timeout: 60_000 });
      await rentalChip.getByTestId("editable-param-popover-input").fill("21");
      const durationPromise = page.waitForResponse((response) => response.url().endsWith("/jobs/recalculate")
        && response.request().method() === "POST", { timeout: 60_000 });
      const [durationResponse] = await Promise.all([
        durationPromise,
        page.getByTestId("editable-param-batch-apply").click(),
      ]);
      const durationAccepted = await json(durationResponse);
      invariant(durationResponse.status() === 202, `DURATION_HTTP_${durationResponse.status()}`);
      durationRevision = await waitForSuccessfulRevision(authorization, durationAccepted);
      invariant(durationRevision.parentRevisionId === sensitivityRevision.revisionId,
        "DURATION_PARENT_DRIFT");
      const durationMismatches = Object.entries(FRAMI_DURATION_INPUT)
        .filter(([parameterId, value]) => typeof value === "number"
          ? Number(durationRevision!.parameters?.[parameterId]) !== value
          : durationRevision!.parameters?.[parameterId] !== value)
        .map(([parameterId]) => parameterId);
      invariant(durationMismatches.length === 0,
        `FRAMI_DURATION_PARAMETER_DRIFT:${durationMismatches.join(",")}`);
      const durationRows = await allRows(authorization, durationRevision.revisionId);
      durationRow = assertExactRevision(durationRevision, durationRows, ACCEPTED_TARGET_QUANTITY);
      const rentalRowIds = new Set(sensitivityRows
        .filter((row) => row.calculationTrace?.resourceGraph?.rentalDurationParameterId
          === "rental_duration_days")
        .map((row) => row.rowId));
      invariant(rentalRowIds.size === 7, `FRAMI_RENTAL_ROW_COUNT_${rentalRowIds.size}_EXPECTED_7`);
      for (const beforeRow of sensitivityRows.filter((row) => !rentalRowIds.has(row.rowId))) {
        const afterRow = durationRows.find((row) => row.rowId === beforeRow.rowId);
        invariant(afterRow != null && Number(afterRow.quantity) === Number(beforeRow.quantity),
          `FRAMI_DURATION_CHANGED_UNRELATED_ROW:${beforeRow.rowId}`);
      }
      durationScreenshot = resolve(OUTPUT_ROOT, "03_duration_21_days.png");
      await openRevision(page, durationRevision.revisionId);
      await page.screenshot({ path: durationScreenshot, fullPage: true });
      progress("DURATION_ONLY_GREEN", { revisionId: durationRevision.revisionId,
        rentalDays: 21, targetQuantity: ACCEPTED_TARGET_QUANTITY, unchangedNonRentalRows: 17 });
    }

    const historyAfter = await api(authorization, `revisions?catalogId=${encodeURIComponent(CATALOG_ID)}&limit=100`);
    const afterRows = Array.isArray(historyAfter.revisions) ? historyAfter.revisions as Json[] : [];
    invariant(initialRevision.revisionId === preparedRevision.revisionId,
      "WEB_PREPARE_REQUIRED_HIDDEN_API_RECALCULATION");
    const expectedNewRevisionCount = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE ? 3 : 2;
    invariant(afterRows.length === beforeRows.length + expectedNewRevisionCount,
      `HISTORY_DELTA_${afterRows.length - beforeRows.length}_EXPECTED_${expectedNewRevisionCount}`);
    invariant(afterRows.some((entry) => entry.revisionId === preparedRevision.revisionId)
      && afterRows.some((entry) => entry.revisionId === sensitivityRevision.revisionId),
    "HISTORY_REVISION_MISSING");
    if (durationRevision) {
      invariant(afterRows.some((entry) => entry.revisionId === durationRevision!.revisionId),
        "HISTORY_DURATION_REVISION_MISSING");
    }
    searchEvidence = { selectedIndex, selectedWorkText, before: beforeRows.length, after: afterRows.length,
      delta: afterRows.length - beforeRows.length,
      initialWasPrepared: initialRevision.revisionId === preparedRevision.revisionId,
      originalScreenshot, sensitivityScreenshot, durationScreenshot, compileIngress };
  } finally {
    await closePageBounded(page);
  }

  const activeAuthorization = authorization || apiAuthorization;
  const acceptedRevision = durationRevision ?? sensitivityRevision!;
  const negativeScenarios: { scenarioId: string; parameters: Json; expectedErrorCode: string | null }[] =
    IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
      ? [
        { scenarioId: "wrong-formwork-system", expectedErrorCode: "PARAMETER_VALIDATION_FAILED",
          parameters: { ...acceptedRevision.parameters,
            formwork_system_profile_id: "standard-profile:generic-formwork" } },
        { scenarioId: "missing-approved-layout", expectedErrorCode: "PARAMETER_VALIDATION_FAILED",
          parameters: { ...acceptedRevision.parameters, project_formwork_layout_reference: null } },
        { scenarioId: "wall-too-thick-for-flat-tie", expectedErrorCode: "PARAMETER_VALIDATION_FAILED",
          parameters: { ...acceptedRevision.parameters, foundation_wall_thickness_cm: 81 } },
        { scenarioId: "wrong-measurement-class", expectedErrorCode: "PHYSICAL_NORM_APPLICABILITY_FAILED",
          parameters: { ...acceptedRevision.parameters, single_or_double_sided_scope: "UNDECLARED" } },
      ]
      : IS_BIA_TN10_MASONRY
      ? [
        { scenarioId: "non-fired-clay-material", expectedErrorCode: "PHYSICAL_NORM_APPLICABILITY_FAILED",
          parameters: { ...acceptedRevision.parameters, fired_clay_brick_confirmed: false } },
        { scenarioId: "wall-opening-geometry-conflict",
          expectedErrorCode: "MASONRY_FULL_SCOPE_GROSS_GEOMETRY_CONFLICT",
          parameters: { ...acceptedRevision.parameters,
            gross_wall_area_and_opening_deductions: "GROSS_M2=100,OPENINGS_M2=5,NET_M2=100" } },
        { scenarioId: "connector-quantity-missing",
          expectedErrorCode: "MASONRY_FULL_SCOPE_APPLICABLE_QUANTITY_REQUIRED:wall_connector_quantity_piece",
          parameters: { ...acceptedRevision.parameters, wall_connectors_applicable: true,
            wall_connector_quantity_piece: 0 } },
        { scenarioId: "dpc-not-applicable-conflict",
          expectedErrorCode: "MASONRY_FULL_SCOPE_NOT_APPLICABLE_QUANTITY_CONFLICT:dpc_area_m2",
          parameters: { ...acceptedRevision.parameters, dpc_applicable: false, dpc_area_m2: 1 } },
      ]
      : IS_NRMCA_STRIP_FOUNDATION
        ? [
          { scenarioId: "cip31-two-percent", expectedErrorCode: null, parameters: {
            ...acceptedRevision.parameters, concrete_order_allowance_percent: 2,
          } },
          { scenarioId: "rebar-invalid-shape", expectedErrorCode: null, parameters: {
            ...acceptedRevision.parameters, shape_straight_bent_curved_or_link: "ASSUMED",
          } },
        ]
        : [{ scenarioId: "unconfirmed-measurement", expectedErrorCode: null, parameters: {
          ...acceptedRevision.parameters, project_measurement_rule_reference: "UNCONFIRMED",
        } }];
  const negativeJobs: Json[] = [];
  for (const scenario of negativeScenarios) {
    const negativeAccepted = await apiPost(activeAuthorization, "jobs/recalculate", {
      idempotencyKey: `exact-${PROFILE_ID}-negative-${scenario.scenarioId}-${acceptedRevision.revisionId}`,
      catalogId: CATALOG_ID,
      parentRevisionId: acceptedRevision.revisionId,
      sourceRequestText: acceptedRevision.sourceRequestText,
      primaryMeasureParameterId: PRIMARY_MEASURE_PARAMETER_ID,
      parameters: scenario.parameters,
      currencyCode: acceptedRevision.currencyCode,
      rowOverrides: acceptedRevision.amendmentContract?.rowOverrides ?? {},
      customRows: acceptedRevision.amendmentContract?.customRows ?? [],
    });
    const negativeJob = await waitForJob(activeAuthorization, String(negativeAccepted.jobId ?? ""));
    invariant(negativeJob.status === "failed" && !negativeJob.resultRevisionId,
      `NEGATIVE_NOT_BLOCKED:${scenario.scenarioId}:${String(negativeJob.status)}:${String(negativeJob.errorCode ?? "")}`);
    invariant(scenario.expectedErrorCode == null || negativeJob.errorCode === scenario.expectedErrorCode,
      `NEGATIVE_ERROR_CODE_DRIFT:${scenario.scenarioId}:${String(negativeJob.errorCode ?? "")}`);
    negativeJobs.push({ ...negativeJob, scenarioId: scenario.scenarioId });
    progress("NEGATIVE_BLOCKED", { scenarioId: scenario.scenarioId, errorCode: negativeJob.errorCode });
  }

  const [pdf, procurement] = await Promise.all([
    buildArtifact(activeAuthorization, acceptedRevision, "pdf"),
    buildArtifact(activeAuthorization, acceptedRevision, "procurement"),
  ]);
  const sensitivityRowCount = Number(acceptedRevision.rowCount);
  const expectedPdfProjectedRowCount = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
    ? 24
    : sensitivityRowCount + (IS_RICS_NRM2_FORMWORK ? 1 : 0);
  invariant(Number(pdf.metadata?.sourceRowCount) === sensitivityRowCount
    && Number(pdf.metadata?.projectedRowCount) === expectedPdfProjectedRowCount
    && pdf.metadata?.grandTotalStatus === "PARTIAL_NEEDS_PRICE", "PDF_UNKNOWN_PRICE_TRUTH_RED");
  const expectedProcurementTruth = IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
    ? Number(procurement.metadata?.selectedProcurementRowCount) === 14
      && Number(procurement.metadata?.projectedRowCount) === 14
    : IS_NRMCA_STRIP_FOUNDATION || IS_BIA_TN10_MASONRY
    ? Number(procurement.metadata?.selectedProcurementRowCount) > 0
      && Number(procurement.metadata?.projectedRowCount)
        === Number(procurement.metadata?.selectedProcurementRowCount)
    : Number(procurement.metadata?.selectedProcurementRowCount) === 0
      && Number(procurement.metadata?.projectedRowCount) === 0
      && (!IS_RICS_NRM2_FORMWORK
        || Number(procurement.projection?.preliminaryNeedsExcludedCount) === 1);
  invariant(Number(procurement.metadata?.sourceRowCount) === sensitivityRowCount
    && expectedProcurementTruth, "PROCUREMENT_ROW_TRUTH_RED");
  if (IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE) {
    const procurementRows = Array.isArray(procurement.projection?.rows)
      ? procurement.projection.rows as Json[]
      : [];
    invariant(procurement.projection?.revisionId === acceptedRevision.revisionId
      && procurement.projection?.releaseId === RELEASE_ID
      && Number(procurement.projection?.selectedRowCount) === 14
      && procurementRows.length === 14,
    "FRAMI_PROCUREMENT_PROJECTION_IDENTITY_RED");
    invariant(procurementRows.filter((candidate) => candidate.category === "equipment").length === 8
      && procurementRows.filter((candidate) => candidate.category === "material").length === 3
      && procurementRows.filter((candidate) => candidate.category === "service").length === 1
      && procurementRows.filter((candidate) => candidate.category === "delivery").length === 2
      && !procurementRows.some((candidate) => candidate.category === "construction_work")
      && !procurementRows.some((candidate) => String(candidate.rowId).includes("not-applicable")),
    "FRAMI_PROCUREMENT_COMPOSITION_RED");
  } else if (IS_BIA_TN10_MASONRY) {
    const procurementRows = Array.isArray(procurement.projection?.rows)
      ? procurement.projection.rows as Json[]
      : [];
    invariant(procurement.projection?.revisionId === acceptedRevision.revisionId
      && procurement.projection?.releaseId === RELEASE_ID
      && Number(procurement.projection?.selectedRowCount) === 10
      && procurementRows.length === 10,
    "MASONRY_PROCUREMENT_PROJECTION_IDENTITY_RED");
    const brick = procurementRows.find((candidate) => candidate.rowId === "material:bia-tn10:fired-clay-brick");
    const mortar = procurementRows.find((candidate) => candidate.rowId === "material:bia-tn10:masonry-mortar");
    invariant(brick != null && Number(brick.quantity) === 6_500 && Number(brick.netQuantity) === 6_300
      && Number(brick.grossQuantity) === 6_489 && Number(brick.procurementQuantity) === 6_500
      && Number(brick.procurementPackageSize) === 500 && brick.procurementUnit === "piece",
    "MASONRY_BRICK_PROCUREMENT_SPLIT_RED");
    invariant(mortar != null && Number(mortar.quantity) === 2.5 && Number(mortar.netQuantity) === 2.2
      && Number(mortar.grossQuantity) === 2.31 && Number(mortar.procurementQuantity) === 2.5
      && Number(mortar.procurementPackageSize) === 0.25 && mortar.procurementUnit === "m3",
    "MASONRY_MORTAR_PROCUREMENT_SPLIT_RED");
    invariant(procurementRows.filter((candidate) => candidate.category === "material").length === 4
      && procurementRows.filter((candidate) => candidate.category === "equipment").length === 2
      && procurementRows.filter((candidate) => candidate.category === "service").length === 1
      && procurementRows.filter((candidate) => candidate.category === "delivery").length === 3
      && Number(procurementRows.find((candidate) =>
        candidate.rowId === "delivery:bia-tn10:fired-clay-brick")?.quantity) === 357.5
      && Number(procurementRows.find((candidate) =>
        candidate.rowId === "delivery:bia-tn10:masonry-mortar")?.quantity) === 100
      && Number(procurementRows.find((candidate) =>
        candidate.rowId === "delivery:bia-tn10:masonry-waste-haul")?.quantity) === 7.5
      && procurementRows.every((candidate) => candidate.unitPrice == null && candidate.amount == null
        && !String(candidate.rowId).startsWith("work:")),
    "MASONRY_PROCUREMENT_COMPOSITION_OR_ZERO_PRICE_RED");
  }
  progress("ARTIFACTS_GREEN", { pdfBytes: pdf.byteSize,
    procurementRows: procurement.metadata?.selectedProcurementRowCount });

  const coldContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const cold = await openColdRevision(coldContext, acceptedRevision,
    resolve(OUTPUT_ROOT, `04_cold_reopen_${SENSITIVITY_PRIMARY_VALUE}.png`));
  await coldContext.close();
  await browser.close();

  const database = await databaseProof(
    [...new Set([initialRevision!.revisionId, preparedRevision!.revisionId,
      sensitivityRevision!.revisionId, acceptedRevision.revisionId])],
    negativeJobs.map((job) => String(job.jobId)),
  );
  invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);
  const unexpectedFailures = requestFailures.filter((failure) => !failure.includes("ERR_ABORTED"));
  invariant(unexpectedFailures.length === 0, `REQUEST_FAILURES:${unexpectedFailures.join("|")}`);

  const body = {
    schemaVersion: IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
      ? "rik-expo-app.r4-a13-6.formwork-frami-xlife-pile-cap-full.web-acceptance.v1"
      : IS_BIA_TN10_MASONRY
      ? "rik-expo-app.r4-a13-6.bia-tn10-masonry-full-applicable-estimate.web-acceptance.v2"
      : IS_NRMCA_STRIP_FOUNDATION
        ? "rik-expo-app.r4-a13-6.strip-foundation-nrmca-cip31-rebar-schedule.web-acceptance.v2"
        : IS_RICS_NRM2_WET_ZONE
          ? "rik-expo-app.r4-a13-6.formwork-rics-nrm2-wet-zone.web-acceptance.v2"
          : IS_RICS_NRM2_STRIP_FOUNDATION_WET_ZONE
            ? "rik-expo-app.r4-a13-6.formwork-rics-nrm2-strip-foundation-wet-zone.web-acceptance.v2"
            : IS_RICS_NRM2_SLAB_FOUNDATION_WET_ZONE
              ? "rik-expo-app.r4-a13-6.formwork-rics-nrm2-slab-foundation-wet-zone.web-acceptance.v2"
              : IS_RICS_NRM2_PILE_CAP_WET_ZONE
                ? "rik-expo-app.r4-a13-6.formwork-rics-nrm2-pile-cap-wet-zone.web-acceptance.v2"
              : "rik-expo-app.r4-a13-6.formwork-rics-nrm2.web-acceptance.v2",
    capturedAt: new Date().toISOString(),
    status: IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
      ? "GREEN_EXACT_FORMWORK_FRAMI_XLIFE_PILE_CAP_FULL_WEB_BACKEND_PDF_PROCUREMENT_HISTORY"
      : IS_BIA_TN10_MASONRY
      ? "GREEN_EXACT_BIA_TN10_MASONRY_FULL_APPLICABLE_WEB_BACKEND_PDF_PROCUREMENT_HISTORY"
      : IS_NRMCA_STRIP_FOUNDATION
        ? "GREEN_EXACT_STRIP_FOUNDATION_NRMCA_CIP31_REBAR_SCHEDULE_WEB_BACKEND_PDF_PROCUREMENT_HISTORY"
        : IS_RICS_NRM2_WET_ZONE
          ? "GREEN_EXACT_FORMWORK_RICS_NRM2_WET_ZONE_MEASUREMENT_ONLY_PRELIMINARY_WEB_BACKEND_PDF_PROCUREMENT_HISTORY"
          : IS_RICS_NRM2_STRIP_FOUNDATION_WET_ZONE
            ? "GREEN_EXACT_FORMWORK_RICS_NRM2_STRIP_FOUNDATION_WET_ZONE_MEASUREMENT_ONLY_PRELIMINARY_WEB_BACKEND_PDF_PROCUREMENT_HISTORY"
            : IS_RICS_NRM2_SLAB_FOUNDATION_WET_ZONE
              ? "GREEN_EXACT_FORMWORK_RICS_NRM2_SLAB_FOUNDATION_WET_ZONE_MEASUREMENT_ONLY_PRELIMINARY_WEB_BACKEND_PDF_PROCUREMENT_HISTORY"
              : IS_RICS_NRM2_PILE_CAP_WET_ZONE
                ? "GREEN_EXACT_FORMWORK_RICS_NRM2_PILE_CAP_WET_ZONE_MEASUREMENT_ONLY_PRELIMINARY_WEB_BACKEND_PDF_PROCUREMENT_HISTORY"
              : "GREEN_EXACT_FORMWORK_RICS_NRM2_MEASUREMENT_ONLY_PRELIMINARY_WEB_BACKEND_PDF_PROCUREMENT_HISTORY",
    runtime: {
      definitionReleaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      definitionVersionId: DEFINITION_ID,
      sourceHead: manifest.compatibilityTuple?.sourceHead,
      sourceTree: manifest.compatibilityTuple?.sourceTree,
      activeCompileJobsAtStart: manifest.activeCompileJobCount,
    },
    principal: { userId, realLocalProviderSession: true, tokensPersisted: false },
    search: searchEvidence!,
    promptSha256: sha256(PROMPT),
    semanticScope: IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE
      ? {
        estimateLevel: "FULL_APPLICABLE_ESTIMATE",
        scopeMode: "EXPLICIT_PROJECT_SCHEDULE",
        fullWorkScopeComplete: true,
        sourceRowCount: 24,
        includedEstimateRowCount: 17,
        procurementRowCount: 14,
        preliminaryScopeNeedCount: 0,
        areaDerivedKitQuantities: false,
      }
      : IS_BIA_TN10_MASONRY
        ? {
          estimateLevel: "FULL_APPLICABLE_ESTIMATE",
          scopeMode: "EXPLICIT_PROJECT_AND_SUPPLIER_INPUTS",
          fullWorkScopeComplete: true,
          parameterCount: 60,
          formulaCount: 19,
          resourceDefinitionCount: 23,
          includedEstimateRowCount: 18,
          procurementRowCount: 10,
          conditionalRowsExcludedCount: 5,
          preliminaryScopeNeedCount: 0,
        }
      : IS_RICS_NRM2_FORMWORK ? {
        estimateLevel: "PRELIMINARY_QUANTITY_BOQ",
        scopeMode: "MEASUREMENT_ONLY",
        fullWorkScopeComplete: false,
        measuredAreaRowCount: 1,
        preliminaryScopeNeedCount: 1,
        priorOneRowFullScopeAcceptanceUsable: false,
      } : null,
    scenarioOriginal: { label: SCENARIO_LABEL, primaryMeasureParameterId: PRIMARY_MEASURE_PARAMETER_ID,
      primaryValue: ORIGINAL_PRIMARY_VALUE, targetQuantity: ORIGINAL_TARGET_QUANTITY,
      revisionId: preparedRevision!.revisionId, revisionNumber: preparedRevision!.revisionNumber,
      row: originalRow!, preliminaryScopeNeed: IS_RICS_NRM2_FORMWORK
        ? assertPreliminaryScopeTruth(preparedRevision!, ORIGINAL_TARGET_QUANTITY) : null,
      reinforcementRow: originalReinforcementRow },
    sensitivity: { primaryValue: SENSITIVITY_PRIMARY_VALUE,
      targetQuantity: SENSITIVITY_TARGET_QUANTITY, revisionId: sensitivityRevision!.revisionId,
      parentRevisionId: sensitivityRevision!.parentRevisionId,
      revisionNumber: sensitivityRevision!.revisionNumber, row: sensitivityRow!,
      preliminaryScopeNeed: IS_RICS_NRM2_FORMWORK
        ? assertPreliminaryScopeTruth(sensitivityRevision!, SENSITIVITY_TARGET_QUANTITY) : null,
      reinforcementRow: sensitivityReinforcementRow },
    rentalDuration: durationRevision ? {
      rentalDays: 21,
      targetQuantity: ACCEPTED_TARGET_QUANTITY,
      revisionId: durationRevision.revisionId,
      parentRevisionId: durationRevision.parentRevisionId,
      revisionNumber: durationRevision.revisionNumber,
      row: durationRow,
      unchangedNonRentalRows: 17,
    } : null,
    negative: negativeJobs.map((job) => ({ scenarioId: job.scenarioId, jobId: job.jobId,
      status: job.status, errorCode: job.errorCode, resultRevisionId: job.resultRevisionId ?? null })),
    historyColdReopen: cold,
    documents: {
      pdf: { artifactId: pdf.artifactId, revisionId: pdf.revisionId, byteSize: pdf.byteSize,
        sha256: pdf.sha256, pageCount: pdf.metadata?.pageCount,
        grandTotalStatus: pdf.metadata?.grandTotalStatus, downloadParity: true },
      procurement: { artifactId: procurement.artifactId, revisionId: procurement.revisionId,
        byteSize: procurement.byteSize, sha256: procurement.sha256,
        selectedProcurementRowCount: procurement.metadata?.selectedProcurementRowCount,
        projection: IS_FRAMI_XLIFE_PILE_CAP_WET_ZONE || IS_BIA_TN10_MASONRY
          ? procurement.projection
          : undefined,
        downloadParity: true },
    },
    database,
    diagnostics: { backendRequests, consoleErrors, pageErrors, requestFailures, unexpectedFailures },
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  atomicJson(OUTPUT, { ...body, receiptSha256: sha256(JSON.stringify(body)) });
  process.stdout.write(`${JSON.stringify({ status: body.status, receipt: OUTPUT,
    revisionId: acceptedRevision.revisionId, pdfSha256: pdf.sha256,
    procurementRows: procurement.metadata?.selectedProcurementRowCount,
    productionAccessed: false })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
