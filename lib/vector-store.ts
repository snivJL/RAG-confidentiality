import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY!,
});

/** Run this ONCE to bootstrap the collection */
export async function ensureChunksCollection() {
  const cols = await qdrant.getCollections();
  if (!cols.collections.some((c) => c.name === "chunks")) {
    await qdrant.createCollection("chunks", {
      vectors: { size: 1536, distance: "Cosine" },
    });
    console.log("✅  Created collection 'chunks'");
  }
}
