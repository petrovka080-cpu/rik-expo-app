import { createContext, useContext } from "react";

export type AuthAssuranceActions = {
  userId: string | null;
  required: boolean;
  recheck: () => Promise<boolean>;
  signOut: () => Promise<boolean>;
};
export const AuthAssuranceContext = createContext<AuthAssuranceActions | null>(null);
export function useAuthAssuranceActions() {
  const value = useContext(AuthAssuranceContext);
  if (!value) throw new Error("AUTH_ASSURANCE_OWNER_REQUIRED");
  return value;
}
