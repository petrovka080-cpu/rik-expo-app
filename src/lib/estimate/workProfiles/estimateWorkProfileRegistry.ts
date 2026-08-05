export type EstimateReferenceReadiness = {
  catalogMapped: "PROVEN" | "NOT_PROVEN";
  runtimeCompilable: "PROVEN" | "NOT_PROVEN";
  formulaInvariant: "PROVEN" | "NOT_PROVEN";
  normativeVerified: "PROVEN" | "PARTIAL_REVIEW_REQUIRED" | "NOT_PROVEN";
  priceCovered: "PROVEN" | "PARTIAL" | "NOT_COVERED";
  referenceAccepted: "QUANTITY_REFERENCE_ACCEPTED" | "PENDING" | "REJECTED";
};

export type EstimateScopePresetRegistration = {
  scopePresetId: string;
  labelRu: string;
  calculationStrategyId: string;
  parameterSchemaVersion: string;
  engineVersion: string;
  requiredParameterAlternatives: readonly {
    alternativeId: string;
    parameterKeys: readonly string[];
  }[];
};

export type EstimateWorkProfileRegistration = {
  registrationVersion: string;
  workPassportId: string;
  canonicalWorkKey: string;
  catalogWorkIds: readonly string[];
  scopePresets: readonly EstimateScopePresetRegistration[];
  formulaGraphVersion: string;
  readiness: EstimateReferenceReadiness;
};

export type EstimateWorkProfileRegistry = {
  registrations: readonly EstimateWorkProfileRegistration[];
  getByCatalogWorkId(catalogWorkId: string): EstimateWorkProfileRegistration | null;
  getByCanonicalWorkKey(canonicalWorkKey: string): EstimateWorkProfileRegistration | null;
  getScopePreset(
    canonicalWorkKey: string,
    scopePresetId: string,
  ): EstimateScopePresetRegistration | null;
};

function normalized(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ru-RU");
}

function cloneRegistration(
  registration: EstimateWorkProfileRegistration,
): EstimateWorkProfileRegistration {
  return Object.freeze({
    ...registration,
    catalogWorkIds: Object.freeze([...registration.catalogWorkIds]),
    scopePresets: Object.freeze(
      registration.scopePresets.map((scope) =>
        Object.freeze({
          ...scope,
          requiredParameterAlternatives: Object.freeze(
            scope.requiredParameterAlternatives.map((alternative) =>
              Object.freeze({
                alternativeId: alternative.alternativeId,
                parameterKeys: Object.freeze([...alternative.parameterKeys]),
              }),
            ),
          ),
        }),
      ),
    ),
    readiness: Object.freeze({ ...registration.readiness }),
  });
}

export function createEstimateWorkProfileRegistry(
  input: readonly EstimateWorkProfileRegistration[],
): EstimateWorkProfileRegistry {
  const registrations = Object.freeze(input.map(cloneRegistration));
  const byCanonicalKey = new Map<string, EstimateWorkProfileRegistration>();
  const byCatalogWorkId = new Map<string, EstimateWorkProfileRegistration>();
  for (const registration of registrations) {
    const canonicalKey = normalized(registration.canonicalWorkKey);
    if (!canonicalKey || byCanonicalKey.has(canonicalKey)) {
      throw new Error(`ESTIMATE_WORK_PROFILE_DUPLICATE_CANONICAL_KEY:${registration.canonicalWorkKey}`);
    }
    if (registration.scopePresets.length === 0) {
      throw new Error(`ESTIMATE_WORK_PROFILE_SCOPE_REQUIRED:${registration.canonicalWorkKey}`);
    }
    const scopeIds = new Set<string>();
    for (const scope of registration.scopePresets) {
      const scopeId = normalized(scope.scopePresetId);
      if (!scopeId || scopeIds.has(scopeId)) {
        throw new Error(`ESTIMATE_WORK_PROFILE_DUPLICATE_SCOPE:${registration.canonicalWorkKey}:${scope.scopePresetId}`);
      }
      scopeIds.add(scopeId);
    }
    byCanonicalKey.set(canonicalKey, registration);
    for (const workId of new Set([registration.canonicalWorkKey, ...registration.catalogWorkIds])) {
      const key = normalized(workId);
      const previous = byCatalogWorkId.get(key);
      if (previous && previous.canonicalWorkKey !== registration.canonicalWorkKey) {
        throw new Error(`ESTIMATE_WORK_PROFILE_DUPLICATE_CATALOG_ID:${workId}`);
      }
      byCatalogWorkId.set(key, registration);
    }
  }
  return Object.freeze({
    registrations,
    getByCatalogWorkId(catalogWorkId: string) {
      return byCatalogWorkId.get(normalized(catalogWorkId)) ?? null;
    },
    getByCanonicalWorkKey(canonicalWorkKey: string) {
      return byCanonicalKey.get(normalized(canonicalWorkKey)) ?? null;
    },
    getScopePreset(canonicalWorkKey: string, scopePresetId: string) {
      const registration = byCanonicalKey.get(normalized(canonicalWorkKey));
      return registration?.scopePresets.find((scope) =>
        normalized(scope.scopePresetId) === normalized(scopePresetId)
      ) ?? null;
    },
  });
}
