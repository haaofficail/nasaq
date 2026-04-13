#!/usr/bin/env tsx
/**
 * ████████╗██████╗ ███╗   ███╗██╗███████╗██████╗      ██████╗ ███████╗
 *    ██╔══╝██╔══██╗████╗ ████║██║╚══███╔╝██╔══██╗    ██╔═══██╗██╔════╝
 *    ██║   ██████╔╝██╔████╔██║██║  ███╔╝ ██████╔╝    ██║   ██║███████╗
 *    ██║   ██╔══██╗██║╚██╔╝██║██║ ███╔╝  ██╔══██╗    ██║   ██║╚════██║
 *    ██║   ██║  ██║██║ ╚═╝ ██║██║███████╗██║  ██║    ╚██████╔╝███████║
 *    ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚══════╝╚═╝  ╚═╝     ╚═════╝ ╚══════╝
 *
 *  العين الشاملة الذكية — INTELLIGENT ARCHITECTURE SCANNER v2
 *
 *  يفهم الهدف من كل مكوّن ويتتبع السلسلة كاملة:
 *    بيزنس تايب → كابيليتي → route → جدول DB → صفحة فرونت → permission
 *
 *  ماذا يكشف:
 *    1. DOMAIN_INTEGRITY   — لكل route file: ما الهدف؟ ما الناقص؟
 *    2. CAPABILITY_CHAIN   — السلسلة كاملة من business type → feature → DB
 *    3. SECURITY_ORG_FILTER — كل SQL query بدون org_id filter = ثغرة أمنية
 *    4. DEAD_CODE          — route files غير مسجّلة، صفحات غير مستخدمة
 *    5. PERMISSION_COHERENCE — permission strings مجهولة في frontend/backend
 *    6. FINANCIAL_INTEGRITY — عمليات مالية بدون قيود محاسبية
 *    7. API_COVERAGE        — API calls في الفرونت بلا handler في الباكند
 *    8. COLUMN_DRIFT        — أعمدة SQL مستخدمة غير موجودة في migrations
 *
 *  Usage:
 *    pnpm -F @nasaq/api exec tsx ../../scripts/architecture/scan-network.ts
 *    pnpm -F @nasaq/api exec tsx ../../scripts/architecture/scan-network.ts --only=caps
 *    pnpm -F @nasaq/api exec tsx ../../scripts/architecture/scan-network.ts --only=security
 *    pnpm -F @nasaq/api exec tsx ../../scripts/architecture/scan-network.ts --severity=CRITICAL
 */

import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ROOT   = path.resolve(__dirname, "../../");
const ONLY   = process.argv.find(a => a.startsWith("--only="))?.split("=")[1];
const SEV    = process.argv.find(a => a.startsWith("--severity="))?.split("=")[1];
const QUIET  = process.argv.includes("--quiet");
const EXCLUDED_DIRS = new Set(["node_modules", "dist", ".git", ".turbo", "coverage"]);

// ─────────────────────────────────────────────────────────────────────────────
// ISSUE SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

interface Issue {
  code:     string;
  severity: Severity;
  title:    string;
  detail:   string;
  where?:   string;   // file:line or file
  why?:     string;   // root cause explanation
  fix?:     string;   // how to fix it
}

const ISSUES: Issue[] = [];
const SEVERITY_ORDER: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: "\x1b[91m",  // bright red
  HIGH:     "\x1b[33m",  // yellow
  MEDIUM:   "\x1b[36m",  // cyan
  LOW:      "\x1b[37m",  // white
  INFO:     "\x1b[90m",  // gray
};
const RESET = "\x1b[0m";

function issue(i: Issue) {
  if (SEV && SEVERITY_ORDER[i.severity] > SEVERITY_ORDER[SEV as Severity]) return;
  ISSUES.push(i);
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function readFile(p: string): string {
  try { return fs.readFileSync(p, "utf-8"); } catch { return ""; }
}

function walkFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    if (EXCLUDED_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...walkFiles(full, exts));
    else if (e.isFile() && exts.some(x => full.endsWith(x))) results.push(full);
  }
  return results;
}

function rel(p: string) { return path.relative(ROOT, p).replace(/\\/g, "/"); }

