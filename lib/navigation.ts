/** Keep post-login navigation on this application's origin. */
export function getSafeRedirect(value: string | null, origin: string): string {
  try {
    const target = new URL(value || "/", origin);
    return target.origin === new URL(origin).origin
      ? target.pathname + target.search + target.hash
      : "/";
  } catch {
    return "/";
  }
}
