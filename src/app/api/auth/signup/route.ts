import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { getMongoClientPromise } from "@/lib/mongodb";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(64)
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`signup:${ip}`, 8, 60_000)) {
    return NextResponse.json({ error: "Too many signup attempts" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid signup payload" }, { status: 400 });
  }

  try {
    const client = await getMongoClientPromise();
    const db = client.db();

    const email = parsed.data.email.toLowerCase();
    const existing = await db.collection("users").findOne<{ passwordHash?: string; name?: string }>({ email });

    if (existing?.passwordHash) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await hash(parsed.data.password, 12);
    if (existing) {
      // Existing social-auth user: attach credentials so email/password login can work too.
      await db.collection("users").updateOne(
        { email },
        {
          $set: {
            passwordHash,
            name: existing.name ?? parsed.data.name,
            updatedAt: new Date()
          }
        }
      );
      return NextResponse.json({ success: true, credentialsLinked: true });
    }

    await db.collection("users").insertOne({
      name: parsed.data.name,
      email,
      passwordHash,
      emailVerified: null,
      createdAt: new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup failed:", error);
    return NextResponse.json({ error: "Database connection failed. Please try again." }, { status: 503 });
  }
}
