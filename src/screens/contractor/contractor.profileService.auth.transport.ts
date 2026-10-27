type ContractorAuthUserResponse = {
  data?: {
    user?: {
      id?: unknown;
    } | null;
  } | null;
};

type ContractorAuthClient = {
  auth: {
    getUser: () => Promise<ContractorAuthUserResponse>;
  };
};

export async function resolveCurrentContractorUserId(params: {
  supabaseClient: ContractorAuthClient;
}): Promise<string | null> {
  const { data: auth } = await params.supabaseClient.auth.getUser();
  const userId = String(auth?.user?.id ?? "").trim();
  return userId || null;
}
