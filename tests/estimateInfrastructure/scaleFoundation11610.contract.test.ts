import {
  buildEstimateScaleFoundationManifest,
  ESTIMATE_SCALE_FOUNDATION_REQUIRED_AUDITS,
  type EstimateScaleFoundationWorkProof,
} from "../../src/lib/estimate/v4/scaleFoundation11610";

const SOURCE_SHA = "0123456789abcdef0123456789abcdef01234567";
const GREEN_AUDIT_EVIDENCE =
  ESTIMATE_SCALE_FOUNDATION_REQUIRED_AUDITS.map((auditId) => ({
    auditId,
    sourceSha: SOURCE_SHA,
    finalStatus: `GREEN_${auditId}`,
    summaryPath: `.release-runtime/${auditId}/summary.json`,
    ledgerPath: `.release-runtime/${auditId}/ledger.jsonl`,
  }));

function proof(
  workId: string,
  overrides: Partial<EstimateScaleFoundationWorkProof> = {},
): EstimateScaleFoundationWorkProof {
  return {
    workId,
    catalogPresent: true,
    passportId: "passport:electrical",
    passportVersion: "1.0.0",
    parameterSchemaId: "parameters:electrical:v1",
    familyCalculatorId: "calculator:electrical:v1",
    formulaGraphVersion: "formula:electrical:v1",
    normativeSourceIds: ["norm:electrical:v1"],
    pricePolicyId: "price-policy:kg:v1",
    deterministicCompilerVersion: "compiler:v1",
    validatorVersion: "validator:v1",
    quantityOutputReady: true,
    realNamedBoqReady: true,
    materialQuantityReady: true,
    materialCompletenessReady: true,
    trustedCostingReady: true,
    contractTotalEvidenceReady: true,
    procurementEvidenceReady: true,
    normativelyExpertVerified: false,
    rollbackCompatible: true,
    revisionCompatible: true,
    claimedProfessionalEstimateReady: true,
    claimedContractCostReady: true,
    blockers: [],
    ...overrides,
  };
}

describe("estimate scale foundation readiness contract", () => {
  it("classifies L0-L5 monotonically without promoting missing evidence", () => {
    const manifest = buildEstimateScaleFoundationManifest({
      sourceSha: SOURCE_SHA,
      generatedAt: "2026-07-29T00:00:00.000Z",
      expectedWorkTotal: 6,
      auditEvidence: GREEN_AUDIT_EVIDENCE,
      proofs: [
        proof("l0", {
          passportId: null,
          passportVersion: null,
          parameterSchemaId: null,
          familyCalculatorId: null,
          formulaGraphVersion: null,
          deterministicCompilerVersion: null,
          validatorVersion: null,
          quantityOutputReady: false,
          realNamedBoqReady: false,
          materialQuantityReady: false,
          materialCompletenessReady: false,
          trustedCostingReady: false,
          claimedProfessionalEstimateReady: false,
          claimedContractCostReady: false,
        }),
        proof("l1", {
          parameterSchemaId: null,
          familyCalculatorId: null,
          formulaGraphVersion: null,
          deterministicCompilerVersion: null,
          validatorVersion: null,
          quantityOutputReady: false,
          realNamedBoqReady: false,
          materialQuantityReady: false,
          materialCompletenessReady: false,
          trustedCostingReady: false,
          claimedProfessionalEstimateReady: false,
          claimedContractCostReady: false,
        }),
        proof("l2", {
          quantityOutputReady: false,
          realNamedBoqReady: false,
          materialQuantityReady: false,
          materialCompletenessReady: false,
          trustedCostingReady: false,
          claimedProfessionalEstimateReady: false,
          claimedContractCostReady: false,
        }),
        proof("l3", {
          trustedCostingReady: false,
          claimedContractCostReady: false,
        }),
        proof("l4"),
        proof("l5", {
          normativelyExpertVerified: true,
        }),
      ],
    });

    expect(manifest.readinessCounts).toEqual({
      L0_CATALOG_ONLY: 1,
      L1_IDENTIFIED: 1,
      L2_PARAMETERIZED: 1,
      L3_QUANTITY_READY: 1,
      L4_COST_READY: 1,
      L5_NORMATIVELY_VERIFIED: 1,
    });
    expect(manifest.rows.slice(0, 3).every((row) => row.quarantined)).toBe(
      true,
    );
    expect(manifest.rows.find((row) => row.workId === "l3")).toMatchObject({
      professionalEstimateAllowed: true,
      contractTotalAllowed: false,
      procurementAllowed: false,
    });
    expect(manifest.rows.find((row) => row.workId === "l4")).toMatchObject({
      professionalEstimateAllowed: true,
      contractTotalAllowed: true,
      procurementAllowed: true,
    });
    expect(manifest.falseReadyCount).toBe(0);
    expect(manifest.admissionReadyForGroup01).toBe(false);
    expect(manifest.blockers).toEqual(
      expect.arrayContaining([
        "work_passport_registry_incomplete",
        "canonical_parameter_schema_registry_incomplete",
      ]),
    );
  });

  it("admits the foundation only when every required registry is complete", () => {
    const manifest = buildEstimateScaleFoundationManifest({
      sourceSha: SOURCE_SHA,
      generatedAt: "2026-07-29T00:00:00.000Z",
      expectedWorkTotal: 1,
      auditEvidence: GREEN_AUDIT_EVIDENCE,
      proofs: [proof("ready")],
    });

    expect(manifest.admissionReadyForGroup01).toBe(true);
    expect(manifest.blockers).toEqual([]);
    expect(manifest.falseReadyCount).toBe(0);
  });

  it("quarantines false professional and contract-ready claims", () => {
    const manifest = buildEstimateScaleFoundationManifest({
      sourceSha: SOURCE_SHA,
      generatedAt: "2026-07-29T00:00:00.000Z",
      expectedWorkTotal: 1,
      auditEvidence: GREEN_AUDIT_EVIDENCE,
      proofs: [
        proof("false-ready", {
          quantityOutputReady: false,
          realNamedBoqReady: false,
          materialQuantityReady: false,
          materialCompletenessReady: false,
          trustedCostingReady: false,
        }),
      ],
    });

    expect(manifest.rows[0]).toMatchObject({
      readinessLevel: "L2_PARAMETERIZED",
      professionalEstimateAllowed: false,
      contractTotalAllowed: false,
      procurementAllowed: false,
      quarantined: true,
    });
    expect(manifest.rows[0].quarantineReasons).toEqual(
      expect.arrayContaining([
        "false_professional_ready_claim",
        "false_contract_cost_ready_claim",
        "readiness_below_quantity_ready:L2_PARAMETERIZED",
      ]),
    );
    expect(manifest.falseReadyCount).toBe(1);
    expect(manifest.admissionReadyForGroup01).toBe(false);
    expect(manifest.blockers).toContain("false_ready_count:1");
  });
});
