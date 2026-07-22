import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getPool } from "./db.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "db", "schema.sql");

async function main() {
  const sql = readFileSync(schemaPath, "utf-8");
  console.log(`Applying ${schemaPath} ...`);
  await getPool().query(sql);
  console.log("Schema applied.");
  await getPool().end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
