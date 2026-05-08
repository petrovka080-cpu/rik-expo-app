type MapScreenAuthUser = {
  id: string;
};

type MapScreenAuthUserResponse = {
  data?: {
    user?: MapScreenAuthUser | null;
  } | null;
};

type MapScreenAuthClient = {
  auth: {
    getUser: () => Promise<MapScreenAuthUserResponse>;
  };
};

export async function loadMapScreenCurrentAuthUser(params: {
  supabase: MapScreenAuthClient;
}): Promise<MapScreenAuthUser | null> {
  const result = await params.supabase.auth.getUser();
  return result.data?.user ?? null;
}
