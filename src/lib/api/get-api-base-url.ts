/**
 * Backend origin for loyalty-service-wrh (default port 8081 in application.yml).
 * Without this, unset NEXT_PUBLIC_API_BASE_URL sends /api/v1/* to Next.js → 404.
 */
export function getApiBaseUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:8081";
  }
  return undefined;
}
