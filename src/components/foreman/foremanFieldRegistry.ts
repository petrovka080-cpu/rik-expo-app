export const ALLOWED_CORE_FIELDS = [
  "area_m2",
  "length_m",
  "width_m",
  "height_m",
  "thickness_mm",
  "perimeter_m",
  "count",
  "points",
  "pipe_length_m",
  "weight_ton",
  "volume_m3",
  "diameter_mm",
  "layers_count",
  "overhang_m",
  "ridge_height_m",
  "distance_km",
  "points_light",
  "points_outlet",
  "points_switch",
  "points_sink",
  "points_wc",
  "points_shower",
  "points_wm",
  "points_cw",
  "points_hw",
  "points_sw",
  "opening_area_m2",
  "opening_count",
  "formwork_m2",
  "rebar_kg",
] as const;

export const ALLOWED_ENGINEERING_FIELDS = [
  "width_m",
  "height_m",
  "thickness_mm",
  "perimeter_m",
  "pipe_length_m",
  "weight_ton",
  "diameter_mm",
  "layers_count",
  "overhang_m",
  "ridge_height_m",
  "distance_km",
  "points_light",
  "points_outlet",
  "points_switch",
  "points_sink",
  "points_wc",
  "points_shower",
  "points_wm",
  "points_cw",
  "points_hw",
  "points_sw",
  "opening_area_m2",
  "opening_count",
  "formwork_m2",
  "rebar_kg",
  "points_low",
] as const;

export const ALLOWED_DERIVED_FIELDS = [
  "volume_m3",
  "area_m2",
] as const;

export const ALLOWED_HIDDEN_FIELDS = [
  "pump_m3",
  "backfill_m3",
  "excavation_m3",
  "subconcrete_m3",
  "waterproof_m2",
  "film_m2",
  "mesh_m2",
  "subbase_m3",
  "base_mix_mass_t",
  "finish_mix_mass_t",
] as const;

export const FIELD_ALIASES = {
  points_socket: "points_outlet",
  points_panel: "points",
} as const;

export const LEGACY_FALLBACK_ONLY_FIELDS = [
  "area_wall_m2",
  "block_size_mm",
  "cable_section_mm",
  "depth_m",
  "joint_mm",
  "joint_thickness_mm",
  "levels_count",
  "roof_area_m2",
  "thickness_cm",
  "tile_size_mm",
] as const;

const CANONICAL_SET = new Set<string>([
  ...ALLOWED_CORE_FIELDS,
  ...ALLOWED_ENGINEERING_FIELDS,
  ...ALLOWED_DERIVED_FIELDS,
  ...ALLOWED_HIDDEN_FIELDS,
]);
const LEGACY_SET = new Set<string>(LEGACY_FALLBACK_ONLY_FIELDS);
const ALIAS_SET = new Set<string>(Object.keys(FIELD_ALIASES));

type ProfileLike = {
  workTypeCode: string;
  core: readonly string[];
  engineering?: readonly string[];
  derived?: readonly string[];
  hidden?: readonly string[];
};

export function assertCanonicalProfileRegistry(
  profiles: readonly ProfileLike[],
  log: Pick<Console, "warn"> = console,
): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];

  const pushWarning = (message: string) => {
    warnings.push(message);
    log.warn(`[foreman-field-registry] ${message}`);
  };

  for (const profile of profiles) {
    const all = [
      ...profile.core,
      ...(profile.engineering ?? []),
      ...(profile.derived ?? []),
      ...(profile.hidden ?? []),
    ];
    for (const key of all) {
      const norm = String(key ?? "").trim();
      if (!norm) continue;
      if (ALIAS_SET.has(norm)) {
        pushWarning(`${profile.workTypeCode}: alias key "${norm}" used directly in canonical profile`);
        continue;
      }
      if (LEGACY_SET.has(norm)) {
        pushWarning(`${profile.workTypeCode}: legacy-only key "${norm}" used in canonical profile`);
        continue;
      }
      if (!CANONICAL_SET.has(norm)) {
        pushWarning(`${profile.workTypeCode}: unknown key "${norm}" outside allowed registry`);
      }
    }
  }

  return { ok: warnings.length === 0, warnings };
}

