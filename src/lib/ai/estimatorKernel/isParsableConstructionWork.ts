import { normalizeDimensionText, resolveQuantityInputsFromPrompt } from "../constructionFormulas";

const estimateTokens = /(смет|расчет|расч[её]т|стоим|сколько стоит|estimate|boq|cost|quote)/i;
const operationTokens = /(установ|монтаж|смонт|залив|залить|устройств|уклад|электромонтаж|бурен|гидроизоляц|дренаж|install|installation|pour|drainage|wiring|electrical|electric)/i;
const objectTokens = /(лифт|elevator|дренаж|drainage|канал|channel|лотк|тумб|пьедестал|pedestal|бетон|concrete|электр|навес|турбин|гэс|вентиляц|скважин|солнеч|панел|кровл|крыша|брусчат|линолеум|foundation|canopy|hydro|ventilation|well|solar|construction work|flooring|paving|roofing|waterproofing|masonry|asphalt|drywall|tiling|painting|plumbing|demolition|fencing|sewerage|hvac|fire alarm|low voltage|doors|windows|ceilings|facade|insulation|earthworks|landscaping|heating|boiler|crane|escalator|restoration|carpentry)/i;

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
  return estimateTokens.test(normalized) && (operationTokens.test(normalized) || objectTokens.test(normalized)) && hasQuantity;
}

export function estimateIntentTokenDetected(text: string): boolean {
  return estimateTokens.test(normalizeDimensionText(text));
}
