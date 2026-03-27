export type RealtimeScope = "buyer" | "accountant" | "warehouse";

export type RealtimeChannelBinding = {
  key: string;
  table: string;
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
  schema?: "public";
  owner: string;
};

export const BUYER_REALTIME_CHANNEL_NAME = "buyer:screen:realtime";
export const ACCOUNTANT_REALTIME_CHANNEL_NAME = "accountant:screen:realtime";
export const WAREHOUSE_REALTIME_CHANNEL_NAME = "warehouse:screen:realtime";

export const BUYER_REALTIME_BINDINGS: readonly RealtimeChannelBinding[] = [
  {
    key: "buyer_notifications",
    table: "notifications",
    event: "INSERT",
    filter: "role=eq.buyer",
    schema: "public",
    owner: "table:notifications",
  },
  {
    key: "buyer_requests_approved",
    table: "requests",
    event: "UPDATE",
    schema: "public",
    owner: "table:requests",
  },
  {
    key: "buyer_proposals_terminal",
    table: "proposals",
    event: "UPDATE",
    schema: "public",
    owner: "table:proposals",
  },
];

export const ACCOUNTANT_REALTIME_BINDINGS: readonly RealtimeChannelBinding[] = [
  {
    key: "accountant_notifications",
    table: "notifications",
    event: "INSERT",
    filter: "role=eq.accountant",
    schema: "public",
    owner: "table:notifications",
  },
  {
    key: "accountant_proposals_sent",
    table: "proposals",
    event: "UPDATE",
    schema: "public",
    owner: "table:proposals",
  },
  {
    key: "accountant_payments_created",
    table: "proposal_payments",
    event: "INSERT",
    schema: "public",
    owner: "table:proposal_payments",
  },
  {
    key: "accountant_payments_updated",
    table: "proposal_payments",
    event: "UPDATE",
    schema: "public",
    owner: "table:proposal_payments",
  },
];

export const WAREHOUSE_REALTIME_BINDINGS: readonly RealtimeChannelBinding[] = [
  {
    key: "warehouse_incoming_items",
    table: "wh_incoming_items",
    event: "*",
    schema: "public",
    owner: "table:wh_incoming_items",
  },
  {
    key: "warehouse_requests",
    table: "requests",
    event: "*",
    schema: "public",
    owner: "table:requests",
  },
  {
    key: "warehouse_request_items",
    table: "request_items",
    event: "*",
    schema: "public",
    owner: "table:request_items",
  },
];
