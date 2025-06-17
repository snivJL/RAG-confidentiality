import { openai } from "./openai";
import { qdrant } from "./vector-store";

export async function semanticSearch(
  question: string,
  userRole = "Partner",
  projects?: string[]
) {
  console.log(userRole, projects);
  const [{ embedding }] = (
    await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: [question],
    })
  ).data;

  const filter = buildAccessFilter([userRole], projects);

  const filtered = await qdrant.query("chunks", {
    query: embedding,
    limit: 5,
    filter,
    with_payload: true,
  });

  return filtered;
}

/**
 * Build a filter like:
 * {
 *   must: [
 *     { should: [ {key:'rolesAllowed', match:{any:['Partner']}}, {key:'rolesAllowed', is_empty:true} ] },
 *     { should: [ {key:'projects', is_empty:true} ] }
 *   ]
 * }
 */
export const buildAccessFilter = (
  roles: string[], // e.g. ['Partner']
  projects?: string[] // undefined ⇒ user has no projects
) => {
  // 1️⃣ Public points: both ACL fields empty/missing
  const publicBranch = {
    must: [
      { is_empty: { key: "rolesAllowed" } },
      { is_empty: { key: "projects" } },
    ],
  };

  // 2️⃣ Scoped points: role OK AND project OK
  const scopedBranch = {
    must: [
      {
        // rolesAllowed must either include one of the user's roles, or be empty
        should: [
          { key: "rolesAllowed", match: { any: roles } },
          { is_empty: { key: "rolesAllowed" } },
        ],
      },
      {
        // projects must either include one of the user's projects, or be empty
        should:
          projects && projects.length > 0
            ? [
                { key: "projects", match: { any: projects } },
                { is_empty: { key: "projects" } },
              ]
            : [
                // if user has no projects, still allow public (empty) but not scoped
                { is_empty: { key: "projects" } },
              ],
      },
    ],
  };

  // Top‐level OR: public OR scoped
  return {
    should: [publicBranch, scopedBranch],
  };
};
