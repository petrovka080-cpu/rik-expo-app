import { supabase } from "../supabaseClient";

export type SignInWithEmailPasswordParams = {
  email: string;
  password: string;
};

export type SignInWithEmailPasswordResult = Awaited<
  ReturnType<(typeof supabase)["auth"]["signInWithPassword"]>
>;

export async function signInWithEmailPassword(
  params: SignInWithEmailPasswordParams,
): Promise<SignInWithEmailPasswordResult> {
  return await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });
}
