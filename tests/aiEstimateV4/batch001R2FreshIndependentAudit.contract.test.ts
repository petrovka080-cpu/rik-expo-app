import {
  BATCH001_CONTROLLED_MUTATIONS_V3,
  auditBatch001IndependentEnvelopeV3,
  buildBatch001IndependentAuditEnvelopeV3,
} from "./batch001R2IndependentAuditSupport";
import { allBatch001ContractParts } from "./batch001R2ContractSupport";

describe("BATCH001 R2 fresh independent audit", () => {
  test("rebuilds the audit envelope from production definitions and closes GREEN with no blockers", () => {
    const envelope = buildBatch001IndependentAuditEnvelopeV3(allBatch001ContractParts());
    const result = auditBatch001IndependentEnvelopeV3(envelope);
    expect(BATCH001_CONTROLLED_MUTATIONS_V3).toHaveLength(48);
    expect(envelope).toMatchObject({
      production_entrypoint: "REGISTERED_PROFESSIONAL_DOMAIN",
      production_owner: "interior_finishes",
      android_runtime: "NATIVE_API34",
      outside_scope_mutation_count: 0,
      full_jest_count: 0,
      external_action_count: 0,
    });
    expect(result).toMatchObject({ status: "GREEN", blockers: [], detected_count: 0 });
    expect(result.envelope_hash).toMatch(/^eh_[0-9a-f]{16}$/);
  });
});
