import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import "dotenv/config";

(async () => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const [{ embedding }] = (
    await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: ["What are the mandatory fields in the distributor sales file?"],
    })
  ).data;

  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    checkCompatibility: false,
  });

  const unfiltered = await qdrant.query("chunks", {
    query: embedding,
    limit: 5,
    with_payload: true,
  });

  console.log("unfiltered.points:", unfiltered.points);

  // Build & log the filter you’re actually using:
  // const filter = buildFilter(["Partner"], []);
  // console.log("applying filter:", JSON.stringify(filter, null, 2));

  // Run the filtered query
  const filtered = await qdrant.query("chunks", {
    query: embedding,
    limit: 5,
    with_payload: true,
  });

  // Dump the raw filtered response
  console.log("filtered response:", JSON.stringify(filtered, null, 2));

  // Then unwrap:
  const hits = filtered.points ?? [];
  console.log("hits array:", hits);
})();
