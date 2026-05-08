type BuyerAutoFioAuthUserResponse = {
  data?: {
    user?: {
      user_metadata?: Record<string, unknown> | null;
    } | null;
  } | null;
};

type BuyerAutoFioAuthClient = {
  auth: {
    getUser: () => Promise<BuyerAutoFioAuthUserResponse>;
  };
};

function readTrimmedMetadataString(
  metadata: Record<string, unknown>,
  key: "full_name" | "name",
): string {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

export function resolveBuyerAutoFioFromMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return "";
  const record = metadata as Record<string, unknown>;
  return (
    readTrimmedMetadataString(record, "full_name") ||
    readTrimmedMetadataString(record, "name")
  );
}

export async function loadBuyerAutoFioCandidate(params: {
  supabase: BuyerAutoFioAuthClient;
}): Promise<string> {
  const { data } = await params.supabase.auth.getUser();
  return resolveBuyerAutoFioFromMetadata(data?.user?.user_metadata);
}
