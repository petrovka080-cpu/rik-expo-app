import {
  confirmProfessionalEstimateCalculatorHandoff,
  createProfessionalEstimateCalculatorPreview,
  representativeProfessionalEstimateCalculatorInput,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("professional estimate request confirmation boundary", () => {
  it("does not insert request rows before explicit user confirmation", () => {
    const preview = createProfessionalEstimateCalculatorPreview(representativeProfessionalEstimateCalculatorInput());

    expect(preview.status).toBe("NEEDS_USER_CONFIRMATION");
    if (preview.status !== "NEEDS_USER_CONFIRMATION") return;

    expect(preview.insertedRows).toBe(0);
    expect(preview.rowsInsertedBeforeConfirmation).toBe(false);
    expect(preview.userConfirmationRequiredBeforeInsert).toBe(true);
    expect(preview.requestDraftLines.length).toBeGreaterThan(0);
  });

  it("rejects handoff without user confirmation and inserts only after confirmation", () => {
    const preview = createProfessionalEstimateCalculatorPreview(representativeProfessionalEstimateCalculatorInput());
    expect(preview.status).toBe("NEEDS_USER_CONFIRMATION");
    if (preview.status !== "NEEDS_USER_CONFIRMATION") return;

    expect(() =>
      confirmProfessionalEstimateCalculatorHandoff({
        preview,
        userConfirmed: false,
      }),
    ).toThrow("PROFESSIONAL_ESTIMATE_USER_CONFIRMATION_REQUIRED_BEFORE_INSERT");

    const confirmed = confirmProfessionalEstimateCalculatorHandoff({
      preview,
      userConfirmed: true,
      actorUserId: "user:test",
      createdAt: "2026-07-01T00:02:00.000Z",
    });

    expect(confirmed.status).toBe("CONFIRMED_HANDOFF_READY");
    expect(confirmed.insertedRows).toBe(preview.requestDraftLines.length);
    expect(confirmed.rowsInsertedBeforeConfirmation).toBe(false);
    expect(confirmed.requestBinding.request_recalculated_separately).toBe(false);
  });
});
