import { normalizeDimensionText, resolveQuantityInputsFromPrompt } from "../constructionFormulas";
import { resolveEstimatorDomainSignature } from "./constructionDomainLexicon";

const estimateTokens = /(смет|расчет|расч[её]т|стоим|сколько стоит|хочу|нужно|надо|требуется|estimate|boq|cost|quote)/i;
const operationTokens = /(установ|монтаж|смонт|залив|залить|устройств|уклад|улож|настил|электромонтаж|бурен|гидроизоляц|дренаж|пнр|пусконалад|наладк|мониторинг|обследован|диагностик|обеззаражив|очистк|install|installation|pour|drainage|wiring|electrical|electric|commissioning|monitoring|survey)/i;
const objectTokens = /(лифт|elevator|дренаж|drainage|канал|channel|лотк|тумб|пьедестал|pedestal|бетон|concrete|стяжк|электр|навес|турбин|гэс|вентиляц|скважин|солнеч|панел|кровл|крыша|брусчат|тротуарн|мощен|линолеум|ламинат|плитк|керамогранит|гкл|гипсокартон|покраск|окраск|штукатур|потол|двер|окн|фасад|утеплен|кирпич|кладк|фундамент|котлован|транше|асфальт|металлоконструк|забор|демонтаж|снос|сантех|водопровод|отоплен|кондиционер|слаботоч|пожарн|пожаротуш|охран|видеонаблюд|газ|котел|кран|лестниц|подпорн|газон|полив|кухн|ванн|сануз|итп|цод|серверн|bms|датчик|дозир|реагент|станц|биологическ|уф|ультрафиолет|тепловиз|термограф|foundation|canopy|hydro|ventilation|well|solar|construction work|flooring|paving|roofing|waterproofing|masonry|asphalt|drywall|tiling|painting|plumbing|demolition|fencing|sewerage|hvac|fire alarm|low voltage|doors|windows|ceilings|facade|insulation|earthworks|landscaping|heating|boiler|crane|escalator|restoration|carpentry)/i;

const industrialFloorTokens = /промышленн[а-яё]*\s+пол|бетонн[а-яё]*\s+пол|топпинг|industrial\s+floor/i;

export function isParsableConstructionWork(text: string): boolean {
  const normalized = normalizeDimensionText(text);
  const quantities = resolveQuantityInputsFromPrompt(text);
  const hasQuantity =
    quantities.areaM2 !== undefined ||
    quantities.lengthM !== undefined ||
    quantities.volumeM3 !== undefined ||
    quantities.count !== undefined ||
    quantities.powerKw !== undefined ||
    quantities.massTon !== undefined ||
    quantities.floorCount !== undefined ||
    (quantities.widthM !== undefined && quantities.heightM !== undefined);
  const domainSignature = resolveEstimatorDomainSignature(text);
  const semanticObjectDetected =
    industrialFloorTokens.test(normalized) ||
    objectTokens.test(normalized) ||
    domainSignature !== null;
  const estimateIntentDetected = estimateTokens.test(normalized);
  const constructionWorkWithoutExplicitEstimateWord = operationTokens.test(normalized) && semanticObjectDetected;
  const measuredKnownWorkWithoutVerb = domainSignature !== null && semanticObjectDetected && hasQuantity;
  return (
    estimateIntentDetected ||
    constructionWorkWithoutExplicitEstimateWord ||
    measuredKnownWorkWithoutVerb
  ) && (operationTokens.test(normalized) || semanticObjectDetected) && hasQuantity;
}

export function estimateIntentTokenDetected(text: string): boolean {
  return estimateTokens.test(normalizeDimensionText(text));
}
