import { openai } from "./openai";
import { qdrant } from "./vector-store";

const DEFAULT_LIMIT = 5;
const MIN_SCORE = 0.3;

export async function semanticSearchWithAcl(
  question: string,
  roles: string[],
  projects: string[] | undefined,
  email: string,
  limit = DEFAULT_LIMIT,
  minScore = MIN_SCORE
) {
  // 1️⃣ get the embedding
  const [{ embedding }] = (
    await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: [question],
    })
  ).data;

  const allResp = await qdrant.query("chunks", {
    query: embedding,
    limit,
    with_payload: true,
    score_threshold: minScore,
  });

  // console.log(allResp.points);

  const aclFilter = buildAccessFilter(roles, projects, email);
  const accessResp = await qdrant.query("chunks", {
    query: embedding,
    limit,
    filter: aclFilter,
    with_payload: true,
    score_threshold: minScore,
  });
  // console.log(accessResp.points);

  return {
    all: allResp.points,
    accessible: accessResp.points,
  };
}

/**
 * Build a Qdrant boolean filter that returns points if:
 *  - public (no rolesAllowed & no projects)
 *  - OR user’s role is in rolesAllowed
 *  - OR user’s project is in projects
 *  - OR user’s email is in emailsAllowed
 */
export const buildAccessFilter = (
  roles: string[],
  projects?: string[],
  email?: string
) => {
  const branches = [];
  console.log(roles, projects, email);
  // 1️⃣ Public docs: no ACL whatsoever
  branches.push({
    must: [
      { is_empty: { key: "rolesAllowed" } },
      { is_empty: { key: "projects" } },
      { is_empty: { key: "emailsAllowed" } },
    ],
  });

  // 2️⃣ Role‐based access
  branches.push({
    key: "rolesAllowed",
    match: { any: roles },
  });

  // 3️⃣ Project‐based access (only if the user has projects)
  if (projects && projects.length > 0) {
    branches.push({
      key: "projects",
      match: { any: projects },
    });
  }

  // 4️⃣ Per‐user override via email
  if (email) {
    branches.push({
      key: "emailsAllowed",
      match: { any: [email] },
    });
  }

  return {
    should: branches,
  };
};
