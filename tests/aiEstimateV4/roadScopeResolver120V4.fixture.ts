import type { RoadScopeIdV4, RoadScopeResolverStatusV4 } from "../../src/lib/estimate/v4/asphalt";

export type RoadResolverFixtureV4 = {
  id: string;
  text: string;
  status: RoadScopeResolverStatusV4;
  scope: RoadScopeIdV4 | null;
  group: "explicit" | "ambiguous" | "negation" | "collision" | "kyrgyz" | "mixed";
};

const explicitSeeds: Array<[RoadScopeIdV4, string]> = [
  ["ROAD_SURFACING_ONLY", "Уложить асфальт по готовому щебёночному основанию"],
  ["FULL_PAVEMENT_STRUCTURE", "Построить дорожную одежду с подготовкой грунта и щебёночным основанием"],
  ["FULL_ROAD_INFRASTRUCTURE", "Полное строительство дороги с водоотводом и освещением"],
  ["ROAD_REPAIR_REHABILITATION", "Фрезерование старого покрытия и ремонт дороги"],
];

export const ROAD_SCOPE_RESOLVER_FIXTURES_120_V4: RoadResolverFixtureV4[] = [
  ...explicitSeeds.flatMap(([scope, text], scopeIndex) =>
    Array.from({ length: 12 }, (_, index) => ({
      id: `explicit-${scopeIndex + 1}-${index + 1}`,
      text: `${text}, участок ${index + 1}`,
      status: "RESOLVED" as const,
      scope,
      group: "explicit" as const,
    }))),
  ...Array.from({ length: 24 }, (_, index) => ({
    id: `ambiguous-${index + 1}`,
    text: `Асфальтировать дорогу длиной ${100 + index} метров`,
    status: "NEEDS_SCOPE_SELECTION" as const,
    scope: null,
    group: "ambiguous" as const,
  })),
  ...Array.from({ length: 16 }, (_, index) => ({
    id: `negation-${index + 1}`,
    text: `Не нужна полная дорога, только верхний слой асфальта, участок ${index + 1}`,
    status: "RESOLVED" as const,
    scope: "ROAD_SURFACING_ONLY" as const,
    group: "negation" as const,
  })),
  ...Array.from({ length: 16 }, (_, index) => ({
    id: `collision-${index + 1}`,
    text: `Дорожный объект и площадка ${index + 1}, требуется определить состав работ`,
    status: "NEEDS_SCOPE_SELECTION" as const,
    scope: null,
    group: "collision" as const,
  })),
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `kyrgyz-${index + 1}`,
    text: `Даяр шагыл негизге асфальттоо керек, тилке ${index + 1}`,
    status: "RESOLVED" as const,
    scope: "ROAD_SURFACING_ONLY" as const,
    group: "kyrgyz" as const,
  })),
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `mixed-${index + 1}`,
    text: `Даяр негиз, только асфальт, участок ${index + 1}`,
    status: "RESOLVED" as const,
    scope: "ROAD_SURFACING_ONLY" as const,
    group: "mixed" as const,
  })),
];
