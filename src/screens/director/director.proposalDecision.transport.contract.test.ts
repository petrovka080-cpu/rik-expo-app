import { readFileSync } from "fs";
import { join } from "path";

import { scanDirectSupabaseBypasses } from "../../../scripts/architecture_anti_regression_suite";
import {
  callDirectorDecideProposalItemsRpc,
  type DirectorDecideProposalItemsRpcArgs,
} from "./director.proposalDecision.transport";

const root = join(__dirname, "..", "..", "..");
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("director proposal decision transport boundary", () => {
  it("keeps director proposal decision orchestration out of provider ownership", () => {
    const proposalSource = read("src/screens/director/director.proposal.ts");
    const detailSource = read("src/screens/director/director.proposal.detail.ts");
    const transportSource = read("src/screens/director/director.proposalDecision.transport.ts");

    expect(proposalSource).toContain('from "./director.proposalDecision.transport"');
    expect(detailSource).toContain('from "./director.proposalDecision.transport"');
    expect(proposalSource).toContain("callDirectorDecideProposalItemsRpc(supabase, {");
    expect(detailSource).toContain("callDirectorDecideProposalItemsRpc(supabase, {");
    expect(proposalSource).toContain("p_finalize: isLast");
    expect(detailSource).toContain("p_finalize: true");
    expect(proposalSource).toContain("Alert.alert");
    expect(detailSource).toContain("Alert.alert");
    expect(proposalSource).not.toContain('supabase.rpc("director_decide_proposal_items"');
    expect(detailSource).not.toContain('supabase.rpc("director_decide_proposal_items"');
    expect(transportSource).toContain('supabase.rpc("director_decide_proposal_items"');
    expect(transportSource).not.toContain("Alert.alert");
    expect(transportSource).not.toContain("recordCatchDiscipline");
  });

  it("keeps the concrete director proposal decision RPC name and payload in transport", async () => {
    const rpcResult = { data: { ok: true }, error: null };
    const rpc = jest.fn(async () => rpcResult);
    const supabase = { rpc } as never;
    const payload: DirectorDecideProposalItemsRpcArgs = {
      p_proposal_id: "proposal-1",
      p_decisions: [
        {
          request_item_id: "request-item-1",
          decision: "rejected",
          comment: "Rejected by director",
        },
      ],
      p_finalize: true,
    };

    const result = await callDirectorDecideProposalItemsRpc(supabase, payload);

    expect(result).toBe(rpcResult);
    expect(rpc).toHaveBeenCalledWith("director_decide_proposal_items", payload);
  });

  it("moves both director proposal decision findings from service bypass to transport-controlled", () => {
    const findings = scanDirectSupabaseBypasses(root);
    const serviceFindings = findings.filter((finding) =>
      [
        "src/screens/director/director.proposal.ts",
        "src/screens/director/director.proposal.detail.ts",
      ].includes(finding.file),
    );
    const transportFindings = findings.filter(
      (finding) => finding.file === "src/screens/director/director.proposalDecision.transport.ts",
    );

    expect(serviceFindings).toEqual([]);
    expect(transportFindings).toEqual([
      expect.objectContaining({
        classification: "transport_controlled",
        operation: "rpc",
        callTarget: "rpc:director_decide_proposal_items",
      }),
    ]);
  });
});
