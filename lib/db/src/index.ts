import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const cloudSqlConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;

if (!cloudSqlConnectionName && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL or CLOUD_SQL_CONNECTION_NAME must be set.",
  );
}

if (
  cloudSqlConnectionName &&
  (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME)
) {
  throw new Error(
    "DB_USER, DB_PASSWORD, and DB_NAME are required for Cloud SQL.",
  );
}

export const pool = cloudSqlConnectionName
  ? new Pool({
      host: `/cloudsql/${cloudSqlConnectionName}`,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    })
  : new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
