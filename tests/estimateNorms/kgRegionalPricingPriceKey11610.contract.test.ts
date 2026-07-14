import {
  auditKgRegionalPricingReadiness,
} from "../../src/lib/estimate/auditKgRegionalPricingReadiness";
import {
  buildKgRegionalPriceableResourcesForPassport,
  buildMissingKgRegionalPriceSnapshot,
} from "../../src/lib/estimate/buildKgRegionalPriceKeys";
import {
  buildProfessionalWorkPassportV2,
  listProfessionalWorkPassportV2TemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassportV2";
import {
  STOP_AI_ESTIMATE_11610_KG_REGIONAL_PRICE_TRUTH_BLOCKERS_FOUND_NO_RELEASE,
} from "../../src/lib/estimate/kgRegionalPricingContract";

jest.setTimeout(300_000);

describe("KG regional pricing PriceKey and blocker ledger contract for 11610 works", () => {
  it("builds immutable exact PriceKeys without assigning fake prices", () => {
    const sampleId = listProfessionalWorkPassportV2TemplateIds()[10000];
    const passport = buildProfessionalWorkPassportV2(sampleId);
    expect(passport).not.toBeNull();
    if (!passport) throw new Error("Expected resolved V2 passport for KG regional pricing sample");

    const resources = buildKgRegionalPriceableResourcesForPassport(passport);
    expect(resources.length).toBeGreaterThan(0);
    const first = resources[0];
    expect(Object.isFrozen(resources)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.specification)).toBe(true);
    expect(Object.isFrozen(first.price_key)).toBe(true);
    expect(first.quantity).toBeNull();
    expect(first.quantity_formula).toBeTruthy();
    expect(first.price_key.price_key_id).toMatch(/^kg_price_key_/);
    expect(first.price_key.specification_hash).toMatch(/^eh_/);
    expect(first.price_key.resource_code).toBe(first.resource_code);
    expect(first.price_key.region_code).toBe("KG-BISHKEK");
    expect(first.price_key.currency).toBe("KGS");

    const rebuilt = buildKgRegionalPriceableResourcesForPassport(passport)
      .find((resource) => resource.source_resource_code === first.source_resource_code);
    expect(rebuilt?.price_key.price_key_id).toBe(first.price_key.price_key_id);

    const blocker = {
      blocker_id: "kg_pricing_blocker_test",
    };
    const snapshot = buildMissingKgRegionalPriceSnapshot({
      price_key: first.price_key,
      blockers: [blocker],
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(snapshot.price_source_priority).toBe("PRICE_MISSING");
    expect(snapshot.trust_state).toBe("MISSING");
    expect(snapshot.unit_price).toBeNull();
    expect(snapshot.normalized_unit_price).toBeNull();
    expect(snapshot.total).toBeNull();
    expect(snapshot.blocker_ids).toEqual([blocker.blocker_id]);
  });

  it("audits all 11610 works with PriceKey coverage and explicit blocker quarantine", () => {
    const result = auditKgRegionalPricingReadiness({ sampleLimit: 8 });
    const summary = result.summary;

    expect(summary.final_status).toBe(STOP_AI_ESTIMATE_11610_KG_REGIONAL_PRICE_TRUTH_BLOCKERS_FOUND_NO_RELEASE);
    expect(summary.catalog_total).toBe(11610);
    expect(summary.priceable_work_passports).toBe(11610);
    expect(summary.upstream_blocked_passports).toBe(0);
    expect(summary.priceable_resource_rows).toBeGreaterThan(11610);
    expect(summary.unique_price_keys).toBeGreaterThan(0);
    expect(summary.price_key_coverage_percent).toBe(100);
    expect(summary.resource_price_keys_resolved_percent).toBe(100);
    expect(summary.material_price_keys_count).toBeGreaterThan(0);
    expect(summary.labor_rate_keys_count).toBeGreaterThan(0);
    expect(summary.service_price_keys_count).toBeGreaterThan(0);
    expect(summary.machine_rate_keys_count + summary.equipment_rate_keys_count).toBeGreaterThan(0);
    expect(summary.ambiguous_price_keys).toBe(0);
    expect(summary.cross_specification_price_matches).toBe(0);
    expect(summary.identical_resource_price_key_violations).toBe(0);
    expect(summary.fake_zero_prices).toBe(0);
    expect(summary.silent_regional_fallbacks).toBe(0);
    expect(summary.untraced_currency_conversions).toBe(0);
    expect(summary.double_applied_waste).toBe(0);
    expect(summary.double_applied_labor).toBe(0);
    expect(summary.wrong_package_conversions).toBe(0);
    expect(summary.expired_prices_used_as_current).toBe(0);
    expect(summary.ambiguous_matches_auto_accepted).toBe(0);
    expect(summary.missing_price_count).toBe(summary.unique_price_keys);
    expect(summary.price_source_missing_count).toBe(summary.unique_price_keys);
    expect(summary.blocker_ledger_entries).toBeGreaterThanOrEqual(summary.price_source_missing_count);
    expect(summary.mandatory_blockers_count).toBe(summary.blocker_ledger_entries);
    expect(summary.validated_scope_resource_rows).toBe(summary.priceable_resource_rows);
    expect(summary.quarantined_scope_resource_rows).toBe(summary.priceable_resource_rows);
    expect(summary.full_catalog_green_claimed).toBe(false);
    expect(summary.release_started).toBe(false);
    expect(summary.deploy_started).toBe(false);
    expect(summary.eas_started).toBe(false);
    expect(summary.native_build_started).toBe(false);
    expect(summary.production_db_touched).toBe(false);
    expect(summary.main_changed).toBe(false);
    expect(summary.pr44_changed).toBe(false);

    expect(result.blockers.length).toBeGreaterThan(0);
    expect(result.blockers.length).toBeLessThanOrEqual(summary.blocker_ledger_entries);
    expect(result.blockers.some((entry) => entry.blocker_type === "PRICE_SOURCE_MISSING")).toBe(true);
    expect(result.blockers[0]?.work_ids.length).toBeGreaterThan(0);
    expect(result.blockers[0]?.required_action).toMatch(/verified supplier quote|official published price|contract price/i);
    expect(result.resource_samples.length).toBeGreaterThan(0);
  });
});
