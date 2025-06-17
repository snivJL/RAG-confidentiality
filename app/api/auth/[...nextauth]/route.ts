/* -------------------------------------------------------------------------- */
/*  app/api/auth/[...nextauth]/route.ts                                       */
/* -------------------------------------------------------------------------- */

import type { DefaultSession, NextAuthOptions, Session } from "next-auth";
import NextAuth from "next-auth/next";

import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

/* -------------------------------------------------------------------------- */
/*  1. Environment-variable safety                                            */
/* -------------------------------------------------------------------------- */

const envSchema = z.object({
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  RESEND_API_KEY: z.string(),
  EMAIL_FROM: z.string().email(),
});

envSchema.parse(process.env); // throws early if anything is missing

/* -------------------------------------------------------------------------- */
/*  2. Session user type augmentation                                         */
/* -------------------------------------------------------------------------- */

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      roles: string[];
      projects: string[];
    };
  }
}

/* -------------------------------------------------------------------------- */
/*  3. Providers                                                              */
/* -------------------------------------------------------------------------- */

const resend = new Resend(process.env.RESEND_API_KEY);

const emailProvider = EmailProvider({
  from: process.env.EMAIL_FROM,
  async sendVerificationRequest({ identifier, url, provider }) {
    await resend.emails.send({
      from: provider.from as string,
      to: identifier,
      subject: "Your magic link",
      html: `<p>Click <a href="${url}">here</a> to sign in. Link expires in 10 min.</p>`,
    });
  },
});

const credentialsProvider = CredentialsProvider({
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(raw) {
    /** Runtime validation of incoming form data */
    const creds = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
      })
      .parse(raw);

    const user = await prisma.user.findUnique({
      where: { email: creds.email },
    });
    if (!user?.hashedPassword) return null;

    const valid = await bcrypt.compare(creds.password, user.hashedPassword);
    if (!valid) return null;

    return { id: user.id, email: user.email, name: user.name };
  },
});

/* -------------------------------------------------------------------------- */
/*  4. NextAuth options                                                       */
/* -------------------------------------------------------------------------- */

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,

  providers: [emailProvider, credentialsProvider],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    verifyRequest: "/verify-email",
    error: "/auth-error",
  },

  callbacks: {
    /** attach id/roles/projects to the client-visible session */
    async session({ session, token }): Promise<Session> {
      if (token.sub && session.user) {
        session.user.id = token.sub;

        /* fetch claims once per request */
        const [roles, projects] = await Promise.all([
          prisma.userRole.findMany({ where: { userId: token.sub } }),
          prisma.userProject.findMany({ where: { userId: token.sub } }),
        ]);

        session.user.roles = roles.map((r) => r.role);
        session.user.projects = projects.map((p) => p.projectId);
      }
      return session;
    },

    /** ensure JWT keeps the user id across refreshes */
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
  },
};

/* -------------------------------------------------------------------------- */
/*  5. Route handler exports (App Router)                                     */
/* -------------------------------------------------------------------------- */

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
