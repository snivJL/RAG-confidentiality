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
      ownerEmail: "thomas@korefocus.com",
      rolesAllowed: [],
      projects: [],
    },
  });

  const chunks = chunkText(raw, 1000);
  const BATCH_SIZE = 200;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    console.log(
      `[ingest] embedding batch ${i / BATCH_SIZE + 1} (${batch.length} chunks)`
    );
    const resp = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });
    // resp.data is an array of { embedding: number[] }
    allEmbeddings.push(...resp.data.map((d) => d.embedding));
  }

  const NAMESPACE = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

  await qdrant.upsert("chunks", {
    wait: true,
    points: chunks.map((content, i) => {
      // deterministically generate a valid UUID
      const pointId = uuidv5(`${dropboxId}-${i}`, NAMESPACE);

      return {
        id: pointId, // now a proper UUID
        vector: allEmbeddings[i],
        payload: {
          docId: dropboxId,
          offset: i,
          content,
          rolesAllowed: [],
          projects: [],
          emailsAllowed: [],
        },
      };
    }),
  });
  console.log("[ingest] upserted", chunks.length, "vectors to Qdrant");
}
