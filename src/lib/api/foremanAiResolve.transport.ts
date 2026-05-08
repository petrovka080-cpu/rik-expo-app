import { supabase } from "../supabaseClient";

export type ResolveCatalogSynonymRpcInput = {
  terms: string[];
  kind?: string | null;
};

export type ResolveCatalogPackagingRpcInput = {
  rikCode: string;
  packageName: string;
  qty: number;
};

export type ForemanAiResolveFunctionItem = {
  name: string;
  qty: number;
  unit: string;
  kind: string;
  specs?: string | null;
};

export type ForemanAiResolveFunctionInput = {
  prompt: string;
  items: ForemanAiResolveFunctionItem[];
  maxItems: number;
};

export async function callResolveCatalogSynonymRpc(input: ResolveCatalogSynonymRpcInput) {
  return await supabase.rpc("resolve_catalog_synonym_v1" as never, {
    p_terms: input.terms,
    p_kind: input.kind ?? null,
  } as never);
}

export async function callResolveCatalogPackagingRpc(input: ResolveCatalogPackagingRpcInput) {
  return await supabase.rpc("resolve_packaging_v1" as never, {
    p_rik_code: input.rikCode,
    p_package_name: input.packageName,
    p_qty: input.qty,
  } as never);
}

export async function invokeForemanAiResolveFunction(input: ForemanAiResolveFunctionInput) {
  return await supabase.functions.invoke("foreman-ai-resolve", {
    body: {
      prompt: input.prompt,
      items: input.items,
      maxItems: input.maxItems,
    },
    headers: {
      Accept: "application/json",
    },
  });
}
