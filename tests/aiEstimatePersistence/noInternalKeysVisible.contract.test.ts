import { countAiEstimatePersistenceInternalKeysVisible } from "../../src/lib/ai/estimatePersistence";
import { persistenceRecord, visiblePersistenceText } from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate persistence visible text hygiene", () => {
  it("does not expose internal persistence keys in user-visible labels", () => {
    expect(countAiEstimatePersistenceInternalKeysVisible(visiblePersistenceText(persistenceRecord()))).toBe(0);
  });
});
