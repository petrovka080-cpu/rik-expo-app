import { supabase } from "../supabaseClient";

export type PasswordResetEmailParams = {
  email: string;
  redirectTo?: string;
};

export type PasswordResetEmailResult = Awaited<
  ReturnType<(typeof supabase)["auth"]["resetPasswordForEmail"]>
>;

export async function requestPasswordResetEmail(
  params: PasswordResetEmailParams,
): Promise<PasswordResetEmailResult> {
  return await supabase.auth.resetPasswordForEmail(params.email, {
    redirectTo: params.redirectTo,
  });
}
