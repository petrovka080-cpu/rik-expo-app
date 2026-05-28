import type { WorldConstructionMaterialSystem } from "./worldConstructionTypes";

export const CONSTRUCTION_MATERIAL_SYSTEMS: readonly WorldConstructionMaterialSystem[] = [
  { key: "roof_waterproofing", labelRu: "Кровельная гидроизоляция", materialKeys: ["primer", "roof_membrane", "bitumen_mastic", "sealant", "detail_tape"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "wet_area_waterproofing", labelRu: "Гидроизоляция мокрых зон", materialKeys: ["primer", "cement_waterproofing", "corner_tape", "sealant"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "foundation_waterproofing", labelRu: "Гидроизоляция фундамента", materialKeys: ["primer", "roll_membrane", "drainage_membrane", "sealant"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "hydro_turbine_system", labelRu: "Гидроагрегат и автоматика", materialKeys: ["turbine", "generator", "control_cabinet", "cable", "switchgear"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "laminate_flooring", labelRu: "Ламинат", materialKeys: ["laminate", "underlayment", "baseboard", "threshold"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "brick_masonry", labelRu: "Кирпичная кладка", materialKeys: ["brick", "mortar", "masonry_mesh", "reinforcement"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "drywall_system", labelRu: "Система ГКЛ", materialKeys: ["drywall_sheet", "track_profile", "stud_profile", "fasteners", "joint_tape", "joint_putty"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "road_base", labelRu: "Дорожное основание и асфальтобетон", materialKeys: ["sand", "crushed_stone", "bitumen_emulsion", "asphalt_concrete"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "window_installation", labelRu: "Оконный блок", materialKeys: ["window_unit", "sill", "flashing", "foam", "fasteners", "sealant"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "ventilation_system", labelRu: "Вентиляция", materialKeys: ["duct", "grille", "fan", "damper", "insulation"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "solar_pv_system", labelRu: "Солнечная электростанция", materialKeys: ["solar_panel", "inverter", "mounting", "dc_cable", "protection"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "well_drilling_system", labelRu: "Скважина", materialKeys: ["casing", "filter", "pump", "gravel_pack", "head"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "industrial_equipment", labelRu: "Industrial equipment", materialKeys: ["equipment", "controls", "cable", "mounting", "protection"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "concrete_rebar", labelRu: "Бетон и арматура", materialKeys: ["concrete", "rebar", "formwork", "wire", "spacers"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "general_building", labelRu: "Общестроительные материалы", materialKeys: ["main_material", "auxiliary_material", "fasteners"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "earthworks", labelRu: "Земляные работы", materialKeys: ["geotextile", "sand", "crushed_stone"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "demolition", labelRu: "Демонтаж", materialKeys: ["bags", "container", "dust_protection"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "electrical_installation", labelRu: "Электромонтаж", materialKeys: ["cable", "conduit", "breaker", "panel", "socket"], catalogPolicy: "candidate_or_gap_warning" },
  { key: "roofing", labelRu: "Кровельная система", materialKeys: ["timber", "membrane", "battens", "roof_covering", "flashing"], catalogPolicy: "candidate_or_gap_warning" },
];

export function getConstructionMaterialSystem(key: string): WorldConstructionMaterialSystem {
  return CONSTRUCTION_MATERIAL_SYSTEMS.find((item) => item.key === key) ?? CONSTRUCTION_MATERIAL_SYSTEMS[CONSTRUCTION_MATERIAL_SYSTEMS.length - 1];
}
