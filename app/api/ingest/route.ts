import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { Dropbox } from "dropbox";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { qdrant } from "@/lib/vector-store";
import { chunkText } from "@/lib/chunk-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN! });

export async function POST(req: NextRequest) {
  const raw = Buffer.from(await req.arrayBuffer());

  // 0. webhook challenge (GET with ?challenge)
  if (req.method === "GET") {
    return new Response(req.nextUrl.searchParams.get("challenge") ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // 1. verify signature
  const sig = req.headers.get("x-dropbox-signature") ?? "";
  const calc = crypto
    .createHmac("sha256", process.env.DROPBOX_APP_SECRET!)
    .update(raw)
    .digest("hex");
  if (sig !== calc)
    return NextResponse.json({ error: "bad sig" }, { status: 403 });

  // 2. payload → list of user IDs
  const { list } = JSON.parse(raw.toString()) as {
    list: { delta: { users: string[] } }[];
  };

  await Promise.all(
    list.flatMap((e) => e.delta.users.map((u) => handleUser(u)))
  );

  return NextResponse.json({ ok: true });
}

/* ===== helpers ===== */

async function handleUser(teamUserId: string) {
  // first page
  let { result } = await dbx.filesListFolder({
    path: "",
    recursive: true,
  });

  while (true) {
    const files = result.entries.filter((e) => e[".tag"] === "file") as any[];
    await Promise.all(files.map(ingestFile));

    if (!result.has_more) break;
    ({ result } = await dbx.filesListFolderContinue({ cursor: result.cursor }));
  }
}

async function ingestFile(meta: {
  id: string;
  name: string;
  path_lower: string;
}) {
  const { id: dropboxId, name, path_lower } = meta;

  /* 1. download */
  const file = await dbx.filesDownload({ path: path_lower });
  const buf = (file.result as any).fileBinary as Buffer;

  /* 2. extract */
  let raw = "";
  if (name.endsWith(".pdf")) raw = (await pdfParse(buf)).text;
  else if (name.endsWith(".docx"))
    raw = (await mammoth.extractRawText({ buffer: buf })).value;
  else raw = buf.toString("utf8");

  /* 3. save / update Document row */
  await prisma.document.upsert({
    where: { id: dropboxId },
    update: { title: name, storagePath: path_lower },
    create: {
      id: dropboxId,
      title: name,
      storagePath: path_lower,
      ownerEmail: "partner@example.com", // TODO: infer later
      rolesAllowed: [],
      projects: [],
    },
  });

  /* 4. chunk + embed */
  const chunks = chunkText(raw, 1000);
  const embeds = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks,
  });

  /* 5. upsert to Qdrant */
  await qdrant.upsert("chunks", {
    wait: true,
    points: chunks.map((content, i) => ({
      id: crypto.randomUUID(), // ✅ valid point ID
      vector: embeds.data[i].embedding,
      payload: {
        docId: dropboxId,
        rolesAllowed: [],
        projects: [],
        offset: i,
      },
    })),
  });
}
