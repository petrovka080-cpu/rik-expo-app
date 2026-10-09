export type CanonicalLanternKind = 'LIGHTING' | 'ROOF_WINDOW';
export const CANONICAL_LANTERN_KIND_CHOICES = [
  { kind: 'LIGHTING' as const, labelRu: 'Светильники с лампами' },
  { kind: 'ROOF_WINDOW' as const, labelRu: 'Окна в крыше' },
];
const lanternWord = /(?:^|[^\p{L}])фонар\p{L}*/iu;

export function canonicalLanternIntent(value: string): { kind: CanonicalLanternKind | null; ambiguous: boolean } {
  const chosen = value.match(/(?:^|\n)Выбрано:\s*(Светильники с лампами|Окна в крыше)\s*$/iu)?.[1];
  if (chosen) return { kind: /светильники/iu.test(chosen) ? 'LIGHTING' : 'ROOF_WINDOW', ambiguous: false };
  const lighting = /светильник|ламп|освещени|светодиод/iu.test(value);
  const roof = /(?:окн\p{L}*[^\n]{0,50}крыш|кровельн\p{L}*\s+(?:светов\p{L}*\s+)?фонар|зенитн\p{L}*\s+фонар)/iu.test(value);
  const hasLantern = lanternWord.test(value);
  return { kind: lighting !== roof ? lighting ? 'LIGHTING' : 'ROOF_WINDOW' : null,
    ambiguous: hasLantern && lighting === roof };
}

export function selectCanonicalLanternKindText(originalText: string, kind: CanonicalLanternKind): string {
  const original = originalText.replace(/\nВыбрано:\s*(?:Светильники с лампами|Окна в крыше)\s*$/iu, '').trim();
  const label = CANONICAL_LANTERN_KIND_CHOICES.find(choice => choice.kind === kind)!.labelRu;
  return `${original}\nВыбрано: ${label}`;
}

/** Search clarification only; the original request remains the source of
 * measurements. No catalog ID, product, brand or norm is selected here. */
export function canonicalLanternSearchText(value: string): string {
  const intent = canonicalLanternIntent(value);
  const original = value.replace(/\nВыбрано:\s*(?:Светильники с лампами|Окна в крыше)\s*$/iu, '').trim();
  if (!intent.kind) return original;
  if (intent.kind === 'ROOF_WINDOW') {
    if (/(?:кровельн|зенитн)\p{L}*\s+(?:светов\p{L}*\s+)?фонар/iu.test(original)) return original;
    const roofWindowText = original.replace(/окн\p{L}*\s+(?:в|на|для)\s+крыш\p{L}*/giu, 'кровельные световые фонари');
    if (roofWindowText !== original) return roofWindowText;
  }
  if (!lanternWord.test(original)) return original;
  return original.replace(/фонар\p{L}*/giu, intent.kind === 'LIGHTING' ? 'светильники' : 'кровельные световые фонари');
}
