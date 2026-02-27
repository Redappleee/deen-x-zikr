const bucket = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, limit = 50, windowMs = 60_000): boolean {
  const now = Date.now();
  const state = bucket.get(key);

  if (!state || state.resetAt < now) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (state.count >= limit) {
    return true;
  }

  state.count += 1;
  bucket.set(key, state);
  return false;
}
