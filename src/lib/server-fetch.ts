import { z } from "zod";

const fetchSchema = z.object({
  url: z.string().url(),
  revalidate: z.number().min(1).max(86_400).default(3_600),
  tags: z.array(z.string()).optional()
});

export async function cachedJson<T>(params: z.infer<typeof fetchSchema>): Promise<T> {
  const { url, revalidate, tags } = fetchSchema.parse(params);

  const response = await fetch(url, {
    next: {
      revalidate,
      tags
    },
    headers: {
      "User-Agent": "DeenXZikr/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Upstream request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
