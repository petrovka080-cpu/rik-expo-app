import * as fs from "fs";
import * as path from "path";

describe("consumer repair no second AI framework architecture contract", () => {
  it("uses the existing consumer adapter and domain gateway instead of a parallel AI framework", () => {
    const adapter = fs.readFileSync(path.resolve(process.cwd(), "src/features/consumerRepair/consumerRepairAiAdapter.ts"), "utf8");
    const provider = fs.readFileSync(path.resolve(process.cwd(), "src/lib/ai/domainDataGateway/providers/consumerRepairDomainProvider.ts"), "utf8");

    expect(adapter).not.toMatch(/new\s+OpenAI|fetch\(|axios|createChat|second/i);
    expect(provider).toContain("AiDomainProvider");
    expect(provider).toContain("consumer_repair");
  });
});
