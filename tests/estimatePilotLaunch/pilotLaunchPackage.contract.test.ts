import fs from "node:fs";

describe("pilot launch readiness package", () => {
  it("defines launch scope, roles, cohorts, versions, and ten pilot cases", () => {
    const readiness = JSON.parse(fs.readFileSync("data/estimate-pilot/pilot-launch-readiness.json", "utf8"));
    const scope = JSON.parse(fs.readFileSync("data/estimate-pilot/pilot-release-scope.json", "utf8"));
    const cohorts = JSON.parse(fs.readFileSync("data/estimate-pilot/pilot-cohort-access.json", "utf8"));

    expect(readiness.acceptance.pilot_launch_package_created).toBe(true);
    expect(readiness.source_sha).toBe("runtime:git_head");
    expect(readiness.catalog_version).toBe("runtime:estimate_catalog_version");
    expect(readiness.pricebook_version).toEqual(expect.any(String));
    expect(readiness.supported_regions).toContain("KG-Bishkek");
    expect(readiness.supported_currencies).toContain("KGS");
    expect(readiness.enabled_roles).toEqual(expect.arrayContaining(["ESTIMATOR", "DIRECTOR", "PROCUREMENT", "FOREMAN", "CLIENT"]));
    expect(readiness.pilot_launch_cases).toHaveLength(10);
    expect(readiness.pilot_launch_cases.map((item: any) => item.source_controlled_pilot_case_id)).toEqual(expect.arrayContaining([
      "CORE-001-capital-renovation-98",
      "INFRA-011-village-water-supply",
      "INFRA-015-asphalt-road",
      "INFRA-018-power-line-10kv",
      "COMPLEX-028-high-rise-glazing",
      "COMPLEX-029-mansard-roof",
      "ENERGY-031-thermal-power-plant",
      "ENERGY-033-hydro-power-plant",
      "COMPLEX-021-bridge",
      "COMPLEX-025-industrial-shed",
    ]));

    expect(scope.explicitly_out_of_scope).toEqual(expect.arrayContaining([
      "marketplace_catalog_mutation",
      "rfq_creation",
      "warehouse_stock_mutation",
      "payment_processing",
      "native_build",
      "eas_build",
      "production_database_migration",
    ]));
    expect(cohorts.cohorts.map((item: any) => item.cohort_id)).toEqual(expect.arrayContaining([
      "INTERNAL_QA",
      "ESTIMATOR_REVIEWERS",
      "DIRECTOR_REVIEWERS",
      "PROCUREMENT_REVIEWERS",
      "FOREMAN_REVIEWERS",
      "LIMITED_CLIENT_DEMO",
    ]));
    expect(cohorts.cohorts.find((item: any) => item.cohort_id === "LIMITED_CLIENT_DEMO").enabled_by_default).toBe(false);
  });
});
