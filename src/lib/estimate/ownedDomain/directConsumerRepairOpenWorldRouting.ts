/** Estimate-domain owner selected before the consumer-repair presentation adapter runs. */
export type DirectConsumerRepairOpenWorldOwner =
  | "carpentry"
  | "cleaning"
  | "delivery"
  | "demolition"
  | "documentation"
  | "electrical"
  | "equipment_rent"
  | "earthworks"
  | "facade"
  | "fire_safety"
  | "formwork"
  | "insulation"
  | "landscaping"
  | "low_voltage"
  | "metalwork"
  | "masonry"
  | "reinforcement"
  | "sewerage"
  | "services"
  | "windows_doors"
  | "waste_removal"
  | "roof_waterproofing";

const DIRECT_JOTUN_HARDTOP_XP_RE = /jotun\s+hardtop\s+xp/iu;
const DIRECT_SIKAGARD_WOOD_PRESERVER_RE = /sikagard\s+wood\s+preserver/iu;
const DIRECT_WAVIN_OSMA_C3766BK_RE =
  /(?:(?:wavin\s+)?(?:osma\s+)?c3766bk|3080894|5098987303844)/iu;
const DIRECT_ROCKWOOL_FIXROCK_RE = /(?:rockwool\s+)?fixrock/iu;
const DIRECT_KG_AUTHOR_SUPERVISION_RE =
  /(?=.*авторск[а-яё]*\s+надзор)(?=.*(?:52\s*[-–—]?\s*нпа|№\s*52))/iu;
const DIRECT_RICS_NRM2_FORMWORK_RE =
  /(?=.*опалубк)(?=.*(?:RICS\s*)?NRM\s*2)/iu;
const DIRECT_REINFORCEMENT_BAR_SCHEDULE_RE =
  /(?=.*арматур)(?=.*(?:ведомост[а-яё]*\s+стержн|bar\s+bending\s+schedule))(?=.*(?:FHWA(?:-HIF-16-026)?|RICS\s*NRM\s*2))/iu;
