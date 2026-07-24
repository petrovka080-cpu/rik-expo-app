export type RoadCompositeOwnerClassV4 =
  | "CHILD_PROFESSIONAL_PASSPORT"
  | "PROJECT_LEVEL_RESOURCE"
  | "PASSPORT_GAP";

export type RoadCompositeOwnerV4 = {
  ownerId: string;
  ownerClass: RoadCompositeOwnerClassV4;
  passportVersion: string;
  professionalName: string;
  wbsIds: string[];
  formulaGraphId: string;
  sourceRegistryVersion: string;
};

const child = (id: string, name: string, wbsIds: string[]): RoadCompositeOwnerV4 => ({
  ownerId: `road-child-passport:${id}:v1`,
  ownerClass: "CHILD_PROFESSIONAL_PASSPORT",
  passportVersion: "1.0.0",
  professionalName: name,
  wbsIds,
  formulaGraphId: `road-formula-graph:${id}:v1`,
  sourceRegistryVersion: "road-source-registry:v1",
});

export const ROAD_COMPOSITE_OWNERS_V4: readonly RoadCompositeOwnerV4[] = [
  child("engineering-survey", "Инженерное обследование и исходные данные дороги", ["01", "02"]),
  child("site-preparation", "Подготовка полосы дорожного строительства", ["03", "04"]),
  child("earthworks", "Земляное полотно автомобильной дороги", ["05", "06"]),
  child("geosynthetics", "Дорожные геосинтетические материалы", ["07"]),
  child("sand-subbase", "Песчаный подстилающий слой", ["08"]),
  child("aggregate-base", "Щебёночное основание дорожной одежды", ["09"]),
  child("bituminous-prime", "Подгрунтовка дорожного основания", ["10"]),
  child("asphalt-pavement", "Асфальтобетонное дорожное покрытие", ["11", "12"]),
  child("road-curbs", "Бортовой камень автомобильной дороги", ["13"]),
  child("sidewalk-accessibility", "Тротуары и доступная среда", ["14"]),
  child("linear-drainage", "Линейный водоотвод", ["15"]),
  child("storm-sewer", "Дождевая канализация", ["16", "18"]),
  child("culverts", "Водопропускные трубы", ["17"]),
  child("road-marking", "Дорожная разметка", ["19"]),
  child("traffic-signs", "Технические средства дорожных знаков", ["20"]),
  child("road-restraint", "Дорожные удерживающие ограждения", ["21"]),
  child("road-lighting", "Наружное освещение автомобильной дороги", ["22", "23", "24"]),
  child("traffic-signals", "Светофорное регулирование", ["25"]),
  child("public-transport-stops", "Остановочные пункты общественного транспорта", ["26"]),
  child("landscape-restoration", "Восстановление и озеленение территории", ["27"]),
  child("road-quality-control", "Лабораторный и исполнительный контроль дороги", ["28"]),
  child("road-handover-documents", "Исполнительная документация дорожного объекта", ["29"]),
  {
    ownerId: "road-project-resource:site-logistics:v1",
    ownerClass: "PROJECT_LEVEL_RESOURCE",
    passportVersion: "1.0.0",
    professionalName: "Объектовая логистика дорожного строительства",
    wbsIds: ["30"],
    formulaGraphId: "road-formula-graph:site-logistics:v1",
    sourceRegistryVersion: "road-source-registry:v1",
  },
] as const;

const OWNER_BY_WBS = new Map(
  ROAD_COMPOSITE_OWNERS_V4.flatMap((owner) => owner.wbsIds.map((wbsId) => [wbsId, owner] as const)),
);

export function roadCompositeOwnerForWbsV4(wbsId: string): RoadCompositeOwnerV4 {
  return OWNER_BY_WBS.get(wbsId) ?? {
    ownerId: `road-passport-gap:wbs-${wbsId}:v1`,
    ownerClass: "PASSPORT_GAP",
    passportVersion: "1.0.0",
    professionalName: `Неразрешённый владелец WBS ${wbsId}`,
    wbsIds: [wbsId],
    formulaGraphId: `road-formula-gap:wbs-${wbsId}:v1`,
    sourceRegistryVersion: "road-source-registry:v1",
  };
}
