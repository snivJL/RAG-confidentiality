import "dotenv/config";
import { qdrant } from "../lib/vector-store";

(async () => {
  // await qdrant.createPayloadIndex("chunks", {
  //   field_name: "rolesAllowed",
  //   field_schema: "keyword",
  // });

  // await qdrant.createPayloadIndex("chunks", {
  //   field_name: "projects",
  //   field_schema: "keyword",
  // });
  await qdrant.createPayloadIndex("chunks", {
    field_name: "emailsAllowed",
    field_schema: "keyword",
  });

  console.log("✅  keyword indexes created (rolesAllowed, projects)");
})();
