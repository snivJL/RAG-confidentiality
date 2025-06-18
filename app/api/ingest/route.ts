import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { Dropbox, files } from "dropbox";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import * as PPTX from "pptx-parser";
import { MSGReader } from "msgreader";

import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { qdrant } from "@/lib/vector-store";
import { chunkText } from "@/lib/chunk-text";
import { NodeFileDownloadResult } from "@/types/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN! });

/* ---------- entry points ---------- */
export async function GET(req: NextRequest) {
  /* first-time webhook validation */
  const challenge = req.nextUrl.searchParams.get("challenge");
  return new NextResponse(challenge ?? "", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(req: NextRequest) {
  /* 0. verify HMAC signature */
  const raw = Buffer.from(await req.arrayBuffer());
  const sig = req.headers.get("x-dropbox-signature") ?? "";
  const calc = crypto
    .createHmac("sha256", process.env.DROPBOX_APP_SECRET!)
    .update(raw)
    .digest("hex");
  if (sig !== calc)
    return NextResponse.json({ error: "bad signature" }, { status: 403 });

  /* 1. parse payload */
  const { list } = JSON.parse(raw.toString()) as {
    list: { delta: { users: string[] } }[];
  };

  await Promise.all(
    list.flatMap(({ delta }) => delta.users.map(processUserDelta))
  );

  return NextResponse.json({ ok: true });
}

/* ---------- helpers ---------- */

/** poll Dropbox delta cursor for that user */
async function processUserDelta() {
  let { result } = await dbx.filesListFolder({ path: "", recursive: true });

  while (true) {
    const files = result.entries.filter(
      (e) => e[".tag"] === "file"
    ) as files.FileMetadataReference[];

    await Promise.all(files.map(ingestFile));

    if (!result.has_more) break;
    ({ result } = await dbx.filesListFolderContinue({ cursor: result.cursor }));
  }
}

/** download ➜ extract ➜ chunk ➜ embed ➜ Qdrant */
async function ingestFile(meta: files.FileMetadataReference) {
  const { id: dropboxId, name, path_lower } = meta;

  /* 1. download binary */
  const dl = await dbx.filesDownload({ path: path_lower! });

  const nodeResult = dl.result as NodeFileDownloadResult;
  const buf = nodeResult.fileBinary;

  /* 2. extract raw text */
  const raw = await extractText(name, buf);

  /* 3. persist Document row (public by default) */
  await prisma.document.upsert({
    where: { id: dropboxId },
    update: { title: name, storagePath: path_lower! },
    create: {
      id: dropboxId,
      title: name,
      storagePath: path_lower!,
      ownerEmail: "partner@example.com",
      rolesAllowed: [], // fill later if you parse ACL from folder name
      projects: [],
    },
  });

  /* 4. chunk + embed + upsert vectors */
  const chunks = chunkText(raw, 1000);
  const embeds = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks,
  });

  await qdrant.upsert("chunks", {
    wait: true,
    points: chunks.map((content, i) => ({
      id: crypto.randomUUID(),
      vector: embeds.data[i].embedding,
      payload: {
        docId: dropboxId,
        offset: i,
        content, // optional preview
        /* omit rolesAllowed/projects if public */
      },
    })),
  });
}

export async function extractText(
  fileName: string,
  buf: Buffer
): Promise<string> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) {
    return (await pdfParse(buf)).text;
  }

  if (lower.endsWith(".docx")) {
    return (await mammoth.extractRawText({ buffer: buf })).value;
  }

  if (lower.endsWith(".pptx")) {
    const slides = await PPTX.parse(buf); // returns array of slide objects
    return slides.map((s: { text: string }) => s.text).join("\n\n---\n\n");
  }

  if (lower.endsWith(".msg")) {
    const msg = new MSGReader(buf);
    const { subject, body } = msg.getFileData();
    return [subject, body].filter(Boolean).join("\n\n");
  }

  // default: treat as plain-text
  return buf.toString("utf8");
}
