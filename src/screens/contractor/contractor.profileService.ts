import { beginPlatformObservability } from "../../lib/observability/platformObservability";
import { resolveCurrentContractorUserId } from "./contractor.profileService.auth.transport";

export type ContractorUserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  inn: string | null;
  company: string | null;
  is_contractor: boolean;
};

export type ContractorProfileCard = {
  id: string;
  company_name: string | null;
  full_name: string | null;
  phone: string | null;
  inn: string | null;
};

const CONTRACTOR_USER_PROFILE_SELECT =
  "user_id,full_name,phone,is_contractor";
const CONTRACTOR_PROFILE_SELECT =
  "id,company_name,full_name,phone,inn";

export async function loadCurrentContractorUserProfile(params: {
  supabaseClient: any;
  normText: (value: any) => string;
}): Promise<ContractorUserProfile | null> {
  const { supabaseClient, normText } = params;
  const observation = beginPlatformObservability({
    screen: "contractor",
    surface: "profile_card",
    category: "fetch",
    event: "load_user_profile",
    sourceKind: "auth+table:user_profiles",
  });
  const userId = await resolveCurrentContractorUserId({ supabaseClient });
  const user = userId ? { id: userId } : null;
  if (!user) {
    observation.success({ rowCount: 0 });
    return null;
  }

  const { data } = await supabaseClient
    .from("user_profiles")
    .select(CONTRACTOR_USER_PROFILE_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) {
    observation.success({ rowCount: 0 });
    return null;
  }

  const result = {
    id: user.id,
    full_name: normText(data.full_name) || null,
    phone: normText(data.phone) || null,
    inn: String(data.inn || "").replace(/\D+/g, "") || null,
    company: normText(data.company) || null,
    is_contractor: data.is_contractor === true,
  };
  observation.success({ rowCount: 1 });
  return result;
}

export async function loadCurrentContractorProfile(params: {
  supabaseClient: any;
  normText: (value: any) => string;
}): Promise<ContractorProfileCard | null> {
  const { supabaseClient, normText } = params;
  const observation = beginPlatformObservability({
    screen: "contractor",
    surface: "profile_card",
    category: "fetch",
    event: "load_contractor_profile",
    sourceKind: "auth+table:contractors",
  });
  const userId = await resolveCurrentContractorUserId({ supabaseClient });
  const user = userId ? { id: userId } : null;
  if (!user) {
    observation.success({ rowCount: 0 });
    return null;
  }

  const { data, error } = await supabaseClient
    .from("contractors")
    .select(CONTRACTOR_PROFILE_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    if (__DEV__) console.error("[contractor] loadContractor error:", error.message);
    observation.error(error, {
      rowCount: 0,
      errorStage: "table:contractors",
    });
  }
  if (!data) {
    if (!error || error.code === "PGRST116") {
      observation.success({ rowCount: 0 });
    }
    return null;
  }

  const result = {
    id: data.id,
    company_name: normText(data.company_name) || null,
    full_name: normText(data.full_name) || null,
    phone: normText(data.phone) || null,
    inn: String(data.inn || "").replace(/\D+/g, "") || null,
  };
  observation.success({ rowCount: 1 });
  return result;
}

export async function activateCurrentUserAsContractor(params: {
  supabaseClient: any;
}): Promise<void> {
  const { supabaseClient } = params;
  const userId = await resolveCurrentContractorUserId({ supabaseClient });
  const user = userId ? { id: userId } : null;
  if (!user) throw new Error("Пользователь не авторизован");

  const { error } = await supabaseClient
    .from("user_profiles")
    .update({ is_contractor: true })
    .eq("user_id", user.id);

  if (error) throw error;
}
