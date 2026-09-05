/**
 * Run once after your first migration: npm run db:seed
 * Creates the initial Boss and Admin accounts (idempotent — safe to re-run)
 * and provisions the current week's rows.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { hashPassword } from "../src/lib/auth";
import { currentWeekStartISO, ensureWeekProvisioned } from "../src/lib/weeks";

async function upsertSeedUser(name: string, email: string, password: string, role: "boss" | "admin") {
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing) {
    console.log(`Skipping ${role} — ${email} already exists.`);
    return;
  }
  const passwordHash = await hashPassword(password);
  await db.insert(schema.users).values({
    name,
    email,
    passwordHash,
    role,
    active: true,
    emailVerified: true, // Boss/Admin are trusted bootstrap accounts — no verification email needed
  });
  console.log(`Created ${role} account: ${email}`);
}

async function main() {
  const bossEmail = process.env.SEED_BOSS_EMAIL || "bellowk55@gmail.com";
  const bossPassword = process.env.SEED_BOSS_PASSWORD || "changeyourpassword";
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "bystus289@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "changeyourpassword";

  await upsertSeedUser("Boss", bossEmail, bossPassword, "boss");
  await upsertSeedUser("Admin", adminEmail, adminPassword, "admin");

  const weekId = await ensureWeekProvisioned(currentWeekStartISO());
  console.log(`Current week provisioned: ${currentWeekStartISO()} (id ${weekId})`);

  console.log("\nDone. Remember to change these passwords after first login.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