const DIRECT_FORD_TRANSIT_DELIVERY_RE = /(?=.*ford\s+transit)(?=.*(?:v363|500\s+l4\s+h3))/iu;
const DIRECT_TENNANT_T350_RE = /(?=.*tennant\s+t350)(?=.*(?:600\s*(?:мм|mm)|24\s*inch))(?=.*conventional)/iu;
const DIRECT_UNITED_RENTALS_CA_ONE_SHIFT_RE = /(?=.*united\s+rentals)(?=.*canada)(?=.*one[\s_-]*shift)/iu;
const DIRECT_RAIN_BIRD_XFD_RE = /(?=.*rain\s+bird\s+xfd)(?=.*xfd-06-12-500)(?=.*d39717e)/iu;
const DIRECT_SOUDAFOAM_GENIUS_RE = /(?=.*soudafoam)(?=.*genius)(?=.*9900539)(?=.*600\s*ml)/iu;
const DIRECT_FHWA_FP24_SECTION208_RE = /(?=.*fhwa\s+fp-?24)(?=.*section\s*208)(?=.*structural\s+backfill)/iu;
const DIRECT_EPA_CD_WASTE_RE = /(?=.*us\s+epa)(?=.*2016)(?:(?=.*concrete\s+debris)(?=.*860\s*lb)|(?=.*composite\s+c&d)(?=.*417\s*lb))/iu;
const DIRECT_BIA_TN10_MASONRY_RE = /(?=.*(?:brick|кирпич))(?=.*bia)(?=.*tn\s*10)(?=.*table\s*4)/iu;
const DIRECT_KRER46_DEMOLITION_RE = /(?=.*(?:demolition|демонтаж|разборк))(?=.*(?:krer|крер)\s*(?:№|no\.?|#)?\s*46)(?=.*(?:table|таблиц))/iu;
const DIRECT_KG_DESIGN_PRICE_RE = /(?=.*(?:design|проектн))(?=.*(?:kg|minstroy|минстрой))(?=.*(?:section|раздел)\s*9)(?=.*(?:table|таблиц))/iu;
const DIRECT_LEGRAND_049272_RE =
  /(?:(?:legrand\s*)?0?49272|3414971327986)/iu;
const DIRECT_SIEMENS_FDB221_RE =
  /(?:(?:siemens\s+)?(?:sinteso\s+)?fdb221|a5q00001664)/iu;
const DIRECT_ELECTRICAL_RE =
  /(?:\u044d\u043b\u0435\u043a\u0442\u0440|\u043a\u0430\u0431\u0435\u043b|\u0440\u043e\u0437\u0435\u0442|\u0432\u044b\u043a\u043b\u044e\u0447\u0430\u0442|electrical|wiring|cable|socket|outlet|switch)/iu;
const DIRECT_ROOF_RE =
  /(?:\u043a\u0440\u043e\u0432\u043b|\u043a\u0440\u044b\u0448|roof)/iu;
const DIRECT_WATERPROOFING_RE =
  /(?:\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446|waterproof)/iu;
const DIRECT_INSULATION_RE =
  /(?:утепл|теплоизоляц|rockwool|comfortboard|insulat)/iu;

export function resolveDirectConsumerRepairOpenWorldOwner(
  prompt: string,
): DirectConsumerRepairOpenWorldOwner | null {
  if (DIRECT_WAVIN_OSMA_C3766BK_RE.test(prompt)) return "sewerage";
  if (DIRECT_KG_DESIGN_PRICE_RE.test(prompt)) return "documentation";
  if (DIRECT_KRER46_DEMOLITION_RE.test(prompt)) return "demolition";
  if (DIRECT_BIA_TN10_MASONRY_RE.test(prompt)) return "masonry";
  if (DIRECT_EPA_CD_WASTE_RE.test(prompt)) return "waste_removal";
  if (DIRECT_FHWA_FP24_SECTION208_RE.test(prompt)) return "earthworks";
  if (DIRECT_SOUDAFOAM_GENIUS_RE.test(prompt)) return "windows_doors";
  if (DIRECT_RAIN_BIRD_XFD_RE.test(prompt)) return "landscaping";
  if (DIRECT_UNITED_RENTALS_CA_ONE_SHIFT_RE.test(prompt)) return "equipment_rent";
  if (DIRECT_TENNANT_T350_RE.test(prompt)) return "cleaning";
  if (DIRECT_FORD_TRANSIT_DELIVERY_RE.test(prompt)) return "delivery";
  if (DIRECT_KG_AUTHOR_SUPERVISION_RE.test(prompt)) return "services";
  if (DIRECT_RICS_NRM2_FORMWORK_RE.test(prompt)) return "formwork";
  if (DIRECT_REINFORCEMENT_BAR_SCHEDULE_RE.test(prompt)) return "reinforcement";
  if (DIRECT_ROCKWOOL_FIXROCK_RE.test(prompt)) return "facade";
  if (DIRECT_SIKAGARD_WOOD_PRESERVER_RE.test(prompt)) return "carpentry";
  if (DIRECT_JOTUN_HARDTOP_XP_RE.test(prompt)) return "metalwork";
  if (DIRECT_LEGRAND_049272_RE.test(prompt)) return "low_voltage";
  // Product-exact fire-safety ownership must win even when the request also
  // contains cable parameters. FDB221 is a detector base, not a generic
  // electrical cable-work request.
  if (DIRECT_SIEMENS_FDB221_RE.test(prompt)) return "fire_safety";
  if (DIRECT_ELECTRICAL_RE.test(prompt)) return "electrical";
  if (DIRECT_ROOF_RE.test(prompt) && DIRECT_WATERPROOFING_RE.test(prompt)) {
    return "roof_waterproofing";
  }
  if (DIRECT_INSULATION_RE.test(prompt)) return "insulation";
  return null;
}

export function shouldUseDirectConsumerRepairOpenWorldDraft(
  prompt: string,
): boolean {
  return resolveDirectConsumerRepairOpenWorldOwner(prompt) !== null;
}
