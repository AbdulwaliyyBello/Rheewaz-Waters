/**
 * Run after migrations: npm run db:seed
 * Idempotent — safe to re-run. Creates Boss/Admin accounts, provisions the
 * current week, seeds the two known trucks, and (if the corresponding
 * SEED_WORKER env vars are set) creates the two known worker accounts with
 * their truck assignments — via real database relationships, never
 * hard-coded email checks in business logic (spec section 12).
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { hashPassword } from "../src/lib/auth";
import { currentWeekStartISO, ensureWeekProvisioned } from "../src/lib/weeks";
import { DYNA_GEOMETRY, HIJET_GEOMETRY } from "../src/lib/calc";

async function upsertSeedUser(name: string, email: string, password: string, role: "boss" | "admin" | "worker") {
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing) { console.log(`Skipping ${role} — ${email} already exists.`); return existing; }
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(schema.users).values({
    name, email, passwordHash, role, active: true,
    emailVerified: true, // seeded accounts are trusted bootstrap accounts
  }).returning();
  console.log(`Created ${role} account: ${email}`);
  return user;
}

async function upsertTruck(name: string, type: "dyna" | "hijet") {
  const [existing] = await db.select().from(schema.trucks).where(eq(schema.trucks.name, name));
  if (existing) { console.log(`Skipping truck — ${name} already exists.`); return existing; }
  const geometry = type === "dyna" ? DYNA_GEOMETRY : HIJET_GEOMETRY;
  const [truck] = await db.insert(schema.trucks).values({
    name, type, active: true,
    bagsAcross: geometry.bagsAcross, bagLines: geometry.bagLines, bonusBags: geometry.bonusBags, bonusThreshold: geometry.bonusThreshold,
  }).returning();
  console.log(`Created truck: ${name}`);
  return truck;
}

async function assignTruck(workerId: string, truckId: string) {
  const [existing] = await db.select().from(schema.truckAssignments).where(eq(schema.truckAssignments.workerId, workerId));
  if (existing) { console.log("Skipping truck assignment — already assigned."); return; }
  await db.insert(schema.truckAssignments).values({ workerId, truckId });
  console.log("Assigned truck.");
}

async function main() {
  const bossEmail = process.env.SEED_BOSS_EMAIL || "bellowk55@gmail.com";
  const bossPassword = process.env.SEED_BOSS_PASSWORD || "changeyourpassword";
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "bystus289@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "changeyourpassword";

  await upsertSeedUser("Boss", bossEmail, bossPassword, "boss");
  await upsertSeedUser("Admin", adminEmail, adminPassword, "admin");

  const dyna = await upsertTruck("Toyota Dyna", "dyna");
  const hijet = await upsertTruck("Daihatsu Hijet", "hijet");

  // Known worker/truck associations (spec section 12) — only seeded if the
  // env vars are set, and always via a real truck_assignments row, never a
  // hard-coded "if email === X" branch in application code.
  const w1Email = process.env.SEED_WORKER1_EMAIL;
  if (w1Email) {
    const w1 = await upsertSeedUser(process.env.SEED_WORKER1_NAME || "Worker One", w1Email, process.env.SEED_WORKER1_PASSWORD || "changeyourpassword", "worker");
    if (w1) await assignTruck(w1.id, hijet.id);
  }
  const w2Email = process.env.SEED_WORKER2_EMAIL;
  if (w2Email) {
    const w2 = await upsertSeedUser(process.env.SEED_WORKER2_NAME || "Worker Two", w2Email, process.env.SEED_WORKER2_PASSWORD || "changeyourpassword", "worker");
    if (w2) await assignTruck(w2.id, dyna.id);
  }

  const weekId = await ensureWeekProvisioned(currentWeekStartISO());
  console.log(`Current week provisioned: ${currentWeekStartISO()} (id ${weekId})`);
  console.log("\nDone. Remember to change these passwords after first login.");
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
