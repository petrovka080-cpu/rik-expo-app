import fs from "node:fs";
import path from "node:path";

const importerPath = path.resolve("scripts/estimate/r4/importBatch006008CandidateR4.ts");
const successorPath = path.resolve("scripts/estimate/r5/prepareR5ApprovedBaselineSuccessor.ts");

describe("R5 BATCH-006…008 approved baseline construction", () => {
  const source = fs.readFileSync(importerPath, "utf8");

  it("uses the validated admission sample before a permissive numeric minimum", () => {
    const baselineFunction = source.slice(
      source.indexOf("function baselineValue"),
      source.indexOf("function definitionBaseline"),
    );
    expect(baselineFunction).toContain("constraints.admissionSampleValue");
    expect(baselineFunction.indexOf("constraints.admissionSampleValue"))
      .toBeLessThan(baselineFunction.indexOf('parameter.valueType === "boolean"'));
    expect(baselineFunction.indexOf("constraints.admissionSampleValue"))
      .toBeLessThan(baselineFunction.indexOf("constraints.min ?? constraints.minimum"));
  });

  it("keeps conditional and mutually-exclusive parameter validation enabled", () => {
    expect(source).toContain("mutuallyExclusiveBooleanGroup");
    expect(source).toContain("forbiddenWhen");
    expect(source).toContain("validateCanonicalEstimateParameters");
  });

  it("builds the cumulative successor before sealing and satisfies search membership foreign keys", () => {
    const successor = fs.readFileSync(successorPath, "utf8");
    expect(successor).toContain("values($1,$2,$3,'draft'");
    expect(successor).toContain("set status='prepared',sealed_at=$2");
    expect(successor.indexOf("insert into public.estimate_search_document"))
      .toBeLessThan(successor.indexOf("insert into public.estimate_search_group_membership"));
    expect(successor).toContain("extensions.digest(");
    expect(successor).toContain(") select $1::uuid,catalog_id");
    expect(successor).toContain("convert_to($1::uuid::text || ':' || catalog_id || ':' || document_sha256, 'UTF8')");
    expect(successor).toContain("R5_SUCCESSOR_SEAL_TRANSITION_RED");
  });
});
