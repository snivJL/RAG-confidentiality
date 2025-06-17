import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { name, email, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists)
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, hashedPassword },
  });

  return NextResponse.json({ ok: true });
}
