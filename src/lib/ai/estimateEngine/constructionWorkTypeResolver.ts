import { normalizeAiQuestionText } from "./estimateIntentResolver";
import type { ConstructionWorkType } from "./estimateTypes";

export function resolveConstructionWorkType(questionRu: string): ConstructionWorkType {
  const question = normalizeAiQuestionText(questionRu);

  if (/инженерн.*доск/.test(question)) return "engineered_flooring";
  if (/паркет/.test(question)) return "parquet_flooring";
  if (/ламинат/.test(question)) return "laminate_flooring";
  if (/плитк/.test(question)) return "tile_flooring";
  if (/линолеум|винил/.test(question)) return "vinyl_flooring";
  if (/асфальт/.test(question)) return "asphalt_paving";
  if (/штукатур/.test(question)) return "plastering";
  if (/гидроизоляц/.test(question)) return "waterproofing";
  if (/гкл|гипсокартон/.test(question)) return "drywall_partitions";
  if (/двер/.test(question)) return "doors_installation";
  if (/окн/.test(question)) return "windows_installation";
  if (/бетон|стяжк/.test(question)) return "concrete_screed";
  if (/покраск|краск/.test(question)) return "painting";

  return "unknown";
}

export function getConstructionWorkTypeLabelRu(workType: ConstructionWorkType): string {
  switch (workType) {
    case "parquet_flooring":
      return "укладка паркета";
    case "laminate_flooring":
      return "укладка ламината";
    case "engineered_flooring":
      return "укладка инженерной доски";
    case "tile_flooring":
      return "укладка плитки";
    case "vinyl_flooring":
      return "укладка линолеума / винилового покрытия";
    case "asphalt_paving":
      return "асфальтирование";
    case "plastering":
      return "штукатурные работы";
    case "drywall_partitions":
      return "перегородки из ГКЛ";
    case "painting":
      return "покраска";
    case "doors_installation":
      return "установка дверей";
    case "windows_installation":
      return "установка окон";
    case "waterproofing":
      return "гидроизоляция";
    case "concrete_screed":
      return "бетонная стяжка";
    default:
      return "работа";
  }
}
