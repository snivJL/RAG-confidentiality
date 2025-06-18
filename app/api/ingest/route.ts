import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { Dropbox, files } from "dropbox";
import fetch from "cross-fetch";
import type { DropboxWebhookPayload } from "@/types/webhook";

import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { qdrant } from "@/lib/vector-store";
import { chunkText } from "@/lib/chunk-text";
import { extractText } from "@/lib/extract-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;

// fail early if env is missing
if (!DROPBOX_APP_SECRET || !DROPBOX_ACCESS_TOKEN) {
  console.error(
    "[ingest][startup] Missing DROPBOX_APP_SECRET or DROPBOX_ACCESS_TOKEN!"
  );
  // Note: Next.js will still start, but every POST will now 500.
}

const dbx = new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN!, fetch });

export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get("challenge");
  console.log("[ingest][GET] challenge:", challenge);
  return new NextResponse(challenge ?? "", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(req: NextRequest) {
  try {
    console.log("[ingest][POST] Received webhook");

    // 1. read the raw body just once
    const buf = await req.arrayBuffer();
    const raw = Buffer.from(buf);
    const bodyStr = raw.toString("utf-8");

    // 2. log the exact payload
    console.log("[ingest] raw payload:", bodyStr);

    // 3. parse JSON safely
    let payload: DropboxWebhookPayload;
    try {
      payload = JSON.parse(bodyStr);
    } catch (err) {
      console.error("[ingest] JSON parse failed:", err);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // 4. extract the Dropbox accounts array
    const accounts: string[] = payload.list_folder?.accounts ?? [];
    console.log("[ingest] webhook accounts:", accounts);

    if (!accounts.length) {
      console.warn("[ingest] no accounts to process—ignoring");
      return NextResponse.json({ ok: true });
    }

    // 5. delay a few seconds for large uploads to settle
    console.log("[ingest] waiting 5s before scanning…");
    await new Promise((r) => setTimeout(r, 5000));

    // 6. process each account
    await Promise.all(accounts.map((acct) => processUserDelta(acct)));

    console.log("[ingest] done processing accounts");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ingest][POST] Uncaught error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
// Helper functions unchanged…
async function processUserDelta(userId: string) {
  console.log(`[ingest] scanning folder for user ${userId}`);
  let { result } = await dbx.filesListFolder({ path: "", recursive: true });
  while (true) {
    const filesToIngest = result.entries.filter(
      (e) => e[".tag"] === "file"
    ) as files.FileMetadataReference[];
    console.log(`[ingest] found ${filesToIngest.length} file(s) in this batch`);
    await Promise.all(filesToIngest.map(ingestFile));
    if (!result.has_more) break;
    ({ result } = await dbx.filesListFolderContinue({ cursor: result.cursor }));
  }
}

async function ingestFile(meta: files.FileMetadataReference) {
  console.log("[ingest] ingesting file:", meta.path_lower);
  const { id: dropboxId, name, path_lower } = meta;
  // download
  const dl = await dbx.filesDownload({ path: path_lower! });
  const result = dl.result as files.FileMetadataReference;

  let buf: Buffer;
  if (result.fileBinary) {
    buf = result.fileBinary;
  } else if (result.fileBlob) {
    const ab = await result.fileBlob.arrayBuffer();
    buf = Buffer.from(ab);
  } else {
    throw new Error(
      "Dropbox download did not return either fileBinary or fileBlob"
    );
  }
  console.log("[ingest] downloaded bytes:", buf.length);

  // extract
  const raw = await extractText(name, buf);
  console.log(`[ingest] extracted ${raw.length} chars from ${name}`);

  // upsert doc
  await prisma.document.upsert({
    where: { id: dropboxId },
    update: { title: name, storagePath: path_lower! },
    create: {
      id: dropboxId,
      title: name,
      storagePath: path_lower!,
      ownerEmail: "partner@example.com",
      rolesAllowed: [],
      projects: [],
    },
  });

  // chunk & embed
  const chunks = chunkText(raw, 1000);
  console.log("[ingest] chunked into", chunks.length, "pieces");
  const embeds = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks,
  });

  // upsert vectors
  await qdrant.upsert("chunks", {
    wait: true,
    points: chunks.map((content, i) => {
      const pointId = crypto
        .createHash("sha1")
        .update(`${dropboxId}-${i}`)
        .digest("hex");

      return {
        id: pointId,
        vector: embeds.data[i].embedding,
        payload: { docId: dropboxId, offset: i, content },
      };
    }),
  });
  console.log("[ingest] upserted", chunks.length, "vectors to Qdrant");
}
