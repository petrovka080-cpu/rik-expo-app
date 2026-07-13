import { aiEstimatePersistenceMojibakeFound } from "../../src/lib/ai/estimatePersistence";
import { persistenceRecord, visiblePersistenceText } from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate persistence mojibake guard", () => {
  it("keeps user-visible Russian labels readable", () => {
    expect(aiEstimatePersistenceMojibakeFound(visiblePersistenceText(persistenceRecord()))).toBe(false);
    expect(aiEstimatePersistenceMojibakeFound("Р В Р ВµР СР С•Р Р…РЎвЂљ")).toBe(true);
  });
});
