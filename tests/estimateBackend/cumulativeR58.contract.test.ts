import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("R5.8 cumulative canonical backend contract", () => {
  const manifestMigration = read(
    "supabase/migrations/20260818030000_p0_r54_cumulative_manifest.sql",
  );
  const compilerMigration = read(
    "supabase/migrations/20260818040000_p0_r58_cumulative_compiler_contract.sql",
  );
  const gateway = read(
    "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
  );
  const traceValidator = read(
    "scripts/estimate/p0TruthRemediationR5/validateR57AcceptedTraceBaselineCandidates.ts",
  );
  const composer = read("src/components/estimate/ProfessionalEstimateComposer.tsx");
  const consumerBaseline = read(
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
  );

  it("keeps BATCH009 out and resolves one inherited definition without copying accepted rows", () => {
    expect(manifestMigration).toContain("upper(source_batch) not like 'BATCH009%'");
    expect(manifestMigration).toContain("unique (release_id,definition_version_id)");
    expect(manifestMigration).toContain("approved_template_baseline_id uuid");
    expect(manifestMigration).toContain("m.definition_version_id=v.id");
    expect(manifestMigration).toContain("v_resource.source_metadata->>'truth_contract_version'='R3'");
    expect(manifestMigration).toContain("R3 resource semantic_owner is required");
    expect(manifestMigration).not.toMatch(/insert into public\.estimate_(?:parameter_definition|formula_graph|resource_spec)/i);
  });

  it("separates server baseline assumptions from user values and fails closed on provenance", () => {
    expect(compilerMigration).toContain("estimate_create_compile_job_r58");
    expect(compilerMigration).toContain("estimate_commit_cumulative_compile_job_r58");
    expect(compilerMigration).toContain("cumulative baseline/user parameter provenance mismatch");
    expect(compilerMigration).toContain("v_resolved_parameters<>(v_baseline_assumptions||v_user_parameters)");
    expect(compilerMigration).toContain("ONE_MONOLITH_R58_CUMULATIVE_REVISION_V1");
    expect(compilerMigration).toContain("cumulative revision row ownership projection is invalid");
  });

  it("uses the R5.8 cumulative functions only in explicit manifest mode", () => {
    expect(gateway).toContain("CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST");
    expect(gateway).toContain('"estimate_create_compile_job_r58"');
    expect(gateway).toContain('"estimate_commit_cumulative_compile_job_r58"');
    expect(gateway).toContain("baselineAssumptions");
    expect(gateway).toContain("userParameters: effectiveUserParameters");
    expect(gateway).toContain('"estimate_create_compile_job_v1"');
    expect(gateway).toContain('"estimate_commit_compile_job_v1"');
    expect(gateway).toContain("from public.estimate_cumulative_manifest_entry manifest");
    expect(gateway).toContain("version.id=manifest.definition_version_id");
    expect(gateway).toContain("manifest.release_id cumulative_release_id");
    expect(gateway).toContain("manifest.approved_template_baseline_id cumulative_baseline_id");
    expect(gateway).toContain("releaseId: definition.cumulative_release_id");
    expect(gateway).not.toContain("where (($2::uuid is not null and r.id=$2) or ($2::uuid is null and r.status='active')) and v.catalog_id=$1");
  });

  it("projects accepted per-work baseline guides into inherited catalog inputs", () => {
    expect(gateway).toContain("from public.estimate_approved_template_baseline where id=$1");
    expect(gateway).toContain("baseline?.guide_provenance_ru?.[parameterId]");
    expect(gateway).toContain("baseline?.formula_consumer_ids?.[parameterId]");
    expect(gateway).toContain("baseline?.resource_consumer_row_ids?.[parameterId]");
    expect(gateway).toContain("Object.prototype.hasOwnProperty.call(baseline.input_values ?? {}, parameterId)");
    expect(gateway).toContain('acceptedAsInput ? "USER_INPUT" : "INTERNAL_ONLY"');
    expect(gateway).toContain("approvedTemplateBaselineId: baseline.id");
    expect(gateway).toContain("work_specific_applicability");
  });

  it("does not treat removal of duplicate semantic owners as equivalent to a valid estimate", () => {
    expect(traceValidator).toContain("duplicate_semantic_owners:");
    expect(traceValidator).toContain("duplicate_cost_owners:");
    expect(traceValidator).toContain("blank_semantic_owners:");
    expect(traceValidator).toContain("provenance_less_defaults:");
  });

  it("scopes client idempotency to the cumulative release lineage", () => {
    expect(composer).toContain("composer-${selectedCatalog.releaseId}-${selectedCatalog.catalogId}");
    expect(composer).not.toContain("composer-${selectedCatalog.catalogId}-${stableInputKey(parameters)}");
    expect(consumerBaseline).toContain("${catalog.releaseId}|${catalog.catalogId}|${input.prompt}");
    expect(consumerBaseline).not.toContain("`${catalog.catalogId}|${input.prompt}|${JSON.stringify(parameters)}`");
  });

  it("accepts an exact guide document and locator as the inline normative source", () => {
    expect(composer).toContain("guideCarriesExactNormativeSource");
    expect(composer).toContain("parameter.guide?.sourceDocument?.trim()");
    expect(composer).toContain("parameter.guide?.sourceLocator?.trim()");
    expect(composer).toContain("!parameter.normativeLinks?.length && !guideCarriesExactNormativeSource");
  });

  it("gates user inputs on their inline guide and provenance, not optional descriptive metadata", () => {
    expect(composer).not.toContain('missing.push("description_ru")');
    expect(composer).not.toContain('missing.push("default_policy")');
    expect(composer).toContain('missing.push("guide_short_ru")');
    expect(composer).toContain('missing.push("provenance")');
  });
});
