/**
 * sync-team-to-hr.ts
 * يُنشئ HR record لكل عضو فريق ليس لديه واحد بعد
 * Run: npx tsx scripts/sync-team-to-hr.ts
 */
import { db } from "@nasaq/db/client";
import { users, hrEmployees } from "@nasaq/db/schema";
import { eq, and, isNull, notInArray, inArray } from "drizzle-orm";

async function main() {
  // All team members (employees / owners / managers) across all orgs
  const allUsers = await db
    .select({
      id: users.id,
      orgId: users.orgId,
      name: users.name,
      phone: users.phone,
      email: users.email,
      jobTitle: users.jobTitle,
      salary: users.salary,
      startDate: users.startDate,
      status: users.status,
    })
    .from(users)
    .where(eq(users.status, "active" as any));

  if (allUsers.length === 0) {
    console.log("No team members found.");
    return;
  }

  // Find which userIds already have an HR record
  const userIds = allUsers.map((u) => u.id);
  const existing = await db
    .select({ userId: hrEmployees.userId })
    .from(hrEmployees)
    .where(inArray(hrEmployees.userId, userIds));

  const existingUserIds = new Set(existing.map((e) => e.userId));
  const toSync = allUsers.filter((u) => !existingUserIds.has(u.id));

  if (toSync.length === 0) {
    console.log("All team members already have HR records.");
    return;
  }

  console.log(`Syncing ${toSync.length} team members to HR...`);

  // Group by org for sequential employee numbering
  const byOrg = new Map<string, typeof toSync>();
  for (const u of toSync) {
    const list = byOrg.get(u.orgId) ?? [];
    list.push(u);
    byOrg.set(u.orgId, list);
  }

  for (const [orgId, members] of byOrg) {
    // Get current max employee number for this org
    const [last] = await db
      .select({ num: hrEmployees.employeeNumber })
      .from(hrEmployees)
      .where(eq(hrEmployees.orgId, orgId))
      .orderBy(hrEmployees.createdAt)
      .limit(1)
      .then((rows) => rows.reverse());

    let counter = parseInt((last?.num ?? "EMP-000").split("-")[1] || "0");

    for (const u of members) {
      counter++;
      const employeeNumber = `EMP-${String(counter).padStart(3, "0")}`;
      await db.insert(hrEmployees).values({
        orgId,
        userId: u.id,
        employeeNumber,
        fullName: u.name,
        phone: u.phone ?? null,
        email: u.email ?? null,
        jobTitle: u.jobTitle ?? null,
        hireDate: u.startDate
          ? new Date(u.startDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        basicSalary: u.salary ? String(u.salary) : "0",
        status: "active",
      });
      console.log(`  Created HR record for ${u.name} (${employeeNumber})`);
    }
  }

  console.log("Done.");
}

main().catch(console.error).finally(() => process.exit());
