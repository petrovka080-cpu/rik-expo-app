import { calculateNextIosBuildNumber } from "../../scripts/release/iosTestFlightInternalQaCore";
import { readJson, nestedRecord } from "./iosTestFlightInternalQaTestHelpers";

describe("iOS TestFlight internal QA build number bump", () => {
  it("bumps from the highest known local or remote iOS build number only", () => {
    expect(calculateNextIosBuildNumber("23", "44")).toBe("45");
    expect(calculateNextIosBuildNumber("45", "44")).toBe("46");
  });

  it("does not change the marketing version contract", () => {
    const app = readJson("app.json");
    const expo = nestedRecord(app, "expo");

    expect(expo.version).toBe("1.0.0");
  });
});
