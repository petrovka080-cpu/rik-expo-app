import type { S2BDomainPack, S2BWave2Kind } from "../types";

export const S2B_ROADS_DOMAIN_PACKS: Pick<Record<S2BWave2Kind, S2BDomainPack>, "road"> = {
  road: {
    prefix: "s2b_road",
    workUnit: "m2",
    components: [
      { code: "geodesy", titleRu: "геодезия и разбивка дорожной оси", materialUnit: "set", materialKey: "road_geodesy_consumables" },
      { code: "milling", titleRu: "фрезерование или снятие существующего слоя", materialUnit: "m3", materialKey: "milled_asphalt_handling" },
      { code: "subgrade", titleRu: "подготовка земляного полотна", materialUnit: "m3", materialKey: "subgrade_improvement" },
      { code: "geotextile", titleRu: "разделительный геотекстиль", materialUnit: "m2", materialKey: "road_geotextile" },
      { code: "sand_layer", titleRu: "песчаный подстилающий слой", materialUnit: "m3", materialKey: "road_sand" },
      { code: "crushed_lower", titleRu: "нижний щебёночный слой по фракции", materialUnit: "m3", materialKey: "crushed_stone_lower" },
      { code: "crushed_upper", titleRu: "верхний щебёночный слой и расклинцовка", materialUnit: "m3", materialKey: "crushed_stone_upper" },
      { code: "bitumen_emulsion", titleRu: "битумная эмульсия между слоями", materialUnit: "l", materialKey: "bitumen_emulsion" },
      { code: "asphalt_lower", titleRu: "нижний слой асфальтобетона", materialUnit: "t", materialKey: "asphalt_lower_mix" },
      { code: "asphalt_upper", titleRu: "верхний слой асфальтобетона", materialUnit: "t", materialKey: "asphalt_upper_mix" },
      { code: "curb_drainage", titleRu: "бордюры и ливневой водоотвод", materialUnit: "m", materialKey: "road_curb_drainage" },
      { code: "laboratory_marking", titleRu: "лабораторный контроль и разметка", materialUnit: "set", materialKey: "road_lab_marking" },
    ],
  },
};
