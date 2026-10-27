import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabaseClient";
import { DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME } from "../../lib/realtime/realtime.channels";

export const setDirectorRealtimeAuth = async (
  accessToken: string,
): Promise<void> => {
  await supabase.realtime.setAuth(accessToken);
};

export const createDirectorScreenRealtimeChannel = (): RealtimeChannel =>
  supabase.channel(DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME, {
    config: {
      broadcast: {
        ack: false,
        self: false,
      },
    },
  });

export const removeDirectorRealtimeChannel = (
  channel: RealtimeChannel,
): ReturnType<typeof supabase.removeChannel> => supabase.removeChannel(channel);
