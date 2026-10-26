import type { CanonicalEstimateRevisionRowView, CanonicalEstimateRevisionView } from './contracts';
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from '../v4/domainFactory/professionalPhysicalNormApplicabilityV1';

export type CanonicalPhysicalNormRevisionV1 = Pick<CanonicalEstimateRevisionView,
  'revisionId' | 'releaseId' | 'catalogId' | 'checksumSha256' | 'parameters' | 'createdAt'>;
export type CanonicalPhysicalNormProjectionV1 = (input: {
  revision: CanonicalPhysicalNormRevisionV1; row: CanonicalEstimateRevisionRowView;
}) => ProfessionalPhysicalNormApplicabilityResolutionV1 | null;

/** Read-time backend evidence; never stored as a new quantity or revision. */
export type CanonicalPhysicalNormEvidenceV1 = {
  contractVersion: 'canonical-physical-norm-evidence/v1';
  owner: 'canonical-estimate-backend';
  revisionId: string;
  releaseId: string;
  catalogId: string;
  revisionChecksumSha256: string;
  rowId: string;
  rowSha256: string;
  resolution: ProfessionalPhysicalNormApplicabilityResolutionV1 | null;
};

const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const object = (value: unknown): value is Record<string,unknown> => value != null && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): boolean => Array.isArray(value) && value.every(item => typeof item === 'string');

/** Transport structure only: no source admission, formula or applicability is replayed. */
function validResolution(value: unknown): boolean {
  if (value === null) return true;
  if (!object(value) || !['APPLIED','NOT_REQUESTED','BLOCKED_REQUIRED_INPUTS','BLOCKED_NOT_APPLICABLE'].includes(String(value.status))) return false;
  return ['applicability_version','source_id','norm_id','source_document_version','source_url','exact_locator',
    'source_definition_hash','deterministic_hash'].every(key=>nonempty(value[key]))
    && (value.product_profile_id === null || nonempty(value.product_profile_id))
    && (value.status !== 'APPLIED' || nonempty(value.product_profile_id))
    && strings(value.consumed_parameter_ids) && strings(value.produced_parameter_ids)
    && strings(value.blockers) && object(value.parameter_values);
}

/** Identity validation only. The physical resolver is a server dependency. */
export const readCanonicalPhysicalNormEvidenceV1: CanonicalPhysicalNormProjectionV1 = ({revision,row}) => {
  const evidence = row.physicalNormEvidenceV1;
  if (evidence == null) {
    const graph = row.calculationTrace?.resourceGraph;
    if (graph != null && typeof graph === 'object' && !Array.isArray(graph)
      && Object.hasOwn(graph,'professionalPhysicalNormBindingV1')) {
      throw Object.assign(new Error('backend physical norm evidence is required'),
        {code:'CANONICAL_PHYSICAL_NORM_EVIDENCE_REQUIRED'});
    }
    return null;
  }
  if (!object(evidence) || !['revisionId','releaseId','catalogId','rowId'].every(key=>nonempty(evidence[key]))
    || ![revision.revisionId,revision.releaseId,revision.catalogId,row.rowId].every(nonempty)
    || !Object.hasOwn(evidence,'resolution') || !validResolution(evidence.resolution)
    || evidence.contractVersion !== 'canonical-physical-norm-evidence/v1'
    || evidence.owner !== 'canonical-estimate-backend'
    || evidence.revisionId !== revision.revisionId || evidence.releaseId !== revision.releaseId
    || evidence.catalogId !== revision.catalogId || evidence.revisionChecksumSha256 !== revision.checksumSha256
    || evidence.rowId !== row.rowId || evidence.rowSha256 !== row.rowSha256
    || !/^[a-f0-9]{64}$/u.test(evidence.revisionChecksumSha256)
    || !/^[a-f0-9]{64}$/u.test(evidence.rowSha256)) {
    throw Object.assign(new Error('backend physical norm evidence identity mismatch'),
      {code:'CANONICAL_PHYSICAL_NORM_EVIDENCE_IDENTITY_MISMATCH'});
  }
  return evidence.resolution;
};
