import {
  assertAiEstimatePersistenceNoDesync,
  evaluateAiEstimatePersistenceNoDesync,
} from "../../src/lib/ai/estimatePersistence";
import { persistenceRecord } from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate local-state-only guard", () => {
  it("requires draft, revision, and history backing for generated estimates", () => {
    const record = persistenceRecord();

    expect(() => assertAiEstimatePersistenceNoDesync(record)).not.toThrow();
    expect(evaluateAiEstimatePersistenceNoDesync(record)).toMatchObject({
      ai_generation_creates_draft: true,
      ai_generation_creates_revision: true,
      ai_generation_creates_history_item: true,
      local_state_only_estimate: false,
      fake_green_claimed: false,
    });
  });
});
