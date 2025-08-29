import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

declare global {
  // eslint-disable-next-line no-var
  var __db__: ReturnType<typeof drizzle> | undefined;
}

const connectionString = (() => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required but not set');
  }
  // Basic validation - ensure it starts with postgresql://
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
  }
  return dbUrl;
})();

// Create postgres client
const sql = postgres(connectionString, { 
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance
export const db = global.__db__ ?? drizzle(sql, { schema });

if (process.env.NODE_ENV !== 'production') {
  global.__db__ = db;
}

export { sql };
export * from './schema';