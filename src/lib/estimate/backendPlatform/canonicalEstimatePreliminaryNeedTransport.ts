import { assertCanonicalPurchaseSupplyRowV1 } from "./canonicalPurchaseSupplyReadinessV1";
import {
  CanonicalEstimateApiError,
  canonicalEstimatePreliminaryNeedsFromAmendmentContract,
  type CanonicalEstimatePreliminaryNeedEvidence,
  type CanonicalEstimatePreliminaryNeedEvidenceReference,
} from "./contracts";
import { canonicalEstimateSha256HexText } from "./canonicalEstimateSha256";
import { canonicalEstimateStableJson } from "./canonicalEstimateDeterminism";
import { canonicalArtifactPurchaseRequirement } from "./canonicalPersistedPurchaseBalance";

type StorageRecord = Record<string, unknown>;
const record = (value: unknown): StorageRecord => value != null && typeof value === "object" && !Array.isArray(value)
  ? value as StorageRecord : {};

export function decodeCanonicalPreliminaryNeedRowSegment(segment: string): string {
  try {
    const rowId = decodeURIComponent(segment);
    if (!rowId || rowId.length > 2_000) throw new Error("invalid row id");
    return rowId;
  } catch {
    throw new CanonicalEstimateApiError("Некорректная ссылка на строку.", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
}

function reference(revision: StorageRecord, rowId: string, needSha256: string): CanonicalEstimatePreliminaryNeedEvidenceReference {
  return {
    contractVersion: "canonical-preliminary-need-evidence/v1",
    revisionId: String(revision.id ?? ""), releaseId: String(revision.release_id ?? ""),
    definitionVersionId: revision.definition_version_id == null ? null : String(revision.definition_version_id),
    checksumSha256: String(revision.checksum_sha256 ?? ""), rowId, needSha256,
  };
}

/** Transport only: never mutate storage, its amendment provenance, or its hash basis. */
export function projectCanonicalEstimatePreliminaryNeedTransport(revision: StorageRecord) {
  const amendmentContract = record(revision.amendment_contract);
  const parameterSources = record(amendmentContract.parameterSources);
  const { preliminaryNeeds: _rawDuplicate, ...remainingSources } = parameterSources;
  return {
    amendmentContract: {
      ...amendmentContract,
      ...(amendmentContract.parameterSources == null ? {} : { parameterSources: remainingSources }),
    },
    preliminaryNeeds: canonicalEstimatePreliminaryNeedsFromAmendmentContract(amendmentContract).map((need) => {
      const requirement = canonicalArtifactPurchaseRequirement({ row_id: need.rowId, unit_id: need.unitId, calculation_trace: need.calculationTrace });
      const { calculationTrace: _calculationTrace, normativeTrace: _normativeTrace, ...compact } = need;
      return { ...compact, ...(requirement ? { purchaseRequirement: record(need.calculationTrace?.purchaseRequirementV1) } : {}), evidenceStatus: "referenced" as const,
        evidenceReference: reference(revision, need.rowId, need.needSha256) };
    }),
  };
}

export function canonicalPreliminaryNeedEvidenceIdentityMatches(
  expected: CanonicalEstimatePreliminaryNeedEvidenceReference,
  actual: CanonicalEstimatePreliminaryNeedEvidenceReference,
): boolean {
  return isCanonicalPreliminaryNeedEvidenceReference(expected) && isCanonicalPreliminaryNeedEvidenceReference(actual)
    && REFERENCE_KEYS.every(key => expected[key] === actual[key]);
}

const REFERENCE_KEYS = ["contractVersion", "revisionId", "releaseId", "definitionVersionId", "checksumSha256", "rowId", "needSha256"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const SHA256 = /^[0-9a-f]{64}$/u;
export function isCanonicalPreliminaryNeedEvidenceReference(value: unknown): value is CanonicalEstimatePreliminaryNeedEvidenceReference {
  const candidate = record(value);
  return Object.keys(candidate).length === REFERENCE_KEYS.length
    && candidate.contractVersion === "canonical-preliminary-need-evidence/v1"
    && typeof candidate.revisionId === "string" && UUID.test(candidate.revisionId)
    && typeof candidate.releaseId === "string" && UUID.test(candidate.releaseId)
    && (candidate.definitionVersionId === null || typeof candidate.definitionVersionId === "string" && UUID.test(candidate.definitionVersionId))
    && typeof candidate.checksumSha256 === "string" && SHA256.test(candidate.checksumSha256)
    && typeof candidate.needSha256 === "string" && SHA256.test(candidate.needSha256)
    && typeof candidate.rowId === "string" && candidate.rowId.length > 0 && candidate.rowId.length <= 2_000;
}

/** Same original hash basis for network and offline cache; malformed data is never evidence. */
export function isCanonicalPreliminaryNeedEvidence(value: unknown): value is CanonicalEstimatePreliminaryNeedEvidence {
  try {
    const candidate = record(value);
    if (!isCanonicalPreliminaryNeedEvidenceReference(candidate.reference)) return false;
    const rawNeed = record(candidate.rawNeed);
    const { need_sha256: needSha256, ...hashBasis } = rawNeed;
    return rawNeed.row_id === candidate.reference.rowId && needSha256 === candidate.reference.needSha256
      && canonicalEstimateSha256HexText(canonicalEstimateStableJson(hashBasis)) === needSha256;
  } catch { return false; }
}

/** Call only after the same revision authorization/admission used by detail. */
export async function canonicalPreliminaryNeedEvidenceFromStorage(
  revision: StorageRecord,
  rowId: string,
  hashJson: (value: unknown) => string | Promise<string>,
): Promise<CanonicalEstimatePreliminaryNeedEvidence> {
  const rawNeeds = record(record(revision.amendment_contract).parameterSources).preliminaryNeeds;
  const matches = Array.isArray(rawNeeds) ? rawNeeds.filter(raw => record(raw).row_id === rowId) : [];
  if (matches.length !== 1) throw new CanonicalEstimateApiError("Доказательства строки не найдены.", {
    code: "NOT_FOUND", httpStatus: 404,
  });
  const rawNeed = record(matches[0]);
  const { need_sha256: needSha256, ...hashBasis } = rawNeed;
  if (typeof needSha256 !== "string" || !/^[0-9a-f]{64}$/u.test(needSha256)
    || await hashJson(hashBasis) !== needSha256) {
    throw new CanonicalEstimateApiError("Доказательства строки не совпадают с сохранённой версией.", {
      code: "PRELIMINARY_NEED_EVIDENCE_INTEGRITY_FAILED", httpStatus: 409,
    });
  }
  assertCanonicalPurchaseSupplyRowV1(rawNeed, revision.amendment_contract);
  return { reference: reference(revision, rowId, needSha256), rawNeed };
}
