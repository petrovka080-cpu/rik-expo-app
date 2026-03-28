import type { User } from "@supabase/supabase-js";

import { ensureMyProfile, getMyRole } from "./api/profile";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "./observability/platformObservability";
import { supabase } from "./supabaseClient";

type SessionRoleSource = "session_metadata" | "rpc" | "rpc_after_profile" | "none";

export type SessionRoleResolution = {
  userId: string | null;
  role: string | null;
  source: SessionRoleSource;
  profileEnsured: boolean;
};

type ResolveCurrentSessionRoleOptions = {
  user?: User | null;
  ensureProfile?: boolean;
  forceRefresh?: boolean;
  joinInflight?: boolean;
  trigger?: string;
};

type InflightSessionRoleResolution = {
  userId: string;
  ensureProfile: boolean;
  promise: Promise<SessionRoleResolution>;
};

const SESSION_ROLE_SCREEN = "profile";
const SESSION_ROLE_SURFACE = "session_role";
const trimText = (value: unknown) => String(value ?? "").trim();
const normalizeRole = (value: unknown) => {
  const normalized = trimText(value).toLowerCase();
  return normalized || null;
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readRoleFromUserMetadata = (user: User | null | undefined) => {
  if (!user) return null;
  const appMetadata = asObject(user.app_metadata);
  const userMetadata = asObject(user.user_metadata);
  return normalizeRole(appMetadata?.role) || normalizeRole(userMetadata?.role);
};

const createResolution = (
  userId: string | null,
  role: string | null,
  source: SessionRoleSource,
  profileEnsured: boolean,
): SessionRoleResolution => ({
  userId,
  role,
  source,
  profileEnsured,
});

let cachedResolution: SessionRoleResolution | null = null;
let inflightResolution: InflightSessionRoleResolution | null = null;
let inflightWarmup:
  | {
      userId: string;
      promise: Promise<SessionRoleResolution>;
    }
  | null = null;

const isCachedResolutionUsable = (
  resolution: SessionRoleResolution | null,
  userId: string,
  ensureProfile: boolean,
) => Boolean(resolution && resolution.userId === userId && (!ensureProfile || resolution.profileEnsured));

const cacheResolution = (resolution: SessionRoleResolution) => {
  cachedResolution = resolution.userId ? resolution : null;
  return resolution;
};

async function readSessionUser(providedUser?: User | null): Promise<User | null> {
  if (typeof providedUser !== "undefined") return providedUser;
  const sessionResult = await supabase.auth.getSession();
  return sessionResult.data.session?.user ?? null;
}

async function resolveRoleViaRpcPath(
  user: User,
  ensureProfile: boolean,
): Promise<SessionRoleResolution> {
  const userId = trimText(user.id) || null;
  const sessionRole = readRoleFromUserMetadata(user);
  if (!userId) return createResolution(null, sessionRole, sessionRole ? "session_metadata" : "none", false);

  if (sessionRole && !ensureProfile) {
    return createResolution(userId, sessionRole, "session_metadata", false);
  }

  const rpcRole = normalizeRole(await getMyRole());
  if (rpcRole) return createResolution(userId, rpcRole, "rpc", false);

  if (ensureProfile) {
    await ensureMyProfile();
    const ensuredRole = normalizeRole(await getMyRole());
    if (ensuredRole) return createResolution(userId, ensuredRole, "rpc_after_profile", true);
  }

  return createResolution(userId, sessionRole, sessionRole ? "session_metadata" : "none", ensureProfile);
}

export function clearCurrentSessionRoleCache() {
  cachedResolution = null;
  inflightResolution = null;
  inflightWarmup = null;
}

export async function resolveCurrentSessionRole(
  options: ResolveCurrentSessionRoleOptions = {},
): Promise<SessionRoleResolution> {
  const ensureProfile = options.ensureProfile === true;
  const joinInflight = options.joinInflight !== false;
  const trigger = trimText(options.trigger) || "unknown";
  const user = await readSessionUser(options.user);
  const userId = trimText(user?.id) || null;

  if (!userId || !user) {
    clearCurrentSessionRoleCache();
    return createResolution(null, null, "none", false);
  }

  if (!options.forceRefresh && isCachedResolutionUsable(cachedResolution, userId, ensureProfile)) {
    recordPlatformObservability({
      screen: SESSION_ROLE_SCREEN,
      surface: SESSION_ROLE_SURFACE,
      category: "fetch",
      event: "resolve_session_role",
      result: "cache_hit",
      extra: {
        trigger,
        userId,
        source: cachedResolution?.source ?? "none",
        profileEnsured: cachedResolution?.profileEnsured ?? false,
      },
    });
    return cachedResolution as SessionRoleResolution;
  }

  if (
    joinInflight
    && inflightResolution
    && inflightResolution.userId === userId
    && (!ensureProfile || inflightResolution.ensureProfile)
  ) {
    recordPlatformObservability({
      screen: SESSION_ROLE_SCREEN,
      surface: SESSION_ROLE_SURFACE,
      category: "fetch",
      event: "resolve_session_role",
      result: "joined_inflight",
      extra: {
        trigger,
        userId,
        ensureProfile,
      },
    });
    return inflightResolution.promise;
  }

  const observation = beginPlatformObservability({
    screen: SESSION_ROLE_SCREEN,
    surface: SESSION_ROLE_SURFACE,
    category: "fetch",
    event: "resolve_session_role",
    extra: {
      trigger,
      userId,
      ensureProfile,
    },
  });

  const promise = resolveRoleViaRpcPath(user, ensureProfile)
    .then((resolution) => {
      const cached = cacheResolution(resolution);
      observation.success({
        extra: {
          trigger,
          userId,
          source: cached.source,
          profileEnsured: cached.profileEnsured,
        },
      });
      return cached;
    })
    .catch((error) => {
      observation.error(error, {
        errorStage: ensureProfile ? "resolve_role_with_profile" : "resolve_role",
        extra: {
          trigger,
          userId,
          ensureProfile,
        },
      });
      throw error;
    })
    .finally(() => {
      if (inflightResolution?.promise === promise) {
        inflightResolution = null;
      }
    });

  inflightResolution = { userId, ensureProfile, promise };
  return promise;
}

export async function warmCurrentSessionProfile(trigger = "unknown"): Promise<SessionRoleResolution> {
  const user = await readSessionUser();
  const userId = trimText(user?.id) || null;
  if (!userId || !user) {
    clearCurrentSessionRoleCache();
    return createResolution(null, null, "none", false);
  }

  if (cachedResolution?.userId === userId && cachedResolution.profileEnsured) {
    recordPlatformObservability({
      screen: SESSION_ROLE_SCREEN,
      surface: SESSION_ROLE_SURFACE,
      category: "fetch",
      event: "warm_session_profile",
      result: "cache_hit",
      extra: {
        trigger,
        userId,
        source: cachedResolution.source,
      },
    });
    return cachedResolution;
  }

  if (inflightWarmup?.userId === userId) {
    recordPlatformObservability({
      screen: SESSION_ROLE_SCREEN,
      surface: SESSION_ROLE_SURFACE,
      category: "fetch",
      event: "warm_session_profile",
      result: "joined_inflight",
      extra: {
        trigger,
        userId,
      },
    });
    return inflightWarmup.promise;
  }

  const observation = beginPlatformObservability({
    screen: SESSION_ROLE_SCREEN,
    surface: SESSION_ROLE_SURFACE,
    category: "fetch",
    event: "warm_session_profile",
    extra: {
      trigger,
      userId,
    },
  });

  const promise = resolveRoleViaRpcPath(user, true)
    .then((resolution) => {
      const cached = cacheResolution(resolution);
      observation.success({
        extra: {
          trigger,
          userId,
          source: cached.source,
          profileEnsured: cached.profileEnsured,
        },
      });
      return cached;
    })
    .catch((error) => {
      observation.error(error, {
        errorStage: "warm_session_profile",
        extra: {
          trigger,
          userId,
        },
      });
      throw error;
    })
    .finally(() => {
      if (inflightWarmup?.promise === promise) {
        inflightWarmup = null;
      }
    });

  inflightWarmup = { userId, promise };
  return promise;
}
