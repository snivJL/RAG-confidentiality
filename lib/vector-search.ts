import { qdrant } from "@/lib/vector-store";

/**
 * • embedding       – 1536-dim query vector from OpenAI
 * • userRoles       – e.g. ["Partner"]
 * • userProjects    – e.g. ["pharma-fund-A"]
 * • k               – how many chunks you want back
 */
export async function searchChunks(
  embedding: number[],
  userRoles: string[],
  userProjects: string[],
  k = 8
) {
  /* ──────────────────────────────────────────────────────────
     Build ONE Qdrant filter object that enforces confidentiality
     ────────────────────────────────────────────────────────── */

  const must: any[] = []; // top-level AND list

  /* ---------- 1. Role ACL block ---------- */
  if (userRoles.length) {
    // User HAS roles → allow chunks that are either public OR overlap
    must.push({
      should: [
        { key: "rolesAllowed", match: { any: userRoles } }, // overlap roles
        { key: "rolesAllowed", is_empty: true }, // field missing  → public
      ],
    });
  } else {
    // User has NO roles → only allow public chunks
    must.push({ key: "rolesAllowed", is_empty: true });
  }

  /* ---------- 2. Project ACL block ---------- */
  if (userProjects.length) {
    must.push({
      should: [
        { key: "projects", match: { any: userProjects } },
        { key: "projects", is_empty: true },
      ],
    });
  } else {
    must.push({ key: "projects", is_empty: true });
  }

  /* Combine into final filter */
  const filter = { must }; // { must: [role-block, project-block] }

  if (process.env.NODE_ENV === "development") {
    console.log("Vector Search Filter:", JSON.stringify(filter, null, 2));
  }

  /* ──────────────────────────────────────────────────────────
     Execute search.  Returns an array of { id, payload, score }
     ────────────────────────────────────────────────────────── */
  return qdrant.search("chunks", {
    vector: embedding,
    limit: k,
    filter,
  });
}
