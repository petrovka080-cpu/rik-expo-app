export type ElectricalProfessionalBoqNormKey =
  | "installation"
  | "materials"
  | "protection"
  | "earthing"
  | "cable_fire_safety"
  | "verification"
  | "documentation";

export type ElectricalProfessionalBoqV1Context = {
  areaM2: number;
  routeLengthM: number;
  totalCableLengthM: number;
  outletCount: number;
  switchCount: number;
  lightingPointCount: number;
  lineCount: number;
  groupCount: number;
  phaseCount: number;
  panelIncluded: boolean;
  protectiveDevicesIncluded: boolean;
  groundingIncluded: boolean;
  wiringMethod: string;
  containmentType: string;
  containmentKnown: boolean;
  cableSpecificationKnown: boolean;
  estimatedLoadKnown: boolean;
};

export type ElectricalProfessionalBoqV1Row = {
  sectionType: "materials" | "labor" | "equipment" | "delivery";
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  materialKey?: string;
  quantityFormula: string;
  sourceParameterIds: readonly string[];
  blockerIds?: readonly string[];
  normKey: ElectricalProfessionalBoqNormKey;
};

export type ElectricalProfessionalBoqNormMetadata = {
  normId: string;
  normFamilyId: string;
  normSourceId: string;
  normSourceTitle: string;
  normVersion: string;
  normReviewStatus: string;
  normSourceProfile: "KG_PRIMARY" | "INTL_REFERENCE";
  normSourceJurisdiction: "KG" | "INTERNATIONAL_REFERENCE";
  normSourcePublisher: string;
  normSourceEffectiveDate: string;
  normSourceCheckedAt: string;
  normSourceReference: string;
  normSourceSnapshotSha256: string;
  normSourceLicenseStatus:
    | "OFFICIAL_PUBLIC_DOWNLOAD"
    | "METADATA_ONLY_COPYRIGHT_RESTRICTED";
  normSourceLifecycleStatus: "EXPERT_REVIEW_REQUIRED";
};

export const ELECTRICAL_PROFESSIONAL_BOQ_NORM_METADATA:
Record<ElectricalProfessionalBoqNormKey, ElectricalProfessionalBoqNormMetadata> = {
  installation: {
    normId: "KRERM-08-2015-SCOPE",
    normFamilyId: "KG_ELECTRICAL_INSTALLATION",
    normSourceId: "KG_KRERM_08_2015",
    normSourceTitle: "КРЕРм-08-2015 «Электротехнические установки»",
    normVersion: "2015",
    normReviewStatus: "EXPERT_REVIEW_REQUIRED",
    normSourceProfile: "KG_PRIMARY",
    normSourceJurisdiction: "KG",
    normSourcePublisher: "Министерство строительства Кыргызской Республики",
    normSourceEffectiveDate: "2015",
    normSourceCheckedAt: "2026-07-29",
    normSourceReference:
      "https://minstroy.gov.kg/kg/state_program/download-pdf/montazoborudovania-19669004e91a8edf3.01075859.pdf",
    normSourceSnapshotSha256:
      "a0c3a8684c66a3d7ce5b30b5340562972e11f6a0df92a2240770af46fdae2c54",
    normSourceLicenseStatus: "OFFICIAL_PUBLIC_DOWNLOAD",
    normSourceLifecycleStatus: "EXPERT_REVIEW_REQUIRED",
  },
  materials: {
    normId: "KG-MATERIAL-CATALOG-25-27-SCOPE",
    normFamilyId: "KG_ELECTRICAL_MATERIALS",
    normSourceId: "KG_MATERIAL_BOOKS_25_26_27",
    normSourceTitle:
      "Кыргызские сборники сметных цен: книги 25, 26 и 27",
    normVersion: "catalog_scope",
    normReviewStatus: "EXPERT_REVIEW_REQUIRED",
    normSourceProfile: "KG_PRIMARY",
    normSourceJurisdiction: "KG",
    normSourcePublisher: "Министерство строительства Кыргызской Республики",
    normSourceEffectiveDate: "CURRENT_EDITION_REQUIRES_CONFIRMATION",
    normSourceCheckedAt: "2026-07-29",
    normSourceReference: "https://minstroy.gov.kg/ru/kyzmat/12",
    normSourceSnapshotSha256:
      "54e70394c2fa3afd284e59381b75c060797efc80bb7e2fed2e6b0f0c7e416b5d",
    normSourceLicenseStatus: "OFFICIAL_PUBLIC_DOWNLOAD",
    normSourceLifecycleStatus: "EXPERT_REVIEW_REQUIRED",
  },
  protection: {
    normId: "IEC-60364-5-53-SCOPE",
    normFamilyId: "LOW_VOLTAGE_PROTECTION_SWITCHING",
    normSourceId: "IEC_60364_5_53_2019_AMD2_2024",
    normSourceTitle: "IEC 60364-5-53:2019+A1:2020+A2:2024",
    normVersion: "4.2/2024",
    normReviewStatus: "EXPERT_REVIEW_REQUIRED",
    normSourceProfile: "INTL_REFERENCE",
    normSourceJurisdiction: "INTERNATIONAL_REFERENCE",
    normSourcePublisher: "International Electrotechnical Commission",
    normSourceEffectiveDate: "2024",
    normSourceCheckedAt: "2026-07-29",
    normSourceReference: "https://webstore.iec.ch/en/publication/63543",
    normSourceSnapshotSha256:
      "67ebbfb733d755d1fd9e8a225b8baad8dd252d85324ff6f7f262bc6cb0c10f01",
    normSourceLicenseStatus: "METADATA_ONLY_COPYRIGHT_RESTRICTED",
    normSourceLifecycleStatus: "EXPERT_REVIEW_REQUIRED",
  },
  earthing: {
    normId: "IEC-60364-5-54-SCOPE",
    normFamilyId: "EARTHING_PROTECTIVE_CONDUCTORS",
    normSourceId: "IEC_60364_5_54_2011_AMD1_2021",
    normSourceTitle: "IEC 60364-5-54:2011+A1:2021",
    normVersion: "3.1/2021",
    normReviewStatus: "EXPERT_REVIEW_REQUIRED",
    normSourceProfile: "INTL_REFERENCE",
    normSourceJurisdiction: "INTERNATIONAL_REFERENCE",
    normSourcePublisher: "International Electrotechnical Commission",
    normSourceEffectiveDate: "2021",
    normSourceCheckedAt: "2026-07-29",
    normSourceReference: "https://webstore.iec.ch/en/publication/1882",
    normSourceSnapshotSha256:
      "8667ec0d22e483e83249872f2debfc26cc0053e92579a0a778c1a965e23c23e0",
    normSourceLicenseStatus: "METADATA_ONLY_COPYRIGHT_RESTRICTED",
    normSourceLifecycleStatus: "EXPERT_REVIEW_REQUIRED",
  },
  cable_fire_safety: {
    normId: "KG-GOST-31565-2012-SCOPE",
    normFamilyId: "KG_CABLE_FIRE_SAFETY",
    normSourceId: "KG_GOST_31565_2012",
    normSourceTitle:
      "ГОСТ 31565-2012 «Кабельные изделия. Требования пожарной безопасности»",
    normVersion: "2012",
    normReviewStatus: "EXPERT_REVIEW_REQUIRED",
    normSourceProfile: "KG_PRIMARY",
    normSourceJurisdiction: "KG",
    normSourcePublisher: "Министерство строительства Кыргызской Республики",
    normSourceEffectiveDate: "2012",
    normSourceCheckedAt: "2026-07-29",
    normSourceReference:
      "https://minstroy.gov.kg/index.php/kg/state_program/download-pdf/sprilozeniamiprikazgosstroaot12sentabra2024godano79npa-99266e2b7be676af4.81226750.pdf",
    normSourceSnapshotSha256:
      "a292f2d6354b789f8cfc4686cdd6964d341c2641d1f76232d5a3ed6ce02c6b0f",
    normSourceLicenseStatus: "OFFICIAL_PUBLIC_DOWNLOAD",
    normSourceLifecycleStatus: "EXPERT_REVIEW_REQUIRED",
  },
  verification: {
    normId: "KG-KRERP-01-2015-SCOPE",
    normFamilyId: "KG_ELECTRICAL_COMMISSIONING",
    normSourceId: "KG_KRERP_01_2015",
    normSourceTitle: "КРЕРп-01-2015 «Электротехнические устройства»",
    normVersion: "2015",
    normReviewStatus: "EXPERT_REVIEW_REQUIRED",
    normSourceProfile: "KG_PRIMARY",
    normSourceJurisdiction: "KG",
    normSourcePublisher: "Министерство строительства Кыргызской Республики",
    normSourceEffectiveDate: "2015",
    normSourceCheckedAt: "2026-07-29",
    normSourceReference:
      "https://minstroy.gov.kg/ru/state_program/download-pdf/no1elektrotehniceskieustrojstva_compressed-2576901ea4b333a55.88313103.pdf",
    normSourceSnapshotSha256:
      "0f83c1c62f77b33582e74e5f32c54ecf2143f0cb9f0e63f25dafc0cfc1152523",
    normSourceLicenseStatus: "OFFICIAL_PUBLIC_DOWNLOAD",
    normSourceLifecycleStatus: "EXPERT_REVIEW_REQUIRED",
  },
  documentation: {
    normId: "SP-256-SP-76-DOCUMENTATION-SCOPE",
    normFamilyId: "ELECTRICAL_DESIGN_AS_BUILT",
    normSourceId: "SP_256_1325800_2016_SP_76_13330_2016",
    normSourceTitle:
      "СП 256.1325800.2016; СП 76.13330.2016",
    normVersion: "2016",
    normReviewStatus: "EXPERT_REVIEW_REQUIRED",
    normSourceProfile: "KG_PRIMARY",
    normSourceJurisdiction: "KG",
    normSourcePublisher: "Министерство строительства Кыргызской Республики",
    normSourceEffectiveDate: "2016",
    normSourceCheckedAt: "2026-07-29",
    normSourceReference:
      "https://minstroy.gov.kg/index.php/kg/state_program/download-pdf/sprilozeniamiprikazgosstroaot12sentabra2024godano79npa-99266e2b7be676af4.81226750.pdf",
    normSourceSnapshotSha256:
      "a292f2d6354b789f8cfc4686cdd6964d341c2641d1f76232d5a3ed6ce02c6b0f",
    normSourceLicenseStatus: "OFFICIAL_PUBLIC_DOWNLOAD",
    normSourceLifecycleStatus: "EXPERT_REVIEW_REQUIRED",
  },
};

