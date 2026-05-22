import {
  assertGlobalEstimateResultSafe,
  calculateGlobalConstructionEstimate,
  type GlobalEstimateInput,
} from "../../../src/lib/ai/globalEstimate";

declare const Deno: {
  serve?: (handler: (request: Request) => Response | Promise<Response>) => void;
} | undefined;

export async function calculateEstimateForRequest(input: GlobalEstimateInput) {
  const result = await calculateGlobalConstructionEstimate(input);
  assertGlobalEstimateResultSafe(result);
  return result;
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const input = await request.json() as GlobalEstimateInput;
  const result = await calculateEstimateForRequest(input);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

if (typeof Deno !== "undefined" && Deno.serve) {
  Deno.serve(handler);
}
