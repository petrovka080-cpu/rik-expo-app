import type {
  ConstructionWorkAlias,
  ConstructionWorkCatalogLink,
  ConstructionWorkDefinition,
  ConstructionWorkRecipeRow,
} from "./constructionWorkTypes";

export type ConstructionWorkReadModel = {
  workKey: string;
  domainKey: string;
  title: string;
  defaultUnit: string;
  measurementKind: string;
  aliases: string[];
  catalogLinkCount: number;
  recipeRowCount: number;
};

export function buildConstructionWorkReadModel(params: {
  work: ConstructionWorkDefinition;
  aliases?: ConstructionWorkAlias[];
  catalogLinks?: ConstructionWorkCatalogLink[];
  recipeRows?: ConstructionWorkRecipeRow[];
}): ConstructionWorkReadModel {
  return {
    workKey: params.work.work_key,
    domainKey: params.work.domain_key,
    title: params.work.title_ru,
    defaultUnit: params.work.default_unit,
    measurementKind: params.work.measurement_kind,
    aliases: (params.aliases ?? []).map((alias) => alias.alias_text),
    catalogLinkCount: (params.catalogLinks ?? []).length,
    recipeRowCount: (params.recipeRows ?? []).length,
  };
}