function rounded(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function buildElectricalProfessionalBoqV1Rows(
  context: ElectricalProfessionalBoqV1Context,
): ElectricalProfessionalBoqV1Row[] {
  const quantities = [
    context.areaM2,
    context.routeLengthM,
    context.totalCableLengthM,
    context.outletCount,
    context.switchCount,
    context.lightingPointCount,
    context.lineCount,
    context.groupCount,
  ];
  if (quantities.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("ELECTRICAL_PROFESSIONAL_BOQ_INVALID_QUANTITY");
  }
  if (context.lineCount < 1 || context.groupCount < 1) {
    throw new Error("ELECTRICAL_PROFESSIONAL_BOQ_INVALID_LINE_OR_GROUP_COUNT");
  }
  if (context.phaseCount !== 1 && context.phaseCount !== 3) {
    throw new Error("ELECTRICAL_PROFESSIONAL_BOQ_INVALID_PHASE_COUNT");
  }
  if (
    context.routeLengthM > 0 &&
    context.totalCableLengthM < context.routeLengthM
  ) {
    throw new Error("ELECTRICAL_PROFESSIONAL_BOQ_INCOMPATIBLE_CABLE_LENGTH");
  }
  const points =
    context.outletCount +
    context.switchCount +
    context.lightingPointCount;
  const routeFixings = Math.ceil(context.routeLengthM / 0.6);
  const routeAccessories = Math.ceil(context.routeLengthM / 3);
  const penetrations = Math.max(
    context.routeLengthM > 0 ? 1 : 0,
    Math.ceil(context.areaM2 / 25),
  );
  const terminations = Math.max(
    context.lineCount * 2,
    points * 3,
  );
  const panelModules = Math.max(12, (context.groupCount + 2) * 2);
  const rcdCount = Math.max(1, Math.ceil(context.groupCount / 2));
  const shifts = Math.max(
    1,
    Math.ceil(Math.max(context.areaM2, context.routeLengthM, 1) / 120),
  );
  const routeBlocker = context.routeLengthM > 0
    ? undefined
    : ["route_length_m"];
  const containmentBlocker = context.containmentKnown
    ? routeBlocker
    : ["route_length_m", "containment_type"];
  const cableBlocker = context.cableSpecificationKnown
    ? routeBlocker
    : ["route_length_m", "cable_type", "cable_section_mm2"];
  const loadBlocker = context.estimatedLoadKnown
    ? undefined
    : ["estimated_load_kw", "phase_count"];
  const rows: ElectricalProfessionalBoqV1Row[] = [];
  const add = (
    row: Omit<ElectricalProfessionalBoqV1Row, "sourceParameterIds"> & {
      sourceParameterIds?: readonly string[];
    },
  ): void => {
    rows.push({
      ...row,
      quantity: rounded(row.quantity),
      sourceParameterIds: row.sourceParameterIds ?? [],
    });
  };

  add({ sectionType: "labor", code: "electrical_reference_existing_supply_inspection", name: "Обследование вводного устройства, схемы заземления и существующей защиты", unit: "set", quantity: 1, unitPrice: 6200, quantityFormula: "1 объект", sourceParameterIds: ["work_scope_type", "phase_count", "grounding_included"], normKey: "documentation" });
  add({ sectionType: "labor", code: "electrical_reference_load_schedule", name: "Расчёт нагрузок и ведомость электрических групп", unit: "set", quantity: 1, unitPrice: 7800, quantityFormula: "1 расчётная ведомость", sourceParameterIds: ["area_m2", "outlet_count", "switch_count", "lighting_point_count", "estimated_load_kw"], normKey: "documentation" });
  add({ sectionType: "labor", code: "electrical_reference_cable_sizing", name: "Подбор сечений кабелей по нагрузке, способу прокладки и допустимому падению напряжения", unit: "pcs", quantity: context.groupCount, unitPrice: 980, quantityFormula: "group_count", sourceParameterIds: ["group_count", "estimated_load_kw", "cable_type", "cable_section_mm2", "wiring_method"], blockerIds: loadBlocker, normKey: "documentation" });
  if (context.protectiveDevicesIncluded) {
    add({ sectionType: "labor", code: "electrical_reference_protection_coordination", name: "Подбор и координация автоматических выключателей, УЗО и дифавтоматов", unit: "pcs", quantity: context.groupCount, unitPrice: 1150, quantityFormula: "group_count", sourceParameterIds: ["group_count", "estimated_load_kw", "phase_count", "protective_devices_included"], blockerIds: loadBlocker, normKey: "protection" });
  }
  if (points > 0) {
    add({ sectionType: "labor", code: "electrical_reference_point_layout", name: "Координация плана розеток, выключателей и точек освещения", unit: "pcs", quantity: points, unitPrice: 210, quantityFormula: "outlet_count + switch_count + lighting_point_count", sourceParameterIds: ["outlet_count", "switch_count", "lighting_point_count"], normKey: "documentation" });
  }
  add({ sectionType: "labor", code: "electrical_reference_isolation_plan", name: "План безопасного отключения, блокировки и допуска к электромонтажным работам", unit: "set", quantity: 1, unitPrice: 3600, quantityFormula: "1 комплект", sourceParameterIds: ["work_scope_type"], normKey: "protection" });

  add({ sectionType: "materials", code: "electrical_reference_route_fixings", name: "Крепления кабельной трассы: клипсы, хомуты и анкеры", unit: "pcs", quantity: routeFixings, unitPrice: 24, materialKey: "electrical_route_fixings", quantityFormula: "ceil(route_length_m / 0.6)", sourceParameterIds: ["route_length_m", "containment_type", "wall_material"], blockerIds: containmentBlocker, normKey: "materials" });
  add({ sectionType: "materials", code: "electrical_reference_containment_couplings", name: "Соединительные муфты и вводы системы прокладки кабеля", unit: "pcs", quantity: routeAccessories, unitPrice: 85, materialKey: "electrical_containment_couplings", quantityFormula: "ceil(route_length_m / 3)", sourceParameterIds: ["route_length_m", "containment_type"], blockerIds: containmentBlocker, normKey: "materials" });
  if (context.containmentType !== "cable_channel") {
    add({ sectionType: "materials", code: "electrical_reference_containment_bends", name: "Повороты, тройники и оконечные элементы кабельной трассы", unit: "pcs", quantity: Math.max(context.lineCount, Math.ceil(routeAccessories / 3)), unitPrice: 140, materialKey: "electrical_containment_fittings", quantityFormula: "max(line_count, ceil(route_accessories / 3))", sourceParameterIds: ["route_length_m", "line_count", "containment_type"], blockerIds: containmentBlocker, normKey: "materials" });
  }
  add({ sectionType: "materials", code: "electrical_reference_cable_pull_wire", name: "Протяжной провод для труб и закрытых участков трассы", unit: "linear_m", quantity: context.routeLengthM, unitPrice: 18, materialKey: "electrical_pull_wire", quantityFormula: "route_length_m", sourceParameterIds: ["route_length_m", "containment_type"], blockerIds: containmentBlocker, normKey: "materials" });
  add({ sectionType: "materials", code: "electrical_reference_wall_sleeves", name: "Защитные гильзы проходов кабельной трассы через стены и перегородки", unit: "pcs", quantity: penetrations, unitPrice: 420, materialKey: "electrical_wall_sleeves", quantityFormula: "max(1, ceil(area_m2 / 25))", sourceParameterIds: ["area_m2", "route_length_m", "wall_material"], blockerIds: routeBlocker, normKey: "materials" });
  add({ sectionType: "materials", code: "electrical_reference_firestop", name: "Огнезащитная герметизация кабельных проходок", unit: "pcs", quantity: penetrations, unitPrice: 680, materialKey: "electrical_firestop", quantityFormula: "penetration_count", sourceParameterIds: ["area_m2", "route_length_m", "wall_material"], blockerIds: routeBlocker, normKey: "materials" });
  add({ sectionType: "materials", code: "electrical_reference_cable_labels", name: "Маркировочные бирки кабелей и электрических групп", unit: "pcs", quantity: Math.max(context.lineCount * 2, context.groupCount * 2), unitPrice: 35, materialKey: "electrical_cable_labels", quantityFormula: "max(line_count × 2, group_count × 2)", sourceParameterIds: ["line_count", "group_count"], normKey: "materials" });
  add({ sectionType: "materials", code: "electrical_reference_cable_ties", name: "Кабельные стяжки для укладки и формирования пучков", unit: "pcs", quantity: Math.ceil(context.totalCableLengthM / 0.5), unitPrice: 8, materialKey: "electrical_cable_ties", quantityFormula: "ceil(total_cable_length_m / 0.5)", sourceParameterIds: ["route_length_m", "line_count", "cable_reserve_factor"], blockerIds: routeBlocker, normKey: "materials" });
  add({ sectionType: "materials", code: "electrical_reference_terminal_blocks", name: "Клеммные блоки для распределительных и установочных коробок", unit: "pcs", quantity: Math.max(context.groupCount * 4, points), unitPrice: 95, materialKey: "electrical_terminal_blocks", quantityFormula: "max(group_count × 4, electrical_points_total)", sourceParameterIds: ["group_count", "outlet_count", "switch_count", "lighting_point_count"], normKey: "materials" });
  add({ sectionType: "materials", code: "electrical_reference_ferrules", name: "Наконечники и гильзы для оконцевания жил кабелей", unit: "pcs", quantity: terminations, unitPrice: 32, materialKey: "electrical_ferrules", quantityFormula: "max(line_count × 2, electrical_points_total × 3)", sourceParameterIds: ["line_count", "outlet_count", "switch_count", "lighting_point_count"], blockerIds: cableBlocker, normKey: "materials" });
  add({ sectionType: "materials", code: "electrical_reference_heat_shrink", name: "Термоусадочные трубки и изоляционные материалы соединений", unit: "set", quantity: Math.max(1, context.lineCount), unitPrice: 180, materialKey: "electrical_heat_shrink", quantityFormula: "max(1, line_count)", sourceParameterIds: ["line_count"], normKey: "materials" });
  add({ sectionType: "materials", code: "electrical_reference_junction_box_covers", name: "Крышки распределительных коробок с крепёжными винтами", unit: "pcs", quantity: context.groupCount, unitPrice: 85, materialKey: "electrical_junction_box_covers", quantityFormula: "group_count", sourceParameterIds: ["group_count"], normKey: "materials" });
  add({ sectionType: "materials", code: "electrical_reference_cable_glands", name: "Кабельные вводы с уплотнением для распределительного щита и коробок", unit: "pcs", quantity: context.lineCount * 2, unitPrice: 145, materialKey: "electrical_cable_glands", quantityFormula: "line_count × 2", sourceParameterIds: ["line_count", "cable_type", "cable_section_mm2"], blockerIds: cableBlocker, normKey: "materials" });
  add({ sectionType: "materials", code: "electrical_reference_cable_entry_bushings", name: "Изолирующие втулки кабельных вводов и кромок проходов", unit: "pcs", quantity: Math.max(context.lineCount * 2, penetrations), unitPrice: 62, materialKey: "electrical_cable_entry_bushings", quantityFormula: "max(line_count × 2, penetration_count)", sourceParameterIds: ["line_count", "route_length_m"], blockerIds: routeBlocker, normKey: "materials" });
  if (context.panelIncluded) {
    add({ sectionType: "materials", code: "electrical_reference_panel_terminal_blocks", name: "Наборные клеммы отходящих линий распределительного щита", unit: "pcs", quantity: Math.max(context.lineCount * 3, context.groupCount * 3), unitPrice: 125, materialKey: "electrical_panel_terminal_blocks", quantityFormula: "max(line_count × 3, group_count × 3)", sourceParameterIds: ["line_count", "group_count", "panel_included"], blockerIds: cableBlocker, normKey: "materials" });
    add({ sectionType: "materials", code: "electrical_reference_wire_markers", name: "Маркировочные кольца и бирки жил внутри распределительного щита", unit: "pcs", quantity: Math.max(terminations, context.groupCount * 6), unitPrice: 18, materialKey: "electrical_wire_markers", quantityFormula: "max(termination_count, group_count × 6)", sourceParameterIds: ["line_count", "group_count", "outlet_count", "switch_count", "lighting_point_count"], blockerIds: cableBlocker, normKey: "materials" });
    add({ sectionType: "materials", code: "electrical_reference_warning_labels", name: "Предупреждающие знаки электробезопасности и маркировка напряжения щита", unit: "set", quantity: 1, unitPrice: 680, materialKey: "electrical_warning_labels", quantityFormula: "1 комплект", sourceParameterIds: ["panel_included", "phase_count"], normKey: "protection" });
    add({ sectionType: "materials", code: "electrical_reference_circuit_directory_holder", name: "Карман и печатная ведомость назначения групп на двери щита", unit: "set", quantity: 1, unitPrice: 540, materialKey: "electrical_circuit_directory_holder", quantityFormula: "1 комплект", sourceParameterIds: ["panel_included", "group_count"], normKey: "documentation" });
  }
  add({ sectionType: "materials", code: "electrical_reference_sleeve_end_seals", name: "Уплотнители торцов защитных гильз кабельных проходов", unit: "pcs", quantity: penetrations * 2, unitPrice: 74, materialKey: "electrical_sleeve_end_seals", quantityFormula: "penetration_count × 2", sourceParameterIds: ["area_m2", "route_length_m"], blockerIds: routeBlocker, normKey: "materials" });
  add({ sectionType: "materials", code: "electrical_reference_firestop_backing", name: "Минеральная негорючая набивка кабельных проходок под огнезащитный герметик", unit: "kg", quantity: Math.max(1, rounded(penetrations * 0.35)), unitPrice: 420, materialKey: "electrical_firestop_backing", quantityFormula: "max(1, penetration_count × 0.35)", sourceParameterIds: ["area_m2", "route_length_m", "wall_material"], blockerIds: routeBlocker, normKey: "cable_fire_safety" });
  add({ sectionType: "materials", code: "electrical_reference_cable_pull_lubricant", name: "Совместимая с оболочкой кабеля смазка для протяжки в закрытых участках трассы", unit: "l", quantity: Math.max(1, rounded(context.totalCableLengthM / 250)), unitPrice: 690, materialKey: "electrical_cable_pull_lubricant", quantityFormula: "max(1, total_cable_length_m / 250)", sourceParameterIds: ["route_length_m", "line_count", "cable_type"], blockerIds: cableBlocker, normKey: "materials" });
  if (points > 0) {
    add({ sectionType: "materials", code: "electrical_reference_mechanism_fasteners", name: "Винты и распорные элементы крепления розеток и выключателей", unit: "set", quantity: points, unitPrice: 48, materialKey: "electrical_mechanism_fasteners", quantityFormula: "electrical_points_total", sourceParameterIds: ["outlet_count", "switch_count", "lighting_point_count"], normKey: "materials" });
  }
  if (context.containmentType === "cable_channel") {
    add({ sectionType: "materials", code: "electrical_reference_channel_cover", name: "Крышка кабель-канала по полной длине открытой трассы", unit: "linear_m", quantity: context.routeLengthM, unitPrice: 72, materialKey: "electrical_channel_cover", quantityFormula: "route_length_m", sourceParameterIds: ["route_length_m", "containment_type"], blockerIds: routeBlocker, normKey: "materials" });
    add({ sectionType: "materials", code: "electrical_reference_channel_internal_angles", name: "Внутренние углы кабель-канала", unit: "pcs", quantity: Math.max(2, Math.ceil(routeAccessories * 0.2)), unitPrice: 165, materialKey: "electrical_channel_internal_angles", quantityFormula: "max(2, ceil(route_accessory_count × 0.2))", sourceParameterIds: ["route_length_m", "containment_type"], blockerIds: routeBlocker, normKey: "materials" });
    add({ sectionType: "materials", code: "electrical_reference_channel_external_angles", name: "Внешние углы кабель-канала", unit: "pcs", quantity: Math.max(2, Math.ceil(routeAccessories * 0.15)), unitPrice: 175, materialKey: "electrical_channel_external_angles", quantityFormula: "max(2, ceil(route_accessory_count × 0.15))", sourceParameterIds: ["route_length_m", "containment_type"], blockerIds: routeBlocker, normKey: "materials" });
    add({ sectionType: "materials", code: "electrical_reference_channel_flat_bends", name: "Плоские повороты кабель-канала", unit: "pcs", quantity: Math.max(2, Math.ceil(routeAccessories * 0.15)), unitPrice: 185, materialKey: "electrical_channel_flat_bends", quantityFormula: "max(2, ceil(route_accessory_count × 0.15))", sourceParameterIds: ["route_length_m", "containment_type"], blockerIds: routeBlocker, normKey: "materials" });
    add({ sectionType: "materials", code: "electrical_reference_channel_tees", name: "Тройники и ответвители кабель-канала", unit: "pcs", quantity: Math.max(1, context.groupCount - 1), unitPrice: 240, materialKey: "electrical_channel_tees", quantityFormula: "max(1, group_count - 1)", sourceParameterIds: ["group_count", "containment_type"], normKey: "materials" });
    add({ sectionType: "materials", code: "electrical_reference_channel_end_caps", name: "Торцевые заглушки кабель-канала", unit: "pcs", quantity: Math.max(2, context.lineCount), unitPrice: 95, materialKey: "electrical_channel_end_caps", quantityFormula: "max(2, line_count)", sourceParameterIds: ["line_count", "containment_type"], normKey: "materials" });
    add({ sectionType: "materials", code: "electrical_reference_channel_box_adapters", name: "Адаптеры кабель-канала к установочным и распределительным коробкам", unit: "pcs", quantity: Math.max(points, context.groupCount), unitPrice: 135, materialKey: "electrical_channel_box_adapters", quantityFormula: "max(electrical_points_total, group_count)", sourceParameterIds: ["outlet_count", "switch_count", "lighting_point_count", "group_count", "containment_type"], normKey: "materials" });
    add({ sectionType: "materials", code: "electrical_reference_channel_partitions", name: "Разделительные перегородки кабель-канала для разнесения цепей", unit: "linear_m", quantity: rounded(context.routeLengthM * 0.35), unitPrice: 88, materialKey: "electrical_channel_partitions", quantityFormula: "route_length_m × 0.35", sourceParameterIds: ["route_length_m", "containment_type", "line_count"], blockerIds: routeBlocker, normKey: "protection" });
  }
  if (context.outletCount > 0) {
    add({ sectionType: "materials", code: "electrical_reference_socket_frames", name: "Рамки и лицевые панели розеточных механизмов", unit: "pcs", quantity: context.outletCount, unitPrice: 190, materialKey: "electrical_socket_frames", quantityFormula: "outlet_count", sourceParameterIds: ["outlet_count"], normKey: "materials" });
  }
  if (context.switchCount > 0) {
    add({ sectionType: "materials", code: "electrical_reference_switch_frames", name: "Рамки, клавиши и лицевые панели выключателей", unit: "pcs", quantity: context.switchCount, unitPrice: 170, materialKey: "electrical_switch_frames", quantityFormula: "switch_count", sourceParameterIds: ["switch_count"], normKey: "materials" });
  }
  if (context.lightingPointCount > 0) {
    add({ sectionType: "materials", code: "electrical_reference_lighting_connectors", name: "Клеммы подключения светильников и выводов освещения", unit: "pcs", quantity: context.lightingPointCount, unitPrice: 110, materialKey: "electrical_lighting_connectors", quantityFormula: "lighting_point_count", sourceParameterIds: ["lighting_point_count"], normKey: "materials" });
  }

  if (context.panelIncluded) {
    add({ sectionType: "materials", code: "electrical_reference_main_isolator", name: "Вводной выключатель нагрузки распределительного щита", unit: "pcs", quantity: 1, unitPrice: 4800, materialKey: "electrical_main_isolator", quantityFormula: "panel_included ? 1 : 0", sourceParameterIds: ["panel_included", "phase_count", "estimated_load_kw"], blockerIds: loadBlocker, normKey: "protection" });
    if (context.protectiveDevicesIncluded) {
      add({ sectionType: "materials", code: "electrical_reference_rcd", name: "Устройства защитного отключения / дифавтоматы по группам", unit: "pcs", quantity: rcdCount, unitPrice: 3400, materialKey: "electrical_rcd", quantityFormula: "max(1, ceil(group_count / 2))", sourceParameterIds: ["group_count", "protective_devices_included", "estimated_load_kw"], blockerIds: loadBlocker, normKey: "protection" });
      add({ sectionType: "materials", code: "electrical_reference_spd", name: "Устройство защиты от импульсных перенапряжений: класс и схема требуют проектного подтверждения", unit: "set", quantity: 1, unitPrice: 0, materialKey: "electrical_spd", quantityFormula: "1 условный комплект", sourceParameterIds: ["phase_count", "estimated_load_kw", "grounding_included"], blockerIds: ["surge_protection_requirement", "earthing_system_type"], normKey: "protection" });
      add({ sectionType: "materials", code: "electrical_reference_comb_busbar", name: "Соединительная гребёнка автоматических выключателей", unit: "pcs", quantity: Math.max(1, Math.ceil(panelModules / 12)), unitPrice: 950, materialKey: "electrical_comb_busbar", quantityFormula: "max(1, ceil(panel_modules / 12))", sourceParameterIds: ["group_count", "phase_count"], normKey: "protection" });
    }
    add({ sectionType: "materials", code: "electrical_reference_din_rail", name: "DIN-рейка для модульной аппаратуры щита", unit: "linear_m", quantity: rounded(panelModules * 0.018), unitPrice: 420, materialKey: "electrical_din_rail", quantityFormula: "panel_modules × 0.018", sourceParameterIds: ["group_count"], normKey: "materials" });
    add({ sectionType: "materials", code: "electrical_reference_panel_wiring", name: "Монтажный провод внутренней разводки распределительного щита", unit: "linear_m", quantity: panelModules * 0.8, unitPrice: 115, materialKey: "electrical_panel_wiring", quantityFormula: "panel_modules × 0.8", sourceParameterIds: ["group_count", "phase_count"], blockerIds: loadBlocker, normKey: "materials" });
    add({ sectionType: "materials", code: "electrical_reference_panel_duct", name: "Перфорированный кабельный канал внутренней разводки щита", unit: "linear_m", quantity: Math.max(1, panelModules * 0.04), unitPrice: 380, materialKey: "electrical_panel_duct", quantityFormula: "max(1, panel_modules × 0.04)", sourceParameterIds: ["group_count"], normKey: "materials" });
    add({ sectionType: "materials", code: "electrical_reference_panel_accessories", name: "Заглушки модулей, концевые фиксаторы и крепёж щита", unit: "set", quantity: 1, unitPrice: 1650, materialKey: "electrical_panel_accessories_detailed", quantityFormula: "1 комплект щита", sourceParameterIds: ["panel_included", "group_count"], normKey: "materials" });
  }
  if (context.groundingIncluded) {
    add({ sectionType: "materials", code: "electrical_reference_bonding_conductor", name: "Защитный проводник и проводник уравнивания потенциалов", unit: "linear_m", quantity: Math.max(context.routeLengthM * 0.15, context.groupCount * 2), unitPrice: 95, materialKey: "electrical_bonding_conductor", quantityFormula: "max(route_length_m × 0.15, group_count × 2)", sourceParameterIds: ["route_length_m", "group_count", "grounding_included"], blockerIds: cableBlocker, normKey: "earthing" });
    add({ sectionType: "materials", code: "electrical_reference_earthing_terminals", name: "Зажимы и наконечники защитных PE-проводников", unit: "pcs", quantity: Math.max(context.groupCount + points, 1), unitPrice: 55, materialKey: "electrical_earthing_terminals", quantityFormula: "group_count + electrical_points_total", sourceParameterIds: ["group_count", "outlet_count", "switch_count", "lighting_point_count", "grounding_included"], normKey: "earthing" });
  }

  add({ sectionType: "labor", code: "electrical_reference_incoming_material_inspection", name: "Входной контроль кабеля, аппаратов защиты и электроустановочных изделий", unit: "set", quantity: 1, unitPrice: 4200, quantityFormula: "1 партия", sourceParameterIds: ["cable_type", "cable_section_mm2", "group_count", "panel_included"], normKey: "documentation" });
  add({ sectionType: "labor", code: "electrical_reference_safe_isolation", name: "Отключение питающей линии, блокировка коммутационного аппарата и установка предупреждающей бирки", unit: "set", quantity: 1, unitPrice: 2800, quantityFormula: "1 безопасное отключение", sourceParameterIds: ["work_scope_type", "panel_included"], normKey: "protection" });
  add({ sectionType: "labor", code: "electrical_reference_absence_voltage_check", name: "Проверка отсутствия напряжения перед началом электромонтажных работ", unit: "set", quantity: 1, unitPrice: 1450, quantityFormula: "1 проверка допуска", sourceParameterIds: ["work_scope_type", "phase_count"], normKey: "protection" });
  add({ sectionType: "labor", code: "electrical_reference_cable_reel_setup", name: "Установка кабельных бухт или барабанов на размоточное устройство", unit: "shift", quantity: shifts, unitPrice: 1800, quantityFormula: "max(1, ceil(max(area_m2, route_length_m) / 120))", sourceParameterIds: ["area_m2", "route_length_m", "line_count"], blockerIds: routeBlocker, normKey: "installation" });
  add({ sectionType: "labor", code: "electrical_reference_penetration_drilling", name: "Сверление технологических проходов кабельной трассы", unit: "pcs", quantity: penetrations, unitPrice: 680, quantityFormula: "penetration_count", sourceParameterIds: ["area_m2", "route_length_m", "wall_material"], blockerIds: routeBlocker, normKey: "installation" });
  add({ sectionType: "labor", code: "electrical_reference_sleeve_install", name: "Монтаж защитных гильз кабельных проходов", unit: "pcs", quantity: penetrations, unitPrice: 420, quantityFormula: "penetration_count", sourceParameterIds: ["area_m2", "route_length_m"], blockerIds: routeBlocker, normKey: "installation" });
  add({ sectionType: "labor", code: "electrical_reference_firestop_install", name: "Герметизация кабельных проходок огнезащитным составом", unit: "pcs", quantity: penetrations, unitPrice: 760, quantityFormula: "penetration_count", sourceParameterIds: ["area_m2", "route_length_m", "wall_material"], blockerIds: routeBlocker, normKey: "installation" });
  if (context.containmentType !== "cable_channel") {
    add({ sectionType: "labor", code: "electrical_reference_containment_fixing", name: "Крепление гофры, трубы или лотка по трассе", unit: "linear_m", quantity: context.routeLengthM, unitPrice: 135, quantityFormula: "route_length_m", sourceParameterIds: ["route_length_m", "containment_type", "wall_material"], blockerIds: containmentBlocker, normKey: "installation" });
  }
  add({ sectionType: "labor", code: "electrical_reference_cable_measure_cut", name: "Отмеривание, резка и подготовка кабелей по ведомости линий", unit: "linear_m", quantity: context.totalCableLengthM, unitPrice: 24, quantityFormula: "route_length_m × line_count × cable_reserve_factor", sourceParameterIds: ["route_length_m", "line_count", "cable_reserve_factor"], blockerIds: cableBlocker, normKey: "installation" });
  add({ sectionType: "labor", code: "electrical_reference_cable_dressing", name: "Укладка, фиксация и формирование кабельных пучков", unit: "linear_m", quantity: context.totalCableLengthM, unitPrice: 48, quantityFormula: "total_cable_length_m", sourceParameterIds: ["route_length_m", "line_count", "cable_reserve_factor"], blockerIds: routeBlocker, normKey: "installation" });
  add({ sectionType: "labor", code: "electrical_reference_circuit_separation", name: "Разнесение силовых, осветительных и слаботочных цепей по трассе", unit: "linear_m", quantity: context.routeLengthM, unitPrice: 58, quantityFormula: "route_length_m", sourceParameterIds: ["route_length_m", "containment_type", "line_count"], blockerIds: containmentBlocker, normKey: "protection" });
  add({ sectionType: "labor", code: "electrical_reference_bend_radius_control", name: "Контроль допустимых радиусов изгиба и отсутствия повреждений оболочки кабеля", unit: "pcs", quantity: context.lineCount, unitPrice: 310, quantityFormula: "line_count", sourceParameterIds: ["line_count", "cable_type", "cable_section_mm2"], blockerIds: cableBlocker, normKey: "installation" });
  add({ sectionType: "labor", code: "electrical_reference_cable_gland_install", name: "Монтаж и уплотнение кабельных вводов щита и распределительных коробок", unit: "pcs", quantity: context.lineCount * 2, unitPrice: 185, quantityFormula: "line_count × 2", sourceParameterIds: ["line_count", "cable_type", "cable_section_mm2"], blockerIds: cableBlocker, normKey: "installation" });
  add({ sectionType: "labor", code: "electrical_reference_ferrule_crimping", name: "Опрессовка наконечников и маркировка жил кабелей", unit: "pcs", quantity: terminations, unitPrice: 85, quantityFormula: "termination_count", sourceParameterIds: ["line_count", "outlet_count", "switch_count", "lighting_point_count"], blockerIds: cableBlocker, normKey: "installation" });
  add({ sectionType: "labor", code: "electrical_reference_junction_box_connections", name: "Соединение и укладка жил в распределительных коробках", unit: "pcs", quantity: context.groupCount, unitPrice: 780, quantityFormula: "group_count", sourceParameterIds: ["group_count", "line_count", "cable_type", "cable_section_mm2"], blockerIds: cableBlocker, normKey: "installation" });
  if (context.outletCount > 0) {
    add({ sectionType: "labor", code: "electrical_reference_outlet_wiring", name: "Подключение фазного, нейтрального и защитного проводников розеточных механизмов", unit: "pcs", quantity: context.outletCount, unitPrice: 390, quantityFormula: "outlet_count", sourceParameterIds: ["outlet_count", "cable_type", "cable_section_mm2", "grounding_included"], blockerIds: cableBlocker, normKey: "installation" });
  }
  if (context.switchCount > 0) {
    add({ sectionType: "labor", code: "electrical_reference_switch_wiring", name: "Подключение выключателей к фазному и коммутируемому проводникам", unit: "pcs", quantity: context.switchCount, unitPrice: 360, quantityFormula: "switch_count", sourceParameterIds: ["switch_count", "cable_type", "cable_section_mm2"], blockerIds: cableBlocker, normKey: "installation" });
  }
  if (context.lightingPointCount > 0) {
    add({ sectionType: "labor", code: "electrical_reference_lighting_connector_install", name: "Подключение клемм и изоляция выводов точек освещения", unit: "pcs", quantity: context.lightingPointCount, unitPrice: 420, quantityFormula: "lighting_point_count", sourceParameterIds: ["lighting_point_count", "cable_type", "cable_section_mm2"], blockerIds: cableBlocker, normKey: "installation" });
  }
  if (context.containmentType === "cable_channel") {
    add({ sectionType: "labor", code: "electrical_reference_channel_measure_cut", name: "Разметка, резка и обработка торцов кабель-канала", unit: "linear_m", quantity: context.routeLengthM, unitPrice: 92, quantityFormula: "route_length_m", sourceParameterIds: ["route_length_m", "containment_type"], blockerIds: routeBlocker, normKey: "installation" });
    add({ sectionType: "labor", code: "electrical_reference_channel_body_install", name: "Монтаж основания кабель-канала с контролем линии крепления", unit: "linear_m", quantity: context.routeLengthM, unitPrice: 165, quantityFormula: "route_length_m", sourceParameterIds: ["route_length_m", "containment_type", "wall_material"], blockerIds: routeBlocker, normKey: "installation" });
    add({ sectionType: "labor", code: "electrical_reference_channel_fittings_install", name: "Монтаж углов, тройников, заглушек и адаптеров кабель-канала", unit: "pcs", quantity: routeAccessories + context.groupCount, unitPrice: 210, quantityFormula: "route_accessory_count + group_count", sourceParameterIds: ["route_length_m", "group_count", "containment_type"], blockerIds: routeBlocker, normKey: "installation" });
    add({ sectionType: "labor", code: "electrical_reference_channel_partition_install", name: "Монтаж разделительных перегородок кабель-канала", unit: "linear_m", quantity: rounded(context.routeLengthM * 0.35), unitPrice: 75, quantityFormula: "route_length_m × 0.35", sourceParameterIds: ["route_length_m", "containment_type", "line_count"], blockerIds: routeBlocker, normKey: "protection" });
    add({ sectionType: "labor", code: "electrical_reference_channel_cover_close", name: "Установка и защёлкивание крышек кабель-канала после контроля трассы", unit: "linear_m", quantity: context.routeLengthM, unitPrice: 54, quantityFormula: "route_length_m", sourceParameterIds: ["route_length_m", "containment_type"], blockerIds: routeBlocker, normKey: "installation" });
  }
  if (context.panelIncluded) {
    add({ sectionType: "labor", code: "electrical_reference_panel_din_duct_install", name: "Монтаж DIN-реек и перфорированного канала внутренней разводки щита", unit: "linear_m", quantity: rounded(panelModules * 0.058), unitPrice: 620, quantityFormula: "panel_modules × (0.018 + 0.04)", sourceParameterIds: ["panel_included", "group_count"], normKey: "installation" });
    add({ sectionType: "labor", code: "electrical_reference_panel_incoming_cable", name: "Подготовка и подключение вводного кабеля распределительного щита", unit: "pcs", quantity: 1, unitPrice: 2800, quantityFormula: "panel_included ? 1 : 0", sourceParameterIds: ["panel_included", "phase_count", "estimated_load_kw", "cable_type", "cable_section_mm2"], blockerIds: loadBlocker, normKey: "protection" });
    add({ sectionType: "labor", code: "electrical_reference_panel_outgoing_cables", name: "Подготовка и подключение отходящих групповых кабелей в щите", unit: "pcs", quantity: context.lineCount, unitPrice: 620, quantityFormula: "line_count", sourceParameterIds: ["panel_included", "line_count", "cable_type", "cable_section_mm2"], blockerIds: cableBlocker, normKey: "installation" });
    add({ sectionType: "labor", code: "electrical_reference_main_isolator_install", name: "Монтаж и подключение вводного выключателя нагрузки", unit: "pcs", quantity: 1, unitPrice: 1600, quantityFormula: "panel_included ? 1 : 0", sourceParameterIds: ["panel_included", "phase_count", "estimated_load_kw"], blockerIds: loadBlocker, normKey: "protection" });
    if (context.protectiveDevicesIncluded) {
      add({ sectionType: "labor", code: "electrical_reference_breakers_install", name: "Монтаж и подключение автоматических выключателей групповых цепей", unit: "pcs", quantity: context.groupCount + 2, unitPrice: 540, quantityFormula: "group_count + 2", sourceParameterIds: ["group_count", "protective_devices_included", "estimated_load_kw"], blockerIds: loadBlocker, normKey: "protection" });
      add({ sectionType: "labor", code: "electrical_reference_rcd_install", name: "Монтаж и подключение УЗО / дифавтоматов групповых цепей", unit: "pcs", quantity: rcdCount, unitPrice: 720, quantityFormula: "max(1, ceil(group_count / 2))", sourceParameterIds: ["group_count", "protective_devices_included", "estimated_load_kw"], blockerIds: loadBlocker, normKey: "protection" });
    }
    if (context.groundingIncluded) {
      add({ sectionType: "labor", code: "electrical_reference_busbars_install", name: "Монтаж и подключение раздельных шин PE и N распределительного щита", unit: "set", quantity: 1, unitPrice: 1250, quantityFormula: "grounding_included ? 1 : 0", sourceParameterIds: ["panel_included", "grounding_included", "group_count"], normKey: "earthing" });
      add({ sectionType: "labor", code: "electrical_reference_bonding_connections", name: "Подключение защитных проводников и системы уравнивания потенциалов", unit: "pcs", quantity: Math.max(context.groupCount + points, 1), unitPrice: 240, quantityFormula: "max(group_count + electrical_points_total, 1)", sourceParameterIds: ["group_count", "outlet_count", "switch_count", "lighting_point_count", "grounding_included"], normKey: "earthing" });
    }
    add({ sectionType: "labor", code: "electrical_reference_panel_internal_wiring", name: "Внутренняя разводка и формирование проводников распределительного щита", unit: "linear_m", quantity: panelModules * 0.8, unitPrice: 195, quantityFormula: "panel_modules × 0.8", sourceParameterIds: ["panel_included", "group_count", "phase_count", "estimated_load_kw"], blockerIds: loadBlocker, normKey: "protection" });
    add({ sectionType: "labor", code: "electrical_reference_panel_label_install", name: "Нанесение маркировки аппаратов, шин и отходящих линий распределительного щита", unit: "pcs", quantity: Math.max(context.groupCount + 3, context.lineCount), unitPrice: 95, quantityFormula: "max(group_count + 3, line_count)", sourceParameterIds: ["panel_included", "group_count", "line_count"], normKey: "documentation" });
    add({ sectionType: "labor", code: "electrical_reference_panel_torque", name: "Контроль и протяжка контактных соединений распределительного щита", unit: "pcs", quantity: panelModules, unitPrice: 95, quantityFormula: "panel_modules", sourceParameterIds: ["panel_included", "group_count"], normKey: "verification" });
  }
  if (context.wiringMethod === "concealed") {
    add({ sectionType: "labor", code: "electrical_reference_chase_repair", name: "Заделка штроб и восстановление основания после скрытой прокладки", unit: "linear_m", quantity: context.routeLengthM, unitPrice: 210, quantityFormula: "route_length_m", sourceParameterIds: ["wiring_method", "route_length_m", "wall_material"], blockerIds: routeBlocker, normKey: "installation" });
  }

  add({ sectionType: "labor", code: "electrical_reference_visual_inspection", name: "Визуальная проверка соответствия монтажа проектной схеме и маркировке", unit: "set", quantity: 1, unitPrice: 3400, quantityFormula: "1 комплекс", sourceParameterIds: ["group_count", "line_count"], normKey: "verification" });
  add({ sectionType: "labor", code: "electrical_reference_cable_marking_fire_check", name: "Проверка маркировки и класса пожарной опасности применённых кабелей", unit: "pcs", quantity: context.lineCount, unitPrice: 420, quantityFormula: "line_count", sourceParameterIds: ["line_count", "cable_type", "cable_section_mm2"], blockerIds: cableBlocker, normKey: "cable_fire_safety" });
  if (context.groundingIncluded) {
    add({ sectionType: "labor", code: "electrical_reference_pe_continuity_test", name: "Измерение непрерывности защитных PE-проводников и уравнивания потенциалов", unit: "pcs", quantity: Math.max(context.groupCount, 1), unitPrice: 720, quantityFormula: "max(group_count, 1)", sourceParameterIds: ["group_count", "grounding_included"], normKey: "verification" });
  }
  add({ sectionType: "labor", code: "electrical_reference_polarity_test", name: "Проверка полярности розеточных и осветительных цепей", unit: "pcs", quantity: Math.max(points, context.groupCount), unitPrice: 180, quantityFormula: "max(electrical_points_total, group_count)", sourceParameterIds: ["outlet_count", "switch_count", "lighting_point_count", "group_count"], normKey: "verification" });
  if (context.protectiveDevicesIncluded) {
    add({ sectionType: "labor", code: "electrical_reference_loop_impedance_test", name: "Измерение полного сопротивления петли короткого замыкания", unit: "pcs", quantity: context.groupCount, unitPrice: 980, quantityFormula: "group_count", sourceParameterIds: ["group_count", "phase_count", "protective_devices_included"], normKey: "verification" });
    add({ sectionType: "labor", code: "electrical_reference_prospective_fault_current", name: "Определение ожидаемого тока короткого замыкания на вводе и конечных цепях", unit: "pcs", quantity: context.groupCount + 1, unitPrice: 860, quantityFormula: "group_count + 1", sourceParameterIds: ["group_count", "phase_count", "estimated_load_kw", "protective_devices_included"], blockerIds: loadBlocker, normKey: "verification" });
    add({ sectionType: "labor", code: "electrical_reference_rcd_test", name: "Проверка тока и времени срабатывания УЗО / дифавтоматов", unit: "pcs", quantity: rcdCount, unitPrice: 1150, quantityFormula: "max(1, ceil(group_count / 2))", sourceParameterIds: ["group_count", "protective_devices_included"], blockerIds: loadBlocker, normKey: "verification" });
  }
  add({ sectionType: "labor", code: "electrical_reference_operating_voltage_test", name: "Измерение рабочего напряжения на вводе и наиболее удалённых электрических точках", unit: "pcs", quantity: Math.max(2, context.groupCount), unitPrice: 360, quantityFormula: "max(2, group_count)", sourceParameterIds: ["group_count", "phase_count", "route_length_m"], normKey: "verification" });
  if (points > 0) {
    add({ sectionType: "labor", code: "electrical_reference_functional_test", name: "Функциональная проверка коммутации, розеток и цепей освещения", unit: "pcs", quantity: points, unitPrice: 190, quantityFormula: "electrical_points_total", sourceParameterIds: ["outlet_count", "switch_count", "lighting_point_count"], normKey: "verification" });
  }
  if (context.phaseCount === 3) {
    add({ sectionType: "labor", code: "electrical_reference_phase_sequence_test", name: "Проверка чередования фаз и балансировки групп", unit: "set", quantity: 1, unitPrice: 2600, quantityFormula: "1 трёхфазная установка", sourceParameterIds: ["phase_count", "group_count", "estimated_load_kw"], blockerIds: loadBlocker, normKey: "verification" });
  }
  add({ sectionType: "labor", code: "electrical_reference_test_protocol", name: "Оформление протокола первичной проверки электроустановки", unit: "set", quantity: 1, unitPrice: 6800, quantityFormula: "1 протокол", sourceParameterIds: ["group_count", "phase_count", "grounding_included", "protective_devices_included"], normKey: "verification" });
  if (context.panelIncluded) {
    add({ sectionType: "labor", code: "electrical_reference_torque_protocol", name: "Ведомость моментов затяжки контактных соединений распределительного щита", unit: "set", quantity: 1, unitPrice: 2800, quantityFormula: "1 ведомость", sourceParameterIds: ["panel_included", "group_count"], normKey: "verification" });
  }
  if (context.protectiveDevicesIncluded) {
    add({ sectionType: "labor", code: "electrical_reference_controlled_energization", name: "Контролируемая подача напряжения и наблюдение работы электроустановки", unit: "set", quantity: 1, unitPrice: 4200, quantityFormula: "1 ввод в работу", sourceParameterIds: ["panel_included", "phase_count", "group_count", "protective_devices_included"], blockerIds: loadBlocker, normKey: "verification" });
  }

  add({ sectionType: "labor", code: "electrical_reference_as_built_plan", name: "Исполнительный план кабельных трасс и расположения электрических точек", unit: "set", quantity: 1, unitPrice: 7200, quantityFormula: "1 комплект", sourceParameterIds: ["area_m2", "route_length_m", "outlet_count", "switch_count", "lighting_point_count"], normKey: "documentation" });
  add({ sectionType: "labor", code: "electrical_reference_cable_schedule", name: "Исполнительный кабельный журнал с марками, сечениями и длинами линий", unit: "pcs", quantity: context.lineCount, unitPrice: 520, quantityFormula: "line_count", sourceParameterIds: ["line_count", "route_length_m", "cable_type", "cable_section_mm2"], blockerIds: cableBlocker, normKey: "documentation" });
  if (context.panelIncluded) {
    add({ sectionType: "labor", code: "electrical_reference_panel_schedule", name: "Исполнительная таблица аппаратов защиты и назначений групп щита", unit: "pcs", quantity: context.groupCount, unitPrice: 480, quantityFormula: "group_count", sourceParameterIds: ["group_count", "estimated_load_kw", "phase_count"], blockerIds: loadBlocker, normKey: "documentation" });
  }
  add({ sectionType: "labor", code: "electrical_reference_handover", name: "Комплектование исполнительной документации и сдача электроустановки заказчику", unit: "set", quantity: 1, unitPrice: 5400, quantityFormula: "1 комплект", sourceParameterIds: ["group_count", "line_count"], normKey: "documentation" });
  add({ sectionType: "labor", code: "electrical_reference_material_certificates_register", name: "Реестр паспортов, сертификатов и деклараций применённых электротехнических материалов", unit: "set", quantity: 1, unitPrice: 3600, quantityFormula: "1 реестр", sourceParameterIds: ["cable_type", "group_count", "panel_included"], normKey: "documentation" });
  add({ sectionType: "labor", code: "electrical_reference_photo_log", name: context.panelIncluded ? "Фотофиксация кабельных трасс, проходок, соединений и сборки щита" : "Фотофиксация кабельных трасс, проходок и соединений", unit: "set", quantity: 1, unitPrice: 3200, quantityFormula: "1 фотоотчёт", sourceParameterIds: ["route_length_m", "group_count", "panel_included"], normKey: "documentation" });
  add({ sectionType: "labor", code: "electrical_reference_client_briefing", name: context.panelIncluded ? "Инструктаж заказчика по безопасному отключению и назначению групп щита" : "Инструктаж заказчика по безопасному отключению электрических цепей", unit: "set", quantity: 1, unitPrice: 2400, quantityFormula: "1 инструктаж", sourceParameterIds: ["group_count", "protective_devices_included", "panel_included"], normKey: "documentation" });

  add({ sectionType: "equipment", code: "electrical_reference_core_drill", name: "Установка алмазного сверления кабельных проходов", unit: "shift", quantity: Math.max(1, Math.ceil(penetrations / 12)), unitPrice: 9800, quantityFormula: "max(1, ceil(penetration_count / 12))", sourceParameterIds: ["area_m2", "route_length_m", "wall_material"], blockerIds: routeBlocker, normKey: "installation" });
  add({ sectionType: "equipment", code: "electrical_reference_rotary_hammer", name: "Перфоратор с комплектом буров для креплений кабельной трассы", unit: "shift", quantity: shifts, unitPrice: 2600, quantityFormula: "max(1, ceil(max(area_m2, route_length_m) / 120))", sourceParameterIds: ["area_m2", "route_length_m", "wall_material"], blockerIds: routeBlocker, normKey: "installation" });
  add({ sectionType: "equipment", code: "electrical_reference_dust_extractor", name: "Промышленный пылесос для сверления и обработки кабельных проходов", unit: "shift", quantity: shifts, unitPrice: 3200, quantityFormula: "max(1, ceil(max(area_m2, route_length_m) / 120))", sourceParameterIds: ["area_m2", "route_length_m", "wall_material"], blockerIds: routeBlocker, normKey: "installation" });
  add({ sectionType: "equipment", code: "electrical_reference_cable_reel_stand", name: "Стойка для контролируемой размотки кабельных бухт и барабанов", unit: "shift", quantity: shifts, unitPrice: 1900, quantityFormula: "max(1, ceil(max(area_m2, route_length_m) / 120))", sourceParameterIds: ["area_m2", "route_length_m", "line_count"], blockerIds: routeBlocker, normKey: "installation" });
  if (context.containmentType === "cable_channel") {
    add({ sectionType: "equipment", code: "electrical_reference_channel_cutting_tool", name: "Торцовочная пила или резак для кабель-канала с оснасткой", unit: "shift", quantity: shifts, unitPrice: 2400, quantityFormula: "max(1, ceil(route_length_m / 120))", sourceParameterIds: ["route_length_m", "containment_type"], blockerIds: routeBlocker, normKey: "installation" });
  }
  add({ sectionType: "equipment", code: "electrical_reference_crimp_tool", name: "Пресс-клещи и инструмент для оконцевания кабелей", unit: "shift", quantity: shifts, unitPrice: 1800, quantityFormula: "max(1, ceil(max(area_m2, route_length_m) / 120))", sourceParameterIds: ["area_m2", "route_length_m"], normKey: "installation" });
  if (context.panelIncluded) {
    add({ sectionType: "equipment", code: "electrical_reference_torque_tool", name: "Динамометрический инструмент для контактных соединений щита", unit: "shift", quantity: 1, unitPrice: 2200, quantityFormula: "1 смена", sourceParameterIds: ["panel_included", "group_count"], normKey: "verification" });
  }
  add({ sectionType: "equipment", code: "electrical_reference_installation_tester", name: "Многофункциональный измеритель параметров электроустановки", unit: "shift", quantity: Math.max(1, Math.ceil(context.groupCount / 12)), unitPrice: 8500, quantityFormula: "max(1, ceil(group_count / 12))", sourceParameterIds: ["group_count", "protective_devices_included", "grounding_included"], normKey: "verification" });
  add({ sectionType: "equipment", code: "electrical_reference_label_printer", name: "Принтер промышленной маркировки кабелей и аппаратов щита", unit: "shift", quantity: 1, unitPrice: 2100, quantityFormula: "1 смена", sourceParameterIds: ["line_count", "group_count", "panel_included"], normKey: "documentation" });

  add({ sectionType: "delivery", code: "electrical_reference_vertical_handling", name: "Внутриобъектное перемещение кабеля, щита и электроустановочных изделий", unit: "trip", quantity: Math.max(1, Math.ceil(Math.max(context.totalCableLengthM, 1) / 500)), unitPrice: 2800, quantityFormula: "max(1, ceil(total_cable_length_m / 500))", sourceParameterIds: ["route_length_m", "line_count", "panel_included"], normKey: "installation" });
  add({ sectionType: "delivery", code: "electrical_reference_packaging_waste", name: "Сбор и вывоз упаковки и отходов электромонтажных материалов", unit: "trip", quantity: Math.max(1, Math.ceil(Math.max(context.areaM2, 1) / 150)), unitPrice: 3200, quantityFormula: "max(1, ceil(area_m2 / 150))", sourceParameterIds: ["area_m2", "route_length_m"], normKey: "installation" });

  return rows;
}
