import { NextRequest, NextResponse } from "next/server";
import { Dropbox, files } from "dropbox";
import fetch from "cross-fetch";
import crypto from "node:crypto";
import { v5 as uuidv5 } from "uuid";

import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { qdrant } from "@/lib/vector-store";
import { chunkText } from "@/lib/chunk-text";
import { extractText } from "@/lib/extract-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;

if (!DROPBOX_APP_SECRET || !DROPBOX_ACCESS_TOKEN) {
  console.error(
    "[ingest][startup] Missing DROPBOX_APP_SECRET or DROPBOX_ACCESS_TOKEN!"
  );
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
  // 1. Read raw body once
  const raw = Buffer.from(await req.arrayBuffer());
  const sig = req.headers.get("x-dropbox-signature")!;
  const calc = crypto
    .createHmac("sha256", DROPBOX_APP_SECRET!)
    .update(raw)
    .digest("hex");
  if (sig !== calc) {
    return NextResponse.json({ error: "bad signature" }, { status: 403 });
  }

  // 2. Parse Dropbox payload
  const { list_folder } = JSON.parse(raw.toString()) as {
    list_folder: { accounts: string[] };
  };
  const accounts = list_folder.accounts || [];

  // 3. Schedule the real work asynchronously
  for (const acct of accounts) {
    setImmediate(async () => {
      try {
        // Your existing scan → download → extract → chunk → upsert logic
        await processUserDelta(acct);
      } catch (err) {
        console.error("[ingest][async] error processing account", acct, err);
      }
    });
  }

  // 4. Respond immediately so Dropbox won't retry
  return NextResponse.json({ ok: true });
}
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
  try {
    console.log("[ingest] ingesting file:", meta.path_lower);
    const { id: dropboxId, name, path_lower } = meta;

    // ─── Download ──────────────────────────────────────
    const dl = await dbx.filesDownload({ path: path_lower! });
    const result = dl.result as files.FileMetadataReference;

    let buf: Buffer;
    if (result.fileBinary) {
      buf = result.fileBinary;
    } else if (result.fileBlob) {
      const ab = await result.fileBlob.arrayBuffer();
      buf = Buffer.from(ab);
    } else {
      throw new Error("Dropbox download did not return fileBinary or fileBlob");
    }
    console.log("[ingest] downloaded bytes:", buf.length);

    // ─── Extract text ─────────────────────────────────
    const raw = await extractText(name, buf);
    console.log(`[ingest] extracted ${raw.length} chars from ${name}`);

    // ─── Upsert document metadata ─────────────────────
    await prisma.document.upsert({
      where: { id: dropboxId },
      update: { title: name, storagePath: path_lower! },
      create: {
        id: dropboxId,
        title: name,
        storagePath: path_lower!,
        ownerEmail: "thomas@korefocus.com",
        rolesAllowed: [],
        projects: [],
      },
    });

    // ─── Chunk the text ──────────────────────────────
    const chunks = chunkText(raw, 1000);
    console.log("[ingest] chunked into", chunks.length, "pieces");

    // ─── Embed in batches ────────────────────────────
    const BATCH_SIZE = 200;
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      console.log(
        `[ingest] embedding batch ${batchNum} (${batch.length} chunks)`
      );
      const resp = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: batch,
      });
      allEmbeddings.push(...resp.data.map((d) => d.embedding));
    }

    // ─── Prepare all points ──────────────────────────
    const NAMESPACE = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
    const points = chunks.map((content, idx) => ({
      id: uuidv5(`${dropboxId}-${idx}`, NAMESPACE),
      vector: allEmbeddings[idx],
      payload: {
        docId: dropboxId,
        offset: idx,
        content,
        rolesAllowed: [],
        projects: [],
        emailsAllowed: [],
      },
    }));

    // ─── Upsert in batches ───────────────────────────
    for (let i = 0; i < points.length; i += BATCH_SIZE) {
      const batchPoints = points.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      console.log(
        `[ingest] upserting batch ${batchNum} (${batchPoints.length} points)`
      );
      await qdrant.upsert("chunks", {
        wait: true,
        points: batchPoints,
      });
    }

    console.log(`[ingest] upserted all ${points.length} vectors to Qdrant`);
  } catch (error) {
    console.error("[ingest] error:", error);
  }
}
