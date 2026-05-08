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

export type ContractorAuthChangeSession = { user?: unknown } | null;
export type ContractorAuthStateChangeCallback = (
  event: string,
  session: ContractorAuthChangeSession,
) => void;

type ContractorAuthStateChangeResponse = {
  data: {
    subscription: {
      unsubscribe: () => void;
    };
  };
};

type ContractorAuthStateChangeClient = {
  auth: {
    onAuthStateChange: (
      callback: ContractorAuthStateChangeCallback,
    ) => ContractorAuthStateChangeResponse;
  };
};

export async function hasCurrentContractorSessionUser(params: {
  supabaseClient: ContractorSessionAuthClient;
}): Promise<boolean> {
  const { data: sessionData } = await params.supabaseClient.auth.getSession();
  return Boolean(sessionData?.session?.user);
}

export function listenForContractorAuthStateChanges(params: {
  supabaseClient: ContractorAuthStateChangeClient;
  onChange: ContractorAuthStateChangeCallback;
}): ContractorAuthStateChangeResponse {
  return params.supabaseClient.auth.onAuthStateChange(params.onChange);
}
