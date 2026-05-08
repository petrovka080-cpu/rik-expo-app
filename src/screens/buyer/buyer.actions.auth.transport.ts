type BuyerActionsAuthUserResponse = {
  data?: {
    user?: {
      user_metadata?: Record<string, unknown> | null;
    } | null;
  } | null;
};

type BuyerActionsAuthClient = {
  auth: {
    getUser: () => Promise<BuyerActionsAuthUserResponse>;
  };
};

function readTrimmedMetadataString(
  metadata: Record<string, unknown>,
  key: "full_name" | "name",
): string {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

export function resolveBuyerActionFioFromMetadata(
  metadata: unknown,
  fallback: string,
): string {
  if (!metadata || typeof metadata !== "object") return fallback;
  const record = metadata as Record<string, unknown>;
  return (
    readTrimmedMetadataString(record, "full_name") ||
    readTrimmedMetadataString(record, "name") ||
    fallback
  );
}

export async function loadBuyerActionFioCandidate(params: {
  supabase: BuyerActionsAuthClient;
  fallback: string;
}): Promise<string> {
  const { data } = await params.supabase.auth.getUser();
  return resolveBuyerActionFioFromMetadata(
    data?.user?.user_metadata,
    params.fallback,
  );
}