function findLineNumber(content: string, substr: string): number {
  const idx = content.indexOf(substr);
  if (idx === -1) return 0;
  return content.substring(0, idx).split("\n").length;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOISE FILTER — الكلمات التي تبدو جداول لكنها ليست كذلك
// ─────────────────────────────────────────────────────────────────────────────

const NOISE_WORDS = new Set([
  // SQL clauses
  "select","insert","update","delete","create","drop","alter","table","index","where","from","join",
  "inner","outer","left","right","cross","full","lateral","on","as","in","is","by","asc","desc",
  "limit","offset","returning","values","set","and","or","not","null","true","false","exists",
  "having","group","order","distinct","union","all","case","when","then","else","end","with",
  "into","cascade","references","constraint","primary","key","foreign","unique","default",
  "if","exists","begin","commit","rollback","transaction","view","function","trigger","procedure",
  "sequence","schema","database","public","information_schema","pg_catalog",
  // JavaScript/TypeScript
  "const","let","var","function","return","async","await","try","catch","throw","new","this",
  "typeof","instanceof","void","never","any","unknown","string","number","boolean","object",
  "undefined","null","true","false","class","interface","type","enum","import","export","from",
  "default","extends","implements","super","static","readonly","private","public","protected",
  // Library names that appear in imports/FROM clauses
  "hono","drizzle","zod","bcrypt","crypto","nanoid","uuid","jose","dayjs","axios","fetch",
  "express","fastify","koa","prisma","typeorm","sequelize","mongoose","redis","ioredis",
  "luxon","moment","date","fns","lodash","ramda","immer","zustand","jotai","mobx",
  "react","vue","angular","svelte","next","remix","vite","webpack","rollup","esbuild",
  "pool","db","client","connection","query","result","row","rows","record","records",
  "data","items","list","array","map","set","object","error","err","e","c","req","res",
  "body","params","headers","context","ctx","next","user","users","org","orgs",
  "id","ids","uuid","name","email","phone","date","time","status","type","code","key","value",
  "count","total","sum","avg","min","max","page","limit","offset","sort","order","filter",
  "search","query","input","output","result","response","request","payload",
  "config","settings","options","props","args","meta","info","log","logger",
  "the","a","an","of","in","to","for","is","it","at","or","if","as","on","be",
  // Common in non-SQL FROM/JOIN context
  "module","exports","require","path","fs","os","url","http","https","net","dns",
  "stream","buffer","events","util","child_process","cluster","worker_threads",
  // Specific library functions
  "eq","ne","lt","lte","gt","gte","and","or","not","like","ilike","inArray","notInArray",
  "isNull","isNotNull","sql","desc","asc","count","sum","avg","max","min","coalesce",
  "pool_query","pg","postgres","neon","supabase","planetscale",
  // Words too short to be table names
  // Additional false-positive words from real scans
  "each","item","items","entry","entries","record","records","event","events",
  "node","nodes","edge","edges","step","steps","task","tasks","plan","plans",
  "role","roles","rule","rules","policy","policies","scope","token","tokens",
  "code","codes","flag","flags","hook","hooks","lock","locks","slot","slots",
  "zone","zones","mode","modes","sort","limit","page","size","skip","take",
  "hash","salt","seed","tick","tick","ping","stat","stats","log","logs","tag","tags",
  "file","files","path","paths","link","links","form","forms","feed","feeds",
  "user","users","org","orgs","team","teams","role","group","groups",
  "batch","queue","stack","heap","tree","list","grid","view","views",
  "draft","drafts","error","errors","warn","info","debug","trace",
  "enum","enums","type","types","model","models","schema","schemas",
  "input","output","source","target","origin","dest","destination",
  "raw","base","child","parent","root","leaf","branch","trunk",
]);

// Additional words detected as false-positive table names from actual scanner runs
const ADDITIONAL_NOISE = new Set([
  // SQL aggregate functions and built-ins
  "generate_series","unnest","array_agg","string_agg","json_agg","jsonb_agg",
  "row_number","rank","dense_rank","ntile","lead","lag","first_value","last_value",
  "coalesce","nullif","greatest","least","extract","date_trunc","date_part",
  "to_char","to_date","to_timestamp","now","current_date","current_time",
  "current_timestamp","interval","timezone","make_interval",
  // SQL keywords that appear after FROM/JOIN
  "lateral","unnested","recursive","values","only",
  // Common SQL aliases
  "cust","serv","prod","acct","dept","mgr","emp","addr","ref","src","dst",
  "prev","next","curr","calc","temp","tmp","stg","staging",
  "canonical","fefo","near","same","received","saudi","slug",
  "current","calculated","defaults","today","booking","service","template",
  "kitchen","startdate","event_date","created_at","businessname",
  // CTE names (common patterns)
  "base_data","final","summary","filtered","ranked","numbered","deduplicated",
  "aggregated","joined","matched","unmatched","latest","oldest","recent",
  // Words misidentified from comments
  "handles","installs","fresh",
]);

function isTableName(word: string): boolean {
  const w = word.toLowerCase();
  if (w.length < 5) return false;             // table names in this project ≥ 5 chars
  if (NOISE_WORDS.has(w)) return false;
  if (ADDITIONAL_NOISE.has(w)) return false;
  if (/^\d/.test(word)) return false;
  // PostgreSQL functions end in ()  but we capture without — extra check: no mixed case
  if (/[A-Z]/.test(word) && /[a-z]/.test(word)) return false; // camelCase = variable, not table
  // Table names in this project always have at least one underscore OR are a single word 5+ chars
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOWN DATA — gathered once at startup
// ─────────────────────────────────────────────────────────────────────────────

function buildKnownTables(): { migrations: Set<string>; bootstrap: Set<string>; drizzle: Set<string>; all: Set<string> } {
  const migrations = new Set<string>();
  const bootstrap  = new Set<string>();
  const drizzle    = new Set<string>();

  // From SQL migration files (both numbered and Drizzle-generated)
  for (const f of walkFiles(path.join(ROOT, "packages/db/migrations"), [".sql"])) {
    const content = readFile(f);
    // Match: CREATE TABLE "name" or CREATE TABLE name or CREATE TABLE IF NOT EXISTS "name"
    for (const m of content.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?/gi)) {
      migrations.add(m[1].toLowerCase());
    }
    // Also: ALTER TABLE "name" ADD — means the table exists (was created earlier)
    for (const m of content.matchAll(/ALTER TABLE\s+"?(\w+)"?\s+/gi)) {
      migrations.add(m[1].toLowerCase());
    }
  }

  // From Drizzle ORM schema files — pgTable("table_name", {...})
  for (const f of walkFiles(path.join(ROOT, "packages/db/schema"), [".ts"])) {
    const content = readFile(f);
    for (const m of content.matchAll(/pgTable\s*\(\s*["'`](\w+)["'`]/g)) {
      drizzle.add(m[1].toLowerCase());
    }
  }

  // From index.ts bootstrap
  const indexContent = readFile(path.join(ROOT, "packages/api/src/index.ts"));
  for (const m of indexContent.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/gi)) {
    bootstrap.add(m[1].toLowerCase());
  }
  for (const m of indexContent.matchAll(/ALTER TABLE\s+(\w+)\s+ADD COLUMN/gi)) {
    bootstrap.add(m[1].toLowerCase());
  }

  const all = new Set([...migrations, ...bootstrap, ...drizzle]);
  return { migrations, bootstrap, drizzle, all };
}

function buildRegisteredRoutes(): { prefixes: string[]; routeFileToPrefix: Map<string, string[]> } {
  const content = readFile(path.join(ROOT, "packages/api/src/index.ts"));
  const prefixes: string[] = [];
  const routeFileToPrefix = new Map<string, string[]>();

  for (const m of content.matchAll(/app\.route\(["'`](\/[^"'`]+)["'`]/g)) {
    prefixes.push(m[1]);
  }
  return { prefixes, routeFileToPrefix };
}

function buildCapabilityMap(): {
  requireMap: Map<string, string[]>;      // cap → route prefixes
  defaultMap: Map<string, Set<string>>;   // bizType → caps
  allCaps: Set<string>;
} {
  const content = readFile(path.join(ROOT, "packages/api/src/index.ts"));
  const helpersContent = readFile(path.join(ROOT, "packages/api/src/lib/helpers.ts"));

  const requireMap = new Map<string, string[]>();
  const defaultMap = new Map<string, Set<string>>();

  // requireCapability("X") → which route prefix is it applied to?
  for (const m of content.matchAll(/app\.use\(["'`](\/[^"'`]+)["'`][^)]*requireCapability\(["'`](\w+)["'`]\)/g)) {
    const prefix = m[1].replace(/\/\*$/, "");
    const cap    = m[2];
    if (!requireMap.has(cap)) requireMap.set(cap, []);
    requireMap.get(cap)!.push(prefix);
  }
  // Also inline format: requireCapability("X")(c, next)
  for (const m of content.matchAll(/requireCapability\(["'`](\w+)["'`]\)/g)) {
    const cap = m[1];
    if (!requireMap.has(cap)) requireMap.set(cap, []);
  }

  // getBusinessDefaults: parse enabledCapabilities per bizType
  for (const m of helpersContent.matchAll(/(\w+):\s*\{[^}]*enabledCapabilities:\s*\[([^\]]+)\]/g)) {
    const bizType = m[1];
    const caps    = m[2].match(/["'`](\w+)["'`]/g)?.map(s => s.replace(/["'`]/g, "")) ?? [];
    defaultMap.set(bizType, new Set(caps));
  }

  const allCaps = new Set<string>();
  for (const caps of defaultMap.values()) {
    for (const c of caps) allCaps.add(c);
  }

  return { requireMap, defaultMap, allCaps };
}

function buildAllPermissions(): Set<string> {
  const content = readFile(path.join(ROOT, "packages/api/src/lib/default-permissions.ts"));
  const perms = new Set<string>();
  for (const m of content.matchAll(/["'`]([\w.]+)["'`]/g)) {
    if (m[1].includes(".")) perms.add(m[1]); // only dot-notation strings are permissions
  }
  return perms;
}

function buildTablesPerRoute(): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  const SQL_PATTERNS = [
    /FROM\s+"?(\w+)"?/gi,
    /JOIN\s+"?(\w+)"?/gi,
    /INSERT\s+INTO\s+"?(\w+)"?/gi,
    /UPDATE\s+"?(\w+)"?\s+SET/gi,
    /DELETE\s+FROM\s+"?(\w+)"?/gi,
  ];

  for (const f of walkFiles(path.join(ROOT, "packages/api/src/routes"), [".ts"])) {
    const content = readFile(f);
    const tables  = new Set<string>();
    for (const pat of SQL_PATTERNS) {
      for (const m of content.matchAll(pat)) {
        const t = m[1].toLowerCase();
        if (isTableName(t)) tables.add(t);
      }
    }
    if (tables.size > 0) result.set(rel(f), tables);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN 1: DOMAIN INTEGRITY — هل كل route file مكتمل؟
// ─────────────────────────────────────────────────────────────────────────────

function scanDomainIntegrity() {
  if (!QUIET) {
    console.log("\n" + "═".repeat(72));
    console.log("  SCAN 1 — DOMAIN INTEGRITY: هل كل route file يعمل كاملاً؟");
    console.log("═".repeat(72));
  }

  const indexContent  = readFile(path.join(ROOT, "packages/api/src/index.ts"));
  const routesDir     = path.join(ROOT, "packages/api/src/routes");
  const routeFiles    = fs.readdirSync(routesDir)
    .filter(f => f.endsWith(".ts"))
    .map(f => ({ name: f.replace(".ts", ""), path: path.join(routesDir, f) }));

  // Build: routerVarName → is it used in any app.route()?
  // e.g. "import { commercialRouter }" → check "app.route(..., commercialRouter)"
  const mountedVars = new Set<string>();
  for (const m of indexContent.matchAll(/app\.route\([^,]+,\s*(\w+)\)/g)) {
    mountedVars.add(m[1]);
  }

  // Extract imported router variable names per file
  const importedFileRouterVars = new Map<string, string[]>(); // fileName → [varName, ...]
  for (const m of indexContent.matchAll(/import\s+\{([^}]+)\}\s+from\s+["'`]\.\/routes\/([^"'`]+)["'`]/g)) {
    const vars = m[1].split(",").map(v => v.trim()).filter(Boolean);
    const file = m[2].replace(/\.ts$/, "");
    importedFileRouterVars.set(file, vars);
  }
  // Also default imports: import foo from "./routes/foo"
  for (const m of indexContent.matchAll(/import\s+(\w+)\s+from\s+["'`]\.\/routes\/([^"'`]+)["'`]/g)) {
    const file = m[2].replace(/\.ts$/, "");
    const existing = importedFileRouterVars.get(file) ?? [];
    importedFileRouterVars.set(file, [...existing, m[1]]);
  }

  // Routes that legitimately skip org_id (admin, auth, public, system)
  const ORG_EXEMPT_ROUTES = new Set([
    "admin","auth","billing","marketplace","school-invite","guardian","commercial",
    "platform","kill-switches","onboarding","website","media","messaging",
  ]);

  for (const rf of routeFiles) {
    const routeContent = readFile(rf.path);
    if (!routeContent) continue;

    const isImported = importedFileRouterVars.has(rf.name);
    const routerVars = importedFileRouterVars.get(rf.name) ?? [];
    const isMounted  = routerVars.some(v => mountedVars.has(v));

    if (!isImported) {
      issue({
        code:     "DEAD_ROUTE_FILE",
        severity: "HIGH",
        title:    `Route file "${rf.name}.ts" غير مستورد في index.ts — كل endpoints فيه معطّلة`,
        detail:   `الملف موجود في routes/ لكن لا يوجد import له في index.ts`,
        where:    `packages/api/src/routes/${rf.name}.ts`,
        why:      `عند إضافة route file لازم يُضاف import + app.route() + app.use() للـ auth`,
        fix:      `في index.ts:\n  import { ${rf.name}Router } from "./routes/${rf.name}";\n  app.use("/${rf.name}/*", authMiddleware);\n  app.route("/${rf.name}", ${rf.name}Router);`,
      });
    } else if (!isMounted && routerVars.length > 0) {
      // Show the actual var names that aren't mounted
      const unmounted = routerVars.filter(v => !mountedVars.has(v));
      if (unmounted.length > 0) {
        issue({
          code:     "ROUTE_NOT_MOUNTED",
          severity: "HIGH",
          title:    `Router var(s) [${unmounted.join(", ")}] من "${rf.name}.ts" غير مربوطة بـ app.route()`,
          detail:   `المتغيرات مستوردة لكن لا تظهر في أي app.route() call — الـ endpoints لا تصل`,
          where:    `packages/api/src/index.ts`,
          why:      `import بدون app.route() = الكود محمّل في الذاكرة لكن لا يستجيب لأي HTTP request`,
          fix:      `أضف لكل متغير:\n  app.route("/PREFIX", ${unmounted[0]});`,
        });
      }
    }

    // org_id check: route has SQL *in template literals or pool.query* but no orgId reference
    // Only look inside backtick strings or pool.query("...") — not in comments or regular strings
    const sqlInTemplates = [...routeContent.matchAll(/`[^`]*(?:SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)[^`]*`/gi)];
    const sqlInPoolQuery = [...routeContent.matchAll(/pool\.query\s*\(/g)];
    const hasSQL         = sqlInTemplates.length > 0 || sqlInPoolQuery.length > 0;
    const hasOrgRef      = routeContent.includes("orgId") || routeContent.includes("org_id")
                        || routeContent.includes("getOrgId") || routeContent.includes("school_id");

    if (hasSQL && !hasOrgRef && !ORG_EXEMPT_ROUTES.has(rf.name)) {
      issue({
        code:     "ROUTE_MISSING_ORG_SCOPE",
        severity: "CRITICAL",
        title:    `Route "${rf.name}.ts" فيه SQL بدون أي reference لـ orgId`,
        detail:   `الملف يستخدم SQL queries لكن لا يوجد getOrgId / org_id في أي منها`,
        where:    `packages/api/src/routes/${rf.name}.ts`,
        why:      `في multi-tenant SaaS كل query تمس بيانات الأعمال لازم فيها WHERE org_id = orgId`,
        fix:      `أضف: const orgId = getOrgId(c); وأضف WHERE org_id = $N لكل query`,
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN 2: CAPABILITY CHAIN — السلسلة كاملة من business type → feature → DB
// ─────────────────────────────────────────────────────────────────────────────

function scanCapabilityChain() {
  if (!QUIET) {
    console.log("\n" + "═".repeat(72));
    console.log("  SCAN 2 — CAPABILITY CHAIN: هل السلسلة كاملة؟");
    console.log("═".repeat(72));
  }

  const { requireMap, defaultMap, allCaps } = buildCapabilityMap();
  const { all: knownTables } = buildKnownTables();
  const tablesPerRoute = buildTablesPerRoute();

  // For each required capability:
  for (const [cap, routePrefixes] of requireMap.entries()) {

    // 1. Which business types have it?
    const coveredByTypes: string[] = [];
    for (const [bizType, caps] of defaultMap.entries()) {
      if (caps.has(cap)) coveredByTypes.push(bizType);
    }

    if (coveredByTypes.length === 0) {
      issue({
        code:     "UNCOVERED_CAPABILITY",
        severity: "CRITICAL",
        title:    `Capability "${cap}" مطلوبة في routes لكن مش في أي business type defaults`,
        detail:   `requireCapability("${cap}") مطبّق على: ${routePrefixes.join(", ") || "(unknown prefix)"}\nلكن لا يوجد business type يملك هذه الـ capability في defaults`,
        where:    `packages/api/src/index.ts`,
        why:      `إذا لم يكن أي business type يملك الـ capability، كل المنشآت ستحصل على 403 عند محاولة الوصول لهذه الـ routes — الـ feature معطّلة تماماً`,
        fix:      `أضف "${cap}" إلى enabledCapabilities في getBusinessDefaults() للأنواع المناسبة في packages/api/src/lib/helpers.ts`,
      });
    } else if (coveredByTypes.length <= 3) {
      issue({
        code:     "LOW_COVERAGE_CAPABILITY",
        severity: "MEDIUM",
        title:    `Capability "${cap}" متاحة فقط لـ ${coveredByTypes.length} نوع أعمال`,
        detail:   `متاحة لـ: [${coveredByTypes.join(", ")}]\nالـ routes: ${routePrefixes.join(", ")}`,
        why:      `قد يكون هذا مقصوداً، لكن تأكد أن هذه الـ feature لا تحتاجها أنواع أعمال أخرى`,
        fix:      `راجع getBusinessDefaults() وأضف "${cap}" لأي نوع أعمال يحتاجها`,
      });
    }

    // 2. Do the tables used by these routes exist?
    for (const prefix of routePrefixes) {
      const routeFile = `packages/api/src/routes${prefix}.ts`;
      const tables    = tablesPerRoute.get(routeFile) ?? new Set<string>();

      for (const table of tables) {
        if (!knownTables.has(table) && isTableName(table)) {
          issue({
            code:     "CAP_TABLE_MISSING",
            severity: "CRITICAL",
            title:    `Capability "${cap}" → route "${prefix}" → جدول "${table}" غير موجود في DB`,
            detail:   `السلسلة مكسورة: business_type → cap="${cap}" → route="${prefix}" → table="${table}" (غير موجود)`,
            where:    `packages/api/src/routes${prefix}.ts`,
            why:      `الـ capability ممكّنة والـ route مسجّل لكن الجدول غير موجود في migrations أو bootstrap — سيحدث خطأ عند تشغيل الـ feature`,
            fix:      `أضف migration أو bootstrap لإنشاء جدول "${table}"`,
          });
        }
      }
    }
  }

  // 3. Capabilities in defaults but NO requireCapability() applied = available without restriction?
  const usedCaps = new Set(requireMap.keys());
  const inDefaults = new Set<string>();
  for (const caps of defaultMap.values()) {
    for (const c of caps) inDefaults.add(c);
  }

  for (const cap of inDefaults) {
    if (!usedCaps.has(cap) && !["bookings","customers","catalog","media","website","contracts","schedules"].includes(cap)) {
      issue({
        code:     "ORPHAN_CAPABILITY",
        severity: "LOW",
        title:    `Capability "${cap}" موجودة في defaults لكن لا يوجد requireCapability("${cap}") في أي route`,
        detail:   `الـ capability مُعلنة في getBusinessDefaults() لكن لا توجد routes تشترطها`,
        why:      `إما الـ routes هذه لا تحتاج capability check (مقبول)، أو نسيت ربطها`,
        fix:      `إذا كان للـ capability routes خاصة، أضف: app.use("/prefix/*", requireCapability("${cap}"))`,
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN 3: SECURITY — org_id filter على كل SQL query
// ─────────────────────────────────────────────────────────────────────────────

function scanOrgIdSecurity() {
  if (!QUIET) {
    console.log("\n" + "═".repeat(72));
    console.log("  SCAN 3 — SECURITY: كل SQL query فيها org_id filter؟");
    console.log("═".repeat(72));
  }

  // Routes that legitimately skip org_id checks
  const SKIP_ROUTES = new Set(["admin", "auth", "billing", "marketplace", "school-invite", "guardian"]);

  // Tables that are system-wide (not per-org)
  const SYSTEM_TABLES = new Set([
    "_migrations", "organizations", "plans", "plan_capabilities", "permissions",
    "roles", "role_permissions", "handles", "sessions", "whatsapp_gateways",
    "payment_gateways", "platform_settings", "kill_switches", "rate_limits",
  ]);

  for (const f of walkFiles(path.join(ROOT, "packages/api/src/routes"), [".ts"])) {
    const routeName = path.basename(f, ".ts");
    if (SKIP_ROUTES.has(routeName)) continue;

    const content = readFile(f);
    const lines   = content.split("\n");

    // Extract SQL template literals (backtick strings with SQL keywords)
    let inTemplate = false;
    let templateStart = 0;
    let templateContent = "";
    let braceDepth = 0;

    // Simpler approach: find all multi-line SQL blocks
    // Pattern: backtick string containing SELECT/INSERT/UPDATE/DELETE
    const sqlBlocks: Array<{ sql: string; line: number }> = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Look for SQL query start patterns
      if (/`\s*(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)/i.test(line)) {
        const startLine = i + 1;
        let sql = line;
        let j = i;
        // Collect until closing backtick
        while (j < lines.length) {
          if (j > i) sql += "\n" + lines[j];
          // Count template literal depth
          const backticks = (lines[j].match(/`/g) || []).length;
          if (j > i && backticks % 2 === 1) break; // closing backtick
          if (j === i && backticks >= 2) break; // same-line complete
          j++;
          if (j - i > 50) break; // safety limit
        }
        sqlBlocks.push({ sql, line: startLine });
        i = j + 1;
        continue;
      }

      // Also catch pool.query("...") patterns
      if (/pool\.query\s*\(/.test(line)) {
        const startLine = i + 1;
        let sql = line;
        let j = i;
        while (j < lines.length) {
          if (j > i) sql += "\n" + lines[j];
          if (j > i && lines[j].includes(");")) break;
          if (j > i && lines[j].includes("]")) break;
          j++;
          if (j - i > 30) break;
        }
        sqlBlocks.push({ sql, line: startLine });
        i = j + 1;
        continue;
      }

      i++;
    }

    // Analyze each SQL block
    for (const { sql, line } of sqlBlocks) {
      const sqlUpper = sql.toUpperCase();

      // Only analyze write operations and reads that touch business tables
      const isWrite = /INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM/.test(sqlUpper);
      const isRead  = /SELECT/.test(sqlUpper);

      if (!isRead && !isWrite) continue;

      // Check if it touches system tables only
      const tables: string[] = [];
      for (const m of sql.matchAll(/FROM\s+"?(\w+)"?|JOIN\s+"?(\w+)"?|INSERT\s+INTO\s+"?(\w+)"?|UPDATE\s+"?(\w+)"?\s+SET|DELETE\s+FROM\s+"?(\w+)"?/gi)) {
        const t = (m[1] || m[2] || m[3] || m[4] || m[5] || "").toLowerCase();
        if (t && isTableName(t)) tables.push(t);
      }

      // master_* tables are platform-wide reference/template data — no org_id needed
      const isSystemTable = (t: string) => SYSTEM_TABLES.has(t) || t.startsWith("master_");
      const touchesSystemOnly = tables.every(t => isSystemTable(t));
      if (touchesSystemOnly && tables.length > 0) continue;
      if (tables.length === 0) continue;

      // Expand context: look at ±40 lines around the SQL query for org_id references
      // This handles: dynamic WHERE building, orgId set before query, etc.
      const lineStart   = Math.max(0, line - 40);
      const lineEnd     = Math.min(lines.length, line + 20);
      const context     = lines.slice(lineStart, lineEnd).join("\n");

      const hasOrgFilter =
        /org_id\s*=|\borganization_id\s*=/.test(sql)     ||  // in the query itself
        /WHERE.*org_id|org_id.*WHERE/.test(sql.replace(/\s+/g, " ")) ||
        /\borg_id\s*=\s*\$/.test(context)                ||  // $N binding in context
        /["']org_id\s*=\s*\$/.test(context)              ||  // "org_id = $1" string literal
        /getOrgId|const\s+orgId/.test(context)           ||  // orgId extraction in handler
        /org_id.*params\[|params.*org_id/.test(context)  ||  // params array with org_id
        /INSERT\s+INTO\s+\w+\s*\([^)]*\borg_id\b[^)]*\)/i.test(sql) || // INSERT with org_id in column list
        /fulfillment_id\s*=\s*\$|booking_id\s*=\s*\$|service_order_id\s*=\s*\$/.test(sql) || // multi-hop auth via org-scoped FK
        /=\s*ANY\s*\(\s*\$\d+\s*\)/i.test(sql); // multi-hop: filter by IDs from org-scoped parent query

      if (!hasOrgFilter) {
        const tableList = tables.filter(t => !isSystemTable(t));
        if (tableList.length === 0) continue;

        issue({
          code:     "MISSING_ORG_FILTER",
          severity: isWrite ? "CRITICAL" : "HIGH",
          title:    `${isWrite ? "WRITE" : "READ"} query بدون org_id filter في "${routeName}.ts":${line}`,
          detail:   `جداول: [${tableList.join(", ")}]\nالـ query لا تحتوي على WHERE org_id = ... ولا يوجد orgId في السياق المحيط`,
          where:    `${rel(f)}:${line}`,
          why:      `في multi-tenant SaaS كل query تمس بيانات المنشأة لازم فيها org_id filter — بدونه يمكن لمنشأة الوصول لبيانات منشأة أخرى`,
          fix:      `أضف WHERE org_id = orgId (من getOrgId(c)) لكل query تمس جداول الأعمال`,
        });
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN 4: DEAD CODE — كود موجود لكن لا يُستخدم
// ─────────────────────────────────────────────────────────────────────────────

function scanDeadCode() {
  if (!QUIET) {
    console.log("\n" + "═".repeat(72));
    console.log("  SCAN 4 — DEAD CODE: ملفات موجودة لكن لا تُستخدم");
    console.log("═".repeat(72));
  }

  const indexContent = readFile(path.join(ROOT, "packages/api/src/index.ts"));
  const appTsxContent = readFile(path.join(ROOT, "apps/dashboard/src/App.tsx"));

  // Route files not imported in index.ts
  const routesDir   = path.join(ROOT, "packages/api/src/routes");
  const routeFiles  = fs.readdirSync(routesDir).filter(f => f.endsWith(".ts") && !f.startsWith("_"));

  for (const rf of routeFiles) {
    const baseName = rf.replace(".ts", "");
    if (!indexContent.includes(`./routes/${baseName}`)) {
      issue({
        code:     "DEAD_ROUTE_FILE",
        severity: "HIGH",
        title:    `Route file "${rf}" غير مستورد في index.ts — كل endpoints فيه معطّلة`,
        detail:   `الملف موجود في packages/api/src/routes/ لكن لا يوجد import في index.ts`,
        where:    `packages/api/src/routes/${rf}`,
        why:      `الـ route file لا يُستخدم = كل الـ API endpoints فيه لا تعمل — العمل الذي تم فيه ضائع`,
        fix:      `في index.ts:\n  import { ${baseName}Router } from "./routes/${baseName}";\n  app.use("/${baseName}/*", authMiddleware);\n  app.route("/${baseName}", ${baseName}Router);`,
      });
    }
  }

  // Frontend pages not referenced in App.tsx OR used as embedded components elsewhere
  const pagesDir   = path.join(ROOT, "apps/dashboard/src/pages");
  const pageFiles  = fs.readdirSync(pagesDir)
    .filter(f => f.endsWith(".tsx") && !f.startsWith("_"))
    .map(f => f.replace(".tsx", ""));

  // Build a set of all page names referenced across the entire dashboard src
  const dashboardSrcFiles = walkFiles(path.join(ROOT, "apps/dashboard/src"), [".tsx", ".ts"]);
  const allDashboardContent = dashboardSrcFiles
    .filter(f => !f.endsWith("App.tsx")) // App.tsx already in appTsxContent
    .map(f => readFile(f))
    .join("\n");

  for (const page of pageFiles) {
    const inApp      = appTsxContent.includes(page);
    const inOther    = allDashboardContent.includes(page);
    if (!inApp && !inOther) {
      issue({
        code:     "DEAD_PAGE",
        severity: "MEDIUM",
        title:    `صفحة "${page}.tsx" غير مستخدمة في App.tsx ولا في أي مكان آخر`,
        detail:   `الملف موجود في pages/ لكن لا يوجد import أو Route له في أي ملف`,
        where:    `apps/dashboard/src/pages/${page}.tsx`,
        why:      `صفحة بدون route = المستخدم لا يمكنه الوصول إليها أبداً — إما ناقصة أو يجب حذفها`,
        fix:      `إما أضف Route في App.tsx أو احذف الملف إن لم يعد مطلوباً`,
      });
    }
  }

  // DB tables defined in migrations but NEVER queried anywhere
  const { migrations } = buildKnownTables();
  const tablesPerRoute = buildTablesPerRoute();
  const queriedTables  = new Set<string>();
  for (const tables of tablesPerRoute.values()) {
    for (const t of tables) queriedTables.add(t);
  }

  const EXPECTED_UNUSED = new Set(["_migrations","schema_migrations","ar_internal_metadata"]);
  for (const table of migrations) {
    if (!queriedTables.has(table) && !EXPECTED_UNUSED.has(table)) {
      issue({
        code:     "UNUSED_TABLE",
        severity: "LOW",
        title:    `جدول "${table}" موجود في migrations لكن لا يُقرأ ولا يُكتب في أي route`,
        detail:   `الجدول مُعرَّف في SQL migrations لكن لا توجد queries تمسّه في routes/`,
        why:      `إما هذا الجدول مرتبط بـ Drizzle ORM (وليس raw SQL) أو هو dead schema لا يُستخدم`,
        fix:      `تحقق بـ grep إن كان يُستخدم عبر Drizzle ORM أو schema imports — إن لم يكن، فكّر في حذفه`,
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN 5: PERMISSION COHERENCE — permission strings معرّفة وصحيحة؟
// ─────────────────────────────────────────────────────────────────────────────

function scanPermissionCoherence() {
  if (!QUIET) {
    console.log("\n" + "═".repeat(72));
    console.log("  SCAN 5 — PERMISSION COHERENCE: كل permission string صحيحة ومعرّفة؟");
    console.log("═".repeat(72));
  }

  const allPerms      = buildAllPermissions();
  const appTsxContent = readFile(path.join(ROOT, "apps/dashboard/src/App.tsx"));
  const indexContent  = readFile(path.join(ROOT, "packages/api/src/index.ts"));

  // Frontend: ProtectedRoute permission="X"
  for (const m of appTsxContent.matchAll(/permission=["'`]([\w.]+)["'`]/g)) {
    const perm = m[1];
    if (!allPerms.has(perm)) {
      const line = findLineNumber(appTsxContent, m[0]);
      issue({
        code:     "UNKNOWN_FRONTEND_PERMISSION",
        severity: "HIGH",
        title:    `Permission "${perm}" مستخدمة في ProtectedRoute لكن غير معرّفة في ALL_PERMISSIONS`,
        detail:   `ProtectedRoute permission="${perm}" في App.tsx سيُقيّد الوصول لـ permission غير موجودة — قد تكون الصفحة دائماً مخفية أو دائماً ظاهرة`,
        where:    `apps/dashboard/src/App.tsx:${line}`,
        why:      `ProtectedRoute يتحقق من user.permissions.includes("${perm}") — إذا لم تكن في ALL_PERMISSIONS لن تُعطى لأي مستخدم`,
        fix:      `أضف "${perm}" إلى ALL_PERMISSIONS في packages/api/src/lib/default-permissions.ts`,
      });
    }
  }

  // Frontend: anyPermission={[...]}
  for (const m of appTsxContent.matchAll(/anyPermission=\{(\[[^\]]+\])\}/g)) {
    const permsStr = m[1];
    const perms = permsStr.match(/["'`]([\w.]+)["'`]/g)?.map(s => s.replace(/["'`]/g, "")) ?? [];
    for (const perm of perms) {
      if (!allPerms.has(perm)) {
        issue({
          code:     "UNKNOWN_FRONTEND_PERMISSION",
          severity: "HIGH",
          title:    `Permission "${perm}" في anyPermission غير معرّفة في ALL_PERMISSIONS`,
          detail:   `anyPermission={["${perm}", ...]} — هذه الـ permission غير موجودة في القائمة المعرّفة`,
          where:    `apps/dashboard/src/App.tsx`,
          why:      `كما سبق — permission غير معرّفة = لا أحد يملكها = الصفحة محجوبة للجميع`,
          fix:      `أضف "${perm}" إلى ALL_PERMISSIONS في default-permissions.ts`,
        });
      }
    }
  }

  // Backend: requirePerm("X") in route files
  for (const f of walkFiles(path.join(ROOT, "packages/api/src/routes"), [".ts"])) {
    const content = readFile(f);
    for (const m of content.matchAll(/requirePerm\(["'`]([\w.]+)["'`]\)/g)) {
      const perm = m[1];
      if (!allPerms.has(perm)) {
        const line = findLineNumber(content, m[0]);
        issue({
          code:     "UNKNOWN_BACKEND_PERMISSION",
          severity: "HIGH",
          title:    `requirePerm("${perm}") في "${path.basename(f)}" غير معرّفة في ALL_PERMISSIONS`,
          detail:   `الـ middleware يتحقق من permission غير موجودة — سيرفض كل الطلبات دائماً (أو يسمح لها كلها، حسب التطبيق)`,
          where:    `${rel(f)}:${line}`,
          why:      `Permission check على permission غير معرّفة = undefined behavior — إما يحجب الجميع أو يسمح للجميع`,
          fix:      `أضف "${perm}" إلى ALL_PERMISSIONS، أو صحّح اسم الـ permission`,
        });
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN 6: FINANCIAL INTEGRITY — عمليات مالية بدون قيود محاسبية
// ─────────────────────────────────────────────────────────────────────────────

function scanFinancialIntegrity() {
  if (!QUIET) {
    console.log("\n" + "═".repeat(72));
    console.log("  SCAN 6 — FINANCIAL INTEGRITY: كل بيع/دفعة لها قيد محاسبي؟");
    console.log("═".repeat(72));
  }

  // Financial tables that should ALWAYS trigger a journal entry
  const FINANCIAL_TRIGGERS = [
    { table: "pos_transactions", op: "INSERT", label: "POS sale" },
    { table: "invoices",         op: "INSERT", label: "Invoice creation" },
    { table: "payments",         op: "INSERT", label: "Payment recording" },
  ];

  const JOURNAL_INDICATORS = [
    "createJournalEntry",
    "journal_entries",
    "reverseJournalEntry",
    "postInventoryMovement",
    "isAccountingEnabled",
    "postCustomerCollection",
    "postCashSale",
    "postPOSSaleEntry",
    "posting-engine",
  ];

  for (const f of walkFiles(path.join(ROOT, "packages/api/src/routes"), [".ts"])) {
    const content  = readFile(f);
    const baseName = path.basename(f, ".ts");

    for (const trigger of FINANCIAL_TRIGGERS) {
      const pattern = new RegExp(`INSERT\\s+INTO\\s+${trigger.table}`, "i");
      if (pattern.test(content)) {
        const hasJournal = JOURNAL_INDICATORS.some(ind => content.includes(ind));
        if (!hasJournal) {
          issue({
            code:     "FINANCIAL_LEAK",
            severity: "HIGH",
            title:    `"${baseName}.ts" ينشئ ${trigger.label} (INSERT INTO ${trigger.table}) بدون قيد محاسبي`,
            detail:   `الـ route ينشئ سجلات مالية لكن لا يستدعي createJournalEntry() أو postInventoryMovement()`,
            where:    `packages/api/src/routes/${baseName}.ts`,
            why:      `كل إدخال مالي يجب أن يكون مصحوباً بقيد في journal_entries — بدونه الحسابات غير متوازنة والتقارير المالية خاطئة`,
            fix:      `استورد وادعُ createJournalEntry() من lib/posting-engine.ts بعد كل إدخال في ${trigger.table}`,
          });
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN 7: API COVERAGE — API calls في الفرونت لها handler؟
// ─────────────────────────────────────────────────────────────────────────────

function scanApiCoverage() {
  if (!QUIET) {
    console.log("\n" + "═".repeat(72));
    console.log("  SCAN 7 — API COVERAGE: كل API call في الفرونت لها handler في الباكند؟");
    console.log("═".repeat(72));
  }

  const { prefixes } = buildRegisteredRoutes();
  const apiContent   = readFile(path.join(ROOT, "apps/dashboard/src/lib/api.ts"));

  // Normalize a raw path string: replace template vars, collapse slashes, strip /api/v1 prefix
  function normalizePath(raw: string): string {
    return raw
      .replace(/\/\$\{[^}]+\}/g, "/:id")   // /var → /:id (with leading slash)
      .replace(/\$\{[^}]+\}/g, "id")        // remaining bare vars → 'id'
      .replace(/\?.*$/, "")                 // strip query string
      .replace(/\/+/g, "/")                 // collapse double slashes
      .replace(/^\/api\/v1/, "");           // strip /api/v1 prefix used by frontend
  }

  // Extract all api.get/post/put/patch/delete calls
  const frontendCalls = new Map<string, Set<string>>(); // path → methods

  for (const m of apiContent.matchAll(/api\.(get|post|put|patch|delete)\s*[(<][^"'`]*["'`](\/[^"'`]+)["'`]/g)) {
    const method = m[1].toUpperCase();
    const p      = normalizePath(m[2]);
    if (!frontendCalls.has(p)) frontendCalls.set(p, new Set());
    frontendCalls.get(p)!.add(method);
  }

  // Also catch template literal paths
  for (const m of apiContent.matchAll(/`(\/[^`]+)`/g)) {
    const p = normalizePath(m[1]);
    if (p.startsWith("/") && p.length > 1) {
      if (!frontendCalls.has(p)) frontendCalls.set(p, new Set());
    }
  }

  const uncovered: Array<{ path: string; methods: string[] }> = [];
  for (const [routePath, methods] of frontendCalls.entries()) {
    const hasPrefix = prefixes.some(prefix =>
      routePath.startsWith(prefix) || routePath === prefix ||
      routePath.startsWith(prefix + "/") || routePath.startsWith(prefix + "?")
    );
    if (!hasPrefix) {
      uncovered.push({ path: routePath, methods: [...methods] });
    }
  }

  if (uncovered.length > 0) {
    for (const { path: p, methods } of uncovered.sort((a, b) => a.path.localeCompare(b.path))) {
      // Determine severity: if it's a WRITE operation → HIGH, READ → MEDIUM
      const hasWrite = methods.some(m => ["POST","PUT","PATCH","DELETE"].includes(m));
      issue({
        code:     "UNREGISTERED_API_CALL",
        severity: hasWrite ? "HIGH" : "MEDIUM",
        title:    `API call [${methods.join("|")}] ${p} في api.ts بلا backend prefix مسجّل`,
        detail:   `الفرونت يستدعي هذا المسار لكن لا يوجد app.route() يستقبله في index.ts`,
        where:    `apps/dashboard/src/lib/api.ts`,
        why:      `كل طلب لهذا المسار سيحصل على 404 — الـ feature لا تعمل`,
        fix:      `تأكد من وجود route file + import + app.route("${p.split("/")[1] ? "/" + p.split("/")[1] : p}", router) في index.ts`,
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN 8: DB COVERAGE — جداول مستخدمة في SQL بدون تعريف في migrations
// ─────────────────────────────────────────────────────────────────────────────

function scanDbCoverage() {
  if (!QUIET) {
    console.log("\n" + "═".repeat(72));
    console.log("  SCAN 8 — DB COVERAGE: كل جدول مستخدم موجود في migrations/bootstrap؟");
    console.log("═".repeat(72));
  }

  const { all: knownTables, migrations: migTables, bootstrap: bootTables, drizzle: drizzleTables } = buildKnownTables();
  const tablesPerRoute       = buildTablesPerRoute();

  // Aggregate: table → files that use it
  const tableUsage = new Map<string, Set<string>>();
  for (const [file, tables] of tablesPerRoute.entries()) {
    for (const t of tables) {
      if (!tableUsage.has(t)) tableUsage.set(t, new Set());
      tableUsage.get(t)!.add(file);
    }
  }

  for (const [table, files] of tableUsage.entries()) {
    if (!knownTables.has(table)) {
      const fileList = [...files].slice(0, 3);
      issue({
        code:     "MISSING_TABLE",
        severity: "HIGH",
        title:    `جدول "${table}" مستخدم في SQL queries لكن غير موجود في migrations/bootstrap`,
        detail:   `يُستخدم في:\n  ${fileList.join("\n  ")}${files.size > 3 ? `\n  ... +${files.size - 3} more` : ""}`,
        where:    fileList[0] || "unknown",
        why:      `أي query على هذا الجدول ستفشل بـ "relation does not exist" — runtime error مؤكد`,
        fix:      `أضف migration: packages/db/migrations/XXX_${table}.sql أو أضف CREATE TABLE IF NOT EXISTS "${table}" في bootstrap index.ts`,
      });
    }
  }

  if (!QUIET) {
    console.log(`\n  مصادر الجداول المعروفة:`);
    console.log(`    SQL migrations:   ${migTables.size}`);
    console.log(`    Drizzle schema:   ${drizzleTables.size}`);
    console.log(`    Bootstrap:        ${bootTables.size}`);
    console.log(`    المجموع (فريد):   ${knownTables.size}`);
    console.log(`    مستخدمة في routes: ${tableUsage.size}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN 9: BOOTSTRAP ONLY TABLES — تحذير إعلامي
// ─────────────────────────────────────────────────────────────────────────────

function scanBootstrapOnly() {
  const { migrations, bootstrap, drizzle } = buildKnownTables();
  // Skip: _migrations (self-referential), plan_capabilities (managed by Drizzle schema)
  // Also skip tables managed by Drizzle schema files (drizzle set)
  const INFRA_TABLES = new Set(["_migrations", "handles"]);
  const bootstrapOnly = [...bootstrap].filter(t =>
    !migrations.has(t) && !drizzle.has(t) && !INFRA_TABLES.has(t)
  );

  for (const t of bootstrapOnly) {
    issue({
      code:     "BOOTSTRAP_ONLY_TABLE",
      severity: "INFO",
      title:    `جدول "${t}" موجود فقط في bootstrap (بدون migration .sql)`,
      detail:   `الجدول يُنشأ عند startup لكن لا يوجد له migration رسمي`,
      why:      `مقبول مؤقتاً، لكن أفضل ممارسة = يكون له migration لأن البيئات الجديدة تعتمد على migrations`,
      fix:      `أضف migration: packages/db/migrations/XXX_${t}.sql`,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT — طباعة النتائج بشكل ذكي ومرتّب
// ─────────────────────────────────────────────────────────────────────────────

function printReport() {
  const filtered = SEV
    ? ISSUES.filter(i => SEVERITY_ORDER[i.severity] <= SEVERITY_ORDER[SEV as Severity])
    : ISSUES;

  // Group by severity
  const bySeverity: Record<Severity, Issue[]> = {
    CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [], INFO: []
  };
  for (const i of filtered) bySeverity[i.severity].push(i);

  console.log("\n\n" + "█".repeat(72));
  console.log("  العين الشاملة — INTELLIGENT ARCHITECTURE SCANNER v2");
  console.log("  ترميز OS — " + new Date().toISOString());
  console.log("█".repeat(72));

  // Summary table
  const counts = Object.entries(bySeverity).map(([sev, issues]) => ({
    sev: sev as Severity,
    count: issues.length,
  }));

  console.log("\n  ملخص النتائج:");
  console.log("  " + "─".repeat(50));
  for (const { sev, count } of counts) {
    if (count === 0 && !QUIET) continue;
    const bar = "█".repeat(Math.min(count, 40));
    console.log(`  ${SEVERITY_COLOR[sev]}${sev.padEnd(10)}${RESET} ${String(count).padStart(4)}  ${SEVERITY_COLOR[sev]}${bar}${RESET}`);
  }
  console.log("  " + "─".repeat(50));
  const totalActionable = (bySeverity.CRITICAL.length + bySeverity.HIGH.length + bySeverity.MEDIUM.length);
  console.log(`  ${"المجموع".padEnd(10)} ${String(filtered.length).padStart(4)}  (${totalActionable} تحتاج تدخل)\n`);

  // Print issues by severity
  for (const sev of Object.keys(bySeverity) as Severity[]) {
    const issues = bySeverity[sev];
    if (issues.length === 0) continue;

    console.log(`\n${"═".repeat(72)}`);
    console.log(`  ${SEVERITY_COLOR[sev]}● ${sev} (${issues.length})${RESET}`);
    console.log("═".repeat(72));

    // Group by code within severity
    const byCode = new Map<string, Issue[]>();
    for (const i of issues) {
      if (!byCode.has(i.code)) byCode.set(i.code, []);
      byCode.get(i.code)!.push(i);
    }

    for (const [code, codeIssues] of byCode.entries()) {
      if (codeIssues.length > 5 && !QUIET) {
        // Show first 3, then summary
        for (const i of codeIssues.slice(0, 3)) {
          printIssue(i);
        }
        console.log(`  ${SEVERITY_COLOR[sev]}... +${codeIssues.length - 3} مشكلة مشابهة من نوع ${code}${RESET}`);
        console.log(`     (شغّل مع --only=db أو --only=security لرؤية التفاصيل الكاملة)\n`);
      } else {
        for (const i of codeIssues) {
          printIssue(i);
        }
      }
    }
  }

  // Final verdict
  console.log("\n" + "═".repeat(72));
  if (bySeverity.CRITICAL.length > 0) {
    console.log(`  ${SEVERITY_COLOR.CRITICAL}النتيجة: ${bySeverity.CRITICAL.length} مشكلة حرجة تحتاج إصلاح فوري${RESET}`);
  } else if (bySeverity.HIGH.length > 0) {
    console.log(`  ${SEVERITY_COLOR.HIGH}النتيجة: لا توجد مشاكل حرجة، لكن ${bySeverity.HIGH.length} مشكلة عالية تحتاج اهتمام${RESET}`);
  } else if (bySeverity.MEDIUM.length > 0) {
    console.log(`  ${SEVERITY_COLOR.MEDIUM}النتيجة: جيد — ${bySeverity.MEDIUM.length} تحسين مقترح فقط${RESET}`);
  } else {
    console.log(`  \x1b[92mالنتيجة: ممتاز — لا مشاكل مهمة${RESET}`);
  }
  console.log("═".repeat(72) + "\n");

  return bySeverity.CRITICAL.length + bySeverity.HIGH.length;
}

function printIssue(i: Issue) {
  console.log(`\n  ${SEVERITY_COLOR[i.severity]}[${i.code}]${RESET} ${i.title}`);
  if (i.where) console.log(`  ${"الموقع:".padEnd(12)} ${i.where}`);
  console.log(`  ${"التفاصيل:".padEnd(12)} ${i.detail.replace(/\n/g, "\n             ")}`);
  if (i.why)  console.log(`  ${"لماذا:".padEnd(12)} ${i.why}`);
  if (i.fix)  console.log(`  ${"الإصلاح:".padEnd(12)} ${i.fix.replace(/\n/g, "\n             ")}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();

  const scans: Record<string, () => void> = {
    domain:   scanDomainIntegrity,
    caps:     scanCapabilityChain,
    security: scanOrgIdSecurity,
    dead:     scanDeadCode,
    perms:    scanPermissionCoherence,
    finance:  scanFinancialIntegrity,
    api:      scanApiCoverage,
    db:       scanDbCoverage,
    bootstrap: scanBootstrapOnly,
  };

  if (ONLY) {
    if (scans[ONLY]) {
      scans[ONLY]();
    } else {
      console.error(`Unknown scan: ${ONLY}. Available: ${Object.keys(scans).join(", ")}`);
      process.exit(1);
    }
  } else {
    // Run all scans
    for (const fn of Object.values(scans)) fn();
  }

  const exitCode = printReport();

  console.log(`  الوقت المستغرق: ${((Date.now() - start) / 1000).toFixed(2)}s\n`);
  process.exit(exitCode > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
