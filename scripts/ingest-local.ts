import fs from "node:fs/promises";
import path from "node:path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { qdrant } from "@/lib/vector-store";
import { chunkText } from "@/lib/chunk-text";

async function main() {
  /* 0. pick any file in your project folder */
  const filePath = process.argv[2]; // e.g. "sample.pdf" or "sample.txt"
  if (!filePath) {
    console.error("Usage: pnpm ts-node scripts/ingest-local.ts <file>");
    process.exit(1);
  }

  const buf = await fs.readFile(filePath);
  const name = path.basename(filePath);
  const dropboxId = `local-${Date.now()}`; // fake id

  /* 1. extract raw text */
  let raw = "";
  if (name.endsWith(".pdf")) raw = (await pdfParse(buf)).text;
  else if (name.endsWith(".docx"))
    raw = (await mammoth.extractRawText({ buffer: buf })).value;
  else raw = buf.toString("utf8");

  /* 2. Persist Document row */
  await prisma.document.create({
    data: {
      id: dropboxId,
      title: name,
      storagePath: `local/${name}`,
      ownerEmail: "tester@example.com",
      rolesAllowed: [],
      projects: [],
    },
  });

  /* 3. Chunk + embed */
  const chunks = chunkText(raw, 1000);
  const embeds = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks,
  });

  /* 4. Upsert to Qdrant */
  const rolesAllowed: string[] = ["Partner"];
  const projects: string[] = [];

  // payload builder
  const payloadBase: Record<string, any> = {
    docId: dropboxId,
    offset: 1,
    rolesAllowed: rolesAllowed ?? [],
    projects: projects ?? [],
  };

  await qdrant.upsert("chunks", {
    wait: true,
    points: chunks.map((content, i) => ({
      id: crypto.randomUUID(),
      vector: embeds.data[i].embedding,
      payload: { ...payloadBase, content },
    })),
  });
  console.log(`✅ Ingested "${name}" (${chunks.length} chunks).`);
}

main().then(() => process.exit());
