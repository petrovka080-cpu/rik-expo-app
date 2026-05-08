import type { RealtimeChannel } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import {
  DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME,
  DIRECTOR_HANDOFF_BROADCAST_EVENT,
} from "../realtime/realtime.channels";
import { supabase } from "../supabaseClient";

export type RequestDraftSyncArgsV2 =
  Database["public"]["Functions"]["request_sync_draft_v2"]["Args"];
export type RequestDraftSyncReturns =
  Database["public"]["Functions"]["request_sync_draft_v2"]["Returns"];

export type DirectorHandoffBroadcastChannel = RealtimeChannel;

export const setRequestDraftSyncRealtimeAuth = async (
  accessToken: string,
): Promise<void> => {
  await supabase.realtime.setAuth(accessToken);
};

export const createDirectorHandoffBroadcastChannel =
  (): DirectorHandoffBroadcastChannel =>
    supabase.channel(DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME, {
      config: {
        broadcast: {
          ack: false,
          self: false,
        },
      },
    });

export const sendDirectorHandoffBroadcast = (
  channel: DirectorHandoffBroadcastChannel,
  params: {
    requestId: string;
    displayNo: string;
    sourcePath: string | null;
  },
): Promise<"ok" | "timed out" | "error"> =>
  channel.send({
    type: "broadcast",
    event: DIRECTOR_HANDOFF_BROADCAST_EVENT,
    payload: {
      request_id: params.requestId,
      display_no: params.displayNo,
      source_path: params.sourcePath,
    },
  });

export const removeDirectorHandoffBroadcastChannel = (
  channel: DirectorHandoffBroadcastChannel,
): Promise<"ok" | "timed out" | "error"> => supabase.removeChannel(channel);

export const insertDirectorRequestSubmittedNotification = (params: {
  requestId: string;
  displayNo: string;
  sourcePath: string | null;
}) =>
  supabase.from("notifications").insert({
    role: "director",
    title: `Новая заявка ${params.displayNo}`,
    body: `Прораб отправил ${params.displayNo} на утверждение.`,
    payload: {
      request_id: params.requestId,
      display_no: params.displayNo,
      source_path: params.sourcePath,
    },
  });

export const invokeRequestDraftSyncRpcV2 = (args: RequestDraftSyncArgsV2) =>
  supabase.rpc("request_sync_draft_v2", args);
