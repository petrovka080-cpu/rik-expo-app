type ContractorAuthSessionResponse = {
  data?: {
    session?: {
      user?: unknown;
    } | null;
  } | null;
};

type ContractorSessionAuthClient = {
  auth: {
    getSession: () => Promise<ContractorAuthSessionResponse>;
  };
};

export async function hasCurrentContractorSessionUser(params: {
  supabaseClient: ContractorSessionAuthClient;
}): Promise<boolean> {
  const { data: sessionData } = await params.supabaseClient.auth.getSession();
  return Boolean(sessionData?.session?.user);
}
