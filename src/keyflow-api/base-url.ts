/** KeyFlow server base URL. `NEXT_PUBLIC_BASE_URL` overrides the production default. */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://www.keyflow.me';
}
