import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
// ── App pool — يمكن توجيهه إلى pgBouncer/pooler endpoint ─────────────────
// DATABASE_URL: اتصال المنشآت العادي (app traffic)
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 50,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});
// ── Direct pool — للعمليات التي تتطلب اتصالاً مباشراً بـ PostgreSQL ────────
// DIRECT_DATABASE_URL: يُستخدم عند وجود pgBouncer أو Supavisor
//   - migrations (CREATE INDEX CONCURRENTLY تتطلب اتصال مباشر)
//   - pg-boss (يحتاج LISTEN/NOTIFY وعمليات متقدمة)
//   - DDL statements
// إذا DIRECT_DATABASE_URL غير موجود → يرجع إلى DATABASE_URL (الوضع الحالي)
export const directPool = new Pool({
    connectionString: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL,
    max: 5, // اتصالات مباشرة محدودة — ليست للـ traffic العام
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 10_000,
});
export const db = drizzle(pool, { schema });
//# sourceMappingURL=client.js.map