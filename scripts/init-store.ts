import { ensureChunksCollection } from "../lib/vector-store";

ensureChunksCollection().then(() => process.exit());
