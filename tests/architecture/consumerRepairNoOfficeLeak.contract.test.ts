import * as fs from "fs";
import * as path from "path";

describe("consumer repair no office leak architecture contract", () => {
  it("keeps request screen and service outside office routing and tables", () => {
    const screen = fs.readFileSync(path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"), "utf8");
    const service = fs.readFileSync(path.resolve(process.cwd(), "src/lib/consumerRequests/consumerRequestService.ts"), "utf8");
    const migration = fs.readFileSync(path.resolve(process.cwd(), "supabase/migrations/20260521143000_b2c_consumer_repair_requests.sql"), "utf8");

    expect(screen).not.toContain("/office");
    expect(service).not.toMatch(/office_|procurement_requests|warehouse|finance|approval_inbox/);
    expect(migration).toContain("consumer_repair_request_drafts");
    expect(migration).not.toContain("office_requests");
  });
});
