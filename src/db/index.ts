import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schemaModule from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in."
  );
}

const client = postgres(process.env.DATABASE_URL);

export const db = drizzle(client, { schema: schemaModule });

export const schema = schemaModule;