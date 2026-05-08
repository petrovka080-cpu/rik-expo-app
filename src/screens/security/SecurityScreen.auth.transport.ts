import { supabase } from "../../lib/supabaseClient";

export type SecurityTotpVerifyParams = {
  factorId: string;
  challengeId: string;
  code: string;
};

export const SECURITY_TOTP_FRIENDLY_NAME = "РћСЃРЅРѕРІРЅРѕРµ СѓСЃС‚СЂРѕР№СЃС‚РІРѕ";

export function enrollSecurityTotpFactor() {
  return supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: SECURITY_TOTP_FRIENDLY_NAME,
  });
}

export function challengeSecurityTotpFactor(factorId: string) {
  return supabase.auth.mfa.challenge({ factorId });
}

export function verifySecurityTotpFactor(params: SecurityTotpVerifyParams) {
  return supabase.auth.mfa.verify(params);
}

export function unenrollSecurityTotpFactor(factorId: string) {
  return supabase.auth.mfa.unenroll({ factorId });
}
