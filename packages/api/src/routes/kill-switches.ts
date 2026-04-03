import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@nasaq/db/client";
import { platformKillSwitches } from "@nasaq/db/schema";
import { superAdminMiddleware } from "../middleware/auth";
import { invalidateKillSwitchCache } from "../lib/authorize";
import { validateBody } from "../lib/helpers";

// ============================================================
// KILL SWITCHES — إدارة إيقاف الميزات على مستوى المنصة
// All routes require super_admin
// ============================================================

type KsVars = { adminId: string; adminName: string; requestId: string };
const killSwitchesRouter = new Hono<{ Variables: KsVars }>();
killSwitchesRouter.use("*", superAdminMiddleware);

// ── GET / — list all kill switches ──────────────────────────
killSwitchesRouter.get("/", async (c) => {
  const rows = await db
    .select()
    .from(platformKillSwitches)
    .orderBy(platformKillSwitches.id);

  return c.json({ data: rows });
});

// ── POST / — upsert a kill switch ───────────────────────────
const upsertSchema = z.object({
  id:         z.string().min(1).max(100),
  isDisabled: z.boolean(),
  reason:     z.string().max(500).optional(),
});

killSwitchesRouter.post("/", async (c) => {
  const body = await validateBody(c, upsertSchema);
  if (!body) return;

  const adminName = c.get("adminName") as string;
  const now       = new Date();

  await db
    .insert(platformKillSwitches)
    .values({
      id:         body.id,
      isDisabled: body.isDisabled,
      reason:     body.reason ?? null,
      disabledBy: body.isDisabled ? adminName : null,
      disabledAt: body.isDisabled ? now : null,
      updatedAt:  now,
    })
    .onConflictDoUpdate({
      target: platformKillSwitches.id,
      set: {
        isDisabled: body.isDisabled,
        reason:     body.reason ?? null,
        disabledBy: body.isDisabled ? adminName : null,
        disabledAt: body.isDisabled ? now : null,
        updatedAt:  now,
      },
    });

  invalidateKillSwitchCache(body.id);
  return c.json({ success: true });
});

// ── DELETE /:id — remove a kill switch ──────────────────────
killSwitchesRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(platformKillSwitches).where(eq(platformKillSwitches.id, id));
  invalidateKillSwitchCache(id);
  return c.json({ success: true });
});

export { killSwitchesRouter };
