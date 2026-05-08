import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const functionBody = (source: string, functionName: string) => {
  const match = new RegExp(
    `async function ${functionName}\\([^]*?\\n}\\n`,
  ).exec(source);
  if (!match) throw new Error(`Missing function ${functionName}`);
  return match[0];
};

describe("requests read transport boundary", () => {
  it("keeps concrete request read provider calls behind the typed transport", () => {
    const serviceSource = read("src/lib/api/requests.ts");
    const transportSource = read("src/lib/api/requests.read.transport.ts");

    expect(serviceSource).toContain('from "./requests.read.transport"');
    expect(serviceSource).toContain("selectRequestIdByFilterFromTransport(requestFilterId)");
    expect(serviceSource).toContain(
      "selectRequestRecordByIdFromTransport(requestFilterId, requestReadSelect)",
    );

    expect(functionBody(serviceSource, "selectRequestIdByFilter")).not.toContain('.from("requests")');
    expect(functionBody(serviceSource, "selectRequestRecordById")).not.toContain('.from("requests")');

    expect(transportSource).toContain('client\n    .from("requests")');
    expect(transportSource).toContain('.select("id")');
    expect(transportSource).toContain('.eq("id", requestFilterId)');
    expect(transportSource).toContain(".limit(1)");
    expect(transportSource).toContain(".maybeSingle<RequestIdLookupRow>()");
    expect(transportSource).toContain(".select(requestReadSelect)");
    expect(transportSource).toContain(".maybeSingle()");
  });

  it("leaves request mapping, validation, and mutation provider calls in the service layer", () => {
    const serviceSource = read("src/lib/api/requests.ts");
    const transportSource = read("src/lib/api/requests.read.transport.ts");

    expect(serviceSource).toContain("mapRequestRow(existing.data)");
    expect(serviceSource).toContain("validateRpcResponse");
    expect(serviceSource).toContain('supabase.from("request_items").update(patch)');
    expect(serviceSource).toContain("request_item_add_or_inc");

    expect(transportSource).not.toContain("mapRequestRow");
    expect(transportSource).not.toContain("validateRpcResponse");
    expect(transportSource).not.toContain("request_item_add_or_inc");
    expect(transportSource).not.toContain("request_items");
  });
});
