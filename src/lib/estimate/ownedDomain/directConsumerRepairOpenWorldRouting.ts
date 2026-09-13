/** Estimate-domain owner selected before the consumer-repair presentation adapter runs. */
export type DirectConsumerRepairOpenWorldOwner =
  | "carpentry"
  | "electrical"
  | "facade"
  | "fire_safety"
  | "formwork"
  | "insulation"
  | "low_voltage"
  | "metalwork"
  | "reinforcement"
  | "sewerage"
  | "services"
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
