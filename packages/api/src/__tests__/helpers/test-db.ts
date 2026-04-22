/**
 * Test Database Helper
 *
 * يوفر اتصال DB معزول لكل تست عبر transactions.
 * كل تست يبدأ BEGIN وينتهي بـ ROLLBACK → لا بيانات تبقى.
 *
 * الاستخدام:
 *   const { db, cleanup } = await openTestDb();
 *   afterEach(cleanup);
 *
 * المتطلب: TEST_DATABASE_URL أو DATABASE_URL في البيئة.
 * إذا لم يوجد → التستات تُتخطى تلقائياً.
 */

import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@nasaq/db/schema";

export type TestDb = NodePgDatabase<typeof schema>;

export const TEST_DB_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "";

/** يُستخدم في describe.skipIf لتخطي كل تستات DB عند غياب الاتصال */
export const skipIfNoDb = !TEST_DB_URL;

/**
 * يفتح transaction جديدة معزولة.
 * ارجع { db, cleanup } ونادِ cleanup() في afterEach.
 */
export async function openTestDb(): Promise<{ db: TestDb; cleanup: () => Promise<void> }> {
  const client = new Client({ connectionString: TEST_DB_URL });
  await client.connect();
  await client.query("BEGIN");
  const db = drizzle(client, { schema });
  return {
    db,
    async cleanup() {
      try {
        await client.query("ROLLBACK");
      } finally {
        await client.end();
      }
    },
  };
}
