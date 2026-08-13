import type { Batch001IndependentAuditEnvelopeV3 } from "./batch001R2IndependentAuditSupport";
import {
  BATCH001_CONTROLLED_MUTATIONS_V3,
  auditBatch001IndependentEnvelopeV3,
  buildBatch001IndependentAuditEnvelopeV3,
} from "./batch001R2IndependentAuditSupport";
import { allBatch001ContractParts } from "./batch001R2ContractSupport";

function cloneEnvelope(source: Batch001IndependentAuditEnvelopeV3): Batch001IndependentAuditEnvelopeV3 {
  return JSON.parse(JSON.stringify(source)) as Batch001IndependentAuditEnvelopeV3;
}

function mutate(
  source: Batch001IndependentAuditEnvelopeV3,
  index: number,
): Batch001IndependentAuditEnvelopeV3 {
  const value = cloneEnvelope(source);
  const first = value.catalog_ids[0];
  switch (index) {
    case 0: value.catalog_ids.push("outside_scope_work"); break;
    case 1: value.catalog_ids.pop(); break;
    case 2: value.group_order = ["ALIGN", "FRAME", "CLAD"]; break;
    case 3: value.group_green_before_next = false; break;
    case 4: value.manifest_hash = "0".repeat(64); break;
    case 5: value.manifest_candidate_count = 2; break;
    case 6: value.authorization_manifest_hash = "1".repeat(64); break;
    case 7: value.production_entrypoint = "GENERIC_FALLBACK"; break;
    case 8: value.production_owner = "legacy_manual_boq"; break;
    case 9: value.alias_billable_count = 1; break;
    case 10: value.distinct_variant_fingerprint_count = 15; break;
    case 11: value.expected_scope_basis = "DERIVED_FROM_BOQ"; break;
    case 12: value.required_stage_coverage -= 1; break;
    case 13: value.padding_row_count = 1; break;
    case 14: value.scaled_clone_pair_count = 1; break;
    case 15: value.duplicate_cost_owner_count = 1; break;
    case 16: value.shown_unused_parameter_count = 1; break;
    case 17: value.hidden_project_default_count = 1; break;
    case 18: value.unbounded_project_input_count = 1; break;
    case 19: value.formula_dimension_failure_count = 1; break;
    case 20: value.unproved_constant_count = 1; break;
    case 21: value.missing_required_resource_count = 1; break;
    case 22: value.orphan_resource_count = 1; break;
    case 23: value.row_without_normative_trace_count = 1; break;
    case 24: value.unresolved_locator_count = 1; break;
    case 25: value.draft_active = true; break;
    case 26: value.foreign_source_mandatory_for_kg_count = 1; break;
    case 27: value.source_role_conflation_count = 1; break;
    case 28: value.regional_lane_counts[first] = 10; break;
    case 29: value.global_decision_counts[first] = 7; break;
    case 30: value.normative_proof_catalog_ids.shift(); break;
    case 31: value.normative_proof_hashes[1] = value.normative_proof_hashes[0]; break;
    case 32: value.professional_proof_catalog_ids.shift(); break;
    case 33: value.group_aggregate_proof_substitution_count = 1; break;
    case 34: value.invalid_price_count = 1; break;
    case 35: value.price_unit_currency_tax_error_count = 1; break;
    case 36: value.hidden_runtime_price_value_count = 1; break;
    case 37: value.durable_row_loss_count = 1; break;
    case 38: value.requested_identity_mismatch_count = 1; break;
    case 39: value.pdf_mismatch_count = 1; break;
    case 40: value.procurement_mismatch_count = 1; break;
    case 41: value.android_runtime = "WEB_OR_CHROME"; break;
    case 42: value.android_catalog_ids.pop(); break;
    case 43: value.slice_denominator_correct = false; break;
    case 44: value.red_catalog_ids = [first]; break;
    case 45: value.completed_checkpoint_stable = false; break;
    case 46: value.sha_assertions_exact = false; break;
    case 47: value.outside_scope_mutation_count = 1; break;
    default: throw new Error(`UNSUPPORTED_MUTATION:${index}`);
  }
  return value;
}

describe("BATCH001 R2 controlled mutations 48/48", () => {
  const baseline = buildBatch001IndependentAuditEnvelopeV3(allBatch001ContractParts());

  test("independent baseline is GREEN", () => {
    expect(baseline.shown_unused_parameter_ids).toEqual([]);
    expect(auditBatch001IndependentEnvelopeV3(baseline)).toMatchObject({
      status: "GREEN",
      blockers: [],
      detected_count: 0,
    });
  });

  test.each(BATCH001_CONTROLLED_MUTATIONS_V3.map((id, index) => [index + 1, id, index] as const))(
    "rejects controlled mutation %i: %s",
    (_ordinal, expected, index) => {
      const result = auditBatch001IndependentEnvelopeV3(mutate(baseline, index));
      expect(result.status).toBe("RED");
      expect(result.blockers).toContain(expected);
    },
  );
});
