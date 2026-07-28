export type DirectConsumerRepairOpenWorldOwner =
  | "electrical"
  | "roof_waterproofing";

const DIRECT_ELECTRICAL_RE =
  /(?:\u044d\u043b\u0435\u043a\u0442\u0440|\u043a\u0430\u0431\u0435\u043b|\u0440\u043e\u0437\u0435\u0442|\u0432\u044b\u043a\u043b\u044e\u0447\u0430\u0442|electrical|wiring|cable|socket|outlet|switch)/iu;
const DIRECT_ROOF_RE =
  /(?:\u043a\u0440\u043e\u0432\u043b|\u043a\u0440\u044b\u0448|roof)/iu;
const DIRECT_WATERPROOFING_RE =
  /(?:\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446|waterproof)/iu;

export function resolveDirectConsumerRepairOpenWorldOwner(
  prompt: string,
): DirectConsumerRepairOpenWorldOwner | null {
  if (DIRECT_ELECTRICAL_RE.test(prompt)) return "electrical";
  if (DIRECT_ROOF_RE.test(prompt) && DIRECT_WATERPROOFING_RE.test(prompt)) {
    return "roof_waterproofing";
  }
  return null;
}

export function shouldUseDirectConsumerRepairOpenWorldDraft(
  prompt: string,
): boolean {
  return resolveDirectConsumerRepairOpenWorldOwner(prompt) !== null;
}
