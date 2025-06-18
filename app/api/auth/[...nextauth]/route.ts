import type { DefaultSession } from "next-auth";
import NextAuth from "next-auth/next";

import { z } from "zod";
import { authOptions } from "@/lib/auth";

const envSchema = z.object({
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  RESEND_API_KEY: z.string(),
  EMAIL_FROM: z.string().email(),
});

envSchema.parse(process.env);

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      roles: string[];
      projects: string[];
    };
  }
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
