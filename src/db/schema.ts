import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  boolean,
  date,
  integer,
  numeric,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ============================================================
   ENUMS
   ============================================================ */
export const userRoleEnum = pgEnum("user_role", ["boss", "admin", "worker"]);
export const weekStatusEnum = pgEnum("week_status", ["open", "closed"]);
export const weekdayEnum = pgEnum("weekday", ["mon", "tue", "wed", "thu", "fri", "sat"]);

/* ============================================================
   USERS
   One row per account: Boss, Admin, or Worker/Driver.
   Workers are soft-deleted (active=false) — never hard-deleted —
   so historical daily_records.worker_id always resolves.
   ============================================================ */
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull(),
    active: boolean("active").notNull().default(true),
    emailVerified: boolean("email_verified").notNull().default(false),
    verificationToken: text("verification_token"),
    verificationTokenExpiresAt: timestamp("verification_token_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex("users_email_unique").on(t.email),
    roleIdx: index("users_role_idx").on(t.role),
    activeIdx: index("users_active_idx").on(t.active),
  })
);

/* ============================================================
   WEEKS
   One row per Mon–Sat operating week. week_start is the Monday
   date and is the natural key the app reasons about; status flips
   to 'closed' once the automatic Sunday-night rollover has run.
   ============================================================ */
export const weeks = pgTable(
  "weeks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    weekStart: date("week_start", { mode: "date" }).notNull(), // Monday
    weekEnd: date("week_end", { mode: "date" }).notNull(), // Saturday
    status: weekStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => ({
    weekStartUnique: uniqueIndex("weeks_week_start_unique").on(t.weekStart),
    statusIdx: index("weeks_status_idx").on(t.status),
  })
);

/* ============================================================
   DAILY WORKER RECORDS
   One row per (week, worker, weekday). Raw inputs only — bags,
   cash, transfer, road expenses. Price / outstanding / commission
   are DERIVED, never stored, so there is exactly one source of
   truth and no risk of the stored figure drifting from the formula.
   ============================================================ */
export const dailyRecords = pgTable(
  "daily_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    weekId: uuid("week_id")
      .notNull()
      .references(() => weeks.id, { onDelete: "restrict" }),
    workerId: uuid("worker_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    weekday: weekdayEnum("weekday").notNull(),
    date: date("date", { mode: "date" }).notNull(),
    bags: integer("bags").notNull().default(0),
    cash: numeric("cash", { precision: 12, scale: 2 }).notNull().default("0"),
    transfer: numeric("transfer", { precision: 12, scale: 2 }).notNull().default("0"),
    roadExpenses: numeric("road_expenses", { precision: 12, scale: 2 }).notNull().default("0"),
    submitted: boolean("submitted").notNull().default(false),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    oneRowPerWorkerPerDay: uniqueIndex("daily_records_week_worker_day_unique").on(
      t.weekId,
      t.workerId,
      t.weekday
    ),
    weekIdx: index("daily_records_week_idx").on(t.weekId),
    workerIdx: index("daily_records_worker_idx").on(t.workerId),
  })
);

/* ============================================================
   FACTORY EXPENSES
   One row per (week, weekday) — company-wide, entered by Admin.
   Explicitly excludes nylon roll spend (see nylon_roll_expenses).
   ============================================================ */
export const factoryExpenses = pgTable(
  "factory_expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    weekId: uuid("week_id")
      .notNull()
      .references(() => weeks.id, { onDelete: "restrict" }),
    weekday: weekdayEnum("weekday").notNull(),
    date: date("date", { mode: "date" }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
    submitted: boolean("submitted").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    oneRowPerDay: uniqueIndex("factory_expenses_week_day_unique").on(t.weekId, t.weekday),
    weekIdx: index("factory_expenses_week_idx").on(t.weekId),
  })
);

/* ============================================================
   NYLON ROLL EXPENSES
   Tracked separately from factory_expenses on purpose: nylon rolls
   are large, infrequent purchases that must NOT distort the weekly
   operational accounting, but must still feed the Boss's long-term
   profitability analytics. Multiple rows per week are allowed
   (no uniqueness constraint on weekday) since a roll purchase is an
   event, not a mandatory daily field.
   ============================================================ */
export const nylonRollExpenses = pgTable(
  "nylon_roll_expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    weekId: uuid("week_id")
      .notNull()
      .references(() => weeks.id, { onDelete: "restrict" }),
    weekday: weekdayEnum("weekday").notNull(),
    date: date("date", { mode: "date" }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    weekIdx: index("nylon_roll_expenses_week_idx").on(t.weekId),
  })
);

/* ============================================================
   SESSIONS (optional persistence for auditability / revocation)
   The app primarily authenticates via a signed, stateless JWT
   cookie (see src/lib/session.ts), but logging issued sessions
   here lets the Boss revoke a compromised session or audit logins
   without changing the auth model.
   ============================================================ */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: text("user_agent"),
  },
  (t) => ({
    userIdx: index("sessions_user_idx").on(t.userId),
  })
);

/* ============================================================
   RELATIONS (for drizzle's relational query API)
   ============================================================ */
export const usersRelations = relations(users, ({ many }) => ({
  dailyRecords: many(dailyRecords),
  factoryExpensesCreated: many(factoryExpenses),
  nylonRollExpensesCreated: many(nylonRollExpenses),
  sessions: many(sessions),
}));

export const weeksRelations = relations(weeks, ({ many }) => ({
  dailyRecords: many(dailyRecords),
  factoryExpenses: many(factoryExpenses),
  nylonRollExpenses: many(nylonRollExpenses),
}));

export const dailyRecordsRelations = relations(dailyRecords, ({ one }) => ({
  week: one(weeks, { fields: [dailyRecords.weekId], references: [weeks.id] }),
  worker: one(users, { fields: [dailyRecords.workerId], references: [users.id] }),
}));

export const factoryExpensesRelations = relations(factoryExpenses, ({ one }) => ({
  week: one(weeks, { fields: [factoryExpenses.weekId], references: [weeks.id] }),
  createdByUser: one(users, { fields: [factoryExpenses.createdBy], references: [users.id] }),
}));

export const nylonRollExpensesRelations = relations(nylonRollExpenses, ({ one }) => ({
  week: one(weeks, { fields: [nylonRollExpenses.weekId], references: [weeks.id] }),
  createdByUser: one(users, { fields: [nylonRollExpenses.createdBy], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

/* ============================================================
   TYPES
   ============================================================ */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Week = typeof weeks.$inferSelect;
export type NewWeek = typeof weeks.$inferInsert;
export type DailyRecord = typeof dailyRecords.$inferSelect;
export type NewDailyRecord = typeof dailyRecords.$inferInsert;
export type FactoryExpense = typeof factoryExpenses.$inferSelect;
export type NylonRollExpense = typeof nylonRollExpenses.$inferSelect;
