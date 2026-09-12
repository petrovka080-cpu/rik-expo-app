export type ProfessionalNormPackBasisQuestionRu = {
  labelRu: string;
  unit: string | null;
  aliasesRu: readonly string[];
  promptPhraseRu: string;
  descriptionRu: string;
};

function question(labelRu: string, unit: string | null, ...aliasesRu: string[]): ProfessionalNormPackBasisQuestionRu {
  return Object.freeze({
    labelRu,
    unit,
    aliasesRu: Object.freeze(aliasesRu.length > 0 ? aliasesRu : [labelRu.toLocaleLowerCase("ru-RU")]),
    promptPhraseRu: labelRu.toLocaleLowerCase("ru-RU"),
    descriptionRu: `Укажите «${labelRu.toLocaleLowerCase("ru-RU")}» по проекту, обмеру или выбранному нормативному документу. Значение не подставляется автоматически.`,
  });
}

export const PROFESSIONAL_NORM_PACK_BASIS_QUESTIONS_RU: Readonly<Record<string, ProfessionalNormPackBasisQuestionRu>> = Object.freeze({
  approved_dripline_route_linear_m: question("Проектная длина капельной линии", "linear_m", "трасса полива"),
  approved_duct_route_linear_m: question("Проектная длина воздуховода", "linear_m", "трасса воздуховода"),
  approved_pipe_route_linear_m: question("Проектная длина канализационной трассы", "linear_m", "трасса канализации"),
  approved_route_length_linear_m: question("Проектная длина кабельной трассы", "linear_m", "длина кабеля"),
  board_area_m2: question("Площадь обшивки гипсокартоном", "m2", "площадь листов"),
  cargo_weight_kg: question("Масса перевозимого груза", "kg", "вес груза"),
  ceiling_area_m2: question("Площадь потолка", "m2"),
  cleanable_hard_floor_area_m2: question("Площадь твёрдого пола для уборки", "m2", "площадь уборки"),
  coated_steel_area_m2: question("Площадь окрашиваемой стали", "m2", "площадь металла"),
  compacted_backfill_depth_m: question("Глубина уплотняемой засыпки", "m", "толщина засыпки"),
  contracted_author_supervision_visit_count: question("Количество выездов авторского надзора", "pcs", "выезды надзора"),
  designed_detector_point_count: question("Количество пожарных извещателей по проекту", "point", "точки пожарной сигнализации"),
  facade_insulation_area_m2: question("Площадь фасадного утепления", "m2", "площадь утеплителя"),
  finished_perimeter_linear_m: question("Чистовой периметр плинтуса", "linear_m", "длина плинтуса"),
  measured_loose_cd_debris_m3: question("Рыхлый объём смешанных строительных отходов", "m3", "объём смешанного мусора"),
  measured_loose_concrete_debris_m3: question("Рыхлый объём бетонного лома", "m3", "объём бетонного мусора"),
  measured_project_quantity: question("Проектный объём демонтажа в единице выбранной таблицы", null, "объём демонтажа"),
  net_insulation_area_m2: question("Чистая площадь утепления", "m2", "площадь теплоизоляции"),
  net_rectangular_field_area_m2: question("Чистая площадь поля кровли", "m2", "поле кровли"),
  pavement_area_m2: question("Площадь дорожного покрытия", "m2", "площадь дороги"),
  perimeter_linear_m: question("Длина периметральных швов", "linear_m", "длина примыканий"),
  pipe_length_linear_m: question("Проектная длина трубопровода", "linear_m", "длина трубы"),
  prepared_pipe_end_count: question("Количество подготовленных концов трубы", "pcs", "концы трубы"),
  project_capacity_measure: question("Проектная мощность в единице выбранного сборника", null, "мощность объекта"),
  qualified_joint_length_linear_m: question("Длина монтажного шва окна или двери", "linear_m", "периметр рамы"),
  shift_count: question("Количество смен аренды", "shift", "смены"),
  skirting_length_linear_m: question("Длина приклеиваемого плинтуса", "linear_m", "плинтус под клей"),
  total_refrigerant_piping_length_m: question("Общая длина фреоновой трассы", "linear_m", "трасса кондиционера"),
  tray_joint_count: question("Количество стыков кабельного лотка", "pcs", "стыки лотка"),
  treated_timber_surface_area_m2: question("Площадь обработки древесины", "m2", "площадь древесины"),
  zone_area_m2: question("Отапливаемая площадь зоны тёплого пола", "m2", "площадь тёплого пола"),
});
