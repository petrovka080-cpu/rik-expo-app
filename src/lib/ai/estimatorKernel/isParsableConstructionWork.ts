import { normalizeDimensionText, resolveQuantityInputsFromPrompt } from "../constructionFormulas";
import { resolveEstimatorDomainSignature } from "./constructionDomainLexicon";

const estimateTokens = /(смет|расчет|расч[её]т|стоим|сколько стоит|хочу|нужно|надо|требуется|estimate|boq|cost|quote)/i;
const operationTokens = /(установ|монтаж|смонт|залив|залить|устройств|уклад|улож|настил|электромонтаж|бурен|гидроизоляц|дренаж|вентиляц|кондиционир|install|installation|pour|drainage|wiring|electrical|electric)/i;
const objectTokens = /(лифт|elevator|дренаж|drainage|канал|channel|лотк|тумб|пьедестал|постамент|опор|основан|стакан|pedestal|postament|equipment\s+base|бетон|concrete|электр|навес|турбин|гэс|вентиляц|кондицион|сплит|мультисплит|vrf|vrv|чиллер|фанкойл|скважин|солнеч|панел|кровл|крыша|брусчат|тротуарн|мощен|линолеум|ламинат|плитк|керамогранит|гкл|гипсокартон|покраск|окраск|штукатур|потол|двер|окн|фасад|утеплен|кирпич|кладк|фундамент|котлован|транше|асфальт|металлоконструк|забор|демонтаж|снос|сантех|водопровод|отоплен|кондиционер|слаботоч|пожарн|охран|видеонаблюд|газ|котел|кран|лестниц|подпорн|газон|полив|кухн|ванн|сануз|foundation|canopy|hydro|ventilation|well|solar|construction work|flooring|paving|roofing|waterproofing|masonry|asphalt|drywall|tiling|painting|plumbing|demolition|fencing|sewerage|hvac|fire alarm|low voltage|doors|windows|ceilings|facade|insulation|earthworks|landscaping|heating|boiler|crane|escalator|restoration|carpentry)/i;

const industrialFloorTokens = /промышленн[а-яё]*\s+пол|бетонн[а-яё]*\s+пол|топпинг|industrial\s+floor/i;
const concretePedestalObjectTokens = /(тумб|пьедестал|постамент|стакан|опор[ауы]?\s+под|основан[а-яё]*\s+под\s+(оборуд|станк|стойк|колонн|навес)|equipment\s+base|pedestal|postament)/i;
const concreteSurfaceTokens = /(плит[ауы]?|стяжк|пол\s+по\s+грунт|отмостк|ростверк|ленточн[а-яё]*\s+фундамент|strip\s+foundation|slab|screed)/i;

export function isParsableConstructionWork(text: string): boolean {
  const normalized = normalizeDimensionText(text);
  const quantities = resolveQuantityInputsFromPrompt(text);
  const hasQuantity =
    quantities.areaM2 !== undefined ||
    quantities.lengthM !== undefined ||
    quantities.count !== undefined ||
    quantities.powerKw !== undefined ||
    quantities.floorCount !== undefined ||
    (quantities.widthM !== undefined && quantities.heightM !== undefined);
  const semanticObjectDetected =
    industrialFloorTokens.test(normalized) ||
    objectTokens.test(normalized) ||
    resolveEstimatorDomainSignature(text) !== null;
  const concretePedestalWithCount =
    quantities.count !== undefined &&
    concretePedestalObjectTokens.test(normalized) &&
    !concreteSurfaceTokens.test(normalized);
  const estimateIntentDetected = estimateTokens.test(normalized);
  const constructionWorkWithoutExplicitEstimateWord = operationTokens.test(normalized) && semanticObjectDetected;
  return concretePedestalWithCount || ((estimateIntentDetected || constructionWorkWithoutExplicitEstimateWord) && (operationTokens.test(normalized) || semanticObjectDetected) && hasQuantity);
}

export function estimateIntentTokenDetected(text: string): boolean {
  return estimateTokens.test(normalizeDimensionText(text));
}
