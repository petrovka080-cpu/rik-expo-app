import {
  enqueueGlobalEstimateSourceRefresh,
  markGlobalEstimateSourceRefreshCacheWritten,
  type GlobalEstimateSourceRefreshMode,
} from "../../../src/lib/ai/globalEstimate";

declare const Deno: {
  serve?: (handler: (request: Request) => Response | Promise<Response>) => void;
} | undefined;

export async function refreshGlobalEstimateSource(input: {
  sourceId: string;
  mode: GlobalEstimateSourceRefreshMode;
}) {
  const queued = enqueueGlobalEstimateSourceRefresh(input);
  return markGlobalEstimateSourceRefreshCacheWritten(queued);
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }
  const input = await request.json() as {
    sourceId?: string;
    mode?: GlobalEstimateSourceRefreshMode;
  };
  if (!input.sourceId || !input.mode) {
    return new Response(JSON.stringify({ error: "SOURCE_ID_AND_MODE_REQUIRED" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const result = await refreshGlobalEstimateSource({
    sourceId: input.sourceId,
    mode: input.mode,
  });
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

if (typeof Deno !== "undefined" && Deno.serve) {
  Deno.serve(handler);
}
