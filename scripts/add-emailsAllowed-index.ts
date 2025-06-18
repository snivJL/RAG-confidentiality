// scripts/add-emailsAllowed-index.ts
import "dotenv/config";
import { qdrant } from "../lib/vector-store";

(async () => {
  // await qdrant.delete("chunks", {
  //   filter: { must: [] },
  // });
  await qdrant
    .createPayloadIndex("chunks", {
      field_name: "emailsAllowed",
      field_schema: "keyword",
    })
    .catch((e) => {
      if (e.status === 409) console.log("emailsAllowed index already exists");
      else throw e;
    });
  console.log("✅  Created payload index for emailsAllowed");
  process.exit(0);
})();
