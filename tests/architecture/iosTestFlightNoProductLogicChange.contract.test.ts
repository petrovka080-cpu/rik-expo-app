import { changedFilesFromHead } from "../mobileRelease/iosTestFlightInternalQaTestHelpers";
import { isAllowedIosInternalQaPath } from "../../scripts/release/iosTestFlightInternalQaCore";

describe("iOS TestFlight internal QA architecture boundary", () => {
  it("keeps this wave out of product logic, estimate engine, BOQ compiler, PDF renderer, UI, and request flow", () => {
    const changedFiles = changedFilesFromHead();
    const disallowed = changedFiles.filter((file) => !isAllowedIosInternalQaPath(file));

    expect(disallowed).toEqual([]);
    expect(changedFiles.some((file) => file.startsWith("src/lib/ai/globalEstimate/"))).toBe(false);
    expect(changedFiles.some((file) => file.startsWith("src/lib/ai/professionalBoq/"))).toBe(false);
    expect(changedFiles.some((file) => file.startsWith("src/lib/pdf/"))).toBe(false);
    expect(changedFiles.some((file) => file.startsWith("src/screens/"))).toBe(false);
    expect(changedFiles.some((file) => file.startsWith("app/"))).toBe(false);
  });
});
