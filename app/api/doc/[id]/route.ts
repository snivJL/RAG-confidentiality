// app/api/doc/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { Dropbox } from "dropbox";
import fetch from "cross-fetch";
import { authOptions } from "@/lib/auth";

const dbx = new Dropbox({
  accessToken: process.env.DROPBOX_ACCESS_TOKEN!,
  fetch,
});

export async function GET(req: NextRequest) {
  // 1️⃣ Auth check
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2️⃣ Extract the `id` segment from the path
  //    e.g. path="/api/doc/MTLU1j2Y-F4AAAAAAA"
  const parts = req.nextUrl.pathname.split("/");
  const docId = parts[3];
  if (!docId)
    return NextResponse.json({ error: "Bad request" }, { status: 400 });

  // 3️⃣ Load document metadata
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: {
      storagePath: true,
      rolesAllowed: true,
      projects: true,
      emailsAllowed: true,
      ownerEmail: true,
    },
  });
  console.log(doc, docId);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 4️⃣ ACL check: public OR matching role/project OR email
  const { rolesAllowed, projects, emailsAllowed } = doc;
  const userRoles = session.user.roles;
  const userProjects = session.user.projects;
  const userEmail = session.user.email!;
  const allowedByRole =
    rolesAllowed.length === 0 ||
    rolesAllowed.some((r) => userRoles.includes(r));
  const allowedByProject =
    projects.length === 0 || projects.some((p) => userProjects.includes(p));
  const allowedByEmail =
    emailsAllowed.length === 0 || emailsAllowed.includes(userEmail);

  if (!(allowedByRole && allowedByProject && allowedByEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 5️⃣ Get a Dropbox temporary link
  let link: string;
  try {
    const res = await dbx.filesGetTemporaryLink({ path: doc.storagePath });
    link = res.result.link as string;
    console.log("link:", link);
  } catch (e) {
    console.error("Dropbox link error", e);
    return NextResponse.json({ error: "Could not get link" }, { status: 500 });
  }

  // 6️⃣ Redirect the user straight to the file
  return NextResponse.redirect(link);
}
