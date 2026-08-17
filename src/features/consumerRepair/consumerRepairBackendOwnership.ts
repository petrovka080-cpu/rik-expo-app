import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests";

export type ConsumerRepairCanonicalBackendBinding = {
  revisionId: string;
  releaseId: string;
};

function bindingFromItem(
  item: ConsumerRepairDraftBundle["items"][number] | undefined,
): ConsumerRepairCanonicalBackendBinding | null {
  const revisionId = String(item?.sourceParameters?.canonicalBackendRevisionId ?? "").trim();
  const releaseId = String(item?.sourceParameters?.canonicalBackendReleaseId ?? "").trim();
  return revisionId && releaseId ? { revisionId, releaseId } : null;
}

function bindingFromHistory(
  bundle: ConsumerRepairDraftBundle | null,
): ConsumerRepairCanonicalBackendBinding | null {
  const revisionId = String(bundle?.durableHistorySummary?.sourceRevisionId ?? "").trim();
  const releaseId = String(bundle?.durableHistorySummary?.sourceReleaseId ?? "").trim();
  return revisionId && releaseId ? { revisionId, releaseId } : null;
}

export function primaryConsumerRepairCanonicalBackendBinding(
  bundle: ConsumerRepairDraftBundle,
): ConsumerRepairCanonicalBackendBinding | null {
  return bindingFromItem(bundle.items[0]) ?? bindingFromHistory(bundle);
}

export function consumerRepairCanonicalBackendBinding(
  bundle: ConsumerRepairDraftBundle | null,
): ConsumerRepairCanonicalBackendBinding | null {
  for (const item of bundle?.items ?? []) {
    const binding = bindingFromItem(item);
    if (binding) return binding;
  }
  return bindingFromHistory(bundle);
}

export function consumerRepairRevisionUsesGenericFallback(
  revision: {
    boq: {
      rows: readonly {
        sourceParameters?: Readonly<Record<string, unknown>> | null;
      }[];
    };
  } | null,
): boolean {
  return Boolean(revision?.boq.rows.some((row) =>
    row.sourceParameters?.exactSelectionGenericFallbackUsed === true
  ));
}
