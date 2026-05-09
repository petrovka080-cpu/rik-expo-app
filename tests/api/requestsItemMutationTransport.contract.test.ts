import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const functionBody = (source: string, functionName: string) => {
  const match = new RegExp(
    `(?:export\\s+)?(?:async\\s+)?function ${functionName}\\([^]*?\\n}\\n`,
  ).exec(source);
  if (!match) throw new Error(`Missing function ${functionName}`);
  return match[0];
};

describe("requests item mutation transport boundary", () => {
  it("moves concrete request item provider calls out of requests service", () => {
    const serviceSource = read("src/lib/api/requests.ts");
    const transportSource = read("src/lib/api/requests.itemMutations.transport.ts");

    expect(serviceSource).toContain('from "./requests.itemMutations.transport"');
    expect(serviceSource).not.toContain('from "../supabaseClient"');
    expect(serviceSource).not.toMatch(/\bsupabase\.(rpc|from)\s*\(/);

    expect(functionBody(serviceSource, "buildRequestItemAddOrIncArgs")).toContain(
      "p_request_id: normalizeRequestFilterId(requestId)",
    );
    expect(functionBody(serviceSource, "buildRequestItemMetaPatch")).toContain(
      "status: REQUEST_DRAFT_STATUS",
    );
    expect(functionBody(serviceSource, "patchRequestItemMeta")).toContain(
      "updateRequestItemMetaFromTransport(itemId, patch)",
    );
    expect(functionBody(serviceSource, "addRequestItemFromRikDetailed")).toContain(
      "addOrIncrementRequestItemFromTransport(",
    );
    expect(functionBody(serviceSource, "addRequestItemFromRikDetailed")).toContain(
      'rpcName: "request_item_add_or_inc"',
    );

    expect(transportSource).toContain('import { supabase } from "../supabaseClient"');
    expect(transportSource).toContain(
      'return await supabase.rpc("request_item_add_or_inc", args);',
    );
    expect(transportSource).toContain(
      'return await supabase.from("request_items").update(patch).eq("id", itemId);',
    );
  });
});
