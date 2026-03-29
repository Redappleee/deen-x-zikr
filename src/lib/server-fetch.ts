import { z } from "zod";

const fetchSchema = z.object({
  url: z.string().url(),
  revalidate: z.number().min(1).max(86_400).default(3_600),
  tags: z.array(z.string()).optional(),
  timeoutMs: z.number().int().min(1_000).max(60_000).default(15_000)
});

export async function cachedJson<T>(params: z.input<typeof fetchSchema>): Promise<T> {
  const { url, revalidate, tags, timeoutMs } = fetchSchema.parse(params);

  const response = await fetch(url, {
    next: {
      revalidate,
      tags
    },
    headers: {
      "User-Agent": "DeenXZikr/1.0"
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Upstream request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
