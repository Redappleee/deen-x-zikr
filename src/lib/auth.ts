import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Email from "next-auth/providers/nodemailer";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { z } from "zod";
import { getMongoClientPromise } from "@/lib/mongodb";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});
const hasDatabase = Boolean(process.env.MONGODB_URI);
const DB_TIMEOUT_MS = 8_000;

async function getMongoWithTimeout() {
  return Promise.race([
    getMongoClientPromise(),
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error("Mongo connection timeout"));
      }, DB_TIMEOUT_MS);
    })
  ]);
}

const providers: Provider[] = [
  Credentials({
    name: "Email and Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(rawCredentials) {
      if (!hasDatabase) {
        return null;
      }

      try {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const client = await getMongoWithTimeout();
        const db = client.db();
        const user = await db.collection("users").findOne<{ _id: string; email: string; passwordHash?: string; name?: string }>({
          email: parsed.data.email.toLowerCase()
        });

        if (!user?.passwordHash) {
          return null;
        }

        const match = await compare(parsed.data.password, user.passwordHash);
        if (!match) {
          return null;
        }

        return {
          id: String(user._id),
          email: user.email,
          name: user.name ?? "Believer"
        };
      } catch (error) {
        console.error("Credentials authorize failed:", error);
        return null;
      }
    }
  })
];

if (hasDatabase && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
  providers.push(
    Email({
      server: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      },
      from: process.env.SMTP_FROM
    })
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  debug: process.env.NODE_ENV !== "production",
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth"
  },
  providers,
  callbacks: {
    async redirect({ url, baseUrl }) {
      const target = url.startsWith("/") ? `${baseUrl}${url}` : url;
      const safeTarget = target.startsWith(baseUrl) ? target : baseUrl;
      const parsed = new URL(safeTarget);

      // Prevent OAuth callback loops back into the sign-in page.
      if (parsed.pathname === "/auth") {
        return `${baseUrl}/dashboard`;
      }

      return safeTarget;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  }
});
