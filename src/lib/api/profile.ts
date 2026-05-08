import {
  isRpcIgnoredMutationResponse,
  isRpcNonEmptyStringResponse,
  validateRpcResponse,
} from "./queryBoundary";
import { callEnsureMyProfileRpc, callGetMyRoleRpc } from "./profile.transport";

export const isEnsureMyProfileRpcResponse = isRpcIgnoredMutationResponse;
export const isGetMyRoleRpcResponse = isRpcNonEmptyStringResponse;

export async function ensureMyProfile(): Promise<boolean> {
  const { data, error } = await callEnsureMyProfileRpc();
  if (error) {
    if (__DEV__) {
      console.warn("[ensureMyProfile]", error.message);
    }
    return false;
  }
  try {
    validateRpcResponse(data, isEnsureMyProfileRpcResponse, {
      rpcName: "ensure_my_profile",
      caller: "src/lib/api/profile.ensureMyProfile",
      domain: "unknown",
    });
  } catch (validationError) {
    if (__DEV__) {
      console.warn(
        "[ensureMyProfile]",
        validationError instanceof Error ? validationError.message : String(validationError),
      );
    }
    return false;
  }
  return true;
}

export async function getMyRole(): Promise<string | null> {
  const { data, error } = await callGetMyRoleRpc();
  if (error) {
    if (__DEV__) {
      console.warn("[getMyRole]", error.message);
    }
    return null;
  }
  if (data == null) return null;
  try {
    return validateRpcResponse(data, isGetMyRoleRpcResponse, {
      rpcName: "get_my_role",
      caller: "src/lib/api/profile.getMyRole",
      domain: "unknown",
    });
  } catch (validationError) {
    if (__DEV__) {
      console.warn(
        "[getMyRole]",
        validationError instanceof Error ? validationError.message : String(validationError),
      );
    }
    return null;
  }
}
