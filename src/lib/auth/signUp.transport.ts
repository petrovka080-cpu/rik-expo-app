import { supabase } from "../supabaseClient";

export type SignUpWithEmailPasswordParams = {
  email: string;
  password: string;
};

export type SignUpWithEmailPasswordResult = Awaited<
  ReturnType<(typeof supabase)["auth"]["signUp"]>
>;

export async function signUpWithEmailPassword(
  params: SignUpWithEmailPasswordParams,
): Promise<SignUpWithEmailPasswordResult> {
  return await supabase.auth.signUp({
    email: params.email,
    password: params.password,
  });
}
