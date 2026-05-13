import {
  createAiActionLedgerRepository,
  type AiActionLedgerPersistentBackend,
  type AiActionLedgerRepository,
} from "./aiActionLedgerRepository";
import {
  createAiActionLedgerRpcBackend,
  resolveAiActionLedgerRpcBackendReadiness,
  type AiActionLedgerRpcBackendOptions,
  type AiActionLedgerRpcBackendReadiness,
} from "./aiActionLedgerRpcBackend";

export type AiActionLedgerRpcRepositoryMount = {
  readiness: AiActionLedgerRpcBackendReadiness & {
    serverSideOnly: true;
    authRequired: true;
    roleResolvedServerSide: true;
    evidenceRequired: true;
    auditRequired: true;
    redactedPayloadOnly: true;
    serviceRoleFromMobile: false;
  };
  backend: AiActionLedgerPersistentBackend | null;
  repository: AiActionLedgerRepository;
};

export function createAiActionLedgerRpcRepository(
  options: AiActionLedgerRpcBackendOptions,
): AiActionLedgerRpcRepositoryMount {
  const readiness = resolveAiActionLedgerRpcBackendReadiness(options);
  const backend = createAiActionLedgerRpcBackend(options);
  return {
    readiness: {
      ...readiness,
      serverSideOnly: true,
      authRequired: true,
      roleResolvedServerSide: true,
      evidenceRequired: true,
      auditRequired: true,
      redactedPayloadOnly: true,
      serviceRoleFromMobile: false,
    },
    backend,
    repository: createAiActionLedgerRepository(backend),
  };
}
