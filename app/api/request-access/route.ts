// src/app/api/request-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Resend } from "resend";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM_EMAIL = `No Reply <${process.env.EMAIL_FROM!}>`;

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ ensure user is logged in
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ parse and validate payload
    const { docId, ownerEmail } = (await req.json()) as {
      docId: string;
      ownerEmail: string;
    };
    if (!docId || !ownerEmail) {
      return NextResponse.json(
        { error: "Must include docId and ownerEmail" },
        { status: 400 }
      );
    }

    // 3️⃣ fetch document title (optional, for nicer email)
    const doc = await prisma.document.findUnique({
      where: { id: docId },
      select: { title: true },
    });
    const docTitle = doc?.title ?? docId;

    const requestor = session.user.email!;
    // 1️⃣ record the request
    const ar = await prisma.accessRequest.create({
      data: { docId, requestorEmail: requestor, status: "deny" },
    });
    // 4️⃣ send via Resend
    const userEmail = session.user.email || "julien.lejay@korefocus.com";
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ["julien.lejay@korefocus.com"],
      subject: `Access Request: "${docTitle}"`,
      html: `
        <p>Hi there,</p>
        <p><strong>${userEmail}</strong> has requested access to the document: <em>${docTitle}</em> (ID: ${docId}).</p>
        <p>
        <a href="${process.env.APP_URL}/api/access-requests/${ar.id}/approve">Approve</a> |
        <a href="${process.env.APP_URL}/api/access-requests/${ar.id}/deny">Deny</a>
        </p>
        <p>You can review and grant access in the admin panel, or reply to this email to follow up.</p>
        <br/>
        <p>Thanks!</p>
      `,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[/api/request-access] Error:", err);
    return NextResponse.json(
      { error: "Failed to send access request" },
      { status: 500 }
    );
  }
}
