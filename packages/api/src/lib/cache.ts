// ============================================================
// CacheStore — abstraction layer للكاش
//
// الافتراضي: MemoryStore (unbounded TTL + FIFO eviction)
// جاهز لـ Redis: عند توفر REDIS_URL → استبدل بـ RedisStore
//
// الاستخدام:
//   import { appCache } from "./cache";
//   await appCache.set("key", value, TTL_MS);
//   const v = await appCache.get<MyType>("key");
// ============================================================

export interface ICacheStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
}

// ── In-memory implementation (default) ───────────────────────────────────────
// TTL-aware + bounded size (FIFO eviction عند الامتلاء)
export class MemoryStore implements ICacheStore {
  private readonly store = new Map<string, { value: unknown; expiresAt: number }>();

  constructor(private readonly maxSize: number = 2_000) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      // FIFO eviction — أقدم مدخل
      this.store.delete(this.store.keys().next().value!);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// ── Redis implementation (optional — requires ioredis + REDIS_URL) ────────────
// لتفعيله:
//   1. pnpm add ioredis
//   2. أضف REDIS_URL إلى env
//   3. فعّل الـ class أدناه (أزل التعليق)
//   4. في createCacheStore: أزل التعليق عن سطر new RedisStore(...)
//
// export class RedisStore implements ICacheStore {
//   private client: import("ioredis").Redis;
//
//   constructor(url: string) {
//     const Redis = require("ioredis");
//     this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
//     this.client.on("error", (err: Error) =>
//       console.error("[cache] Redis error:", err.message)
//     );
//   }
//
//   async get<T>(key: string): Promise<T | null> {
//     const raw = await this.client.get(key);
//     return raw ? (JSON.parse(raw) as T) : null;
//   }
//
//   async set(key: string, value: unknown, ttlMs: number): Promise<void> {
//     await this.client.set(key, JSON.stringify(value), "PX", ttlMs);
//   }
//
//   async del(key: string): Promise<void> {
//     await this.client.del(key);
//   }
// }

// ── Factory — يستخدم Redis إذا REDIS_URL موجود، وإلا MemoryStore ─────────────
export function createCacheStore(maxSize?: number): ICacheStore {
  // To enable Redis: uncomment the lines below after installing ioredis + setting REDIS_URL
  // if (process.env.REDIS_URL) {
  //   return new RedisStore(process.env.REDIS_URL);
  // }
  return new MemoryStore(maxSize);
}

// ── Singleton instances مُستخدمة في الـ app ──────────────────────────────────
// permCache: صلاحيات المستخدمين (max 1000, 2min TTL)
export const permCache = createCacheStore(1_000);

// orgStatusCache: حالة اشتراك المنشآت (max 2000, 30s TTL)
export const orgStatusCache = createCacheStore(2_000);

// authRlCache: rate limiter للـ authenticated requests (max 10000, 1min window)
export const authRlCache = createCacheStore(10_000);
