import { canonicalPublicEstimateChoiceLabelRu, canonicalPublicEstimateRowNameRu, canonicalPublicEstimateRowDetailsRu } from './canonicalPublicEstimateLanguageRu';

/** An authored display projection of a saved resource. It changes no identity,
 * specification, quantity, price or owner and never guesses a generic name. */
export type CanonicalPublicResourcePresentationV1 = Readonly<{
  contractVersion: 'canonical-public-resource-presentation/v1';
  sourceTitleRu: string;
  nameRu: string;
  brandAndModelRu: string | null;
  specificationRu: string | null;
  detailsRu: readonly string[];
}>;

export function parseCanonicalPublicResourcePresentationV1(value: unknown): CanonicalPublicResourcePresentationV1 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const allowed = ['contractVersion', 'sourceTitleRu', 'nameRu', 'brandAndModelRu', 'specificationRu', 'detailsRu'];
  const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  if (Object.keys(candidate).length !== allowed.length || Object.keys(candidate).some(key => !allowed.includes(key))
    || candidate.contractVersion !== 'canonical-public-resource-presentation/v1'
    || !text(candidate.sourceTitleRu, 2000) || !text(candidate.nameRu, 180) || !/[А-Яа-яЁё]/u.test(candidate.nameRu)
    || (candidate.brandAndModelRu !== null && !text(candidate.brandAndModelRu, 300))
    || (candidate.specificationRu !== null && !text(candidate.specificationRu, 500))
    || !Array.isArray(candidate.detailsRu) || candidate.detailsRu.length > 16
    || candidate.detailsRu.some(detail => !text(detail, 1000))) return null;
  return candidate as CanonicalPublicResourcePresentationV1;
}

export function canonicalPublicResourcePresentationV1(input: {
  titleRu: string; descriptor: unknown; manualTitleOverride?: boolean;
}): CanonicalPublicResourcePresentationV1 | null {
  if (input.manualTitleOverride) return null;
  const presentation = parseCanonicalPublicResourcePresentationV1(input.descriptor);
  // Exact source identity protects manual names, replaced products and selected
  // specifications. A stale mapping remains a full source title, never an alias.
  return presentation?.sourceTitleRu === input.titleRu ? presentation : null;
}

/** Brand-free display is separate from authored identity validation and saved
 * title binding, so public wording never rewrites the source descriptor. */
export function canonicalPublicResourceDisplayPresentationV1(input: Parameters<typeof canonicalPublicResourcePresentationV1>[0] & { rowId?: string }): CanonicalPublicResourcePresentationV1 | null {
  if (input.manualTitleOverride) return null;
  // A complete authored binding is an independent display authority for an
  // exact saved row. Never repair or borrow a malformed source descriptor.
  if (input.descriptor != null && !parseCanonicalPublicResourcePresentationV1(input.descriptor)) return null;
  const presentation = canonicalPublicResourcePresentationV1(input);
  const details = canonicalPublicEstimateRowDetailsRu({ rowId: input.rowId, titleRu: input.titleRu });
  if (!presentation) return details.length ? {
    contractVersion: 'canonical-public-resource-presentation/v1', sourceTitleRu: input.titleRu,
    nameRu: canonicalPublicEstimateRowNameRu({ rowId: input.rowId, titleRu: input.titleRu }),
    brandAndModelRu: null, specificationRu: null, detailsRu: details,
  } : null;
  return { ...presentation, nameRu: canonicalPublicEstimateRowNameRu({ rowId: input.rowId,
    sourceTitleRu: input.titleRu, titleRu: presentation.nameRu }), brandAndModelRu: null,
    specificationRu: presentation.specificationRu == null ? null : canonicalPublicEstimateChoiceLabelRu(presentation.specificationRu),
    detailsRu: [...new Set([...presentation.detailsRu, ...details].map(canonicalPublicEstimateChoiceLabelRu).filter(Boolean))] };
}

export function canonicalPublicResourcePresentationMatchesV1(actual: unknown, expected: unknown): boolean {
  if (actual == null && expected == null) return true;
  const a = parseCanonicalPublicResourcePresentationV1(actual), b = parseCanonicalPublicResourcePresentationV1(expected);
  return Boolean(a && b && a.sourceTitleRu === b.sourceTitleRu && a.nameRu === b.nameRu
    && a.brandAndModelRu === b.brandAndModelRu && a.specificationRu === b.specificationRu && a.detailsRu.length === b.detailsRu.length
    && a.detailsRu.every((detail, index) => detail === b.detailsRu[index]));
}

export function bindCanonicalPublicResourceSavedTitleV1(input: {
  graph: Record<string, unknown>; sourceTitleRu: string; savedTitleRu: string;
  appendedSpecificationRu: string | null; manualTitleOverride: boolean;
}): Record<string, unknown> {
  const presentation = canonicalPublicResourcePresentationV1({ titleRu: input.sourceTitleRu,
    descriptor: input.graph.publicResourcePresentationV1, manualTitleOverride: input.manualTitleOverride });
  if (!presentation || input.savedTitleRu === input.sourceTitleRu) return input.graph;
  if (!input.appendedSpecificationRu) return input.graph; // REPLACE remains the selected specification.
  return { ...input.graph, publicResourcePresentationV1: { ...presentation, sourceTitleRu: input.savedTitleRu,
    specificationRu: input.appendedSpecificationRu } };
}
