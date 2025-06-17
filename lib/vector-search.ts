import { openai } from "./openai";
import { qdrant } from "./vector-store";

export async function semanticSearch(
  question: string,
  userRole = "Partner",
  projects = [""]
) {
  console.log(userRole, projects);
  const [{ embedding }] = (
    await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: [question],
    })
  ).data;

  // 2️⃣ Build the filter.
  // const filter = buildAccessFilter([userRole], projects);

  // 3️⃣ Call the Query API.  Types match the TS examples in the docs. :contentReference[oaicite:2]{index=2}
  const unfiltered = await qdrant.query("chunks", {
    query: embedding,
    limit: 5,
    with_payload: true,
  });

  return unfiltered; // Array<Point>
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
  projects: string[] | null // null  ⇢ user has no projects
) => ({
  must: [
    {
      should: [
        { key: "rolesAllowed", match: { any: roles } }, // ← Match Any  :contentReference[oaicite:0]{index=0}
        { key: "rolesAllowed", is_empty: true },
      ],
    },
    {
      should: projects?.length
        ? [{ key: "projects", match: { any: projects } }]
        : [{ key: "projects", is_empty: true }],
    },
  ],
});
