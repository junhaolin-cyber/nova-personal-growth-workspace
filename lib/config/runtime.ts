/**
 * Centralized runtime switches. Keep providers disabled until their
 * implementation is intentionally introduced in a later phase.
 */

const envBoolean = (value: string | undefined, fallback = false) => value === undefined ? fallback : value === "true";

export const runtimeConfig = {
  authEnabled: envBoolean(process.env.NEXT_PUBLIC_AUTH_ENABLED),
  cloudDatabaseEnabled: envBoolean(process.env.NEXT_PUBLIC_CLOUD_DATABASE_ENABLED),
  syncEnabled: envBoolean(process.env.NEXT_PUBLIC_SYNC_ENABLED),
  pwaEnabled: envBoolean(process.env.NEXT_PUBLIC_PWA_ENABLED),
} as const;

