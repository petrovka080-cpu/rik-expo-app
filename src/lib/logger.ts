/**
 * Centralized production logging boundary.
 *
 * Rules:
 * - In development (__DEV__ === true): delegates to console.* for DX
 * - In production (__DEV__ === false): silent — production events go through
 *   recordPlatformObservability / recordCatchDiscipline, not through console
 * - Business code should never call raw console.* directly in production paths
 *
 * This module is the **single owner** of console output for touched production code.
 */

import { redactSensitiveValue } from "./security/redaction";

const isDev =
  typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";

const redactArgs = (args: unknown[]) => args.map((arg) => redactSensitiveValue(arg));

export const logger = {
  /**
   * Informational trace — dev only.
   * In production, these are silent. Use structured observability for prod events.
   */
  info(tag: string, ...args: unknown[]): void {
    if (isDev) console.info(`[${tag}]`, ...redactArgs(args));
  },

  /**
   * Warning trace — dev only.
   * In production, these are silent. Use structured observability for prod warnings.
   */
  warn(tag: string, ...args: unknown[]): void {
    if (isDev) console.warn(`[${tag}]`, ...redactArgs(args));
  },

  /**
   * Error trace — dev only.
   * In production, errors should be captured via recordCatchDiscipline / logError,
   * not through raw console.error.
   */
  error(tag: string, ...args: unknown[]): void {
    if (isDev) console.error(`[${tag}]`, ...redactArgs(args));
  },
} as const;
